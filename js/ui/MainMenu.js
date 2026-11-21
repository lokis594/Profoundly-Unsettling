const glyph = {
  P: ['11110', '11011', '11011', '11110', '11000', '11000', '11000'],
  R: ['11110', '11011', '11011', '11110', '11100', '11010', '11011'],
  O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
  U: ['11011', '11011', '11011', '11011', '11011', '11011', '01110'],
  N: ['11001', '11101', '11101', '11111', '11011', '11011', '11001'],
  D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
  L: ['11000', '11000', '11000', '11000', '11000', '11000', '11111'],
  Y: ['11011', '11011', '01010', '01110', '00100', '00100', '00100'],
  S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
  E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
  T: ['11111', '11111', '00100', '00100', '00100', '00100', '00100'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  G: ['01111', '11000', '11000', '11011', '11001', '11011', '01111'],
};
function random(seed) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function paintTitle(canvas) {
  const ctx = canvas.getContext('2d');
  const rand = random(417);
  const rows = ['PROFOUNDLY', 'UNSETTLING'];
  canvas.width = 266;
  canvas.height = 100;
  rows.forEach((word, row) => {
    let pos = 1;
    const top = row * 43 + 1;
    for (const letter of word) {
      const form = glyph[letter];
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < form[y].length; x++) {
          if (form[y][x] === '0') continue;
          const px = pos + x * 4,
            py = top + y * 5;
          ctx.fillStyle = row === 1 && y === 6 ? '#bfb4a7' : '#dedbd0';
          ctx.fillRect(px, py, 4, 5);
          for (let n = 0; n < 2; n++) {
            ctx.fillStyle = rand() < 0.3 ? '#898781' : '#c9c8be';
            ctx.fillRect(
              px + Math.floor(rand() * 4),
              py + Math.floor(rand() * 5),
              1,
              1,
            );
          }
          if (rand() < 0.1) {
            ctx.clearRect(px, py, 1 + Math.floor(rand() * 2), 1);
          }
          if (row === 1 && y === 6 && rand() < 0.62) {
            const drip = 2 + Math.floor(rand() ** 3 * 15);
            ctx.fillStyle = '#842e36';
            ctx.fillRect(px, py + 4, 2, drip);
            ctx.fillStyle = '#b05c56';
            ctx.fillRect(px, py + 3, 1, 2);
          }
        }
      pos += form[0].length * 4 + 4;
    }
  });
  // Crop the empty right margin so the rendered title aligns with the controls.
  const raster = ctx.getImageData(0, 0, 238, 100);
  canvas.width = 238;
  ctx.putImageData(raster, 0, 0);
}
function backdrop(canvas) {
  const ctx = canvas.getContext('2d');
  const rand = random(1408),
    base = document.createElement('canvas');
  base.width = 384;
  base.height = 216;
  const g = base.getContext('2d'),
    sky = g.createLinearGradient(0, 0, 0, 216);
  sky.addColorStop(0, '#08101b');
  sky.addColorStop(0.65, '#283538');
  sky.addColorStop(1, '#10171d');
  g.fillStyle = sky;
  g.fillRect(0, 0, 384, 216);
  const windows = [];
  [
    [145, 82, 66, 6],
    [205, 48, 72, 9],
    [273, 64, 112, 8],
  ].forEach(([x, y, w, rows]) => {
    g.fillStyle = '#1a2428';
    g.fillRect(x, y, w, 132);
    for (let j = 0; j < rows; j++) {
      g.fillStyle = '#303a3b';
      g.fillRect(x, y + j * 12, w, 2);
      for (let i = 4; i < w - 6; i += 10) {
        g.fillStyle = '#0c151a';
        g.fillRect(x + i, y + j * 12 + 4, 6, 5);
        if (rand() < 0.12) windows.push([x + i, y + j * 12 + 4, rand() * 6]);
      }
    }
  });
  g.fillStyle = '#0d1419';
  g.fillRect(0, 177, 384, 39);
  for (let n = 0; n < 900; n++) {
    g.fillStyle = rand() > 0.5 ? '#1e292c' : '#101a1d';
    g.fillRect(rand() * 384, 177 + rand() * 40, rand() * 7 + 1, 1);
  }
  return (time) => {
    ctx.drawImage(base, 0, 0);
    for (const [x, y, p] of windows) {
      ctx.globalAlpha = 0.64 + 0.2 * Math.sin(time * 2 + p);
      ctx.fillStyle = '#c9b782';
      ctx.fillRect(x, y, 6, 5);
    }
    for (let j = 0; j < 7; j++) {
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#bbc9ba';
      ctx.fillRect(0, 145 + j * 5 + Math.sin(time * 0.3 + j) * 2, 384, 4);
    }
    ctx.globalAlpha = 1;
  };
}
export class MainMenu {
  constructor(onAction, onSound) {
    this.root = document.querySelector('#menu');
    this.dialog = document.querySelector('#panel');
    this.title = document.querySelector('#panel-title');
    this.body = document.querySelector('#panel-body');
    this.buttons = [...document.querySelectorAll('#actions button')];
    this.index = 0;
    paintTitle(document.querySelector('#wordmark'));
    this.paintFallback = backdrop(document.querySelector('#fallback-scene'));
    this.paintFallback(0);
    const art = new Image();
    art.onload = () => {
      document.querySelector('.scenery').style.backgroundImage =
        'url("' + art.src + '")';
      this.paintFallback = null;
    };
    art.src = new URL(
      '../../assets/ui/menu_hospital_bg.png',
      import.meta.url,
    ).href;
    this.buttons.forEach((button, index) => {
      button.onpointerenter = button.onfocus = () => this.select(index);
      button.onclick = () => onAction(button.dataset.action);
    });
    this.audio = document.querySelector('#audio-toggle');
    this.audio.onclick = onSound;
    document.addEventListener('keydown', (event) => {
      if (
        this.root.hidden ||
        this.dialog.open ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.select((this.index + (event.key === 'ArrowDown' ? 1 : 3)) % 4);
        this.buttons[this.index].focus();
      } else if (
        event.key === 'Enter' &&
        !event.repeat &&
        !event.target.closest('button')
      ) {
        event.preventDefault();
        this.buttons[this.index].click();
      }
    });
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.onBack?.();
    });
  }
  setSound(on) {
    this.audio.querySelector('span').textContent = on
      ? 'AUDIO ACTIVO'
      : 'ACTIVAR AUDIO';
    this.audio.setAttribute('aria-pressed', String(on));
  }
  select(i) {
    this.index = i;
    this.buttons.forEach((b, j) => b.classList.toggle('selected', i === j));
  }
  open(title, html, actions = {}, back = null) {
    this.title.textContent = title;
    this.body.innerHTML = html;
    this.onBack = back;
    this.body
      .querySelectorAll('[data-choice]')
      .forEach((b) => (b.onclick = actions[b.dataset.choice]));
    if (!this.dialog.open) this.dialog.showModal();
    this.body.querySelector('button,input,select')?.focus();
  }
  close() {
    if (this.dialog.open) this.dialog.close();
    this.onBack = null;
  }
  options(settings, change, back) {
    this.open(
      'OPTIONS',
      '<label class="form-row">Volumen <output id="vol-value"></output><input id="volume" type="range" min="0" max="100"></label>' +
        '<label class="form-row">Sensibilidad <output id="sens-value"></output><input id="sensitivity" type="range" min="25" max="200" step="5"></label>' +
        '<label class="form-row">Resolución interna<select id="resolution"><option value="320">320 × 180</option><option value="426">426 × 240</option><option value="480">480 × 270</option></select></label>' +
        button('back', 'VOLVER'),
      { back },
      back,
    );
    const sync = () => {
      this.body.querySelector('#vol-value').value = settings.volume + '%';
      this.body.querySelector('#sens-value').value = settings.sensitivity + '%';
    };
    for (const key of ['volume', 'sensitivity', 'resolution']) {
      const input = this.body.querySelector('#' + key);
      input.value = settings[key];
      input.oninput = () => {
        change(key, Number(input.value));
        sync();
      };
    }
    sync();
  }
}
export function button(action, label) {
  return (
    '<button class="panel-btn" data-choice="' +
    action +
    '">' +
    label +
    '</button>'
  );
}
