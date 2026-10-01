const test = require('node:test');
const assert = require('node:assert/strict');
const { RR } = require('./helpers');

const C = RR.Config;

test('il tracciato ha una lunghezza ragionevole', () => {
  const track = new RR.Track();
  assert.ok(track.segments.length > 1000, 'troppi pochi segmenti: ' + track.segments.length);
  assert.equal(track.length, track.segments.length * C.SEGMENT_LENGTH);
});

test('le quote sono continue e l\'anello si chiude a quota 0', () => {
  const { segments } = new RR.Track();
  assert.equal(segments[0].p1.world.y, 0);
  for (let i = 1; i < segments.length; i++) {
    assert.equal(segments[i].p1.world.y, segments[i - 1].p2.world.y);
  }
  assert.ok(Math.abs(segments[segments.length - 1].p2.world.y) < 1e-6);
});

test('findSegment avvolge le coordinate sul circuito', () => {
  const track = new RR.Track();
  assert.equal(track.findSegment(0).index, 0);
  assert.equal(track.findSegment(C.SEGMENT_LENGTH * 3 + 10).index, 3);
  assert.equal(track.findSegment(track.length + C.SEGMENT_LENGTH).index, 1);
});

test('a parità di seme il tracciato è identico', () => {
  const a = new RR.Track(123);
  const b = new RR.Track(123);
  const dump = (t) => JSON.stringify(t.segments.map((s) => s.sprites));
  assert.equal(dump(a), dump(b));
});

test('checkpoint: uno per quarto di giro, l\'ultimo è il traguardo', () => {
  const track = new RR.Track();
  const N = track.segments.length;
  assert.equal(track.checkpointZ.length, C.CHECKPOINTS_PER_LAP);
  for (let i = 1; i < track.checkpointZ.length; i++) {
    assert.ok(track.checkpointZ[i] > track.checkpointZ[i - 1]);
  }
  assert.equal(track.checkpointZ[track.checkpointZ.length - 1], (C.START_INDEX + N) * C.SEGMENT_LENGTH);
  assert.equal(track.segments[C.START_INDEX].color, C.COLORS.START);
  for (const idx of track.checkpointIndex.slice(0, -1)) {
    assert.equal(track.segments[idx].color, C.COLORS.CHECKPOINT);
  }
});

test('nessun ostacolo solido invade la carreggiata', () => {
  const { segments } = new RR.Track();
  for (const seg of segments) {
    for (const s of seg.sprites) {
      if (s.collide > 0) {
        const inner = Math.abs(s.offset) - (s.w * s.collide) / 2;
        assert.ok(inner > 1, `sprite ${s.source} nel segmento ${seg.index} invade la strada`);
      }
    }
  }
});
