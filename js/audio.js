// Small, original procedural football soundscape. No external assets or downloads.
export class FootballAudio {
  constructor() { this.enabled = true; this.effects = .7; this.crowd = .35; this.step = 0; }
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = .65;
        this.master.connect(this.ctx.destination);
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .035) / 1.02; data[i] = brown * 4; }
        const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 780; filter.Q.value = .45;
        this.ambience = this.ctx.createGain(); this.ambience.gain.value = 0;
        source.connect(filter); filter.connect(this.ambience); this.ambience.connect(this.master); source.start();
      }
      this.ctx.resume().catch(() => {});
    } catch { this.enabled = false; }
  }
  setEnabled(value) {
    this.enabled = value;
    if (value) this.unlock();
    if (this.master) this.master.gain.setTargetAtTime(value ? .65 : 0, this.ctx.currentTime, .04);
  }
  tone(freq, duration, level, delay = 0, end = freq, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(level * this.effects, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  noise(duration, level, frequency, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime + delay;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(level * this.effects, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(now);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  event(type) {
    if (type === 'snap') { this.noise(.09, .2, 1800); this.tone(115, .13, .11, 0, 65); }
    if (type === 'cut') this.noise(.11, .08, 1800);
    if (type === 'miss') this.noise(.19, .12, 850);
    if (type === 'tackle') {
      this.tone(115, .19, .45, 0, 38); this.noise(.11, .6, 2500); this.noise(.27, .2, 500, .03);
      this.tone(2350, .16, .08, .24, 2100); this.tone(2700, .13, .04, .26, 2550);
      this.cheerUntil = this.ctx ? this.ctx.currentTime + .65 : 0;
    }
    if (type === 'firstDown' || type === 'marker') {
      [392, 523].forEach((n, i) => this.tone(n, .15, .065, i * .09, n, 'triangle'));
      this.cheerUntil = this.ctx ? this.ctx.currentTime + .8 : 0;
    }
    if (type === 'touchdown') {
      [262, 330, 392, 523, 659, 784].forEach((n, i) => this.tone(n, .42, .1, i * .1, n, 'triangle'));
      this.cheerUntil = this.ctx ? this.ctx.currentTime + 3 : 0;
    }
    if (type === 'loss') [294, 220, 147].forEach((n, i) => this.tone(n, .28, .07, i * .15, n, 'triangle'));
  }
  update(game) {
    if (!this.ctx || !this.enabled) return;
    const live = game.phase === 'live', active = live || game.phase === 'aftermath';
    const cheer = this.ctx.currentTime < (this.cheerUntil || 0);
    const target = game.phase === 'paused' ? 0 : this.crowd * (cheer ? .65 : active ? .14 + game.yard / 100 * .15 : .075);
    this.ambience.gain.setTargetAtTime(target, this.ctx.currentTime, cheer ? .08 : .4);
    const step = Math.floor(game.distanceTravelled * 1.1);
    if (live && step !== this.step) this.noise(.055, .055, 600 + Math.random() * 500);
    this.step = step;
  }
}
