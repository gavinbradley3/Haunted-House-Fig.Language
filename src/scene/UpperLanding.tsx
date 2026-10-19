/**
 * The Lady's private landing: an optional discovery at the top of the entrance hall stairs.
 *
 *  - Her own door (left) is locked. Light shows in the gap under it, and now and then something
 *    passes on the other side and the light breaks.
 *  - The other door (right) has been left ajar, warm light behind it. As you come close it swings
 *    quietly shut, and stays shut.
 *  - On a console under the landing's painting: a candle, and her diary, open at a page written the
 *    night she began the letter in the writing box downstairs.
 *
 * Nothing here is needed to finish the game; finding the diary is remembered and mentioned at the end.
 * No new lights: the candle is an emissive flame, and the landing is lit by the hall's chandelier.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame, type Note } from '../state/store';
import { audio } from '../systems/audio';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { showHouseCaption } from '../systems/soundCues';
import { world } from '../systems/time';
import { UPPER_BOXES, boxAt } from '../world/collision';
import { HALL } from '../world/layout';
import { DoorLeaf } from './parts/Door';
import { ConsoleTable } from './parts/Furnishings';
import { Interactive } from './Interactive';

const L = HALL.landing;
const BACK = HALL.zBack;
const LADY_X = -2.6;
const AJAR_X = 2.6;

/** Shared with the haunting director: when something last crossed behind the Lady's door. */
export const landingFx = { shadowStart: -1e9 };
export const LADY_DOOR_AT: [number, number, number] = [LADY_X, L.y + 0.5, BACK];

export const DIARY: Note = {
  kicker: 'Found on the upper landing',
  title: 'A page from the Lady’s diary',
  body: [
    'Tuesday. The moon hung over the garden again tonight, and nobody came up the drive.',
    'This landing is the only part of the upper floor I still walk. My rooms are behind these doors, and the rest is shut up under dust sheets, as quiet as a held breath.',
    'I have begun a letter for whoever comes next. I shall leave it in my writing box downstairs, where a visitor will find it, and I shall wait up here, where I can hear them come in.',
    'They say the stairs groan under every visitor. Tonight I listened for a long time, and they did not groan once.',
  ],
  ask: 'Strange language hides on this page too. Can you find a simile? And where does something that is not human act like a person?',
};

// The console under the painting stands in the way.
UPPER_BOXES.push(boxAt(0, BACK + 0.24, 1.3, 0.5));

/** A thin strip of warm light in the gap under a door; a shadow can cross it. */
function underDoorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uShadow: { value: -2 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uShadow; varying vec2 vUv;
      void main() {
        float flick = 0.85 + 0.1 * sin(uTime * 7.1) + 0.05 * sin(uTime * 17.3);
        float shade = 1.0 - 0.92 * exp(-pow((vUv.x - uShadow) / 0.16, 2.0));
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * 1.3 * flick * shade * edge, 1.0);
      }`,
    fog: false,
  });
}

/** Warm light seen through the gap of the door left ajar. */
function ajarGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, '#6a3a18');
  grad.addColorStop(0.45, '#3a1e0c');
  grad.addColorStop(1, '#0a0604');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function LadyDoor() {
  const strip = useMemo(underDoorMaterial, []);
  useFrame(() => {
    strip.uniforms.uTime.value = world.t;
    const u = (world.t - landingFx.shadowStart) / 1.6;
    strip.uniforms.uShadow.value = u >= 0 && u <= 1 ? -0.2 + u * 1.4 : -2;
  });
  return (
    <group>
      <group position={[LADY_X - 0.48, L.y + 0.016, BACK + 0.03]}>
        <Interactive
          id="landing-lady-door"
          label={() => 'Try the Lady’s door'}
          maxDist={2.6}
          onUse={() => {
            audio.locked([LADY_X, L.y + 1, BACK]);
            useGame.getState().showNotice('Locked.', 'The keyhole is cold, and it smells faintly of lavender.');
          }}
        >
          <DoorLeaf width={0.96} height={2.3} />
        </Interactive>
      </group>
      <mesh material={strip} position={[LADY_X, L.y + 0.009, BACK + 0.012]}>
        <planeGeometry args={[0.92, 0.016]} />
      </mesh>
    </group>
  );
}

function AjarDoor() {
  const leaf = useRef<THREE.Group>(null!);
  const shut = useGame((s) => !!s.found.landingDoorShut);
  const angle = useRef(shut ? 0 : -0.42);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ map: ajarGlowTexture(), toneMapped: true }), []);
  const glowMesh = useRef<THREE.Mesh>(null!);
  useFrame(({ camera }) => {
    // Coming close for the first time: it swings quietly shut, and stays shut.
    if (!game().found.landingDoorShut && game().upstairs && Math.hypot(camera.position.x - AJAR_X, camera.position.z - BACK) < 2.7) {
      useGame.getState().markFound('landingDoorShut');
      audio.doorClose([AJAR_X, L.y + 1, BACK]);
      showHouseCaption('The door swings quietly shut.');
    }
    const target = game().found.landingDoorShut ? 0 : -0.42;
    angle.current += (target - angle.current) * Math.min(1, world.dt * 2.2);
    leaf.current.rotation.y = angle.current;
    glowMesh.current.visible = angle.current < -0.03;
  });
  useEffect(() => {
    if (shut) angle.current = 0;
  }, [shut]);
  return (
    <group>
      <mesh ref={glowMesh} material={glow} position={[AJAR_X, L.y + 1.15, BACK + 0.012]}>
        <planeGeometry args={[0.94, 2.3]} />
      </mesh>
      <group ref={leaf} position={[AJAR_X - 0.48, L.y + 0.016, BACK + 0.03]}>
        <Interactive
          id="landing-ajar-door"
          label={() => (game().found.landingDoorShut ? 'Try the door' : null)}
          maxDist={2.6}
          onUse={() => {
            audio.locked([AJAR_X, L.y + 1, BACK]);
            useGame.getState().showNotice('It will not open now.', 'Somewhere beyond it, a music box plays two notes and stops.');
            window.setTimeout(() => audio.musicBox('two', [AJAR_X + 1.5, L.y + 1, BACK - 3], 0.45), 900);
          }}
        >
          <DoorLeaf width={0.96} height={2.3} />
        </Interactive>
      </group>
    </group>
  );
}

function DiaryAndCandle() {
  const m = mats();
  const stick = latheGeo('candlestick', LATHES.candlestick);
  const page = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.9 }), []);
  const flame = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = world.t;
    flame.current.scale.set(1, 0.85 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 15.7) * 0.05, 1);
  });
  const top = L.y + 0.84;
  return (
    <group>
      <ConsoleTable position={[0, L.y, BACK]} w={1.2} />
      {/* The candlestick, its candle and flame (no light of its own) */}
      <group position={[-0.42, top, BACK + 0.2]}>
        <mesh geometry={stick} material={m.brass} castShadow />
        <mesh material={m.ceramic} position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.09, 10]} />
        </mesh>
        <mesh ref={flame} material={m.flame} position={[0, 0.33, 0]}>
          <sphereGeometry args={[0.009, 8, 6]} />
        </mesh>
      </group>
      {/* The diary, lying open */}
      <Interactive
        id="landing-diary"
        label={() => 'Read the open diary'}
        maxDist={2.4}
        onUse={() => {
          audio.page([0.1, top, BACK + 0.25]);
          useGame.getState().setNote(DIARY);
          useGame.getState().markFound('diary');
        }}
      >
        <group position={[0.12, top + 0.012, BACK + 0.24]} rotation={[0, 0.18, 0]}>
          <mesh geometry={boxGeo(0.34, 0.02, 0.24, 'x')} material={m.velvetOx} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={boxGeo(0.155, 0.012, 0.22, 'x')} material={page} position={[s * 0.082, 0.014, 0]} rotation={[0, 0, s * -0.06]} />
          ))}
        </group>
      </Interactive>
    </group>
  );
}

/** Notes that the student has found the landing (the first time they reach it). */
function FirstVisit() {
  useFrame(() => {
    const s = game();
    if (s.upstairs && !s.found.landing && s.phase === 'play') s.markFound('landing');
  });
  return null;
}

export function UpperLanding() {
  return (
    <group>
      <LadyDoor />
      <AjarDoor />
      <DiaryAndCandle />
      <FirstVisit />
    </group>
  );
}
