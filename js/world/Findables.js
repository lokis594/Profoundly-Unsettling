import THREE from '../core/ThreeRuntime.js';
import { surface } from '../core/PixelSurfaces.js';
import { center } from './HospitalMap.js';
import { crowbarModel } from '../player/Crowbar.js';

const desks = [
  [2, 8],
  [42, 28],
  [11, 10],
  [22, 10],
];
const cabinetCell = [36, 29];
export class Findables {
  constructor(map) {
    this.map = map;
    this.drawer = new THREE.Group();
    this.locker = new THREE.Group();
    const box = (parent, mat, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(map.geometry, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      parent.add(mesh);
      return mesh;
    };
    const metal = map.materials.metal,
      dark = map.materials.shadow;
    this.tray = new THREE.Group();
    this.drawer.add(this.tray);
    box(this.tray, metal, 0, 0.81, 0.14, 0.73, 0.04, 0.47);
    box(this.tray, map.materials.wood, 0, 0.89, 0.39, 0.79, 0.19, 0.05);
    box(this.tray, metal, 0, 0.91, 0.43, 0.23, 0.032, 0.06);
    this.sheet = box(this.tray, surface('paper'), 0, 0.855, 0.17, 0.47, 0.028, 0.3);
    box(this.sheet, surface('paper'), -0.17, 0.7, 0, 0.43, 0.5, 0.93).rotation.z = 0.025;
    box(this.locker, dark, 0, 0.99, -0.27, 0.9, 1.98, 0.07);
    for (const x of [-0.46, 0.46]) box(this.locker, metal, x, 0.99, 0, 0.055, 1.98, 0.61);
    for (const y of [0.035, 1.95, 0.48]) box(this.locker, metal, 0, y, 0, 0.94, 0.055, 0.61);
    this.door = new THREE.Group();
    this.door.position.set(-0.46, 0, 0.32);
    this.locker.add(this.door);
    box(this.door, metal, 0.46, 0.99, 0, 0.92, 1.97, 0.055);
    box(this.door, metal, 0.79, 1, 0.053, 0.055, 0.22, 0.07);
    for (let i = 0; i < 4; i++)
      box(this.door, dark, 0.46, 1.57 + i * 0.055, 0.031, 0.4, 0.017, 0.01);
    this.bar = crowbarModel();
    this.bar.scale.setScalar(1.65);
    this.bar.position.set(0.04, 1.15, 0.13);
    this.bar.rotation.z = -0.34;
    this.locker.add(this.bar);
    this.reset();
  }
  reset() {
    this.maps = new Set();
    this.armed = false;
    this.opened = new Set();
    this.discovered = false;
  }
  load() {
    const { map } = this;
    this.locker.removeFromParent();
    this.drawer.position.copy(center(desks[map.index]));
    this.tray.position.z = 0;
    map.group.add(this.drawer);
    this.sheet.visible = !this.maps.has(map.index);
    if (map.index === 1) {
      this.locker.position.copy(center(cabinetCell));
      this.locker.position.z -= 0.95;
      map.group.add(this.locker);
      const p = this.locker.position;
      map.collider(p.x, p.z, 0.49, 0.31);
      this.bar.visible = !this.armed;
    }
    this.update(2);
  }
  update(dt) {
    const tray = this.opened.has(this.map.index) ? 0.57 : 0;
    this.tray.position.z = THREE.MathUtils.damp(this.tray.position.z, tray, 9, dt);
    this.door.rotation.y = THREE.MathUtils.damp(
      this.door.rotation.y,
      this.opened.has('locker') ? -1.82 : -0.28,
      8,
      dt,
    );
  }
  nearby(player) {
    for (const [key, root] of [
      ['locker', this.locker],
      ['drawer', this.drawer],
    ]) {
      if (key === 'locker' && (this.map.index !== 1 || this.armed)) continue;
      if (key === 'drawer' && this.maps.has(this.map.index)) continue;
      const target = root.position.clone();
      target.z += key === 'locker' ? 0.49 : 0.65;
      const offset = target.clone().sub(player.position);
      if (offset.length() > (key === 'locker' ? 3.2 : 2.15) || !this.map.clearSight(player.position, target)) continue;
      if (
        offset
          .normalize()
          .dot(new THREE.Vector3(-Math.sin(player.baseYaw), 0, -Math.cos(player.baseYaw))) < (key === 'locker' ? 0.1 : 0.35)
      )
        continue;
      if (key === 'locker') this.discovered = true;
      return key;
    }
  }
  prompt(key) {
    if (key === 'locker')
      return this.opened.has('locker') ? '[E] Recoger palanca' : '[E] Abrir armario';
    if (key === 'drawer')
      return this.opened.has(this.map.index) ? '[E] Recoger plano' : '[E] Abrir cajón';
    return '';
  }
  interact(session) {
    const key = this.nearby(session.player);
    if (!key) return false;
    const id = key === 'locker' ? key : this.map.index;
    if (!this.opened.has(id)) {
      this.opened.add(id);
      session.sound.hinge();
    } else if (key === 'locker') {
      this.bar.visible = false;
      this.armed = session.weapon.model.visible = true;
      session.notice('Palanca equipada · Clic izquierdo para golpear');
    } else if (key === 'drawer') {
      this.maps.add(id);
      this.sheet.visible = false;
      session.sound.paper();
      session.notice('Plano adquirido · [M] Consultar');
    }
    return true;
  }
}
