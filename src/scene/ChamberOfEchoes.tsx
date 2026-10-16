/**
 * Room 5: the Chamber of Echoes (ONOMATOPOEIA). A Victorian music room south of the Nursery.
 * Objects make sounds by themselves; each sound has a caption and makes its object glow,
 * so the room works for students who cannot hear it. Lit by the shared room lights only.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { efx, glow, pulse } from '../lesson/laterFx';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { registerCue } from '../systems/soundCues';
import { softDot } from '../systems/textures';
import { world } from '../systems/time';
import { ECHOES, NURSERY, PRESS, WALL_T } from '../world/layout';
import { Wall } from './parts/Architecture';
import { KeyedDoor } from './parts/KeyedDoor';
import { Easel } from './parts/Easel';
import { Candelabrum, Rug } from './parts/Furnishings';
import { CollectibleKey } from './parts/Key';
import { RoomShell } from './parts/RoomShell';
import { Interactive } from './Interactive';

type V3 = [number, number, number];
const PIANO: V3 = [ECHOES.piano.x, 1.0, ECHOES.piano.z];
const PIPE: V3 = [ECHOES.bucket.x, 0.5, ECHOES.bucket.z];
const GRAM: V3 = [ECHOES.gramophone.x, 1.1, ECHOES.gramophone.z];
const ORGAN: V3 = [ECHOES.organ.x, 0.7, ECHOES.organ.z];

/** A soft halo that brightens while its object is making a sound. */
function Glow({ id, position, size = 0.9 }: { id: string; position: V3; size?: number }) {
  const ref = useRef<THREE.Sprite>(null!);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color('#ffd79a'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useFrame(() => {
    const g = (glow[id] = Math.max(0, (glow[id] ?? 0) - world.dt * 0.45));
    mat.opacity = Math.min(0.85, g);
    ref.current.scale.setScalar(size * (0.8 + g * 0.4));
  });
  return <sprite ref={ref} material={mat} position={position} />;
}

/** The sounds this room can make: what plays, and what it looks like (captions are shown on screen). */
function Cues() {
  useEffect(() => {
    const offs = [
      registerCue('drip', 'Drops of water falling into a metal bucket, one after another.', () => {
        audio.drip(PIPE, 3);
        pulse('pipe');
      }),
      registerCue('hiss', 'A soft, steady rush of air from the gramophone’s horn.', () => {
        audio.hiss(GRAM);
        pulse('gram');
      }),
      registerCue('tick', 'Short, sharp clicks at a steady beat, from the metronome.', () => {
        audio.tickTock([PIANO[0], 1.4, PIANO[2]], 6);
        pulse('metronome');
      }),
      registerCue('creak', 'A long, slow, wooden groan from the organ bench.', () => {
        audio.creakLong(ORGAN);
        pulse('organ');
      }),
      registerCue('knock', 'Two heavy, hollow raps on wood, from inside the piano.', () => {
        audio.knock(PIANO);
        pulse('piano');
      }),
      registerCue('thud', 'A dull, heavy bump, like a door closing far away.', () => audio.thudFar([ECHOES.x0 + 1, 3, ECHOES.zN])),
      registerCue('splash', 'Something heavy hitting deep water, far below.', () => audio.splash([ECHOES.x1, 0, ECHOES.zS])),
    ];
    return () => offs.forEach((o) => o());
  }, []);
  // While the class explores, the pipe drips now and then, until the room falls silent.
  const t = useRef(6);
  useFrame(() => {
    if (game().zone !== 'echoes' || world.dt === 0 || game().lessonActive || efx.silent) return;
    t.current -= world.dt;
    if (t.current > 0) return;
    t.current = 14 + Math.random() * 12;
    audio.drip(PIPE, 2);
    pulse('pipe', 0.6);
  });
  return null;
}

function Piano() {
  const m = mats();
  const arm = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const done = useGame((s) => s.progress.completed.echoes);
  useFrame(() => {
    // The metronome swings faster while its sound plays; the lid jumps when something knocks inside.
    arm.current.rotation.z = Math.sin(world.t * (2 + (glow.metronome ?? 0) * 4)) * 0.4;
    lid.current.rotation.z = (glow.piano ?? 0) * 0.1 * Math.abs(Math.sin(world.t * 30));
  });
  const leg = latheGeo('tableLeg', LATHES.tableLeg);
  return (
    <group position={[ECHOES.piano.x, 0, ECHOES.piano.z]}>
      {[
        [-0.55, -0.75],
        [0.55, -0.75],
        [0, 0.75],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={m.blackPaint} position={[x, 0, z]} scale={[1.6, 1.0, 1.6]} castShadow />
      ))}
      <Interactive id="echoes-piano" maxDist={3.2} label={() => (game().lessonActive || done ? null : 'Use the piano')} onUse={() => openLesson('echoes')}>
        <mesh geometry={boxGeo(1.35, 0.32, 1.75)} material={m.blackPaint} position={[0, 0.88, 0]} castShadow receiveShadow />
      </Interactive>
      {/* Keyboard along the east side, facing the room */}
      <mesh geometry={boxGeo(0.16, 0.05, 1.3)} material={m.linen} position={[0.74, 0.86, 0]} />
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} geometry={boxGeo(0.09, 0.03, 0.045)} material={m.blackPaint} position={[0.72, 0.9, -0.6 + i * 0.093]} />
      ))}
      {/* Propped lid */}
      <group ref={lid} position={[-0.67, 1.04, 0]} rotation={[0, 0, 0]}>
        <group rotation={[0, 0, 0.55]}>
          <mesh geometry={boxGeo(1.3, 0.03, 1.7)} material={m.blackPaint} position={[0.65, 0, 0]} castShadow />
        </group>
      </group>
      {/* Metronome on the closed end */}
      <group position={[0.35, 1.04, -0.65]}>
        <mesh material={m.walnut} castShadow>
          <coneGeometry args={[0.08, 0.24, 4]} />
        </mesh>
        <group ref={arm} position={[0, -0.08, 0.04]}>
          <mesh geometry={boxGeo(0.008, 0.22, 0.008)} material={m.brass} position={[0, 0.11, 0]} />
        </group>
      </group>
      <Candelabrum position={[0.3, 1.04, 0.55]} seed={81} light={false} />
      {/* The Bell Key appears on the piano once the room is complete */}
      <group position={[0.35, 1.045, -0.15]} rotation={[-Math.PI / 2, 0, 0.6]}>
        <CollectibleKey keyId="echoesKey" variant="mirror" tint="#c9a65a" />
      </group>
      <Glow id="piano" position={[0, 1.3, 0]} size={2.2} />
      <Glow id="metronome" position={[0.35, 1.2, -0.65]} size={0.7} />
    </group>
  );
}

/** A pipe along the ceiling that drips into a bucket by the door. */
function DrippingPipe() {
  const m = mats();
  const drop = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    // A drop falls whenever the pipe is glowing (dripping).
    const g = glow.pipe ?? 0;
    const phase = (world.t * 1.2) % 1;
    drop.current.visible = g > 0.05;
    drop.current.position.y = 3.25 - phase * 2.85;
  });
  const { x, z } = ECHOES.bucket;
  return (
    <group>
      <mesh material={m.copper} position={[x - 1.1, 3.5, z + 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 10]} />
      </mesh>
      <mesh material={m.copper} position={[x, 3.38, z + 0.05]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.25, 10]} />
      </mesh>
      <mesh ref={drop} material={m.glass} position={[x, 3.2, z + 0.05]}>
        <sphereGeometry args={[0.018, 8, 6]} />
      </mesh>
      <mesh material={m.iron} position={[x, 0.17, z]} castShadow>
        <cylinderGeometry args={[0.17, 0.14, 0.34, 18, 1, true]} />
      </mesh>
      <mesh material={m.soot} position={[x, 0.24, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 18]} />
      </mesh>
      <Glow id="pipe" position={[x, 0.6, z]} size={1.0} />
    </group>
  );
}

function Gramophone() {
  const m = mats();
  const { x, z } = ECHOES.gramophone;
  return (
    <group position={[x, 0, z]} rotation={[0, -2.4, 0]}>
      <mesh geometry={boxGeo(0.6, 0.72, 0.6)} material={m.walnut} position={[0, 0.36, 0]} castShadow />
      <mesh geometry={boxGeo(0.4, 0.14, 0.4)} material={m.mahogany} position={[0, 0.79, 0]} castShadow />
      <mesh material={m.blackPaint} position={[0, 0.87, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.01, 24]} />
      </mesh>
      <mesh material={m.brass} position={[0.05, 1.0, 0.05]} rotation={[0.6, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
      </mesh>
      {/* The horn */}
      <mesh material={m.brass} position={[0.05, 1.3, 0.28]} rotation={[-1.1, 0, 0]} castShadow>
        <coneGeometry args={[0.3, 0.6, 24, 1, true]} />
      </mesh>
      <Glow id="gram" position={[0.05, 1.3, 0.3]} size={1.2} />
    </group>
  );
}

function Organ() {
  const m = mats();
  const { x, z } = ECHOES.organ;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={boxGeo(1.4, 1.1, 0.55, 'x')} material={m.walnutPanel} position={[0, 0.55, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(1.4, 0.7, 0.3, 'x')} material={m.walnut} position={[0, 1.45, -0.12]} castShadow />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} material={m.gilt} position={[-0.5 + i * 0.125, 1.95 + Math.sin(i * 0.7) * 0.1, -0.12]}>
          <cylinderGeometry args={[0.025, 0.025, 0.55 + Math.sin(i * 0.7) * 0.2, 8]} />
        </mesh>
      ))}
      <mesh geometry={boxGeo(1.2, 0.05, 0.16)} material={m.linen} position={[0, 0.98, 0.3]} />
      {/* The bench that creaks */}
      <mesh geometry={boxGeo(0.9, 0.06, 0.35, 'x')} material={m.walnut} position={[0, 0.48, 0.75]} castShadow />
      {[-0.38, 0.38].map((bx) => (
        <mesh key={bx} geometry={boxGeo(0.05, 0.46, 0.3)} material={m.walnut} position={[bx, 0.23, 0.75]} />
      ))}
      <Glow id="organ" position={[0, 0.9, 0.6]} size={1.6} />
    </group>
  );
}

export function ChamberOfEchoes() {
  const m = mats();
  return (
    <group>
      <Cues />
      <RoomShell
        x0={ECHOES.x0}
        x1={ECHOES.x1}
        zN={ECHOES.zN}
        zS={ECHOES.zS}
        height={ECHOES.height}
        wall={m.wallEchoes}
        floor={m.parquet}
        own={['E', 'S', 'W']}
        doors={[
          { side: 'N', at: ECHOES.doorX, width: 0.96 },
          { side: 'W', at: PRESS.doorZ, width: 0.96 },
        ]}
        windows={[{ side: 'E', at: -34.0, width: 1.2, sill: 0.9, top: 3.0 }]}
        outside={{ W: m.wallPress }}
        rail={3.0}
      />
      {/* This room is taller than the nursery: close the gap above the nursery's wall. */}
      <Wall axis="x" from={ECHOES.x0 - WALL_T} to={ECHOES.x1 + WALL_T} at={ECHOES.zN + WALL_T / 2} y0={NURSERY.height} height={ECHOES.height - NURSERY.height} matPos={m.brick} matNeg={m.wallEchoes} />
      {/* Room 6, the printing room, through the west wall */}
      <KeyedDoor
        id="press-door"
        door="press"
        lock="press"
        room="The Whispering Press"
        inside="press"
        hinge={[ECHOES.x0 - WALL_T / 2, 0, PRESS.doorZ + 0.48]}
        rotationY={Math.PI / 2}
        width={0.96}
        height={2.3}
        lockedHint={() => (game().progress.completed.echoes ? 'Did you take the key from the piano?' : 'Behind the door, something thumps in a steady rhythm.')}
      />
      <Rug position={[-8.8, 0, -32.4]} w={3.6} d={3.2} material={m.rugMirror} />
      <Piano />
      <DrippingPipe />
      <Gramophone />
      <Organ />
      <Easel position={[ECHOES.board.x, 0, ECHOES.board.z]} rotationY={-Math.PI / 2} heading="The Midnight Score" text={() => efx.board} style="ink" />
    </group>
  );
}
