import THREE from '../core/ThreeRuntime.js';
import { lightBeam } from './LightBeam.js';

export class HospitalProps {
  constructor(map) {
    this.map = map;
    this.wheelRim = new THREE.TorusGeometry(0.89, 0.11, 4, 12);
    this.fixtureBox = new THREE.BoxGeometry();
    this.drum = new THREE.CylinderGeometry(1, 1, 1, 10);
    this.monitors = [];
    this.resources = [];
  }
  clear() {
    this.resources.forEach((resource) => resource.dispose());
    this.resources.length = 0;
    this.monitors.length = 0;
  }
  wheel(p, x, y, z, radius, width) {
    const wheel = new THREE.Mesh(this.wheelRim, this.map.materials.shadow);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(p.x + x, y, p.z + z);
    wheel.scale.set(radius, radius, width * 4.5);
    this.map.group.add(wheel);
    this.map.collider(p.x + x, p.z + z, width * 0.52, radius);
    const spoke = new THREE.Mesh(this.fixtureBox, this.map.materials.rust);
    spoke.position.copy(wheel.position);
    spoke.scale.set(width, radius * 1.72, width);
    this.map.group.add(spoke);
    const cross = new THREE.Mesh(this.fixtureBox, this.map.materials.rust);
    cross.position.copy(wheel.position);
    cross.scale.set(width, width, radius * 1.72);
    this.map.group.add(cross);
  }
  beam(p, direction, options) {
    const beam = lightBeam(p, direction, options);
    this.resources.push(beam.geometry, beam.material);
    this.map.group.add(beam);
    return beam.material.uniforms.strength;
  }
  fixture(p, index, color) {
    const box = (material, x, y, z, w, h, d) =>
      this.map.box(material, p.x + x, y, p.z + z, w, h, d);
    const unstable = index % 4 === 1 || index % 4 === 2 || (this.map.index === 3 && index % 4 === 3);
    for (const x of [-0.52, 0.52]) box('metal', x, 3.1, 0, 0.025, 0.29, 0.025);
    box('metal', 0, 2.96, 0, 1.4, 0.085, 0.36);
    const material = unstable
      ? this.map.engine.snap(new THREE.MeshBasicMaterial({ color }))
      : this.map.materials.bulb;
    if (unstable) this.resources.push(material);
    for (const z of [-0.085, 0.085]) {
      const tube = new THREE.Mesh(this.fixtureBox, material);
      tube.position.set(p.x, 2.895, p.z + z);
      tube.scale.set(1.21, 0.039, 0.054);
      this.map.group.add(tube);
    }
    const beam = index % 3 === 1 || index % 4 === 2
      ? this.beam(new THREE.Vector3(p.x, 2.875, p.z), new THREE.Vector3(0, -1, 0), {
        width: 0.6, spread: 1.03, length: 2.82, color, strength: 0.18,
      })
      : null;
    return {
      p, unstable, material, beam,
      color: new THREE.Color(color),
      level: 1,
      until: 0.6 + Math.random() * 5,
      base: unstable ? 20 : 16,
    };
  }
  cylinder(material, x, y, z, radius, length, horizontal = false) {
    const mesh = new THREE.Mesh(this.drum, this.map.materials[material]);
    mesh.scale.set(radius, length, radius);
    mesh.position.set(x, y, z);
    if (horizontal) mesh.rotation.x = Math.PI / 2;
    this.map.group.add(mesh);
    if (y - (horizontal ? radius : length / 2) < 1.86)
      this.map.collider(x, z, radius, horizontal ? length / 2 : radius);
  }
  update(time) {
    for (const { material, offset } of this.monitors) {
      const signal = Math.sin(time * 1.7 + offset) * Math.sin(time * 3.9);
      material.color.setHex(signal > 0.58 ? 0x78977a : 0x17251f);
    }
  }
  place(type, p) {
    const b = (mat, x, y, z, w, h, d, ang = 0) =>
      this.map.box(mat, p.x + x, y, p.z + z, w, h, d, ang);
    if (type === 'bed' || type === 'morgue') {
      const bed = type === 'bed';
      const top = bed ? 0.78 : 0.91;
      b('rust', 0, top - 0.13, 0, 1.03, 0.09, 2.22);
      b(bed ? 'linen' : 'metal', 0, top, 0, 1.0, bed ? 0.19 : 0.06, 2.1);
      if (bed) b('pillow', 0, top + 0.13, -0.67, 0.73, 0.12, 0.35);
      for (const x of [-0.45, 0.45]) {
        b('metal', x, 0.31, 0, 0.065, 0.075, 1.91);
        if (bed) {
          b('rust', x, top + 0.19, 0.15, 0.05, 0.06, 1.33);
          for (const z of [-0.46, 0.75]) b('metal', x, top + 0.06, z, 0.044, 0.28, 0.044);
        }
        for (const z of [-0.94, 0.94]) {
          b('rust', x, top / 2 + 0.03, z, 0.07, top - 0.13, 0.07);
          if (bed) this.wheel(p, x, 0.105, z, 0.105, 0.065);
        }
      }
      if (!bed) b('rust', 0, top + 0.045, 0.96, 0.98, 0.05, 0.1);
    } else if (type === 'wheelchair') {
      b('linen', 0, 0.58, 0.03, 0.53, 0.09, 0.53);
      b('linen', 0, 0.92, -0.23, 0.51, 0.56, 0.075);
      for (const x of [-0.36, 0.36]) {
        this.wheel(p, x, 0.36, -0.13, 0.36, 0.056);
        this.wheel(p, x * 0.78, 0.11, 0.4, 0.11, 0.05);
        b('rust', x * 0.78, 0.57, -0.22, 0.05, 1.1, 0.05);
        b('metal', x * 0.78, 0.78, 0.01, 0.062, 0.056, 0.51);
        b('metal', x * 0.78, 0.36, 0.29, 0.045, 0.55, 0.047, 0.09);
        b('metal', x * 0.69, 0.2, 0.48, 0.22, 0.045, 0.23);
        b('shadow', x * 0.78, 1.12, -0.31, 0.083, 0.079, 0.22);
      }
    } else if (type === 'chairs') {
      for (const x of [-0.75, 0, 0.75]) {
        b('base', x, 0.47, 0, 0.63, 0.12, 0.62);
        b('base', x, 0.86, -0.28, 0.63, 0.65, 0.1);
        for (const dx of [-0.23, 0.23])
          b('metal', x + dx, 0.23, 0, 0.06, 0.46, 0.48);
      }
    } else if (['desk', 'station', 'dispensary'].includes(type)) {
      b('wood', 0, 0.5, 0, 1.94, 1, 0.78);
      b('linen', 0, 1.04, 0, 2.1, 0.1, 0.92);
      b('shadow', 0.48, 1.33, -0.1, 0.53, 0.42, 0.32);
      b('pillow', -0.5, 1.11, 0.08, 0.42, 0.03, 0.3);
      if (type === 'station') {
        const material = new THREE.MeshBasicMaterial({ color: 0x455c4f });
        this.resources.push(material);
        const scan = new THREE.Mesh(this.fixtureBox, material);
        scan.position.set(p.x + 0.48, 1.34, p.z + 0.07);
        scan.scale.set(0.42, 0.019, 0.012);
        this.map.group.add(scan);
        this.monitors.push({ material, offset: p.x });
      } else if (type === 'dispensary') {
        for (let i = 0; i < 4; i++) {
          this.cylinder('rust', p.x - 0.72 + i * 0.14, 1.18, p.z - 0.18, 0.047, 0.18);
          b('metal', -0.28 + i * 0.17, 1.104, 0.18, 0.14, 0.025, 0.035);
          b('pillow', -0.19 + i * 0.17, 1.105, 0.18, 0.06, 0.008, 0.008);
        }
      }
    } else if (type === 'boiler' || type === 'pipes') {
      for (const x of [-0.48, 0.48]) {
        this.cylinder('rust', p.x + x, 1.22, p.z, 0.44, 2.44);
        this.cylinder('metal', p.x + x, 2.62, p.z, 0.12, 0.42);
        for (const y of [0.38, 1.88]) this.cylinder('metal', p.x + x, y, p.z, 0.46, 0.08);
        b('red', x, 1.38, 0.44, 0.24, 0.11, 0.095);
      }
    } else if (type === 'washer') {
      b('metal', 0, 0.64, 0, 1.22, 1.28, 0.84);
      this.cylinder('shadow', p.x, 0.61, p.z + 0.44, 0.43, 0.1, true);
      this.cylinder('glass', p.x, 0.61, p.z + 0.5, 0.33, 0.035, true);
      b('pillow', -0.26, 1.12, 0.43, 0.35, 0.095, 0.045);
    } else if (type === 'iv') {
      this.cylinder('metal', p.x, 0.98, p.z, 0.026, 1.92);
      b('metal', 0, 0.09, 0, 0.49, 0.06, 0.08);
      b('metal', 0, 0.09, 0, 0.08, 0.06, 0.49);
      b('metal', 0, 1.95, 0, 0.41, 0.035, 0.035);
      b('pillow', 0.15, 1.76, 0, 0.13, 0.25, 0.065);
      b('linen', 0.15, 1.44, 0, 0.013, 0.42, 0.015);
    } else if (type === 'curtain') {
      b('metal', 0, 2.64, 0, 1.98, 0.05, 0.052);
      for (let i = 0; i < 9; i++)
        b('curtain', -0.84 + i * 0.21, 1.59, (i % 2) * 0.055, 0.216, 1.97, 0.055);
    } else if (type === 'overturned') {
      // The mattress lies on its long edge across the entire one-cell corridor.
      b('linen', 0, 0.65, 0, 0.27, 1.18, 2.89, 0.16);
      for (const z of [-1.36, 1.36]) {
        b('rust', 0.1, 0.52, z, 0.99, 0.085, 0.12, 0.7);
        this.wheel(p, 0.49, 0.86, z, 0.13, 0.09);
      }
      b('metal', 0.21, 0.23, 0, 0.1, 0.08, 2.96);
    } else if (type === 'toilet') {
      this.cylinder('pillow', p.x, 0.22, p.z + 0.06, 0.21, 0.41);
      this.cylinder('pillow', p.x, 0.41, p.z + 0.08, 0.29, 0.13);
      this.cylinder('shadow', p.x, 0.477, p.z + 0.1, 0.18, 0.016);
      b('pillow', 0, 0.64, -0.24, 0.49, 0.48, 0.22);
      b('linen', 0, 0.89, -0.24, 0.51, 0.04, 0.24);
      b('metal', 0.17, 0.77, -0.12, 0.09, 0.032, 0.05);
    } else if (type === 'basin') {
      b('pillow', 0, 0.75, 0, 0.6, 0.21, 0.47);
      b('metal', 0, 0.92, -0.17, 0.06, 0.2, 0.1);
      b('metal', 0, 0.37, 0, 0.12, 0.65, 0.12);
    } else {
      if (type === 'shelf') {
        for (const x of [-0.63, 0.63])
          for (const z of [-0.27, 0.27]) b('rust', x, 1, z, 0.06, 2, 0.06);
      } else {
        b('metal', 0, 1, 0, 1.32, 2, 0.48);
      }
      for (let i = 0; i < 4; i++) {
        if (type === 'shelf') b('metal', 0, 0.18 + 0.44 * i, 0, 1.3, 0.043, 0.61);
        else b('shadow', 0, 0.32 + 0.44 * i, 0.25, 1.18, 0.32, 0.035);
        for (let j = 0; j < 4; j++)
          b(
            j % 2 ? 'linen' : 'rust',
            -0.42 + j * 0.24,
            0.29 + 0.44 * i,
            type === 'shelf' ? 0.03 : 0.3,
            0.11,
            0.21,
            0.1,
          );
      }
    }
  }
}
