import THREE from '../core/ThreeRuntime.js';
import { surface } from '../core/PixelSurfaces.js';

export class DeathScene {
  constructor(session) {
    const { nurse, flash, sound, weapon } = session;
    this.session = session;
    this.elapsed = 0;
    const rig = nurse.rig;
    this.rig = rig;
    flash.view.add(rig.root);
    flash.model.visible = weapon.model.visible = false;
    rig.root.position.set(0, -1.7, -0.66);
    rig.root.rotation.set(0, 0, 0);
    rig.spine.rotation.set(0.04, 0, 0);
    rig.hips.rotation.set(0, 0, 0);
    const part = (mat, x, y, z, w, h, d) => {
      const m = new THREE.Mesh(rig.geometries.round, mat);
      m.position.set(x, y, z);
      m.scale.set(w, h, d);
      rig.head.add(m);
      return m;
    };
    const flesh = surface('tissue');
    // Sculpt the hollows into the front hemisphere so the brow hides the eye sockets.
    const skull = new THREE.SphereGeometry(1, 20, 14);
    const vertices = skull.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i);
      const socket =
        Math.exp(-(((Math.abs(x) - 0.45) / 0.28) ** 2 + ((y - 0.16) / 0.22) ** 2)) * Math.max(0, z);
      vertices.setZ(i, z - 0.49 * socket);
      color.setScalar(1 - 1.14 * Math.min(0.84, socket));
      colors.push(color.r, color.g, color.b);
    }
    skull.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    skull.computeVertexNormals();
    rig.geometries.skull = skull;
    rig.materials.skull = flesh.clone();
    rig.materials.skull.vertexColors = true;
    const face = new THREE.Mesh(skull, rig.materials.skull);
    face.position.set(0, 0.2, 0.073);
    face.scale.set(0.14, 0.16, 0.11);
    rig.head.add(face);
    rig.materials.socket = new THREE.MeshLambertMaterial({ color: 0x110b10 });
    for (const sign of [-1, 1])
      part(rig.materials.socket, sign * 0.063, 0.223, 0.145, 0.038, 0.028, 0.009).rotation.z =
        sign * 0.22;
    part(flesh, 0.013, 0.052, 0.132, 0.097, 0.101, 0.068);
    part(rig.materials.socket, 0.008, 0.097, 0.181, 0.068, 0.085, 0.009);
    for (let i = -2; i <= 2; i++) {
      part(rig.materials.bandage, i * 0.024, 0.155 + 0.003 * i, 0.185, 0.008, 0.015, 0.007);
      part(flesh, i * 0.022 + 0.009, 0.028 + 0.004 * i, 0.183, 0.009, 0.012, 0.008);
    }
    this.light = new THREE.PointLight(0xcbd9ed, 2.4, 2);
    this.light.position.set(-0.15, 0.16, -0.19);
    flash.view.add(this.light);
    sound.fatal();
  }
  update(dt) {
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / 1.8),
      { player, hud, engine } = this.session;
    const jitter = player.reducedMotion ? 0.18 : 1;
    const shake = Math.sin(103 * this.elapsed) * Math.cos(31 * this.elapsed) * jitter;
    this.rig.root.position.z = -0.65 + 0.25 * Math.min(1, t * 3) + 0.012 * shake;
    this.rig.head.rotation.set(0.08 * shake, 0.22 * shake, 0.11 * Math.sin(t * 41) * jitter);
    engine.camera.rotation.set(
      player.basePitch + 0.034 * shake,
      player.baseYaw,
      0.04 * shake,
      'YXZ',
    );
    this.light.intensity = 1.1 + 1.4 * Math.abs(shake);
    this.session.trauma.fatal(t);
    if (t > 0.89) hud.fade.classList.add('active');
    engine.render();
    return t >= 1;
  }
  dispose() {
    this.light.removeFromParent();
    this.light.dispose();
    this.session.flash.model.visible = true;
  }
}
