const test = require('node:test');
const assert = require('node:assert/strict');
const { RR } = require('./helpers');

const U = RR.Util;

test('increase avvolge il valore nell\'intervallo [0, max)', () => {
  assert.equal(U.increase(90, 20, 100), 10);
  assert.equal(U.increase(5, -10, 100), 95);
  assert.equal(U.increase(0, 100, 100), 0);
  assert.equal(U.increase(10, 5, 100), 15);
});

test('wrapDelta restituisce la distanza più breve sull\'anello', () => {
  assert.equal(U.wrapDelta(10, 20, 100), 10);
  assert.equal(U.wrapDelta(95, 5, 100), 10);
  assert.equal(U.wrapDelta(5, 95, 100), -10);
});

test('limit, interpolate e funzioni di easing', () => {
  assert.equal(U.limit(5, 0, 3), 3);
  assert.equal(U.limit(-1, 0, 3), 0);
  assert.equal(U.interpolate(10, 20, 0.5), 15);
  assert.equal(U.easeIn(0, 10, 1), 10);
  assert.equal(U.easeOut(0, 10, 0), 0);
  assert.ok(Math.abs(U.easeInOut(0, 10, 0.5) - 5) < 1e-9);
  assert.ok(Math.abs(U.easeInOut(0, 10, 1) - 10) < 1e-9);
});

test('percentRemaining restituisce la frazione dentro il segmento', () => {
  assert.equal(U.percentRemaining(250, 200), 0.25);
  assert.equal(U.percentRemaining(400, 200), 0);
});

test('overlap rileva sovrapposizioni e distanze', () => {
  assert.equal(U.overlap(0, 1, 0.9, 1), true);
  assert.equal(U.overlap(0, 1, 1.1, 1), false);
  assert.equal(U.overlap(0, 1, 0.9, 1, 0.5), false);
});

test('exponentialFog vale 1 vicino e decresce con la distanza', () => {
  assert.equal(U.exponentialFog(0, 5), 1);
  assert.ok(U.exponentialFog(0.5, 5) < 1);
  assert.ok(U.exponentialFog(1, 5) < U.exponentialFog(0.5, 5));
});

test('project proietta un punto sullo schermo', () => {
  const p = { world: { x: 0, y: 0, z: 1000 }, camera: {}, screen: {} };
  U.project(p, 0, 1000, 0, 1, 320, 240, 2000);
  assert.equal(p.screen.scale, 0.001);
  assert.equal(p.screen.x, 160);
  assert.equal(p.screen.y, 240);
  assert.equal(p.screen.w, 320);
});

test('makeRng è deterministico e restituisce valori in [0, 1)', () => {
  const a = U.makeRng(42);
  const b = U.makeRng(42);
  for (let i = 0; i < 1000; i++) {
    const va = a();
    assert.equal(va, b());
    assert.ok(va >= 0 && va < 1);
  }
});

test('pad aggiunge zeri iniziali', () => {
  assert.equal(U.pad(42, 5), '00042');
  assert.equal(U.pad(123456, 3), '123456');
});
