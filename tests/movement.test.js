import test from 'node:test';
import assert from 'node:assert/strict';
import { MovementClock } from '../js/movement.js';
import { BALANCE } from '../js/tuning.js';

test('rapid direction changes cannot bypass the shared movement cadence',()=>{
  const input=new MovementClock(BALANCE.playerStepSeconds),moves=[];
  input.press('up');input.advance(0,d=>moves.push(d));
  for(let i=0;i<10;i++){input.press(i%2?'left':'right');input.advance(.01,d=>moves.push(d));}
  assert.equal(moves.length,1);
  input.advance(.05,d=>moves.push(d));assert.equal(moves.length,2);
});
test('short taps during cooldown are buffered once, and cancel clears them',()=>{
  const input=new MovementClock(.15),moves=[];
  input.press('up');input.advance(0,d=>moves.push(d));input.release();
  input.press('left');input.release();input.advance(.15,d=>moves.push(d));
  input.advance(.15,d=>moves.push(d));assert.deepEqual(moves,['up','left']);
  input.press('right');input.cancel();input.advance(.15,d=>moves.push(d));assert.equal(moves.length,2);
});
