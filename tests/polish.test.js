import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine.js';

test('tackle preserves contact scene and ignores controls until aftermath completes', () => {
  const g = new Game(() => .1); g.snap();
  g.yard = 29.8; g.lane = 1;
  g.defenders = [{ lane: 1, yard: 29.8 }];
  const formation = g.defenders, play = g.playNumber, clock = g.time;
  g.collision();
  assert.equal(g.phase, 'aftermath');
  assert.equal(g.aftermath.yard, 29.8);
  assert.equal(g.aftermath.defender, 0);
  assert.equal(g.defenders, formation);
  g.move('right'); g.snap(); g.update(.3);
  assert.equal(g.lane, 1); assert.equal(g.playNumber, play);
  assert.equal(g.time, clock);
  g.update(.33);
  assert.equal(g.phase, 'ready'); assert.equal(g.playNumber, play + 1);
  assert.equal(g.spot, 30);
});

test('paused aftermath cannot reset the play', () => {
  const g = new Game(); g.snap(); g.finish();
  g.phase = 'paused'; g.update(10);
  assert.equal(g.aftermath.age, 0);
  g.phase = 'aftermath'; g.update(.7);
  assert.equal(g.phase, 'ready');
});

test('committed defender stays in lane and recovers after a successful dodge', () => {
  const g = new Game(() => .1); g.snap();
  g.defenders = [{ lane: 2, yard: 30, state: 'commit', timer: .16, stride: 0 }];
  g.move('left');
  for (let i = 0; i < 36; i++) g.update(.01);
  assert.equal(g.phase, 'live');
  assert.equal(g.defenders[0].lane, 2);
  assert.equal(g.defenders[0].state, 'recover');
  assert.equal(g.event.type, 'miss');
});

test('first-down marker event happens once while the play continues', () => {
  const g = new Game(); g.snap(); g.defenders = []; g.yard = 35;
  g.update(.01); const id = g.eventId;
  assert.equal(g.event.type, 'marker'); assert.equal(g.phase, 'live');
  g.update(.1); assert.equal(g.eventId, id);
});

test('winning play emits touchdown and resets celebration time', () => {
  const g = new Game(); g.snap(); g.defenders = []; g.yard = 99.99;
  g.update(.1);
  assert.equal(g.event.type, 'touchdown'); assert.equal(g.presentationTime, 0);
  g.update(.2); assert.equal(g.presentationTime, .2);
});

test('a fourth-down tackle shows contact before ending the challenge', () => {
  const g = new Game(); g.snap(); g.down = 4; g.finish();
  assert.equal(g.phase, 'aftermath');
  g.update(.7);
  assert.equal(g.phase, 'over'); assert.equal(g.event.type, 'loss');
});
