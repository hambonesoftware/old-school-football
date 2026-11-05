import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PLAY_VERSION,calculateSafeRect} from "../vendor/hambone-play/hambone-play.js";

const game=readFileSync("js/main.js","utf8");
const html=readFileSync("index.html","utf8");
const css=readFileSync("play-football.css","utf8");
test("real controls are relocated into the game world without replacing handlers",()=>{
  assert.equal(PLAY_VERSION,"1.0.0");
  assert.match(game,/hud\.placeControl\(\$\("snap"\), "actions"\)/);
  assert.match(game,/hud\.placeControl\(\$\("pause"\), "utilities"\)/);
  assert.match(game,/root\.appendChild\(dpad\)/);
  assert.match(game,/\$\('snap'\)\.onclick = snap/);
  assert.match(game,/for \(const button of document\.querySelectorAll\('\[data-dir\]'\)\)/);
});
test("Broadcast HUD fits an immersive football field",()=>{
  assert.match(html,/play-football\.css/);
  assert.match(css,/\.masthead,\.scorebug,\.play-strip,\.control-deck\{display:none!important\}/);
  const rect=calculateSafeRect(390,844,[
    {left:10,top:10,right:265,bottom:64},
    {left:240,top:775,right:388,bottom:844}
  ]);
  assert.ok(rect.width>0&&rect.height>0&&rect.y>64);
});
