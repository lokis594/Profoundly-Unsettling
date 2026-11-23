import THREE from './ThreeRuntime.js';

const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function grain(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export function pixels(size, sample) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d'),
    data = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const rgba = sample(x, y, (bayer[(x % 4) + 4 * (y % 4)] - 7.5) / 16);
      data.data.set(rgba, 4 * (x + y * size));
    }
  g.putImageData(data, 0, 0);
  return canvas;
}
const palettes = {
  enamel: [0x311e1a, 0x542521, 0x71352d, 0x876048, 0x938777],
  steel: [0x292e31, 0x494e50, 0x636864, 0x80867e, 0xabb0a3],
  coat: [0x131c24, 0x202f38, 0x314551, 0x425460, 0x586970],
  tissue: [0x260f15, 0x4e2427, 0x71443c, 0x927466, 0xaf9783],
  paper: [0x847254, 0xa38f69, 0xb4a47e, 0xc4b48e, 0xd1c39b],
};
export function surfaceCanvas(kind, size = 64) {
  const palette = palettes[kind];
  return pixels(size, (x, y, d) => {
    let v =
      2.15 +
      0.42 * Math.sin(x * 0.21 + Math.sin(y * 0.17)) +
      0.58 * Math.cos(y * 0.12 + x * 0.08) +
      grain(x, y) * 0.55 +
      d;
    if (kind === 'enamel' && grain(x >> 1, y >> 2) > 0.92) v = 4;
    if (kind === 'steel' && grain(x >> 3, y) > 0.91) v = 4;
    if (
      kind === 'tissue' &&
      Math.abs(Math.sin(x * 0.26 + y * 0.07 + grain(1, y >> 2) * 0.6)) < 0.18
    )
      v = 0;
    const c = palette[Math.max(0, Math.min(4, Math.floor(v)))];
    return [c >> 16, (c >> 8) & 255, c & 255, 255];
  });
}
const cache = new Map();
export function surface(kind) {
  if (!cache.has(kind)) {
    const map = new THREE.CanvasTexture(surfaceCanvas(kind));
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    cache.set(kind, new THREE.MeshLambertMaterial({ map, flatShading: true }));
  }
  return cache.get(kind);
}
