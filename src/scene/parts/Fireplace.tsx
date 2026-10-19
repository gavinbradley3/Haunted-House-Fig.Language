import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boxGeo, latheGeo, LATHES } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { world } from '../../systems/time';
import { lampLevel } from './Lights';
import { ArtPainting } from './Artwork';

/**
 * The Entrance Hall fire, built to stay cheap on integrated graphics:
 *  - a real recess behind the arched cast-iron insert (splayed cheeks, a firebrick back, a throat),
 *    so the fire sits inside the chimney breast instead of in front of a painted arch;
 *  - three charred logs whose cracks glow and breathe (one unlit shader, one draw call);
 *  - flames as six crossed sheets of scrolling, domain-warped noise (one shader, one draw call,
 *    additive, no depth writes): the silhouettes tear, lick and detach instead of looping a sprite;
 *  - a handful of embers rising and fading (points computed on the GPU, one draw call);
 *  - the hall's existing fire light, now driven by the same irregular "fire level" as the flames,
 *    so the light on the walls rises and falls with what you see. No new lights, no shadows.
 */

/** Smooth 1D value noise in [0, 1]. */
function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** How strongly the fire is burning right now (about 0.6 to 1.1): never a regular cycle. */
export const fireState = { level: 1 };
function fireLevel(t: number) {
  const slow = noise1(t * 0.35) * 0.22 + noise1(t * 1.1 + 40) * 0.16;
  const fast = noise1(t * 6.3 + 90) * 0.08 + noise1(t * 13.7 + 7) * 0.04;
  // Now and then a log settles and the fire flares, then sinks back.
  const flare = Math.max(0, noise1(t * 0.18 + 200) - 0.72) * 1.1;
  return 0.6 + slow + fast + flare;
}

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.55;
    for (int k = 0; k < 4; k++) { v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
`;

function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      varying vec2 vUv;
      varying float vSeed;
      void main() {
        vUv = uv;
        vSeed = seed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLevel;
      varying vec2 vUv;
      varying float vSeed;
      ${NOISE_GLSL}
      void main() {
        float t = uTime * (1.0 + vSeed * 0.35);
        float x = vUv.x * 2.0 - 1.0;
        float y = vUv.y;
        // Domain warp: the whole sheet sways and tears differently on every sheet.
        float w = fbm(vec2(vUv.x * 1.6 + vSeed * 11.0, y * 1.3 - t * 0.9));
        float n = fbm(vec2(vUv.x * 3.1 + w * 1.4 + vSeed * 5.0, y * 2.6 - t * 2.1));
        float lean = (w - 0.5) * 0.9 * y;
        float width = mix(0.95, 0.12, pow(y, 0.75)) * (0.75 + 0.5 * n);
        float body = 1.0 - smoothstep(0.35, 1.0, abs(x + lean) / max(width, 0.05));
        // Ragged tops, and tongues that break off and vanish as they rise.
        float reach = 0.55 + 0.4 * uLevel + (n - 0.5) * 0.5;
        float tips = 1.0 - smoothstep(reach - 0.35, reach, y);
        float licks = smoothstep(0.32, 0.62, n + 0.38 - y * 0.45);
        float base = smoothstep(0.04, 0.3, y);
        float a = body * tips * licks * base;
        float heat = clamp(a * (1.15 - y * 0.95), 0.0, 1.0);
        vec3 col = mix(vec3(0.45, 0.07, 0.015), vec3(1.0, 0.36, 0.06), smoothstep(0.08, 0.45, heat));
        col = mix(col, vec3(1.0, 0.72, 0.36), smoothstep(0.55, 0.95, heat));
        gl_FragColor = vec4(col * a * (0.75 + 0.5 * uLevel), 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
}

function logMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vN;
      varying float vUp;
      void main() {
        vPos = position;
        vN = normalize(normalMatrix * normal);
        vUp = normalize(mat3(modelMatrix) * normal).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLevel;
      varying vec3 vPos;
      varying vec3 vN;
      varying float vUp;
      ${NOISE_GLSL}
      void main() {
        // Bark grain runs along the log (its local y axis).
        float grain = fbm(vec2(atan(vPos.x, vPos.z) * 2.5, vPos.y * 9.0));
        float scales = vnoise(vec2(atan(vPos.x, vPos.z) * 7.0, vPos.y * 26.0));
        vec3 charred = mix(vec3(0.012, 0.009, 0.008), vec3(0.05, 0.032, 0.022), grain * 0.8 + scales * 0.2);
        // Cracks glow from underneath, where the fire is, and breathe slowly.
        float crack = smoothstep(0.62, 0.78, fbm(vec2(atan(vPos.x, vPos.z) * 3.0, vPos.y * 14.0) + 0.1 * sin(uTime * 0.7)));
        float under = smoothstep(0.4, -0.6, vUp);
        float pulse = 0.7 + 0.3 * vnoise(vec2(vPos.y * 6.0, uTime * 0.9));
        vec3 glow = vec3(1.0, 0.32, 0.06) * crack * (0.35 + under * 1.2) * pulse * uLevel;
        // Fire-lit from below and in front; the tops stay dark.
        float lit = (0.3 + 0.7 * under) * uLevel;
        gl_FragColor = vec4(charred * (0.5 + lit) + glow * 1.4, 1.0);
      }`,
    fog: false,
  });
}

function emberMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 1 }, uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uLevel;
      uniform float uScale;
      attribute vec3 seed;
      varying float vLife;
      void main() {
        float life = fract(uTime * seed.z + seed.y);
        vLife = life;
        vec3 p = position;
        p.y += life * (0.42 + 0.25 * uLevel);
        p.x += sin(life * 7.0 + seed.y * 20.0) * 0.035 + seed.x * life * 0.08;
        p.z += cos(life * 5.0 + seed.y * 13.0) * 0.02;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.0 - life) * 0.012 * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (1.0 - vLife) * smoothstep(0.0, 0.08, vLife);
        gl_FragColor = vec4(vec3(1.0, 0.45, 0.12) * a * 1.6, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
}

/** Six flame sheets in one geometry, each with its own seed so no two move alike. */
function flameGeometry() {
  const sheets: [number, number, number, number, number][] = [
    // x, z, yaw, width, height
    [-0.12, 0.02, 0.35, 0.34, 0.5],
    [0.1, 0.0, -0.4, 0.36, 0.56],
    [0.0, -0.02, 0.05, 0.42, 0.62],
    [-0.05, 0.04, -1.2, 0.3, 0.46],
    [0.16, 0.03, 1.1, 0.26, 0.4],
    [-0.19, -0.01, -0.15, 0.24, 0.36],
  ];
  const parts = sheets.map(([x, z, yaw, w, h], i) => {
    const g = new THREE.PlaneGeometry(w, h, 1, 1);
    g.translate(0, h / 2, 0);
    g.rotateY(yaw);
    g.translate(x, 0, z);
    const seed = new Float32Array(4).fill(i * 0.37 + 0.11);
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    return g;
  });
  const pos: number[] = [];
  const uv: number[] = [];
  const seed: number[] = [];
  const index: number[] = [];
  let base = 0;
  for (const g of parts) {
    pos.push(...(g.attributes.position.array as Float32Array));
    uv.push(...(g.attributes.uv.array as Float32Array));
    seed.push(...(g.attributes.seed.array as Float32Array));
    index.push(...Array.from(g.index!.array, (v) => v + base));
    base += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  out.setIndex(index);
  return out;
}

/** Three split logs with irregular, knotted surfaces, merged into one geometry. */
function logGeometry() {
  const logs: [number, number, number, number, number, number, number][] = [
    // x, y, z, length, radius, rotY, rotZ (local: log along y)
    [0, 0.205, 0.045, 0.5, 0.055, 0.15, Math.PI / 2],
    [0.02, 0.21, -0.05, 0.46, 0.05, -0.12, Math.PI / 2 + 0.05],
    [-0.04, 0.29, 0.0, 0.42, 0.045, 0.55, Math.PI / 2 - 0.18],
  ];
  const geos = logs.map(([x, y, z, len, r, ry, rz], k) => {
    const g = new THREE.CylinderGeometry(r, r * 0.92, len, 11, 6, false);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const ang = Math.atan2(vx, vz);
      const bump = 1 + 0.12 * (noise1(ang * 2 + vy * 9 + k * 5) - 0.5) + 0.08 * (noise1(vy * 23 + k) - 0.5);
      p.setXYZ(i, vx * bump, vy, vz * bump);
    }
    g.computeVertexNormals();
    g.rotateZ(rz);
    g.rotateY(ry);
    g.translate(x, y, z);
    return g;
  });
  const merged = new THREE.BufferGeometry();
  const pos: number[] = [];
  const nor: number[] = [];
  const index: number[] = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...(g.attributes.position.array as Float32Array));
    nor.push(...(g.attributes.normal.array as Float32Array));
    index.push(...Array.from(g.index!.array, (v) => v + base));
    base += g.attributes.position.count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  merged.setIndex(index);
  return merged;
}

function emberGeometry(n = 22) {
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = noise1(i * 3.1) - 0.5;
    pos.set([a * 0.36, 0.26, (noise1(i * 7.7 + 3) - 0.5) * 0.14], i * 3);
    seed.set([noise1(i * 1.9 + 11) - 0.5, noise1(i * 5.3 + 1), 0.22 + noise1(i * 2.7 + 19) * 0.3], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
  return g;
}

/**
 * Marble fireplace on a chimney breast, local wall frame (centred at x).
 * The chimney breast projects 0.35 m from the wall and rises to the ceiling; the firebox is recessed into it.
 */
export function Fireplace({ x, ceiling }: { x: number; ceiling: number }) {
  const m = mats();
  const breast = 0.35;
  const urn = latheGeo('urn', LATHES.urn);
  const fire = useMemo(() => {
    const flames = flameMaterial();
    const logs = logMaterial();
    const embers = emberMaterial();
    const coal = m.ember.clone();
    coal.emissive.set('#d8400e');
    const brick = m.brick.clone();
    brick.color.set('#3b2b24');
    return { flames, logs, embers, coal, brick, flameGeo: flameGeometry(), logGeo: logGeometry(), emberGeo: emberGeometry() };
  }, [m]);
  const coals = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 30; i++) out.push([(noise1(i * 4.3) - 0.5) * 0.44, 0.16 + noise1(i * 2.2 + 8) * 0.04, (noise1(i * 6.1 + 2) - 0.5) * 0.18, 0.018 + noise1(i * 9.4) * 0.022]);
    return out;
  }, []);
  useFrame(({ size, viewport }) => {
    const level = fireLevel(world.t) * lampLevel(world.t, 3);
    fireState.level = level;
    for (const mat of [fire.flames, fire.logs, fire.embers]) {
      mat.uniforms.uTime.value = world.t;
      mat.uniforms.uLevel.value = level;
    }
    fire.embers.uniforms.uScale.value = size.height * viewport.dpr * 0.9;
    fire.coal.emissiveIntensity = 0.35 + level * 0.75;
  });
  // The opening in the breast (where the cast-iron insert sits) and the recess behind it.
  const open = { w: 1.16, h: 1.11 };
  const sideW = (2.3 - open.w) / 2;
  return (
    <group position={[x, 0, 0]}>
      {/* Chimney breast, built around the fire opening */}
      <mesh geometry={boxGeo(2.3, ceiling - open.h, breast)} material={m.wallHall} position={[0, (ceiling + open.h) / 2, breast / 2]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={boxGeo(sideW, open.h, breast)} material={m.wallHall} position={[s * (open.w / 2 + sideW / 2), open.h / 2, breast / 2]} receiveShadow />
      ))}
      {/* Firebox: firebrick back, splayed iron cheeks, a sloping throat, soot everywhere */}
      <group position={[0, 0, 0]}>
        <mesh geometry={boxGeo(0.52, 0.8, 0.04)} material={fire.brick} position={[0, 0.45, 0.06]} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={boxGeo(0.03, 0.82, 0.28)} material={m.soot} position={[s * 0.3, 0.46, 0.19]} rotation={[0, s * 0.33, 0]} />
        ))}
        <mesh geometry={boxGeo(0.72, 0.03, 0.32)} material={m.soot} position={[0, 0.86, 0.2]} rotation={[0.45, 0, 0]} />
        <mesh geometry={boxGeo(0.74, 0.04, 0.34)} material={m.soot} position={[0, 0.03, 0.2]} />
      </group>
      <group position={[0, 0, breast]}>
        {/* Hearth slab */}
        <mesh geometry={boxGeo(2.1, 0.05, 0.55)} material={m.marbleDark} position={[0, 0.025, 0.27]} receiveShadow castShadow />
        {/* Pilasters */}
        {[-0.72, 0.72].map((px) => (
          <group key={px}>
            <mesh geometry={boxGeo(0.28, 1.12, 0.17)} material={m.marbleDark} position={[px, 0.56 + 0.05, 0.085]} castShadow receiveShadow />
            <mesh geometry={boxGeo(0.32, 0.1, 0.2)} material={m.marbleDark} position={[px, 0.1, 0.1]} castShadow />
            <mesh geometry={boxGeo(0.32, 0.06, 0.21)} material={m.marbleDark} position={[px, 1.1, 0.105]} castShadow />
          </group>
        ))}
        {/* Frieze and mantel shelf */}
        <mesh geometry={boxGeo(1.72, 0.26, 0.15, 'x')} material={m.marbleDark} position={[0, 1.25, 0.075]} castShadow />
        <mesh geometry={boxGeo(1.98, 0.055, 0.3, 'x')} material={m.marbleDark} position={[0, 1.41, 0.14]} castShadow receiveShadow />
        <mesh geometry={boxGeo(1.9, 0.03, 0.27, 'x')} material={m.marbleDark} position={[0, 1.37, 0.13]} />
        {/* Cast-iron insert with the arched opening cut through it */}
        <mesh material={m.iron} position={[0, 0.58, 0.02]}>
          <shapeGeometry args={[insertShape(1.16, 1.06, 0.36, 0.78, 0.5 - 0.58)]} />
        </mesh>
        {/* Basket grate in the mouth of the arch: logs, embers, flames */}
        <group position={[0, 0.05, -0.12]}>
          <mesh geometry={boxGeo(0.56, 0.02, 0.22)} material={m.iron} position={[0, 0.14, 0]} />
          {[-0.25, -0.125, 0, 0.125, 0.25].map((gx) => (
            <mesh key={gx} geometry={boxGeo(0.015, 0.16, 0.015)} material={m.iron} position={[gx, 0.22, 0.11]} />
          ))}
          <mesh geometry={boxGeo(0.56, 0.015, 0.015)} material={m.iron} position={[0, 0.29, 0.11]} />
          {[-0.25, 0.25].map((gx) => (
            <mesh key={gx} geometry={boxGeo(0.03, 0.18, 0.03)} material={m.iron} position={[gx, 0.07, 0.1]} />
          ))}
          {coals.map(([cx, cy, cz, r], i) => (
            <mesh key={i} material={i % 4 === 0 ? m.soot : fire.coal} position={[cx, cy, cz]} rotation={[i, i * 2, 0]}>
              <dodecahedronGeometry args={[r, 0]} />
            </mesh>
          ))}
          <mesh geometry={fire.logGeo} material={fire.logs} />
          <mesh geometry={fire.flameGeo} material={fire.flames} position={[0, 0.15, -0.01]} renderOrder={2} />
          <points geometry={fire.emberGeo} material={fire.embers} renderOrder={3} />
        </group>
        {/* Fender */}
        <mesh geometry={boxGeo(1.3, 0.07, 0.02)} material={m.brass} position={[0, 0.09, 0.42]} castShadow />
        {[-0.65, 0.65].map((fx) => (
          <mesh key={fx} geometry={boxGeo(0.02, 0.07, 0.36)} material={m.brass} position={[fx, 0.09, 0.25]} />
        ))}
        {/* Mantel garniture */}
        <group position={[0, 1.44, 0.15]}>
          <mesh geometry={urn} material={m.ceramic} position={[-0.7, 0, 0]} castShadow />
          <mesh geometry={urn} material={m.ceramic} position={[0.7, 0, 0]} castShadow />
          <mesh geometry={latheGeo('candlestick', LATHES.candlestick)} material={m.brass} position={[-0.38, 0, 0]} castShadow />
          <mesh geometry={latheGeo('candlestick', LATHES.candlestick)} material={m.brass} position={[0.38, 0, 0]} castShadow />
        </group>
        {/* Overmantel portrait */}
        <ArtPainting id="ladyOfHouse" x={0} y={2.6} width={0.95} frame="ornateFrame" />
      </group>
    </group>
  );
}

/**
 * The hall's fire light (the same light as before, in the same place), following the fire's level
 * so the glow on the walls and floor rises and sinks with the flames. It drifts a few centimetres,
 * as firelight does. No shadows.
 */
export function FireLight({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    const l = fireState.level;
    ref.current.intensity = intensity * (0.45 + 0.55 * l);
    ref.current.position.set(position[0] + (noise1(world.t * 2.3) - 0.5) * 0.05, position[1] + (noise1(world.t * 1.7 + 30) - 0.5) * 0.06, position[2] + (noise1(world.t * 2.9 + 60) - 0.5) * 0.05);
  });
  return <pointLight ref={ref} position={position} intensity={intensity} distance={8} decay={2} color="#ff7a32" />;
}

/** A rectangle with an arched hole (the fire opening), centred on the origin. */
function insertShape(w: number, h: number, halfW: number, archH: number, holeY: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();
  const hole = new THREE.Path();
  const b = holeY - archH / 2 + 0.05;
  hole.moveTo(-halfW, b);
  hole.lineTo(-halfW, holeY + archH / 2 - halfW);
  hole.absarc(0, holeY + archH / 2 - halfW, halfW, Math.PI, 0, true);
  hole.lineTo(halfW, b);
  hole.closePath();
  s.holes.push(hole);
  return s;
}
