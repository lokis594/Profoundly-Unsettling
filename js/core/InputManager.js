export class InputManager {
  constructor(canvas, actions) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.active = false;
    this.drag = false;
    this.wasLocked = false;
    const keyAction = { KeyF: 'flash', KeyE: 'interact', Escape: 'pause' };
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.altKey || e.metaKey || e.ctrlKey) return;
      if (
        /^(Key[WASDFE]|Arrow(Left|Right|Up|Down)|Shift(Left|Right)|Escape)$/.test(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) actions[keyAction[e.code]]?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (this.wasLocked && !locked && this.active) actions.pause();
      this.wasLocked = locked;
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.drag = true;
      canvas.setPointerCapture?.(e.pointerId);
      this.lock();
    });
    window.addEventListener('pointerup', () => (this.drag = false));
    window.addEventListener('mousemove', (e) => {
      if (this.active && (this.locked || this.drag)) {
        this.dx += e.movementX;
        this.dy += e.movementY;
      }
    });
    window.addEventListener('blur', () => {
      if (this.active) actions.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.active) actions.pause();
    });
  }
  get locked() {
    return document.pointerLockElement === this.canvas;
  }
  lock() {
    if (!this.locked) {
      try {
        this.canvas.requestPointerLock?.()?.catch?.(() => {});
      } catch {
        /* Drag and arrow look stay available. */
      }
    }
  }
  setActive(value) {
    this.active = value;
    this.keys.clear();
    this.dx = this.dy = 0;
    this.drag = false;
    if (!value && this.locked) document.exitPointerLock();
  }
  axis(positive, negative) {
    return Number(this.keys.has(positive)) - Number(this.keys.has(negative));
  }
  look() {
    const delta = [this.dx, this.dy];
    this.dx = this.dy = 0;
    return delta;
  }
}
