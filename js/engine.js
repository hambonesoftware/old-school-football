import { BALANCE } from './tuning.js?v=0.5';

export class Game {
  constructor(random = Math.random, tuning = BALANCE, controlMode = 'arcade') {
    this.tuning = tuning;
    this.random = random;
    this.controlMode = controlMode;
    this.reset();
  }

  setControlMode(mode) {
    if (mode !== 'arcade' && mode !== 'classic') throw new Error('Unknown control mode');
    if (mode === this.controlMode) return;
    this.controlMode = mode;
    this.reset();
  }

  defenseTuning() {
    return this.controlMode === 'classic' && this.tuning.classicDefense
      ? this.tuning.classicDefense : this.tuning;
  }

  reset() {
    Object.assign(this, {
      phase: 'ready', time: 120, score: 14, spot: 25, target: 35,
      down: 1, yard: 25, lane: 2, defenders: [], tick: 0, steps: 0,
      gained: 0, playNumber: 0, runSpeed: 0, distanceTravelled: 0,
      movingTimer: 0,
      message: 'Read the defense. The formation you see is the formation you play.'
    });
    this.setup();
  }

  setup() {
    this.lane = 2;
    this.yard = this.spot;
    this.runSpeed = 0;
    this.movingTimer = 0;
    this.defenders = [];
    const defense = this.defenseTuning();
    for (let i = 0; i < 6; i++) {
      const lane = i === 0 && defense.frontCenterChance > 0 &&
        this.random() < defense.frontCenterChance
        ? 2 : Math.floor(this.random() * 5);
      this.defenders.push({
        lane,
        yard: this.spot + defense.firstDefenderGap + i * 4
      });
    }
    this.tick = 0;
    this.steps = 0;
    this.playNumber++;
  }

  snap() {
    if (this.phase === 'over') {
      this.reset();
      return;
    }
    if (this.phase !== 'ready') return;
    // Preserve the exact pre-snap defensive formation.
    this.phase = 'live';
    this.message = this.controlMode === 'arcade'
      ? 'RUNNING! Steer around the defense. Hold up to surge, down to brake.'
      : 'Find the gap. Attack the top end zone.';
  }

  move(direction) {
    if (this.phase !== 'live') return;
    const previousYard = this.yard;
    const previousLane = this.lane;
    if (direction === 'left') this.lane = Math.max(0, this.lane - 1);
    if (direction === 'right') this.lane = Math.min(4, this.lane + 1);
    if (this.controlMode === 'classic') {
      if (direction === 'up') this.yard++;
      if (direction === 'down') this.yard = Math.max(0, this.yard - 1);
    }
    const traveled = Math.abs(this.yard - previousYard) +
      Math.abs(this.lane - previousLane) * .65;
    if (traveled > 0) {
      this.distanceTravelled += traveled;
      this.movingTimer = .2;
    }
    this.steps++;
    this.gained = Math.max(this.gained, this.yard - 25);
    if (this.yard >= 100) {
      this.touchdown();
      return;
    }
    if (this.controlMode === 'classic' && this.yard === 0 && previousYard === 1) {
      this.phase = 'over';
      this.message = 'Safety. The final drive is over.';
      return;
    }
    this.collision();
  }

  collision() {
    const radius = this.controlMode === 'arcade' ? .4 : 0;
    const hit = this.defenders.find(d =>
      d.lane === this.lane && Math.abs(d.yard - this.yard) <= radius
    );
    if (hit) this.finish();
  }

  advanceRun(dt, input) {
    const target = input === 'up'
      ? this.tuning.playerSprintYardsPerSecond
      : input === 'down'
        ? this.tuning.playerBrakeYardsPerSecond
        : this.tuning.playerCruiseYardsPerSecond;
    const factor = 1 - Math.exp(-dt / this.tuning.playerAccelerationSeconds);
    this.runSpeed += (target - this.runSpeed) * factor;
    const startYard = this.yard;
    const endYard = Math.min(100, startYard + this.runSpeed * dt);
    // Sweep the path so a low frame rate cannot skip a tackle cell.
    const hits = this.defenders
      .filter(d => d.lane === this.lane &&
        d.yard + .4 >= startYard && d.yard - .4 <= endYard)
      .sort((a, b) => a.yard - b.yard);
    if (hits.length) {
      this.yard = Math.max(startYard, Math.min(endYard, hits[0].yard));
    } else {
      this.yard = endYard;
    }
    const traveled = this.yard - startYard;
    this.distanceTravelled += traveled;
    if (traveled > .001) this.movingTimer = .2;
    this.gained = Math.max(this.gained, this.yard - 25);
    if (hits.length) {
      this.finish();
      return;
    }
    if (this.yard >= 100) this.touchdown();
  }

  touchdown() {
    this.score = 20;
    this.phase = 'over';
    this.message = 'TOUCHDOWN! Great Lakes wins, 20–19. Start a new drive to play again.';
  }

  finish() {
    if (this.phase !== 'live') return;
    this.yard = Math.max(0, Math.min(100, Math.round(this.yard)));
    const gain = this.yard - this.spot;
    this.spot = this.yard;
    if (this.spot >= this.target) {
      this.down = 1;
      this.target = Math.min(100, this.spot + 10);
      this.message = 'FIRST DOWN · ' + gain + ' yards. Next formation is set. Snap when ready.';
    } else {
      this.down++;
      this.message = 'TACKLED · ' + (gain >= 0 ? '+' : '') + gain +
        ' yards. Next formation is set. Snap when ready.';
    }
    if (this.down > 4) {
      this.phase = 'over';
      this.message = 'Turnover on downs. The defense holds. Start a new drive to try again.';
    } else {
      this.phase = 'ready';
      this.setup();
    }
  }

  update(dt, input = null) {
    if (this.phase !== 'live') return;
    this.time = Math.max(0, this.time - dt);
    if (this.time === 0) {
      this.phase = 'over';
      this.message = 'Time expired. Iron Valley holds, 19–14. Start a new drive to try again.';
      return;
    }
    this.movingTimer = Math.max(0, this.movingTimer - dt);
    if (this.controlMode === 'arcade') {
      this.advanceRun(dt, input);
      if (this.phase !== 'live') return;
    }
    this.tick += dt;
    const defense = this.defenseTuning();
    const interval = defense.defenderBaseSeconds -
      Math.min(defense.defenderMaxRampSeconds,
        Math.max(0, this.yard - 25) * defense.defenderRampPerYard);
    while (this.tick >= interval && this.phase === 'live') {
      this.tick -= interval;
      for (const d of this.defenders) {
        if (d.yard < this.yard - 5) {
          d.yard = this.yard + 14 + Math.floor(this.random() * 10);
          d.lane = Math.floor(this.random() * 5);
        } else if (this.controlMode === 'arcade' && d.lane === this.lane && d.yard > this.yard &&
          d.yard - this.yard <= defense.defenderChargeRange) {
          // A visible defender closes the remaining gap rather than waiting
          // several ticks, preserving an escape opportunity for a timely cut.
          d.yard = Math.max(this.yard, d.yard - defense.defenderChargeYards);
        } else if (this.random() < defense.defenderChaseChance && d.lane !== this.lane) {
          d.lane += Math.sign(this.lane - d.lane);
        } else {
          d.yard += Math.sign(this.yard - d.yard);
        }
        this.collision();
        if (this.phase !== 'live') break;
      }
    }
  }
}
