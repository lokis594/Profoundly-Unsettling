import THREE from '../core/ThreeRuntime.js';
import { lightBeam } from './LightBeam.js';

export class HospitalProps {
  constructor(map) {
    this.map = map;
    this.wheelRim = new THREE.TorusGeometry(0.89, 0.11, 4, 12);
    this.fixtureBox = new THREE.BoxGeometry();
    this.resources = [];
  }
  clear() {
    this.resources.forEach((resource) => resource.dispose());
    this.resources.length = 0;
  }
  wheel(p, x, y, z, radius, width) {
    const wheel = new THREE.Mesh(this.wheelRim, this.map.materials.shadow);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(p.x + x, y, p.z + z);
    wheel.scale.set(radius, radius, width * 4.5);
    this.map.group.add(wheel);
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
    const unstable = index % 4 === 1 || index % 4 === 2;
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
        if (bed) b('rust', x, top + 0.19, 0.15, 0.05, 0.06, 1.33);
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
