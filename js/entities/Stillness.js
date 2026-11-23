import THREE from '../core/ThreeRuntime.js';
import { surface } from '../core/PixelSurfaces.js';
import { center } from '../world/HospitalMap.js';

const BEAM_COSINE = Math.cos(Math.PI / 9);

export class Stillness {
  constructor(map) {
    this.forward = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.coat = surface('coat').clone();
    this.coat.emissive.setHex(0x080e15);
    this.dark = new THREE.MeshLambertMaterial({ color: 0x121318 });
    for (const m of [this.coat, this.dark]) m.transparent = true;
    const head = new THREE.IcosahedronGeometry(1, 1);
    const taper = new THREE.CylinderGeometry(0.78, 1, 1, 6);
    this.figures = Array.from({ length: 5 }, (_, i) => {
      const root = new THREE.Group();
      const part = (geom, mat, x, y, z, w, h, d) => {
        const m = new THREE.Mesh(geom, mat);
        m.position.set(x, y, z);
        m.scale.set(w, h, d);
        root.add(m);
        return m;
      };
      part(taper, this.coat, 0, 1.04, 0, 0.23, 0.87, 0.158);
      part(head, this.dark, 0.017, 1.65, 0.018, 0.125, 0.174, 0.122).rotation.z = i * 0.067;
      for (const side of [-1, 1]) {
        part(map.geometry, this.coat, side * 0.21, 1.15, 0, 0.118, 0.64, 0.145).rotation.z =
          side * 0.068;
        part(taper, this.dark, side * 0.104, 0.34, 0, 0.078, 0.67, 0.08);
        part(map.geometry, this.dark, side * 0.105, 0.06, 0.04, 0.14, 0.12, 0.24);
        part(map.geometry, this.coat, side * 0.075, 1.37, 0.131, 0.076, 0.21, 0.029).rotation.z =
          -side * 0.36;
      }
      return root;
    });
  }
  reset(map, pos) {
    this.map = map;
    this.anchor = pos.clone();
    this.idle = 0;
    this.next = 10;
    this.until = 0;
    this.fading = 0;
    this.cells = Array.from(map.routes.keys(), (k) => center(k.split(',').map(Number)));
    for (const f of this.figures) {
      map.group.add(f);
      f.visible = false;
    }
  }
  wave(session) {
    const p = session.player.position;
    const local = this.cells.filter(
      (v) =>
        v.distanceToSquared(p) > 9 &&
        v.distanceToSquared(p) < 200 &&
        this.map.canStand(v.x, v.z, 0.36),
    );
    if (!local.length) return;
    const visible = local.filter((v) => this.map.clearSight(p, v));
    const choose = (a) => a[Math.floor(Math.random() * a.length)];
    const group = choose(visible.length ? visible : local);
    const spots = [
      group,
      group.clone().add(new THREE.Vector3(0.83, 0, 0.32)),
      group.clone().add(new THREE.Vector3(-0.81, 0, 0.27)),
    ];
    const singles = local.filter((v) => v.distanceToSquared(group) > 8);
    for (let i = 0; i < 2 && singles.length; i++)
      spots.push(singles.splice(Math.floor(Math.random() * singles.length), 1)[0]);
    this.figures.forEach((f, i) => {
      const spot = spots[i];
      f.visible = Boolean(spot && this.map.canStand(spot.x, spot.z, 0.36));
      if (f.visible) {
        f.position.copy(spot);
        f.lookAt(p.x, 0, p.z);
      }
    });
    this.coat.opacity = this.dark.opacity = 0.93;
    session.sound.murmur();
  }
  update(dt, session) {
    const p = session.player.position;
    if (this.anchor.distanceToSquared(p) >= 0.0025) {
      this.anchor.copy(p);
      if (this.until > 0) this.fading = 0.16;
      this.idle = 0;
      this.next = 10;
      this.until = 0;
    } else this.idle += dt;
    if (this.fading > 0) {
      this.fading = Math.max(0, this.fading - dt);
      this.coat.opacity = this.dark.opacity = this.fading / 0.16;
      if (!this.fading) this.figures.forEach((f) => (f.visible = false));
    }
    if (this.until && this.idle >= this.until) {
      this.figures.forEach((f) => (f.visible = false));
      this.until = 0;
    }
    if (this.idle >= this.next) {
      this.wave(session);
      this.until = this.idle + 2;
      this.next = this.until + 1.6;
    }
    const { camera } = session.player;
    camera.getWorldDirection(this.forward);
    let haunted = false;
    let dispersed = false;
    for (const figure of this.figures) {
      if (!figure.visible) continue;
      this.target.copy(figure.position).y += 1.35;
      this.direction.subVectors(this.target, camera.position);
      const distance = this.direction.length();
      if (distance > 18 || !this.map.beamReaches(camera.position, this.target)) continue;
      if (session.flash.isOn && this.forward.dot(this.direction.normalize()) >= BEAM_COSINE) {
        figure.visible = false;
        dispersed = true;
      } else if (distance <= 8) haunted = true;
    }
    if (dispersed) session.sound.burst(0.065, 2800, 0.8, 0.15);
    return haunted;
  }
}
