import { MovementClock } from '../js/movement.js';
import { Game } from '../js/engine.js';
import { writeFileSync } from 'node:fs';

const BASELINE = { playerStepSeconds:.170,defenderBaseSeconds:.600,defenderMaxRampSeconds:.140,defenderRampPerYard:.0018,defenderChaseChance:.64,firstDefenderGap:5,frontCenterChance:0 };
const CLASSIC_V04 = { playerStepSeconds:.150,defenderBaseSeconds:.560,defenderMaxRampSeconds:.110,defenderRampPerYard:.0015,defenderChaseChance:.64,firstDefenderGap:2,frontCenterChance:.75 };
const cases = [
  {seed:101,style:'straight'}, {seed:202,style:'straight'},
  {seed:303,style:'reactive'}, {seed:404,style:'reactive'}, {seed:505,style:'reactive'}, {seed:606,style:'reactive'},
  {seed:707,style:'reader'}, {seed:808,style:'reader'}, {seed:909,style:'reader'}, {seed:1010,style:'reader'}
];
function random(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15,1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7,61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function destination(lane,yard,dir) {
  return {lane:Math.max(0,Math.min(4,lane+(dir==='left'?-1:dir==='right'?1:0))),yard:Math.max(0,yard+(dir==='up'?1:dir==='down'?-1:0))};
}
function risk(lane,yard,defenders) {
  let score=0;
  for(const d of defenders) {
    const dx=Math.abs(d.lane-lane),dy=d.yard-yard;
    if(dx===0&&dy===0)return 10000;
    if(dx===0&&dy>0&&dy<=3)score += [0,20,7,2][dy];
    if(dx===1&&Math.abs(dy)<=1)score+=2;
  }
  return score;
}
function choose(g,style,rng,seen) {
  if(style==='straight')return 'up';
  if(style==='reactive') {
    if(rng()<.12)return 'up';
    const threat=seen.some(d=>d.lane===g.lane&&d.yard>=g.yard&&d.yard<=g.yard+2);
    if(!threat)return 'up';
    return ['left','right','up'].map(dir=>({dir,p:destination(g.lane,g.yard,dir)}))
      .filter(x=>x.p.lane!==g.lane||x.dir==='up')
      .sort((a,b)=>risk(a.p.lane,a.p.yard,seen)-risk(b.p.lane,b.p.yard,seen))[0].dir;
  }
  if(rng()<.04)return 'up';
  // Three-action look-ahead sees only a delayed visible formation. It cannot
  // inspect the defender RNG, future positions, or the engine's next AI tick.
  let best={score:-Infinity,dir:'up'};
  function explore(lane,yard,depth,score,first) {
    if(depth===3){if(score>best.score)best={score,dir:first};return;}
    for(const dir of ['up','left','right','down']) {
      const p=destination(lane,yard,dir);
      if(p.lane===lane&&p.yard===yard)continue;
      const cost=risk(p.lane,p.yard,seen);
      const value=(p.yard-yard)*7-cost-(dir==='up'?0:1.4);
      explore(p.lane,p.yard,depth+1,score+value*(1-depth*.2),first||dir);
    }
  }
  explore(g.lane,g.yard,0,0,null);
  return best.dir;
}
function play(c,tuning) {
  const g=new Game(random(c.seed),tuning,'classic'),rng=random(c.seed+9999);
  const dt=1/120;
  const input=new MovementClock(tuning.playerStepSeconds);
  let elapsed=0,nextInput=0,nextReaction=0,seen=[],plays=0,cuts=0,firstDowns=0,contacts=0;
  const gains=[];
  for(let frame=0;frame<120*125&&g.phase!=='over';frame++) {
    if(g.phase==='ready') {
      seen=structuredClone(g.defenders);g.snap();plays++;
      input.reset();nextInput=elapsed;nextReaction=elapsed+(c.style==='reader'?.20:.32);
    }
    if(elapsed>=nextReaction) {
      seen=structuredClone(g.defenders);
      nextReaction=elapsed+(c.style==='reader'?.20:.32);
    }
    const previousSpot=g.spot,previousPlay=g.playNumber,previousDown=g.down;
    if(elapsed+1e-9>=nextInput) {
      const dir=choose(g,c.style,rng,seen);
      if(dir==='left'||dir==='right')cuts++;
      input.press(dir);nextInput=elapsed+tuning.playerStepSeconds;
    }
    input.advance(dt,dir=>g.move(dir));
    g.update(dt);elapsed+=dt;
    if(g.phase==='ready'||g.phase==='over') {
      if(g.spot!==previousSpot||g.playNumber!==previousPlay||g.down!==previousDown) {
        const gain=g.spot-previousSpot;gains.push(gain);contacts++;
        if(g.down===1&&gain>0)firstDowns++;
      }
    }
  }
  if(g.phase!=='over')throw Error('Game did not finish');
  return {seed:c.seed,style:c.style,result:g.score===20?'touchdown':g.time===0?'timeout':'downs',yards:g.gained,liveSeconds:+(120-g.time).toFixed(2),plays,cuts,firstDowns,tackles:contacts,gains};
}
function suite(tuning) {
  const games=cases.map(c=>play(c,tuning));
  return {tuning,games,summary:{games:games.length,wins:games.filter(x=>x.result==='touchdown').length,meanYards:+(games.reduce((a,x)=>a+x.yards,0)/games.length).toFixed(1),meanLiveSeconds:+(games.reduce((a,x)=>a+x.liveSeconds,0)/games.length).toFixed(1),meanPlays:+(games.reduce((a,x)=>a+x.plays,0)/games.length).toFixed(1)}};
}
const result={method:'Ten paired seeded games per configuration. 120 Hz engine updates, shared held-input cadence; visible-state policies with 200/320 ms observation delays. Bots do not represent human skill or perceived fun.',baseline:suite(BASELINE),updated:suite(CLASSIC_V04)};
if(process.argv.includes('--save'))writeFileSync(new URL('../docs/balance-10-games.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
