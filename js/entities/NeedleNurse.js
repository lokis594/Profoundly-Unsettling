import THREE from '../core/ThreeRuntime.js';
import { EnemyBase, registerEnemy } from './EnemyBase.js';
import { NurseRig } from './NurseRig.js';
import { center, cellOf } from '../world/HospitalMap.js';

export class NeedleNurse extends EnemyBase {
  constructor({ map, assets, sound }) {
    super({ map });
    this.sound = sound;
    this.floorIndex = map.index;
    this.patrol = map.floor.patrol;
    this.index = 1;
    this.position = center(this.patrol[0]);
    this.health=100;
    this.rig = new NurseRig(assets.textures);
    this.visual = this.rig.root;
    this.visual.position.copy(this.position);
    map.group.add(this.visual);
    this.lastPosition = this.position.clone();
    this.look = new THREE.Vector3();
    this.aim = new THREE.Vector3();
    this.lastSeen = this.patrol[0];
    this.lost = 0;
    this.clock = 0;
    this.stride = 0;
    this.gait = 0;
    this.twitch = 0;
    this.nextTwitch = 0.8;
    this.contactTime = 0.48;
    this.hitDelivered = false;
    this.hitParts=[];
    this.visual.traverse(piece=>{
      if(!piece.isMesh || piece.parent.name==='aguja') return;
      piece.userData.hitZone=piece.parent===this.rig.head?'head':piece.parent===this.rig.spine?'chest':'limb';
      this.hitParts.push(piece);
    });
    this.chips=Array.from({length:9},()=>{
      const mesh=new THREE.Mesh(this.rig.geometries.box,this.rig.materials.stain);
      mesh.scale.setScalar(.025);mesh.visible=false;map.group.add(mesh);
      return mesh;
    });
    this.splatterTime=0;
  }
  strike(zone,point){
    if(!this.health)return;
    this.health=Math.max(0,this.health-({head:40,chest:20,limb:10}[zone]));
    this.sound.nurseImpact();
    if(zone==='head')this.sound.burst(.095,215,1.7,.92);
    this.sound.cry(!this.health);
    this.splatterTime=.22;
    this.chips.forEach(mesh=>{mesh.position.copy(point);mesh.visible=true;});
    if(this.health)this.playDamageAnimation();
    else this.setState('DEAD');
  }
  dispose() { this.rig.dispose(); }
  playDamageAnimation() {
    this.setState('HURT');
    this.elapsed = 0;
  }
  update(dt, player, torch, onHit) {
    if (this.floorIndex !== this.map.index) return {near:false, chased:false, dist:Infinity, sight:false};
    if(this.splatterTime>0){
      this.splatterTime-=dt;
      this.chips.forEach((mesh,i)=>{
        mesh.position.x+=Math.sin(i*9)*dt;
        mesh.position.z+=Math.cos(i*7)*dt;
        mesh.position.y+=(this.splatterTime*8-.9)*dt;
        mesh.visible=this.splatterTime>0;
      });
    }
    if(!this.health){
      this.elapsed+=dt;
      const fall=THREE.MathUtils.smoothstep(this.elapsed,0,.71);
      this.visual.rotation.x=-1.54*fall;
      this.visual.position.y=.18*fall;
      return {near:false,chased:false,dist:Infinity,sight:false};
    }
    this.lastPosition.copy(this.position);
    this.clock += dt;
    this.elapsed += dt;
    const dist = this.position.distanceTo(player.position);
    const sight = dist < 15 && this.map.clearSight(this.position, player.position);
    player.camera.getWorldDirection(this.look);
    this.aim.copy(this.position).sub(player.position).normalize();
    const lit = torch.on && dist < 13 && this.look.dot(this.aim) > 0.78;
    const detects = sight && (dist < 6.7 || lit || (this.state === 'CHASE' && dist < 13.5));
    if (detects) {
      this.lastSeen = cellOf(player.position);
      this.lost = 0;
    } else this.lost += dt;

    switch (this.state) {
      case 'PATROL':
        if (detects) this.setState('ALERT');
        else if (this.navigate(dt, this.patrol[this.index], 1.02)) {
          this.index = (this.index + 1) % this.patrol.length;
          this.setState('IDLE');
        }
        break;
      case 'IDLE':
        if (detects) this.setState('ALERT');
        else if (this.elapsed > 1.45) this.setState('PATROL');
        break;
      case 'ALERT':
        if (this.elapsed > 0.82) this.setState(this.lost > 2 ? 'PATROL' : 'CHASE');
        break;
      case 'CHASE':
        if (sight && dist < 1.35) {
          this.hitDelivered = false;
          this.setState('ATTACK');
        } else if (this.lost > 4.5) this.setState('PATROL');
        else if (sight && dist < 3.8 && this.advance(-Math.min(2.25 * dt, dist - 1))) this.goal = '';
        else this.navigate(dt, this.lastSeen, 2.25);
        break;
      case 'ATTACK':
        if (!sight || dist > 1.75) this.setState('CHASE');
        else if (!this.hitDelivered && this.elapsed >= this.contactTime) {
          this.hitDelivered = true;
          this.sound.nurseImpact();
          onHit(18);
        } else if (this.elapsed >= 1.46) this.setState('CHASE');
        break;
      case 'HURT':
        if (this.elapsed < 0.17) this.advance(dt * 1.4);
        if (this.elapsed >= 0.48) this.setState(detects ? 'CHASE' : 'PATROL');
        break;
    }
    this.animate(dt, dist, sight);
    return { near: detects,
      chased: detects && (this.state === 'CHASE' || this.state === 'ATTACK'), dist, sight };
  }
  advance(step) {
    const x = this.position.x + this.aim.x * step, z = this.position.z + this.aim.z * step;
    if (!this.map.canStand(x, z, 0.23)) return false;
    this.position.set(x, 0, z);
    return true;
  }
  animate(dt, distance, sight) {
    const dx = this.position.x - this.lastPosition.x, dz = this.position.z - this.lastPosition.z;
    const moving = this.state === 'PATROL' || this.state === 'CHASE';
    const travel = moving ? Math.hypot(dx, dz) : 0;
    this.gait = THREE.MathUtils.damp(this.gait, travel > 0.0001 ? 1 : 0, 14, dt);
    const foot = Math.floor(this.stride / Math.PI);
    this.stride += travel * 4.65;
    const nextFoot = Math.floor(this.stride / Math.PI);
    if (foot !== nextFoot) this.sound.nurseStep(distance, nextFoot % 2 === 0, sight);
    const yawToPlayer = Math.atan2(-this.aim.x, -this.aim.z);
    const tracking = ['ALERT', 'ATTACK', 'CHASE'].includes(this.state) && sight;
    const error = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    if (travel > 0.0001 || tracking) {
      const yaw = tracking ? yawToPlayer : Math.atan2(dx, dz);
      this.visual.rotation.y += error(yaw - this.visual.rotation.y) * Math.min(1, dt * 6.2);
    }
    if (this.clock > this.nextTwitch) {
      this.twitch = Math.random() < 0.5 ? -1 : 1;
      this.nextTwitch = this.clock + 0.21 + Math.random() ** 1.5 * 3;
    } else this.twitch *= Math.exp(-dt * 18);
    this.visual.position.copy(this.position);
    const headYaw = tracking ? THREE.MathUtils.clamp(error(yawToPlayer - this.visual.rotation.y), -1.32, 1.32) : 0;
    this.rig.pose(this, headYaw);
  }
}
registerEnemy('needle-nurse', NeedleNurse);
