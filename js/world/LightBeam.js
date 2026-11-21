import THREE from '../core/ThreeRuntime.js';
import { bayerDither } from '../core/Engine.js';

export function lightBeam(position, direction, { width, spread, length, color, strength }) {
  const vertices = [];
  const uv = [];
  // Three intersecting ribbons keep the light visible from the side.
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const x = Math.cos(angle), z = Math.sin(angle);
    vertices.push(-x * width, 0, -z * width, x * width, 0, z * width,
      x * spread, length, z * spread, -x * spread, length, -z * spread);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11]);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: new THREE.Color(color) },
      strength: { value: strength },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    vertexShader: /* glsl */ `
      varying vec2 beamUV;
      varying float beamDepth;
      void main() {
        beamUV = uv;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        beamDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 tint;
      uniform float strength;
      varying vec2 beamUV;
      varying float beamDepth;
      ${bayerDither}
      void main() {
        float edge = 1.0 - smoothstep(0.08, 0.5, abs(beamUV.x - 0.5));
        float fade = (1.0 - smoothstep(0.03, 1.0, beamUV.y)) *
          smoothstep(0.2, 0.9, beamDepth) * (1.0 - smoothstep(9.0, 21.0, beamDepth));
        float alpha = floor(edge * fade * strength * 48.0 + bayer4(gl_FragCoord.xy)) / 48.0;
        gl_FragColor = vec4(tint, alpha);
      }
    `,
  });
  const beam = new THREE.Mesh(geometry, material);
  beam.position.copy(position);
  beam.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, direction.normalize());
  return beam;
}
