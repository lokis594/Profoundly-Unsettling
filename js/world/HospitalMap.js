import THREE from '../core/ThreeRuntime.js';
import { CELL, floors } from './floorsData.js';
const moves = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const key = (x, z) => x + ',' + z;
const height = 3.25;
export const center = ([x, z]) =>
  new THREE.Vector3((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
export const cellOf = (p) => [Math.floor(p.x / CELL), Math.floor(p.z / CELL)];

export class HospitalMap {
  constructor(engine, assets) {
    this.engine = engine;
    this.assets = assets;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    const tex = assets.textures;
    this.materials = {};
    for (const [name, color] of Object.entries({
      base: 0x3e5049,
      stripe: 0x73877b,
      metal: 0x59645f,
      wood: 0x706457,
      linen: 0xa7aa96,
      pillow: 0xc0beb0,
      rust: 0x794d33,
      shadow: 0x232b2b,
      water: 0x394744,
      red: 0x833f3f,
    })) {
      this.materials[name] = new THREE.MeshLambertMaterial({ color });
    }
    for (const name of ['wall', 'floor', 'ceiling', 'door'])
      this.materials[name] = new THREE.MeshLambertMaterial({ map: tex[name] });
    this.materials.bulb = new THREE.MeshBasicMaterial({ color: 0xc9c6a5 });
    this.materials.dim = new THREE.MeshBasicMaterial({ color: 0x777b6b });
  }
  open(x, z) {
    return this.floor.grid[z]?.[x] === '.' && !this.obstacles.has(key(x, z));
  }
  canStand(x, z, r = 0.23) {
    return [
      [-r, -r],
      [-r, r],
      [r, -r],
      [r, r],
    ].every(([dx, dz]) =>
      this.open(Math.floor((x + dx) / CELL), Math.floor((z + dz) / CELL)),
    );
  }
  room(pos) {
    const [x, z] = cellOf(pos);
    return (
      this.floor.rooms.find(
        ([, r]) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3],
      )?.[0] || this.floor.base
    );
  }
  path(start, end) {
    if (!this.open(...end)) return [];
    const q = [start],
      parents = new Map([[key(...start), null]]);
    for (let i = 0; i < q.length; i++) {
      const curr = q[i];
      if (curr[0] === end[0] && curr[1] === end[1]) {
        const result = [];
        let node = curr;
        while (parents.get(key(...node))) {
          result.push(node);
          node = parents.get(key(...node));
        }
        return result.reverse();
      }
      for (const [dx, dz] of moves) {
        const next = [curr[0] + dx, curr[1] + dz],
          k = key(...next);
        if (!parents.has(k) && this.open(...next)) {
          q.push(next);
          parents.set(k, curr);
        }
      }
    }
    return [];
  }
  clearSight(a, b) {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.22);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.canStand(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.02))
        return false;
    }
    return true;
  }
  stairNear(p) {
    return this.floor.stairs.find(
      (s) => center(s.at).distanceToSquared(p) < 2.7 ** 2,
    );
  }
  load(index) {
    if (this.group) {
      this.engine.scene.remove(this.group);
      this.group.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
      });
      this.signAssets.forEach((a) => a.dispose());
    }
    this.index = index;
    this.floor = floors[index];
    this.obstacles = new Set(this.floor.props.map(([, x, z]) => key(x, z)));
    this.group = new THREE.Group();
    this.signAssets = [];
    this.lamps = [];
    this.batches = new Map();
    this.engine.scene.add(this.group);
    this.engine.setFloor(this.floor);
    const grid = this.floor.grid;
    for (let z = 0; z < grid.length; z++)
      for (let x = 0; x < grid[z].length; x++) {
        if (grid[z][x] !== '.') continue;
        const p = center([x, z]);
        this.box('floor', p.x, -0.05, p.z, CELL, 0.1, CELL);
        this.box('ceiling', p.x, height + 0.04, p.z, CELL, 0.08, CELL);
        for (const [dx, dz] of moves) {
          if (grid[z + dz]?.[x + dx] === '.') continue;
          const wx = p.x + (dx * CELL) / 2,
            wz = p.z + (dz * CELL) / 2;
          this.box(
            'wall',
            wx,
            height / 2,
            wz,
            dx ? 0.1 : CELL,
            height,
            dz ? 0.1 : CELL,
          );
          this.box(
            'base',
            wx - dx * 0.06,
            0.11,
            wz - dz * 0.06,
            dx ? 0.05 : CELL,
            0.22,
            dz ? 0.05 : CELL,
          );
          this.box(
            'stripe',
            wx - dx * 0.06,
            1.15,
            wz - dz * 0.06,
            dx ? 0.045 : CELL,
            0.11,
            dz ? 0.045 : CELL,
          );
        }
      }
    for (const [type, x, z] of this.floor.props)
      this.prop(type, center([x, z]));
    for (const [x, z, side] of this.floor.doors) {
      const p = center([x, z]),
        dir = side === 'n' ? -1 : 1;
      this.box(
        'door',
        p.x,
        1.22,
        p.z + dir * (CELL / 2 - 0.11),
        1.32,
        2.45,
        0.12,
      );
    }
    this.dressFloor(index);
    for (const stair of this.floor.stairs) this.stair(stair);
    for (const [i, at] of this.floor.lamps.entries()) {
      const p = center(at);
      this.box('metal', p.x, 3.14, p.z, 1.4, 0.12, 0.36);
      for (const dz of [-0.085, 0.085])
        this.box(
          i % 4 === 2 ? 'dim' : 'bulb',
          p.x,
          3.055,
          p.z + dz,
          1.2,
          0.045,
          0.065,
        );
      this.lamps.push({ p, phase: i * 1.73, base: i % 4 === 2 ? 7 : 14 });
    }
    // The fixtures stay visible throughout the floor. Reuse four real lights nearest the camera.
    this.lights = Array.from({ length: 4 }, () => {
      const l = new THREE.PointLight(this.floor.lamp, 12, 11, 2);
      this.group.add(l);
      return l;
    });
    for (const [name, r] of this.floor.rooms) {
      const cx = Math.floor((r[0] + r[2]) / 2),
        p = center([cx, r[1]]);
      this.sign(name.toUpperCase(), p.x, 2.12, p.z - CELL / 2 + 0.12, 0, 1.95);
    }
    for (const [material, matrices] of this.batches) {
      const mesh = new THREE.InstancedMesh(
        this.geometry,
        this.materials[material],
        matrices.length,
      );
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
    this.batches.clear();
  }
  dressFloor(index) {
    // A two-sided wayfinding board faces each approach in the central corridor.
    const text = [
      'MORGUE  /  CALDERAS',
      'ENFERMERÍA  >',
      'HABS. 201–203',
      'TRATAMIENTOS',
    ][index];
    const signX = (index === 1 ? 8.15 : 10.4) * CELL,
      z = 7.5 * CELL;
    const railZ = z - 1.3;
    this.box('metal', signX, 2.86, z, 0.09, 0.07, 1.85);
    for (const offset of [-0.75, 0.75])
      this.box('metal', signX, 3.04, z + offset, 0.035, 0.38, 0.035);
    this.sign(text, signX - 0.07, 2.68, z, -Math.PI / 2, 1.9);
    this.sign(text, signX + 0.07, 2.68, z, Math.PI / 2, 1.9);
    if (index === 1) {
      const face = 6 * CELL - 0.11;
      this.sign('RECEPCIÓN', face, 2.07, 6.5 * CELL, -Math.PI / 2, 2.18);
      this.sign('← SALA DE ESPERA', face, 1.67, 6.5 * CELL, -Math.PI / 2, 1.65);
      this.box('red', face - 0.03, 1.56, 6.89 * CELL, 0.17, 0.38, 0.23);
      this.box('pillow', face - 0.13, 1.57, 6.89 * CELL, 0.04, 0.1, 0.13);
      this.box('metal', 13.4 * CELL, 1.38, railZ, 2.5, 0.055, 0.08);
    }
    if (index === 0) {
      for (let i = 0; i < 12; i++) {
        const x = (3 + i) * CELL + 0.4;
        this.box('rust', x, 2.83, z + 1.25, CELL, 0.14, 0.15);
        this.box('metal', x, 2.85, z + 1.25, 0.08, 0.19, 0.22);
        this.box(
          'water',
          x,
          0.018,
          z + Math.sin(i) * 0.35,
          1.65 + 0.55 * Math.sin(i * 4),
          0.012,
          0.62,
        );
        this.box(
          'metal',
          x + 0.32,
          0.027,
          z + Math.sin(i) * 0.35,
          0.36,
          0.004,
          0.023,
        );
      }
    }
  }
  box(material, x, y, z, w, h, d, angle = 0) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    o.scale.set(w, h, d);
    o.rotation.z = angle;
    o.updateMatrix();
    if (!this.batches.has(material)) this.batches.set(material, []);
    this.batches.get(material).push(o.matrix);
  }
  sign(text, x, y, z, angle, width) {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#243932';
    g.fillRect(0, 0, 192, 32);
    g.strokeStyle = '#b0b69d';
    g.strokeRect(1.5, 1.5, 189, 29);
    g.fillStyle = '#e2ddbb';
    g.textAlign = 'center';
    g.font = 'bold 15px monospace';
    g.fillText(text, 96, 21, 182);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({
      map: t,
      color: 0xc3c9b9,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.PlaneGeometry(width, width / 6);
    this.signAssets.push(t, m, geom);
    const sign = new THREE.Mesh(geom, m);
    sign.position.set(x, y, z);
    sign.rotation.y = angle;
    this.group.add(sign);
  }
  stair(s) {
    const p = center(s.at),
      west = s.at[0] < 6,
      dir = west ? -1 : 1;
    for (let i = 0; i < 5; i++) {
      const h = (i + 1) * 0.085;
      this.box('base', p.x + dir * (0.22 + i * 0.24), h / 2, p.z, 0.25, h, 1.7);
      this.box(
        'stripe',
        p.x + dir * (0.12 + i * 0.24),
        h,
        p.z,
        0.045,
        0.025,
        1.7,
      );
    }
    const face = p.x + dir * (CELL / 2 - 0.13);
    this.box('metal', face, 1.24, p.z, 0.12, 2.5, 1.85);
    this.box('door', face - dir * 0.08, 1.28, p.z, 0.09, 2.45, 1.57);
    const angle = west ? Math.PI / 2 : -Math.PI / 2;
    this.sign(
      (s.to > this.index ? 'SUBIR  /  ' : 'BAJAR  /  ') + floors[s.to].id,
      face - dir * 0.18,
      2.78,
      p.z,
      angle,
      2.0,
    );
  }
  prop(type, p) {
    const b = (mat, x, y, z, w, h, d, ang = 0) =>
      this.box(mat, p.x + x, y, p.z + z, w, h, d, ang);
    if (type === 'bed' || type === 'morgue') {
      b('metal', 0, 0.37, 0, 1, 0.08, 2.12);
      b(type === 'morgue' ? 'metal' : 'linen', 0, 0.53, 0, 0.98, 0.24, 2);
      if (type === 'bed') b('pillow', 0, 0.7, -0.68, 0.75, 0.16, 0.36);
      for (const x of [-0.45, 0.45])
        for (const z of [-0.96, 0.96]) b('metal', x, 0.33, z, 0.07, 0.66, 0.07);
      for (const z of [-1, 1]) b('metal', 0, 0.78, z, 0.98, 0.1, 0.065);
    } else if (type === 'chairs') {
      for (const x of [-0.75, 0, 0.75]) {
        b('base', x, 0.47, 0, 0.63, 0.12, 0.62);
        b('base', x, 0.86, -0.28, 0.63, 0.65, 0.1);
        for (const dx of [-0.23, 0.23])
          b('metal', x + dx, 0.23, 0, 0.06, 0.46, 0.48);
      }
    } else if (type === 'desk') {
      b('wood', 0, 0.5, 0, 1.94, 1, 0.78);
      b('linen', 0, 1.04, 0, 2.1, 0.1, 0.92);
      b('shadow', 0.52, 1.24, -0.1, 0.47, 0.35, 0.25);
      b('pillow', -0.5, 1.11, 0.08, 0.42, 0.03, 0.3);
    } else if (type === 'boiler' || type === 'pipes') {
      for (const x of [-0.46, 0.46]) {
        b('rust', x, 1.2, 0, 0.7, 2.4, 0.95);
        b('metal', x, 2.59, 0, 0.18, 0.44, 0.2);
        for (const h of [0.32, 1.8]) b('metal', x, h, 0, 0.74, 0.1, 1);
      }
    } else if (type === 'screen') {
      for (let i = -1; i <= 1; i++)
        b('linen', i * 0.55, 1.14, 0, 0.52, 1.65, 0.12);
    } else {
      b('metal', 0, 1, 0, 1.32, 2, 0.48);
      for (let i = 0; i < 4; i++) {
        b('shadow', 0, 0.32 + 0.44 * i, 0.25, 1.18, 0.32, 0.035);
        for (let j = 0; j < 4; j++)
          b(
            j % 2 ? 'linen' : 'rust',
            -0.42 + j * 0.24,
            0.29 + 0.44 * i,
            0.3,
            0.11,
            0.21,
            0.1,
          );
      }
    }
  }
  update(dt, time, player) {
    const near = [...this.lamps].sort(
      (a, b) => a.p.distanceToSquared(player) - b.p.distanceToSquared(player),
    );
    this.lights.forEach((l, i) => {
      const f = near[i];
      l.position.set(f.p.x, 2.9, f.p.z);
      l.intensity =
        f.base *
        (0.93 +
          0.045 * Math.sin(time * 7 + f.phase) -
          (Math.sin(time * 4 + f.phase) > 0.97 ? 0.14 : 0));
    });
  }
}
