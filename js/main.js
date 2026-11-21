import { MainMenu, button } from './ui/MainMenu.js';
import { HUD } from './ui/HUD.js';
import { InputManager } from './core/InputManager.js';
import { AudioSystem } from './core/AudioSystem.js';

const State = Object.freeze({
  MENU: 'MENU',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});
const settings = { volume: 55, sensitivity: 100, resolution: 480 };
const saveKey = 'profoundly-unsettling.options.v1';
try {
  const saved = JSON.parse(localStorage.getItem(saveKey) || '{}');
  for (const [key, min, max] of [
    ['volume', 0, 100],
    ['sensitivity', 25, 200],
  ]) {
    if (Number.isFinite(saved[key]))
      settings[key] = Math.max(min, Math.min(max, saved[key]));
  }
  if ([320, 426, 480].includes(saved.resolution))
    settings.resolution = saved.resolution;
} catch {
  /* Defaults support browsers with storage disabled. */
}
const canvas = document.querySelector('#view'),
  hud = new HUD(),
  sound = new AudioSystem();
let state = State.MENU,
  session = null,
  transition = null,
  last = performance.now(),
  fallbackFrame = 0;
let audioWanted = false,
  explicitMute = false;
sound.volume = settings.volume / 100;
const menu = new MainMenu(menuAction, () => {
  audioWanted = !audioWanted;
  explicitMute = !audioWanted;
  setSound(audioWanted);
});
function setSound(on) {
  audioWanted = on;
  sound.muted = !on;
  if (on) void sound.start();
  sound.apply();
  menu.setSound(on);
}
const input = new InputManager(canvas, {
  pause,
  flash: () => {
    if (state === State.PLAYING && !transition) {
      session.flash.toggle();
      sound.tone(480, 230, 0.055, 0.055, 'triangle');
    }
  },
  interact: () => {
    if (
      state === State.PLAYING &&
      !transition &&
      session.map.stairNear(session.player.position)
    ) {
      transition = { elapsed: 0, loaded: false };
      hud.fade.classList.add('active');
      sound.tone(72, 37, 0.45, 0.12);
    }
  },
});
function setState(next) {
  state = next;
  document.body.dataset.state = next;
  menu.root.hidden = ![State.MENU, State.LOADING].includes(state);
  hud.root.hidden = ![State.PLAYING, State.PAUSED].includes(state);
  input.setActive(state === State.PLAYING);
}
function changeSetting(key, value) {
  settings[key] = value;
  try {
    localStorage.setItem(saveKey, JSON.stringify(settings));
  } catch {
    /* Session-only options. */
  }
  if (key === 'resolution' && session) {
    session.engine.resolution = value;
    session.engine.resize();
    session.engine.render();
  }
  if (key === 'volume') {
    sound.volume = value / 100;
    sound.apply();
  }
}
function showOptions(back) {
  menu.options(settings, changeSetting, back);
}
function menuAction(action) {
  if (state !== State.MENU) return;
  const back = () => menu.close();
  if (action === 'play') {
    void start();
    return;
  }
  if (action === 'options') {
    showOptions(back);
    return;
  }
  if (action === 'credits') {
    menu.open(
      'CREDITS',
      '<p><b>PROFOUNDLY UNSETTLING</b><br>Prototipo de terror psicológico · V0.1</p><p>Motor 3D: Three.js. Escenario, materiales, sonido y diseño de juego creados para este prototipo. Fondo y enfermera creados con OpenAI ImageGen.</p>' +
        button('back', 'VOLVER'),
      { back },
      back,
    );
  } else if (action === 'exit') {
    menu.open(
      'SESIÓN CERRADA',
      '<p>Puedes cerrar esta pestaña o volver al menú principal.</p>' +
        button('back', 'VOLVER AL MENÚ'),
      { back },
      back,
    );
  }
}
async function start() {
  if (state === State.LOADING) return;
  menu.close();
  transition = null;
  hud.fade.classList.remove('active');
  setState(State.LOADING);
  menu.open('INGRESANDO', '<p>Preparando el pabellón…</p>');
  if (!explicitMute) setSound(true);
  try {
    if (!session) {
      const { Session } = await import('./core/Session.js');
      session = await Session.create({ canvas, input, hud, sound, settings });
    }
    session.reset();
    resume();
  } catch (error) {
    console.error('No se pudo iniciar el hospital.', error);
    setState(State.MENU);
    const back = () => menu.close();
    menu.open(
      'ERROR DE INICIO',
      '<p>Comprueba que WebGL 2 esté activo y que el servidor pueda servir los archivos de la carpeta js/. Puedes volver al menú e intentarlo de nuevo.</p>' +
        button('back', 'VOLVER'),
      { back },
      back,
    );
  }
}
function resume() {
  menu.close();
  setState(State.PLAYING);
  input.lock();
  last = performance.now();
}
function pause() {
  if (state !== State.PLAYING) return;
  setState(State.PAUSED);
  showPause();
}
function showPause() {
  menu.open(
    'PAUSA',
    '<p>' +
      session.map.floor.id +
      ' · ' +
      session.map.floor.name +
      '</p>' +
      button('resume', 'CONTINUAR') +
      button('options', 'OPTIONS') +
      button('menu', 'MENÚ PRINCIPAL'),
    { resume, options: () => showOptions(showPause), menu: returnToMenu },
    resume,
  );
}
function returnToMenu() {
  menu.close();
  transition = null;
  hud.fade.classList.remove('active');
  setState(State.MENU);
  menu.buttons[0].focus();
}
function gameOver() {
  setState(State.GAME_OVER);
  menu.open(
    'GAME OVER',
    '<p>La última luz del pasillo se ha apagado.</p>' +
      button('restart', 'REINICIAR') +
      button('menu', 'MENÚ PRINCIPAL'),
    { restart: start, menu: returnToMenu },
    returnToMenu,
  );
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
  last = now;
  if (state === State.MENU && menu.paintFallback && now - fallbackFrame > 100) {
    menu.paintFallback(now / 1000);
    fallbackFrame = now;
  }
  if (state !== State.PLAYING) return;
  if (transition) {
    transition.elapsed += dt;
    if (transition.elapsed >= 0.24 && !transition.loaded) {
      session.useStair();
      transition.loaded = true;
      hud.fade.classList.remove('active');
    }
    if (transition.elapsed >= 0.49) transition = null;
    return;
  }
  session.update(dt);
  if (session.stats.health <= 0) gameOver();
}
setState(State.MENU);
requestAnimationFrame(frame);
