/*
 * Retro Racer - disegno su canvas.
 *
 * La strada è disegnata riga per riga (scanline) a 320x240: niente
 * poligoni sfumati, solo pixel netti come nei cabinati anni '80.
 * Ordine: sfondo -> strada (dal vicino al lontano, con clipping sulle
 * colline) -> sprite e auto (dal lontano al vicino) -> HUD e schermate.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Renderer = (function () {
  'use strict';

  const C = RR.Config;
  const U = RR.Util;
  const F = RR.Font;
  const COL = C.COLORS;
  const W = C.WIDTH;
  const H = C.HEIGHT;

  class Renderer {
    constructor(canvas, graphics) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.images = graphics.images;
      this.bg = graphics.background;
      this.time = 0;
    }

    render(game, info) {
      const ctx = this.ctx;
      this.time = performance.now() / 1000;  // tempo reale: lampeggi uguali a ogni refresh rate
      ctx.save();
      if (game.shake > 0) {
        ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
      }
      this.renderWorld(game);
      ctx.restore();
      this.renderHud(game, info || {});
    }

    // ------------------------------------------------------------ mondo

    renderWorld(game) {
      const ctx = this.ctx;
      const track = game.track;
      const segments = track.segments;
      const N = segments.length;
      const L = track.length;

      const baseSegment = track.findSegment(game.position);
      const basePercent = U.percentRemaining(game.position, C.SEGMENT_LENGTH);
      const playerSegment = track.findSegment(game.position + C.PLAYER_Z);
      const playerPercent = U.percentRemaining(game.position + C.PLAYER_Z, C.SEGMENT_LENGTH);
      const playerY = U.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

      ctx.drawImage(this.bg.sky, 0, 0);
      this.drawLayer(this.bg.far, game.skyOffset);
      this.drawLayer(this.bg.near, game.hillOffset);

      // Strada: dal segmento più vicino al più lontano
      let maxy = H;
      let x = 0;
      let dx = -(baseSegment.curve * basePercent);
      for (let n = 0; n < C.DRAW_DISTANCE; n++) {
        const segment = segments[(baseSegment.index + n) % N];
        segment.looped = segment.index < baseSegment.index;
        segment.fog = U.exponentialFog(n / C.DRAW_DISTANCE, C.FOG_DENSITY);
        segment.clip = maxy;

        const camZ = game.position - (segment.looped ? L : 0);
        U.project(segment.p1, game.playerX * C.ROAD_WIDTH - x, playerY + C.CAMERA_HEIGHT, camZ,
          C.CAMERA_DEPTH, W, H, C.ROAD_WIDTH);
        U.project(segment.p2, game.playerX * C.ROAD_WIDTH - x - dx, playerY + C.CAMERA_HEIGHT, camZ,
          C.CAMERA_DEPTH, W, H, C.ROAD_WIDTH);
        x += dx;
        dx += segment.curve;

        if (segment.p1.camera.z <= C.CAMERA_DEPTH ||       // dietro la camera
            segment.p2.screen.y >= segment.p1.screen.y ||  // faccia nascosta (discesa)
            segment.p2.screen.y >= maxy) {                 // coperto da una collina
          continue;
        }
        this.drawSegment(segment, maxy);
        maxy = segment.p2.screen.y;
      }

      // Sprite e auto: dal più lontano al più vicino (algoritmo del pittore)
      for (let n = C.DRAW_DISTANCE - 1; n >= 0; n--) {
        const segment = segments[(baseSegment.index + n) % N];
        if (segment.p1.camera.z > C.CAMERA_DEPTH) {
          for (const car of segment.cars) {
            const scale = U.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
            const sx = U.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) +
              scale * car.offset * C.ROAD_WIDTH * W / 2;
            const sy = U.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
            this.drawSprite(car.sprite, scale, sx, sy, -0.5, -1, segment.clip);
          }
          for (const sprite of segment.sprites) {
            const scale = segment.p1.screen.scale;
            const sx = segment.p1.screen.x + scale * sprite.offset * C.ROAD_WIDTH * W / 2;
            this.drawSprite(sprite.source, scale, sx, segment.p1.screen.y, -0.5, -1, segment.clip);
          }
        }
        if (segment === playerSegment && game.state !== 'title') {
          this.drawPlayer(game, playerSegment, playerPercent);
        }
      }
    }

    /* Disegna un livello di sfondo largo 2 schermi, ripetuto in orizzontale. */
    drawLayer(img, offset) {
      const sx = Math.floor(offset * img.width) % img.width;
      const first = Math.min(W, img.width - sx);
      this.ctx.drawImage(img, sx, 0, first, H, 0, 0, first, H);
      if (first < W) this.ctx.drawImage(img, 0, 0, W - first, H, first, 0, W - first, H);
    }

    /* Riempie una riga orizzontale da xa a xb (coordinate arrotondate). */
    span(xa, xb, y, color) {
      const a = Math.max(0, Math.round(xa));
      const b = Math.min(W, Math.round(xb));
      if (b > a) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(a, y, b - a, 1);
      }
    }

    drawSegment(segment, maxy) {
      const ctx = this.ctx;
      const p1 = segment.p1.screen;
      const p2 = segment.p2.screen;
      const c = segment.color;
      const top = Math.max(0, p2.y);
      const bottom = Math.min(maxy, p1.y, H);
      if (bottom <= top) return;

      ctx.fillStyle = c.grass;
      ctx.fillRect(0, top, W, bottom - top);

      const laneCount = C.LANES;
      for (let y = top; y < bottom; y++) {
        const t = (y - p2.y) / (p1.y - p2.y);
        const x = p2.x + (p1.x - p2.x) * t;
        const w = p2.w + (p1.w - p2.w) * t;
        const rumble = w / Math.max(6, 2 * laneCount);
        const left = x - w;
        const right = x + w;

        this.span(left - rumble, left, y, c.rumble);
        this.span(right, right + rumble, y, c.rumble);

        if (c.checker) {
          const cells = 8;
          const cw = (2 * w) / cells;
          for (let i = 0; i < cells; i++) {
            this.span(left + i * cw, left + (i + 1) * cw, y, (i + segment.index) % 2 ? c.road : c.road2);
          }
        } else {
          this.span(left, right, y, c.road);
        }

        if (c.lane) {
          const lineW = w / Math.max(32, 8 * laneCount);
          const laneW = (2 * w) / laneCount;
          for (let lane = 1; lane < laneCount; lane++) {
            const lx = left + laneW * lane;
            this.span(lx - lineW / 2, lx + lineW / 2, y, c.lane);
          }
        }
      }

      // Nebbia: velatura col colore delle colline, più forte in lontananza
      if (segment.fog < 1) {
        ctx.globalAlpha = 1 - segment.fog;
        ctx.fillStyle = COL.FOG;
        ctx.fillRect(0, top, W, bottom - top);
        ctx.globalAlpha = 1;
      }
    }

    /*
     * Disegna uno sprite ancorato in (destX, destY). offsetX/offsetY spostano
     * l'ancora (-0.5, -1 = centro in basso). clipY taglia la parte nascosta
     * dietro una collina.
     */
    drawSprite(key, scale, destX, destY, offsetX, offsetY, clipY) {
      const img = this.images[key];
      const def = C.SPRITES[key];
      const destW = def.w * scale * (W / 2) * C.ROAD_WIDTH;
      if (destW < 0.5 || destW > W * 6) return;
      const destH = destW * img.height / img.width;
      const x = destX + destW * offsetX;
      const y = destY + destH * offsetY;
      const clipH = clipY ? Math.max(0, y + destH - clipY) : 0;
      if (clipH >= destH) return;
      const srcH = img.height - (img.height * clipH / destH);
      this.ctx.drawImage(img, 0, 0, img.width, srcH,
        Math.round(x), Math.round(y), Math.round(destW), Math.round(destH - clipH));
    }

    drawPlayer(game, playerSegment, playerPercent) {
      const scale = C.CAMERA_DEPTH / C.PLAYER_Z;
      const camY = U.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent);
      const y = H / 2 - (scale * camY * H / 2) - 2;
      const bounce = game.speed > 0 && game.state === 'playing'
        ? Math.round(Math.random() * game.speedPercent * 1.5) * (Math.random() < 0.5 ? -1 : 1)
        : 0;
      let key = 'PLAYER_STRAIGHT';
      if (game.steer < 0) key = 'PLAYER_LEFT';
      else if (game.steer > 0) key = 'PLAYER_RIGHT';
      this.drawSprite(key, scale, W / 2, y + bounce, -0.5, -1);
    }

    // ------------------------------------------------------------ HUD

    text(str, x, y, color, opts) {
      const o = Object.assign({ shadow: COL.HUD_SHADOW }, opts || {});
      F.draw(this.ctx, str, x, y, color, o);
    }

    blink(period) {
      return Math.floor(this.time / (period || 0.5)) % 2 === 0;
    }

    dim(y, h, alpha) {
      this.ctx.fillStyle = 'rgba(10, 4, 30, ' + (alpha || 0.6) + ')';
      this.ctx.fillRect(0, y, W, h);
    }

    renderHud(game, info) {
      switch (game.state) {
        case 'title':
          this.renderTitle(game);
          break;
        case 'countdown':
          this.renderGameHud(game);
          this.renderCountdown(game);
          break;
        case 'playing':
          this.renderGameHud(game);
          this.renderMessages(game);
          break;
        case 'paused':
          this.renderGameHud(game);
          this.renderPause();
          break;
        case 'gameover':
          this.renderGameHud(game);
          this.renderGameOver(game);
          break;
      }
      if (info.muted) this.text('AUDIO OFF', W - 4, H - 10, '#9a9aa6', { align: 'right' });
    }

    renderGameHud(game) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(10, 4, 30, 0.45)';
      ctx.fillRect(0, 0, W, 28);

      // Tempo (lampeggia rosso negli ultimi 10 secondi)
      const t = Math.ceil(game.timeLeft);
      const low = game.timeLeft < 10;
      this.text('TEMPO', 6, 3, COL.HUD_LABEL);
      if (!low || this.blink(0.25)) this.text(String(t), 6, 12, low ? '#ff3030' : COL.HUD, { scale: 2 });

      // Punteggio e record
      this.text('PUNTI', W / 2, 3, COL.HUD_LABEL, { align: 'center' });
      this.text(U.pad(game.score, 7), W / 2, 12, COL.HUD, { align: 'center' });
      this.text('REC ' + U.pad(Math.max(game.highScore, Math.floor(game.score)), 7), W / 2, 20, '#9a9aa6',
        { align: 'center', shadow: null });

      // Giro
      this.text('GIRO', W - 6, 3, COL.HUD_LABEL, { align: 'right' });
      this.text(String(game.lap), W - 6, 12, COL.HUD, { align: 'right', scale: 2 });

      // Tachimetro: velocità e barra a segmenti verde -> giallo -> rosso
      const bars = 16;
      const lit = Math.round(game.speedPercent * bars);
      for (let i = 0; i < bars; i++) {
        const color = i < 9 ? '#2bd46a' : i < 13 ? '#ffd23f' : '#ff3030';
        ctx.fillStyle = i < lit ? color : 'rgba(255,255,255,0.15)';
        ctx.fillRect(6 + i * 5, H - 10 - Math.floor(i / 3), 4, 4 + Math.floor(i / 3));
      }
      this.text(String(game.kmh) + ' KM/H', 6, H - 28, COL.HUD);
    }

    renderCountdown(game) {
      const n = Math.ceil(game.countdown);
      const color = n === 1 ? '#2bd46a' : '#ff3030';
      this.text(String(n), W / 2, 70, color, { scale: 6, align: 'center' });
      this.text('PRONTI...', W / 2, 120, COL.HUD, { align: 'center', scale: 1 });
    }

    renderMessages(game) {
      let y = 60;
      for (const m of game.messages) {
        if (m.small) {
          this.text(m.text, W / 2, y, '#2bd46a', { align: 'center', scale: 2 });
          y += 20;
        } else {
          if (this.blink(0.15) || m.ttl < 1.5) {
            this.text(m.text, W / 2, y, COL.HUD_LABEL, { align: 'center', scale: 3 });
          }
          y += 28;
        }
      }
    }

    renderTitle(game) {
      this.dim(26, 132, 0.55);
      this.text('RETRO', W / 2 + 2, 34, COL.HUD_LABEL, { scale: 4, align: 'center', shadow: null });
      this.text('RETRO', W / 2, 32, COL.ACCENT, { scale: 4, align: 'center', shadow: '#1a0b3a' });
      this.text('RACER', W / 2 + 2, 66, COL.HUD_LABEL, { scale: 4, align: 'center', shadow: null });
      this.text('RACER', W / 2, 64, COL.ACCENT, { scale: 4, align: 'center', shadow: '#1a0b3a' });

      if (this.blink(0.5)) this.text('PREMI INVIO PER INIZIARE', W / 2, 104, COL.HUD, { align: 'center' });
      this.text('FRECCE/WASD: GUIDA   P: PAUSA   M: AUDIO', W / 2, 122, '#c9b8ff', { align: 'center' });
      this.text('RAGGIUNGI I CHECKPOINT PRIMA DELLO ZERO!', W / 2, 134, '#c9b8ff', { align: 'center' });
      this.text('RECORD ' + U.pad(game.highScore, 7), W / 2, 146, COL.HUD_LABEL, { align: 'center' });
    }

    renderPause() {
      this.dim(80, 70, 0.7);
      this.text('PAUSA', W / 2, 92, COL.HUD_LABEL, { scale: 3, align: 'center' });
      this.text('P O INVIO: CONTINUA   ESC: MENU', W / 2, 130, COL.HUD, { align: 'center' });
    }

    renderGameOver(game) {
      this.dim(56, 116, 0.7);
      this.text('GAME OVER', W / 2, 66, COL.ACCENT, { scale: 3, align: 'center' });
      this.text('TEMPO SCADUTO', W / 2, 94, COL.HUD, { align: 'center' });
      this.text('PUNTI ' + U.pad(game.score, 7), W / 2, 110, COL.HUD_LABEL, { align: 'center', scale: 2 });
      if (game.newRecord && this.blink(0.3)) {
        this.text('NUOVO RECORD!', W / 2, 132, '#2bd46a', { align: 'center', scale: 2 });
      }
      if (game.stateTime > 1.5) {
        this.text('INVIO: RIGIOCA   ESC: MENU', W / 2, 156, COL.HUD, { align: 'center' });
      }
    }
  }

  return Renderer;
})();
