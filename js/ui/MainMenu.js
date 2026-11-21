import { RESOLUTIONS, renderHeight } from '../core/Engine.js';
import { HospitalExterior } from './HospitalExterior.js';

export class MainMenu {
  constructor(onAction, onSound, engine, textures) {
    this.root = document.querySelector('#menu');
    this.dialog = document.querySelector('#panel');
    this.title = document.querySelector('#panel-title');
    this.body = document.querySelector('#panel-body');
    this.buttons = [...document.querySelectorAll('#actions button')];
    this.index = 0;
    this.engine = engine;
    if (engine) this.exterior = new HospitalExterior(engine, textures);
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
  render(time) {
    if (!this.exterior) return;
    this.exterior.update(time, this.engine.camera.aspect);
    this.engine.render(this.exterior.scene, this.exterior.camera);
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
        '<label class="form-row">Resolución interna<select id="resolution">' +
        RESOLUTIONS.map((width) => '<option value="' + width + '">' + width + ' × ' + renderHeight(width) + '</option>').join('') +
        '</select></label>' +
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
