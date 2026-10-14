import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fx } from '../lesson/fx';
import { curtainMoodFor } from '../lesson/lessonMachine';
import { game, useGame } from '../state/store';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { removeDynamicCollider, setDynamicCollider, boxAt } from '../world/collision';
import { CORRIDOR, MIRRORS, WALL_T } from '../world/layout';
import { Architrave, CeilingRose, Cornice, OnWall, PanelField, Run, Slab, Wainscot, Wall, wallLocal } from './parts/Architecture';
import { Curtains } from './parts/Curtains';
import { Chandelier, Sconce, lightMood } from './parts/Lights';
import { Candelabrum, Chaise, ConsoleTable, ProfileFrame, Rug, SashWindow } from './parts/Furnishings';
import { MirrorGlass, ReflectionPlane } from './parts/Reflection';
import { Interactive } from './Interactive';
import { openLesson } from '../lesson/director';
import { clockFace } from '../systems/textures';

const { x0, x1, zStart, zEnd, height } = MIRRORS;
const MZ = MIRRORS.mirrorZ;
const mirror = MIRRORS.mirror;
const speak = MIRRORS.speaking;
const jib = MIRRORS.jibDoor;

/** Reflections only render while you can actually see this room. */
const roomVisible = () => {
  const s = game();
  return s.zone === 'mirrors' || (s.zone === 'corridor' && s.doors.mirror);
};

function Crest({ w, big = false }: { w: number; big?: boolean }) {
  const m = mats();
  const s = big ? 1.35 : 1;
  return (
    <group scale={s}>
      <mesh material={m.gilt} scale={[1, 1.25, 0.35]} castShadow>
        <sphereGeometry args={[0.1, 20, 14]} />
      </mesh>
      {[-1, 1].map((d) => (
        <group key={d}>
          <mesh material={m.gilt} position={[d * 0.2, -0.04, 0]} rotation={[0, 0, d * 0.5]} castShadow>
            <torusGeometry args={[0.07, 0.018, 8, 20, Math.PI * 1.4]} />
          </mesh>
          <mesh material={m.gilt} position={[d * (w / 2 - 0.1), -0.08, 0]} rotation={[0, 0, d * -0.3]}>
            <torusGeometry args={[0.05, 0.016, 8, 16, Math.PI * 1.2]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.gilt} position={[0, 0.17, 0]}>
        <coneGeometry args={[0.035, 0.12, 8]} />
      </mesh>
    </group>
  );
}

/** A tall pier mirror in a gilt frame (local wall frame, centred on x). */
function PierMirror({ x, fxRef, seed, label }: { x: number; fxRef?: typeof fx.speaking; seed: number; label?: { id: string; text: () => string | null; onUse: () => void } }) {
  const m = mats();
  const h = mirror.top - mirror.bottom;
  const cy = (mirror.top + mirror.bottom) / 2;
  const body = (
    <group position={[x, cy, 0]}>
      <mesh geometry={boxGeo(mirror.width + 0.04, h + 0.04, 0.02)} material={m.blackPaint} position={[0, 0, 0.01]} />
      <MirrorGlass w={mirror.width} h={h} fx={fxRef} seed={seed} position={[0, 0, 0.03]} />
      <ProfileFrame w={mirror.width} h={h} profile="ornateFrame" material={m.gilt} />
      <group position={[0, h / 2 + 0.14, 0.03]}>
        <Crest w={mirror.width} />
      </group>
    </group>
  );
  if (!label) return body;
  return (
    <Interactive id={label.id} label={label.text} onUse={label.onUse} maxDist={3.2}>
      {body}
    </Interactive>
  );
}

function SpeakingMirror() {
  const m = mats();
  const h = speak.top - speak.bottom;
  const cy = (speak.top + speak.bottom) / 2;
  const x = wallLocal('z', -1, speak.z);
  const lessonActive = useGame((s) => s.lessonActive);
  return (
    <Interactive
      id="speaking-mirror"
      label={() => (game().lessonActive ? null : game().lesson.completed ? 'Look into the mirror again' : 'Look into the mirror')}
      onUse={openLesson}
      maxDist={3.6}
    >
      <group position={[x, cy, 0]}>
        <mesh geometry={boxGeo(speak.width + 0.06, h + 0.06, 0.02)} material={m.blackPaint} position={[0, 0, 0.01]} />
        <MirrorGlass w={speak.width} h={h} fx={fx.speaking} seed={7} position={[0, 0, 0.035]} />
        <ProfileFrame w={speak.width} h={h} profile="ornateFrame" material={m.gilt} />
        <ProfileFrame w={speak.width + 0.34} h={h + 0.34} profile="frame" material={m.gilt} />
        <group position={[0, h / 2 + 0.3, 0.05]}>
          <Crest w={speak.width} big />
        </group>
      </group>
      {!lessonActive && <SpeakingHint />}
    </Interactive>
  );
}

/** Until the lesson starts, the mirror quietly invites a closer look. */
function SpeakingHint() {
  useEffect(() => {
    if (game().lesson.stage === 'discover' && !game().lesson.discover.revealedA) {
      fx.speaking.text = 'Look closer.';
      fx.speaking.brightTarget = 0.18;
    }
  }, []);
  return null;
}

function MantelClock() {
  const m = mats();
  const minute = useRef<THREE.Mesh>(null!);
  const hour = useRef<THREE.Mesh>(null!);
  const dial = useMemo(() => new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.4 }), []);
  useFrame(() => {
    const d = new Date();
    const mins = d.getMinutes() + d.getSeconds() / 60;
    minute.current.rotation.z = -(mins / 60) * Math.PI * 2;
    hour.current.rotation.z = -((((d.getHours() % 12) + mins / 60) / 12) * Math.PI * 2);
  });
  return (
    <group>
      <mesh geometry={boxGeo(0.28, 0.32, 0.17)} material={m.mahogany} position={[0, 0.18, 0]} castShadow />
      <mesh material={m.mahogany} position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.17, 24, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh geometry={boxGeo(0.31, 0.03, 0.2)} material={m.mahogany} position={[0, 0.015, 0]} />
      <mesh material={dial} position={[0, 0.23, 0.0855]}>
        <circleGeometry args={[0.095, 40]} />
      </mesh>
      <mesh material={m.brass} position={[0, 0.23, 0.085]}>
        <ringGeometry args={[0.095, 0.11, 40]} />
      </mesh>
      <mesh ref={hour} position={[0, 0.23, 0.09]}>
        <planeGeometry args={[0.008, 0.11]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh ref={minute} position={[0, 0.23, 0.091]}>
        <planeGeometry args={[0.005, 0.16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh material={m.brass} position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.04, 0.007, 6, 16, Math.PI]} />
      </mesh>
      {[-0.12, 0.12].map((fx2) => (
        <mesh key={fx2} material={m.brass} position={[fx2, -0.005, 0.06]}>
          <sphereGeometry args={[0.018, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function KeyDrawer() {
  const m = mats();
  const drawer = useRef<THREE.Group>(null!);
  const key = useRef<THREE.Group>(null!);
  const keyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.25, emissive: '#5a3c10', emissiveIntensity: 0 }), []);
  useFrame(() => {
    fx.drawer += (fx.drawerTarget - fx.drawer) * (1 - Math.exp(-world.dt * 2.2));
    drawer.current.position.z = 0.42 + fx.drawer * 0.26;
    key.current.position.y = 0.05 + fx.drawer * 0.03 + Math.sin(world.t * 1.5) * 0.004 * fx.drawer;
    key.current.rotation.y = world.t * 0.4 * fx.drawer;
    keyMat.emissiveIntensity = fx.drawer * (0.6 + Math.sin(world.t * 2) * 0.25);
  });
  return (
    <group ref={drawer} position={[0, 0.66, 0.42]}>
      <mesh geometry={boxGeo(0.56, 0.11, 0.02)} material={m.mahogany} position={[0, 0, 0.01]} castShadow />
      <mesh material={m.brass} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
      </mesh>
      <mesh geometry={boxGeo(0.5, 0.09, 0.32)} material={m.velvetOx} position={[0, -0.005, -0.16]} />
      <group ref={key} position={[0, 0.05, -0.14]} rotation={[0, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={keyMat} position={[-0.07, 0, 0]}>
            <torusGeometry args={[0.028, 0.008, 8, 20]} />
          </mesh>
          <mesh material={keyMat} position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
          </mesh>
          <mesh geometry={boxGeo(0.018, 0.03, 0.006)} material={keyMat} position={[0.07, -0.018, 0]} />
          <mesh geometry={boxGeo(0.012, 0.022, 0.006)} material={keyMat} position={[0.05, -0.014, 0]} />
        </group>
      </group>
    </group>
  );
}

function JibDoor() {
  const m = mats();
  const leaf = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.PointLight>(null!);
  const localC = wallLocal('z', 1, jib.z);
  const hingeX = localC - jib.width / 2;
  useEffect(() => {
    const id = 'door:jib';
    setDynamicCollider(id, boxAt(x0 - 0.15, jib.z, 0.3, jib.width + 0.1), true);
    return () => removeDynamicCollider(id);
  }, []);
  useFrame(() => {
    fx.jib += (fx.jibTarget - fx.jib) * (1 - Math.exp(-world.dt * 1.4));
    leaf.current.rotation.y = fx.jib * 0.75;
    glow.current.intensity = fx.jib * 3.2 * (0.95 + Math.sin(world.t * 6) * 0.05);
    setDynamicCollider('door:jib', boxAt(x0 - 0.15, jib.z, 0.3, jib.width + 0.1), fx.jib < 0.5);
  });
  const W = jib.width - 0.006;
  return (
    <group>
      <group position={[hingeX, 0, -0.02]} ref={leaf}>
        <Interactive
          id="jib-door"
          label={() => (fx.jib > 0.5 ? 'Look through the hidden door' : null)}
          onUse={() => useGame.getState().showNotice('A narrow passage leads toward the Portrait Gallery.', 'That room opens in the next chapter.')}
        >
          {/* The leaf carries its own wallpaper and panelling, so it disappears into the wall */}
          <mesh geometry={boxGeo(W, jib.height, 0.04)} material={m.wallMirror} position={[W / 2, jib.height / 2, 0]} castShadow />
          <group position={[0, 0, 0.02]}>
            <PanelField x0={0.003} x1={W - 0.003} y0={0.2} y1={1.1} cols={1} material={m.walnutPanel} />
            <Run profile="dado" x0={0} x1={W} y={1.12} material={m.walnutPanel} />
            <Run profile="skirting" x0={0} x1={W} y={0} material={m.walnutPanel} />
          </group>
        </Interactive>
      </group>
      {/* The space behind */}
      <group position={[localC, 0, -WALL_T]}>
        <mesh geometry={boxGeo(1.5, 2.6, 0.04)} material={m.plasterWarm} position={[0, 1.3, -1.5]} />
        <mesh geometry={boxGeo(0.04, 2.6, 1.5)} material={m.plasterWarm} position={[-0.75, 1.3, -0.75]} />
        <mesh geometry={boxGeo(0.04, 2.6, 1.5)} material={m.plasterWarm} position={[0.75, 1.3, -0.75]} />
        <mesh geometry={boxGeo(1.5, 0.04, 1.5)} material={m.floorHall} position={[0, 0, -0.75]} />
        <mesh geometry={boxGeo(1.5, 0.04, 1.5)} material={m.darkInterior} position={[0, 2.6, -0.75]} />
        {/* A frame glimpsed at the end of the passage: the next room */}
        <group position={[0, 1.55, -1.47]}>
          <ProfileFrame w={0.5} h={0.66} profile="frame" material={m.gilt} />
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.5, 0.66]} />
            <meshStandardMaterial color="#1a1510" roughness={0.6} />
          </mesh>
        </group>
        <pointLight ref={glow} position={[0.3, 1.9, -0.9]} intensity={0} distance={4} decay={2} color="#ffae5c" />
      </group>
    </group>
  );
}

function ClockLight() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    fx.clockLight += (fx.clockLightTarget - fx.clockLight) * (1 - Math.exp(-world.dt * 2));
    ref.current.intensity = fx.clockLight * 2.6;
    lightMood.mirrors += (lightMood.mirrorsTarget - lightMood.mirrors) * (1 - Math.exp(-world.dt * 1.2));
  });
  return <pointLight ref={ref} position={[MIRRORS.x1 - 0.9, 1.75, MIRRORS.clock.z + 0.25]} intensity={0} distance={3} decay={2} color="#ffcf8a" />;
}

function SpeakingGlow() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    ref.current.intensity = fx.speaking.bright * 3.5 + fx.tunnel.tunnel * 0.0;
  });
  return <pointLight ref={ref} position={[MIRRORS.x1 - 0.7, 2.6, speak.z]} intensity={0} distance={5} decay={2} color="#d8d2c4" />;
}

export function HallOfMirrors() {
  const m = mats();
  const md = CORRIDOR.mirrorDoor;
  const win = MIRRORS.window;
  const mood = () => curtainMoodFor(game().lesson);

  return (
    <group>
      <Slab x0={x0} x1={x1} z0={zEnd} z1={zStart} y={0} material={m.parquet} />
      <Slab x0={x0} x1={x1} z0={zEnd} z1={zStart} y={height} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zEnd} z1={zStart} y={height} />
      <CeilingRose position={[0, height, (zStart + zEnd) / 2]} r={0.6} />
      {[-22.9, -26.9].map((z) => (
        <mesh key={z} geometry={boxGeo(x1 - x0, 0.18, 0.22, 'x')} material={m.ceiling} position={[0, height - 0.09, z]} castShadow />
      ))}

      {/* Walls */}
      <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zStart + WALL_T / 2} height={height} openings={[{ c: 0, w: md.width, b: 0, t: md.height }]} matPos={m.wallCorridor} matNeg={m.wallMirror} />
      <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zEnd - WALL_T / 2} height={height} openings={[{ c: 0, w: win.width, b: win.sill, t: win.top }]} matPos={m.wallMirror} matNeg={m.brick} />
      <Wall axis="z" from={zStart} to={zEnd} at={x0 - WALL_T / 2} height={height} openings={[{ c: jib.z, w: jib.width, b: 0, t: jib.height }]} matPos={m.wallMirror} matNeg={m.brick} />
      <Wall axis="z" from={zStart} to={zEnd} at={x1 + WALL_T / 2} height={height} matPos={m.brick} matNeg={m.wallMirror} />

      {/* Near wall (door from the corridor) */}
      <OnWall axis="x" face={zStart} normal={-1}>
        <Wainscot x0={wallLocal('x', -1, x1)} x1={wallLocal('x', -1, x0)} gaps={[[0, md.width + 0.36]]} />
        <Architrave c={0} w={md.width} h={md.height} />
        <Sconce x={-2.4} y={2.1} seed={41} light={false} room="mirrors" />
        <Sconce x={2.4} y={2.1} seed={42} light={false} room="mirrors" />
        <Run profile="pictureRail" x0={-x1} x1={-x0} y={3.95} material={m.gilt} />
      </OnWall>

      {/* Far wall: the window and its curtains */}
      <OnWall axis="x" face={zEnd} normal={1}>
        <Wainscot x0={x0} x1={x1} gaps={[[0, win.width + 0.2]]} />
        <PanelField x0={-win.width / 2 - 0.1} x1={win.width / 2 + 0.1} y0={0.2} y1={win.sill - 0.03} cols={2} material={m.walnutPanel} />
        <Run profile="skirting" x0={-win.width / 2 - 0.1} x1={win.width / 2 + 0.1} y={0} material={m.walnutPanel} />
        <SashWindow c={0} w={win.width} b={win.sill} t={win.top} drapes={false} />
        <Architrave c={0} w={win.width} h={win.top} />
        <group position={[0, win.top + 0.42, 0.2]}>
          <Curtains mood={mood} width={1.45} height={win.top + 0.38} gap={0.7} />
        </group>
        <Run profile="pictureRail" x0={x0} x1={x1} y={3.95} material={m.gilt} />
      </OnWall>

      {/* Left wall: three pier mirrors (the far one becomes the endless tunnel) and the hidden door */}
      <ReflectionPlane point={[x0 + 0.03, 2, -24.9]} normal={[1, 0, 0]} active={roomVisible}>
        <OnWall axis="z" face={x0} normal={1}>
          <Wainscot x0={wallLocal('z', 1, zStart)} x1={wallLocal('z', 1, zEnd)} gaps={[...MZ.map((z) => [wallLocal('z', 1, z), mirror.width + 0.34] as [number, number]), [wallLocal('z', 1, jib.z), jib.width]]} />
          {MZ.map((z, i) => (
            <group key={z}>
              <PierMirror x={wallLocal('z', 1, z)} seed={10 + i} fxRef={z === MIRRORS.tunnelMirror.z ? fx.tunnel : undefined} />
              <Run profile="skirting" x0={wallLocal('z', 1, z) - mirror.width / 2 - 0.17} x1={wallLocal('z', 1, z) + mirror.width / 2 + 0.17} y={0} material={m.walnutPanel} />
            </group>
          ))}
          <Sconce x={wallLocal('z', 1, -26.65)} y={2.3} seed={43} light={false} room="mirrors" />
          <Run profile="pictureRail" x0={wallLocal('z', 1, zStart)} x1={wallLocal('z', 1, zEnd)} y={3.95} material={m.gilt} />
          <JibDoor />
        </OnWall>
      </ReflectionPlane>

      {/* Right wall: pier mirrors and the speaking mirror over a console */}
      <ReflectionPlane point={[x1 - 0.03, 2, -24.9]} normal={[-1, 0, 0]} active={roomVisible}>
        <OnWall axis="z" face={x1} normal={-1}>
          <Wainscot x0={wallLocal('z', -1, zStart)} x1={wallLocal('z', -1, zEnd)} gaps={MZ.filter((z) => z !== speak.z).map((z) => [wallLocal('z', -1, z), mirror.width + 0.34] as [number, number])} />
          {MZ.filter((z) => z !== speak.z).map((z, i) => (
            <group key={z}>
              <PierMirror x={wallLocal('z', -1, z)} seed={20 + i} />
              <Run profile="skirting" x0={wallLocal('z', -1, z) - mirror.width / 2 - 0.17} x1={wallLocal('z', -1, z) + mirror.width / 2 + 0.17} y={0} material={m.walnutPanel} />
            </group>
          ))}
          <SpeakingMirror />
          <Run profile="pictureRail" x0={wallLocal('z', -1, zStart)} x1={wallLocal('z', -1, zEnd)} y={3.95} material={m.gilt} />
          <group position={[wallLocal('z', -1, speak.z), 0, 0]}>
            <ConsoleTable position={[0, 0, 0]} w={1.8} d={0.46} h={0.88} top={m.marbleCream} />
            <KeyDrawer />
            <group position={[wallLocal('z', -1, MIRRORS.clock.z) - wallLocal('z', -1, speak.z), 0.88, 0.22]}>
              <MantelClock />
            </group>
            <Candelabrum position={[0.62, 0.88, 0.2]} seed={44} intensity={3} />
          </group>
        </OnWall>
      </ReflectionPlane>

      {/* Furniture */}
      <Rug position={[0, 0, -24.9]} w={2.8} d={5.2} material={m.rugMirror} />
      <Chaise position={[-0.2, 0, -26.6]} rotationY={Math.PI / 2} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 3.75, 0, zEnd + 0.55]}>
          <mesh geometry={latheGeo('pedestal', LATHES.pedestal)} material={m.marbleCream} scale={[0.7, 1.45, 0.7]} castShadow />
          {s < 0 && <mesh geometry={latheGeo('urn', LATHES.urn)} material={m.ceramic} position={[0, 1.02, 0]} castShadow />}
        </group>
      ))}

      {/* Lighting */}
      <Chandelier position={[0, height, (zStart + zEnd) / 2]} drop={1.35} arms={6} radius={0.45} intensity={22} seed={51} room="mirrors" />
      <ClockLight />
      <SpeakingGlow />
      {/* Candles near the window keep the curtains readable */}
      <Candelabrum position={[3.75, 1.02, zEnd + 0.55]} seed={52} intensity={3.4} />
    </group>
  );
}
