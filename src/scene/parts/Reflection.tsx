/**
 * Planar reflections shared by every mirror on one wall.
 *
 * Mirrors on the same wall lie in the same plane, so one reflected render per
 * wall serves all of them. Opposite walls sample each other's previous frame,
 * which produces the receding "mirror in a mirror" effect for free.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { foxing } from '../../systems/textures';
import { world } from '../../systems/time';
import type { MirrorFx } from '../../lesson/fx';
import { useGame } from '../../state/store';

const QUALITY_REFLECT = { high: 0.5, balanced: 0.35, low: 0.25 };
/**
 * On Balanced and Low the walls take turns: each wall's reflection is redrawn every other frame.
 * The reflected render is a whole second view of the room, so this halves the mirror room's extra cost.
 */
const QUALITY_ALTERNATE = { high: false, balanced: true, low: true };
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();
const sphere = new THREE.Sphere();

interface PlaneCtx {
  texture: THREE.Texture;
  textureMatrix: THREE.Matrix4;
  members: Set<THREE.Object3D>;
}
const Ctx = createContext<PlaneCtx | null>(null);

const vNormal = new THREE.Vector3();
const vPos = new THREE.Vector3();
const vCam = new THREE.Vector3();
const vView = new THREE.Vector3();
const vLook = new THREE.Vector3();
const vTarget = new THREE.Vector3();
const rot = new THREE.Matrix4();
const plane = new THREE.Plane();
const clip = new THREE.Vector4();
const q = new THREE.Vector4();

/**
 * A reflective plane. `point` and `normal` are world space.
 * `active` gates the (expensive) render so it only runs when the room is visible.
 */
export function ReflectionPlane({
  point,
  normal,
  active,
  children,
  layers = [],
  boost,
}: {
  point: [number, number, number];
  normal: [number, number, number];
  active: () => boolean;
  children: ReactNode;
  /** Extra layers only the reflection draws (something seen in the glass and nowhere else). */
  layers?: number[];
  /** While true, draw the reflection sharper and every frame (a short, important moment). */
  boost?: () => boolean;
}) {
  const { gl, scene, camera, size } = useThree();
  const quality = useGame((s) => s.quality);
  const resolution = QUALITY_REFLECT[quality];
  // Opposite walls face opposite ways, so they land on alternate frames.
  const slot = normal[0] + normal[2] > 0 ? 0 : 1;
  const frame = useRef(0);
  const rt = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: 2 });
    t.texture.generateMipmaps = false;
    return t;
  }, []);
  const virtualCam = useMemo(() => new THREE.PerspectiveCamera(), []);
  useEffect(() => {
    for (const l of layers) virtualCam.layers.enable(l);
  }, [virtualCam, layers]);
  const ctx = useMemo<PlaneCtx>(() => ({ texture: rt.texture, textureMatrix: new THREE.Matrix4(), members: new Set() }), [rt]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    rt.setSize(Math.max(256, Math.floor(size.width * dpr * resolution)), Math.max(256, Math.floor(size.height * dpr * resolution)));
  }, [size, gl, rt, resolution]);
  useEffect(() => () => rt.dispose(), [rt]);

  useFrame(() => {
    if (!active()) return;
    // A moment that matters (the Lady in her mirror): the reflection is drawn sharper, and every frame.
    const boosted = !!boost?.();
    const want = boosted ? Math.max(resolution, 0.6) : resolution;
    const dpr = gl.getPixelRatio();
    const w = Math.max(256, Math.floor(size.width * dpr * want));
    if (rt.width !== w) rt.setSize(w, Math.max(256, Math.floor(size.height * dpr * want)));
    if (!boosted && QUALITY_ALTERNATE[quality] && ++frame.current % 2 !== slot) return;
    const cam = camera as THREE.PerspectiveCamera;
    // Skip the whole reflected render when none of this wall's mirrors is on screen.
    projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    let seen = false;
    for (const m of ctx.members) {
      const mesh = m as THREE.Mesh;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
      if (frustum.intersectsSphere(sphere)) {
        seen = true;
        break;
      }
    }
    if (!seen) return;
    vPos.set(...point);
    vNormal.set(...normal).normalize();
    vCam.setFromMatrixPosition(cam.matrixWorld);
    vView.subVectors(vPos, vCam);
    if (vView.dot(vNormal) > 0) return; // behind the mirror
    vView.reflect(vNormal).negate().add(vPos);
    rot.extractRotation(cam.matrixWorld);
    vLook.set(0, 0, -1).applyMatrix4(rot).add(vCam);
    vTarget.subVectors(vPos, vLook).reflect(vNormal).negate().add(vPos);
    virtualCam.position.copy(vView);
    virtualCam.up.set(0, 1, 0).applyMatrix4(rot).reflect(vNormal);
    virtualCam.lookAt(vTarget);
    virtualCam.far = cam.far;
    virtualCam.near = cam.near;
    virtualCam.updateMatrixWorld();
    virtualCam.projectionMatrix.copy(cam.projectionMatrix);

    ctx.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    ctx.textureMatrix.multiply(virtualCam.projectionMatrix).multiply(virtualCam.matrixWorldInverse);

    // Oblique near plane clips everything behind the mirror.
    plane.setFromNormalAndCoplanarPoint(vNormal, vPos).applyMatrix4(virtualCam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const p = virtualCam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + p[8]) / p[0];
    q.y = (Math.sign(clip.y) + p[9]) / p[5];
    q.z = -1;
    q.w = (1 + p[10]) / p[14];
    clip.multiplyScalar(2 / clip.dot(q));
    p[2] = clip.x;
    p[6] = clip.y;
    p[10] = clip.z + 1 - 0.003;
    p[14] = clip.w;

    for (const m of ctx.members) m.visible = false;
    const prevTarget = gl.getRenderTarget();
    const prevShadow = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(rt);
    gl.state.buffers.depth.setMask(true);
    gl.clear();
    gl.render(scene, virtualCam);
    gl.setRenderTarget(prevTarget);
    gl.shadowMap.autoUpdate = prevShadow;
    for (const m of ctx.members) m.visible = true;
  }, -1);

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

const vert = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vRefl;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vRefl = textureMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D tReflect;
  uniform sampler2D tFox;
  uniform sampler2D tText;
  uniform float uTime, uBright, uMist, uTunnel, uRipple, uTextAmt, uAspect, uActive;
  varying vec4 vRefl;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  // An endless corridor of receding frames, drawn inside the glass.
  vec3 tunnel(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) * 2.0;
    float d = max(abs(p.x) / uAspect * 1.15, abs(p.y));
    float depth = 0.35 / max(d, 0.001);
    float z = depth - uTime * 0.18;
    float rings = smoothstep(0.92, 1.0, fract(z * 1.6));
    float panel = step(0.5, fract(z * 0.8));
    float fog = exp(-depth * 0.28);
    vec3 wall = mix(vec3(0.055, 0.04, 0.03), vec3(0.09, 0.07, 0.045), panel);
    vec3 col = wall + rings * vec3(0.55, 0.38, 0.18);
    // Candle points along the walls
    float side = step(abs(p.y), d * 0.4);
    col += side * smoothstep(0.96, 1.0, fract(z * 0.8 + 0.2)) * vec3(1.6, 0.9, 0.35);
    return col * fog * 1.3;
  }

  void main() {
    vec2 ruv = vRefl.xy / vRefl.w;
    vec2 c = vUv - 0.5;
    float r = length(c);
    ruv += normalize(c + 1e-5) * sin(r * 45.0 - uTime * 9.0) * 0.006 * uRipple * smoothstep(0.7, 0.0, r);
    vec3 refl = uActive > 0.5 ? texture2D(tReflect, ruv).rgb : vec3(0.03, 0.028, 0.025);
    vec4 fox = texture2D(tFox, vUv);
    // Aged silvering: slightly warm, darker and cloudier where foxed
    refl *= mix(vec3(0.86, 0.84, 0.78), vec3(0.16, 0.14, 0.1), fox.r);
    refl += fox.r * vec3(0.02, 0.018, 0.012);
    // Mist rolls across the glass
    float m = noise(vUv * vec2(3.0, 5.0) + vec2(uTime * 0.05, uTime * 0.02)) * 0.6 + noise(vUv * 9.0 - uTime * 0.04) * 0.4;
    refl = mix(refl, vec3(0.32, 0.34, 0.36) * (0.6 + m * 0.5), uMist * smoothstep(0.15, 0.7, m + uMist * 0.4));
    // Tunnel
    refl = mix(refl, tunnel(vUv) * (1.0 - fox.r * 0.6), uTunnel);
    // Inner glow
    float glow = uBright * (0.35 + 0.65 * smoothstep(0.75, 0.0, r)) * (0.85 + 0.15 * sin(uTime * 1.3));
    refl += glow * vec3(0.55, 0.5, 0.42) * 0.55;
    // Words surfacing through the silver
    vec4 t = texture2D(tText, vUv);
    float ta = t.a * uTextAmt * (0.82 + 0.18 * noise(vUv * 30.0 + uTime));
    refl = mix(refl, t.rgb * 2.4, ta);
    gl_FragColor = vec4(refl, 1.0);
  }
`;

const emptyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
emptyTex.needsUpdate = true;

const textCache = new Map<string, THREE.Texture>();
/** Render a message onto a transparent canvas texture to appear inside a mirror. */
export function mirrorText(text: string, aspect: number) {
  const key = `${text}|${aspect.toFixed(2)}`;
  let t = textCache.get(key);
  if (t) return t;
  const W = 1024;
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lines = wrap(g, text, W * 0.78, 92);
  const size = lines.length > 4 ? 74 : 92;
  g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  const wrapped = wrap(g, text, W * 0.8, size);
  const lh = size * 1.25;
  const y0 = H * 0.42 - ((wrapped.length - 1) * lh) / 2;
  g.shadowColor = 'rgba(255,230,180,0.65)';
  g.shadowBlur = 28;
  g.fillStyle = 'rgba(245,232,205,0.95)';
  wrapped.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh));
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textCache.set(key, t);
  return t;
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, size: number) {
  g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** A mirror glass panel (local plane facing +z) that samples its wall's reflection. */
export function MirrorGlass({ w, h, fx, seed = 1, position }: { w: number; h: number; fx?: MirrorFx; seed?: number; position?: [number, number, number] }) {
  const ctx = useContext(Ctx);
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          tReflect: { value: ctx?.texture ?? emptyTex },
          textureMatrix: { value: ctx?.textureMatrix ?? new THREE.Matrix4() },
          tFox: { value: foxing(seed) },
          tText: { value: emptyTex },
          uTime: { value: 0 },
          uBright: { value: 0 },
          uMist: { value: 0 },
          uTunnel: { value: 0 },
          uRipple: { value: 0 },
          uTextAmt: { value: 0 },
          uAspect: { value: w / h },
          uActive: { value: ctx ? 1 : 0 },
        },
      }),
    [ctx, seed, w, h],
  );
  const lastText = useRef('');
  useEffect(() => {
    if (!ctx) return;
    const o = ref.current;
    ctx.members.add(o);
    return () => void ctx.members.delete(o);
  }, [ctx]);
  useFrame(() => {
    const u = mat.uniforms;
    u.uTime.value = world.t;
    if (!fx) return;
    const k = 1 - Math.exp(-world.dt * 2.5);
    fx.bright += (fx.brightTarget - fx.bright) * k;
    fx.mist += (fx.mistTarget - fx.mist) * k;
    fx.tunnel += (fx.tunnelTarget - fx.tunnel) * (1 - Math.exp(-world.dt * 1.2));
    fx.ripple = Math.max(0, fx.ripple - world.dt * 0.45);
    const wantText = fx.text;
    if (wantText !== lastText.current) {
      // Fade out the old words before showing new ones.
      fx.textAmt = Math.max(0, fx.textAmt - world.dt * 2.5);
      if (fx.textAmt <= 0.001) {
        lastText.current = wantText;
        u.tText.value = wantText ? mirrorText(wantText, w / h) : emptyTex;
      }
    } else if (wantText) {
      fx.textAmt = Math.min(1, fx.textAmt + world.dt * 0.8);
    }
    u.uBright.value = fx.bright;
    u.uMist.value = fx.mist;
    u.uTunnel.value = fx.tunnel;
    u.uRipple.value = fx.ripple;
    u.uTextAmt.value = fx.textAmt;
  });
  return (
    <mesh ref={ref} material={mat} position={position}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}
