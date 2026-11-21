const profiles = [
  { root: 32, upper: 58.4, wind: 182, air: 0.095 },
  { root: 43, upper: 68.6, wind: 275, air: 0.065 },
  { root: 46, upper: 73.5, wind: 347, air: 0.059 },
  { root: 39, upper: 65.2, wind: 256, air: 0.077 },
];

export class AudioManager {
  constructor() {
    this.volume = 0.55;
    this.muted = false;
    this.playing = false;
    this.floor = 1;
    this.nextBeat = 0;
  }
  async start() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!this.ctx) this.build(new Audio());
    try {
      await this.ctx.resume();
    } catch {
      return;
    }
    this.apply();
  }
  build(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    this.master.connect(compressor).connect(ctx.destination);

    this.effects = ctx.createGain();
    this.effects.gain.value = Number(this.playing);
    this.effects.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = 2 * Math.random() - 1;
    this.root = this.oscillator('sine', 43, 0.14, this.master);
    this.upper = this.oscillator('triangle', 68.6, 0.029, this.master);
    this.oscillator('sine', 0.115, 3.9, this.upper.detune);

    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    this.windFilter = this.filter('bandpass', 275, 1.3);
    const rough = this.filter('peaking', 510, 6.5);
    rough.gain.value = 4;
    this.air = ctx.createGain();
    this.air.gain.value = 0.065;
    wind.connect(this.windFilter).connect(rough).connect(this.air).connect(this.master);
    this.oscillator('sine', 0.21, 0.024, this.air.gain);
    this.oscillator('sine', 0.083, 58, this.windFilter.frequency);
    wind.start();

    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    this.hum.connect(this.effects);
    this.oscillator('triangle', 60, 0.58, this.hum);
    this.oscillator('sawtooth', 119.5, 0.16, this.hum);
    this.ring = ctx.createGain();
    this.ring.gain.value = 0;
    this.ring.connect(this.effects);
    this.whine = this.oscillator('sine', 860, 1, this.ring);
    this.setFloor(this.floor);
  }
  filter(type, frequency, q) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }
  oscillator(type, frequency, level, output) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = level;
    osc.connect(gain).connect(output);
    osc.start();
    return osc;
  }
  apply() {
    if (this.ctx)
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.075);
  }
  setPlaying(playing) {
    this.playing = playing;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.effects.gain.setTargetAtTime(Number(playing), now, 0.035);
    if (!playing) {
      this.hum.gain.setTargetAtTime(0, now, 0.05);
      this.ring.gain.setTargetAtTime(0, now, 0.06);
      this.nextBeat = 0;
    }
  }
  setFloor(index) {
    this.floor = index;
    if (!this.ctx) return;
    const { root, upper, wind, air } = profiles[index];
    const now = this.ctx.currentTime;
    this.root.frequency.setTargetAtTime(root, now, 0.6);
    this.upper.frequency.setTargetAtTime(upper, now, 0.6);
    this.windFilter.frequency.setTargetAtTime(wind, now, 0.85);
    this.air.gain.setTargetAtTime(air, now, 0.85);
  }
  envelope(source, tail, time, seconds, level, attack) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + seconds);
    tail.connect(gain).connect(this.effects);
    source.onended = () => {
      source.disconnect();
      if (tail !== source) tail.disconnect();
      gain.disconnect();
    };
  }
  tone(from, to, seconds, level = 0.1, type = 'sine', delay = 0) {
    if (this.ctx?.state !== 'running' || !this.playing) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
    this.envelope(osc, osc, t, seconds, level, Math.min(0.013, seconds * 0.22));
    osc.start(t);
    osc.stop(t + seconds + 0.008);
  }
  burst(seconds, frequency, q, level, delay = 0) {
    if (this.ctx?.state !== 'running' || !this.playing) return;
    const t = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.filter('bandpass', frequency, q);
    source.connect(filter);
    this.envelope(source, filter, t, seconds, level, 0.003);
    source.start(t, Math.random() * 3.5, seconds + 0.008);
  }
  step(running) {
    const pitch = 0.88 + Math.random() * 0.24;
    this.tone(104 * pitch, 42, running ? 0.125 : 0.105, running ? 0.14 : 0.08);
    this.burst(0.11, (this.floor === 0 ? 790 : 450) * pitch, 0.83, running ? 0.19 : 0.12);
    this.burst(0.071, 1400 * pitch, 1.2, running ? 0.075 : 0.045, 0.027);
  }
  flashlight(on) {
    this.burst(0.031, on ? 1850 : 1390, 2.1, 0.26);
    this.tone(on ? 680 : 510, 155, 0.035, 0.1, 'triangle', 0.018);
  }
  update(unrest, electrical) {
    if (this.ctx?.state !== 'running' || !this.playing) return;
    const t = this.ctx.currentTime;
    const stress = Math.max(0, (unrest - 60) / 40);
    this.hum.gain.setTargetAtTime(0.085 * electrical, t, 0.07);
    this.ring.gain.setTargetAtTime(0.022 * stress ** 1.35, t, 0.12);
    this.whine.frequency.setTargetAtTime(860 + 460 * stress, t, 0.14);
    if (stress === 0) this.nextBeat = 0;
    else if (t >= this.nextBeat) {
      this.tone(79, 43, 0.135, 0.082 + stress * 0.1);
      this.tone(67, 37, 0.11, 0.053 + stress * 0.07, 'sine', 0.135);
      this.nextBeat = t + 0.94 - 0.52 * stress;
    }
  }
}
