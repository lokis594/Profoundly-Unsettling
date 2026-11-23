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
  update(dt, { running, dark, near, chased, oppressive, recovering, haunted }) {
    this.stamina = clamp(this.stamina + dt * (running ? -15 : 7.5));
    if (this.stamina === 0) this.exhausted = true;
    if (this.stamina >= 24) this.exhausted = false;
    let rate = dark ? -1 : -7;
    if (near || chased) {
      rate = (near ? 2.6 : 0) + (chased ? 5 : 0) + (dark ? 2.1 : 0) + (oppressive ? 1.35 : 0);
    } else if (recovering) rate = -10;
    else if (haunted) rate = 2;
    this.unrest = clamp(this.unrest + dt * rate);
    const panic = this.unrest > 60;
    if (panic !== this.panic) {
      this.panic = panic;
      for (const callback of this.listeners)
        callback({ threshold: 60, active: panic, value: this.unrest });
    }
  }
}
