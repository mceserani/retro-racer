/*
 * Retro Racer - generazione del tracciato.
 *
 * Il circuito è un anello di segmenti. Ogni segmento ha due punti (p1, p2)
 * con coordinate mondo; la curvatura è un valore per segmento che il
 * renderer accumula per piegare la strada (tecnica pseudo-3D classica).
 * Gli elementi a bordo pista sono piazzati con un generatore deterministico:
 * a parità di seme il tracciato è sempre identico.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Track = (function () {
  'use strict';

  const C = RR.Config;
  const U = RR.Util;

  const LENGTH = { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 };
  const HILL = { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 };
  const CURVE = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 };

  class Track {
    constructor(seed) {
      this.seed = seed === undefined ? C.TRACK_SEED : seed;
      this.segments = [];
      this.checkpointZ = [];      // distanze assolute (nel giro) dei checkpoint
      this.checkpointIndex = [];  // indici dei segmenti dei checkpoint
      this.build();
    }

    get length() {
      return this.segments.length * C.SEGMENT_LENGTH;
    }

    findSegment(z) {
      const n = this.segments.length;
      return this.segments[((Math.floor(z / C.SEGMENT_LENGTH) % n) + n) % n];
    }

    lastY() {
      const s = this.segments;
      return s.length === 0 ? 0 : s[s.length - 1].p2.world.y;
    }

    addSegment(curve, y) {
      const n = this.segments.length;
      this.segments.push({
        index: n,
        p1: { world: { x: 0, y: this.lastY(), z: n * C.SEGMENT_LENGTH }, camera: {}, screen: {} },
        p2: { world: { x: 0, y: y, z: (n + 1) * C.SEGMENT_LENGTH }, camera: {}, screen: {} },
        curve: curve,
        sprites: [],
        cars: [],
        color: Math.floor(n / C.RUMBLE_LENGTH) % 2 ? C.COLORS.DARK : C.COLORS.LIGHT,
        looped: false,
        fog: 1,
        clip: 0
      });
    }

    /*
     * Aggiunge un tratto: ingresso (enter), parte centrale (hold) e uscita (leave).
     * curve = curvatura (positiva a destra), height = dislivello in segmenti.
     */
    addRoad(enter, hold, leave, curve, height) {
      const startY = this.lastY();
      const endY = startY + (height || 0) * C.SEGMENT_LENGTH;
      const total = enter + hold + leave;
      const first = this.segments.length;
      let n;
      for (n = 0; n < enter; n++) {
        this.addSegment(U.easeIn(0, curve, n / enter), U.easeInOut(startY, endY, (n + 1) / total));
      }
      for (n = 0; n < hold; n++) {
        this.addSegment(curve, U.easeInOut(startY, endY, (enter + n + 1) / total));
      }
      for (n = 0; n < leave; n++) {
        this.addSegment(U.easeInOut(curve, 0, n / leave), U.easeInOut(startY, endY, (enter + hold + n + 1) / total));
      }
      // Cartelli di pericolo sul lato esterno delle curve impegnative
      if (Math.abs(curve) >= CURVE.MEDIUM) {
        const key = curve > 0 ? 'SIGN_RIGHT' : 'SIGN_LEFT';
        const offset = curve > 0 ? -1.25 : 1.25;
        for (let i = 0; i < 4; i++) this.addSprite(first + i * 6, key, offset);
      }
    }

    addStraight(num) { this.addRoad(num, num, num, 0, 0); }
    addHill(num, height) { this.addRoad(num, num, num, 0, height); }
    addCurve(num, curve, height) { this.addRoad(num, num, num, curve, height); }

    addSCurves() {
      const S = LENGTH.SHORT;
      this.addRoad(S, S, S, -CURVE.EASY, HILL.NONE);
      this.addRoad(S, S, S, CURVE.MEDIUM, HILL.MEDIUM);
      this.addRoad(S, S, S, CURVE.EASY, -HILL.LOW);
      this.addRoad(S, S, S, -CURVE.EASY, HILL.MEDIUM);
      this.addRoad(S, S, S, -CURVE.MEDIUM, -HILL.MEDIUM);
    }

    addLowRollingHills(num, height) {
      this.addRoad(num, num, num, 0, height / 2);
      this.addRoad(num, num, num, 0, -height);
      this.addRoad(num, num, num, CURVE.EASY, height);
      this.addRoad(num, num, num, 0, 0);
      this.addRoad(num, num, num, -CURVE.EASY, height / 2);
      this.addRoad(num, num, num, 0, 0);
    }

    addBumps() {
      const heights = [5, -2, -5, 8, 5, -7, 5, -2];
      for (const h of heights) this.addRoad(10, 10, 10, 0, h);
    }

    /* Ultimo tratto: riporta la quota a 0 per chiudere l'anello senza scalini. */
    addDownhillToEnd(num) {
      this.addRoad(num, num, num, -CURVE.EASY, -this.lastY() / C.SEGMENT_LENGTH);
    }

    addSprite(index, key, offset) {
      const seg = this.segments[index];
      if (!seg) return;
      const def = C.SPRITES[key];
      seg.sprites.push({ source: key, offset: offset, w: def.w, collide: def.collide || 0 });
    }

    build() {
      this.addStraight(LENGTH.MEDIUM);
      this.addCurve(LENGTH.MEDIUM, CURVE.MEDIUM, HILL.LOW);
      this.addHill(LENGTH.MEDIUM, HILL.MEDIUM);
      this.addSCurves();
      this.addLowRollingHills(LENGTH.SHORT, HILL.LOW);
      this.addCurve(LENGTH.LONG, -CURVE.MEDIUM, HILL.MEDIUM);
      this.addBumps();
      this.addHill(LENGTH.LONG, -HILL.HIGH);
      this.addCurve(LENGTH.MEDIUM, CURVE.HARD, -HILL.MEDIUM);
      this.addCurve(LENGTH.MEDIUM, -CURVE.EASY, HILL.LOW);
      this.addCurve(LENGTH.SHORT, -CURVE.HARD, HILL.NONE);
      this.addCurve(LENGTH.SHORT, CURVE.HARD, HILL.NONE);
      this.addStraight(LENGTH.MEDIUM);
      this.addDownhillToEnd(LENGTH.MEDIUM);
      this.addStraight(LENGTH.SHORT);

      this.placeStartAndCheckpoints();
      this.placeScenery();
    }

    placeStartAndCheckpoints() {
      const N = this.segments.length;
      const S = C.START_INDEX;
      const CP = C.CHECKPOINTS_PER_LAP;

      this.segments[S].color = C.COLORS.START;
      this.segments[S + 1].color = C.COLORS.START;
      this.addSprite(S, 'BANNER_START', 0);

      for (let k = 1; k <= CP; k++) {
        const rel = S + Math.round(k * N / CP);
        this.checkpointZ.push(rel * C.SEGMENT_LENGTH);
        const idx = rel % N;
        this.checkpointIndex.push(idx);
        if (k < CP) {
          this.segments[idx].color = C.COLORS.CHECKPOINT;
          this.segments[(idx + 1) % N].color = C.COLORS.CHECKPOINT;
          this.addSprite(idx, 'BANNER_CHECK', 0);
        }
      }
    }

    placeScenery() {
      const rng = U.makeRng(this.seed);
      const N = this.segments.length;
      const side = () => (rng() < 0.5 ? -1 : 1);

      // Segmenti con striscione: lasciamo libera la zona intorno
      const busy = new Set();
      for (const idx of [C.START_INDEX].concat(this.checkpointIndex)) {
        for (let d = -3; d <= 3; d++) busy.add((idx + d + N) % N);
      }

      // Cartelloni pubblicitari
      let b = 0;
      for (let n = 40; n < N - 20; n += 120 + Math.floor(rng() * 80)) {
        if (busy.has(n)) continue;
        this.addSprite(n, C.BILLBOARDS[b++ % C.BILLBOARDS.length], side() * (1.9 + rng() * 0.4));
      }

      for (let n = 15; n < N; n++) {
        if (busy.has(n)) continue;
        const f = n / N;
        const beach = f < 0.35 || f > 0.8;

        if (beach) {
          // Palme che costeggiano la strada, più qualcuna sparsa
          if (n % 5 === 0) {
            this.addSprite(n, 'PALM', -(1.4 + rng() * 0.2));
            this.addSprite(n, 'PALM', 1.4 + rng() * 0.2);
          }
          if (rng() < 0.08) this.addSprite(n, 'PALM', side() * (2.2 + rng() * 3));
        } else {
          // Zona collinare: pini più fitti e irregolari
          if (n % 4 === 0) this.addSprite(n, 'PINE', side() * (1.4 + rng() * 4));
          if (rng() < 0.1) this.addSprite(n, 'PINE', side() * (2 + rng() * 4));
        }

        if (n % 7 === 0) this.addSprite(n, 'BUSH', side() * (1.25 + rng() * 0.6));
      }
    }
  }

  Track.LENGTH = LENGTH;
  Track.HILL = HILL;
  Track.CURVE = CURVE;

  return Track;
})();
