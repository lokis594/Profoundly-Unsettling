const clamp = (value) => Math.max(0, Math.min(100, value));
export class PlayerStats {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }
  reset() {
    this.health = 100;
    this.stamina = 100;
    this.unrest = 0;
    this.exhausted = false;
    this.panic = false;
  }
  onUnrestThreshold(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  damage(amount) {
    this.health = clamp(this.health - amount);
  }
  update(dt, { running, dark, near, chased, oppressive }) {
    this.stamina = clamp(this.stamina + dt * (running ? -15 : 7.5));
    if (this.stamina === 0) this.exhausted = true;
    if (this.stamina >= 24) this.exhausted = false;
    const pressure =
      (dark ? 2.1 : 0) +
      (near ? 2.6 : 0) +
      (chased ? 5 : 0) +
      (oppressive ? 1.35 : 0);
    this.unrest = clamp(this.unrest + dt * (pressure || -2.4));
    const panic = this.unrest > 60;
    if (panic !== this.panic) {
      this.panic = panic;
      for (const callback of this.listeners)
        callback({ threshold: 60, active: panic, value: this.unrest });
    }
  }
}
