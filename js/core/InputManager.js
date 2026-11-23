export class InputManager {
  constructor(canvas, actions) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.active = false;
    this.drag = false;
    this.wasLocked = false;
    this.previousMove = 0;
    this.skipMoves = 0;
    const keyAction = { KeyF: 'flash', KeyE: 'interact', KeyM: 'map', Tab: 'map', Escape: 'pause' };
    window.addEventListener('keydown', (e) => {
      if (this.mapOpen && ['KeyM', 'Tab', 'Escape'].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) actions.map();
        return;
      }
      if (!this.active || e.altKey || e.metaKey || e.ctrlKey) return;
      if (
        /^(Tab|Key[WASDFEM]|Arrow(Left|Right|Up|Down)|Shift(Left|Right)|Escape)$/.test(
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
      this.dx = this.dy = 0;
      this.previousMove = 0;
      this.skipMoves = locked ? 4 : 0;
      const lostLock = this.wasLocked && !locked;
      this.wasLocked = locked;
      if (!locked && this.releasingLock) {
        this.releasingLock = false;
        if (this.active) this.lock();
      } else if (lostLock && this.active) actions.pause();
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (this.locked) {
        if (e.button === 0) actions.attack();
        return;
      }
      this.drag = true;
      this.lock();
    });
    window.addEventListener('pointerup', () => (this.drag = false));
    window.addEventListener('mousemove', (e) => {
      if (this.active && (this.locked || this.drag)) {
        if (this.skipMoves > 0) { this.skipMoves--; return; }
        const size = Math.max(Math.abs(e.movementX), Math.abs(e.movementY));
        if (!Number.isFinite(size) || size > 65 || (this.previousMove < 12 && size > 45)) return;
        this.previousMove = size;
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
  setActive(value, mapOpen = false) {
    this.active = value;
    this.mapOpen = mapOpen;
    this.previousMove = 0;
    if (!value) this.wasLocked = false;
    this.keys.clear();
    this.dx = this.dy = 0;
    this.drag = false;
    if (!value && this.locked) {
      this.releasingLock = true;
      document.exitPointerLock();
    }
  }
  axis(positive, negative) {
    return Number(this.keys.has(positive)) - Number(this.keys.has(negative));
  }
  look() {
    const delta = [this.dx, this.dy];
    if (!this.dx && !this.dy) this.previousMove = 0;
    this.dx = this.dy = 0;
    return delta;
  }
}
