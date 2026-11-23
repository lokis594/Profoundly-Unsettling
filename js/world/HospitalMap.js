import THREE from '../core/ThreeRuntime.js';
import { HospitalProps } from './HospitalProps.js';
import { CELL, floors, sides } from './floorsData.js';

const moves = Object.values(sides);
const height = 3.25;
const key = (x, z) => x + ',' + z;
export const center = ([x, z]) =>
  new THREE.Vector3((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
export const cellOf = (p) => [Math.floor(p.x / CELL), Math.floor(p.z / CELL)];

function boundaryKey(x, z, side) {
  const [dx, dz] = sides[side];
  return key(2 * x + dx, 2 * z + dz);
}

// Three rings give each upholstered panel a rolled seam and an inset center tuft.
function cushionGeometry() {
  const outline = [
    [-0.42, -0.5], [0.42, -0.5], [0.5, -0.42], [0.5, 0.42],
    [0.42, 0.5], [-0.42, 0.5], [-0.5, 0.42], [-0.5, -0.42],
  ];
  const positions = [], uv = [], indices = [];
  const vertex = (x, y, depth) => {
    positions.push(x, y, depth);
    uv.push(x + 0.5, y + 0.5);
  };
  for (const [scale, depth] of [[1, -0.5], [0.85, 0.32], [0.43, 0.5]])
    for (const [x, y] of outline) vertex(x * scale, y * scale, depth);
  const count = outline.length;
  vertex(0, 0, -0.12);
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    for (let ring = 0; ring < 2; ring++) {
      const a = ring * count + i, b = ring * count + j;
      indices.push(a, b, a + count, b, b + count, a + count);
    }
    indices.push(2 * count + i, 2 * count + j, 3 * count);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class HospitalMap {
  constructor(engine, assets) {
    this.engine = engine;
    this.geometry = new THREE.BoxGeometry();
    this.cushion = cushionGeometry();
    this.sightRay = new THREE.Ray();
    this.sightBox = new THREE.Box3();
    this.sightHit = new THREE.Vector3();
    this.signPlane = new THREE.PlaneGeometry(1, 1);
    this.transform = new THREE.Object3D();
    this.transform.rotation.order = 'YXZ';
    this.materials = {};
    const surface = (options) => engine.snap(new THREE.MeshLambertMaterial(options));
    for (const [name, color] of Object.entries({
      base: 0x3e5049, stripe: 0x73877b, pillow: 0xc0beb0,
      shadow: 0x232b2b, red: 0x99423b,
    })) this.materials[name] = surface({ color });
    for (const name of ['wall', 'floor', 'ceiling', 'door', 'metal', 'wood', 'rust', 'linen'])
      this.materials[name] = surface({ map: assets.textures[name] });
    this.materials.padding = this.materials.linen;
    this.materials.glass = surface({ color: 0xa8c4bd, map: assets.textures.metal,
      emissive: 0x151f21, transparent: true, opacity: 0.33, depthWrite: false });
    this.materials.curtain = surface({ map: assets.textures.linen,
      transparent: true, opacity: 0.72, depthWrite: false });
    this.materials.water = engine.snap(new THREE.MeshPhongMaterial({
      color: 0x283431, specular: 0xc4a682, shininess: 48,
    }));
    this.materials.bulb = engine.snap(new THREE.MeshBasicMaterial({ color: 0xc9c6a5 }));
    this.materials.night = engine.snap(new THREE.MeshBasicMaterial({ color: 0x172833 }));
    this.props = new HospitalProps(this);
  }
  room(pos) {
    const [x, z] = cellOf(pos);
    return this.floor.areas[this.floor.zones[z]?.[x]]?.[0] || this.floor.base;
  }
  collider(x, z, halfX, halfZ, bottom = 0, top = height) {
    const bounds = [x - halfX, z - halfZ, x + halfX, z + halfZ, bottom, top];
    for (let j = Math.floor(bounds[1] / CELL); j <= Math.floor(bounds[3] / CELL); j++)
      for (let i = Math.floor(bounds[0] / CELL); i <= Math.floor(bounds[2] / CELL); i++) {
        const bin = this.solids[j]?.[i];
        if (bin) bin.push(bounds);
      }
  }
  canStand(x, z, r = 0.23) {
    const minX = x - r, maxX = x + r, minZ = z - r, maxZ = z + r;
    for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++)
      for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++) {
        if (this.floor.grid[j]?.[i] !== '.') return false;
        for (const [left, near, right, far] of this.solids[j][i])
          if (minX < right && maxX > left && minZ < far && maxZ > near) return false;
      }
    return true;
  }
  clearSight(a, b, radius = 0.02) {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.12);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.canStand(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, radius)) return false;
    }
    return true;
  }
  beamReaches(origin, target) {
    const ray = this.sightRay;
    ray.origin.copy(origin);
    ray.direction.subVectors(target, origin).normalize();
    const lengthSq = origin.distanceToSquared(target);
    const [ax, az] = cellOf(origin), [bx, bz] = cellOf(target);
    for (let z = Math.min(az, bz); z <= Math.max(az, bz); z++) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
        for (const [left, near, right, far, bottom, top] of this.solids[z]?.[x] || []) {
          this.sightBox.min.set(left, bottom, near);
          this.sightBox.max.set(right, top, far);
          if (ray.intersectBox(this.sightBox, this.sightHit) &&
              origin.distanceToSquared(this.sightHit) < lengthSq) return false;
        }
      }
    }
    return true;
  }
  buildRoutes() {
    this.routes = new Map();
    this.floor.grid.forEach((row, z) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '.') continue;
        const p = center([x, z]);
        if (this.canStand(p.x, p.z)) this.routes.set(key(x, z), []);
      }
    });
    for (const [id, neighbors] of this.routes) {
      const [x, z] = id.split(',').map(Number);
      const from = center([x, z]);
      for (const [dx, dz] of moves) {
        const next = [x + dx, z + dz];
        if (this.routes.has(key(...next)) && this.clearSight(from, center(next), 0.23)) neighbors.push(next);
      }
    }
  }
  open(x, z) { return this.routes.has(key(x, z)); }
  path(start, end) {
    if (!this.open(...end)) return [];
    const q = [start], parents = new Map([[key(...start), null]]);
    for (let i = 0; i < q.length; i++) {
      const curr = q[i];
      if (curr[0] === end[0] && curr[1] === end[1]) {
        const result = [];
        for (let node = curr; parents.get(key(...node)); node = parents.get(key(...node))) result.push(node);
        return result.reverse();
      }
      for (const next of this.routes.get(key(...curr)) || []) {
        const id = key(...next);
        if (!parents.has(id)) { q.push(next); parents.set(id, curr); }
      }
    }
    return [];
  }
  stairNear(p) {
    return this.landings.find(({ point }) =>
      p.distanceToSquared(point) < 2.55 ** 2 && this.clearSight(p, point))?.stair;
  }
  load(index) {
    if (this.group) {
      this.group.removeFromParent();
      this.group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      this.signAssets.forEach((a) => a.dispose());
      this.props.clear();
    }
    this.index = index;
    this.floor = floors[index];
    this.group = new THREE.Group();
    this.signAssets = [];
    this.signMaterials = new Map();
    this.landings = [];
    this.batches = new Map();
    this.solids = this.floor.grid.map(row => Array.from(row, () => []));
    this.engine.scene.add(this.group);
    this.engine.setFloor(this.floor);
    this.planEdges=[];
    this.buildShell();
    for (const [x, z, name, directions] of this.floor.boards || []) {
      const p = center([x, z]);
      this.box('base', p.x, 2.56, p.z, 3.44, 1.0, 0.1);
      for (const offset of [-1.28, 1.28])
        this.box('metal', p.x + offset, 3.08, p.z, 0.04, 0.34, 0.04);
      this.sign(name, p.x, 2.8, p.z + 0.11, 0, 2.72);
      this.sign(directions, p.x, 2.30, p.z + 0.11, 0, 2.97);
      this.sign(name, p.x, 2.56, p.z - 0.11, Math.PI, 2.8);
    }
    for (const [type, x, z] of this.floor.props) this.props.place(type, center([x, z]));
    for (const stair of this.floor.stairs) this.stair(stair);
    this.lamps = this.floor.lamps.map((at, i) => {
      const p = center(at), room = this.room(p);
      let color = this.floor.lamp;
      if (room === 'Morgue') color = 0x9ab8bb;
      if (room === 'Calderas y generadores') color = 0xe18953;
      const fixture = this.props.fixture(p, i, color);
      fixture.softFlicker = index === 1 && room === 'Mantenimiento';
      return fixture;
    });
    this.lights = Array.from({ length: 4 }, () => {
      const l = new THREE.PointLight(this.floor.lamp, 12, 12, 2);
      this.group.add(l);
      return l;
    });
    for (const [material, matrices] of this.batches) {
      const geometry = material === 'padding' ? this.cushion : this.geometry;
      const mesh = new THREE.InstancedMesh(geometry, this.materials[material], matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
    this.batches.clear();
    this.buildRoutes();
  }
  buildShell() {
    const f = this.floor;
    const features = new Map(f.edges.map(edge => [boundaryKey(...edge.slice(0, 3)), edge]));
    for (let z = 0; z < f.zones.length; z++)
      for (let x = 0; x < f.zones[z].length; x++) {
        const zone = f.zones[z][x];
        if (zone < 0) continue;
        const p = center([x, z]);
        this.box('floor', p.x, -0.05, p.z, CELL, 0.1, CELL);
        this.box('ceiling', p.x, height + 0.04, p.z, CELL, 0.08, CELL);
        if (this.index === 0 && zone < f.halls.length)
          this.serviceDuct(p, x, z, f.areas[zone][0] === 'Galería inundada');
        for (const [side, [dx, dz]] of Object.entries(sides)) {
          const other = f.zones[z + dz]?.[x + dx] ?? -1;
          if (other >= 0 && (dx < 0 || dz < 0)) continue;
          const feature = features.get(boundaryKey(x, z, side));
          if (feature) this.boundary(...feature);
          else if (other < 0 || (zone !== other && Math.max(zone, other) >= f.halls.length)) {
            this.boundary(x, z, side, 'wall');
            if (f.areas[zone][0].startsWith('Aislamiento')) this.padding(x, z, side);
            if (f.areas[other]?.[0].startsWith('Aislamiento'))
              this.padding(x + dx, z + dz, { n: 's', e: 'w', s: 'n', w: 'e' }[side]);
          }
        }
      }
  }
  serviceDuct(p, x, z, wet) {
    const vertical = this.floor.grid[z - 1]?.[x] === '.' && this.floor.grid[z + 1]?.[x] === '.';
    for (const offset of [0.89, 1.12]) {
      this.box('rust', p.x + (vertical ? offset : 0), 2.56, p.z + (vertical ? 0 : offset),
        vertical ? 0.16 : CELL, 0.16, vertical ? CELL : 0.16);
      this.box('metal', p.x + (vertical ? offset : 0), 2.56, p.z + (vertical ? 0 : offset),
        vertical ? 0.2 : 0.07, 0.2, vertical ? 0.07 : 0.2);
    }
    if (wet) {
      this.box('water', p.x + Math.sin(z) * 0.3, 0.012, p.z, 1.58, 0.014, 2.46);
      this.box('stripe', p.x, 0.021, p.z + 0.45, 0.58, 0.006, 0.021);
    }
  }
  // Local +Z points into the named cell, so the same joinery works on all four walls.
  face(x, z, side) {
    const [dx, dz] = sides[side];
    const ox = (x + 0.5 + dx / 2) * CELL, oz = (z + 0.5 + dz / 2) * CELL;
    const yaw = Math.atan2(-dx, -dz);
    return {
      box: (mat, u, y, v, w, h, d) => this.box(mat, ox - dz * u - dx * v,
        y, oz + dx * u - dz * v, w, h, d, 0, yaw),
      sign: (text, y, v, outside = false, width = 2.1) => this.sign(text,
        ox - dx * v, y, oz - dz * v, yaw + (outside ? Math.PI : 0), width),
    };
  }
  boundary(x, z, side, type, label) {
    this.planEdges.push({x,z,side,type});
    const frame = this.face(x, z, side), b = frame.box;
    if (['door', 'arch', 'paddedDoor'].includes(type)) {
      for (const u of [-1.1, 1.1]) {
        b('wall', u, height / 2, 0, 0.8, height, 0.12);
        b('metal', u * 0.64, 1.22, 0, 0.085, 2.44, 0.17);
      }
      b('wall', 0, 2.855, 0, 1.44, 0.79, 0.12);
      b('metal', 0, 2.42, 0, 1.47, 0.1, 0.18);
      if (type === 'door') b('door', -0.74, 1.18, 0.54, 0.085, 2.36, 1.05);
      if (type === 'paddedDoor') {
        b('linen', -0.75, 0.75, 0.58, 0.14, 1.5, 1.13);
        b('linen', -0.75, 2.04, 0.58, 0.14, 0.64, 1.13);
        for (const v of [0.18, 0.98]) b('metal', -0.75, 1.61, v, 0.14, 0.22, 0.33);
        b('glass', -0.75, 1.61, 0.58, 0.025, 0.22, 0.48);
      }
      if (label) {
        frame.sign(label, 2.75, -0.087, true);
        frame.sign(label, 2.75, 0.087);
      }
      return;
    }
    if (type === 'brokenWindow') {
      b('wall', 0, 0.55, 0, CELL, 1.1, 0.1);
      b('wall', 0, 2.88, 0, CELL, 0.74, 0.1);
      for (const u of [-1.13, 1.13]) {
        b('wall', u, 1.81, 0, 0.74, 1.43, 0.1);
        b('rust', u * 0.68, 1.81, 0.08, 0.08, 1.47, 0.15);
      }
      for (const y of [1.12, 2.51]) b('rust', 0, y, 0.08, 1.65, 0.09, 0.18);
      b('night', 0, 1.81, -0.5, 1.82, 1.6, 0.06);
      b('glass', -0.6, 1.47, 0, 0.33, 0.61, 0.05);
      const [dx, dz] = sides[side];
      const source = center([x, z]);
      source.set(source.x + dx * 1.39, 1.92, source.z + dz * 1.39);
      this.props.beam(source, new THREE.Vector3(-dx, -0.27, -dz),
        { width: 0.7, spread: 1.13, length: 4.7, color: 0x8dabc2, strength: 0.29 });
      return;
    }
    if (['counter', 'observation', 'glazing', 'entrance'].includes(type)) {
      const sill = type === 'entrance' ? 0.23 : type === 'glazing' ? 0.48 : 1;
      b(type === 'counter' ? 'wood' : 'base', 0, sill / 2, 0, CELL, sill, 0.14);
      b('wall', 0, 2.88, 0, CELL, 0.74, 0.14);
      b('glass', 0, (sill + 2.51) / 2, 0, CELL, 2.51 - sill, 0.058);
      for (const u of [-1.46, 0, 1.46]) b('metal', u, 1.28, 0, 0.072, 2.58, 0.14);
      if (type === 'counter') {
        b('metal', 0, 1.015, 0, CELL, 0.085, 0.58);
        b('metal', 0, 1.35, 0, CELL, 0.045, 0.09);
      }
      if (type === 'entrance') {
        for (const u of [-0.26, 0.26]) b('metal', u, 1.04, 0.11, 0.28, 0.055, 0.11);
      }
      if (label) frame.sign(label, 2.75, type === 'entrance' ? 0.09 : -0.09, type !== 'entrance', 2.7);
      return;
    }
    b('wall', 0, height / 2, 0, CELL, height, 0.12);
    for (const v of [-0.075, 0.075]) {
      b('base', 0, 0.11, v, CELL, 0.22, 0.04);
      b('stripe', 0, 1.14, v, CELL, 0.11, 0.04);
    }
    if (type === 'lift' || type === 'exit') {
      for (const u of [-0.52, 0.52]) b(type === 'lift' ? 'metal' : 'door', u, 1.2, 0.12, 1, 2.39, 0.08);
      b('shadow', 0, 2.52, 0.13, 1.08, 0.23, 0.08);
      b('metal', 1.26, 1.35, 0.13, 0.18, 0.38, 0.08);
      b('shadow', 1.26, 1.37, 0.18, 0.13, 0.18, 0.025);
      if (type === 'lift') {
        for (const u of [-0.13, 0.13]) {
          for (const offset of [-0.071, 0, 0.071])
            b('base', u, 2.52 + offset, 0.18, 0.087, 0.012, 0.012);
          for (const dx of [-0.046, 0.046])
            b('base', u + dx, 2.52, 0.18, 0.012, 0.13, 0.012);
        }
      }
      frame.sign(type === 'lift' ? label + '  FUERA DE SERVICIO' : label, 2.78, 0.12);
    } else if (type === 'cooler') {
      for (const u of [-0.72, 0.72]) for (const y of [0.73, 1.9]) {
        b('shadow', u, y, 0.1, 1.38, 1.06, 0.15);
        b('metal', u, y, 0.19, 1.29, 0.99, 0.08);
        b('rust', u + 0.4, y, 0.26, 0.21, 0.09, 0.1);
        b('pillow', u - 0.34, y + 0.26, 0.24, 0.22, 0.09, 0.02);
      }
    } else if (type === 'extinguisher') {
      b('red', 0, 1.03, 0.24, 0.27, 0.61, 0.24);
      b('metal', 0, 1.39, 0.23, 0.18, 0.12, 0.14);
      b('shadow', 0.16, 1.12, 0.29, 0.055, 0.35, 0.08);
      b('pillow', 0, 1.08, 0.38, 0.19, 0.18, 0.012);
      frame.sign('EXTINTOR', 1.8, 0.12, false, 0.95);
    } else if (type === 'sign') frame.sign(label, 2.35, 0.11, false, 2.8);
  }
  padding(x, z, side) {
    const b = this.face(x, z, side).box;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++)
        b('padding', (col - 1.5) * 0.75, 0.46 + row * 0.73, 0.16,
          0.743, 0.723, 0.23 + ((row + col) % 2) * 0.032);
  }
  box(material, x, y, z, w, h, d, roll = 0, yaw = 0) {
    const o = this.transform;
    o.position.set(x, y, z);
    o.scale.set(w, h, d);
    o.rotation.set(0, yaw, roll, 'YXZ');
    o.updateMatrix();
    if (!this.batches.has(material)) this.batches.set(material, []);
    this.batches.get(material).push(o.matrix.clone());
    const halfY = (Math.abs(Math.sin(roll)) * w + Math.abs(Math.cos(roll)) * h) / 2;
    if (y - halfY > 1.86 || y + halfY < 0.05) return;
    const span = Math.abs(Math.cos(roll)) * w + Math.abs(Math.sin(roll)) * h;
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    this.collider(x, z, (c * span + s * d) / 2, (s * span + c * d) / 2, y - halfY, y + halfY);
  }
  sign(text, x, y, z, angle, width) {
    if (!this.signMaterials.has(text)) {
      const c = document.createElement('canvas');
      c.width = 192; c.height = 32;
      const g = c.getContext('2d');
      const exit = text.includes('EXIT');
      g.fillStyle = exit ? '#327248' : '#243932';
      g.fillRect(0, 0, 192, 32);
      g.strokeStyle = '#b0b69d';
      g.strokeRect(1.5, 1.5, 189, 29);
      g.fillStyle = exit ? '#ecf7bb' : '#e2ddbb';
      g.textAlign = 'center';
      g.font = '24px Silkscreen, monospace';
      g.fillText(text, 96, 23, 183);
      const t = new THREE.CanvasTexture(c);
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.colorSpace = THREE.SRGBColorSpace;
      const m = this.engine.snap(new THREE.MeshBasicMaterial({ map: t }));
      this.signMaterials.set(text, m);
      this.signAssets.push(t, m);
    }
    const sign = new THREE.Mesh(this.signPlane, this.signMaterials.get(text));
    sign.scale.set(width, width / 6, 1);
    sign.name = text;
    sign.position.set(x, y, z);
    sign.rotation.y = angle;
    this.group.add(sign);
  }
  stair(stair) {
    const [x, z] = stair.at, [dx, dz] = sides[stair.side];
    const frame = this.face(x, z, stair.side), b = frame.box;
    const offset = stair.turn ? -0.54 : 0;
    for (let i = 0; i < 5; i++) {
      const h = (i + 1) * 0.12;
      b('base', offset, h / 2, 1.75 - i * 0.24, stair.turn ? 1.12 : 1.72, h, 0.25);
      b('stripe', offset, h, 1.85 - i * 0.24, stair.turn ? 1.12 : 1.72, 0.026, 0.052);
    }
    if (stair.turn) {
      b('base', offset, 0.3, 0.42, 1.12, 0.6, 0.62);
      for (let i = 0; i < 5; i++) {
        const h = 0.7 + i * 0.12;
        b('base', 0.13 + i * 0.23, h / 2, 0.47, 0.24, h, 0.85);
        b('stripe', 0.03 + i * 0.23, h, 0.47, 0.042, 0.026, 0.85);
      }
    }
    b('door', stair.turn ? 0.9 : 0, 1.68, 0.085, 1.1, 2.05, 0.08);
    frame.sign((stair.to > this.index ? 'SUBIR ' : 'BAJAR ') + floors[stair.to].id, 2.89, 0.17);
    const point = center(stair.at);
    point.x -= dx * 0.68; point.z -= dz * 0.68;
    this.landings.push({ stair, point });
  }
  update(time, player) {
    const near = [...this.lamps].sort((a, b) => a.p.distanceToSquared(player) - b.p.distanceToSquared(player));
    this.electrical = 0;
    for (const f of near) {
      if (f.softFlicker) {
        f.level = 0.91 + 0.06 * Math.sin(time * 9) + 0.03 * Math.sin(time * 21);
        if (f.unstable) f.material.color.copy(f.color).multiplyScalar(f.level);
        if (f.beam) f.beam.value = 0.18 * f.level;
        continue;
      }
      if (!f.unstable) continue;
      if (time >= f.until) {
        const off = f.level > 0.45;
        f.level = off ? 0.06 + Math.random() * 0.33 : 0.78 + Math.random() * 0.22;
        f.until = time + (off ? 0.04 + Math.random() * 0.25 :
          0.09 + Math.random() ** 2 * (this.index === 3 ? 1.75 : 4.4));
        f.material.color.copy(f.color).multiplyScalar(f.level);
        if (f.beam) f.beam.value = 0.18 * f.level;
      }
      const distance = f.p.distanceToSquared(player);
      if (distance < 49 && this.clearSight(player, f.p))
        this.electrical = Math.max(this.electrical, (1 - Math.sqrt(distance) / 7) ** 2 * (0.35 + f.level * 0.65));
    }
    this.lights.forEach((light, i) => {
      const f = near[i];
      light.position.set(f.p.x, 2.76, f.p.z);
      light.color.copy(f.color);
      light.intensity = f.base * f.level;
    });
    this.props.update(time);
  }
}
