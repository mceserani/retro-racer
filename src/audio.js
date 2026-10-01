/*
 * Retro Racer - effetti sonori sintetizzati con la Web Audio API.
 *
 * Nessun file audio: motore, bip ed effetti sono generati con oscillatori
 * e rumore bianco. Il contesto audio si crea al primo tasto premuto,
 * perché i browser bloccano l'audio prima di un'interazione dell'utente.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Audio = (function () {
  'use strict';

  const C = RR.Config;

  class GameAudio {
    constructor(storage) {
      this.storage = storage || null;
      this.ctx = null;
      this.muted = !!(this.storage && this.storage.get(C.MUTE_KEY) === '1');
      this.lastEngine = { sp: -1, on: null };
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(ctx.destination);

      // Motore: dente di sega + onda quadra un'ottava sotto, filtrati
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.osc1 = ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.value = 45;
      this.osc2 = ctx.createOscillator();
      this.osc2.type = 'square';
      this.osc2.frequency.value = 25;
      const g2 = ctx.createGain();
      g2.gain.value = 0.5;
      this.osc1.connect(filter);
      this.osc2.connect(g2);
      g2.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.osc1.start();
      this.osc2.start();

      // Rumore bianco riutilizzabile per urti e schianti
      const len = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }

    /* Aggiorna il motore: sp = velocità 0..1, on = motore udibile. */
    setEngine(sp, on) {
      if (!this.ctx) return;
      const last = this.lastEngine;
      if (on === last.on && Math.abs(sp - last.sp) < 0.01) return;
      last.sp = sp;
      last.on = on;
      const t = this.ctx.currentTime;
      const f = 45 + sp * 170;
      this.osc1.frequency.setTargetAtTime(f, t, 0.05);
      this.osc2.frequency.setTargetAtTime(f / 2 + 3, t, 0.05);
      this.engineGain.gain.setTargetAtTime(on ? 0.05 + 0.07 * sp : 0, t, 0.08);
    }

    tone(freq, dur, opts) {
      if (!this.ctx) return;
      const o = opts || {};
      const t = this.ctx.currentTime + (o.delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      g.gain.setValueAtTime(o.vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    noise(dur, vol, cutoff) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff || 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    // --- effetti di gioco
    countdown() { this.tone(440, 0.18, { vol: 0.25 }); }
    go() { this.tone(880, 0.45, { vol: 0.25 }); }
    tick() { this.tone(1000, 0.05, { vol: 0.12 }); }
    crash() {
      this.noise(0.45, 0.5, 900);
      this.tone(140, 0.35, { type: 'sawtooth', vol: 0.25, slide: 40 });
    }
    bump() {
      this.noise(0.12, 0.25, 1500);
      this.tone(220, 0.12, { vol: 0.2, slide: 90 });
    }
    overtake() {
      this.tone(990, 0.06, { vol: 0.1 });
      this.tone(1320, 0.06, { vol: 0.1, delay: 0.06 });
    }
    checkpoint() {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { vol: 0.18, delay: i * 0.08 }));
    }
    lap() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.14, { vol: 0.18, delay: i * 0.09 }));
    }
    gameOver() {
      [523, 440, 349, 262].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.3, delay: i * 0.25 }));
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.storage) this.storage.set(C.MUTE_KEY, this.muted ? '1' : '0');
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
      return this.muted;
    }
  }

  return GameAudio;
})();
