export class HUD {
  constructor() {
    this.root = document.querySelector('#hud');
    this.fade = document.querySelector('#blackout');
    this.hint = document.querySelector('#hint');
    this.prompt = document.querySelector('#prompt');
    this.room = document.querySelector('#room-name');
    this.floor = document.querySelector('#floor-tag');
    this.torch = document.querySelector('#torch-status');
    this.vignette = document.querySelector('#vignette');
    this.wound = document.querySelector('#wound');
    this.panic = false;
    this.bars = Object.fromEntries(
      ['health', 'stamina', 'unrest'].map((k) => [
        k,
        document.getElementById(k),
      ]),
    );
    this.motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  update(_dt, time, stats, field) {
    this.vignette.style.opacity = this.panic
      ? this.motion
        ? 0.55 + 0.14 * Math.sin(time * 3)
        : 0.55
      : 0;
    this.room.textContent = field.room;
    this.floor.textContent = field.floor;
    this.prompt.textContent = field.prompt;
    this.torch.textContent = '[F] LINTERNA ' + (field.light ? 'ON' : 'OFF');
    this.hint.textContent = field.hint || '';
    for (const [key, bar] of Object.entries(this.bars)) {
      const value = Math.round(stats[key]);
      if (bar.value !== value || !bar.hasAttribute('value')) bar.value = value;
      bar.nextElementSibling.value = value + '%';
    }
  }
}
