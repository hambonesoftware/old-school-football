import { MovementClock } from '../js/movement.js';
import { Game } from '../js/engine.js';
import { BALANCE } from '../js/tuning.js';
import { writeFileSync } from 'node:fs';

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function laneRisk(lane, yard, defenders) {
  let score = 0;
  for (const defender of defenders) {
    const ahead = defender.yard - yard;
    if (ahead < -.5 || ahead > 12) continue;
    const gap = Math.abs(defender.lane - lane);
    const weight = 1 / (1 + Math.max(0, ahead) * .25);
    if (gap === 0) score += 20 * weight;
    else if (gap === 1 && ahead < 5) score += 3 * weight;
  }
  return score;
}

function chooseDirection(game, style, seen, random) {
  if (style === 'straight') return null;
  const forwardThreat = seen.some(d =>
    d.lane === game.lane && d.yard - game.yard > -.5 &&
    d.yard - game.yard < (style === 'reader' ? 8 : 6.5)
  );
  if (style === 'reactive' && !forwardThreat) return null;
  if (style === 'reactive' && random() < .25) return null;

  const candidates = [game.lane - 1, game.lane, game.lane + 1]
    .filter(lane => lane >= 0 && lane <= 4);
  const ranked = candidates.map(lane => ({
    lane,
    risk: laneRisk(lane, game.yard, seen) + (lane === game.lane ? 0 : 1.25)
  })).sort((a, b) => a.risk - b.risk);
  const best = ranked[0].lane;
  if (best === game.lane) return null;
  return best < game.lane ? 'left' : 'right';
}

function runGame(seed, style) {
  const game = new Game(seededRandom(seed), BALANCE, 'arcade');
  const random = seededRandom(seed + 9901);
  const stepClock = new MovementClock(BALANCE.playerStepSeconds);
  const dt = 1 / 120;
  let elapsed = 0;
  let nextDecision = 0;
  let nextLook = 0;
  let seen = [];
  let plays = 0;
  let cuts = 0;
  let gainHistory = [];
  let previousSpot = game.spot;
  let currentInput = null;

  for (let frame = 0; frame < 120 * 125 && game.phase !== 'over'; frame++) {
    if (game.phase === 'ready') {
      seen = structuredClone(game.defenders);
      previousSpot = game.spot;
      game.snap();
      plays++;
      stepClock.reset();
      currentInput = null;
      nextDecision = elapsed;
      nextLook = elapsed + (style === 'reader' ? .20 : .32);
    }
    if (elapsed + 1e-9 >= nextLook) {
      seen = structuredClone(game.defenders);
      nextLook = elapsed + (style === 'reader' ? .20 : .32);
    }
    if (elapsed + 1e-9 >= nextDecision) {
      const direction = chooseDirection(game, style, seen, random);
      if (direction) {
        stepClock.press(direction);
        stepClock.release();
        cuts++;
      }
      // The on-screen D-pad allows one active direction at a time.
      // A steering action temporarily replaces the up/surge hold.
      currentInput = direction || (style === 'reckless' ? 'up' : null);
      nextDecision = elapsed + BALANCE.playerStepSeconds;
    }
    stepClock.advance(dt, direction => game.move(direction));
    game.update(dt, currentInput);
    elapsed += dt;
    if (game.phase === 'ready' || game.phase === 'over') {
      if (game.spot !== previousSpot) gainHistory.push(game.spot - previousSpot);
    }
  }

  if (game.phase !== 'over') throw new Error('Simulation did not finish');
  return {
    seed, style, result: game.score === 20 ? 'touchdown' :
      game.time === 0 ? 'timeout' : 'downs',
    yards: +game.gained.toFixed(1),
    liveSeconds: +(120 - game.time).toFixed(2),
    plays, cuts, gains: gainHistory
  };
}

const styles = ['straight', 'reactive', 'reader', 'reckless'];
const games = [];
for (const style of styles) {
  for (let i = 0; i < 50; i++) {
    games.push(runGame(1000 + i * 137, style));
  }
}
const summary = styles.map(style => {
  const group = games.filter(g => g.style === style);
  return {
    style, games: group.length,
    touchdowns: group.filter(g => g.result === 'touchdown').length,
    meanYards: +(group.reduce((sum, g) => sum + g.yards, 0) / group.length).toFixed(1),
    meanLiveSeconds: +(group.reduce((sum, g) => sum + g.liveSeconds, 0) / group.length).toFixed(1),
    meanPlays: +(group.reduce((sum, g) => sum + g.plays, 0) / group.length).toFixed(1)
  };
});
const result = {
  method: '200 seeded arcade engine games at 120 Hz: 50 seeds per behavior. Bots observe only sampled current defenders; these are not human playtests.',
  tuning: BALANCE, summary, games
};
if (process.argv.includes('--save')) {
  writeFileSync(new URL('../docs/arcade-balance-200.json', import.meta.url),
    JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ method: result.method, summary: result.summary }, null, 2));
