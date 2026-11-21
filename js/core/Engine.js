import THREE from './ThreeRuntime.js';

export const DEFAULT_RESOLUTION = 360;
export const RESOLUTIONS = [320, DEFAULT_RESOLUTION, 426, 480];
export const renderHeight = (width) => Math.floor((width * 9 + 7) / 16);

export const bayerDither = /* glsl */ `
  // Bayer ranks by row: 0 8 2 10 / 12 4 14 6 / 3 11 1 9 / 15 7 13 5.
  float bayerPair(vec2 bit) {
    return 2.0 * abs(bit.x - bit.y) + bit.y;
  }

  float bayer4(vec2 pixel) {
    vec2 p = mod(floor(pixel), 4.0);
    float rank = 4.0 * bayerPair(mod(p, 2.0)) + bayerPair(floor(p / 2.0));
    return (rank + 0.5) / 16.0;
  }
`;

export class Engine {
  constructor(canvas, resolution = DEFAULT_RESOLUTION) {
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
    this.ambient = new THREE.HemisphereLight(0xb7c3b5, 0x5c4c42, 0.65);
    this.scene.add(this.ambient);

    const type = this.renderer.extensions.has('EXT_color_buffer_float')
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    this.renderSize = { value: new THREE.Vector2() };
    this.screen = new THREE.Scene();
    this.screenCamera = new THREE.Camera();
    const pass = new THREE.ShaderMaterial({
      uniforms: {
        source: { value: this.target.texture },
        renderSize: this.renderSize,
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      vertexShader: /* glsl */ `
        varying vec2 imageUV;
        void main() {
          imageUV = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D source;
        uniform vec2 renderSize;
        varying vec2 imageUV;
        ${bayerDither}
        void main() {
          gl_FragColor = texture2D(source, imageUV);
          #include <colorspace_fragment>
          float threshold = bayer4(imageUV * renderSize);
          gl_FragColor.rgb = floor(clamp(gl_FragColor.rgb, 0.0, 1.0) * 31.0 + threshold) / 31.0;
        }
      `,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pass);
    quad.frustumCulled = false;
    this.screen.add(quad);

    this.resize = () => {
      const w = Math.max(1, innerWidth);
      const h = Math.max(1, innerHeight);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.setResolution(resolution);
    this.resize();
  }
  setResolution(width) {
    const height = renderHeight(width);
    this.target.setSize(width, height);
    this.renderSize.value.set(width, height);
  }
  snap(material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.retroSize = this.renderSize;
      shader.vertexShader = 'uniform vec2 retroSize;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        // Keep near-plane and off-screen projections stable.
        if (gl_Position.w > 0.15 && all(lessThan(abs(gl_Position.xy), gl_Position.ww))) {
          vec2 grid = retroSize * 0.5;
          vec2 ndc = gl_Position.xy / gl_Position.w;
          vec2 snapped = floor(ndc * grid + 0.5) / grid;
          gl_Position.xy = mix(ndc, snapped, 0.58) * gl_Position.w;
        }`,
      );
    };
    return material;
  }
  setFloor(floor) {
    this.scene.background = new THREE.Color(floor.fog);
    this.scene.fog = new THREE.FogExp2(floor.fog, floor.density);
    this.ambient.intensity = floor.ambient;
  }
  render(scene = this.scene, camera = this.camera) {
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.screen, this.screenCamera);
  }
}
