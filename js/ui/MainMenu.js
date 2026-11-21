function random(seed) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
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
    const scene = this.root.querySelector('#menu-scene');
    this.paintFallback = backdrop(scene);
    this.paintFallback(0);
    const art = new Image();
    art.onload = () => {
      const context = scene.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(art, 0, 0, scene.width, scene.height);
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
