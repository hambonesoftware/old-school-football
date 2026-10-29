// Development only: npm install --no-save @napi-rs/canvas, then run this script.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let createCanvas;
try { ({ createCanvas } = require('@napi-rs/canvas')); }
catch { ({ createCanvas } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/@napi-rs/canvas')); }
globalThis.document = { createElement: () => createCanvas(256,288) };
const { sprite } = await import('../js/player-model.js');
mkdirSync(new URL('../assets/', import.meta.url), { recursive:true });
for (const number of [22,41,42,43,44,45,46]) {
  const canvas = createCanvas(2048,864), ctx = canvas.getContext('2d');
  for (let frame = 0; frame < 20; frame++) {
    const pose = frame === 17 ? 'brace' : frame === 18 ? 'tackle' : frame === 19 ? 'celebrate' : 'run';
    const image = sprite(number === 22,number,frame < 16 ? frame : 0,number === 22 ? 0 : 4,frame < 16,pose,0);
    ctx.drawImage(image,(frame%8)*256,Math.floor(frame/8)*288);
  }
  writeFileSync(new URL(`../assets/player-${number}.png`,import.meta.url),canvas.toBuffer('image/png'));
}
