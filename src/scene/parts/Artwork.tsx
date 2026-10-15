/**
 * Paintings that matter: generated artwork in a gilt frame, an optional brass
 * nameplate and picture light, close inspection with E or a click, and a
 * "living" material the lessons and the house's strange events can disturb.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PAINTINGS } from '../../content/paintings';
import { game, useGame } from '../../state/store';
import { boxGeo } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { artAspect, artCanvas, type ArtId } from '../../systems/paintingScenes';
import { plaque } from '../../systems/textures';
import { world } from '../../systems/time';
import { Interactive } from '../Interactive';
import { ProfileFrame } from './Furnishings';

// ------------------------------------------------------------------ lazy painting textures

const texCache = new Map<ArtId, THREE.CanvasTexture>();
const queue: ArtId[] = [];
let pumping = false;

/** Paintings take a moment to render, so they are painted one at a time in the background. */
function pump() {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const id = queue.shift();
    if (!id) {
      pumping = false;
      return;
    }
    const tex = texCache.get(id)!;
    // WebGL texture storage cannot change size, so release the placeholder's GPU copy
    // and let three.js upload the finished painting as a fresh texture.
    tex.dispose();
    tex.image = artCanvas(id);
    tex.needsUpdate = true;
    window.setTimeout(step, 30);
  };
  window.setTimeout(step, 30);
}

export function artTexture(id: ArtId) {
  let t = texCache.get(id);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const g = c.getContext('2d')!;
    g.fillStyle = '#16120d';
    g.fillRect(0, 0, 4, 4);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(id, t);
    queue.push(id);
    pump();
  }
  return t;
}

/** Start painting everything early (during the title screen) so rooms are ready when visited. */
export function preloadArt(ids: ArtId[]) {
  ids.forEach((id) => artTexture(id));
}

// ------------------------------------------------------------------ living material

/** Effects a lesson or event can apply to a painting. All 0..1. */
export interface LivingFx {
  moths: number;
  warm: number;
  shiver: number;
  flash: number;
  fade: number;
  text: string;
  textAmt: number;
  targets: Partial<Record<'moths' | 'warm' | 'shiver' | 'flash' | 'fade', number>>;
}
export const makeLivingFx = (): LivingFx => ({ moths: 0, warm: 0, shiver: 0, flash: 0, fade: 0, text: '', textAmt: 0, targets: {} });

const MOTHS_GLSL = /* glsl */ `
  float mothShape(vec2 p, float flap) {
    p.x = abs(p.x);
    vec2 w1 = (p - vec2(0.011, 0.004)) / vec2(0.013 * flap + 0.002, 0.009);
    vec2 w2 = (p - vec2(0.008, -0.007)) / vec2(0.009 * flap + 0.002, 0.006);
    float wings = max(1.0 - smoothstep(0.75, 1.0, length(w1)), 1.0 - smoothstep(0.75, 1.0, length(w2)));
    float body = 1.0 - smoothstep(0.7, 1.0, length(p / vec2(0.0025, 0.011)));
    return max(wings, body);
  }
  // x: pale wing coverage, y: the shadow each moth casts on the canvas
  vec2 moths(vec2 uv, float t) {
    float a = 0.0;
    float sh = 0.0;
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      // Moths circle the sitter's head and shoulders, some drifting wide across the canvas
      float r = 0.13 + 0.05 * mod(fi, 4.0);
      vec2 c = vec2(0.5, 0.6) + vec2(sin(t * (0.3 + fi * 0.05) + fi * 2.1) * r * 1.2, cos(t * (0.37 + fi * 0.04) + fi * 1.3) * r);
      float flap = abs(sin(t * (18.0 + fi * 2.3) + fi));
      vec2 p = uv - c;
      float ang = sin(t * 0.8 + fi) * 0.6;
      p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
      a = max(a, mothShape(p * vec2(0.4, 0.34), flap));
      sh = max(sh, 0.55 * mothShape((p - vec2(0.018, -0.024)) * 0.34, flap));
    }
    return vec2(a, sh);
  }
`;

export function useLivingMaterial(art: ArtId, fx?: LivingFx) {
  const textTex = useRef<THREE.Texture | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMoths: { value: 0 },
      uWarm: { value: 0 },
      uShiver: { value: 0 },
      uFlash: { value: 0 },
      uFade: { value: 0 },
      uText: { value: blankTex as THREE.Texture },
      uTextAmt: { value: 0 },
    }),
    [],
  );
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: artTexture(art), roughness: 0.55, metalness: 0 });
    if (fx) {
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform float uTime, uMoths, uWarm, uShiver, uFlash, uFade, uTextAmt;
            uniform sampler2D uText;
            ${MOTHS_GLSL}`,
          )
          .replace(
            '#include <map_fragment>',
            `vec2 puv = vMapUv + vec2(sin(uTime * 41.0 + vMapUv.y * 90.0), cos(uTime * 37.0 + vMapUv.x * 70.0)) * 0.0016 * uShiver;
            vec4 sampledDiffuseColor = texture2D(map, puv);
            diffuseColor *= sampledDiffuseColor;
            float lumi = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lumi) * vec3(0.32, 0.3, 0.28), uFade * 0.8);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.45, 1.2, 0.68) + vec3(0.06, 0.04, 0.0), uWarm);
            vec2 mo = moths(puv, uTime) * uMoths;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.01, 0.008), mo.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.32, 0.25), mo.x * 0.9);
            vec4 tx = texture2D(uText, vMapUv);
            diffuseColor.rgb = mix(diffuseColor.rgb, tx.rgb, tx.a * uTextAmt);`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            totalEmissiveRadiance += vec3(0.55, 0.62, 0.8) * uFlash * (0.25 + lumi * 2.5);
            totalEmissiveRadiance += vec3(0.55, 0.38, 0.1) * uWarm * (0.15 + lumi * 1.2);
            totalEmissiveRadiance += vec3(0.04, 0.035, 0.025) * mo.x;`,
          );
      };
      m.customProgramCacheKey = () => 'living-painting';
    }
    return m;
  }, [art, fx, uniforms]);

  useFrame(() => {
    if (!fx) return;
    const k = 1 - Math.exp(-world.dt * 1.8);
    for (const key of ['moths', 'warm', 'shiver', 'fade'] as const) {
      const t = fx.targets[key];
      if (t !== undefined) fx[key] += (t - fx[key]) * k;
    }
    fx.flash = Math.max(0, fx.flash - world.dt * 2.2);
    uniforms.uTime.value = world.t;
    uniforms.uMoths.value = fx.moths;
    uniforms.uWarm.value = fx.warm;
    uniforms.uShiver.value = fx.shiver;
    uniforms.uFlash.value = fx.flash;
    uniforms.uFade.value = fx.fade;
    if (fx.text) {
      if (!textTex.current || textTex.current.userData.text !== fx.text) {
        textTex.current = paintedText(fx.text);
        uniforms.uText.value = textTex.current;
        fx.textAmt = 0;
      }
      fx.textAmt = Math.min(1, fx.textAmt + world.dt * 0.6);
    } else fx.textAmt = Math.max(0, fx.textAmt - world.dt * 1.5);
    uniforms.uTextAmt.value = fx.textAmt;
  });
  return mat;
}

const blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
blankTex.needsUpdate = true;

/** Words brushed onto a dark canvas in pale paint (used by the empty frame). */
function paintedText(text: string) {
  const W = 512;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = text.length > 40 ? 44 : 54;
  g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > W * 0.78 && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  const lh = size * 1.3;
  g.filter = 'blur(0.6px)';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 6;
  g.fillStyle = 'rgba(222,208,178,0.95)';
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 - ((lines.length - 1) * lh) / 2 + i * lh));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.text = text;
  return t;
}

// ------------------------------------------------------------------ registry for strange events

export interface HungPainting {
  id: string;
  group: THREE.Object3D;
  /** Small rotation about the hanging point, radians. */
  tilt: number;
  swapArt?: (art: ArtId) => void;
}
export const hungPaintings = new Map<string, HungPainting>();

// ------------------------------------------------------------------ the painting

interface ArtPaintingProps {
  /** Key into PAINTINGS (catalogue) or a bare art id for decorative works. */
  id: string;
  art?: ArtId;
  x: number;
  y: number;
  /** Width of the canvas in metres; height follows the image's aspect ratio. */
  width: number;
  frame?: 'frame' | 'ornateFrame';
  nameplate?: () => string | null;
  fx?: LivingFx;
  pictureLight?: number;
  inspectable?: boolean;
  /** Called when inspection should hand over to a lesson instead. */
  label?: () => string | null;
  onUse?: () => void;
}

/** A framed, inspectable painting in a wall's local frame (z out of the wall). */
export function ArtPainting({ id, art, x, y, width, frame = 'frame', nameplate, fx, pictureLight = 0, inspectable = true, label, onUse }: ArtPaintingProps) {
  const info = PAINTINGS[id];
  const artId = (art ?? info?.art) as ArtId;
  const h = width / artAspect(artId);
  const group = useRef<THREE.Group>(null!);
  const tiltRef = useRef<HungPainting | null>(null);
  const mat = useLivingMaterial(artId, fx);
  const m = mats();

  useEffect(() => {
    const entry: HungPainting = {
      id,
      group: group.current,
      tilt: 0,
      swapArt: (a) => {
        mat.map = artTexture(a);
        mat.needsUpdate = true;
      },
    };
    tiltRef.current = entry;
    hungPaintings.set(id, entry);
    return () => void hungPaintings.delete(id);
  }, [id, mat]);

  useFrame(() => {
    const e = tiltRef.current;
    if (!e) return;
    // Hangs from a single nail above the frame: rotate about that point.
    group.current.rotation.z += (e.tilt - group.current.rotation.z) * Math.min(1, world.dt * 6);
  });

  const inspect = () => {
    const s = useGame.getState();
    const o = new THREE.Vector3();
    const n = new THREE.Vector3();
    group.current.getWorldPosition(o);
    group.current.getWorldDirection(n);
    o.y -= h / 2; // group origin is the nail above the frame
    const dist = Math.max(1.3, (h + 0.5) / 0.95);
    const pos: [number, number, number] = [o.x + n.x * dist, o.y + 0.05, o.z + n.z * dist];
    if (document.pointerLockElement) document.exitPointerLock();
    s.setHover(null);
    // Aim a little below centre so the painting sits above the caption card.
    s.setInspecting(id, { position: pos, target: [o.x, o.y - (h + 0.4) * 0.3, o.z] });
  };

  const body = (
    <group>
      <mesh material={mat} position={[0, -h / 2, 0.022]}>
        <planeGeometry args={[width, h]} />
      </mesh>
      <mesh geometry={boxGeo(width + 0.02, h + 0.02, 0.02)} material={m.blackPaint} position={[0, -h / 2, 0.01]} />
      <group position={[0, -h / 2, 0]}>
        <ProfileFrame w={width} h={h} profile={frame} material={m.gilt} />
      </group>
    </group>
  );

  return (
    <group position={[x, y + h / 2, 0.02]}>
      <group ref={group}>
        {inspectable ? (
          <Interactive
            id={`painting-${id}`}
            maxDist={4.2}
            label={label ?? (() => (game().lessonActive || game().inspecting ? null : 'Look closer at the painting'))}
            onUse={onUse ?? inspect}
          >
            {body}
          </Interactive>
        ) : (
          body
        )}
      </group>
      {/* Hanging cord to the picture rail */}
      <mesh material={m.brass} position={[0, 0.45, -0.01]}>
        <cylinderGeometry args={[0.002, 0.002, 0.9, 4]} />
      </mesh>
      {nameplate && <Nameplate text={nameplate} y={-h - (frame === 'ornateFrame' ? 0.24 : 0.17)} />}
      {pictureLight > 0 && <PictureLight width={width} h={h} intensity={pictureLight} frame={frame} />}
    </group>
  );
}

/** A brass picture lamp on an arm above the frame, washing the canvas with warm light. */
function PictureLight({ width, h, intensity, frame }: { width: number; h: number; intensity: number; frame: string }) {
  const m = mats();
  const light = useRef<THREE.SpotLight>(null!);
  const top = frame === 'ornateFrame' ? 0.2 : 0.14;
  useEffect(() => {
    const l = light.current;
    l.target.position.set(0, -h * 0.55, 0);
    l.add(l.target);
  }, [h]);
  return (
    <group position={[0, top, 0]}>
      <mesh material={m.brass} position={[0, 0.02, 0.09]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
      </mesh>
      <mesh material={m.brass} position={[0, -0.03, 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, Math.min(0.9, width * 0.6), 16, 1, false, 0, Math.PI]} />
      </mesh>
      <spotLight ref={light} position={[0, -0.05, 0.2]} intensity={intensity} angle={0.95} penumbra={0.8} distance={4} decay={2} color="#ffcf95" />
    </group>
  );
}

/** Brass nameplate. Text can change (a restored title fades in with a glint). */
function Nameplate({ text, y }: { text: () => string | null; y: number }) {
  const blank = useMemo(() => plaque(' ', ' '), []);
  const matA = useMemo(() => new THREE.MeshStandardMaterial({ map: blank, metalness: 0.85, roughness: 0.35 }), [blank]);
  const matB = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.35, transparent: true, opacity: 0, emissive: new THREE.Color('#6a4a18'), emissiveIntensity: 0 }), []);
  const shown = useRef<string | null>(null);
  const reveal = useRef(0);
  useFrame(() => {
    const t = text();
    if (t !== shown.current) {
      shown.current = t;
      if (t) {
        matB.map = plaque(t, '');
        matB.needsUpdate = true;
        reveal.current = 0.001;
      } else {
        reveal.current = 0;
        matB.opacity = 0;
      }
    }
    if (reveal.current > 0 && reveal.current < 1) reveal.current = Math.min(1, reveal.current + world.dt * 0.5);
    matB.opacity = reveal.current;
    // A glint that sweeps in with the words, then settles
    matB.emissiveIntensity = reveal.current > 0 && reveal.current < 1 ? Math.sin(reveal.current * Math.PI) * 1.4 : 0;
  });
  return (
    <group position={[0, y, 0.03]}>
      <mesh material={matA}>
        <planeGeometry args={[0.46, 0.15]} />
      </mesh>
      <mesh material={matB} position={[0, 0, 0.002]}>
        <planeGeometry args={[0.46, 0.15]} />
      </mesh>
    </group>
  );
}
