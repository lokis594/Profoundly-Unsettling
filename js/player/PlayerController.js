import THREE from '../core/ThreeRuntime.js';
import { center } from '../world/HospitalMap.js';
export class PlayerController {
  constructor(camera, input, stats) {
    this.camera = camera;
    this.input = input;
    this.stats = stats;
    this.position = new THREE.Vector3();
    this.baseYaw = 0;
    this.basePitch = 0;
    this.phase = 0;
    this.bob = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  place(cell, yaw) {
    this.position.copy(center(cell));
    this.baseYaw = yaw;
    this.basePitch = 0;
    this.bob = 0;
    this.punch = 0;
    this.lookDX = this.lookDY = this.moveSpeed = 0;
    this.phase = 0;
    this.sync(0);
  }
  takeHit(time) {
    this.punch = 1;
    this.sync(time);
  }
  sync(time) {
    const panic = this.stats.panic && !this.reducedMotion ? 0.005 : 0;
    this.camera.position.copy(this.position);
    this.camera.position.y = 1.62 + this.bob;
    const kick = this.reducedMotion ? 0 : this.punch;
    const pitchOffset = 0.104 * kick + panic * Math.sin(time * 21);
    const yawOffset = panic * Math.sin(time * 17);
    const rollOffset = kick * (0.078 + 0.033 * Math.sin(time * 47));
    this.camera.rotation.set(this.basePitch + pitchOffset, this.baseYaw + yawOffset, rollOffset, 'YXZ');
  }
  update(dt, time, map, sensitivity) {
    const [mx, my] = this.input.look();
    const speed = (0.002 * sensitivity) / 100;
    this.lookDX = mx * speed + this.input.axis('ArrowRight', 'ArrowLeft') * dt * 1.8;
    this.lookDY = my * speed - this.input.axis('ArrowUp', 'ArrowDown') * dt * 1.3;
    this.baseYaw -= this.lookDX;
    this.basePitch = THREE.MathUtils.clamp(
      this.basePitch - this.lookDY,
      -1.42,
      1.42,
    );
    const forward = this.input.axis('KeyW', 'KeyS'),
      strafe = this.input.axis('KeyD', 'KeyA');
    const length = Math.hypot(forward, strafe);
    const sprint =
      length > 0 &&
      !this.stats.exhausted &&
      (this.input.keys.has('ShiftLeft') || this.input.keys.has('ShiftRight'));
    this.punch = Math.max(0, this.punch - dt * 2.9);
    const stride = dt * (sprint ? 4.4 : 2.45) * (1 - 0.58 * this.punch) / (length || 1);
    const dx =
      (Math.cos(this.baseYaw) * strafe - Math.sin(this.baseYaw) * forward) * stride;
    const dz =
      (-Math.sin(this.baseYaw) * strafe - Math.cos(this.baseYaw) * forward) * stride;
    const startX = this.position.x,
      startZ = this.position.z;
    if (map.canStand(startX + dx, startZ)) this.position.x += dx;
    if (map.canStand(this.position.x, startZ + dz)) this.position.z += dz;
    const distance = Math.hypot(
      this.position.x - startX,
      this.position.z - startZ,
    );
    this.moveSpeed = dt > 0 ? distance / dt : 0;
    const previous = Math.floor(this.phase / Math.PI);
    this.phase += distance * 3.6;
    const target = this.reducedMotion
      ? 0
      : Math.sin(this.phase) * (distance > 0 ? 0.024 : 0);
    this.bob = THREE.MathUtils.damp(this.bob, target, 12, dt);
    this.sync(time);
    return {
      running: sprint && distance > 0.001,
      footstep: Math.floor(this.phase / Math.PI) > previous,
    };
  }
}
