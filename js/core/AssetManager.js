import THREE from './ThreeRuntime.js';

const palettes = {
  wall:    ['#283730', '#3f5148', '#57665a', '#697d6e', '#819386'],
  floor:   ['#30332e', '#424940', '#515c53', '#636d60', '#818673'],
  ceiling: ['#353532', '#4b4b40', '#605f51', '#737263', '#888475'],
  door:    ['#292d29', '#414842', '#525d55', '#616d64', '#818a7e'],
  brick:   ['#292c2a', '#3c4140', '#535554', '#626763', '#757b77'],
  metal:   ['#272d2b', '#454d4a', '#626b65', '#7a8580', '#a3a79c'],
  wood:    ['#2d251f', '#453831', '#5b483a', '#70594a', '#86745a'],
  linen:   ['#414335', '#606451', '#777c66', '#92957e', '#a5a68d'],
  rust:    ['#2c221e', '#48342a', '#624334', '#805740', '#9a6e51'],
};
const oxide = ['#353029', '#4d382b', '#664732', '#83593b'];

function canvasFor(kind) {
  const canvas = document.createElement('canvas');
  const size = kind === 'brick' ? 128 : 64;
  canvas.width = size;
  canvas.height = kind === 'nurse' ? 96 : size;
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  let seed = 83 + kind.charCodeAt(0) * 17;
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
  const palette = palettes[kind];
  const corroded = ['door', 'metal', 'rust', 'ceiling'].includes(kind);
  const stains = Array.from({ length: 6 }, () => ({
    x: Math.floor(rnd() * size),
    y: Math.floor(rnd() * size),
    w: 2 + rnd() * (size / 6),
    h: 6 + rnd() * (size / 3),
  }));
  const distance = (a, b) => Math.min(Math.abs(a - b), size - Math.abs(a - b));
  const pixel = (x, y, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = rnd();
      const fx = x % 16, fy = y % 16;
      let shade = grain < 0.17 ? 2 : grain < 0.92 ? 3 : 4;
      let masonry = false;
      if (kind === 'brick' || kind === 'wall') {
        const bx = (x + (kind === 'brick' ? 16 * Math.floor(y / 16) : 0)) % (kind === 'brick' ? 32 : 16);
        masonry = bx === 0 || fy === 0;
        if (masonry) shade = grain > 0.88 ? 1 : 0;
        else if (bx === 1 || fy === 1) shade = 4;
        else if (fy === 15) shade = 2;
        if (kind === 'wall' && fy > 4 && fx === (3 + y + Math.floor(y / 4)) % 17 && x < 18)
          shade = 0;
      }
      if (kind === 'floor' && (x % 32 === 0 || y % 32 === 0)) shade = 1;
      if (kind === 'wood') shade = (y + Math.floor(x / 10)) % 7 < 2 ? 1 : shade;
      if (kind === 'linen' && (fx % 2 === 0 && fy % 2 === 0)) shade = Math.max(0, shade - 1);
      const damp = stains.some(({ x: sx, y: sy, w, h }) =>
        distance(x, sx) / w + distance(y, sy) / h < 0.74 + grain * 0.33
      );
      const streak = corroded && y > 14 && (x + Math.floor(y / 19)) % 23 < (y > 45 ? 1 : 2);
      if (damp && !masonry) shade = Math.max(0, shade - (grain < 0.45 ? 2 : 1));
      pixel(x, y, (streak || (corroded && damp && grain < 0.46))
        ? oxide[shade] ?? oxide[3]
        : palette[shade]);
    }
  }
  if (kind === 'door') {
    c.fillStyle = '#323630';
    c.fillRect(2, 2, 60, 2);
    c.fillRect(2, 60, 60, 2);
    c.fillRect(2, 4, 2, 56);
    c.fillRect(60, 4, 2, 56);
    c.fillStyle = '#262c28';
    c.fillRect(18, 10, 27, 16);
    c.fillStyle = '#77807a';
    for (let i = 0; i < 4; i++) c.fillRect(20 + i * 7, 10, 1, 16);
    c.fillRect(48, 36, 8, 2);
  }
  return canvas;
}
function pixelTexture(texture, repeat = true) {
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export class AssetManager {
  constructor() {
    this.textures = {};
    this.fallbacks = new Set();
    for (const key of Object.keys(palettes))
      this.textures[key] = pixelTexture(new THREE.CanvasTexture(canvasFor(key)));
  }
  async load() {
    try {
      const url = new URL('../../assets/sprites/enemy_needle_nurse.png', import.meta.url);
      this.textures.nurse = pixelTexture(await new THREE.TextureLoader().loadAsync(url.href), false);
    } catch {
      this.textures.nurse = pixelTexture(new THREE.CanvasTexture(canvasFor('nurse')), false);
      this.fallbacks.add('nurse');
    }
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
