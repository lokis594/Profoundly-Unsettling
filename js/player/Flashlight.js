import THREE from '../core/ThreeRuntime.js';
export class Flashlight {
  constructor(camera) {
    this.on = true;
    this.lamp = new THREE.SpotLight(0xffefd2, 46, 25, Math.PI / 6, 0.63, 2);
    this.lamp.position.set(0.17, -0.14, -0.04);
    this.lamp.target.position.set(0, -0.18, -9);
    camera.add(this.lamp, this.lamp.target);
    // Low-opacity cross sections make suspended mist visible within the light cone.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d'),
      falloff = g.createRadialGradient(32, 32, 2, 32, 32, 31);
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
    camera.add(this.mist);
    const quad = new THREE.PlaneGeometry(1, 1);
    this.haze = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: 0.032,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const distance of [1.4, 2.5, 4, 6, 8.5, 11]) {
      const slice = new THREE.Mesh(quad, this.haze);
      slice.scale.setScalar(distance * 1.18);
      slice.position.set(0.14 - distance * 0.014, -0.12, -distance);
      this.mist.add(slice);
    }
  }
  toggle() {
    this.on = !this.on;
    this.lamp.visible = this.mist.visible = this.on;
  }
  update(time, panic) {
    this.lamp.target.position.x = 0.085 * Math.sin(time * 1.9);
    this.lamp.target.position.y = -0.18 + 0.06 * Math.cos(time * 1.3);
    this.mist.rotation.y = 0.009 * Math.sin(time * 1.9);
    this.lamp.intensity =
      46 * (panic ? 0.86 + 0.12 * Math.sin(time * 19) * Math.cos(time * 2) : 1);
  }
}
