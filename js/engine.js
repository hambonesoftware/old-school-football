import { BALANCE } from './tuning.js?v=0.4';

export class Game {
  constructor(random = Math.random, tuning = BALANCE) {
    this.tuning = tuning;
    this.random = random;
    this.reset();
  }

  reset() {
    Object.assign(this, {
      phase: 'ready', time: 120, score: 14, spot: 25, target: 35,
      down: 1, yard: 25, lane: 2, defenders: [], tick: 0, steps: 0,
      gained: 0, playNumber: 0,
      message: 'Read the defense. The formation you see is the formation you play.'
    });
    this.setup();
  }

  setup() {
    this.lane = 2;
    this.yard = this.spot;
    this.defenders = [];
    for (let i = 0; i < 6; i++) {
      const lane = i === 0 && this.tuning.frontCenterChance > 0 && this.random() < this.tuning.frontCenterChance ? 2 : Math.floor(this.random() * 5);
      this.defenders.push({ lane, yard: this.spot + this.tuning.firstDefenderGap + i * 4 });
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
    // The ready formation is authoritative: never roll new positions on snap.
    this.phase = 'live';
    this.message = 'Find the gap. Attack the top end zone.';
  }

  move(direction) {
    if (this.phase !== 'live') return;
    const previous = this.yard;
    if (direction === 'left') this.lane = Math.max(0, this.lane - 1);
    if (direction === 'right') this.lane = Math.min(4, this.lane + 1);
    if (direction === 'up') this.yard++;
    if (direction === 'down') this.yard = Math.max(0, this.yard - 1);
    this.steps++;
    this.gained = Math.max(this.gained, this.yard - 25);
    if (this.yard >= 100) {
      this.score = 20;
      this.phase = 'over';
      this.message = 'TOUCHDOWN! Great Lakes wins, 20–19. Start a new drive to play again.';
      return;
    }
    if (this.yard === 0 && previous === 1) {
      this.phase = 'over';
      this.message = 'Safety. The final drive is over.';
      return;
    }
    this.collision();
  }

  collision() {
    if (this.defenders.some(d => d.lane === this.lane && d.yard === this.yard)) this.finish();
  }

  finish() {
    if (this.phase !== 'live') return;
    const gain = this.yard - this.spot;
    this.spot = this.yard;
    if (this.spot >= this.target) {
      this.down = 1;
      this.target = Math.min(100, this.spot + 10);
      this.message = `FIRST DOWN · ${gain} yards. Next formation is set. Snap when ready.`;
    } else {
      this.down++;
      this.message = `TACKLED · ${gain >= 0 ? '+' : ''}${gain} yards. Next formation is set. Snap when ready.`;
    }
    if (this.down > 4) {
      this.phase = 'over';
      this.message = 'Turnover on downs. The defense holds. Start a new drive to try again.';
    } else {
      this.phase = 'ready';
      // Prepare the upcoming play now, so the user can inspect it before snap.
      this.setup();
    }
  }

  update(dt) {
    if (this.phase !== 'live') return;
    this.time = Math.max(0, this.time - dt);
    if (this.time === 0) {
      this.phase = 'over';
      this.message = 'Time expired. Iron Valley holds, 19–14. Start a new drive to try again.';
      return;
    }
    this.tick += dt;
    const interval = this.tuning.defenderBaseSeconds - Math.min(this.tuning.defenderMaxRampSeconds, Math.max(0, this.yard - 25) * this.tuning.defenderRampPerYard);
    while (this.tick >= interval && this.phase === 'live') {
      this.tick -= interval;
      for (const d of this.defenders) {
        if (d.yard < this.yard - 5) {
          d.yard = this.yard + 14 + Math.floor(this.random() * 10);
          d.lane = Math.floor(this.random() * 5);
        } else if (this.random() < this.tuning.defenderChaseChance && d.lane !== this.lane) {
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
