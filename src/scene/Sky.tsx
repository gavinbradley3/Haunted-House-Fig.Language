import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../systems/time';

/** Direction toward the moon (behind the house, above the roof line as seen from the drive). */
export const MOON_DIR = new THREE.Vector3(-0.32, 0.46, -1).normalize();

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const frag = /* glsl */ `
  uniform vec3 uMoon;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 horizon = vec3(0.055, 0.07, 0.09);
    vec3 zenith = vec3(0.006, 0.009, 0.018);
    vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
    // Moon glow and disc
    float md = dot(d, uMoon);
    col += vec3(0.42, 0.46, 0.55) * pow(max(md, 0.0), 260.0) * 0.6;
    col += vec3(0.16, 0.18, 0.24) * pow(max(md, 0.0), 24.0) * 0.5;
    float disc = smoothstep(0.99955, 0.99968, md);
    float mare = fbm(d.xy * 900.0) * 0.25;
    col = mix(col, vec3(2.4, 2.35, 2.15) * (1.0 - mare), disc);
    // Stars
    vec3 sp = floor(d * 420.0);
    float st = step(0.9975, hash(sp)) * smoothstep(0.05, 0.4, h);
    col += st * vec3(0.9, 0.9, 1.0) * (0.4 + 0.6 * hash(sp + 3.1)) * (0.7 + 0.3 * sin(uTime * 2.0 + hash(sp) * 30.0));
    // Thin drifting cloud
    vec2 cp = d.xz / max(d.y, 0.08) * 0.6 + vec2(uTime * 0.004, 0.0);
    float cl = smoothstep(0.45, 0.85, fbm(cp * 1.5));
    vec3 cloudCol = mix(vec3(0.04, 0.05, 0.065), vec3(0.22, 0.24, 0.3), pow(max(md, 0.0), 6.0));
    col = mix(col, cloudCol, cl * 0.75 * smoothstep(0.02, 0.25, h) * (1.0 - disc * 0.6));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uMoon: { value: MOON_DIR }, uTime: { value: 0 } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useFrame(({ camera }, _dt) => {
    mat.uniforms.uTime.value = world.t;
    void camera;
  });
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[400, 48, 24]} />
    </mesh>
  );
}
