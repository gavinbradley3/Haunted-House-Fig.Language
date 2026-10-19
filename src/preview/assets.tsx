/**
 * Phase 7 isolated preview: the three pilot models beside the procedural originals they would
 * replace, lit by the game's own fixtures (Sconce / CandleLight, hemisphere, room environment) and
 * rendered through the game's post-processing at a chosen quality (default Low, the school baseline).
 *
 * Dev only: open http://localhost:5180/preview/assets.html  (?view=doors&quality=low)
 * Keys: 1-6 camera presets, O swing the doors, H hide/show the HUD. Mouse: orbit.
 */
import { StrictMode, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree, type ThreeElements } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mats } from '../systems/materials';
import { setMaxAnisotropy } from '../systems/textures';
import { renderer } from '../systems/renderer';
import { world } from '../systems/time';
import { boxGeo } from '../systems/geometry';
import { artAspect, type ArtId } from '../systems/paintingScenes';
import { Architrave, Wainscot } from '../scene/parts/Architecture';
import { DoorLeaf } from '../scene/parts/Door';
import { ConsoleTable, ProfileFrame } from '../scene/parts/Furnishings';
import { Sconce } from '../scene/parts/Lights';
import { artTexture, useLivingMaterial } from '../scene/parts/Artwork';
import {
  architraveGeometry,
  benchLoad,
  MODELS,
  consoleTable,
  doorLeaf,
  frameGeometry,
  loadDoorKit,
  loadFrameKit,
  loadTimes,
  objectStats,
  type DoorKit,
  type FrameKit,
  type FrameStyle,
} from '../assets3d/pilotKits';

/** Mirrors GameCanvas QUALITY (copied so this page does not pull in every room of the house). */
const QUALITY = {
  high: { dpr: [1, 1.5] as [number, number], msaa: 4, maxWidth: Infinity },
  balanced: { dpr: [1, 1] as [number, number], msaa: 2, maxWidth: 1600 },
  low: { dpr: [0.8, 0.8] as [number, number], msaa: 0, maxWidth: 1280 },
};

const params = new URLSearchParams(location.search);
const quality = (params.get('quality') ?? 'low') as keyof typeof QUALITY;
const Q = QUALITY[quality];

// Camera presets: [position, target]
const VIEWS: Record<string, [[number, number, number], [number, number, number]]> = {
  overview: [[2.2, 1.8, 7.8], [2.2, 1.4, 0]],
  consoles: [[-4.2, 1.35, 2.6], [-4.2, 0.75, 0]],
  doors: [[0, 1.5, 3.9], [0, 1.25, 0]],
  frames: [[3.8, 1.8, 2.6], [3.8, 1.75, 0]],
  variants: [[8.6, 1.7, 3.4], [8.6, 1.65, 0]],
  stretched: [[12.4, 1.7, 4.6], [12.4, 1.55, 0]],
  'console-close': [[-3.0, 1.25, 1.25], [-3.2, 0.7, 0.2]],
  'door-close': [[1.25, 1.45, 1.35], [0.8, 1.2, 0]],
  'frame-close': [[4.95, 2.15, 0.85], [4.6, 1.9, 0]],
};
const VIEW_KEYS = ['overview', 'consoles', 'doors', 'frames', 'variants', 'stretched'];

/** Groups the HUD measures: each holds one side of a comparison. */
const measured: Record<string, THREE.Object3D> = {};
function Measured({ name, children, ...rest }: { name: string; children: ReactNode } & ThreeElements['group']) {
  return (
    <group ref={(g) => void (g && (measured[name] = g))} {...rest}>
      {children}
    </group>
  );
}

function Setup() {
  const { gl, scene, camera } = useThree();
  useMemo(() => {
    renderer.gl = gl;
    renderer.scene = scene;
    renderer.camera = camera;
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    mats();
  }, [gl, scene, camera]);
  useEffect(() => {
    // Same environment, fog and background as the game (GameCanvas Setup)
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.14;
    scene.fog = new THREE.FogExp2('#0b0d10', 0.012);
    scene.background = new THREE.Color('#05070a');
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  // The preview owns the world clock (the game's Player normally advances it), so candles flicker.
  useFrame((_, dt) => {
    world.dt = Math.min(dt, 0.1);
    world.t += world.dt;
  }, -10);
  return null;
}

// ------------------------------------------------------------------ the room

const WALL_H = 4.2;
const OPENINGS: { c: number; w: number; h: number }[] = [
  { c: -0.8, w: 0.96, h: 2.3 },
  { c: 0.8, w: 0.96, h: 2.3 },
  { c: 11.4, w: 0.95, h: 3.1 },
  { c: 13.4, w: 1.25, h: 2.45 },
];
const X0 = -7;
const X1 = 15;

/** Hall wall (damask over walnut wainscot) with real door openings, reveals and a dark void behind. */
function Room() {
  const m = mats();
  const segs = useMemo(() => {
    const out: [number, number][] = [];
    let x = X0;
    for (const o of [...OPENINGS].sort((a, b) => a.c - b.c)) {
      out.push([x, o.c - o.w / 2]);
      x = o.c + o.w / 2;
    }
    out.push([x, X1]);
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floorHall} receiveShadow position={[(X0 + X1) / 2, 0, 4]}>
        <planeGeometry args={[X1 - X0, 8]} />
      </mesh>
      {segs.map(([a, b], i) => (
        <mesh key={i} geometry={boxGeo(b - a, WALL_H, 0.3)} material={m.wallHall} position={[(a + b) / 2, WALL_H / 2, -0.15]} receiveShadow />
      ))}
      {OPENINGS.map((o, i) => (
        <group key={i}>
          <mesh geometry={boxGeo(o.w, WALL_H - o.h, 0.3)} material={m.wallHall} position={[o.c, o.h + (WALL_H - o.h) / 2, -0.15]} />
          <mesh geometry={boxGeo(o.w + 0.4, o.h + 0.2, 0.02)} material={m.darkInterior} position={[o.c, o.h / 2, -0.6]} />
        </group>
      ))}
      <Wainscot x0={X0} x1={X1} gaps={OPENINGS.map((o) => [o.c, o.w + 0.36] as [number, number])} />
    </group>
  );
}

// ------------------------------------------------------------------ comparisons

function useAsync<T>(fn: () => Promise<T>) {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    void fn().then((r) => live && setV(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

function Consoles() {
  const table = useAsync(consoleTable);
  return (
    <group>
      <Measured name="console:old">
        <ConsoleTable position={[-5.2, 0, 0]} w={1.5} />
      </Measured>
      <Measured name="console:new">{table && <primitive object={table.mesh} position={[-3.2, 0, 0]} />}</Measured>
      <Sconce x={-4.2} y={2.0} seed={3} intensity={4.5} />
    </group>
  );
}

/** Both doors swing together on O, through the same damped spring Door.tsx uses. */
const swing = { open: false };
function Swinging({ hinge, children }: { hinge: [number, number, number]; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  const st = useRef({ a: 0, v: 0 });
  useFrame(() => {
    const dt = world.dt;
    const s = st.current;
    const acc = ((swing.open ? 1.45 : 0) - s.a) * 9 - s.v * 5.2;
    s.v += acc * dt;
    s.a += s.v * dt;
    g.current.rotation.y = s.a;
  });
  return (
    <group position={hinge}>
      <group ref={g}>{children}</group>
    </group>
  );
}

function KitDoor({ kit, c, w, h, name }: { kit: DoorKit; c: number; w: number; h: number; name: string }) {
  const m = mats();
  const leaf = useMemo(() => doorLeaf(kit, w, h, { M_Brass: m.brass, M_BlackPaint: m.blackPaint }), [kit, w, h, m]);
  const arch = useMemo(() => architraveGeometry(kit, c, w, h), [kit, c, w, h]);
  return (
    <Measured name={name}>
      <Swinging hinge={[c - w / 2, 0, -0.15]}>
        <primitive object={leaf} />
      </Swinging>
      <mesh geometry={arch} material={kit.wood} castShadow receiveShadow />
    </Measured>
  );
}

function Doors() {
  const kit = useAsync(loadDoorKit);
  const [a, b, front, mirror] = OPENINGS;
  return (
    <group>
      <Measured name="door:old">
        <Swinging hinge={[a.c - a.w / 2, 0, -0.15]}>
          <DoorLeaf width={a.w} height={a.h} />
        </Swinging>
        <Architrave c={a.c} w={a.w} h={a.h} />
      </Measured>
      {kit && <KitDoor kit={kit} c={b.c} w={b.w} h={b.h} name="door:new" />}
      <Sconce x={0} y={2.15} seed={5} intensity={4.5} />
      {/* The same kit stretched to the front-door leaf and the mirror-room door */}
      {kit && <KitDoor kit={kit} c={front.c} w={front.w} h={front.h} name="door:front-size" />}
      {kit && <KitDoor kit={kit} c={mirror.c} w={mirror.w} h={mirror.h} name="door:mirror-size" />}
      <Sconce x={12.4} y={2.2} seed={9} intensity={4.5} />
    </group>
  );
}

/** Canvas + frame. The artwork is an independent texture (the game's living painting material). */
function KitPainting({ kit, art, x, y, width, style = 'ornate', slim = 1, name }: { kit: FrameKit; art: ArtId; x: number; y: number; width: number; style?: FrameStyle; slim?: number; name: string }) {
  const h = width / artAspect(art);
  const mat = useLivingMaterial(art);
  // Sight opening = canvas minus the lip on each side, so the frame never hides more than ~1 cm.
  const geo = useMemo(() => frameGeometry(kit, width - 2 * kit.lip, h - 2 * kit.lip, style, slim), [kit, width, h, style, slim]);
  return (
    <Measured name={name} position={[x, y, 0.005]}>
      <mesh material={mat} position={[0, 0, 0.009]}>
        <planeGeometry args={[width, h]} />
      </mesh>
      <mesh geometry={geo} material={kit.materials} />
    </Measured>
  );
}

function OldPainting({ art, x, y, width }: { art: ArtId; x: number; y: number; width: number }) {
  const h = width / artAspect(art);
  const mat = useLivingMaterial(art);
  const m = mats();
  return (
    <Measured name="frame:old" position={[x, y, 0.02]}>
      <mesh material={mat} position={[0, 0, 0.022]}>
        <planeGeometry args={[width, h]} />
      </mesh>
      <mesh geometry={boxGeo(width + 0.02, h + 0.02, 0.02)} material={m.blackPaint} position={[0, 0, 0.01]} />
      <ProfileFrame w={width} h={h} profile="frame" material={m.gilt} />
    </Measured>
  );
}

function Frames() {
  const kit = useAsync(loadFrameKit);
  useEffect(() => {
    // Paint the artwork the frames show (same lazy painter as the game)
    (['houseBreath', 'caretaker', 'ladyOfHouse', 'whisperingWalls', 'coldFeet'] as ArtId[]).forEach((a) => artTexture(a));
  }, []);
  return (
    <group>
      <OldPainting art="houseBreath" x={3.0} y={1.9} width={1.0} />
      {kit && <KitPainting kit={kit} art="houseBreath" x={4.6} y={1.9} width={1.0} name="frame:new" />}
      <Sconce x={3.8} y={2.0} seed={7} intensity={4.5} />
      {/* Aspect-ratio and style variants of the same kit */}
      {kit && <KitPainting kit={kit} art="caretaker" x={7.1} y={1.95} width={0.7} name="frame:portrait" />}
      {kit && <KitPainting kit={kit} art="ladyOfHouse" x={8.65} y={1.95} width={1.25} name="frame:landscape" />}
      {kit && <KitPainting kit={kit} art="whisperingWalls" x={10.0} y={2.1} width={0.55} style="plain" slim={0.6} name="frame:plain-narrow" />}
      {kit && <KitPainting kit={kit} art="coldFeet" x={10.0} y={1.25} width={0.55} style="plain" name="frame:plain" />}
      <Sconce x={8.6} y={2.9} seed={11} intensity={4.5} />
    </group>
  );
}

// ------------------------------------------------------------------ camera, HUD, hooks

function CameraRig() {
  const { camera } = useThree();
  const controls = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const go = (name: string) => {
    const v = VIEWS[name];
    if (!v) return;
    camera.position.set(...v[0]);
    controls.current?.target.set(...v[1]);
    controls.current?.update();
  };
  useEffect(() => {
    go(params.get('view') ?? 'overview');
    (window as unknown as Record<string, unknown>).__setView = go;
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < VIEW_KEYS.length) go(VIEW_KEYS[i]);
      if (e.key === 'o' || e.key === 'O') swing.open = !swing.open;
      if (e.key === 'h' || e.key === 'H') document.getElementById('hud')!.hidden = !document.getElementById('hud')!.hidden;
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <OrbitControls ref={controls as never} makeDefault enableDamping={false} />;
}

/**
 * Art-direction tweaks for iterating under game lighting without re-exporting, e.g.
 * ?tweak={"M_FrameOrnate_Corner":{"metalness":0.6,"roughness":0.45,"color":"#b89a70"}}
 * Winning values are then baked back into the Blender source and re-exported.
 */
function Tweaks() {
  const { scene } = useThree();
  const raw = params.get('tweak');
  useFrame(() => {
    if (!raw) return;
    const t = JSON.parse(raw) as Record<string, Record<string, number | string | null>>;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
        const s = t[mat.name];
        if (!s || mat.userData.tweaked) continue;
        const std = mat as THREE.MeshStandardMaterial;
        for (const [k, v] of Object.entries(s)) {
          if (v === null) (std as unknown as Record<string, null>)[k] = null;
          else if (k === 'color' || k === 'emissive') std[k].set(v as string);
          else (std as unknown as Record<string, number>)[k] = v as number;
        }
        mat.userData.tweaked = true;
        mat.needsUpdate = true;
      }
    });
  });
  return null;
}

function Hud() {
  const { gl } = useThree();
  const acc = useRef({ n: 0, t: 0, ms: 0 });
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__preview = {
      ready: () => ['console:new', 'door:new', 'frame:new'].every((k) => measured[k]?.children.length),
      stats: () => Object.fromEntries(Object.entries(measured).map(([k, g]) => [k, objectStats(g)])),
      loadTimes: () => Object.fromEntries([...loadTimes].map(([k, v]) => [k.split('/').pop(), Math.round(v)])),
      swing: (open: boolean) => (swing.open = open),
      gl: () => gl,
      benchLoad: (key: keyof typeof MODELS) => benchLoad(MODELS[key], gl),
    };
  }, [gl]);
  useFrame((_, dt) => {
    const a = acc.current;
    a.n++;
    a.t += dt;
    if (a.t < 0.5) return;
    a.ms = (a.t / a.n) * 1000;
    a.n = 0;
    a.t = 0;
    const s = Object.entries(measured).map(([k, g]) => {
      const st = objectStats(g);
      return `${k.padEnd(18)} ${String(st.tris).padStart(6)} tris ${String(st.draws).padStart(3)} draws ${String(st.textures).padStart(2)} tex ${(st.texBytes / 1048576).toFixed(1).padStart(5)} MB`;
    });
    const hud = document.getElementById('hud');
    if (hud && !hud.hidden)
      hud.innerHTML = `<b>Phase 7 pilot preview</b>  quality ${quality}  ${a.ms.toFixed(1)} ms/frame\n${s.join('\n')}\nkeys 1-6 views · O doors · H hide`;
  });
  return null;
}

function App() {
  const width = window.innerWidth;
  const cap = Q.maxWidth / Math.max(1, width);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[Math.min(Q.dpr[0], cap), Math.min(Q.dpr[1], cap)]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 120 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Suspense fallback={null}>
        <Setup />
        <hemisphereLight args={['#3a4660', '#1d140c', 0.32]} />
        <Room />
        <Consoles />
        <Doors />
        <Frames />
        <CameraRig />
        <Tweaks />
        <Hud />
        <EffectComposer multisampling={Q.msaa} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.32} darkness={0.62} />
          <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} premultiply />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
