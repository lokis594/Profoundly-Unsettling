import THREE from '../core/ThreeRuntime.js';

export class HospitalExterior {
  constructor(engine, textures) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x19262e);
    this.scene.fog = new THREE.FogExp2(0x19262e, 0.0235);
    this.camera = new THREE.PerspectiveCamera(43, 16 / 9, 0.15, 125);
    this.target = new THREE.Vector3();
    this.motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = this.scene;
    const surface = (color, map) =>
      engine.snap(new THREE.MeshLambertMaterial({ color, map }));
    const unlit = (color) => engine.snap(new THREE.MeshBasicMaterial({ color }));
    const masonry = textures.brick.clone();
    masonry.repeat.set(4, 3);
    const gravel = textures.floor.clone();
    gravel.repeat.set(22, 16);
    const brick = surface(0xbcc8c1, masonry);
    const trim = surface(0x7a8178, textures.brick);
    const iron = surface(0x71665b, textures.rust);
    const dark = unlit(0x080e13);
    const bark = surface(0x4e4e48, textures.wood);
    const cube = new THREE.BoxGeometry();
    const boxes = new Map();
    const box = (material, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(cube, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      if (!boxes.has(material)) boxes.set(material, []);
      boxes.get(material).push(mesh);
      return mesh;
    };
    const branch = (from, to, radius, tip) => {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
      const axis = b.clone().sub(a);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(tip, radius, axis.length(), 5), bark);
      mesh.position.copy(a).lerp(b, 0.5);
      mesh.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, axis.normalize());
      scene.add(mesh);
    };

    scene.add(new THREE.HemisphereLight(0x819899, 0x302821, 0.78));
    const moon = new THREE.DirectionalLight(0x9dbbd1, 1.85);
    moon.position.set(-12, 17, 7);
    scene.add(moon);
    const rim = new THREE.DirectionalLight(0x4f6668, 0.7);
    rim.position.set(26, 12, -8);
    scene.add(rim);

    box(surface(0x5a665b, gravel), 4, -0.22, 1, 76, 0.4, 69);
    box(trim, 10, 0.012, 12, 5.2, 0.03, 24);
    for (const [x, width, depth, front] of [[2.9, 9.2, 7, -1.55], [10, 5, 9, 0], [17.1, 9.2, 7, -1.55]]) {
      box(brick, x, 5.2, front - depth / 2, width, 10.4, depth);
      box(trim, x, 10.42, front - depth / 2, width + 0.35, 0.3, depth + 0.35);
      for (const y of [0.86, 3.66, 6.73, 9.94])
        box(trim, x, y, front + 0.095, width, 0.19, 0.25);
      for (const offset of [-0.48, 0.48])
        box(trim, x + width * offset, 5.63, front + 0.09, 0.29, 9.4, 0.28);
    }
    box(trim, 10, 10.92, -1.95, 5.05, 0.76, 3.7);
    box(dark, 10, 11.48, -2.15, 5.36, 0.37, 3.75);
    box(dark, 10, 2.27, 0.071, 2.36, 3.18, 0.16);
    for (const dx of [-1.35, 1.35])
      box(trim, 10 + dx, 2.27, 0.25, 0.28, 3.23, 0.65);
    box(trim, 10, 3.94, 0.43, 3.06, 0.32, 0.85);
    for (let step = 0; step < 6; step++) {
      const h = (step + 1) * 0.14;
      box(trim, 10, h / 2, 1.59 - step * 0.29, 4.8 - step * 0.13, h, 0.36);
    }
    const doorway = new THREE.PointLight(0xb4a367, 18, 7);
    doorway.position.set(10, 3.6, 0.85);
    scene.add(doorway);

    const litWindows = new Map([
      ['1:1', 0x9e9a57], ['2:2', 0xb8a373], ['4:1', 0x929d67], ['5:0', 0xbb9b61],
    ]);
    for (const [column, x] of [0.2, 2.9, 5.6, 10, 14.4, 17.1, 19.8].entries()) {
      const front = column === 3 ? 0 : -1.55;
      for (const [row, y] of [2.25, 5.34, 8.45].entries()) {
        if (column === 3 && row === 0) continue;
        const color = litWindows.get(column + ':' + row);
        const windowMaterial = color ? unlit(color) : dark;
        box(trim, x, y, front + 0.07, 1.63, 2.04, 0.2);
        box(windowMaterial, x, y, front + 0.19, 1.31, 1.75, 0.09);
        box(iron, x, y + 0.27, front + 0.26, 1.31, 0.11, 0.06);
        box(iron, x, y, front + 0.26, 0.095, 1.75, 0.06);
        box(trim, x, y - 0.96, front + 0.21, 1.75, 0.12, 0.47);
        if (color) {
          const glow = new THREE.PointLight(color, 7, 4.2);
          glow.position.set(x, y, front + 0.58);
          scene.add(glow);
          const shard = box(dark, x + 0.36, y - 0.54, front + 0.28, 0.52, 0.6, 0.04);
          shard.rotation.z = -0.17;
          if (column === 4) {
            this.unstable = { material: windowMaterial, glow, color: new THREE.Color(color) };
            this.until = 2.6;
            this.flicker = false;
          }
        }
      }
    }

    for (const [left, right] of [[-4, 7.4], [12.6, 25]]) {
      const z = 5.5;
      for (const h of [0.46, 1.51])
        box(iron, (left + right) / 2, h, z, right - left, 0.07, 0.065);
      for (let x = left; x < right; x += 0.39) {
        const bar = box(iron, x, 1.0, z, 0.052, 1.94, 0.052);
        if (Math.round(x * 37) % 7 === 0) bar.rotation.z = 0.072;
        const point = box(iron, x, 1.98, z, 0.085, 0.13, 0.06);
        point.rotation.z = Math.PI / 4;
      }
    }
    for (const x of [-4, 7.4, 12.6, 25]) {
      box(trim, x, 1.03, 5.5, 0.38, 2.06, 0.44);
      box(trim, x, 2.09, 5.5, 0.49, 0.15, 0.56);
    }
    for (const [x, z, s] of [[-2.3, 2.6, 1], [20.7, 3.4, -1]]) {
      const p = (a, y, b) => [x + a * s, y, z + b];
      branch(p(0, 0, 0), p(0.35, 3.2, 0.13), 0.29, 0.16);
      branch(p(0.35, 3.2, 0.13), p(-0.2, 6.4, 0.21), 0.16, 0.035);
      branch(p(-0.2, 6.4, 0.21), p(0.4, 7.85, 0.57), 0.035, 0.005);
      branch(p(0.28, 2.7, 0.12), p(-1.35, 4.77, -0.22), 0.13, 0.06);
      branch(p(-1.35, 4.77, -0.22), p(-2.2, 6, -0.46), 0.06, 0.01);
      branch(p(-1.35, 4.77, -0.22), p(-2.72, 5.16, 0.22), 0.042, 0.006);
      branch(p(0.13, 4.2, 0.15), p(1.65, 5.38, 0.74), 0.092, 0.043);
      branch(p(1.65, 5.38, 0.74), p(2.48, 6.7, 1.27), 0.043, 0.007);
      branch(p(1.65, 5.38, 0.74), p(2.89, 5.62, 0.4), 0.035, 0.006);
    }

    for (const [material, items] of boxes) {
      const batch = new THREE.InstancedMesh(cube, material, items.length);
      items.forEach((mesh, i) => {
        mesh.updateMatrix();
        batch.setMatrixAt(i, mesh.matrix);
      });
      batch.computeBoundingSphere();
      scene.add(batch);
    }
  }
  update(time, aspect) {
    const sway = this.motion ? Math.sin(time * 0.38) : 0;
    const wide = THREE.MathUtils.smoothstep(aspect, 0.55, 1.65);
    this.camera.aspect = aspect;
    this.camera.fov = 52 - wide * 9;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(6.2 + sway * 0.095, 3.15 + sway * 0.065, 31 - wide * 2.6);
    this.target.set(9 - wide * 5.0, 4.55 + sway * 0.09, -0.6);
    this.camera.lookAt(this.target);
    if (time >= this.until) {
      this.flicker = !this.flicker;
      this.until = time + (this.flicker ? 0.05 + Math.random() * 0.19 : 0.2 + Math.random() ** 2 * 6);
      const level = this.flicker ? 0.09 + Math.random() * 0.26 : 1;
      this.unstable.material.color.copy(this.unstable.color).multiplyScalar(level);
      this.unstable.glow.intensity = 7 * level;
    }
  }
}
