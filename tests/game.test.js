const test = require('node:test');
const assert = require('node:assert/strict');
const { RR, memoryStorage } = require('./helpers');

const C = RR.Config;
const U = RR.Util;
const STEP = C.STEP;
const GAS = { accelerate: true };

function run(game, seconds, controls) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) game.update(STEP, controls);
}

/* Partita già in corso, senza traffico (le auto si aggiungono a mano). */
function newRace(opts) {
  const game = new RR.Game(Object.assign({ cars: 0, seed: 1 }, opts));
  game.pressStart();
  run(game, C.COUNTDOWN + 0.05);
  return game;
}

/* Sposta il giocatore a una certa distanza totale percorsa. */
function placeAt(game, traveled) {
  game.traveled = traveled;
  game.position = U.increase(0, traveled, game.track.length);
}

test('dal titolo si passa al conto alla rovescia e poi alla gara', () => {
  const game = new RR.Game({ cars: 0 });
  assert.equal(game.state, 'title');
  game.pressStart();
  assert.equal(game.state, 'countdown');
  run(game, C.COUNTDOWN - 0.1);
  assert.equal(game.state, 'countdown');
  assert.equal(game.speed, 0, 'durante il semaforo l\'auto è ferma');
  run(game, 0.2);
  assert.equal(game.state, 'playing');
});

/* Pilota automatico: gas sempre, corregge la traiettoria verso il centro. */
function autopilot(game) {
  return { accelerate: true, left: game.playerX > 0.2, right: game.playerX < -0.2 };
}

function drive(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) game.update(STEP, autopilot(game));
}

test('accelerando la velocità cresce fino al massimo e il tempo scende', () => {
  const game = newRace();
  drive(game, 2);
  assert.ok(game.speed > 0 && game.speed < C.MAX_SPEED);
  drive(game, 4);
  assert.equal(game.speed, C.MAX_SPEED);
  assert.ok(game.traveled > 0);
  assert.ok(game.score > 0);
  assert.ok(Math.abs(game.timeLeft - (C.START_TIME - 6)) < 0.1);
});

test('senza gas l\'auto rallenta, frenando si ferma prima', () => {
  const a = newRace();
  const b = newRace();
  a.speed = b.speed = C.MAX_SPEED;
  run(a, 0.5, {});
  run(b, 0.5, { brake: true });
  assert.ok(a.speed < C.MAX_SPEED);
  assert.ok(b.speed < a.speed);
});

test('lo sterzo sposta l\'auto lateralmente solo se in movimento', () => {
  const game = newRace();
  run(game, 0.5, { left: true });
  assert.equal(game.playerX, 0, 'da fermi non si sterza');
  game.speed = C.MAX_SPEED / 2;
  run(game, 0.3, { left: true, accelerate: true });
  assert.ok(game.playerX < 0);
  assert.equal(game.steer, -1);
});

test('fuori strada la velocità scende sotto il limite', () => {
  const game = newRace();
  game.playerX = 2.5;
  game.speed = C.MAX_SPEED;
  run(game, 3, GAS);
  assert.ok(game.speed <= C.OFF_ROAD_LIMIT + C.ACCEL * STEP + 1e-6);
});

test('urtare un ostacolo a bordo pista fa perdere velocità', () => {
  const game = newRace();
  const track = game.track;
  // Cerca un segmento con un ostacolo solido
  const seg = track.segments.find((s) => s.index > 50 && s.sprites.some((sp) => sp.collide > 0));
  const obstacle = seg.sprites.find((sp) => sp.collide > 0);
  placeAt(game, seg.p1.world.z - C.PLAYER_Z + 1);
  game.playerX = obstacle.offset;
  game.speed = C.MAX_SPEED;
  game.update(STEP, GAS);
  assert.equal(game.speed, C.MAX_SPEED / 5);
  assert.ok(game.shake > 0);
});

test('tamponare un\'auto più lenta rallenta il giocatore', () => {
  const game = newRace();
  const z = U.increase(game.position, C.PLAYER_Z + 5, game.track.length);
  const car = game.spawnCar(z, 0, C.MAX_SPEED / 4, 'CAR_BLUE');
  game.speed = C.MAX_SPEED;
  game.update(STEP, GAS);
  assert.ok(game.speed < car.speed, 'velocità ' + game.speed);
});

test('superare un\'auto su un\'altra corsia dà il bonus sorpasso', () => {
  const game = newRace();
  const z = U.increase(game.position, C.PLAYER_Z + C.SEGMENT_LENGTH * 3, game.track.length);
  game.spawnCar(z, 0.7, C.MAX_SPEED / 4, 'CAR_BLUE');
  game.playerX = -0.6;
  game.speed = C.MAX_SPEED;
  const before = game.score;
  run(game, 0.5, GAS);
  const distancePoints = 0.5 * C.MAX_SPEED * C.SCORE_PER_UNIT;
  assert.ok(game.score - before >= C.OVERTAKE_BONUS + distancePoints * 0.9,
    'punti guadagnati: ' + (game.score - before));
});

test('il checkpoint aggiunge tempo e punti', () => {
  const game = newRace();
  const cp = game.track.checkpointZ[0];
  placeAt(game, cp - C.PLAYER_Z - 10);
  game.speed = C.MAX_SPEED;
  const time = game.timeLeft;
  game.update(STEP, GAS);
  assert.equal(game.nextCheckpoint, 1);
  assert.ok(game.timeLeft > time + C.CHECKPOINT_BONUS - 1);
  assert.ok(game.score >= C.CHECKPOINT_SCORE);
  assert.ok(game.messages.some((m) => m.text === 'CHECKPOINT!'));
});

test('l\'ultimo checkpoint completa il giro e aggiunge traffico', () => {
  const game = newRace();
  const cps = game.track.checkpointZ;
  game.nextCheckpoint = cps.length - 1;
  placeAt(game, cps[cps.length - 1] - C.PLAYER_Z - 10);
  game.speed = C.MAX_SPEED;
  game.update(STEP, GAS);
  assert.equal(game.lap, 2);
  assert.equal(game.nextCheckpoint, 0);
  assert.equal(game.cars.length, C.CARS_PER_LAP);
  // Nel secondo giro il bonus è più basso di 1 secondo
  game.cars.length = 0;
  for (const s of game.track.segments) s.cars.length = 0;
  placeAt(game, game.track.length + cps[0] - C.PLAYER_Z - 10);
  const time = game.timeLeft;
  game.update(STEP, GAS);
  assert.ok(Math.abs(game.timeLeft - time - (C.CHECKPOINT_BONUS - 1) + STEP) < 1e-6);
});

test('allo scadere del tempo è game over e il record viene salvato', () => {
  const storage = memoryStorage();
  const game = newRace({ storage });
  run(game, 3, GAS);
  assert.ok(game.score > 0);
  game.timeLeft = 0.01;
  game.update(STEP, GAS);
  assert.equal(game.state, 'gameover');
  assert.equal(game.newRecord, true);
  assert.equal(game.highScore, Math.floor(game.score));
  assert.equal(storage.get(C.STORAGE_KEY), String(game.highScore));

  // In game over l'auto rallenta da sola fino a fermarsi
  run(game, 10, GAS);
  assert.equal(game.speed, 0);

  // Un nuovo gioco rilegge il record dallo storage
  const again = new RR.Game({ storage, cars: 0 });
  assert.equal(again.highScore, game.highScore);
});

test('INVIO in game over riparte solo dopo un attimo', () => {
  const game = newRace();
  game.timeLeft = 0.01;
  game.update(STEP, {});
  game.pressStart();
  assert.equal(game.state, 'gameover');
  run(game, 2);
  game.pressStart();
  assert.equal(game.state, 'countdown');
  assert.equal(game.timeLeft, C.START_TIME);
});

test('in pausa il gioco è congelato', () => {
  const game = newRace();
  run(game, 1, GAS);
  game.togglePause();
  assert.equal(game.state, 'paused');
  const snapshot = [game.position, game.speed, game.timeLeft];
  run(game, 2, GAS);
  assert.deepEqual([game.position, game.speed, game.timeLeft], snapshot);
  game.togglePause();
  assert.equal(game.state, 'playing');
  game.back();
  assert.equal(game.state, 'paused');
  game.back();
  assert.equal(game.state, 'title');
});

test('le auto avversarie si muovono e restano nel segmento giusto', () => {
  const game = new RR.Game({ seed: 7 });
  assert.equal(game.cars.length, C.BASE_CARS);
  run(game, 5);
  for (const car of game.cars) {
    assert.ok(game.track.findSegment(car.z).cars.includes(car));
  }
  const listed = game.track.segments.reduce((n, s) => n + s.cars.length, 0);
  assert.equal(listed, game.cars.length);
});

test('una lunga partita simulata non produce valori non validi', () => {
  const game = new RR.Game({ seed: 3 });
  game.pressStart();
  for (let i = 0; i < 60 * 120; i++) {
    game.update(STEP, autopilot(game));
    assert.ok(Number.isFinite(game.position) && Number.isFinite(game.speed) && Number.isFinite(game.score));
    if (game.state === 'gameover') break;
  }
  assert.ok(game.traveled > 0);
});
