import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine.js';

test('movement only during play and lane boundaries', () => {
  const g = new Game(() => .9);
  g.move('up');
  assert.equal(g.yard, 25);
  g.snap();
  for (let i = 0; i < 10; i++) g.move('left');
  assert.equal(g.lane, 0);
});

test('arcade mode automatically makes forward progress without input', () => {
  const g = new Game(() => .9);
  g.defenders = [];
  g.snap();
  g.update(1);
  assert.ok(g.yard > 30 && g.yard < 33);
  assert.ok(g.runSpeed > 7);
});

test('arcade steering does not sacrifice forward distance', () => {
  const straight = new Game(() => .9);
  const cutting = new Game(() => .9);
  straight.defenders = [];
  cutting.defenders = [];
  straight.snap();
  cutting.snap();
  for (let i = 0; i < 100; i++) {
    if (i === 25) cutting.move('left');
    if (i === 50) cutting.move('right');
    straight.update(.01);
    cutting.update(.01);
  }
  assert.ok(cutting.yard > 30);
  assert.ok(Math.abs(straight.yard - cutting.yard) < .000001);
});

test('up surges and down brakes in arcade mode', () => {
  const cruise = new Game(() => .9);
  const surge = new Game(() => .9);
  const brake = new Game(() => .9);
  for (const g of [cruise, surge, brake]) {
    g.defenders = [];
    g.snap();
  }
  for (let i = 0; i < 100; i++) {
    cruise.update(.01);
    surge.update(.01, 'up');
    brake.update(.01, 'down');
  }
  assert.ok(surge.yard > cruise.yard);
  assert.ok(cruise.yard > brake.yard);
});

test('classic mode retains four-direction grid steps', () => {
  const g = new Game(() => .9, undefined, 'classic');
  g.defenders = [];
  g.snap();
  g.update(.5);
  assert.equal(g.yard, 25);
  g.move('up');
  assert.equal(g.yard, 26);
  g.move('left');
  assert.equal(g.yard, 26);
  g.move('down');
  assert.equal(g.yard, 25);
});

test('first down resets the count and advances marker', () => {
  const g = new Game();
  g.snap();
  g.yard = 36;
  g.finish();
  g.update(.7);
  assert.equal(g.down, 1);
  assert.equal(g.target, 46);
  assert.equal(g.spot, 36);
  assert.equal(g.phase, 'ready');
});

test('four unsuccessful plays end drive', () => {
  const g = new Game();
  for (let i = 0; i < 4; i++) {
    g.snap();
    g.finish();
  g.update(.7);
  }
  assert.equal(g.phase, 'over');
  assert.match(g.message, /Turnover/);
});

test('touchdown wins when runner reaches the end zone', () => {
  const g = new Game();
  g.snap();
  g.defenders = [];
  g.yard = 99;
  g.update(.8);
  assert.equal(g.score, 20);
  assert.equal(g.phase, 'over');
});

test('clock expires; pause does not consume time', () => {
  const g = new Game();
  g.snap();
  g.phase = 'paused';
  g.update(5);
  assert.equal(g.time, 120);
  g.phase = 'live';
  g.time = .01;
  g.update(.02);
  assert.equal(g.time, 0);
  assert.equal(g.phase, 'over');
});

test('a defender on the swept path ends the play', () => {
  const g = new Game(() => .9);
  g.snap();
  g.defenders = [{ lane: 2, yard: 27 }];
  g.update(.75);
  g.update(.7);
  assert.equal(g.phase, 'ready');
  assert.equal(g.down, 2);
  assert.ok(g.spot >= 26 && g.spot <= 27);
});

test('new challenge resets previous result', () => {
  const g = new Game();
  g.phase = 'over';
  g.snap();
  assert.equal(g.phase, 'ready');
  assert.equal(g.spot, 25);
  assert.equal(g.time, 120);
});

test('changing modes starts a fresh drive without losing the setting', () => {
  const g = new Game();
  g.snap();
  g.setControlMode('classic');
  assert.equal(g.controlMode, 'classic');
  assert.equal(g.phase, 'ready');
  assert.equal(g.spot, 25);
  assert.equal(g.playNumber, 1);
});

test('nearest defender starts far enough ahead to run before contact', () => {
  const g = new Game(() => .01);
  assert.equal(g.defenders[0].yard - g.spot, 6);
});

test('snap preserves the exact preview formation without consuming randomness', () => {
  let calls = 0;
  const g = new Game(() => {
    calls++;
    return (calls % 5) / 5;
  });
  const preview = structuredClone({
    lane: g.lane, yard: g.yard, defenders: g.defenders, play: g.playNumber
  });
  const before = calls;
  g.update(10);
  assert.equal(g.time, 120);
  g.snap();
  assert.deepEqual({
    lane: g.lane, yard: g.yard, defenders: g.defenders, play: g.playNumber
  }, preview);
  assert.equal(calls, before);
});

test('tackle prepares a stable new formation before the next snap', () => {
  let calls = 0;
  const g = new Game(() => (calls++ % 5) / 5);
  g.snap();
  g.yard = 32;
  g.finish();
  g.update(.7);
  assert.equal(g.phase, 'ready');
  assert.equal(g.yard, 32);
  assert.equal(g.lane, 2);
  assert.equal(g.defenders[0].yard, 38);
  const upcoming = structuredClone(g.defenders);
  g.update(30);
  g.move('up');
  assert.deepEqual(g.defenders, upcoming);
  assert.equal(g.yard, 32);
  g.snap();
  assert.deepEqual(g.defenders, upcoming);
});

test('best drive records the rounded yards awarded at a tackle', () => {
  const g = new Game(() => .9);
  g.snap();
  g.yard = 29.8;
  g.finish();
  g.update(.7);
  assert.equal(g.spot, 30);
  assert.equal(g.gained, 5);
});

