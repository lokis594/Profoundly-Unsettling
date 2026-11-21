import THREE from './ThreeRuntime.js';
export class Engine {
  constructor(canvas, resolution) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 71);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.ambient = new THREE.HemisphereLight(0xadb7a4, 0x626050, 0.65);
    this.scene.add(this.ambient);
    this.resolution = resolution;
    this.resize = () => {
      const w = innerWidth,
        h = innerHeight;
      const height = Math.round((this.resolution * 9) / 16);
      this.renderer.setSize(
        Math.max(1, Math.round((height * w) / h)),
        height,
        false,
      );
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();
  }
  setFloor(floor) {
    this.scene.background = new THREE.Color(floor.fog);
    this.scene.fog = new THREE.FogExp2(floor.fog, floor.density);
    this.ambient.intensity = floor.ambient;
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
