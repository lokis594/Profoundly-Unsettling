import { pixels, grain } from '../core/PixelSurfaces.js';

// Precompute invasion order once. Both effects use the same field of clots and rivulets.
export class Trauma {
  constructor(root) {
    const size = 128;
    this.layers = Array.from({ length: 24 }, (_, i) =>
      pixels(size, (x, y, d) => {
        const edge = Math.min(x, 127 - x, y, 127 - y) / 64;
        const pool =
          0.065 * Math.sin(x * 0.19 + Math.cos(y * 0.14)) +
          0.05 * Math.sin(y * 0.25 + x * 0.13) +
          0.036 * Math.sin(x * 0.53 + y * 0.04) +
          0.047 * grain(x, y) +
          d * 0.025;
        const depth = ((i + 1) / 24) * 1.15;
        const shade = Math.floor(3 * grain(x >> 1, y >> 1) + d + 0.5);
        return [42 + shade * 12, 9 + shade * 2, 14 + shade * 2, edge < depth + pool ? 244 : 0];
      }),
    );
    this.canvas = this.layers[0].cloneNode();
    root.append(this.canvas);
    this.g = this.canvas.getContext('2d');
    this.stage = -1;
    this.clear();
  }
  draw(stage, alpha) {
    if (this.stage !== stage) {
      this.g.clearRect(0, 0, 128, 128);
      this.g.drawImage(this.layers[stage], 0, 0);
      this.stage = stage;
    }
    this.canvas.parentElement.style.opacity = alpha;
  }
  clear() {
    this.time = 0;
    this.amount = 0;
    this.draw(0, 0);
  }
  damage(health) {
    this.amount = Math.min(
      8,
      this.amount * (this.time / 3.55) + 2 + (health < 50 ? 1 : 0) + (health < 25 ? 1 : 0),
    );
    this.time = 3.55;
  }
  update(dt) {
    this.time = Math.max(0, this.time - dt);
    this.draw(Math.floor(this.amount), Math.min(1, this.time / 2.65) * (0.54 + 0.05 * this.amount));
  }
  fatal(t) {
    this.draw(Math.min(23, Math.floor(4 + 20 * t)), Math.min(1, 0.55 + t));
  }
}
