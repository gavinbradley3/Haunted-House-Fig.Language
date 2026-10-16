/**
 * Room 4: the Nursery (PERSONIFICATION).
 * Behind the hidden jib door in the Hall of Mirrors: a child's room left exactly as it was.
 * Personification makes things alive here: toys behave like people when the class gives
 * them human actions. Lit only by the two shared room lights (scene/RoomLights.tsx).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { nfx, TOYS } from '../lesson/nurseryFx';
import { game, useGame } from '../state/store';
import { boardText } from '../systems/boardText';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { ECHOES, MIRRORS, NURSERY, WALL_T } from '../world/layout';
import { KeyedDoor } from './parts/KeyedDoor';
import { Architrave, Cornice, OnWall, Run, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Painting, Rug, SashWindow } from './parts/Furnishings';
import { CollectibleKey } from './parts/Key';
import { Interactive } from './Interactive';

const { x0, x1, zN, zS, height: H } = NURSERY;
const ease = (k: number) => 1 - Math.exp(-world.dt * k);

/** Every frame: move each toy's "awake" value toward its target. */
function AwakeTicker() {
  useFrame(() => {
    for (const t of TOYS) nfx.awake[t] += (nfx.awakeTarget[t] - nfx.awake[t]) * ease(1.6);
    nfx.rock += (nfx.rockTarget - nfx.rock) * ease(1.2);
    nfx.lid += (nfx.lidTarget - nfx.lid) * ease(1.8);
    if (nfx.shiver > 0) nfx.shiver = Math.max(0, nfx.shiver - world.dt);
  });
  return null;
}

const shiver = (seed: number) => (nfx.shiver > 0 ? Math.sin(world.t * 53 + seed) * 0.02 * Math.min(1, nfx.shiver) : 0);

/** A rocking horse on bow rockers. Sulking, it rocks slowly and turns its head away. */
function RockingHorse() {
  const m = mats();
  const rocker = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const bow = useMemo(() => new THREE.TorusGeometry(1.1, 0.025, 6, 32, 0.95), []);
  useFrame(() => {
    const a = nfx.awake.horse;
    const amp = Math.max(nfx.rock * 0.1, a * 0.07);
    rocker.current.rotation.z = Math.sin(world.t * (1.4 - a * 0.5)) * amp + shiver(1);
    // Sulking: the head droops and turns away from the room.
    head.current.rotation.set(0, -a * 0.6, -a * 0.35);
  });
  return (
    <group position={[NURSERY.horse.x, 0, NURSERY.horse.z]} rotation={[0, -0.6, 0]}>
      <group ref={rocker}>
        {[-0.17, 0.17].map((z) => (
          <mesh key={z} geometry={bow} material={m.toyRed} position={[0, 1.1 + 0.02, z]} rotation={[0, 0, -Math.PI / 2 - 0.475]} castShadow />
        ))}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} geometry={boxGeo(0.04, 0.03, 0.4)} material={m.toyRed} position={[x, 0.06, 0]} />
        ))}
        {[
          [-0.22, -0.11],
          [-0.22, 0.11],
          [0.22, -0.11],
          [0.22, 0.11],
        ].map(([x, z], i) => (
          <mesh key={i} material={m.toyCream} position={[x, 0.3, z]} rotation={[0, 0, x * -0.6]}>
            <cylinderGeometry args={[0.025, 0.02, 0.48, 8]} />
          </mesh>
        ))}
        {/* Body, saddle */}
        <mesh material={m.toyCream} position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.13, 0.42, 6, 14]} />
        </mesh>
        <mesh geometry={boxGeo(0.26, 0.04, 0.3)} material={m.toyRed} position={[-0.02, 0.74, 0]} />
        {/* Neck and head */}
        <group ref={head} position={[0.28, 0.72, 0]}>
          <mesh material={m.toyCream} position={[0.06, 0.13, 0]} rotation={[0, 0, -0.5]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 6, 12]} />
          </mesh>
          <mesh material={m.toyCream} position={[0.2, 0.26, 0]} rotation={[0, 0, -1.25]} castShadow>
            <capsuleGeometry args={[0.065, 0.16, 6, 12]} />
          </mesh>
          <mesh geometry={boxGeo(0.2, 0.06, 0.03)} material={m.toyRed} position={[0.02, 0.24, 0]} rotation={[0, 0, -0.6]} />
          {[-0.045, 0.045].map((z) => (
            <mesh key={z} material={m.blackPaint} position={[0.2, 0.31, z]}>
              <sphereGeometry args={[0.013, 8, 6]} />
            </mesh>
          ))}
        </group>
        {/* Tail */}
        <mesh geometry={boxGeo(0.04, 0.22, 0.04)} material={m.toyRed} position={[-0.36, 0.55, 0]} rotation={[0, 0, 0.5]} />
      </group>
    </group>
  );
}

/** The music box on its little table. Its lid opens a little when it hums, and all the way for the key. */
function MusicBox() {
  const m = mats();
  const lid = useRef<THREE.Group>(null!);
  const box = useRef<THREE.Group>(null!);
  const done = useGame((s) => s.progress.completed.nursery);
  const ped = latheGeo('pedestal', LATHES.pedestal);
  useFrame(() => {
    const target = Math.max(nfx.lid, game().progress.completed.nursery && game().lessons.nursery.stage !== 'complete' ? 1 : 0);
    lid.current.rotation.x = -target * 1.75;
    box.current.rotation.z = shiver(2);
  });
  return (
    <group position={[NURSERY.musicBox.x, 0, NURSERY.musicBox.z]}>
      <mesh geometry={ped} material={m.walnut} scale={[0.55, 1.02, 0.55]} castShadow />
      <mesh material={m.walnut} position={[0, 0.73, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.29, 0.03, 32]} />
      </mesh>
      <Interactive id="nursery-music-box" maxDist={3} label={() => (game().lessonActive || done ? null : 'Use the music box')} onUse={() => openLesson('nursery')}>
        <group ref={box} position={[0, 0.745, 0]} rotation={[0, 0.5, 0]}>
          <mesh geometry={boxGeo(0.3, 0.11, 0.2, 'x')} material={m.mahogany} position={[0, 0.055, 0]} castShadow />
          {/* Velvet tray, the brass cylinder and the key sit on top of the body, under the lid */}
          <mesh geometry={boxGeo(0.26, 0.004, 0.16)} material={m.velvetOx} position={[0, 0.112, 0]} />
          <mesh material={m.brass} position={[0.07, 0.122, 0.04]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.009, 0.009, 0.08, 12]} />
          </mesh>
          <group position={[-0.03, 0.117, -0.02]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <CollectibleKey keyId="nurseryKey" variant="mirror" tint="#c7c7c0" scale={0.6} />
          </group>
          {/* Lid, hinged along the back edge */}
          <group ref={lid} position={[0, 0.11, -0.1]}>
            <mesh geometry={boxGeo(0.31, 0.025, 0.205, 'x')} material={m.mahogany} position={[0, 0.0125, 0.1025]} castShadow />
            <mesh geometry={boxGeo(0.08, 0.004, 0.06)} material={m.brass} position={[0, 0.027, 0.1]} />
          </group>
          {/* Winding key on the side */}
          <mesh material={m.brass} position={[0.165, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
          </mesh>
          <mesh geometry={boxGeo(0.005, 0.04, 0.03)} material={m.brass} position={[0.182, 0.05, 0]} />
        </group>
      </Interactive>
    </group>
  );
}

/** A dollhouse that is a miniature of this very house. Watching, its windows light and blink. */
function Dollhouse() {
  const m = mats();
  const winMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1814', emissive: new THREE.Color('#ffc277'), emissiveIntensity: 0, roughness: 0.6 }), []);
  useFrame(() => {
    const a = nfx.awake.dollhouse;
    // Watching: the windows glow, and every few seconds they all blink at once.
    const blink = a > 0.5 && Math.sin(world.t * 0.9) > 0.985 ? 0.05 : 1;
    winMat.emissiveIntensity = (0.15 + a * 1.6) * blink;
  });
  const W = 1.1;
  const Hh = 0.75;
  const D = 0.45;
  return (
    <group position={[NURSERY.dollhouse.x, 0, NURSERY.dollhouse.z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={boxGeo(1.3, 0.6, 0.6, 'x')} material={m.walnut} position={[0, 0.3, 0]} castShadow receiveShadow />
      <group position={[0, 0.6, 0]}>
        <mesh geometry={boxGeo(W, Hh, D, 'x')} material={m.toyRed} position={[0, Hh / 2, 0]} castShadow />
        <mesh material={m.slate} position={[0, Hh + 0.12, 0]} rotation={[0, Math.PI / 4, 0]} scale={[W * 0.78, 1, D * 0.78]} castShadow>
          <coneGeometry args={[0.72, 0.25, 4]} />
        </mesh>
        {/* Porch and door, like the real house */}
        <mesh geometry={boxGeo(0.2, 0.26, 0.04)} material={m.paintCream} position={[0, 0.13, D / 2 + 0.02]} />
        <mesh geometry={boxGeo(0.1, 0.18, 0.01)} material={m.mahogany} position={[0, 0.09, D / 2 + 0.045]} />
        {[0.2, 0.5].flatMap((y) =>
          [-0.4, -0.2, 0.2, 0.4].map((x) => (
            <group key={`${x}${y}`} position={[x, y + 0.05, D / 2 + 0.003]}>
              <mesh geometry={boxGeo(0.1, 0.13, 0.01)} material={m.paintTrim} />
              <mesh material={winMat} position={[0, 0, 0.006]}>
                <planeGeometry args={[0.08, 0.11]} />
              </mesh>
            </group>
          )),
        )}
      </group>
    </group>
  );
}

/** A small bed with the teddy bear on the pillow. Keeping watch, the bear turns to face the room. */
function BedAndTeddy() {
  const m = mats();
  const head = useRef<THREE.Group>(null!);
  const bear = useRef<THREE.Group>(null!);
  useFrame(() => {
    const a = nfx.awake.teddy;
    head.current.rotation.y = a * 0.9 + shiver(3);
    bear.current.rotation.y = a * 0.25;
  });
  const bx = NURSERY.bed.x;
  const bz = NURSERY.bed.z;
  return (
    <group>
      <group position={[bx, 0, bz]}>
        <mesh geometry={boxGeo(1.7, 0.3, 0.85, 'x')} material={m.walnut} position={[0, 0.25, 0]} castShadow receiveShadow />
        <mesh geometry={boxGeo(1.62, 0.12, 0.8, 'x')} material={m.linen} position={[0, 0.45, 0]} castShadow />
        <mesh geometry={boxGeo(1.1, 0.04, 0.84, 'x')} material={m.toyBlue} position={[0.25, 0.52, 0]} castShadow />
        <mesh geometry={boxGeo(0.06, 0.95, 0.9)} material={m.walnut} position={[-0.86, 0.47, 0]} castShadow />
        <mesh geometry={boxGeo(0.06, 0.6, 0.9)} material={m.walnut} position={[0.86, 0.3, 0]} castShadow />
        <mesh material={m.linen} position={[-0.6, 0.56, 0]} scale={[0.5, 0.25, 1]} castShadow>
          <sphereGeometry args={[0.32, 16, 10]} />
        </mesh>
        {/* The teddy bear, sitting on the pillow */}
        <group ref={bear} position={[-0.55, 0.6, 0.05]}>
          <mesh material={m.fur} position={[0, 0.12, 0]} scale={[1, 1.15, 0.9]} castShadow>
            <sphereGeometry args={[0.11, 16, 12]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.fur} position={[0.08, 0.04, s * 0.08]}>
              <sphereGeometry args={[0.05, 10, 8]} />
            </mesh>
          ))}
          <group ref={head} position={[0, 0.3, 0]}>
            <mesh material={m.fur} castShadow>
              <sphereGeometry args={[0.085, 16, 12]} />
            </mesh>
            <mesh material={m.toyCream} position={[0.07, -0.015, 0]}>
              <sphereGeometry args={[0.035, 10, 8]} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh material={m.fur} position={[0, 0.07, s * 0.065]}>
                  <sphereGeometry args={[0.032, 10, 8]} />
                </mesh>
                <mesh material={m.blackPaint} position={[0.075, 0.025, s * 0.03]}>
                  <sphereGeometry args={[0.011, 8, 6]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
      {/* Bedside table with a night light */}
      <group position={[bx + 1.2, 0, bz - 0.1]}>
        <mesh geometry={boxGeo(0.4, 0.55, 0.36)} material={m.walnut} position={[0, 0.275, 0]} castShadow receiveShadow />
        <mesh geometry={latheGeo('lampBase', LATHES.lampBase)} material={m.brass} position={[0, 0.55, 0]} scale={0.6} />
        <mesh geometry={latheGeo('lampShade', LATHES.lampShade)} material={m.lampGlass} position={[0, 0.72, 0]} scale={0.55} />
      </group>
    </group>
  );
}

/** The slate on its easel: the class's personification is chalked here in Prove. */
function Slate() {
  const m = mats();
  const W = 0.95;
  const Hb = 0.7;
  const mat = useMemo(() => {
    const t = boardText('Lessons', 'Be good.', W / Hb, 'chalk');
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.92 });
  }, []);
  const last = useRef('');
  useFrame(() => {
    const text = nfx.slate || 'Be good.';
    if (text === last.current) return;
    last.current = text;
    mat.map = mat.emissiveMap = boardText('Lessons', text, W / Hb, 'chalk');
    mat.needsUpdate = true;
  });
  return (
    <group position={[NURSERY.slate.x, 0, NURSERY.slate.z]} rotation={[0, Math.PI, 0]}>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} geometry={boxGeo(0.035, 1.6, 0.035)} material={m.paintCream} position={[x, 0.8, 0.02]} rotation={[-0.06, 0, x > 0 ? -0.06 : 0.06]} castShadow />
      ))}
      <mesh geometry={boxGeo(0.035, 1.6, 0.035)} material={m.paintCream} position={[0, 0.78, -0.26]} rotation={[-0.25, 0, 0]} />
      <mesh geometry={boxGeo(W + 0.07, Hb + 0.07, 0.025)} material={m.paintCream} position={[0, 1.35, 0.1]} castShadow />
      <mesh material={mat} position={[0, 1.35, 0.114]}>
        <planeGeometry args={[W, Hb]} />
      </mesh>
      <mesh geometry={boxGeo(W, 0.03, 0.06)} material={m.paintCream} position={[0, 1.35 - Hb / 2 - 0.05, 0.125]} />
    </group>
  );
}

/** Alphabet blocks and a toy shelf: small things to notice. */
function Clutter() {
  const m = mats();
  const blocks: [number, number, number, THREE.Material][] = [
    [-8.9, -22.7, 0.2, m.toyRed],
    [-8.75, -22.62, 0.7, m.toyBlue],
    [-8.82, -22.66, 1.1, m.toyCream],
    [-9.5, -24.2, 0.4, m.toyBlue],
  ];
  return (
    <group>
      {blocks.map(([x, z, r, mat], i) => (
        <mesh key={i} geometry={boxGeo(0.07, 0.07, 0.07)} material={mat} position={[x, 0.035 + (i === 2 ? 0.07 : 0), z]} rotation={[0, r, 0]} castShadow />
      ))}
      {/* Toy shelf on the north wall */}
      <group position={[-10.2, 0, zN - 0.2]}>
        <mesh geometry={boxGeo(1.4, 0.03, 0.26, 'x')} material={m.paintCream} position={[0, 1.3, 0]} castShadow />
        <mesh geometry={boxGeo(1.4, 0.03, 0.26, 'x')} material={m.paintCream} position={[0, 0.9, 0]} castShadow />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} geometry={boxGeo(0.05, 0.22, 0.16)} material={m.bookCloth[i % 4]} position={[-0.55 + i * 0.07, 1.025, 0]} castShadow />
        ))}
        <mesh material={m.toyRed} position={[0.4, 0.97, 0]} castShadow>
          <sphereGeometry args={[0.06, 14, 10]} />
        </mesh>
        <mesh material={m.toyBlue} position={[0.2, 1.38, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.13, 14]} />
        </mesh>
      </group>
    </group>
  );
}

export function Nursery() {
  const m = mats();
  const win = NURSERY.window;
  const jib = MIRRORS.jibDoor;
  return (
    <group>
      <AwakeTicker />
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={0} material={m.floorHall} />
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={H} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zS} z1={zN} y={H} />

      {/* Walls: north, south, west. The east wall is the Hall of Mirrors'. */}
      <Wall axis="x" from={x0 - WALL_T} to={x1} at={zN + WALL_T / 2} height={H} matPos={m.brick} matNeg={m.wallNursery} />
      <Wall axis="x" from={x0 - WALL_T} to={x1} at={zS - WALL_T / 2} height={H} openings={[{ c: ECHOES.doorX, w: 0.96, b: 0, t: 2.3 }]} matPos={m.wallNursery} matNeg={m.wallEchoes} />
      <Wall axis="z" from={zN} to={zS} at={x0 - WALL_T / 2} height={H} openings={[{ c: win.z, w: win.width, b: win.sill, t: win.top }]} matPos={m.wallNursery} matNeg={m.brick} />

      <OnWall axis="z" face={x0} normal={1}>
        <Wainscot x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} height={0.9} gaps={[[wallLocal('z', 1, win.z), win.width + 0.1]]} />
        <SashWindow c={wallLocal('z', 1, win.z)} w={win.width} b={win.sill} t={win.top} />
        <Run profile="pictureRail" x0={wallLocal('z', 1, zN)} x1={wallLocal('z', 1, zS)} y={2.5} material={m.paintTrim} />
      </OnWall>
      <OnWall axis="x" face={zN} normal={-1}>
        <Wainscot x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} height={0.9} />
        <Run profile="pictureRail" x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} y={2.5} material={m.paintTrim} />
      </OnWall>
      <OnWall axis="x" face={zS} normal={1}>
        <Wainscot x0={x0} x1={x1} height={0.9} gaps={[[ECHOES.doorX, 0.96 + 0.3]]} />
        <Architrave c={ECHOES.doorX} w={0.96} h={2.3} material={m.paintTrim} />
        <Run profile="pictureRail" x0={x0} x1={x1} y={2.5} material={m.paintTrim} />
        <Painting x={-7.0} y={1.75} w={0.55} h={0.7} kind="portrait" seed={61} />
      </OnWall>
      {/* East wall (the nursery side of the mirror room's wall), around the hidden door */}
      <OnWall axis="z" face={x1} normal={-1}>
        <Wainscot x0={wallLocal('z', -1, zN)} x1={wallLocal('z', -1, zS)} height={0.9} gaps={[[wallLocal('z', -1, jib.z), jib.width + 0.3]]} />
        <Architrave c={wallLocal('z', -1, jib.z)} w={jib.width} h={jib.height} material={m.paintTrim} />
        <Run profile="pictureRail" x0={wallLocal('z', -1, zN)} x1={wallLocal('z', -1, zS)} y={2.5} material={m.paintTrim} />
        <Painting x={wallLocal('z', -1, -20.6)} y={1.7} w={0.6} h={0.45} kind="forest" seed={62} />
        <Painting x={wallLocal('z', -1, -25.9)} y={1.7} w={0.5} h={0.6} kind="moonhouse" seed={63} />
      </OnWall>

      {/* Room 5, the music room, through the south wall */}
      <KeyedDoor
        id="echoes-door"
        door="echoes"
        lock="echoes"
        room="The Chamber of Echoes"
        inside="echoes"
        hinge={[ECHOES.doorX - 0.48, 0, zS - WALL_T / 2]}
        rotationY={0}
        width={0.96}
        height={2.3}
        lockedHint={() => (game().progress.completed.nursery ? 'Did you take the key from the music box?' : 'Behind the door, something drips… and drips.')}
      />
      <Rug position={[-8.6, 0, -23.4]} w={3.6} d={3.0} material={m.rugHall} />
      <RockingHorse />
      <MusicBox />
      <Dollhouse />
      <BedAndTeddy />
      <Slate />
      <Clutter />
    </group>
  );
}
