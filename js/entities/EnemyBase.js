import { cellOf, center } from '../world/HospitalMap.js';
const types = new Map();
export function registerEnemy(name, ctor) {
  types.set(name, ctor);
}
export function spawnEnemy(name, context) {
  if (!types.has(name)) throw new Error('Tipo de enemigo desconocido: ' + name);
  return new (types.get(name))(context);
}
export class EnemyBase {
  constructor({ map }) {
    if (new.target === EnemyBase)
      throw new TypeError('EnemyBase requiere una implementación.');
    this.map = map;
    this.state = 'PATROL';
    this.route = [];
    this.goal = '';
  }
  setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.elapsed = 0;
    this.goal = '';
    this.route = [];
  }
  navigate(dt, target, speed) {
    const goal = target.join(','),
      current = cellOf(this.position);
    if (goal !== this.goal) {
      this.goal = goal;
      // Center each turn before crossing a tile boundary, including after a re-plan.
      this.route = [
        center(current),
        ...this.map.path(current, target).map(center),
      ];
    }
    let movement = dt * speed;
    while (this.route.length && movement > 0) {
      const next = this.route[0],
        dx = next.x - this.position.x,
        dz = next.z - this.position.z,
        len = Math.hypot(dx, dz);
      const step = Math.min(len, movement);
      if (len > 0.001) {
        this.position.x += (dx / len) * step;
        this.position.z += (dz / len) * step;
      }
      if (len <= movement) this.route.shift();
      movement -= step;
      if (len > 0.001 && step === 0) break;
    }
    return !this.route.length;
  }
}
