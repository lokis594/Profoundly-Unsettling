import THREE from '../core/ThreeRuntime.js';
import { EnemyBase, registerEnemy } from './EnemyBase.js';
import { center, cellOf } from '../world/HospitalMap.js';
export class NeedleNurse extends EnemyBase {
  constructor(context) {
    super(context);
    this.patrol = this.map.floor.patrol;
    this.index = 1;
    this.position = center(this.patrol[0]);
    this.elapsed = 0;
    this.lost = 0;
    this.cooldown = 0;
    this.clock = 0;
    this.lastSeen = this.patrol[0];
    this.mat = new THREE.SpriteMaterial({
      map: context.assets.textures.nurse,
      color: 0xd0cdb8,
      alphaTest: 0.33,
      fog: true,
    });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.set(1.46, 2.19, 1);
    this.sprite.position.copy(this.position);
    this.model = context.assets.nurseModel?.clone();
    this.visual = this.model || this.sprite;
    this.visual.position.copy(this.position);
    this.map.group.add(this.visual);
    this.lastPosition = this.position.clone();
    this.look = new THREE.Vector3();
    this.aim = new THREE.Vector3();
  }
  dispose() {
    this.visual.removeFromParent();
    this.mat.dispose();
  }
  update(dt, player, torch, onHit) {
    this.lastPosition.copy(this.position);
    this.clock += dt;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const dist = this.position.distanceTo(player.position);
    const sight =
      dist < 15 && this.map.clearSight(this.position, player.position);
    player.camera.getWorldDirection(this.look);
    this.aim.copy(this.position).sub(player.position).normalize();
    const lit =
      torch.on && sight && dist < 13 && this.look.dot(this.aim) > 0.78;
    const detects =
      sight && (dist < 6.7 || lit || (this.state === 'CHASE' && dist < 13.5));
    if (detects) {
      this.lastSeen = cellOf(player.position);
      this.lost = 0;
    } else this.lost += dt;
    switch (this.state) {
      case 'PATROL':
        if (detects) this.setState('ALERT');
        else if (this.navigate(dt, this.patrol[this.index], 1.02))
          this.index = (this.index + 1) % this.patrol.length;
        break;
      case 'ALERT':
        if (this.elapsed > 0.9)
          this.setState(this.lost > 2 ? 'PATROL' : 'CHASE');
        break;
      case 'CHASE':
        if (sight && dist < 1.35) {
          this.setState('ATTACK');
          break;
        }
        if (this.lost > 4.5) {
          this.setState('PATROL');
          break;
        }
        if (sight && dist < 3.8) {
          const speed = Math.min(2.25 * dt, Math.max(0, dist - 1));
          const x = this.position.x - this.aim.x * speed,
            z = this.position.z - this.aim.z * speed;
          if (this.map.canStand(x, z, 0.16)) {
            this.position.set(x, 0, z);
            this.goal = '';
            break;
          }
        }
        this.navigate(dt, this.lastSeen, 2.25);
        break;
      case 'ATTACK':
        if (!sight || dist > 1.75) {
          this.setState('CHASE');
          break;
        }
        if (this.elapsed > 0.38 && this.cooldown <= 0) {
          onHit(18);
          this.cooldown = 1.48;
        }
        break;
    }
    if (this.model) {
      const direction =
        this.state === 'PATROL'
          ? this.position.clone().sub(this.lastPosition)
          : this.aim.clone().negate();
      if (direction.lengthSq() > 0.000001) {
        const desired = Math.atan2(direction.x, direction.z);
        const diff = desired - this.model.rotation.y;
        this.model.rotation.y +=
          Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 5);
      }
    }
    this.visual.position.copy(this.position);
    this.visual.position.y =
      0.02 +
      0.027 * Math.abs(Math.sin(this.clock * (this.state === 'CHASE' ? 8 : 3)));
    this.mat.rotation =
      this.state === 'ALERT'
        ? 0.055 * Math.min(this.elapsed * 2, 1)
        : 0.012 * Math.sin(this.clock * 2);
    return {
      near: dist < 5.5 || (sight && dist < 9),
      chased: this.state === 'CHASE' || this.state === 'ATTACK',
      dist,
    };
  }
}
registerEnemy('needle-nurse', NeedleNurse);
