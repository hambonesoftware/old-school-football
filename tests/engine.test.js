import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../js/engine.js';
test('movement only during play and lane boundaries',()=>{const g=new Game(()=>.9);g.move('up');assert.equal(g.yard,25);g.snap();for(let i=0;i<10;i++)g.move('left');assert.equal(g.lane,0);});
test('first down resets the count and advances marker',()=>{const g=new Game();g.snap();g.yard=36;g.finish();assert.equal(g.down,1);assert.equal(g.target,46);assert.equal(g.spot,36);assert.equal(g.phase,'ready');});
test('four unsuccessful plays end drive',()=>{const g=new Game();for(let i=0;i<4;i++){g.snap();g.finish();}assert.equal(g.phase,'over');assert.match(g.message,/Turnover/);});
test('touchdown wins immediately',()=>{const g=new Game();g.snap();g.yard=99;g.move('up');assert.equal(g.score,20);assert.equal(g.phase,'over');});
test('clock expires; pause does not consume time',()=>{const g=new Game();g.snap();g.phase='paused';g.update(5);assert.equal(g.time,120);g.phase='live';g.time=.01;g.update(.02);assert.equal(g.time,0);assert.equal(g.phase,'over');});
test('contact ends a play',()=>{const g=new Game();g.snap();g.defenders=[{lane:2,yard:26}];g.move('up');assert.equal(g.phase,'ready');assert.equal(g.down,2);});
test('new challenge resets previous result',()=>{const g=new Game();g.phase='over';g.snap();assert.equal(g.phase,'ready');assert.equal(g.spot,25);assert.equal(g.time,120);});
