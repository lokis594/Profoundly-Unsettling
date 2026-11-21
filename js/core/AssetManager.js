import THREE from './ThreeRuntime.js';

const paths = {
  wall: 'textures/wall_tiles.png',
  floor: 'textures/floor_linoleum.png',
  ceiling: 'textures/ceiling_grime.png',
  door: 'textures/door_metal.png',
  nurse: 'sprites/enemy_needle_nurse.png',
};
function canvasFor(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = kind === 'nurse' ? 96 : 64;
  const c = canvas.getContext('2d');
  let seed = 83;
  const rnd = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (kind === 'nurse') {
    const poly = (pts, color) => {
      c.fillStyle = color;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
    };
    poly(
      [
        [19, 24],
        [31, 20],
        [43, 25],
        [38, 43],
        [45, 77],
        [18, 77],
        [24, 43],
      ],
      '#b3ad93',
    );
    c.fillStyle = '#a49d86';
    c.fillRect(26, 6, 13, 16);
    c.fillStyle = '#e1dac2';
    c.fillRect(23, 3, 17, 5);
    c.fillStyle = '#666152';
    for (let i = 0; i < 4; i++) c.fillRect(26, 8 + i * 3, 13, 1);
    for (const s of [-1, 1]) {
      const x = 31 + s * 11;
      poly(
        [
          [x, 24],
          [x + s * 4, 24],
          [x + s * 8, 45],
          [x + s * 4, 46],
        ],
        '#a49c85',
      );
      poly(
        [
          [x + s * 4, 43],
          [x + s * 9, 43],
          [x + s * 13, 59],
          [x + s * 10, 59],
        ],
        '#626a63',
      );
      c.strokeStyle = '#d1d1ba';
      c.beginPath();
      c.moveTo(x + s * 12, 58);
      c.lineTo(x + s * 19, 75);
      c.stroke();
      c.fillStyle = '#8d8573';
      c.fillRect(30 + s * 6, 77, 5, 12);
      c.fillStyle = '#5c5347';
      c.fillRect(29 + s * 6, 88, 7, 4);
    }
    return canvas;
  }
  const base = {
    wall: [132, 147, 131],
    floor: [98, 105, 93],
    ceiling: [125, 125, 107],
    door: [74, 86, 82],
  }[kind];
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      let v = rnd() * 16 - 8 + 6 * Math.sin(x * 0.3 + Math.cos(y * 0.2));
      if (kind === 'wall' && (x % 16 === 0 || y % 16 === 0)) v -= 44;
      if (kind === 'floor' && (x % 32 === 0 || y % 32 === 0)) v -= 16;
      if (kind === 'ceiling')
        v -= Math.max(0, Math.cos(x * 0.1) * Math.sin(y * 0.1)) * 35;
      c.fillStyle = 'rgb(' + base.map((a) => Math.round(a + v)).join(',') + ')';
      c.fillRect(x, y, 1, 1);
    }
  if (kind === 'door') {
    c.strokeStyle = '#3f443f';
    c.lineWidth = 2;
    c.strokeRect(1, 1, 62, 62);
    c.fillStyle = '#222b2b';
    c.fillRect(18, 10, 27, 16);
    c.fillStyle = '#899187';
    for (let i = 0; i < 4; i++) c.fillRect(20 + i * 7, 10, 1, 16);
    c.fillRect(48, 36, 8, 2);
  }
  return canvas;
}
export class AssetManager {
  constructor() {
    this.textures = {};
    this.fallbacks = new Set();
  }
  async load() {
    const loader = new THREE.TextureLoader();
    await Promise.all(
      Object.entries(paths).map(async ([key, file]) => {
        let texture;
        try {
          texture = await loader.loadAsync(
            new URL('../../assets/' + file, import.meta.url).href,
          );
        } catch {
          texture = new THREE.CanvasTexture(canvasFor(key));
          this.fallbacks.add(key);
        }
        texture.magFilter = texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        if (key !== 'nurse')
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.textures[key] = texture;
      }),
    );
    if (new URLSearchParams(location.search).get('enemy') === '3d') {
      try {
        const { GLTFLoader } = await import('../vendor/loaders/GLTFLoader.js');
        const url = new URL(
          '../../assets/models/enemy_needle_nurse.glb',
          import.meta.url,
        );
        this.nurseModel = (await new GLTFLoader().loadAsync(url.href)).scene;
        this.nurseModel.traverse((node) => {
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          for (const material of materials) {
            if (!material) continue;
            for (const texture of Object.values(material).filter(
              (value) => value?.isTexture,
            )) {
              texture.minFilter = texture.magFilter = THREE.NearestFilter;
              texture.generateMipmaps = false;
              texture.needsUpdate = true;
            }
          }
        });
      } catch {
        this.fallbacks.add('nurseModel');
      }
    }
    return this;
  }
}
