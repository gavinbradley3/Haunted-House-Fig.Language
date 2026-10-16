/**
 * Room 7: the Crooked Kitchen (IDIOM). East of the Entrance Hall.
 * Idioms have come true here, word for word. When the class works out what an idiom
 * really means, its meaning is chalked on a little board above the scene.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { kfx } from '../lesson/laterFx';
import { game, useGame } from '../state/store';
import { boardText } from '../systems/boardText';
import { boxGeo } from '../systems/geometry';
import { mats } from '../systems/materials';
import { softDot } from '../systems/textures';
import { world } from '../systems/time';
import { KITCHEN } from '../world/layout';
import { Easel } from './parts/Easel';
import { SideChair } from './parts/Furnishings';
import { CollectibleKey } from './parts/Key';
import { RoomShell } from './parts/RoomShell';
import { Interactive } from './Interactive';

/** A chalked label of an idiom's real meaning, shown once the class has understood it. */
function MeaningLabel({ id, idiom, meaning, position, rotationY = 0 }: { id: string; idiom: string; meaning: string; position: [number, number, number]; rotationY?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const mat = useMemo(() => {
    const t = boardText(idiom, `= ${meaning}`, 1.6, 'chalk');
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.6, roughness: 0.9 });
  }, [idiom, meaning]);
  useFrame(() => {
    const on = kfx.labelled.has(id);
    ref.current.visible = on;
    if (on) ref.current.position.y = position[1] + Math.sin(world.t * 1.3 + position[0]) * 0.02;
  });
  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]} visible={false}>
      <mesh material={mat}>
        <planeGeometry args={[0.64, 0.4]} />
      </mesh>
    </group>
  );
}

/** "Spill the beans": a tipped sack, and beans across the floor (instanced: one draw call). */
function SpilledBeans() {
  const m = mats();
  const beans = useRef<THREE.InstancedMesh>(null!);
  const sack = useRef<THREE.Group>(null!);
  const spill = useRef(0);
  const COUNT = 70;
  const spots = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * 2.4 - 0.6 + Math.sin(i * 12.9) * 0.4;
        const r = 0.15 + ((i * 37) % 100) / 100;
        return [Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.8, i * 1.7] as [number, number, number];
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    beans.current.count = COUNT;
  }, []);
  useFrame(() => {
    spill.current += (kfx.spillTarget - spill.current) * (1 - Math.exp(-world.dt * 1.8));
    const s = spill.current;
    sack.current.rotation.z = -s * 1.2;
    spots.forEach(([x, z, rot], i) => {
      const k = Math.min(1, Math.max(0, s * 1.3 - (i / COUNT) * 0.3));
      dummy.position.set(0.25 + x * k, 0.018, z * k);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(k > 0.02 ? 1 : 0.0001);
      dummy.updateMatrix();
      beans.current.setMatrixAt(i, dummy.matrix);
    });
    beans.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[KITCHEN.beans.x, 0, KITCHEN.beans.z]}>
      <group ref={sack}>
        <mesh material={m.sacking} position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.26, 0.6, 12]} />
        </mesh>
        <mesh material={m.sacking} position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.08, 12]} />
        </mesh>
      </group>
      <instancedMesh ref={beans} args={[undefined, undefined, COUNT]} material={m.bean} castShadow>
        <sphereGeometry args={[0.018, 6, 4]} />
      </instancedMesh>
    </group>
  );
}

/** "In hot water": a steaming copper pot on the range, with a cook's boots sticking out. */
function RangeAndPot() {
  const m = mats();
  const steam = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color('#d8dde0'), transparent: true, opacity: 0.25, depthWrite: false }), []);
  const s1 = useRef<THREE.Sprite>(null!);
  useFrame(() => {
    const k = (world.t * 0.3) % 1;
    s1.current.position.y = 1.55 + k * 0.6;
    steam.opacity = 0.3 * (1 - k);
  });
  return (
    <group position={[13.85, 0, -3.8]}>
      <mesh geometry={boxGeo(0.9, 0.85, 2.0)} material={m.iron} position={[0, 0.42, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(0.95, 0.05, 2.05)} material={m.iron} position={[0, 0.87, 0]} />
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} geometry={boxGeo(0.02, 0.4, 0.6)} material={m.brass} position={[-0.46, 0.45, z]} />
      ))}
      <mesh geometry={boxGeo(0.7, 2.4, 1.2)} material={m.iron} position={[0.1, 2.4, 0]} castShadow />
      {/* The pot and the boots */}
      <group position={[-0.25, 0.9, 0.2]}>
        <mesh material={m.copper} position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.33, 0.28, 0.5, 20, 1, true]} />
        </mesh>
        <mesh material={m.soot} position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 20]} />
        </mesh>
        {[-0.08, 0.08].map((z) => (
          <group key={z} position={[0.02, 0.5, z]} rotation={[0, 0, 0.25]}>
            <mesh geometry={boxGeo(0.08, 0.3, 0.09)} material={m.leather} position={[0, 0.15, 0]} castShadow />
            <mesh geometry={boxGeo(0.18, 0.06, 0.09)} material={m.leather} position={[-0.05, 0.31, 0]} castShadow />
          </group>
        ))}
        <sprite ref={s1} material={steam} position={[0, 1.55 - 0.9, 0]} scale={[0.6, 0.6, 0.6]} />
      </group>
    </group>
  );
}

/** "A piece of cake": a cake with one slice cut out, on the kitchen table. Using the table starts the lesson. */
function TableAndCake() {
  const m = mats();
  const done = useGame((s) => s.progress.completed.kitchen);
  const { x, z } = KITCHEN.table;
  return (
    <group position={[x, 0, z]}>
      <Interactive id="kitchen-table" maxDist={3.2} label={() => (game().lessonActive || done ? null : 'Look at the kitchen table')} onUse={() => openLesson('kitchen')}>
        <mesh geometry={boxGeo(2.2, 0.08, 1.1, 'x')} material={m.walnut} position={[0, 0.78, 0]} castShadow receiveShadow />
      </Interactive>
      {[
        [-1.0, -0.48],
        [1.0, -0.48],
        [-1.0, 0.48],
        [1.0, 0.48],
      ].map(([lx, lz], i) => (
        <mesh key={i} geometry={boxGeo(0.08, 0.74, 0.08)} material={m.walnut} position={[lx, 0.37, lz]} castShadow />
      ))}
      <mesh material={m.porcelain} position={[0, 0.83, 0]}>
        <cylinderGeometry args={[0.24, 0.22, 0.02, 24]} />
      </mesh>
      <mesh material={m.pastry} position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 28, 1, false, 0.6, Math.PI * 2 - 1.0]} />
      </mesh>
      <mesh material={m.linen} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.01, 28, 1, false, 0.6, Math.PI * 2 - 1.0]} />
      </mesh>
      {/* The missing slice, on a little plate */}
      <mesh material={m.pastry} position={[0.45, 0.88, 0.15]} rotation={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 6, 1, false, 0, 1.0]} />
      </mesh>
      <group position={[-0.6, 0.83, 0.1]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <CollectibleKey keyId="kitchenKey" variant="gallery" tint="#b28a4e" />
      </group>
    </group>
  );
}

/** "Under the weather": a small rain cloud hanging over one chair. */
function CloudOverChair() {
  const m = mats();
  const cloud = useRef<THREE.Group>(null!);
  const rain = useRef<THREE.Group>(null!);
  useFrame(() => {
    cloud.current.position.y = 2.15 + Math.sin(world.t * 0.7) * 0.05;
    rain.current.children.forEach((r, i) => (r.position.y = 1.9 - ((world.t * 2.2 + i * 0.37) % 1) * 1.4));
  });
  const { x, z } = KITCHEN.cloud;
  return (
    <group position={[x, 0, z]}>
      <SideChair position={[0, 0, 0]} rotationY={-2.4} />
      <group ref={cloud}>
        {[
          [0, 0, 0, 0.26],
          [0.22, -0.04, 0.05, 0.2],
          [-0.22, -0.05, -0.02, 0.19],
          [0.05, 0.12, 0, 0.18],
        ].map(([cx, cy, cz, r], i) => (
          <mesh key={i} material={m.cloud} position={[cx, cy, cz]}>
            <sphereGeometry args={[r, 12, 8]} />
          </mesh>
        ))}
      </group>
      <group ref={rain}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} geometry={boxGeo(0.006, 0.12, 0.006)} material={m.glass} position={[Math.sin(i * 2.1) * 0.25, 1.5, Math.cos(i * 2.1) * 0.2]} />
        ))}
      </group>
    </group>
  );
}

/** "Break the ice": a block of ice split in two on the dresser. Crooked shelves above it. */
function DresserAndIce() {
  const m = mats();
  const { x } = KITCHEN.ice;
  const z = KITCHEN.zN - 0.35;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={boxGeo(1.9, 0.9, 0.55, 'x')} material={m.walnutPanel} position={[0, 0.45, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(0.28, 0.32, 0.3)} material={m.ice} position={[-0.17, 1.07, 0]} rotation={[0, 0, 0.08]} castShadow />
      <mesh geometry={boxGeo(0.28, 0.3, 0.3)} material={m.ice} position={[0.17, 1.06, 0.02]} rotation={[0, 0, -0.12]} castShadow />
      {/* Crooked shelves with crockery */}
      {[1.7, 2.25].map((y, i) => (
        <group key={y} position={[0, y, -0.12]} rotation={[0, 0, (i ? -1 : 1) * 0.07]}>
          <mesh geometry={boxGeo(1.8, 0.04, 0.3, 'x')} material={m.walnut} castShadow />
          {[-0.6, -0.2, 0.2, 0.6].map((px) => (
            <mesh key={px} material={m.porcelain} position={[px, 0.13, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
              <cylinderGeometry args={[0.11, 0.11, 0.02, 18]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A rack of pans over the table that sways a little, as if the kitchen were leaning. */
function PanRack() {
  const m = mats();
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => (ref.current.rotation.z = Math.sin(world.t * 0.6) * 0.04));
  const { x, z } = KITCHEN.table;
  return (
    <group ref={ref} position={[x, KITCHEN.height - 0.4, z]}>
      <mesh geometry={boxGeo(1.6, 0.04, 0.04, 'x')} material={m.iron} />
      {[-0.6, -0.2, 0.2, 0.6].map((px, i) => (
        <group key={px} position={[px, -0.3, 0]} rotation={[0, 0, Math.sin(i) * 0.1]}>
          <mesh material={m.copper} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12 + i * 0.02, 0.1 + i * 0.02, 0.08, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The pantry door in the north wall: it swings open when the room is complete. */
function PantryDoor() {
  const m = mats();
  const leaf = useRef<THREE.Group>(null!);
  const open = useRef(0);
  useFrame(() => {
    open.current += (kfx.pantryTarget - open.current) * (1 - Math.exp(-world.dt * 1.5));
    leaf.current.rotation.y = -open.current * 1.2;
  });
  return (
    <group position={[KITCHEN.x1 - 1.2, 0, KITCHEN.zN - 0.02]}>
      <mesh geometry={boxGeo(0.9, 2.2, 0.02)} material={m.darkInterior} position={[0.45, 1.1, 0.0]} />
      <group ref={leaf}>
        <mesh geometry={boxGeo(0.9, 2.2, 0.05)} material={m.paintCream} position={[0.45, 1.1, -0.04]} castShadow />
      </group>
    </group>
  );
}

export function CrookedKitchen() {
  const m = mats();
  return (
    <group>
      <RoomShell
        x0={KITCHEN.x0}
        x1={KITCHEN.x1}
        zN={KITCHEN.zN}
        zS={KITCHEN.zS}
        height={KITCHEN.height}
        wall={m.wallKitchen}
        floor={m.stoneSteps}
        own={['N', 'S', 'E']}
        doors={[{ side: 'W', at: KITCHEN.doorZ, width: 0.96 }]}
        windows={[{ side: 'E', at: -7.0, width: 1.2, sill: 1.0, top: 2.7 }]}
        wainscot={0.9}
        rail={2.6}
        trim={m.paintTrim}
      />
      <SpilledBeans />
      <RangeAndPot />
      <TableAndCake />
      <CloudOverChair />
      <DresserAndIce />
      <PanRack />
      <PantryDoor />
      {/* The meanings, chalked above each scene once the class understands them */}
      <MeaningLabel id="beans" idiom="Spill the beans" meaning="tell a secret" position={[KITCHEN.beans.x, 1.5, KITCHEN.beans.z]} rotationY={Math.PI - 0.6} />
      <MeaningLabel id="water" idiom="In hot water" meaning="in trouble" position={[13.3, 2.3, -5.3]} rotationY={-Math.PI / 2} />
      <MeaningLabel id="cake" idiom="A piece of cake" meaning="very easy" position={[KITCHEN.table.x, 1.55, KITCHEN.table.z]} rotationY={Math.PI} />
      <MeaningLabel id="weather" idiom="Under the weather" meaning="feeling ill" position={[KITCHEN.cloud.x - 0.6, 2.2, KITCHEN.cloud.z + 0.3]} rotationY={-2.4} />
      <MeaningLabel id="ice" idiom="Break the ice" meaning="help people relax and talk" position={[KITCHEN.ice.x, 2.75, KITCHEN.zN - 0.25]} rotationY={Math.PI} />
      <Easel position={[KITCHEN.board.x, 0, KITCHEN.board.z]} rotationY={Math.PI / 2} heading="The Kitchen Slate" text={() => kfx.board} />
    </group>
  );
}
