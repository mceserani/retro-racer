/*
 * Retro Racer - funzioni matematiche di supporto (pure, senza DOM).
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Util = (function () {
  'use strict';

  const U = {
    limit(value, min, max) {
      return Math.max(min, Math.min(value, max));
    },

    /* Somma con avvolgimento nell'intervallo [0, max): serve per il circuito ad anello. */
    increase(start, increment, max) {
      let result = start + increment;
      while (result >= max) result -= max;
      while (result < 0) result += max;
      return result;
    },

    /* Differenza b - a sull'anello di lunghezza length, nell'intervallo [-length/2, length/2). */
    wrapDelta(a, b, length) {
      let d = b - a;
      while (d >= length / 2) d -= length;
      while (d < -length / 2) d += length;
      return d;
    },

    accelerate(v, accel, dt) {
      return v + accel * dt;
    },

    interpolate(a, b, percent) {
      return a + (b - a) * percent;
    },

    percentRemaining(n, total) {
      return (n % total) / total;
    },

    easeIn(a, b, percent) {
      return a + (b - a) * Math.pow(percent, 2);
    },

    easeOut(a, b, percent) {
      return a + (b - a) * (1 - Math.pow(1 - percent, 2));
    },

    easeInOut(a, b, percent) {
      return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
    },

    /* 1 = nessuna nebbia, tende a 0 con la distanza (0..1). */
    exponentialFog(distance, density) {
      return 1 / Math.pow(Math.E, distance * distance * density);
    },

    /* Sovrapposizione di due intervalli centrati in x1 e x2, larghi w1 e w2. */
    overlap(x1, w1, x2, w2, percent) {
      const half = (percent || 1) / 2;
      const min1 = x1 - w1 * half;
      const max1 = x1 + w1 * half;
      const min2 = x2 - w2 * half;
      const max2 = x2 + w2 * half;
      return !((max1 < min2) || (min1 > max2));
    },

    /*
     * Proiezione prospettica di un punto: mondo -> camera -> schermo.
     * p = { world: {x,y,z}, camera: {}, screen: {} }
     */
    project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
      p.camera.x = (p.world.x || 0) - cameraX;
      p.camera.y = (p.world.y || 0) - cameraY;
      p.camera.z = (p.world.z || 0) - cameraZ;
      p.screen.scale = cameraDepth / p.camera.z;
      p.screen.x = width / 2 + p.screen.scale * p.camera.x * width / 2;
      p.screen.y = Math.round(height / 2 - p.screen.scale * p.camera.y * height / 2);
      p.screen.w = p.screen.scale * roadWidth * width / 2;
    },

    /* Generatore pseudo-casuale deterministico (mulberry32). */
    makeRng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    pad(n, digits) {
      let s = String(Math.max(0, Math.floor(n)));
      while (s.length < digits) s = '0' + s;
      return s;
    }
  };

  return U;
})();
