/**
 * Room 3: the Giant's Dining Room (HYPERBOLE).
 * A long table for ordinary guests runs toward a giant's place: a chair three times
 * human size, a plate a metre wide under a silver cloche, cutlery taller than a person.
 * Hyperbole distorts scale here: dishes grow when the class finds an exaggeration.
 *
 * Lit only by the two shared room lights (scene/RoomLights.tsx); candles are emissive.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dfx, DISHES, type Dish } from '../lesson/diningFx';
import { openLesson } from '../lesson/director';
import { game, useGame } from '../state/store';
import { boardText } from '../systems/boardText';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { BALLROOM, CORRIDOR, DINING, WALL_T } from '../world/layout';
import { KeyedDoor } from './parts/KeyedDoor';
import { Architrave, Cornice, OnWall, Run, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Candelabrum, Painting, Rug, SashWindow, SideChair } from './parts/Furnishings';
import { Chandelier } from './parts/Lights';
import { CollectibleKey } from './parts/Key';
import { Interactive } from './Interactive';

const { x0, x1, zN, zS, height: H } = DINING;
const T = DINING.table;
const TOP = T.h + 0.005;
const DOOR_W = 0.96;
const WIN = { w: 1.45, b: 1.0, t: 3.5 };

/** A dish that grows when its place card is called a hyperbole. */
function GrowingDish({ dish, position, children }: { dish: Dish; position: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    const k = 1 - Math.exp(-world.dt * 2.2);
    dfx.grow[dish] += (dfx.growTarget[dish] - dfx.grow[dish]) * k;
    const s = dfx.grow[dish] * (1 + dfx.swell * 0.9);
    ref.current.scale.setScalar(s);
    // A trembling dish when the table rattles
    ref.current.rotation.z = dfx.rattle > 0 ? Math.sin(world.t * 61 + position[0]) * 0.03 * Math.min(1, dfx.rattle) : 0;
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function Table() {
  const m = mats();
  const len = T.x1 - T.x0;
  const cx = (T.x0 + T.x1) / 2;
  const leg = latheGeo('tableLeg', LATHES.tableLeg);
  const legXs = [T.x0 + 0.2, T.x0 + len / 3, T.x0 + (2 * len) / 3, T.x1 - 0.2];
  return (
    <group>
      <mesh geometry={boxGeo(len, 0.06, T.w, 'x')} material={m.mahogany} position={[cx, T.h - 0.03, T.z]} castShadow receiveShadow />
      <mesh geometry={boxGeo(len - 0.2, 0.12, T.w - 0.16, 'x')} material={m.mahogany} position={[cx, T.h - 0.12, T.z]} />
      {legXs.flatMap((x) =>
        [-1, 1].map((s) => <mesh key={`${x}${s}`} geometry={leg} material={m.mahogany} position={[x, 0, T.z + s * (T.w / 2 - 0.12)]} scale={[1.2, (T.h - 0.06) / 0.72, 1.2]} castShadow />),
      )}
      {/* Linen runner down the middle */}
      <mesh geometry={boxGeo(len - 0.4, 0.004, 0.62, 'x')} material={m.linen} position={[cx, TOP, T.z]} receiveShadow />
    </group>
  );
}

/** A guest's place: plate, glass and a folded place card. */
function Place({ x, side }: { x: number; side: 1 | -1 }) {
  const m = mats();
  const z = T.z + side * 0.5;
  return (
    <group>
      <mesh material={m.porcelain} position={[x, TOP + 0.008, z]} receiveShadow>
        <cylinderGeometry args={[0.13, 0.11, 0.016, 28]} />
      </mesh>
      <mesh material={m.silver} position={[x + 0.17, TOP + 0.003, z]}>
        <boxGeometry args={[0.02, 0.004, 0.2]} />
      </mesh>
      <mesh material={m.glass} position={[x - 0.16, TOP + 0.06, z - side * 0.12]}>
        <cylinderGeometry args={[0.03, 0.022, 0.12, 14]} />
      </mesh>
      {/* Folded place card */}
      <group position={[x, TOP + 0.03, z - side * 0.2]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
        <mesh material={m.parchment} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.11, 0.065, 0.003]} />
        </mesh>
      </group>
    </group>
  );
}

function Dishes() {
  const m = mats();
  const urn = latheGeo('urn', LATHES.urn);
  const vase = latheGeo('vase', LATHES.vase);
  return (
    <group>
      {/* I. The soup tureen */}
      <GrowingDish dish="soup" position={[3.5, TOP, T.z]}>
        <mesh geometry={urn} material={m.silver} scale={[0.55, 0.45, 0.55]} castShadow />
        <mesh material={m.silver} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.03, 12, 8]} />
        </mesh>
      </GrowingDish>
      {/* III. The pie */}
      <GrowingDish dish="pie" position={[5.7, TOP, T.z]}>
        <mesh material={m.porcelain} position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.22, 0.2, 0.016, 28]} />
        </mesh>
        <mesh material={m.pastry} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.18, 0.07, 28]} />
        </mesh>
        <mesh material={m.pastry} position={[0, 0.085, 0]} scale={[1, 0.28, 1]}>
          <sphereGeometry args={[0.17, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </GrowingDish>
      {/* V. The giant's goblet */}
      <GrowingDish dish="laugh" position={[9.35, TOP, T.z - 0.45]}>
        <mesh geometry={vase} material={m.silver} scale={[0.75, 0.75, 0.75]} castShadow />
      </GrowingDish>
      {/* IV. Candles (literal) and VI. the salt cellar (literal) never grow */}
      <Candelabrum position={[4.6, TOP, T.z]} seed={41} light={false} />
      <Candelabrum position={[7.9, TOP, T.z]} seed={43} light={false} />
      <mesh material={m.silver} position={[6.8, TOP + 0.025, T.z + 0.12]} castShadow>
        <cylinderGeometry args={[0.035, 0.03, 0.05, 16]} />
      </mesh>
    </group>
  );
}

/** The giant's place at the end of the table: a vast plate, a silver cloche, and under it the Tiny Key. */
function GiantPlace() {
  const m = mats();
  const cloche = useRef<THREE.Group>(null!);
  const done = useGame((s) => s.progress.completed.dining);
  const px = DINING.giant.plateX;
  useFrame(() => {
    const target = Math.max(dfx.clocheTarget, game().progress.completed.dining && game().lessons.dining.stage !== 'complete' ? 1 : 0);
    dfx.cloche += (target - dfx.cloche) * (1 - Math.exp(-world.dt * 1.4));
    const c = dfx.cloche;
    cloche.current.position.set(px - c * 0.55, TOP + 0.03 + c * 1.25, T.z - c * 0.35);
    cloche.current.rotation.z = c * 0.55;
    if (dfx.rattle > 0 && c < 0.05) cloche.current.rotation.x = Math.sin(world.t * 47) * 0.02 * Math.min(1, dfx.rattle);
    else cloche.current.rotation.x = 0;
  });
  return (
    <group>
      <mesh material={m.porcelain} position={[px, TOP + 0.015, T.z]} receiveShadow castShadow>
        <cylinderGeometry args={[0.62, 0.5, 0.03, 48]} />
      </mesh>
      <mesh material={m.gilt} position={[px, TOP + 0.031, T.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.56, 48]} />
      </mesh>
      {/* The Tiny Key, barely two centimetres long, on a plate a metre wide */}
      <group position={[px, TOP + 0.036, T.z]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <CollectibleKey keyId="diningKey" variant="gallery" tint="#c9b27a" scale={0.32} />
      </group>
      <Interactive
        id="dining-giant-place"
        maxDist={3.2}
        label={() => (game().lessonActive || done ? null : 'Look at the giant’s place')}
        onUse={() => openLesson('dining')}
      >
        <group ref={cloche} position={[px, TOP + 0.03, T.z]}>
          <mesh material={m.silver} castShadow>
            <sphereGeometry args={[0.5, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={m.silver} position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.06, 16, 10]} />
          </mesh>
          <mesh material={m.silver} position={[0, 0.005, 0]}>
            <torusGeometry args={[0.5, 0.012, 8, 48]} />
          </mesh>
        </group>
      </Interactive>
    </group>
  );
}

/** The giant's chair: an ordinary balloon-back chair, nearly three times too big. */
function GiantChair() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    dfx.loom += (dfx.loomTarget - dfx.loom) * (1 - Math.exp(-world.dt * 1.5));
    ref.current.scale.setScalar(2.7 * (1 + dfx.loom * 0.14));
  });
  return (
    <group ref={ref} position={[DINING.giant.chairX, 0, T.z]} rotation={[0, -Math.PI / 2, 0]}>
      <SideChair position={[0, 0, 0]} />
    </group>
  );
}

/** Cutlery taller than a person, leaning against the north wall. */
function GiantCutlery() {
  const m = mats();
  const z = zN - 0.22;
  return (
    <group>
      <group position={[7.5, 0, z]} rotation={[0.1, 0, 0.02]}>
        <mesh geometry={boxGeo(0.1, 1.6, 0.035)} material={m.silver} position={[0, 0.8, 0]} castShadow />
        <mesh geometry={boxGeo(0.34, 0.24, 0.035, 'x')} material={m.silver} position={[0, 1.7, 0]} castShadow />
        {[-0.135, -0.045, 0.045, 0.135].map((x) => (
          <mesh key={x} geometry={boxGeo(0.045, 0.62, 0.035)} material={m.silver} position={[x, 2.12, 0]} castShadow />
        ))}
      </group>
      <group position={[8.4, 0, z]} rotation={[0.1, 0, -0.03]}>
        <mesh geometry={boxGeo(0.1, 1.15, 0.035)} material={m.silver} position={[0, 0.58, 0]} castShadow />
        <mesh geometry={boxGeo(0.2, 1.25, 0.02)} material={m.silver} position={[0.03, 1.75, 0]} castShadow />
      </group>
      <group position={[9.3, 0, z]} rotation={[0.1, 0, 0.03]}>
        <mesh geometry={boxGeo(0.1, 1.7, 0.035)} material={m.silver} position={[0, 0.85, 0]} castShadow />
        <mesh material={m.silver} position={[0, 2.05, 0.02]} scale={[1, 1.45, 0.28]} castShadow>
          <sphereGeometry args={[0.24, 24, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/** The menu board on its easel: the class's hyperbole is chalked here in Prove. */
function MenuBoard() {
  const m = mats();
  const W = 1.05;
  const Hb = 0.78;
  // The chalk glows faintly so the class can read it from across the dark room.
  const mat = useMemo(() => {
    const t = boardText('Tonight’s Menu', 'Soup, served hot.', W / Hb, 'chalk');
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.92 });
  }, []);
  const last = useRef('');
  useFrame(() => {
    const text = dfx.menu || 'Soup, served hot.';
    if (text === last.current) return;
    last.current = text;
    mat.map = mat.emissiveMap = boardText('Tonight’s Menu', text, W / Hb, 'chalk');
    mat.needsUpdate = true;
  });
  const z = zN - 0.4;
  return (
    <group position={[DINING.menu.x, 0, z]} rotation={[0, Math.PI, 0]}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} geometry={boxGeo(0.04, 1.9, 0.04)} material={m.walnut} position={[x, 0.95, 0.02]} rotation={[-0.06, 0, x > 0 ? -0.06 : 0.06]} castShadow />
      ))}
      <mesh geometry={boxGeo(0.04, 1.9, 0.04)} material={m.walnut} position={[0, 0.92, -0.3]} rotation={[-0.25, 0, 0]} />
      <mesh geometry={boxGeo(W + 0.08, Hb + 0.08, 0.03)} material={m.walnut} position={[0, DINING.menu.y, 0.1]} castShadow />
      <mesh material={mat} position={[0, DINING.menu.y, 0.117]}>
        <planeGeometry args={[W, Hb]} />
      </mesh>
      <mesh geometry={boxGeo(W, 0.03, 0.06)} material={m.walnut} position={[0, DINING.menu.y - Hb / 2 - 0.05, 0.13]} />
    </group>
  );
}

function Sideboard() {
  const m = mats();
  const z = zS + 0.3;
  return (
    <group position={[6.4, 0, z]}>
      <mesh geometry={boxGeo(2.0, 0.86, 0.55, 'x')} material={m.walnutPanel} position={[0, 0.43, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(2.06, 0.04, 0.6, 'x')} material={m.marbleDark} position={[0, 0.88, 0]} castShadow />
      <mesh material={m.silver} position={[-0.5, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Candelabrum position={[0.55, 0.9, 0]} seed={47} light={false} />
    </group>
  );
}

export function DiningRoom() {
  const m = mats();
  const wallX = CORRIDOR.x1 + WALL_T / 2;
  const doorLocal = wallLocal('z', 1, DINING.doorZ);
  // Reset any stale scale state from a previous visit when the room first mounts.
  useMemo(() => DISHES.forEach((d) => (dfx.grow[d] = dfx.growTarget[d])), []);
  return (
    <group>
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={0} material={m.parquet} />
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={H} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zS} z1={zN} y={H} />

      {/* Walls: north, south, east. The west wall is the corridor's; this room is taller, so it gets an upper strip. */}
      <Wall axis="x" from={x0} to={x1 + WALL_T} at={zN + WALL_T / 2} height={H} matPos={m.brick} matNeg={m.wallDining} />
      <Wall axis="x" from={x0} to={x1 + WALL_T} at={zS - WALL_T / 2} height={H} openings={[{ c: BALLROOM.doorX, w: 0.96, b: 0, t: 2.3 }]} matPos={m.wallDining} matNeg={m.wallBallroom} />
      <Wall
        axis="z"
        from={zN}
        to={zS}
        at={x1 + WALL_T / 2}
        height={H}
        openings={DINING.windows.map((c) => ({ c, w: WIN.w, b: WIN.b, t: WIN.t }))}
        matPos={m.brick}
        matNeg={m.wallDining}
      />
      <Wall axis="z" from={zN} to={zS} at={wallX} y0={CORRIDOR.height} height={H - CORRIDOR.height} matPos={m.wallDining} matNeg={m.brick} />

      {/* West wall (the dining side of the corridor wall), around the door */}
      <OnWall axis="z" face={x0} normal={1}>
        <Wainscot x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} gaps={[[doorLocal, DOOR_W + 0.36]]} />
        <Architrave c={doorLocal} w={DOOR_W} h={2.3} />
        <Run profile="pictureRail" x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} y={3.5} material={m.walnut} />
        <Painting x={wallLocal('z', 1, -12.4)} y={2.3} w={0.9} h={0.7} kind="stilllife" seed={51} />
      </OnWall>
      {/* North wall */}
      <OnWall axis="x" face={zN} normal={-1}>
        <Wainscot x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} />
        <Run profile="pictureRail" x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} y={3.5} material={m.walnut} />
        <Painting x={wallLocal('x', -1, 5.9)} y={2.55} w={1.25} h={0.9} kind="moonhouse" seed={52} />
      </OnWall>
      {/* South wall */}
      <OnWall axis="x" face={zS} normal={1}>
        <Wainscot x0={x0} x1={x1} gaps={[[BALLROOM.doorX, 0.96 + 0.36]]} />
        <Architrave c={BALLROOM.doorX} w={0.96} h={2.3} />
        <Run profile="pictureRail" x0={x0} x1={x1} y={3.5} material={m.walnut} />
        <Painting x={3.6} y={2.4} w={0.8} h={1.0} kind="portrait" seed={53} />
        <Painting x={11.3} y={2.4} w={0.9} h={0.7} kind="sea" seed={54} />
      </OnWall>
      {/* East wall: tall windows behind the giant's chair */}
      <OnWall axis="z" face={x1} normal={-1}>
        <Wainscot x0={wallLocal('z', -1, zN)} x1={wallLocal('z', -1, zS)} gaps={DINING.windows.map((c) => [wallLocal('z', -1, c), WIN.w + 0.1] as [number, number])} />
        {DINING.windows.map((c) => (
          <SashWindow key={c} c={wallLocal('z', -1, c)} w={WIN.w} b={WIN.b} t={WIN.t} />
        ))}
      </OnWall>

      {/* Room 8, the ballroom, through the south wall */}
      <KeyedDoor
        id="ballroom-door"
        door="ballroom"
        lock="ballroom"
        room="The Ballroom"
        inside="ballroom"
        hinge={[BALLROOM.doorX - 0.48, 0, zS - WALL_T / 2]}
        rotationY={0}
        width={0.96}
        height={2.3}
        lockedHint={() => (game().progress.completed.kitchen ? 'Did you take the key from the kitchen table?' : 'Through the keyhole: a waltz, very faint, in an empty room.')}
      />
      <Rug position={[6.2, 0, T.z]} w={8.2} d={3.4} material={m.rugMirror} />
      <Table />
      {[3.6, 5.6, 7.6].flatMap((x) => [<Place key={`n${x}`} x={x} side={1} />, <Place key={`s${x}`} x={x} side={-1} />])}
      {[3.6, 5.6, 7.6].flatMap((x) => [
        <SideChair key={`cn${x}`} position={[x, 0, T.z + 0.95]} rotationY={Math.PI} />,
        <SideChair key={`cs${x}`} position={[x, 0, T.z - 0.95]} />,
      ])}
      <Dishes />
      <GiantPlace />
      <GiantChair />
      <GiantCutlery />
      <MenuBoard />
      <Sideboard />
      <Chandelier position={[6.2, H, T.z]} drop={1.55} arms={10} radius={0.7} light={false} seed={57} />
    </group>
  );
}
