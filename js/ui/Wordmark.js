import { grain } from '../core/PixelSurfaces.js';
export function engrave(title) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 78;
  const g = c.getContext('2d');
  function row(word, x, y, width, height, ink) {
    g.save();
    g.translate(x, y);
    g.font = 'bold 48px Georgia, serif';
    g.scale(width / g.measureText(word).width, height / 48);
    g.fillStyle = '#542f30';
    g.fillText(word, 1, 2);
    g.fillStyle = ink;
    g.fillText(word, 0, 0);
    g.restore();
  }
  row('PROFOUNDLY', 1, 32, 228, 40, '#c0b8a6');
  row('UNSETTLING', 9, 72, 245, 51, '#ded4be');
  g.globalCompositeOperation = 'source-atop';
  for (let y = 0; y < 78; y++)
    for (let x = 0; x < 256; x++) {
      if (
        grain(x, y) > 0.934 ||
        Math.abs(x + Math.floor(y * 0.18 + Math.sin(y * 0.3)) - 163) < 0.6
      ) {
        g.fillStyle = grain(y, x) > 0.5 ? '#68413b' : '#534f46';
        g.fillRect(x, y, 1, 1);
      }
    }
  title.setAttribute('aria-label', 'PROFOUNDLY UNSETTLING');
  c.setAttribute('aria-hidden', 'true');
  title.replaceChildren(c);
}
