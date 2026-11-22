import THREE from '../core/ThreeRuntime.js';

// +Z is forward. All translations below a joint are local to that bone.
export class NurseRig {
  constructor(textures) {
    this.root = new THREE.Group();
    this.root.name = 'Enfermera de Agujas';
    this.geometries = {
      box: new THREE.BoxGeometry(),
      round: new THREE.SphereGeometry(1, 7, 5),
      taper: new THREE.CylinderGeometry(0.77, 1, 1, 7),
      flare: new THREE.CylinderGeometry(1, 0.76, 1, 7),
      point: new THREE.ConeGeometry(1, 1, 5),
    };
    const material = (color, map) => new THREE.MeshLambertMaterial({ color, map, flatShading: true });
    this.materials = {
      cloth: material(0xe9e5cb, textures.linen), bandage: material(0xb6aa86, textures.linen),
      stain: material(0x936456, textures.rust), skin: material(0xcbb59b, textures.linen),
      boot: material(0x514b41, textures.wood), steel: material(0xdae1d1, textures.metal),
      point: material(0xc9cec1, null),
    };
    this.materials.point.emissive.setHex(0x202725);
    const joint = (parent, name, x, y, z) => {
      const bone = new THREE.Group();
      bone.name = name;
      bone.position.set(x, y, z);
      parent.add(bone);
      return bone;
    };
    const part = (parent, shape, skin, x, y, z, w, h, d) => {
      const piece = new THREE.Mesh(this.geometries[shape], this.materials[skin]);
      piece.position.set(x, y, z);
      piece.scale.set(w, h, d);
      parent.add(piece);
      return piece;
    };
    this.hips = joint(this.root, 'pelvis', 0, 0.94, 0);
    part(this.hips, 'taper', 'cloth', 0, -0.045, 0, 0.22, 0.31, 0.148);
    part(this.hips, 'taper', 'bandage', 0, 0.1, 0, 0.19, 0.072, 0.135);
    for (let i = -2; i <= 2; i++) {
      const hem = part(this.hips, 'box', i === -1 ? 'stain' : 'cloth',
        i * 0.071, -0.17, 0.105 - 0.009 * i * i, 0.073, 0.21 + (i % 2) * 0.049, 0.033);
      hem.rotation.z = i * 0.083;
    }
    this.spine = joint(this.hips, 'torso', 0, 0.13, 0);
    part(this.spine, 'flare', 'cloth', 0, 0.21, 0, 0.213, 0.45, 0.147);
    part(this.spine, 'box', 'bandage', 0.018, 0.23, 0.105, 0.21, 0.34, 0.054);
    part(this.spine, 'box', 'stain', 0.084, 0.33, 0.14, 0.061, 0.043, 0.009);
    this.head = joint(this.spine, 'cuello', 0, 0.44, 0.02);
    part(this.head, 'taper', 'skin', 0, 0.048, 0, 0.064, 0.12, 0.058);
    part(this.head, 'round', 'skin', 0, 0.191, 0.018, 0.119, 0.159, 0.112);
    for (let i = 0; i < 3; i++) {
      const wrap = part(this.head, 'taper', i === 1 ? 'stain' : 'bandage',
        0, 0.147 + i * 0.046, 0.024, 0.124, 0.047, 0.113);
      wrap.rotation.z = -0.12 + 0.09 * i;
    }
    const cap = part(this.head, 'flare', 'cloth', -0.012, 0.348, -0.02, 0.146, 0.09, 0.102);
    cap.rotation.z = 0.15;
    part(this.head, 'box', 'stain', 0, 0.355, 0.078, 0.048, 0.015, 0.013);
    part(this.head, 'box', 'stain', 0, 0.355, 0.08, 0.016, 0.043, 0.013);
    this.limbs = [-1, 1].map(side => {
      const hip = joint(this.hips, 'cadera ' + side, side * 0.116, -0.025, 0);
      part(hip, 'flare', 'bandage', 0, -0.2, 0, 0.092, 0.41, 0.086);
      const knee = joint(hip, 'rodilla ' + side, 0, -0.40, 0);
      part(knee, 'flare', 'skin', 0, -0.19, -0.015, 0.068, 0.38, 0.072);
      part(knee, 'round', 'boot', 0, -0.39, 0.047, 0.08, 0.082, 0.133);
      const shoulder = joint(this.spine, 'hombro ' + side, side * 0.194, 0.367, 0.008);
      part(shoulder, 'round', 'cloth', side * 0.027, -0.04, 0, 0.104, 0.115, 0.10);
      part(shoulder, 'flare', 'skin', 0, -0.15, 0, 0.063, 0.285, 0.068);
      const elbow = joint(shoulder, 'codo ' + side, 0, -0.28, 0);
      part(elbow, 'flare', 'bandage', 0, -0.13, 0, 0.053, 0.26, 0.056);
      part(elbow, 'round', 'stain', 0, -0.267, 0.014, 0.057, 0.066, 0.05);
      for (const n of [-1, 1]) {
        const needle = joint(elbow, 'aguja', n * 0.024, -0.27, 0.035);
        needle.rotation.x = -0.2;
        needle.rotation.z = n * 0.085;
        part(needle, 'flare', 'steel', 0, -0.063, 0, 0.025, 0.13, 0.026);
        const tip = part(needle, 'point', 'point', 0, -0.26, 0, 0.012, 0.29, 0.012);
        tip.rotation.z = Math.PI;
      }
      return { side, hip, knee, shoulder, elbow };
    });
  }
  pose(nurse, lookYaw) {
    const { state, elapsed, clock, stride, gait, twitch } = nurse;
    const chase = state === 'CHASE';
    const hurt = state === 'HURT' ? Math.max(0, 1 - elapsed / 0.48) : 0;
    const prep = state === 'ATTACK' ? THREE.MathUtils.smoothstep(elapsed, 0, 0.34) : 0;
    const stab = state === 'ATTACK' ? THREE.MathUtils.smoothstep(elapsed, 0.37, nurse.contactTime) : 0;
    const recover = state === 'ATTACK' ? 1 - THREE.MathUtils.smoothstep(elapsed, 0.57, 0.93) : 1;
    const sway = Math.sin(stride);
    const breath = Math.sin(clock * 2.15) * 0.018 + twitch * 0.035;
    this.hips.position.set(gait * 0.034 * sway, 0.94 + gait * 0.028 * Math.abs(sway), 0);
    this.hips.rotation.set(0.05, -sway * 0.12 * gait, 0.045 + sway * 0.082 * gait);
    this.spine.position.z = 0.11 * stab * recover;
    this.spine.rotation.set(0.16 + breath + (chase ? 0.19 : 0) + (-0.24 * prep + 0.64 * stab) * recover - hurt * 0.37,
      sway * 0.18 * gait, -0.10 - sway * 0.093 * gait + hurt * 0.14 * Math.sin(elapsed * 66));
    this.head.rotation.set(-0.11 - breath * 1.8 - 0.14 * twitch, lookYaw + twitch * 0.53,
      0.12 + twitch * 0.3 + hurt * 0.26);
    for (const { side, hip, knee, shoulder, elbow } of this.limbs) {
      const swing = sway * side * gait;
      hip.rotation.x = -swing * (side < 0 ? 0.39 : 0.62);
      knee.rotation.x = 0.07 + Math.max(0, -swing) * (side < 0 ? 0.39 : 0.73);
      shoulder.rotation.x = -0.13 + swing * 0.43 - (chase ? 0.41 : 0)
        - (state === 'ALERT' ? 0.6 : 0) + (-2.68 * prep + 0.76 * stab) * recover;
      shoulder.rotation.z = side * (0.17 + (prep - stab) * 0.43 * recover + 0.14 * hurt);
      elbow.rotation.x = -0.24 - 0.14 * (1 + side) + (-0.88 * prep + 1.08 * stab) * recover;
    }
    this.materials.cloth.emissive.setHex(hurt > 0.72 ? 0x85524a : 0);
    this.materials.skin.emissive.setHex(hurt > 0.72 ? 0xa36a5b : 0);
  }
  dispose() {
    this.root.removeFromParent();
    for (const geom of Object.values(this.geometries)) geom.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
  }
}
