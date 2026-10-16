import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { game, useGame } from '../state/store';
import { TEST_BUILD } from '../systems/testBuild';
import { mats } from '../systems/materials';
import { setMaxAnisotropy } from '../systems/textures';
import { shadowClock } from '../systems/time';
import { Corridor } from './Corridor';
import { DustMotes } from './Dust';
import { EntranceHall } from './EntranceHall';
import { Exterior } from './Exterior';
import { HallOfMirrors } from './HallOfMirrors';
import { Lighting } from './Lighting';
import { Player } from './Player';
import { Sky } from './Sky';
import { LessonCamera, LessonDirector } from '../lesson/director';
import { GalleryDirector } from '../lesson/galleryDirector';
import { PortraitGallery } from './PortraitGallery';
import { DiningRoom } from './DiningRoom';
import { RoomLights } from './RoomLights';
import { DiningDirector } from '../lesson/diningDirector';
import { Nursery } from './Nursery';
import { NurseryDirector } from '../lesson/nurseryDirector';
import { Finale } from './Finale';
import { FinaleDirector } from '../lesson/finaleDirector';
import { HouseEvents } from './HouseEvents';
import { ChamberOfEchoes } from './ChamberOfEchoes';
import { WhisperingPress } from './WhisperingPress';
import { CrookedKitchen } from './CrookedKitchen';
import { BallroomOfContradictions } from './BallroomOfContradictions';
import { ScholarsStudy } from './ScholarsStudy';
import { LaterDirectors } from '../lesson/laterDirector';
import { preloadArt } from './parts/Artwork';
import { renderer } from '../systems/renderer';

/** Builds materials/textures once the GL context exists, then reports ready. */
function Setup() {
  const { gl, scene, camera } = useThree();
  const setPhase = useGame((s) => s.setPhase);
  useMemo(() => {
    renderer.gl = gl;
    renderer.scene = scene;
    renderer.camera = camera;
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    mats();
  }, [gl, scene, camera]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.14;
    scene.fog = new THREE.FogExp2('#0b0d10', 0.028);
    scene.background = new THREE.Color('#05070a');
    gl.shadowMap.autoUpdate = false;
    // Paint the artwork in the background while the title screen is showing.
    preloadArt(['houseBreath', 'ladyOfHouse', 'whisperingWalls', 'coldFeet', 'caretaker', 'deafeningSilence', 'oldManShadow', 'nervousSitter', 'emptyCanvas', 'ladyOfHouseTurned']);
    gl.shadowMap.needsUpdate = true;
    // Two frames later the scene has compiled: show the title.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('boot')?.remove();
      if (game().phase === 'loading') setPhase('title');
    }));
    return () => {
      cancelAnimationFrame(id);
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, setPhase]);
  return null;
}

/**
 * Shadow maps are expensive; only refresh them when something that casts
 * shadows is moving (curtains, doors, cutscenes), otherwise a few times a second.
 */
function ShadowScheduler() {
  const { gl } = useThree();
  useFrame((_, dt) => {
    const s = game();
    shadowClock.t += dt;
    const moving = s.zone === 'mirrors' || s.cinematic !== null || shadowClock.doorsMoving > 0;
    if (moving || shadowClock.t > 0.25) {
      gl.shadowMap.needsUpdate = true;
      shadowClock.t = 0;
    }
    shadowClock.doorsMoving = Math.max(0, shadowClock.doorsMoving - 1);
  }, -2);
  return null;
}

/** Layer for meshes in areas the camera cannot see. The main camera only draws layer 0. */
const HIDDEN_LAYER = 5;

/**
 * Hide whole areas the camera cannot see to save draw calls.
 *
 * Meshes move to a layer the camera does not draw. Lights stay in the scene at zero
 * intensity: three.js compiles the number of lights into every material's shader,
 * so removing a room's lights would recompile the whole house (a visible stutter).
 */
type Area = 'exterior' | 'mirrors' | 'gallery' | 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study';

function Culling({ children, area }: { children: React.ReactNode; area: Area }) {
  const zone = useGame((s) => s.zone);
  const mirrorOpen = useGame((s) => s.doors.mirror);
  const frontOpen = useGame((s) => s.doors.front);
  const galleryOpen = useGame((s) => s.doors.gallery);
  const diningOpen = useGame((s) => s.doors.dining);
  const jibOpen = useGame((s) => s.doors.jib);
  const echoesOpen = useGame((s) => s.doors.echoes);
  const pressOpen = useGame((s) => s.doors.press);
  const kitchenOpen = useGame((s) => s.doors.kitchen);
  const ballroomOpen = useGame((s) => s.doors.ballroom);
  const studyOpen = useGame((s) => s.doors.study);
  let visible = true;
  if (area === 'gallery') visible = zone === 'gallery' || (zone === 'corridor' && galleryOpen);
  if (area === 'exterior') visible = zone === 'exterior' || zone === 'hall' || (zone === 'corridor' && frontOpen);
  if (area === 'mirrors') visible = zone === 'mirrors' || zone === 'corridor' || zone === 'nursery' || (zone === 'hall' && mirrorOpen);
  if (area === 'dining') visible = zone === 'dining' || (zone === 'corridor' && diningOpen) || (zone === 'ballroom' && ballroomOpen);
  if (area === 'nursery') visible = zone === 'nursery' || (zone === 'mirrors' && jibOpen) || (zone === 'echoes' && echoesOpen);
  if (area === 'echoes') visible = zone === 'echoes' || (zone === 'nursery' && echoesOpen) || (zone === 'press' && pressOpen);
  if (area === 'press') visible = zone === 'press' || (zone === 'echoes' && pressOpen);
  if (area === 'kitchen') visible = zone === 'kitchen' || (zone === 'hall' && kitchenOpen);
  if (area === 'study') visible = zone === 'study' || (zone === 'hall' && studyOpen);
  if (area === 'ballroom') visible = zone === 'ballroom' || (zone === 'dining' && ballroomOpen);
  const group = useRef<THREE.Group>(null!);
  const st = useMemo(() => ({ shown: true, lights: [] as THREE.Light[], frames: 0, dirty: true }), []);
  if (st.shown !== visible) {
    st.shown = visible;
    st.dirty = true;
  }
  // Runs after the fixtures set their own intensities (priority 0) and before the
  // effect composer renders the frame (priority 1).
  useFrame(() => {
    // Re-walk the tree now and then so newly mounted objects follow the area's state.
    if (st.dirty || ++st.frames % 30 === 0) {
      st.dirty = false;
      st.lights = [];
      group.current.traverse((o) => {
        if ((o as THREE.Light).isLight) st.lights.push(o as THREE.Light);
        else if (o !== group.current) o.layers.set(st.shown ? 0 : HIDDEN_LAYER);
      });
    }
    for (const l of st.lights) {
      const shadow = (l as THREE.PointLight).shadow as THREE.LightShadow | undefined;
      if (st.shown) {
        if (l.userData.culledFrom !== undefined) {
          l.intensity = l.userData.culledFrom;
          delete l.userData.culledFrom;
          if (shadow) shadow.needsUpdate = true;
        }
      } else {
        if (l.userData.culledFrom === undefined) l.userData.culledFrom = l.intensity;
        l.intensity = 0;
      }
      if (shadow) shadow.autoUpdate = st.shown;
    }
  }, 0.5);
  return <group ref={group}>{children}</group>;
}

/**
 * Compile every material in the house while the title screen is up, so walking into
 * a room for the first time does not stall while its shaders compile. Also uploads
 * every texture to the GPU ahead of time.
 */
function Precompile() {
  const { gl, scene, camera } = useThree();
  const phase = useGame((s) => s.phase);
  const done = useRef(false);
  useEffect(() => {
    if (phase !== 'title' || done.current) return;
    done.current = true;
    const id = window.setTimeout(() => {
      // The scene renders into the effect composer's buffer, never straight to the
      // screen, and shader variants differ between the two. Compile for a buffer.
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(target);
      const ready = gl.compileAsync(scene, camera);
      gl.setRenderTarget(prev);
      const seen = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          for (const v of Object.values(m)) {
            if ((v as THREE.Texture)?.isTexture && !seen.has(v as THREE.Texture)) {
              seen.add(v as THREE.Texture);
              gl.initTexture(v as THREE.Texture);
            }
          }
        }
      });
      void ready.finally(() => target.dispose());
    }, 1200);
    return () => clearTimeout(id);
  }, [phase, gl, scene, camera]);
  return null;
}

/**
 * Watches the frame rate during play; if the computer is struggling, step quality
 * down one level (at most once every few seconds). Manual choices switch this off.
 */
function FpsGuard() {
  const acc = useMemo(() => ({ t: 0, frames: 0, bad: 0 }), []);
  const testing = useMemo(() => TEST_BUILD && new URLSearchParams(location.search).has('testdt'), []);
  useFrame((_, dt) => {
    const s = game();
    if (testing || !s.autoQuality || s.phase !== 'play' || s.quality === 'low' || document.hidden) return;
    acc.t += dt;
    acc.frames++;
    if (acc.t < 4) return;
    const fps = acc.frames / acc.t;
    acc.t = 0;
    acc.frames = 0;
    acc.bad = fps < 34 ? acc.bad + 1 : 0;
    if (acc.bad >= 2) {
      acc.bad = 0;
      useGame.getState().setQuality(s.quality === 'high' ? 'balanced' : 'low', true);
      console.info(`[quality] average ${fps.toFixed(0)} fps, lowering graphics quality`);
    }
  });
  return null;
}

export const QUALITY = {
  high: { dpr: [1, 1.5] as [number, number], msaa: 4, ao: 'performance' as const, reflect: 0.5, maxWidth: Infinity },
  // No ambient occlusion: on integrated graphics it re-draws the whole scene and costs as much as everything else.
  balanced: { dpr: [1, 1] as [number, number], msaa: 2, ao: null, reflect: 0.35, maxWidth: 1600 },
  // On a large projector screen, Low draws at most about 1280 pixels across and scales up.
  low: { dpr: [0.8, 0.8] as [number, number], msaa: 0, ao: null, reflect: 0.25, maxWidth: 1280 },
};

/** The device-pixel-ratio range for a quality, capped so wide screens do not multiply the pixel count. */
function dprFor(q: (typeof QUALITY)[keyof typeof QUALITY], width: number): [number, number] {
  const cap = q.maxWidth / Math.max(1, width);
  return [Math.min(q.dpr[0], cap), Math.min(q.dpr[1], cap)];
}

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

export function GameCanvas() {
  const quality = useGame((s) => s.quality);
  const q = QUALITY[quality];
  const width = useWindowWidth();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={dprFor(q, width)}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 420, position: [0, 3, 30] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Suspense fallback={null}>
        <Setup />
        <ShadowScheduler />
        <Sky />
        <Lighting />
        <Culling area="exterior">
          <Exterior />
        </Culling>
        <EntranceHall />
        <Finale />
        <Corridor />
        <Culling area="mirrors">
          <HallOfMirrors />
        </Culling>
        <Culling area="gallery">
          <PortraitGallery />
        </Culling>
        <Culling area="dining">
          <DiningRoom />
        </Culling>
        <Culling area="nursery">
          <Nursery />
        </Culling>
        <Culling area="echoes">
          <ChamberOfEchoes />
        </Culling>
        <Culling area="press">
          <WhisperingPress />
        </Culling>
        <Culling area="kitchen">
          <CrookedKitchen />
        </Culling>
        <Culling area="ballroom">
          <BallroomOfContradictions />
        </Culling>
        <Culling area="study">
          <ScholarsStudy />
        </Culling>
        <RoomLights />
        <DustMotes />
        <Player />
        <LessonDirector />
        <GalleryDirector />
        <DiningDirector />
        <NurseryDirector />
        <FinaleDirector />
        <LaterDirectors />
        <LessonCamera />
        <HouseEvents />
        <FpsGuard />
        <Precompile />
        <EffectComposer multisampling={q.msaa} enableNormalPass={false} key={quality}>
          {q.ao ? <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={0.6} halfRes quality={q.ao} color="#050302" /> : <></>}
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.32} darkness={0.62} />
          <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} premultiply />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
