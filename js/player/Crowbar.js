import THREE from '../core/ThreeRuntime.js';
import { surface } from '../core/PixelSurfaces.js';

const up = new THREE.Vector3(0, 1, 0);
export function crowbarModel() {
  const root = new THREE.Group();
  function rod(from, to, r1, r2, kind, flat = 1) {
    const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r2, r1, direction.length(), 6),
      surface(kind),
    );
    mesh.position.set(...from).addScaledVector(direction, 0.5);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    mesh.scale.z = flat;
    root.add(mesh);
  }
  rod([0, -0.38, 0], [0, -0.29, 0], 0.028, 0.019, 'steel', 0.48);
  rod([0, -0.29, 0], [0, 0.28, 0], 0.019, 0.021, 'enamel');
  rod([0, 0.28, 0], [0, 0.32, -0.042], 0.021, 0.022, 'enamel');
  rod([0, 0.32, -0.042], [0, 0.305, -0.091], 0.022, 0.023, 'steel');
  for (const side of [-1, 1])
    rod([side * 0.008, 0.305, -0.09], [side * 0.019, 0.23, -0.12], 0.014, 0.009, 'steel', 0.52);
  return root;
}

export class Crowbar {
  constructor(view) {
    this.model = crowbarModel();
    view.add(this.model);
    this.ray = new THREE.Raycaster();
    this.ray.far = 2.05;
    this.reset();
  }
  reset() {
    this.model.visible = false;
    this.swing = 0;
    this.freeze = 0;
  }
  attack(stats, sound) {
    if (!this.model.visible || this.swing > 0) return;
    if (stats.stamina < 18) {
      sound.burst(0.13, 610, 1, 0.18);
      return;
    }
    stats.stamina -= 18;
    this.swing = 0.55;
    sound.burst(0.16, 850, 0.8, 0.24);
  }
  update(dt, session) {
    if (!this.model.visible) return;
    const { player, nurse, map } = session;
    const previous = this.swing;
    if (this.freeze > 0) this.freeze -= dt;
    else this.swing = Math.max(0, this.swing - dt);
    const arc = this.swing ? Math.sin((Math.PI * (0.55 - this.swing)) / 0.55) ** 2 : 0;
    this.model.position.set(
      -0.23 * Math.min(1.4, player.camera.aspect) + arc * 0.28,
      -0.23 + player.bob * 0.65,
      -0.48 - arc * 0.12,
    );
    this.model.rotation.set(-0.45 - arc * 0.85, 0.27 + arc * 0.6, 0.26 - arc * 1.24 + player.bob);
    if (previous <= 0.35 || this.swing > 0.35 || !nurse.health) return;
    player.camera.updateWorldMatrix(true, false);
    nurse.visual.updateWorldMatrix(true, true);
    for (const [x, y] of [
      [0, 0],
      [-0.027, 0],
      [0.027, 0],
      [0, 0.03],
      [0, -0.03],
    ]) {
      this.ray.setFromCamera({ x, y }, player.camera);
      const hit = this.ray.intersectObjects(nurse.hitParts, false)[0];
      if (!hit || !map.clearSight(player.position, hit.point)) continue;
      nurse.strike(hit.object.userData.hitZone, hit.point);
      this.freeze = 0.052;
      player.punch = 0.16;
      if (!nurse.health) {
        session.clearedFloors.add(map.index);
        session.recovering = true;
        session.breathIn = 0;
      }
      break;
    }
  }
}
