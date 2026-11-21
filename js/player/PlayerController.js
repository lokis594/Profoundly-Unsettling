import THREE from '../core/ThreeRuntime.js';
import { center } from '../world/HospitalMap.js';
export class PlayerController {
  constructor(camera, input, stats) {
    this.camera = camera;
    this.input = input;
    this.stats = stats;
    this.position = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.phase = 0;
    this.bob = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  place(cell, yaw) {
    this.position.copy(center(cell));
    this.yaw = yaw;
    this.pitch = 0;
    this.bob = 0;
    this.phase = 0;
    this.sync(0);
  }
  sync(time) {
    const panic = this.stats.panic && !this.reducedMotion ? 0.005 : 0;
    this.camera.position.copy(this.position);
    this.camera.position.y = 1.62 + this.bob;
    this.camera.rotation.set(
      this.pitch + panic * Math.sin(time * 21),
      this.yaw + panic * Math.sin(time * 17),
      0,
      'YXZ',
    );
  }
  update(dt, time, map, sensitivity) {
    const [mx, my] = this.input.look();
    const speed = (0.002 * sensitivity) / 100;
    this.yaw -=
      mx * speed + this.input.axis('ArrowRight', 'ArrowLeft') * dt * 1.8;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch -
        my * speed +
        this.input.axis('ArrowUp', 'ArrowDown') * dt * 1.3,
      -1.32,
      1.32,
    );
    const forward = this.input.axis('KeyW', 'KeyS'),
      strafe = this.input.axis('KeyD', 'KeyA');
    const length = Math.hypot(forward, strafe);
    const sprint =
      length > 0 &&
      !this.stats.exhausted &&
      (this.input.keys.has('ShiftLeft') || this.input.keys.has('ShiftRight'));
    const stride = (dt * (sprint ? 4.4 : 2.45)) / (length || 1);
    const dx =
      (Math.cos(this.yaw) * strafe - Math.sin(this.yaw) * forward) * stride;
    const dz =
      (-Math.sin(this.yaw) * strafe - Math.cos(this.yaw) * forward) * stride;
    const startX = this.position.x,
      startZ = this.position.z;
    if (map.canStand(startX + dx, startZ)) this.position.x += dx;
    if (map.canStand(this.position.x, startZ + dz)) this.position.z += dz;
    const distance = Math.hypot(
      this.position.x - startX,
      this.position.z - startZ,
    );
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
