import { MainMenu, button } from './ui/MainMenu.js';
import { HUD } from './ui/HUD.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { AssetManager } from './core/AssetManager.js';
import { Session } from './core/Session.js';
import { DEFAULT_RESOLUTION, Engine, RESOLUTIONS } from './core/Engine.js';

const State = Object.freeze({
  MENU: 'MENU',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MAP: 'MAP',
  DYING: 'DYING',
  GAME_OVER: 'GAME_OVER',
});
const settings = { volume: 55, sensitivity: 100, resolution: DEFAULT_RESOLUTION };
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
  if (RESOLUTIONS.includes(saved.resolution))
    settings.resolution = saved.resolution;
} catch {
  /* Defaults support browsers with storage disabled. */
}
const canvas = document.querySelector('#view'),
  hud = new HUD(),
  sound = new AudioManager(),
  assets = new AssetManager();
let engine;
if (canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' })) {
  engine = new Engine(canvas, settings.resolution);
}
let state = State.MENU,
  session = null,
  transition = null,
  last = performance.now();
let audioWanted = false,
  explicitMute = false;
sound.volume = settings.volume / 100;
const menu = new MainMenu(menuAction, () => {
  audioWanted = !audioWanted;
  explicitMute = !audioWanted;
  setSound(audioWanted);
}, engine, assets.textures);
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
      sound.flashlight(session.flash.on);
    }
  },
  map: toggleMap,
  attack: () => { if(state===State.PLAYING && !transition) session.weapon.attack(session.stats,sound); },
  interact: () => {
    if(state===State.PLAYING && !transition && session.finds.interact(session))return;
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
  hud.root.hidden = ![State.PLAYING, State.PAUSED, State.MAP, State.DYING].includes(state);
  input.setActive(state === State.PLAYING, state === State.MAP);
  sound.setPlaying([State.PLAYING,State.MAP,State.DYING].includes(state));
}
function toggleMap(){
  if (state === State.MAP) {
    session.plans.canvas.hidden = true;
    sound.paper();
    resume();
    return;
  }
  if(state!==State.PLAYING||transition)return;
  if(!session.finds.maps.has(session.map.index)){session.notice('No tienes el mapa de este piso.');return;}
  session.plans.open(session);
  sound.paper();setState(State.MAP);
}
function changeSetting(key, value) {
  settings[key] = value;
  try {
    localStorage.setItem(saveKey, JSON.stringify(settings));
  } catch {
    /* Session-only options. */
  }
  if (key === 'resolution') {
    engine?.setResolution(value);
    if (state === State.PAUSED) engine.render();
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
    start();
    return;
  }
  if (action === 'options') {
    showOptions(back);
    return;
  }
  if (action === 'credits') {
    menu.open(
      'CREDITS',
      '<p><b>PROFOUNDLY UNSETTLING</b><br>Prototipo de terror psicológico · V0.1</p><p>Motor 3D: Three.js. Escenario, materiales, sonido y diseño de juego creados para este prototipo. Fachada, enfermera articulada y sonido procedurales.</p>' +
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
function start() {
  if (state === State.LOADING) return;
  menu.close();
  transition = null;
  hud.fade.classList.remove('active');
  setState(State.LOADING);
  menu.open('INGRESANDO', '<p>Preparando el pabellón…</p>');
  if (!explicitMute) setSound(true);
  try {
    if (!session) {
      if (!engine) throw new Error('WebGL 2 no disponible');
      session = new Session({ engine, assets, input, hud, sound, settings });
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
  hud.fade.classList.remove('active');
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
  const elapsed=Math.max(0,(now-last)/1000);
  const dt=Math.min(elapsed,.05);
  last = now;
  if (state === State.MENU || state === State.LOADING) menu.render(now / 1000);
  if(state===State.DYING){if(session.death.update(elapsed))gameOver();return;}
  if (state !== State.PLAYING) return;
  if (transition) {
    input.look();
    transition.elapsed += dt;
    if (transition.elapsed >= 0.24 && !transition.loaded) {
      session.useStair();
      transition.loaded = true;
      hud.fade.classList.remove('active');
    }
    if (transition.elapsed >= 0.49) transition = null;
    return;
  }
  session.update(dt,elapsed);
  if(session.stats.health<=0){setState(State.DYING);session.startDeath();}
}
setState(State.MENU);
window.addEventListener('resize', () => {
  if (state === State.PAUSED || state === State.GAME_OVER) engine.render();
});
requestAnimationFrame(frame);
