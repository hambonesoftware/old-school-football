// One shared input clock for held buttons, key changes and balance simulations.
export class MovementClock {
  constructor(stepSeconds) { this.stepSeconds=stepSeconds;this.reset(); }
  reset() { this.time=0;this.nextStep=0;this.held=null;this.pending=null; }
  press(direction) { this.held=direction;this.pending=direction; }
  release() { this.held=null; }
  cancel() { this.held=null;this.pending=null; }
  advance(dt, move) {
    this.time+=dt;
    const direction=this.pending||this.held;
    if (!direction || this.time+1e-9<this.nextStep) return false;
    move(direction);
    this.pending=null;
    this.nextStep=this.time+this.stepSeconds;
    return true;
  }
}
