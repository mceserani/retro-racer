/*
 * Retro Racer - grafica pixel art generata via codice.
 *
 * Ogni sprite è un piccolo canvas fuori schermo disegnato a rettangoli;
 * il renderer lo ingrandisce senza smussatura, ottenendo l'effetto "pixel".
 * Nessun file immagine esterno: niente problemi di licenze o di caricamento.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Sprites = (function () {
  'use strict';

  const C = RR.Config;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function painter(canvas) {
    const g = canvas.getContext('2d');
    return {
      g: g,
      rect(x, y, w, h, color) {
        g.fillStyle = color;
        g.fillRect(x, y, w, h);
      }
    };
  }

  /* Copia speculare orizzontale di un canvas. */
  function mirror(src) {
    const c = makeCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- auto

  /*
   * Auto vista da dietro (40x22). lean = -1/0/1 sposta l'abitacolo per
   * simulare la sterzata; spoiler = alettone (solo per l'auto del giocatore).
   */
  function car(body, shade, light, lean, spoiler) {
    const c = makeCanvas(40, 22);
    const p = painter(c);
    const o = lean || 0;

    p.rect(1, 19, 38, 3, 'rgba(0,0,0,0.35)');                 // ombra
    p.rect(2 - o, 13, 7, 8, '#141414');                        // gomme
    p.rect(31 - o, 13, 7, 8, '#141414');
    p.rect(3 - o, 14, 5, 1, '#3c3c3c');
    p.rect(32 - o, 14, 5, 1, '#3c3c3c');

    p.rect(2, 9, 36, 9, body);                                 // carrozzeria
    p.rect(1, 11, 38, 5, body);
    p.rect(2, 9, 36, 1, light);
    p.rect(2, 16, 36, 2, shade);

    p.rect(9 + o, 2, 22, 8, shade);                            // abitacolo
    p.rect(10 + o, 1, 20, 1, shade);
    p.rect(11 + o, 3, 18, 5, '#5ec8f2');                       // lunotto
    p.rect(11 + o, 3, 18, 1, '#c4f0ff');
    p.rect(12 + o, 4, 3, 3, '#9fe2ff');

    p.rect(3, 11, 8, 3, '#ff2e2e');                            // fanali
    p.rect(4, 11, 6, 1, '#ffb2a0');
    p.rect(29, 11, 8, 3, '#ff2e2e');
    p.rect(30, 11, 6, 1, '#ffb2a0');
    p.rect(16, 12, 8, 3, '#f0f0f0');                           // targa
    p.rect(17, 13, 6, 1, '#303030');
    p.rect(6, 18, 3, 1, '#9a9a9a');                            // scarico

    if (spoiler) {
      p.rect(0, 6, 40, 2, '#1c1c1c');
      p.rect(0, 6, 40, 1, '#3a3a3a');
      p.rect(6, 8, 2, 2, '#1c1c1c');
      p.rect(32, 8, 2, 2, '#1c1c1c');
    }
    return c;
  }

  /* Camion (40x34) visto da dietro. */
  function truck() {
    const c = makeCanvas(40, 34);
    const p = painter(c);
    p.rect(1, 31, 38, 3, 'rgba(0,0,0,0.35)');
    p.rect(3, 26, 8, 8, '#141414');
    p.rect(29, 26, 8, 8, '#141414');
    p.rect(2, 0, 36, 27, '#d8d8de');                           // cassone
    p.rect(2, 0, 36, 2, '#f4f4f8');
    p.rect(19, 2, 2, 24, '#a8a8b0');                           // porte
    p.rect(2, 10, 36, 3, '#2ab7ff');                           // fascia
    p.rect(2, 13, 36, 1, '#ff3d7f');
    p.rect(15, 15, 3, 2, '#707078');                           // maniglie
    p.rect(22, 15, 3, 2, '#707078');
    p.rect(1, 25, 38, 3, '#3a3a40');                           // paraurti
    p.rect(3, 22, 5, 3, '#ff2e2e');
    p.rect(32, 22, 5, 3, '#ff2e2e');
    return c;
  }

  // ---------------------------------------------------------------- scenario

  function palm() {
    const c = makeCanvas(32, 56);
    const p = painter(c);
    // tronco leggermente curvo, a fasce
    for (let y = 16; y < 56; y++) {
      const x = 14 + Math.round(Math.sin(y / 9) * 2);
      p.rect(x, y, 4, 1, Math.floor(y / 3) % 2 ? '#8b5a2b' : '#6e4420');
      p.rect(x + 3, y, 1, 1, '#5a3618');
    }
    // fronde: linee che partono dalla cima e ricadono per "gravità"
    const cx = 16, cy = 16;
    const angles = [-0.45, 0.15, Math.PI + 0.45, Math.PI - 0.15, -1.25, -1.9];
    for (const a of angles) {
      for (let t = 0; t < 15; t++) {
        const x = Math.round(cx + Math.cos(a) * t);
        const y = Math.round(cy + Math.sin(a) * t + 0.045 * t * t);
        p.rect(x - 1, y, 3, 2, '#1f7a33');
        p.rect(x, y, 2, 1, '#38b54f');
      }
    }
    p.rect(14, 15, 3, 3, '#5a3618');                           // noci di cocco
    p.rect(17, 16, 3, 3, '#6e4420');
    return c;
  }

  function pine() {
    const c = makeCanvas(28, 48);
    const p = painter(c);
    p.rect(12, 38, 4, 10, '#6e4420');
    p.rect(14, 38, 2, 10, '#5a3618');
    for (let i = 0; i < 4; i++) {
      const top = 2 + i * 8;
      const h = 14;
      const maxHalf = 5 + i * 3;
      for (let r = 0; r < h; r++) {
        const half = Math.max(1, Math.round((r / h) * maxHalf));
        p.rect(14 - half, top + r, half, 1, '#2e8b46');
        p.rect(14, top + r, half, 1, '#1d6b34');
      }
    }
    return c;
  }

  function bush() {
    const c = makeCanvas(24, 12);
    const p = painter(c);
    for (let y = 0; y < 12; y++) {
      const t = (y - 11) / 11;
      const half = Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * 11);
      p.rect(12 - half, y, half * 2, 1, y < 4 ? '#3fae4a' : '#2a8a3a');
    }
    p.rect(6, 4, 3, 2, '#5ccf62');
    p.rect(14, 3, 4, 2, '#5ccf62');
    return c;
  }

  function billboard(line1, line2, bg, fg) {
    const c = makeCanvas(64, 40);
    const p = painter(c);
    p.rect(10, 24, 3, 16, '#4a4a52');                          // pali
    p.rect(51, 24, 3, 16, '#4a4a52');
    p.rect(0, 0, 64, 26, '#1a1a1a');                           // cornice
    p.rect(2, 2, 60, 22, bg);
    p.rect(2, 2, 60, 1, 'rgba(255,255,255,0.35)');
    RR.Font.draw(p.g, line1, 32, 4, fg, { align: 'center', shadow: 'rgba(0,0,0,0.35)' });
    RR.Font.draw(p.g, line2, 32, 14, fg, { align: 'center', shadow: 'rgba(0,0,0,0.35)' });
    return c;
  }

  /* Cartello di curva con freccia verso destra (12x18). */
  function signRight() {
    const c = makeCanvas(12, 18);
    const p = painter(c);
    p.rect(5, 10, 2, 8, '#c8c8c8');
    p.rect(0, 0, 12, 11, '#1a1a1a');
    p.rect(1, 1, 10, 9, '#ffd23f');
    for (let r = 0; r < 7; r++) {
      const x = 3 + (r <= 3 ? r : 6 - r);
      p.rect(x, 2 + r, 3, 1, '#1a1a1a');
    }
    return c;
  }

  /* Striscione che scavalca la strada (160x64). */
  function banner(text, color, textColor) {
    const c = makeCanvas(160, 64);
    const p = painter(c);
    for (const x of [4, 148]) {                                // piloni a strisce
      for (let y = 10; y < 64; y += 6) {
        p.rect(x, y, 8, 3, '#f2f2f2');
        p.rect(x, y + 3, 8, 3, '#d8281e');
      }
      p.rect(x + 6, 10, 2, 54, 'rgba(0,0,0,0.25)');
    }
    p.rect(0, 0, 160, 22, '#111111');
    p.rect(2, 2, 156, 18, color);
    for (let x = 4; x < 156; x += 8) {                         // lampadine
      p.rect(x, 3, 2, 1, '#ffffff');
      p.rect(x, 18, 2, 1, '#ffffff');
    }
    RR.Font.draw(p.g, text, 80, 4, textColor, { scale: 2, align: 'center', shadow: '#111111' });
    return c;
  }

  // ---------------------------------------------------------------- sfondi

  /* Cielo al tramonto a fasce, con stelle in alto (fisso, 320x240). */
  function sky() {
    const W = C.WIDTH, H = C.HEIGHT;
    const c = makeCanvas(W, H);
    const p = painter(c);
    const bands = C.COLORS.SKY;
    const horizon = 132;
    const bandH = Math.ceil(horizon / bands.length);
    p.rect(0, 0, W, H, bands[bands.length - 1]);
    bands.forEach((col, i) => p.rect(0, i * bandH, W, bandH, col));
    const rng = RR.Util.makeRng(7);
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(rng() * W);
      const y = Math.floor(rng() * 50);
      p.rect(x, y, 1, 1, rng() < 0.3 ? '#ffd8f0' : '#ffffff');
    }
    return c;
  }

  /*
   * Profilo ripetibile: somma di sinusoidi con un numero intero di periodi
   * sulla larghezza, così il bordo destro combacia con quello sinistro.
   */
  function profile(x, width, base, waves) {
    let h = base;
    for (const w of waves) h += w.a * Math.sin((2 * Math.PI * w.k * x) / width + w.p);
    return h;
  }

  /* Livello lontano: sole a strisce e montagne (640x240, scorre in curva). */
  function farLayer() {
    const W = C.WIDTH * 2, H = C.HEIGHT;
    const c = makeCanvas(W, H);
    const p = painter(c);
    const horizon = 124;

    // sole "synthwave" con fasce orizzontali vuote verso il basso
    const cx = 160, cy = 104, r = 36;
    const sun = C.COLORS.SUN;
    for (let y = -r; y <= r; y++) {
      const ry = cy + y;
      const rel = (y + r) / (2 * r);
      if (rel > 0.5 && Math.floor(ry / 2) % Math.max(2, Math.round(8 - rel * 10)) === 0) continue;
      const half = Math.round(Math.sqrt(r * r - y * y));
      p.rect(cx - half, ry, half * 2, 1, sun[Math.min(sun.length - 1, Math.floor(rel * sun.length))]);
    }

    const waves = [{ k: 3, a: 14, p: 0.4 }, { k: 7, a: 7, p: 1.3 }, { k: 13, a: 3, p: 2.1 }];
    for (let x = 0; x < W; x++) {
      const h = Math.round(profile(x, W, 34, waves));
      p.rect(x, horizon - h, 1, H - horizon + h, C.COLORS.MOUNTAINS);
      // bordo illuminato dal tramonto sui versanti esposti
      if (profile(x + 1, W, 34, waves) > h) p.rect(x, horizon - h, 1, 2, C.COLORS.MOUNTAINS_LIGHT);
    }
    return c;
  }

  /* Livello vicino: colline scure (640x240, scorre più veloce). */
  function nearLayer() {
    const W = C.WIDTH * 2, H = C.HEIGHT;
    const c = makeCanvas(W, H);
    const p = painter(c);
    const horizon = 124;
    const waves = [{ k: 5, a: 6, p: 0.9 }, { k: 11, a: 3, p: 0.2 }, { k: 23, a: 1, p: 1.7 }];
    for (let x = 0; x < W; x++) {
      const h = Math.round(profile(x, W, 12, waves));
      p.rect(x, horizon - h, 1, H - horizon + h, C.COLORS.HILLS);
    }
    return c;
  }

  // ---------------------------------------------------------------- build

  function build() {
    const images = {
      PLAYER_STRAIGHT: car('#e8202a', '#a3121b', '#ff6a6a', 0, true),
      PLAYER_LEFT: car('#e8202a', '#a3121b', '#ff6a6a', -1, true),
      PLAYER_RIGHT: car('#e8202a', '#a3121b', '#ff6a6a', 1, true),
      CAR_BLUE: car('#2a6bff', '#1640a8', '#7aa6ff', 0, false),
      CAR_GREEN: car('#1fbf6a', '#127a43', '#7cf0ad', 0, false),
      CAR_YELLOW: car('#ffc83d', '#c48a12', '#ffe69a', 0, false),
      CAR_WHITE: car('#e6e6ee', '#9a9aa6', '#ffffff', 0, false),
      TRUCK: truck(),
      PALM: palm(),
      PINE: pine(),
      BUSH: bush(),
      BILLBOARD1: billboard('RETRO', 'RACER', '#ff3d7f', '#ffffff'),
      BILLBOARD2: billboard('TURBO', 'OIL', '#2ab7ff', '#ffffff'),
      BILLBOARD3: billboard('ARCADE', '1986', '#ffd23f', '#1a0b3a'),
      BILLBOARD4: billboard('GO', 'FASTER!', '#1fbf6a', '#ffffff'),
      SIGN_RIGHT: signRight(),
      BANNER_START: banner('START', '#ff3d7f', '#ffffff'),
      BANNER_CHECK: banner('CHECKPOINT', '#ffd23f', '#1a0b3a')
    };
    images.SIGN_LEFT = mirror(images.SIGN_RIGHT);

    return {
      images: images,
      background: { sky: sky(), far: farLayer(), near: nearLayer() }
    };
  }

  return { build };
})();
