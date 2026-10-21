/**
 * Room 8: the Ballroom of Contradictions (OXYMORON). South of the Dining Room.
 * A decayed ballroom where contradictions become visible: frozen fire in the candelabra,
 * dancers that waltz in a deafening silence, an open secret in a glass case.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { bfx } from '../lesson/laterFx';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boardText } from '../systems/boardText';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { BALLROOM, DINING, WALL_T } from '../world/layout';
import { Wall } from './parts/Architecture';
import { flicker } from './parts/Lights';
import { Easel } from './parts/Easel';
import { Chandelier } from './parts/Lights';
import { CollectibleKey } from './parts/Key';
import { RoomShell } from './parts/RoomShell';
import { Interactive } from './Interactive';

const flameGeo = new THREE.SphereGeometry(0.02, 10, 8);
flameGeo.scale(1, 2.6, 1);
flameGeo.translate(0, 0.045, 0);

/** A tall candle stand whose flames freeze, blue and still, once "frozen fire" is understood. */
function FrozenFireStand({ x, z, seed }: { x: number; z: number; seed: number }) {
  const m = mats();
  const flames = useRef<THREE.Mesh[]>([]);
  const ped = latheGeo('pedestal', LATHES.pedestal);
  useFrame(() => {
    const frozen = bfx.shown.has('fire');
    flames.current.forEach((f, i) => {
      if (!f) return;
      f.material = frozen ? m.coldFlame : m.flame;
      const k = frozen ? 1 : flicker(world.t, seed + i);
      f.scale.set(1, k, 1);
    });
  });
  const arms = [-0.24, -0.12, 0, 0.12, 0.24];
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={ped} material={m.gilt} scale={[0.5, 1.6, 0.5]} castShadow />
      <mesh geometry={boxGeo(0.56, 0.03, 0.05, 'x')} material={m.gilt} position={[0, 1.62, 0]} />
      {arms.map((ax, i) => (
        <group key={ax} position={[ax, 1.64 + (i === 2 ? 0.06 : 0), 0]}>
          <mesh material={m.wax} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.014, 0.015, 0.16, 10]} />
          </mesh>
          <mesh
            ref={(r) => {
              if (r) flames.current[i] = r;
            }}
            geometry={flameGeo}
            material={m.flame}
            position={[0, 0.16, 0]}
          />
        </group>
      ))}
    </group>
  );
}

/** Turn a radius profile [r, y] into a surface of revolution, with optional vertical folds. */
function lathe(profile: [number, number][], segments: number, folds = 0, foldDepth = 0, squashZ = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  const p = g.attributes.position as THREE.BufferAttribute;
  const ys = profile.map(([, y]) => y);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    // Folds are deepest at the hem and vanish at the waist, like real pleats falling from a waistband.
    // (Positions are 32-bit floats, so clamp: a tiny negative base to a fractional power is NaN.)
    const k = folds ? 1 + foldDepth * Math.sin(a * folds) * Math.max(0, (y1 - y) / (y1 - y0)) ** 1.3 : 1;
    p.setXYZ(i, x * k, y, z * k * squashZ);
  }
  g.computeVertexNormals();
  return g;
}

const GOWN = {
  // A crinoline skirt: a wide bell from the floor to a narrow waist.
  skirt: lathe(
    [
      [0.47, 0.0],
      [0.5, 0.05],
      [0.49, 0.2],
      [0.45, 0.38],
      [0.37, 0.58],
      [0.26, 0.77],
      [0.17, 0.92],
      [0.135, 0.99],
    ],
    44,
    14,
    0.06,
  ),
  // A fitted bodice on the dress form: waist, bust, shoulders, the padded neck.
  bodice: lathe(
    [
      [0.135, 0.98],
      [0.122, 1.04],
      [0.145, 1.14],
      [0.172, 1.25],
      [0.166, 1.32],
      [0.185, 1.39],
      [0.13, 1.45],
      [0.05, 1.48],
      [0.0, 1.485],
    ],
    28,
    0,
    0,
    0.72,
  ),
};

/** A dressmaker's form wearing a crinoline ball gown: bodice, pleated bell skirt, off-shoulder bertha, puffed sleeves. */
export function DressForm({ color, trim }: { color: THREE.Material; trim: THREE.Material }) {
  const m = mats();
  return (
    <group>
      <mesh geometry={GOWN.skirt} material={color} castShadow receiveShadow />
      <mesh geometry={GOWN.bodice} material={color} castShadow />
      {/* Waist sash and bow */}
      <mesh material={trim} position={[0, 1.03, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.74, 1]}>
        <torusGeometry args={[0.128, 0.018, 6, 24]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={trim} position={[s * 0.05, 1.03, -0.1]} rotation={[0, 0, s * 0.6]} scale={[1.4, 0.8, 0.5]}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      ))}
      {/* Off-shoulder bertha and puffed sleeves */}
      <mesh material={trim} position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.74, 1]}>
        <torusGeometry args={[0.18, 0.022, 6, 28]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={color} position={[s * 0.205, 1.36, 0]} scale={[0.9, 0.75, 0.85]} castShadow>
          <sphereGeometry args={[0.07, 12, 8]} />
        </mesh>
      ))}
      {/* The form's turned walnut neck post and finial (a dress form has no head) */}
      <mesh material={m.walnut} position={[0, 1.53, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.1, 10]} />
      </mesh>
      <mesh material={m.walnut} position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>
    </group>
  );
}

/** Two dress forms waltzing on their own; they stop dead in the deafening silence. */
function Dancers() {
  const m = mats();
  const ring = useRef<THREE.Group>(null!);
  const done = useGame((s) => s.progress.completed.ballroom);
  useFrame(() => {
    bfx.waltz += (bfx.waltzTarget - bfx.waltz) * (1 - Math.exp(-world.dt * 2.5));
    ring.current.rotation.y += world.dt * 0.55 * bfx.waltz;
    ring.current.children.forEach((c, i) => (c.rotation.y += world.dt * 1.4 * bfx.waltz * (i ? -1 : 1)));
  });
  return (
    <group position={[BALLROOM.dancers.x, 0, BALLROOM.dancers.z]}>
      <Interactive id="ballroom-dancers" maxDist={3.5} label={() => (game().lessonActive || done ? null : 'Look at the dancers')} onUse={() => openLesson('ballroom')}>
        <group ref={ring}>
          <group position={[0.47, 0, 0]}>
            <DressForm color={m.dressFabric} trim={m.velvetOx} />
          </group>
          <group position={[-0.47, 0, 0]}>
            <DressForm color={m.velvetOx} trim={m.brass} />
          </group>
        </group>
      </Interactive>
    </group>
  );
}

/** The open secret: a sealed letter in a glass case that glows once the oxymoron is found. The key is under it. */
function SecretCase() {
  const m = mats();
  const lid = useRef<THREE.Group>(null!);
  const open = useRef(0);
  const letterMat = useMemo(() => {
    const t = boardText('Sealed', 'Everyone knows. No one says.', 1.4, 'ink');
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.9 });
  }, []);
  useFrame(() => {
    letterMat.emissiveIntensity = bfx.shown.has('secret') ? 0.6 + Math.sin(world.t * 2) * 0.15 : 0;
    open.current += (bfx.caseTarget - open.current) * (1 - Math.exp(-world.dt * 1.5));
    lid.current.rotation.x = -open.current * 1.3;
  });
  return (
    <group position={[BALLROOM.secret.x, 0, BALLROOM.secret.z]}>
      <mesh geometry={boxGeo(0.9, 0.9, 0.6)} material={m.walnutPanel} position={[0, 0.45, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(0.8, 0.02, 0.5)} material={m.velvetOx} position={[0, 0.91, 0]} />
      <mesh material={letterMat} position={[-0.12, 0.925, 0]} rotation={[-Math.PI / 2, 0, 0.1]}>
        <planeGeometry args={[0.36, 0.26]} />
      </mesh>
      <group position={[0.22, 0.925, 0.05]} rotation={[-Math.PI / 2, 0, -0.5]}>
        <CollectibleKey keyId="ballroomKey" variant="mirror" tint="#c9c9c4" />
      </group>
      {/* Glass walls and a hinged glass lid */}
      <mesh geometry={boxGeo(0.84, 0.32, 0.54)} material={m.glass} position={[0, 1.07, 0]} />
      <group ref={lid} position={[0, 1.23, -0.27]}>
        <mesh geometry={boxGeo(0.86, 0.02, 0.56)} material={m.glass} position={[0, 0, 0.28]} />
        <mesh geometry={boxGeo(0.86, 0.03, 0.03)} material={m.gilt} position={[0, 0, 0.55]} />
      </group>
    </group>
  );
}

/** Chairs under dust sheets along the walls. */
/** A dust sheet thrown over a chair: the covered seat with folds falling to the floor, and the covered back. */
const SHEET = {
  seat: lathe(
    [
      [0.37, 0.0],
      [0.36, 0.12],
      [0.33, 0.34],
      [0.29, 0.45],
      [0.2, 0.5],
      [0.0, 0.51],
    ],
    28,
    9,
    0.09,
    0.92,
  ),
  back: lathe(
    [
      [0.25, 0.42],
      [0.25, 0.66],
      [0.23, 0.86],
      [0.17, 0.97],
      [0.07, 1.01],
      [0.0, 1.02],
    ],
    24,
    5,
    0.05,
    0.32,
  ),
};

function DustSheets() {
  const m = mats();
  const spots: [number, number][] = [
    [BALLROOM.x0 + 0.5, -21.5],
    [BALLROOM.x0 + 0.5, -23.0],
    [BALLROOM.x0 + 0.5, -29.5],
    [BALLROOM.x1 - 0.5, -20.5],
    [BALLROOM.x1 - 0.5, -25.5],
    [BALLROOM.x1 - 0.5, -30.5],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        // Chairs along the walls face into the room; each sits a little askew.
        <group key={i} position={[x, 0, z]} rotation={[0, (x < BALLROOM.x0 + 1 ? Math.PI / 2 : -Math.PI / 2) + (i % 3) * 0.12 - 0.12, 0]}>
          <mesh geometry={SHEET.seat} material={m.linen} castShadow receiveShadow />
          <mesh geometry={SHEET.back} material={m.linen} position={[0, 0, -0.2]} castShadow />
        </group>
      ))}
    </group>
  );
}

/** Now and then, a faint waltz from nowhere, while the dancers still dance. */
function PhantomWaltz() {
  const t = useRef(4);
  useFrame(() => {
    if (game().zone !== 'ballroom' || world.dt === 0 || game().lessonActive || bfx.waltzTarget < 0.5) return;
    t.current -= world.dt;
    if (t.current > 0) return;
    t.current = 24 + Math.random() * 16;
    audio.musicBox('dance', [BALLROOM.dancers.x, 2, BALLROOM.dancers.z], 0.35);
  });
  return null;
}

export function BallroomOfContradictions() {
  const m = mats();
  return (
    <group>
      <PhantomWaltz />
      <RoomShell
        x0={BALLROOM.x0}
        x1={BALLROOM.x1}
        zN={BALLROOM.zN}
        zS={BALLROOM.zS}
        height={BALLROOM.height}
        wall={m.wallBallroom}
        floor={m.parquet}
        own={['W', 'E', 'S']}
        doors={[{ side: 'N', at: BALLROOM.doorX, width: 0.96 }]}
        windows={BALLROOM.windows.map((z) => ({ side: 'E' as const, at: z, width: 1.4, sill: 0.8, top: 4.3 }))}
        wainscot={1.2}
        rail={4.6}
        trim={m.gilt}
      />
      {/* This room is taller than the dining room: close the gap above the dining room's wall. */}
      <Wall axis="x" from={BALLROOM.x0 - WALL_T} to={BALLROOM.x1 + WALL_T} at={BALLROOM.zN + WALL_T / 2} y0={DINING.height} height={BALLROOM.height - DINING.height} matPos={m.brick} matNeg={m.wallBallroom} />
      <Chandelier position={[8.8, BALLROOM.height, -22.6]} drop={1.8} arms={12} radius={0.85} light={false} seed={91} />
      <Chandelier position={[8.8, BALLROOM.height, -28.4]} drop={1.8} arms={12} radius={0.85} light={false} seed={93} />
      {BALLROOM.candles.map(([x, z], i) => (
        <FrozenFireStand key={x} x={x} z={z} seed={95 + i * 3} />
      ))}
      <Dancers />
      <SecretCase />
      <DustSheets />
      <Easel position={[BALLROOM.board.x, 0, BALLROOM.board.z]} rotationY={Math.PI / 2} heading="The Last Dance Card" text={() => bfx.board} style="ink" />
    </group>
  );
}
