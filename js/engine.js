import { BALANCE } from './tuning.js?v=0.6.1';

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
      movingTimer: 0, eventId: 0, event: null, aftermath: null,
      presentationTime: 0, cut: 0, cutTime: 0, firstDownShown: false,
      message: 'Read the defense. The formation you see is the formation you play.'
    });
    this.setup();
  }

  emit(type, detail = {}) {
    this.event = { id: ++this.eventId, type, ...detail };
  }

  setup() {
    this.lane = 2;
    this.yard = this.spot;
    this.runSpeed = 0;
    this.firstDownShown = false;
    this.aftermath = null;
    this.movingTimer = 0;
    this.defenders = [];
    const defense = this.defenseTuning();
    for (let i = 0; i < 6; i++) {
      const lane = i === 0 && defense.frontCenterChance > 0 &&
        this.random() < defense.frontCenterChance
        ? 2 : Math.floor(this.random() * 5);
      this.defenders.push({
        lane,
        yard: this.spot + defense.firstDefenderGap + i * 4,
        state: 'track', timer: 0, stride: 0
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
    this.emit('snap');
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
    if (this.lane !== previousLane) {
      this.cut = Math.sign(this.lane - previousLane);
      this.cutTime = .22;
      this.emit('cut');
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
    if (hit) this.finish(hit);
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
      this.finish(hits[0]);
      return;
    }
    if (this.yard >= 100) this.touchdown();
  }

  touchdown() {
    this.emit('touchdown');
    this.presentationTime = 0;
    this.score = 20;
    this.phase = 'over';
    this.message = 'TOUCHDOWN! Great Lakes wins, 20–19. Start a new drive to play again.';
  }

  finish(hit = null) {
    if (this.phase !== 'live') return;
    // Hold the actual contact scene while the awarded spot is rounded.
    const contactYard = this.yard;
    this.aftermath = { yard: contactYard, lane: this.lane,
      defender: hit ? this.defenders.indexOf(hit) : -1, age: 0, duration: .62 };
    this.yard = Math.max(0, Math.min(100, Math.round(this.yard)));
    this.gained = Math.max(this.gained, this.yard - 25);
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
      this.aftermath.nextPhase = 'over';
      this.message = 'Turnover on downs. The defense holds. Start a new drive to try again.';
    } else {
      this.aftermath.nextPhase = 'ready';
    }
    this.aftermath.firstDown = this.down === 1;
    this.phase = 'aftermath';
    this.emit('tackle', { firstDown: this.down === 1 });
  }

  update(dt, input = null) {
    if (this.phase === 'paused') return;
    this.presentationTime += dt;
    this.cutTime = Math.max(0, this.cutTime - dt);
    if (this.phase === 'aftermath') {
      this.aftermath.age += dt;
      if (this.aftermath.age >= this.aftermath.duration) {
        const next = this.aftermath.nextPhase;
        const firstDown = this.aftermath.firstDown;
        this.phase = next;
        if (next === 'ready') this.setup();
        this.emit(next === 'over' ? 'loss' : firstDown ? 'firstDown' : 'ready');
      }
      return;
    }
    if (this.phase !== 'live') return;
    this.time = Math.max(0, this.time - dt);
    if (this.time === 0) {
      this.phase = 'over';
      this.emit('loss');
      this.message = 'Time expired. Iron Valley holds, 19–14. Start a new drive to try again.';
      return;
    }
    this.input = input;
    this.movingTimer = Math.max(0, this.movingTimer - dt);
    if (this.controlMode === 'arcade') {
      this.advanceRun(dt, input);
      if (this.phase !== 'live') return;
    }
    if (!this.firstDownShown && this.yard >= this.target && this.target < 100) {
      this.firstDownShown = true;
      this.emit('marker');
    }
    for (const d of this.defenders) {
      if (this.controlMode === 'arcade' && (!d.state || d.state === 'track') && d.lane === this.lane && d.yard > this.yard && d.yard - this.yard <= this.defenseTuning().defenderChargeRange) {
        d.state = 'commit'; d.timer = .16;
      }
      d.timer = Math.max(0, (d.timer || 0) - dt * (this.tuning.defenderTempo || 1));
      if (d.state === 'commit' && d.timer === 0) {
        d.state = 'lunge'; d.timer = .18;
        d.fromYard = d.yard;
        d.toYard = Math.max(this.yard - 1, d.yard - this.defenseTuning().defenderChargeYards);
      }
      if (d.state === 'lunge') {
        const previous = d.yard;
        d.yard = d.fromYard + (d.toYard - d.fromYard) * (1 - d.timer / .18);
        d.stride = (d.stride || 0) + Math.abs(d.yard - previous);
        if (d.lane === this.lane && this.yard >= Math.min(previous, d.yard) - .4 && this.yard <= Math.max(previous, d.yard) + .4) {
          this.finish(d); return;
        }
        if (d.timer === 0) {
          d.state = 'recover'; d.timer = .38; this.emit('miss');
        }
      } else if (d.state === 'recover' && d.timer === 0) d.state = 'track';
    }
    this.tick += dt;
    const defense = this.defenseTuning();
    const interval = (defense.defenderBaseSeconds -
      Math.min(defense.defenderMaxRampSeconds,
        Math.max(0, this.yard - 25) * defense.defenderRampPerYard)) / (this.tuning.defenderTempo || 1);
    while (this.tick >= interval && this.phase === 'live') {
      this.tick -= interval;
      for (const d of this.defenders) {
        if (d.state && d.state !== 'track') continue;
        const oldLane = d.lane, oldYard = d.yard;
        if (d.yard < this.yard - 5) {
          d.yard = this.yard + 14 + Math.floor(this.random() * 10);
          d.lane = Math.floor(this.random() * 5);
        } else if (this.controlMode === 'arcade' && d.lane === this.lane && d.yard > this.yard &&
          d.yard - this.yard <= defense.defenderChargeRange) {
          // Commit to this lane before lunging; a timely cut earns a real miss.
          d.state = 'commit'; d.timer = .16;
        } else if (this.random() < defense.defenderChaseChance && d.lane !== this.lane) {
          d.lane += Math.sign(this.lane - d.lane);
        } else {
          d.yard += Math.sign(this.yard - d.yard);
        }
        d.stride = (d.stride || 0) + Math.abs(d.yard - oldYard) + Math.abs(d.lane - oldLane) * .65;
        this.collision();
        if (this.phase !== 'live') break;
      }
    }
  }
}

