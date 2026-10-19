/**
 * Room 6: the Whispering Press (ALLITERATION). A printing room west of the music room.
 * The press thumps by itself; the type cases whisper. Trays light up as Challenge A's pairs
 * are judged, and the class's headline is printed on the proof on the press.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { pfx } from '../lesson/laterFx';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boardText } from '../systems/boardText';
import { boxGeo } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { PRESS } from '../world/layout';
import { Easel } from './parts/Easel';
import { CollectibleKey } from './parts/Key';
import { RoomShell } from './parts/RoomShell';
import { Interactive } from './Interactive';

const TRAYS = ['phantom', 'cold', 'creaking', 'giant', 'whispering', 'silver'];

/** The Albion's frame, seen from the front: two cheeks joined by an arched crown and a base, one casting. */
const PRESS_FRAME = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0.0);
  s.lineTo(0.62, 0.0);
  s.lineTo(0.62, 2.05);
  s.quadraticCurveTo(0.6, 2.4, 0.0, 2.46);
  s.quadraticCurveTo(-0.6, 2.4, -0.62, 2.05);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.44, 0.24);
  hole.lineTo(-0.44, 1.92);
  hole.quadraticCurveTo(-0.42, 2.2, 0.0, 2.24);
  hole.quadraticCurveTo(0.42, 2.2, 0.44, 1.92);
  hole.lineTo(0.44, 0.24);
  hole.closePath();
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -0.11);
  return g;
})();

function HandPress() {
  const m = mats();
  const platen = useRef<THREE.Group>(null!);
  const work = useRef(0);
  const done = useGame((s) => s.progress.completed.press);
  const proofMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boardText('The Last Edition', ' ', 1.4, 'ink'), roughness: 0.9 }), []);
  const proof = useRef<THREE.Mesh>(null!);
  const last = useRef('');
  useFrame(() => {
    work.current += (pfx.workTarget - work.current) * (1 - Math.exp(-world.dt * 2));
    // The platen comes down in a steady rhythm, harder when the press is working.
    const beat = Math.max(0, Math.sin(world.t * 2.4)) ** 6;
    platen.current.position.y = 1.55 - beat * 0.16 * work.current;
    const text = pfx.proof;
    proof.current.visible = !!text;
    if (text && text !== last.current) {
      last.current = text;
      proofMat.map = boardText('The Last Edition', text, 1.4, 'ink');
      proofMat.needsUpdate = true;
    }
  });
  return (
    <group position={[PRESS.press.x, 0, PRESS.press.z]} rotation={[0, Math.PI / 2, 0]}>
      {/* Turned to face the doorway, so the class sees the bed, the platen and the proof. */}
      <Interactive id="press-machine" maxDist={3.2} label={() => (game().lessonActive || done ? null : 'Use the press')} onUse={() => openLesson('press')}>
        {/* An Albion iron hand press: the arched frame is one casting, crowned at the top */}
        <mesh geometry={PRESS_FRAME} material={m.iron} castShadow receiveShadow />
        <mesh material={m.brass} position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.07, 12, 8]} />
        </mesh>
        {/* Feet */}
        {[-0.56, 0.56].map((x) => (
          <mesh key={x} geometry={boxGeo(0.24, 0.08, 0.62)} material={m.iron} position={[x, 0.04, 0.05]} castShadow />
        ))}
        {/* The rails (ribs) the bed runs out on, with their front leg */}
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} geometry={boxGeo(0.06, 0.07, 1.45)} material={m.iron} position={[x, 0.82, 0.32]} castShadow />
        ))}
        <mesh geometry={boxGeo(0.86, 0.06, 0.06, 'x')} material={m.iron} position={[0, 0.82, 1.02]} />
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} material={m.iron} position={[x, 0.41, 1.0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.8, 8]} />
          </mesh>
        ))}
        {/* Bed with the forme of type locked in its chase */}
        <mesh geometry={boxGeo(0.96, 0.1, 0.9)} material={m.iron} position={[0, 0.9, 0.18]} castShadow receiveShadow />
        <mesh geometry={boxGeo(0.8, 0.04, 0.66)} material={m.leadType} position={[0, 0.97, 0.18]} />
        {/* The tympan, hinged at the front of the bed and raised, with a sheet in it */}
        <group position={[0, 0.96, 0.66]} rotation={[-1.05, 0, 0]}>
          {[-0.39, 0.39].map((x) => (
            <mesh key={x} geometry={boxGeo(0.03, 0.02, 0.74)} material={m.iron} position={[x, 0, 0.37]} />
          ))}
          <mesh geometry={boxGeo(0.81, 0.02, 0.03, 'x')} material={m.iron} position={[0, 0, 0.74]} />
          <mesh geometry={boxGeo(0.72, 0.006, 0.66)} material={m.paintCream} position={[0, 0.006, 0.37]} />
        </group>
        <group ref={platen} position={[0, 1.55, 0.05]}>
          <mesh geometry={boxGeo(0.86, 0.09, 0.7)} material={m.iron} castShadow />
        </group>
        {/* The spindle, and the bar that turns it: a long iron handle with a wooden grip */}
        <mesh material={m.iron} position={[0, 1.8, 0.05]}>
          <cylinderGeometry args={[0.055, 0.055, 0.42, 12]} />
        </mesh>
        <group position={[0.06, 1.85, 0.05]} rotation={[0, -0.5, 0]}>
          <mesh material={m.iron} position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2 + 0.06]}>
            <cylinderGeometry args={[0.022, 0.03, 1.1, 8]} />
          </mesh>
          <mesh material={m.walnut} position={[1.12, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
          </mesh>
        </group>
        {/* The rounce: the wheel that winds the bed in and out */}
        <group position={[-0.45, 0.82, 0.62]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={m.iron}>
            <torusGeometry args={[0.13, 0.014, 6, 18]} />
          </mesh>
          <mesh material={m.walnut} position={[0.13, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.12, 8]} />
          </mesh>
        </group>
      </Interactive>
      {/* The printed proof, pinned to the front of the frame above the platen */}
      <mesh ref={proof} material={proofMat} position={[0, 1.86, 0.2]} visible={false}>
        <planeGeometry args={[0.8, 0.5]} />
      </mesh>
      <group position={[-0.3, 1.0, 0.35]} rotation={[-Math.PI / 2, 0, -0.4]}>
        <CollectibleKey keyId="pressKey" variant="gallery" tint="#7f8389" />
      </group>
    </group>
  );
}

/** Type cases along the north wall; each of Challenge A's trays lights when its pair is judged. */
function TypeCases() {
  const m = mats();
  const lit = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2316', emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 1.4, roughness: 0.6 }), []);
  const dark = m.leadType;
  const refs = useRef<THREE.Mesh[]>([]);
  useFrame(() => {
    TRAYS.forEach((id, i) => {
      const mesh = refs.current[i];
      if (mesh) mesh.material = pfx.inked.has(id) ? lit : dark;
    });
  });
  return (
    <group position={[PRESS.cases.x, 0, PRESS.cases.z]}>
      <mesh geometry={boxGeo(2.5, 0.95, 0.55, 'x')} material={m.walnutPanel} position={[0, 0.48, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(2.5, 0.06, 0.6, 'x')} material={m.walnut} position={[0, 0.98, 0.02]} />
      {TRAYS.map((id, i) => (
        <group key={id} position={[-1.0 + i * 0.4, 1.06, 0.02]} rotation={[-0.35, 0, 0]}>
          <mesh geometry={boxGeo(0.36, 0.04, 0.5)} material={m.walnut} />
          <mesh
            ref={(r) => {
              if (r) refs.current[i] = r;
            }}
            material={dark}
            position={[0, 0.025, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.3, 0.44]} />
          </mesh>
        </group>
      ))}
      {/* Upper rack of cases */}
      <mesh geometry={boxGeo(2.5, 1.0, 0.3, 'x')} material={m.walnut} position={[0, 1.9, -0.12]} castShadow />
    </group>
  );
}

/** Proofs drying on lines across the room. */
function DryingLines() {
  const m = mats();
  const sheets = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) out.push([PRESS.x0 + 1.2 + i * 0.8, 2.55 - (i % 2) * 0.04, -30.4 - (i % 3) * 0.05]);
    for (let i = 0; i < 7; i++) out.push([PRESS.x0 + 1.6 + i * 0.85, 2.6, -34.6]);
    return out;
  }, []);
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    // The sheets stir as if something whispered past.
    ref.current.children.forEach((c, i) => (c.rotation.x = Math.sin(world.t * 0.8 + i) * 0.06));
  });
  return (
    <group>
      {[-30.4, -34.6].map((z) => (
        <mesh key={z} material={m.iron} position={[(PRESS.x0 + PRESS.x1) / 2, 2.85, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, PRESS.x1 - PRESS.x0, 4]} />
        </mesh>
      ))}
      <group ref={ref}>
        {sheets.map((p, i) => (
          <mesh key={i} material={m.paper} position={p}>
            <planeGeometry args={[0.42, 0.58]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Whispers() {
  const t = useRef(9);
  useFrame(() => {
    if (game().zone !== 'press' || world.dt === 0 || game().lessonActive) return;
    t.current -= world.dt;
    if (t.current > 0) return;
    t.current = 18 + Math.random() * 14;
    audio.whisperS([PRESS.cases.x, 1.4, PRESS.cases.z]);
  });
  return null;
}

export function WhisperingPress() {
  const m = mats();
  return (
    <group>
      <Whispers />
      <RoomShell
        x0={PRESS.x0}
        x1={PRESS.x1}
        zN={PRESS.zN}
        zS={PRESS.zS}
        height={PRESS.height}
        wall={m.wallPress}
        floor={m.floorDark}
        own={['N', 'S', 'W']}
        doors={[{ side: 'E', at: PRESS.doorZ, width: 0.96 }]}
        windows={[{ side: 'W', at: -31.0, width: 1.2, sill: 0.9, top: 2.9 }]}
        rail={2.9}
      />
      <HandPress />
      <TypeCases />
      <DryingLines />
      {/* Composing stone */}
      <group position={[-19.5, 0, -35.2]}>
        <mesh geometry={boxGeo(1.4, 0.85, 0.9, 'x')} material={m.walnut} position={[0, 0.42, 0]} castShadow receiveShadow />
        <mesh geometry={boxGeo(1.45, 0.06, 0.95, 'x')} material={m.marbleDark} position={[0, 0.88, 0]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} geometry={boxGeo(0.3, 0.04, 0.4)} material={m.paper} position={[-0.4 + i * 0.2, 0.93 + i * 0.004, (i % 2) * 0.1]} rotation={[0, i * 0.3, 0]} />
        ))}
      </group>
      <Easel position={[PRESS.board.x, 0, PRESS.board.z]} rotationY={0} heading="The Last Edition" text={() => pfx.board} style="ink" />
    </group>
  );
}
