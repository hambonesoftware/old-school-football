import test from 'node:test';
import assert from 'node:assert/strict';
import { bevelGeometry, buildFootballModel } from '../js/player-model.js';

test('beveled blocks are finite and contained within their requested bounds', () => {
  const center = [1,2,3], size = [2,4,6];
  const mesh = bevelGeometry(center,size);
  assert.equal(mesh.vertices.length,32);
  for (const v of mesh.vertices) for (let i=0;i<3;i++) {
    assert.ok(Number.isFinite(v[i]));
    assert.ok(Math.abs(v[i]-center[i]) <= size[i]/2+.0001);
  }
  assert.ok(mesh.faces.every(f => f.every(i => i>=0 && i<32)));
});

test('both football teams produce valid articulated geometry through an entire run cycle', () => {
  for (const home of [true,false]) for (let frame=0;frame<16;frame++) {
    const faces = buildFootballModel({home,number:home?22:41,cycle:frame/16*Math.PI*2,running:true,yaw:home?0:Math.PI});
    assert.ok(faces.length>100);
    assert.ok(faces.every(f => f.points.length>=3 && f.points.every(p => p.length===3 && p.every(Number.isFinite))));
  }
});

test('running articulates limbs while idle is independent of the gait clock', () => {
  assert.notDeepEqual(buildFootballModel({running:true,cycle:0}),buildFootballModel({running:true,cycle:Math.PI/2}));
  assert.deepEqual(buildFootballModel({running:false,cycle:0}),buildFootballModel({running:false,cycle:Math.PI/2}));
});
