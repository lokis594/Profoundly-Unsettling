import { Engine } from './Engine.js';
import { AssetManager } from './AssetManager.js';
import { HospitalMap } from '../world/HospitalMap.js';
import { floors } from '../world/floorsData.js';
import { PlayerStats } from '../player/PlayerStats.js';
import { PlayerController } from '../player/PlayerController.js';
import { Flashlight } from '../player/Flashlight.js';
import { spawnEnemy } from '../entities/EnemyBase.js';
import '../entities/NeedleNurse.js';

export class Session {
  static async create(context) {
    const assets = await new AssetManager().load();
    return new Session(context, assets);
  }
  constructor({ canvas, input, hud, sound, settings }, assets) {
    this.settings = settings;
    this.assets = assets;
    this.hud = hud;
    this.sound = sound;
    this.engine = new Engine(canvas, settings.resolution);
    this.map = new HospitalMap(this.engine, assets);
    this.stats = new PlayerStats();
    this.player = new PlayerController(this.engine.camera, input, this.stats);
    this.flash = new Flashlight(this.engine.camera);
    this.stats.onUnrestThreshold(({ active }) => {
      this.hud.panic = active;
    });
  }
  reset() {
    this.stats.reset();
    this.hud.panic = false;
    this.hud.hit = 0;
    this.age = 0;
    this.noise = 0;
    if (!this.flash.on) this.flash.toggle();
    this.loadFloor(1, [4, 7], -Math.PI / 2);
  }
  loadFloor(index, cell, yaw) {
    this.nurse?.dispose();
    this.map.load(index);
    this.nurse = spawnEnemy('needle-nurse', {
      map: this.map,
      assets: this.assets,
    });
    this.player.place(cell, yaw);
    this.map.update(0, this.age, this.player.position);
    this.flash.update(this.age, this.stats.panic);
    this.engine.render();
  }
  useStair() {
    const stair = this.map.stairNear(this.player.position);
    if (!stair) return false;
    const dest = floors[stair.to];
    const arrival = dest.stairs.find((s) => s.to === this.map.index);
    const west = arrival.at[0] < 6;
    this.loadFloor(
      stair.to,
      [arrival.at[0] + (west ? 1 : -1), arrival.at[1]],
      west ? -Math.PI / 2 : Math.PI / 2,
    );
    return true;
  }
  update(dt) {
    this.age += dt;
    const { running, footstep } = this.player.update(
      dt,
      this.age,
      this.map,
      this.settings.sensitivity,
    );
    if (footstep) this.sound.tone(79, 34, 0.12, running ? 0.13 : 0.073);
    this.map.update(dt, this.age, this.player.position);
    this.flash.update(this.age, this.stats.panic);
    const danger = this.nurse.update(dt, this.player, this.flash, (damage) => {
      this.stats.damage(damage);
      this.hud.hit = 0.78;
      this.sound.tone(158, 33, 0.36, 0.16, 'triangle');
    });
    this.noise -= dt;
    if (danger.near && this.noise <= 0) {
      this.sound.tone(
        477,
        227,
        0.28,
        Math.max(0.015, 0.08 - danger.dist * 0.006),
        'triangle',
      );
      this.noise = danger.chased ? 1.25 : 2.4;
    }
    const room = this.map.room(this.player.position),
      stair = this.map.stairNear(this.player.position);
    this.stats.update(dt, {
      running,
      dark: !this.flash.on,
      ...danger,
      oppressive: this.map.floor.oppressive.includes(room),
    });
    this.hud.update(dt, this.age, this.stats, {
      room,
      floor: this.map.floor.id,
      light: this.flash.on,
      prompt: stair
        ? '[E] ' +
          (stair.to > this.map.index ? 'Subir a ' : 'Bajar a ') +
          floors[stair.to].name
        : '',
      hint:
        this.age < 8
          ? 'WASD mover · Ratón o flechas mirar · Shift correr · F linterna · E usar · Esc pausa'
          : '',
    });
    this.engine.render();
  }
}
