import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { game, useGame } from '../state/store';
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
import { LessonDirector } from '../lesson/director';

/** Builds materials/textures once the GL context exists, then reports ready. */
function Setup() {
  const { gl, scene } = useThree();
  const setPhase = useGame((s) => s.setPhase);
  useMemo(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    mats();
  }, [gl]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.14;
    scene.fog = new THREE.FogExp2('#0b0d10', 0.028);
    scene.background = new THREE.Color('#05070a');
    gl.shadowMap.autoUpdate = false;
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

/** Hide whole areas the camera cannot see to save draw calls. */
function Culling({ children, area }: { children: React.ReactNode; area: 'exterior' | 'mirrors' }) {
  const zone = useGame((s) => s.zone);
  const mirrorOpen = useGame((s) => s.doors.mirror);
  const frontOpen = useGame((s) => s.doors.front);
  let visible = true;
  if (area === 'exterior') visible = zone === 'exterior' || zone === 'hall' || (zone === 'corridor' && frontOpen);
  if (area === 'mirrors') visible = zone === 'mirrors' || zone === 'corridor' || (zone === 'hall' && mirrorOpen);
  return <group visible={visible}>{children}</group>;
}

/**
 * Watches the frame rate during play; if the computer is struggling, step quality
 * down one level (at most once every few seconds). Manual choices switch this off.
 */
function FpsGuard() {
  const acc = useMemo(() => ({ t: 0, frames: 0, bad: 0 }), []);
  const testing = useMemo(() => new URLSearchParams(location.search).has('testdt'), []);
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
  high: { dpr: [1, 1.5] as [number, number], msaa: 4, ao: 'medium' as const, reflect: 0.5 },
  balanced: { dpr: [1, 1] as [number, number], msaa: 2, ao: 'low' as const, reflect: 0.35 },
  low: { dpr: [0.8, 0.8] as [number, number], msaa: 0, ao: null, reflect: 0.25 },
};

export function GameCanvas() {
  const quality = useGame((s) => s.quality);
  const q = QUALITY[quality];
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={q.dpr}
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
        <Corridor />
        <Culling area="mirrors">
          <HallOfMirrors />
        </Culling>
        <DustMotes />
        <Player />
        <LessonDirector />
        <FpsGuard />
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
