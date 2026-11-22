import THREE from '../core/ThreeRuntime.js';

export class Flashlight {
  constructor(engine, textures) {
    this.camera = engine.camera;
    this.on = true;
    this.kick = this.swayX = this.swayY = this.bob = this.lower = 0;
    this.mount = new THREE.Group();
    this.camera.add(this.mount);
    this.lamp = new THREE.SpotLight(0xffefd2, 46, 25, Math.PI / 6, 0.63, 2);
    this.lamp.position.set(0, 0, 0);
    this.lamp.target.position.z = -9;
    this.mount.add(this.lamp, this.lamp.target);

    this.view = new THREE.Scene();
    this.eye = new THREE.PerspectiveCamera();
    this.model = new THREE.Group();
    this.model.name = 'Linterna hospitalaria';
    this.view.add(this.model, new THREE.HemisphereLight(0xe5dfca, 0x787e72, 1.52));
    const keyLight = new THREE.DirectionalLight(0xd9d2ab, 1.95);
    keyLight.position.set(-2, 3, 1);
    this.view.add(keyLight);
    const metal = new THREE.MeshLambertMaterial({ map: textures.metal, flatShading: true });
    const grip = new THREE.MeshLambertMaterial({ map: textures.rust, color: 0x958d79, flatShading: true });
    const rubber = new THREE.MeshLambertMaterial({ color: 0x343d39, flatShading: true });
    this.lens = new THREE.MeshLambertMaterial({ color: 0xb2b394, emissive: 0xb6b794, flatShading: true });
    const barrel = (material, z, front, back, length) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(front, back, length, 10), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = z;
      this.model.add(mesh);
    };
    // The mount origin is the front glass. The handle extends back toward the eye.
    barrel(grip, 0.133, 0.031, 0.037, 0.19);
    barrel(metal, 0.054, 0.063, 0.033, 0.084);
    barrel(metal, 0.017, 0.064, 0.064, 0.024);
    barrel(this.lens, 0.003, 0.058, 0.061, 0.009);
    barrel(this.lens, 0.009, 0.0645, 0.065, 0.006);
    barrel(rubber, 0.231, 0.038, 0.036, 0.014);
    for (const z of [0.107, 0.133, 0.158, 0.184]) barrel(rubber, z, 0.037, 0.037, 0.009);
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.044), metal);
    button.position.set(-0.006, 0.035, 0.1);
    this.model.add(button);

    // Composite into the same low-resolution target, immediately before the retro pass.
    engine.scene.onAfterRender = (renderer) => {
      this.eye.projectionMatrix.copy(this.camera.projectionMatrix);
      this.eye.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.state.buffers.depth.setMask(true);
      renderer.clearDepth();
      try { renderer.render(this.view, this.eye); }
      finally { renderer.autoClear = autoClear; }
    };

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    const falloff = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    falloff.addColorStop(0, 'rgba(238,223,187,.74)');
    falloff.addColorStop(0.55, 'rgba(238,223,187,.23)');
    falloff.addColorStop(1, 'rgba(238,223,187,0)');
    g.fillStyle = falloff;
    g.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.mist = new THREE.Group();
    this.mount.add(this.mist);
    const quad = new THREE.PlaneGeometry(1, 1);
    const haze = new THREE.MeshBasicMaterial({
      map: texture, opacity: 0.032, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    for (const distance of [1.4, 2.5, 4, 6, 8.5, 11]) {
      const slice = new THREE.Mesh(quad, haze);
      slice.scale.setScalar(distance * 1.18);
      slice.position.z = -distance;
      this.mist.add(slice);
    }
  }
  toggle() {
    this.on = !this.on;
    this.kick = 1;
    this.lamp.visible = this.mist.visible = this.on;
    this.lens.emissiveIntensity = this.on ? 1 : 0;
    this.lens.color.setHex(this.on ? 0xb2b394 : 0x38413c);
  }
  update(dt, time, panic, player) {
    const { damp, clamp } = THREE.MathUtils;
    const motion = player.reducedMotion ? 0 : 1;
    this.kick = Math.max(0, this.kick - dt * 5.5);
    this.lower = damp(this.lower, this.on ? 0 : 1, 11, dt);
    const rate = 1 / Math.max(dt, 0.001);
    this.swayX = damp(this.swayX, clamp(player.lookDX * rate * 0.043, -0.12, 0.12), 10, dt);
    this.swayY = damp(this.swayY, clamp(player.lookDY * rate * 0.038, -0.1, 0.1), 10, dt);
    this.bob = damp(this.bob, player.moveSpeed / 4.4 * motion, 9, dt);
    const depth = 0.54;
    const halfH = depth * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const x = halfH * this.camera.aspect * 0.57;
    const y = -halfH * 0.54;
    this.mount.position.set(x + 0.018 * this.bob * Math.sin(player.phase),
      y + motion * 0.003 * Math.sin(time * 1.52) + 0.018 * this.bob * Math.cos(player.phase * 2)
        - 0.013 * this.lower, -depth + this.kick * 0.015 * motion);
    this.mount.rotation.set(-y / 8 - this.lower * 0.21 + motion * (this.swayY + this.kick * 0.07),
      x / 8 + motion * this.swayX, this.bob * 0.055 * Math.sin(player.phase), 'YXZ');
    this.model.position.copy(this.mount.position);
    this.model.quaternion.copy(this.mount.quaternion);
    const intensity = panic ? 0.85 + 0.14 * Math.sin(time * 19) * Math.cos(time * 2) : 1;
    this.lamp.intensity = 46 * intensity;
    this.lens.emissiveIntensity = this.on ? intensity : 0;
  }
}
