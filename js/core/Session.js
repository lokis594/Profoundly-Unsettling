import { HospitalMap } from '../world/HospitalMap.js';
import { floors, sides } from '../world/floorsData.js';
import { PlayerStats } from '../player/PlayerStats.js';
import { PlayerController } from '../player/PlayerController.js';
import { Flashlight } from '../player/Flashlight.js';
import { spawnEnemy } from '../entities/EnemyBase.js';
import '../entities/NeedleNurse.js';

import { Crowbar } from '../player/Crowbar.js';
import { Stillness } from '../entities/Stillness.js';
import { Findables } from '../world/Findables.js';
import { MapSystem } from '../ui/MapSystem.js';
import { Trauma } from '../ui/Trauma.js';
import { DeathScene } from '../entities/DeathScene.js';

export class Session {
  constructor({ engine, assets, input, hud, sound, settings }) {
    this.settings = settings;
    this.assets = assets;
    this.hud = hud;
    this.sound = sound;
    this.engine = engine;
    this.map = new HospitalMap(this.engine, assets);
    this.stats = new PlayerStats();
    this.player = new PlayerController(this.engine.camera, input, this.stats);
    this.flash = new Flashlight(this.engine, assets.textures);
    this.weapon=new Crowbar(this.flash.view);
    this.finds=new Findables(this.map);
    this.plans=new MapSystem(hud);
    this.trauma = new Trauma(hud.wound);
    this.stillness=new Stillness(this.map);
    this.stats.onUnrestThreshold(({ active }) => {
      this.hud.panic = active;
    });
  }
  reset() {
    this.stats.reset();
    this.hud.panic = false;
    this.death?.dispose();
    this.death=null;
    this.clearedFloors=new Set();
    this.weapon.reset();
    this.finds.reset();
    this.plans.reset();
    this.trauma.clear();
    this.messageUntil=0;
    this.recovering=false;
    this.age = 0;
    if (!this.flash.on) this.flash.toggle();
    this.loadFloor(1, floors[1].start, floors[1].yaw);
  }
  loadFloor(index, cell, yaw) {
    this.nurse?.dispose();
    this.map.load(index);
    this.sound.setFloor(index);
    this.nurse = spawnEnemy('needle-nurse', {
      map: this.map,
      assets: this.assets,
      sound: this.sound,
    });
    if(this.clearedFloors.has(index)){
      this.nurse.health=0;
      this.nurse.setState('DEAD');
      this.nurse.elapsed=1;
      this.nurse.visual.visible=false;
    }
    this.player.place(cell, yaw);
    this.finds.load();
    this.stillness.reset(this.map,this.player.position);
    this.weapon.swing=0;
    this.map.update(this.age, this.player.position);
    this.flash.update(0, this.age, this.stats.panic, this.player);
    this.engine.render();
  }
  useStair() {
    const stair = this.map.stairNear(this.player.position);
    if (!stair) return false;
    const dest = floors[stair.to];
    const arrival = dest.stairs.find((s) => s.link === stair.link && s.to === this.map.index);
    const [dx, dz] = sides[arrival.side];
    this.loadFloor(stair.to, [arrival.at[0] - dx, arrival.at[1] - dz], Math.atan2(dx, dz));
    return true;
  }
  notice(message){
    this.message=message;this.messageUntil=this.age+3;
    this.hud.hint.textContent=message;
  }
  startDeath(){this.death=new DeathScene(this);}
  update(dt,elapsed=dt) {
    this.age += dt;
    const { running, footstep } = this.player.update(
      dt,
      this.age,
      this.map,
      this.settings.sensitivity,
    );
    if (footstep) this.sound.step(running);
    this.map.update(this.age, this.player.position);
    this.finds.update(dt);
    this.weapon.update(dt,this);
    const haunted = this.stillness.update(elapsed,this);
    this.plans.visit(this.map,this.player);
    const danger = this.nurse.update(dt, this.player, this.flash, (damage) => {
      this.stats.damage(damage);
      this.trauma.damage(this.stats.health);
      this.player.takeHit(this.age);
    });
    const room = this.map.room(this.player.position),
      stair = this.map.stairNear(this.player.position);
    this.stats.update(dt, {
      recovering:this.recovering,
      haunted,
      running,
      dark: !this.flash.on,
      ...danger,
      oppressive: this.map.floor.oppressive.includes(room),
    });
    if(this.recovering && !danger.near){
      this.breathIn-=dt;
      if(this.stats.unrest<=0){this.recovering=false;this.sound.breath(0,true);}
      else if(this.breathIn<=0){
        const stress=this.stats.unrest/100;
        this.sound.breath(stress);this.breathIn=1.7-stress*.86;
      }
    }
    this.flash.update(dt, this.age, this.stats.panic, this.player);
    this.sound.update(this.stats.unrest, this.map.electrical, danger);
    this.hud.update(elapsed, this.age, this.stats, {
      room,
      floor: this.map.floor.id,
      light: this.flash.on,
      prompt: this.finds.prompt(this.finds.nearby(this.player)) || (stair
        ? '[E] ' +
          (stair.to > this.map.index ? 'Subir a ' : 'Bajar a ') +
          floors[stair.to].name
        : ''),
      hint: this.age<this.messageUntil ? this.message :
        this.age < 8
          ? 'WASD mover · Ratón o flechas mirar · Shift correr · F linterna · E usar · M mapa · Esc pausa'
          : '',
    });
    this.trauma.update(elapsed);
    this.engine.render();
  }
}
