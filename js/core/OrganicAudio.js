// A turbulent air stream with an optional irregular glottal pulse, through moving vocal resonances.
export function airway(audio, duration, formants, level, voicing = 0, delay = 0) {
  const ctx = audio.ctx;
  if (ctx?.state !== 'running' || !audio.playing) return;
  const buffer = ctx.createBuffer(1, Math.ceil(duration * ctx.sampleRate), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let phase = 0,
    pink = 0,
    jitter = 1;
  for (let i = 0; i < samples.length; i++) {
    const t = i / samples.length;
    pink = 0.89 * pink + 0.31 * (Math.random() * 2 - 1);
    phase += (voicing * jitter * (1.2 - 0.54 * t + 0.075 * Math.sin(39 * t))) / ctx.sampleRate;
    if (phase >= 1) {
      phase %= 1;
      jitter = 0.84 + 0.32 * Math.random();
    }
    samples[i] = pink + (voicing ? 1.7 * Math.exp(-phase * 11) - 0.15 : 0);
  }
  const start = ctx.currentTime + delay,
    src = ctx.createBufferSource(),
    shape = ctx.createWaveShaper();
  shape.curve = Float32Array.from({ length: 129 }, (_, i) => Math.tanh((i / 64 - 1) * 2.6));
  src.buffer = buffer;
  const filters = formants.map((hz, i) => {
    const f = audio.filter('bandpass', hz, 2 + i);
    for (let j = 1; j <= 5; j++)
      f.frequency.linearRampToValueAtTime(
        hz * (0.74 + Math.random() * 0.36),
        start + (duration * j) / 5,
      );
    src.connect(f).connect(shape);
    return f;
  });
  const gain = ctx.createGain();
  gain.gain.setValueCurveAtTime(
    Float32Array.from({ length: 64 }, (_, i) => {
      const t = i / 63;
      return (
        level * Math.pow(Math.max(0, Math.sin(Math.PI * t)), voicing ? 0.55 : 1.4) * (1 - 0.38 * t)
      );
    }),
    start,
    duration,
  );
  shape.connect(gain).connect(audio.effects);
  src.onended = () => {
    src.disconnect();
    filters.forEach((f) => f.disconnect());
    shape.disconnect();
    gain.disconnect();
  };
  src.start(start);
}
