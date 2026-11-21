export class AudioSystem {
  constructor() {
    this.volume = 0.55;
    this.muted = false;
  }
  async start() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!this.ctx) {
      this.ctx = new Audio();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      for (const frequency of [48, 72.3, 96.6]) {
        const osc = this.ctx.createOscillator(),
          level = this.ctx.createGain();
        osc.frequency.value = frequency;
        level.gain.value = 0.026;
        osc.connect(level).connect(this.master);
        osc.start();
      }
    }
    try {
      await this.ctx.resume();
    } catch {
      return;
    }
    this.apply();
  }
  apply() {
    if (this.ctx)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.08,
      );
  }
  tone(from, to, seconds, level = 0.1, type = 'sine') {
    if (this.ctx?.state !== 'running') return;
    const ctx = this.ctx,
      t = ctx.currentTime,
      osc = ctx.createOscillator(),
      g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + seconds + 0.01);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }
}
