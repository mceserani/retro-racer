/*
 * Retro Racer - logica di gioco.
 *
 * Contiene la macchina a stati (titolo, conto alla rovescia, gara, pausa,
 * game over), la fisica dell'auto, il traffico, le collisioni, il tempo,
 * i checkpoint e il punteggio. Non tocca il DOM: audio e storage sono
 * iniettati e opzionali, così la logica è testabile con Node.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Game = (function () {
  'use strict';

  const C = RR.Config;
  const U = RR.Util;

  const STATE = {
    TITLE: 'title',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
  };

  const NO_CONTROLS = { left: false, right: false, accelerate: false, brake: false };

  class Game {
    /*
     * opts: { track, audio, storage, seed, cars }
     *   cars = numero di auto avversarie iniziali (default C.BASE_CARS)
     */
    constructor(opts) {
      const o = opts || {};
      this.track = o.track || new RR.Track();
      this.audio = o.audio || null;
      this.storage = o.storage || null;
      this.rng = U.makeRng(o.seed === undefined ? 42 : o.seed);
      this.baseCars = o.cars === undefined ? C.BASE_CARS : o.cars;
      this.highScore = this.loadHighScore();
      this.cars = [];
      this.skyOffset = 0;
      this.hillOffset = 0;
      this.toTitle();
    }

    // ------------------------------------------------------------ stato

    toTitle() {
      this.resetRace();
      this.setState(STATE.TITLE);
    }

    startRace() {
      this.resetRace();
      this.countdown = C.COUNTDOWN;
      this.setState(STATE.COUNTDOWN);
      this.sfx('countdown');
    }

    setState(state) {
      this.state = state;
      this.stateTime = 0;
    }

    resetRace() {
      this.position = 0;          // z della camera sul circuito, in [0, lunghezza)
      this.playerX = 0;           // -1..1 = sulla strada
      this.speed = 0;
      this.steer = 0;
      this.traveled = 0;          // distanza totale percorsa (non avvolta)
      this.timeLeft = C.START_TIME;
      this.score = 0;
      this.lap = 1;
      this.nextCheckpoint = 0;
      this.countdown = 0;
      this.messages = [];
      this.shake = 0;
      this.newRecord = false;
      this.resetCars(this.baseCars);
    }

    get speedPercent() {
      return this.speed / C.MAX_SPEED;
    }

    get kmh() {
      return Math.round(this.speedPercent * C.MAX_KMH);
    }

    pressStart() {
      if (this.state === STATE.TITLE) this.startRace();
      else if (this.state === STATE.GAMEOVER && this.stateTime > 1.5) this.startRace();
      else if (this.state === STATE.PAUSED) this.state = STATE.PLAYING;
    }

    togglePause() {
      if (this.state === STATE.PLAYING) this.state = STATE.PAUSED;
      else if (this.state === STATE.PAUSED) this.state = STATE.PLAYING;
    }

    pause() {
      if (this.state === STATE.PLAYING) this.state = STATE.PAUSED;
    }

    back() {
      if (this.state === STATE.PLAYING) this.state = STATE.PAUSED;
      else if (this.state === STATE.PAUSED || this.state === STATE.GAMEOVER) this.toTitle();
    }

    tap() {
      if (this.state === STATE.PAUSED) this.state = STATE.PLAYING;
      else this.pressStart();
    }

    gameOver() {
      this.setState(STATE.GAMEOVER);
      this.timeLeft = 0;
      this.addMessage('TEMPO SCADUTO', 3);
      if (this.score > this.highScore) {
        this.highScore = Math.floor(this.score);
        this.newRecord = true;
        this.saveHighScore();
      }
      this.sfx('gameOver');
    }

    // ------------------------------------------------------------ update

    update(dt, controls) {
      const ctl = controls || NO_CONTROLS;

      if (this.state === STATE.PAUSED) {
        if (this.audio) this.audio.setEngine(0, false);
        return;
      }
      this.stateTime += dt;

      switch (this.state) {
        case STATE.TITLE:
          this.updateDemo(dt);
          break;

        case STATE.COUNTDOWN: {
          this.updatePlayer(dt, NO_CONTROLS);
          const before = Math.ceil(this.countdown);
          this.countdown -= dt;
          const after = Math.ceil(this.countdown);
          if (this.countdown <= 0) {
            this.setState(STATE.PLAYING);
            this.addMessage('VIA!', 1);
            this.sfx('go');
          } else if (after !== before) {
            this.sfx('countdown');
          }
          break;
        }

        case STATE.PLAYING: {
          this.updatePlayer(dt, ctl);
          const before = Math.ceil(this.timeLeft);
          this.timeLeft -= dt;
          if (this.timeLeft <= 0) {
            this.gameOver();
          } else if (this.timeLeft < 5.5 && Math.ceil(this.timeLeft) !== before) {
            this.sfx('tick');
          }
          break;
        }

        case STATE.GAMEOVER:
          this.updatePlayer(dt, NO_CONTROLS);  // l'auto si ferma per inerzia
          break;
      }

      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
      for (const m of this.messages) m.ttl -= dt;
      this.messages = this.messages.filter((m) => m.ttl > 0);

      if (this.audio) {
        const audible = this.state !== STATE.TITLE;
        this.audio.setEngine(this.speedPercent, audible);
      }
    }

    /* Modalità dimostrativa della schermata del titolo: la camera percorre la pista. */
    updateDemo(dt) {
      const playerSegment = this.track.findSegment(this.position + C.PLAYER_Z);
      const start = this.position;
      this.speed = C.MAX_SPEED * 0.5;
      this.playerX = 0;
      this.updateCars(dt, playerSegment, C.SPRITES.PLAYER_STRAIGHT.w);
      this.position = U.increase(this.position, dt * this.speed, this.track.length);
      this.updateBackground(playerSegment, U.wrapDelta(start, this.position, this.track.length));
    }

    updatePlayer(dt, ctl) {
      const track = this.track;
      const L = track.length;
      const playing = this.state === STATE.PLAYING;
      const playerSegment = track.findSegment(this.position + C.PLAYER_Z);
      const playerW = C.SPRITES.PLAYER_STRAIGHT.w;
      const speedPercent = this.speedPercent;
      const dx = dt * 2 * speedPercent;
      const startPosition = this.position;

      this.updateCars(dt, playerSegment, playerW);
      this.position = U.increase(this.position, dt * this.speed, L);

      // Sterzo e forza centrifuga
      this.steer = 0;
      if (ctl.left) {
        this.playerX -= dx;
        this.steer = speedPercent > 0 ? -1 : 0;
      } else if (ctl.right) {
        this.playerX += dx;
        this.steer = speedPercent > 0 ? 1 : 0;
      }
      this.playerX -= dx * speedPercent * playerSegment.curve * C.CENTRIFUGAL;

      // Gas, freno, decelerazione naturale
      if (ctl.accelerate) this.speed = U.accelerate(this.speed, C.ACCEL, dt);
      else if (ctl.brake) this.speed = U.accelerate(this.speed, C.BRAKING, dt);
      else this.speed = U.accelerate(this.speed, C.DECEL, dt);

      // Fuori strada: rallenta e può urtare gli oggetti a bordo pista
      if (this.playerX < -1 || this.playerX > 1) {
        if (this.speed > C.OFF_ROAD_LIMIT) this.speed = U.accelerate(this.speed, C.OFF_ROAD_DECEL, dt);
        for (const sprite of playerSegment.sprites) {
          if (sprite.collide > 0 && U.overlap(this.playerX, playerW, sprite.offset, sprite.w * sprite.collide)) {
            this.speed = C.MAX_SPEED / 5;
            this.position = U.increase(playerSegment.p1.world.z, -C.PLAYER_Z, L);
            this.shake = 0.35;
            if (playing) this.sfx('crash');
            break;
          }
        }
      }

      // Tamponamento con le auto avversarie
      for (const car of playerSegment.cars) {
        if (this.speed > car.speed && U.overlap(this.playerX, playerW, car.offset, car.w, 0.8)) {
          this.speed = car.speed * (car.speed / this.speed);
          this.position = U.increase(car.z, -C.PLAYER_Z, L);
          this.shake = 0.15;
          if (playing) this.sfx('bump');
          break;
        }
      }

      this.playerX = U.limit(this.playerX, -3, 3);
      this.speed = U.limit(this.speed, 0, C.MAX_SPEED);

      const delta = U.wrapDelta(startPosition, this.position, L);
      this.traveled += delta;
      this.updateBackground(playerSegment, delta);

      if (playing) {
        if (delta > 0) this.score += delta * C.SCORE_PER_UNIT;
        this.checkCheckpoints();
        this.checkOvertakes();
      }
    }

    updateBackground(playerSegment, delta) {
      const k = playerSegment.curve * delta / C.SEGMENT_LENGTH;
      this.skyOffset = U.increase(this.skyOffset, C.FAR_SPEED * k, 1);
      this.hillOffset = U.increase(this.hillOffset, C.NEAR_SPEED * k, 1);
    }

    checkCheckpoints() {
      const cps = this.track.checkpointZ;
      const playerZ = this.traveled + C.PLAYER_Z;
      const target = (this.lap - 1) * this.track.length + cps[this.nextCheckpoint];
      if (playerZ < target) return;

      const bonus = Math.max(C.CHECKPOINT_BONUS_MIN, C.CHECKPOINT_BONUS - (this.lap - 1));
      this.timeLeft += bonus;
      this.score += C.CHECKPOINT_SCORE * this.lap;
      this.nextCheckpoint++;

      if (this.nextCheckpoint >= cps.length) {
        this.nextCheckpoint = 0;
        this.lap++;
        this.addMessage('GIRO ' + this.lap, 2.5);
        this.addCars(Math.min(C.CARS_PER_LAP, C.MAX_CARS - this.cars.length));
        this.sfx('lap');
      } else {
        this.addMessage('CHECKPOINT!', 2.5);
        this.sfx('checkpoint');
      }
      this.addMessage('+' + bonus + ' SEC', 2.5, true);
    }

    /* Un sorpasso è un'auto che passa da davanti a dietro al giocatore. */
    checkOvertakes() {
      const L = this.track.length;
      const playerZ = U.increase(this.position, C.PLAYER_Z, L);
      for (const car of this.cars) {
        const rel = U.wrapDelta(playerZ, car.z, L);
        if (car.rel >= 0 && rel < 0 && rel > -C.SEGMENT_LENGTH * 10) {
          this.score += C.OVERTAKE_BONUS;
          this.sfx('overtake');
        }
        car.rel = rel;
      }
    }

    // ------------------------------------------------------------ traffico

    resetCars(count) {
      for (const seg of this.track.segments) seg.cars.length = 0;
      this.cars = [];
      this.addCars(count);
    }

    addCars(count) {
      const N = this.track.segments.length;
      const playerIndex = this.track.findSegment(this.position + C.PLAYER_Z).index;
      for (let i = 0; i < count; i++) {
        // Non far comparire auto proprio davanti agli occhi del giocatore
        let index;
        do {
          index = Math.floor(this.rng() * N);
        } while (U.wrapDelta(playerIndex, index, N) > -5 && U.wrapDelta(playerIndex, index, N) < C.DRAW_DISTANCE);
        const sprite = C.CAR_SPRITES[Math.floor(this.rng() * C.CAR_SPRITES.length)];
        const isTruck = sprite === 'TRUCK';
        const speed = C.MAX_SPEED / 4 + this.rng() * C.MAX_SPEED / (isTruck ? 4 : 2);
        const offset = this.rng() * (this.rng() < 0.5 ? -0.8 : 0.8);
        this.spawnCar(index * C.SEGMENT_LENGTH, offset, speed, sprite);
      }
    }

    spawnCar(z, offset, speed, sprite) {
      const key = sprite || 'CAR_BLUE';
      const car = { z: z, offset: offset, speed: speed, sprite: key, w: C.SPRITES[key].w, percent: 0, rel: undefined };
      this.track.findSegment(z).cars.push(car);
      this.cars.push(car);
      return car;
    }

    updateCars(dt, playerSegment, playerW) {
      const track = this.track;
      for (const car of this.cars) {
        const oldSegment = track.findSegment(car.z);
        car.offset += this.updateCarOffset(car, oldSegment, playerSegment, playerW);
        car.z = U.increase(car.z, dt * car.speed, track.length);
        car.percent = U.percentRemaining(car.z, C.SEGMENT_LENGTH);
        const newSegment = track.findSegment(car.z);
        if (oldSegment !== newSegment) {
          const i = oldSegment.cars.indexOf(car);
          if (i >= 0) oldSegment.cars.splice(i, 1);
          newSegment.cars.push(car);
        }
      }
    }

    /* Semplice "IA": le auto più veloci scartano chi hanno davanti. */
    updateCarOffset(car, carSegment, playerSegment, playerW) {
      const segments = this.track.segments;
      const N = segments.length;
      const lookahead = 20;

      // Auto lontane dal giocatore: inutile calcolare le manovre
      if (U.wrapDelta(playerSegment.index, carSegment.index, N) > C.DRAW_DISTANCE) return 0;

      for (let i = 1; i < lookahead; i++) {
        const segment = segments[(carSegment.index + i) % N];
        if (segment === playerSegment && car.speed > this.speed &&
            U.overlap(this.playerX, playerW, car.offset, car.w, 1.2)) {
          let dir;
          if (this.playerX > 0.5) dir = -1;
          else if (this.playerX < -0.5) dir = 1;
          else dir = car.offset > this.playerX ? 1 : -1;
          return dir * (1 / i) * (car.speed - this.speed) / C.MAX_SPEED;
        }
        for (const other of segment.cars) {
          if (other !== car && car.speed > other.speed &&
              U.overlap(car.offset, car.w, other.offset, other.w, 1.2)) {
            let dir;
            if (other.offset > 0.5) dir = -1;
            else if (other.offset < -0.5) dir = 1;
            else dir = car.offset > other.offset ? 1 : -1;
            return dir * (1 / i) * (car.speed - other.speed) / C.MAX_SPEED;
          }
        }
      }
      // Nessun ostacolo: se è troppo vicina al bordo rientra in carreggiata
      if (car.offset < -0.9) return 0.1;
      if (car.offset > 0.9) return -0.1;
      return 0;
    }

    // ------------------------------------------------------------ varie

    addMessage(text, ttl, small) {
      this.messages.push({ text: text, ttl: ttl, small: !!small });
    }

    sfx(name) {
      if (this.audio && typeof this.audio[name] === 'function') this.audio[name]();
    }

    loadHighScore() {
      if (!this.storage) return 0;
      const v = parseInt(this.storage.get(C.STORAGE_KEY), 10);
      return isNaN(v) ? 0 : v;
    }

    saveHighScore() {
      if (this.storage) this.storage.set(C.STORAGE_KEY, String(this.highScore));
    }
  }

  Game.STATE = STATE;

  return Game;
})();
