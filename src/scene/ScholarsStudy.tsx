/**
 * Room 9: the Forgotten Scholar's Study (ALLUSION). West of the Entrance Hall, under the landing.
 * Each allusion has a book on the desk; reading its evidence opens the book, so the class
 * investigates a reference before deciding what it means.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EVIDENCE } from '../content/allusion';
import { openLesson } from '../lesson/director';
import { sfx } from '../lesson/laterFx';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boardText } from '../systems/boardText';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { registerCue } from '../systems/soundCues';
import { world } from '../systems/time';
import { STUDY } from '../world/layout';
import { Easel } from './parts/Easel';
import { Rug } from './parts/Furnishings';
import { CollectibleKey } from './parts/Key';
import { RoomShell } from './parts/RoomShell';
import { Interactive } from './Interactive';

const BOOKS = Object.keys(EVIDENCE) as (keyof typeof EVIDENCE)[];
const COVERS = ['#5a1f1b', '#1f3a2c', '#2a2f4a', '#4a3a1c', '#3a2433'];

/** Opening a book's evidence (from the lesson panel) opens the matching book on the desk. */
function EvidenceCues() {
  useEffect(() => {
    const offs = BOOKS.map((id) =>
      registerCue(`evidence:${id}`, `A book on the desk falls open: “${EVIDENCE[id].title}”.`, () => {
        sfx.opened.add(id);
        audio.whisperS([STUDY.desk.x, 1, STUDY.desk.z]);
      }),
    );
    return () => offs.forEach((o) => o());
  }, []);
  return null;
}

/** One of the five books on the desk; its cover swings open when its evidence has been read. */
function Book({ id, i }: { id: (typeof BOOKS)[number]; i: number }) {
  const m = mats();
  const cover = useRef<THREE.Group>(null!);
  const open = useRef(0);
  const coverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COVERS[i], roughness: 0.75 }), [i]);
  const pageMat = useMemo(() => {
    const t = boardText(EVIDENCE[id].title.split(':')[0], EVIDENCE[id].title.split(': ')[1] ?? '', 0.75, 'ink');
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.9 });
  }, [id]);
  useFrame(() => {
    const target = sfx.opened.has(id) ? 1 : 0;
    open.current += (target - open.current) * (1 - Math.exp(-world.dt * 2.2));
    cover.current.rotation.z = open.current * 2.9;
  });
  const x = -0.7 + i * 0.35;
  return (
    <group position={[x, 0.79, 0.12 - (i % 2) * 0.12]} rotation={[0, (i - 2) * 0.12, 0]}>
      <mesh geometry={boxGeo(0.22, 0.04, 0.3)} material={m.paper} position={[0.11, 0.02, 0]} castShadow />
      <mesh material={pageMat} position={[0.11, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.27]} />
      </mesh>
      <group ref={cover} position={[0, 0.045, 0]}>
        <mesh geometry={boxGeo(0.23, 0.012, 0.31)} material={coverMat} position={[0.115, 0, 0]} castShadow />
      </group>
    </group>
  );
}

function Desk() {
  const m = mats();
  const done = useGame((s) => s.progress.completed.study);
  return (
    <group position={[STUDY.desk.x, 0, STUDY.desk.z]}>
      <Interactive id="study-desk" maxDist={3.2} label={() => (game().lessonActive || done ? null : 'Sit at the scholar’s desk')} onUse={() => openLesson('study')}>
        <mesh geometry={boxGeo(1.8, 0.06, 0.9, 'x')} material={m.mahogany} position={[0, 0.76, 0]} castShadow receiveShadow />
      </Interactive>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} geometry={boxGeo(0.42, 0.73, 0.82)} material={m.walnutPanel} position={[x, 0.365, 0]} castShadow />
      ))}
      {BOOKS.map((id, i) => (
        <Book key={id} id={id} i={i} />
      ))}
      {/* Index cards and the desk lamp */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={boxGeo(0.13, 0.004, 0.08)} material={m.paper} position={[0.55 + i * 0.03, 0.79 + i * 0.004, -0.28]} rotation={[0, 0.2 * i, 0]} />
      ))}
      <mesh geometry={latheGeo('lampBase', LATHES.lampBase)} material={m.brass} position={[0.72, 0.79, 0.3]} scale={0.7} />
      <mesh geometry={latheGeo('lampShade', LATHES.lampShade)} material={m.lampGlass} position={[0.72, 1.0, 0.3]} scale={0.7} />
      <group position={[0.4, 0.795, 0.3]} rotation={[-Math.PI / 2, 0, 1.2]}>
        <CollectibleKey keyId="studyKey" variant="gallery" tint="#a98f5a" />
      </group>
    </group>
  );
}

/** Floor-to-ceiling bookcases on the west wall; all the spines are one instanced mesh. */
function Bookcases() {
  const m = mats();
  const spines = useRef<THREE.InstancedMesh>(null!);
  const COUNT = 168;
  const x = STUDY.x0 + 0.22;
  const z0 = -2.6;
  const z1 = -8.4;
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const shelf = Math.floor(i / 28);
      const k = i % 28;
      const h = 0.26 + ((i * 53) % 9) * 0.012;
      dummy.position.set(x + 0.04, 0.35 + shelf * 0.5 + h / 2, z0 - k * 0.205 - ((i * 31) % 5) * 0.004);
      dummy.rotation.set(((i * 7) % 11 === 0 ? 0.15 : 0), 0, 0);
      dummy.scale.set(1, h / 0.3, 1);
      dummy.updateMatrix();
      spines.current.setMatrixAt(i, dummy.matrix);
      spines.current.setColorAt(i, col.set(COVERS[(i * 7) % COVERS.length]).multiplyScalar(0.8 + ((i * 13) % 5) * 0.08));
    }
    spines.current.instanceMatrix.needsUpdate = true;
    if (spines.current.instanceColor) spines.current.instanceColor.needsUpdate = true;
  }, [x]);
  const bookMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8 }), []);
  return (
    <group>
      <mesh geometry={boxGeo(0.4, 3.3, z0 - z1 + 0.2)} material={m.walnut} position={[x - 0.05, 1.65, (z0 + z1) / 2]} castShadow receiveShadow />
      {Array.from({ length: 7 }, (_, s) => (
        <mesh key={s} geometry={boxGeo(0.42, 0.03, z0 - z1 + 0.2)} material={m.walnutPanel} position={[x, 0.33 + s * 0.5, (z0 + z1) / 2]} />
      ))}
      <instancedMesh ref={spines} args={[undefined, undefined, COUNT]} material={bookMat}>
        <boxGeometry args={[0.24, 0.3, 0.19]} />
      </instancedMesh>
    </group>
  );
}

function Globe() {
  const m = mats();
  const sphere = useRef<THREE.Mesh>(null!);
  useFrame(() => (sphere.current.rotation.y += world.dt * 0.05));
  return (
    <group position={[STUDY.globe.x, 0, STUDY.globe.z]}>
      <mesh geometry={latheGeo('pedestal', LATHES.pedestal)} material={m.walnut} scale={[0.4, 0.8, 0.4]} castShadow />
      <mesh ref={sphere} material={m.parchment} position={[0, 1.05, 0]} rotation={[0.4, 0, 0]} castShadow>
        <sphereGeometry args={[0.28, 24, 16]} />
      </mesh>
      <mesh material={m.brass} position={[0, 1.05, 0]} rotation={[0.4, 0, Math.PI / 2]}>
        <torusGeometry args={[0.31, 0.01, 6, 32]} />
      </mesh>
    </group>
  );
}

/** An old map of famous stories on the north wall. */
function StoryMap() {
  const mat = useMemo(() => {
    const t = boardText('A Map of Old Stories', 'Troy · Olympus · the Forest of Sleeping Beauty · the Valley of Elah · the River of Forgetting', 1.6, 'ink');
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  }, []);
  return (
    <mesh material={mat} position={[-10.4, 2.3, STUDY.zN - 0.02]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[1.6, 1.0]} />
    </mesh>
  );
}

export function ScholarsStudy() {
  const m = mats();
  return (
    <group>
      <EvidenceCues />
      <RoomShell
        x0={STUDY.x0}
        x1={STUDY.x1}
        zN={STUDY.zN}
        zS={STUDY.zS}
        height={STUDY.height}
        wall={m.wallStudy}
        floor={m.floorHall}
        own={['N', 'S', 'W']}
        doors={[{ side: 'E', at: STUDY.doorZ, width: 0.96 }]}
        windows={[{ side: 'W', at: -9.2, width: 0.9, sill: 1.0, top: 2.8 }]}
        rail={3.4}
      />
      <Rug position={[STUDY.desk.x, 0, STUDY.desk.z]} w={3.4} d={2.6} material={m.rugHall} />
      <Desk />
      <Bookcases />
      <Globe />
      <StoryMap />
      <Easel position={[STUDY.board.x, 0, STUDY.board.z]} rotationY={-Math.PI / 2} heading="The Scholar’s Index" text={() => sfx.board} style="ink" />
    </group>
  );
}
