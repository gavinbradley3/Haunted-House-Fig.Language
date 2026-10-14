/** Furniture and fittings. Proportions follow real Victorian pieces (metres). */
import { useMemo, useRef, type ReactElement } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boxGeo, latheGeo, LATHES, profileGeo, PROFILES, runTransform } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { painting, type PaintingKind } from '../../systems/textures';
import { world } from '../../systems/time';
import { CandleLight, Flame } from './Lights';
import { RoundedBox } from '@react-three/drei';

// ------------------------------------------------------------------ helpers

/** Rectangular frame from a profile, mitre-free (corner overlap reads as a joint). Local, facing +z, centred. */
export function ProfileFrame({ w, h, profile = 'frame', material }: { w: number; h: number; profile?: keyof typeof PROFILES; material: THREE.Material }) {
  const runs = useMemo(() => {
    const N = new THREE.Vector3(0, 0, 1);
    const hw = w / 2;
    const hh = h / 2;
    const ext = Math.max(...PROFILES[profile].map((p) => p[1]));
    return [
      runTransform(new THREE.Vector3(-hw - ext, hh, 0), new THREE.Vector3(hw + ext, hh, 0), N, new THREE.Vector3(0, 1, 0)),
      runTransform(new THREE.Vector3(-hw - ext, -hh, 0), new THREE.Vector3(hw + ext, -hh, 0), N, new THREE.Vector3(0, -1, 0)),
      runTransform(new THREE.Vector3(-hw, -hh, 0), new THREE.Vector3(-hw, hh, 0), N, new THREE.Vector3(-1, 0, 0)),
      runTransform(new THREE.Vector3(hw, -hh, 0), new THREE.Vector3(hw, hh, 0), N, new THREE.Vector3(1, 0, 0)),
    ];
  }, [w, h, profile]);
  return (
    <group>
      {runs.map((r, i) => (
        <mesh key={i} geometry={profileGeo(profile, PROFILES[profile], r.length)} material={material} matrix={r.matrix} matrixAutoUpdate={false} castShadow />
      ))}
    </group>
  );
}

/** Framed oil painting, local wall frame. */
export function Painting({ x, y, w, h, kind, seed = 1 }: { x: number; y: number; w: number; h: number; kind: PaintingKind; seed?: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: painting(kind, seed), roughness: 0.5, emissiveMap: painting(kind, seed), emissive: new THREE.Color(0.06, 0.05, 0.04) }), [kind, seed]);
  return (
    <group position={[x, y, 0.02]} rotation={[-0.04, 0, 0]}>
      <mesh material={mat} position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh geometry={boxGeo(w + 0.02, h + 0.02, 0.02)} material={mats().blackPaint} position={[0, 0, 0]} />
      <ProfileFrame w={w} h={h} profile="frame" material={mats().gilt} />
      {/* Hanging cord to the picture rail */}
      <mesh material={mats().brass} position={[0, h / 2 + 0.5, -0.01]}>
        <cylinderGeometry args={[0.002, 0.002, 1.0, 4]} />
      </mesh>
    </group>
  );
}

/** Static velvet drape: a pleated curtain hanging from the top, gathered toward the bottom. */
export function drapeGeometry(width: number, height: number, folds: number, gather = 0.75) {
  const segX = folds * 8;
  const segY = 24;
  const g = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = (y + height / 2) / height; // 0 bottom .. 1 top
    const u = (x + width / 2) / width;
    const squeeze = 1 - (1 - v) * (1 - gather) * Math.sin(Math.PI * Math.min(1, (1 - v) * 1.4));
    const depth = 0.05 + (1 - v) * 0.03;
    pos.setX(i, (u - 0.5) * width * squeeze);
    pos.setZ(i, Math.sin(u * folds * Math.PI * 2) * depth);
    pos.setY(i, y);
  }
  g.translate(0, -height / 2, 0);
  g.computeVertexNormals();
  return g;
}

/** Sash window in a wall opening (local wall frame: interior face at z = 0, wall toward −z). */
export function SashWindow({
  c,
  w,
  b,
  t,
  depth = 0.3,
  drapes = true,
  frameMat,
}: {
  c: number;
  w: number;
  b: number;
  t: number;
  depth?: number;
  drapes?: boolean;
  frameMat?: THREE.Material;
}) {
  const m = mats();
  const fm = frameMat ?? m.paintTrim;
  const h = t - b;
  const zMid = -depth / 2;
  const sashH = h / 2 + 0.02;
  const fw = 0.06;
  const sash = (yCenter: number, z: number) => {
    const iw = w - fw * 2;
    const bars: ReactElement[] = [];
    bars.push(<mesh key="l" geometry={boxGeo(0.045, sashH, 0.045)} material={fm} position={[-iw / 2 + 0.0225, 0, 0]} castShadow />);
    bars.push(<mesh key="r" geometry={boxGeo(0.045, sashH, 0.045)} material={fm} position={[iw / 2 - 0.0225, 0, 0]} castShadow />);
    bars.push(<mesh key="t" geometry={boxGeo(iw, 0.05, 0.045)} material={fm} position={[0, sashH / 2 - 0.025, 0]} castShadow />);
    bars.push(<mesh key="b" geometry={boxGeo(iw, 0.06, 0.045)} material={fm} position={[0, -sashH / 2 + 0.03, 0]} castShadow />);
    bars.push(<mesh key="m" geometry={boxGeo(0.022, sashH, 0.03)} material={fm} position={[0, 0, 0]} castShadow />);
    bars.push(<mesh key="g" geometry={boxGeo(iw, sashH, 0.004)} material={m.glass} position={[0, 0, 0]} />);
    return (
      <group position={[c, yCenter, z]} key={yCenter}>
        {bars}
      </group>
    );
  };
  const drape = useMemo(() => drapeGeometry(0.75, t - b + 0.5, 4), [t, b]);
  return (
    <group>
      {/* Box frame in the reveal */}
      <mesh geometry={boxGeo(w, fw, depth * 0.6)} material={fm} position={[c, b + fw / 2, zMid]} />
      <mesh geometry={boxGeo(w, fw, depth * 0.6)} material={fm} position={[c, t - fw / 2, zMid]} />
      <mesh geometry={boxGeo(fw, h, depth * 0.6)} material={fm} position={[c - w / 2 + fw / 2, (b + t) / 2, zMid]} />
      <mesh geometry={boxGeo(fw, h, depth * 0.6)} material={fm} position={[c + w / 2 - fw / 2, (b + t) / 2, zMid]} />
      {sash(t - fw - sashH / 2 + 0.01, zMid - 0.03)}
      {sash(b + fw + sashH / 2 - 0.01, zMid + 0.03)}
      {/* Interior sill board */}
      <mesh geometry={boxGeo(w + 0.16, 0.035, 0.1 + depth / 2)} material={m.walnut} position={[c, b - 0.0175, -depth / 4 + 0.05]} castShadow receiveShadow />
      {drapes && (
        <group>
          <mesh geometry={boxGeo(w + 0.7, 0.24, 0.16)} material={m.walnut} position={[c, t + 0.32, 0.08]} castShadow />
          <mesh geometry={drape} material={m.velvetGreen} position={[c - w / 2 - 0.12, t + 0.22, 0.12]} castShadow />
          <mesh geometry={drape} material={m.velvetGreen} position={[c + w / 2 + 0.12, t + 0.22, 0.12]} castShadow />
        </group>
      )}
    </group>
  );
}

// ------------------------------------------------------------------ hall furniture

/** Longcase clock with a real swinging pendulum and moving hands. World-space position at floor, facing +z. */
export function GrandfatherClock({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const m = mats();
  const pendulum = useRef<THREE.Group>(null!);
  const hourHand = useRef<THREE.Mesh>(null!);
  const minHand = useRef<THREE.Mesh>(null!);
  const finial = latheGeo('finial', LATHES.finial);
  useFrame(() => {
    // Seconds pendulum: one swing per second, ticking in step with the audio.
    pendulum.current.rotation.z = Math.sin(world.t * Math.PI) * 0.07;
    const d = new Date();
    const mins = d.getMinutes() + d.getSeconds() / 60;
    const hrs = (d.getHours() % 12) + mins / 60;
    minHand.current.rotation.z = -(mins / 60) * Math.PI * 2;
    hourHand.current.rotation.z = -(hrs / 12) * Math.PI * 2;
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Plinth */}
      <mesh geometry={boxGeo(0.56, 0.5, 0.36)} material={m.mahogany} position={[0, 0.25, 0]} castShadow receiveShadow />
      <mesh geometry={boxGeo(0.6, 0.06, 0.4)} material={m.mahogany} position={[0, 0.03, 0]} castShadow />
      <mesh geometry={boxGeo(0.6, 0.04, 0.4)} material={m.mahogany} position={[0, 0.52, 0]} />
      {/* Trunk with glazed door to see the pendulum */}
      <mesh geometry={boxGeo(0.44, 1.05, 0.3)} material={m.mahogany} position={[0, 1.06, -0.02]} castShadow />
      <mesh geometry={boxGeo(0.28, 0.82, 0.01)} material={m.darkInterior} position={[0, 1.06, 0.131]} />
      <mesh geometry={boxGeo(0.3, 0.84, 0.004)} material={m.glass} position={[0, 1.06, 0.14]} />
      <group position={[0, 1.6, 0.12]} ref={pendulum}>
        <mesh material={m.brass} position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.64, 4]} />
        </mesh>
        <mesh material={m.brass} position={[0, -0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.012, 24]} />
        </mesh>
      </group>
      <mesh geometry={boxGeo(0.52, 0.05, 0.36)} material={m.mahogany} position={[0, 1.61, 0]} />
      {/* Hood */}
      <mesh geometry={boxGeo(0.54, 0.6, 0.36)} material={m.mahogany} position={[0, 1.94, 0]} castShadow />
      <mesh material={m.clockDial} position={[0, 1.95, 0.183]}>
        <circleGeometry args={[0.2, 48]} />
      </mesh>
      <mesh material={m.brass} position={[0, 1.95, 0.181]}>
        <ringGeometry args={[0.2, 0.225, 48]} />
      </mesh>
      <mesh ref={hourHand} position={[0, 1.95, 0.19]}>
        <planeGeometry args={[0.012, 0.22]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh ref={minHand} position={[0, 1.95, 0.192]}>
        <planeGeometry args={[0.008, 0.34]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} material={m.mahogany} position={[x, 1.94, 0.17]}>
          <cylinderGeometry args={[0.02, 0.02, 0.58, 10]} />
        </mesh>
      ))}
      {/* Swan-neck pediment approximation */}
      <mesh geometry={boxGeo(0.6, 0.06, 0.4)} material={m.mahogany} position={[0, 2.27, 0]} castShadow />
      <mesh material={m.mahogany} position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
        <cylinderGeometry args={[0.28, 0.28, 0.32, 24, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      {[-0.24, 0, 0.24].map((x, i) => (
        <mesh key={i} geometry={finial} material={m.brass} position={[x, i === 1 ? 2.58 : 2.3, 0.05]} />
      ))}
    </group>
  );
}

/** Console / pier table with turned legs. Faces +z, back against the wall at local z = 0. */
export function ConsoleTable({ position, rotationY = 0, w = 1.4, d = 0.42, h = 0.84, top }: { position: [number, number, number]; rotationY?: number; w?: number; d?: number; h?: number; top?: THREE.Material }) {
  const m = mats();
  const leg = latheGeo('tableLeg', LATHES.tableLeg);
  const legH = h - 0.04;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={boxGeo(w, 0.035, d, 'x')} material={top ?? m.marbleDark} position={[0, h - 0.0175, d / 2]} castShadow receiveShadow />
      <mesh geometry={boxGeo(w - 0.1, 0.12, d - 0.08, 'x')} material={m.mahogany} position={[0, h - 0.095, d / 2]} castShadow />
      {[
        [-w / 2 + 0.06, 0.06],
        [w / 2 - 0.06, 0.06],
        [-w / 2 + 0.06, d - 0.06],
        [w / 2 - 0.06, d - 0.06],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={m.mahogany} position={[x, 0, z]} scale={[1, legH / 0.7, 1]} castShadow />
      ))}
      <mesh geometry={boxGeo(w - 0.16, 0.02, d - 0.16, 'x')} material={m.mahogany} position={[0, 0.16, d / 2]} castShadow />
    </group>
  );
}

/** Round centre table on a pedestal with a vase of dried hydrangeas. */
export function CentreTable({ position }: { position: [number, number, number] }) {
  const m = mats();
  const ped = latheGeo('pedestal', LATHES.pedestal);
  const vase = latheGeo('vase', LATHES.vase);
  const blooms = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + i;
      const r = 0.06 + (i % 3) * 0.04;
      out.push([Math.cos(a) * r, 0.56 + (i % 3) * 0.05, Math.sin(a) * r, 0.05 + (i % 2) * 0.015]);
    }
    return out;
  }, []);
  return (
    <group position={position}>
      <mesh geometry={ped} material={m.mahogany} castShadow receiveShadow />
      <mesh material={m.mahogany} position={[0, 0.73, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.56, 0.04, 48]} />
      </mesh>
      <mesh material={m.mahogany} position={[0, 0.69, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
      </mesh>
      <group position={[0, 0.75, 0]}>
        <mesh geometry={vase} material={m.ceramic} castShadow />
        {blooms.map(([x, y, z, r], i) => (
          <mesh key={i} material={i % 3 ? m.driedFlower : m.parchment} position={[x, y, z]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={m.foliage} position={[Math.sin(i * 2) * 0.05, 0.5, Math.cos(i * 2) * 0.05]} rotation={[Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4]}>
            <cylinderGeometry args={[0.003, 0.003, 0.2, 4]} />
          </mesh>
        ))}
        {/* A stack of books and a candlestick */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={boxGeo(0.22 - i * 0.02, 0.04, 0.16 - i * 0.01, 'x')} material={m.bookCloth[i]} position={[-0.3, 0.02 + i * 0.04, 0.18]} rotation={[0, i * 0.2, 0]} castShadow />
        ))}
        <mesh geometry={latheGeo('candlestick', LATHES.candlestick)} material={m.brass} position={[0.3, 0, -0.15]} castShadow />
      </group>
    </group>
  );
}

/** Upholstered hall settle (bench) against a wall. Faces +z. */
export function Settle({ position, rotationY = 0, w = 1.5 }: { position: [number, number, number]; rotationY?: number; w?: number }) {
  const m = mats();
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={boxGeo(w, 0.42, 0.5, 'x')} material={m.walnut} position={[0, 0.21, 0.25]} castShadow receiveShadow />
      <mesh geometry={boxGeo(w - 0.08, 0.08, 0.46, 'x')} material={m.velvetOx} position={[0, 0.46, 0.27]} castShadow />
      <mesh geometry={boxGeo(w, 0.75, 0.06, 'x')} material={m.walnut} position={[0, 0.78, 0.03]} castShadow />
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} geometry={boxGeo(0.06, 0.7, 0.5)} material={m.walnut} position={[x, 0.55, 0.25]} castShadow />
      ))}
    </group>
  );
}

export function CoatStand({ position }: { position: [number, number, number] }) {
  const m = mats();
  return (
    <group position={position}>
      <mesh material={m.walnut} position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 1.8, 10]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={m.walnut} position={[Math.cos((i * Math.PI * 2) / 3) * 0.18, 0.08, Math.sin((i * Math.PI * 2) / 3) * 0.18]} rotation={[0, -(i * Math.PI * 2) / 3, Math.PI / 2.4]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={m.brass} position={[Math.cos(i * 1.57) * 0.09, 1.68, Math.sin(i * 1.57) * 0.09]} rotation={[0, -i * 1.57, -0.9]}>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
        </mesh>
      ))}
      {/* A dark overcoat hanging, folded shape */}
      <mesh material={m.blackPaint} position={[0.12, 1.25, 0.02]} scale={[0.6, 1, 0.45]} castShadow>
        <capsuleGeometry args={[0.16, 0.6, 4, 12]} />
      </mesh>
      <mesh material={m.leather} position={[-0.1, 1.82, 0.0]} castShadow>
        <cylinderGeometry args={[0.1, 0.11, 0.1, 20]} />
      </mesh>
      <mesh material={m.leather} position={[-0.1, 1.78, 0.0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.01, 24]} />
      </mesh>
    </group>
  );
}

/** Balloon-back side chair. Faces +z. */
export function SideChair({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const m = mats();
  const leg = latheGeo('chairLeg', [
    [0, 0],
    [0.018, 0],
    [0.022, 0.08],
    [0.016, 0.2],
    [0.022, 0.3],
    [0.02, 0.44],
    [0, 0.44],
  ]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[
        [-0.2, 0.2],
        [0.2, 0.2],
        [-0.19, -0.18],
        [0.19, -0.18],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={m.mahogany} position={[x, 0, z]} castShadow />
      ))}
      <mesh geometry={boxGeo(0.46, 0.06, 0.44)} material={m.mahogany} position={[0, 0.46, 0]} castShadow />
      <mesh material={m.velvetOx} position={[0, 0.51, 0.01]} scale={[1, 0.25, 1]} castShadow>
        <sphereGeometry args={[0.23, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} material={m.mahogany} position={[x, 0.75, -0.2]} rotation={[-0.12, 0, x > 0 ? -0.06 : 0.06]} castShadow>
          <cylinderGeometry args={[0.016, 0.018, 0.56, 8]} />
        </mesh>
      ))}
      <mesh material={m.mahogany} position={[0, 0.94, -0.235]} rotation={[Math.PI / 2 - 0.12, 0, 0]} castShadow>
        <torusGeometry args={[0.19, 0.022, 8, 24, Math.PI]} />
      </mesh>
    </group>
  );
}

/** Velvet chaise longue: buttoned seat, scrolled head end, partial back. Long axis along local x. */
export function Chaise({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const m = mats();
  const leg = latheGeo('chaiseLeg', [
    [0, 0],
    [0.016, 0],
    [0.022, 0.05],
    [0.017, 0.12],
    [0.026, 0.2],
    [0.024, 0.26],
    [0, 0.26],
  ]);
  const scroll = useMemo(() => {
    // Scrolled head end: a rising curve swept across the width.
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.34, 0);
    s.quadraticCurveTo(0.3, 0.32, 0.12, 0.52);
    s.quadraticCurveTo(-0.02, 0.62, -0.12, 0.5);
    s.quadraticCurveTo(-0.16, 0.42, -0.06, 0.36);
    s.quadraticCurveTo(0.04, 0.2, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 18 });
    g.translate(0, 0, -0.3);
    return g;
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[
        [-0.8, -0.26],
        [0.8, -0.26],
        [-0.8, 0.26],
        [0.8, 0.26],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={leg} material={m.walnut} position={[x, 0, z]} castShadow />
      ))}
      <RoundedBox args={[1.76, 0.12, 0.64]} radius={0.03} smoothness={3} material={m.walnut} position={[0, 0.3, 0]} castShadow receiveShadow />
      <RoundedBox args={[1.62, 0.13, 0.6]} radius={0.06} smoothness={4} material={m.velvetGreen} position={[0.06, 0.42, 0]} castShadow receiveShadow />
      {[-0.4, 0, 0.4].map((x) => [-0.15, 0.15].map((z) => (
        <mesh key={`${x}${z}`} material={m.brass} position={[x + 0.06, 0.487, z]}>
          <sphereGeometry args={[0.008, 6, 4]} />
        </mesh>
      )))}
      <mesh geometry={scroll} material={m.velvetGreen} position={[-0.74, 0.36, 0]} castShadow receiveShadow />
      <RoundedBox args={[1.0, 0.38, 0.1]} radius={0.04} smoothness={4} material={m.velvetGreen} position={[-0.2, 0.62, -0.27]} rotation={[-0.15, 0, 0]} castShadow />
      <RoundedBox args={[1.06, 0.05, 0.13]} radius={0.02} smoothness={2} material={m.walnut} position={[-0.2, 0.82, -0.3]} rotation={[-0.15, 0, 0]} castShadow />
      <mesh material={m.velvetOx} position={[-0.5, 0.55, 0.08]} rotation={[0.3, 0.4, 0.1]} castShadow>
        <sphereGeometry args={[0.15, 16, 12]} />
      </mesh>
    </group>
  );
}

/** Three-branch candelabrum with a soft light. */
export function Candelabrum({ position, seed = 0, intensity = 1.6, room = 'mirrors' as 'hall' | 'mirrors', light = true }: { position: [number, number, number]; seed?: number; intensity?: number; room?: 'hall' | 'mirrors'; light?: boolean }) {
  return <CandelabrumInner position={position} seed={seed} intensity={intensity} room={room} light={light} />;
}

function CandelabrumInner({ position, seed, intensity, room, light }: { position: [number, number, number]; seed: number; intensity: number; room: 'hall' | 'mirrors'; light: boolean }) {
  const m = mats();
  const stick = latheGeo('candlestick', LATHES.candlestick);
  return (
    <group position={position}>
      <mesh geometry={stick} material={m.brass} castShadow />
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * 0.11, 0.28 + (i === 0 ? 0.06 : 0), 0]}>
          {i !== 0 && (
            <mesh material={m.brass} position={[-i * 0.055, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.11, 6]} />
            </mesh>
          )}
          <mesh material={m.brass}>
            <cylinderGeometry args={[0.022, 0.014, 0.02, 12]} />
          </mesh>
          <mesh material={m.wax} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.011, 0.012, 0.13, 10]} />
          </mesh>
          <group position={[0, 0.137, 0]}>
            <Flame seed={seed + i * 1.7} />
          </group>
        </group>
      ))}
      {light && <CandleLight position={[0, 0.55, 0.12]} intensity={intensity} distance={5} seed={seed} room={room} />}
    </group>
  );
}

/** Brass stanchions with a velvet rope (blocks the stairs). */
export function Stanchions({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const m = mats();
  const post = latheGeo('stanchion', [
    [0, 0],
    [0.12, 0],
    [0.12, 0.02],
    [0.04, 0.05],
    [0.018, 0.1],
    [0.018, 0.86],
    [0.03, 0.9],
    [0.035, 0.94],
    [0, 0.98],
  ]);
  const rope = useMemo(() => {
    const A = new THREE.Vector3(a[0], 0.86, a[2]);
    const B = new THREE.Vector3(b[0], 0.86, b[2]);
    const mid = A.clone().lerp(B, 0.5);
    mid.y -= 0.2;
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, B), 20, 0.018, 8, false);
  }, [a, b]);
  return (
    <group>
      <mesh geometry={post} material={m.brass} position={a} castShadow />
      <mesh geometry={post} material={m.brass} position={b} castShadow />
      <mesh geometry={rope} material={m.velvetOx} castShadow />
    </group>
  );
}

/** Low rug with a thin bound edge. */
export function Rug({ position, w, d, material, rotationY = 0 }: { position: [number, number, number]; w: number; d: number; material: THREE.Material; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} material={material} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh geometry={boxGeo(w, 0.007, d)} material={mats().soot} position={[0, 0.0035, 0]} />
    </group>
  );
}
