import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxGeo, latheGeo, LATHES } from '../systems/geometry';
import { mats } from '../systems/materials';
import { mulberry32 } from '../systems/noise';
import { EXTERIOR, HALL, WALL_T } from '../world/layout';
import { Wall } from './parts/Architecture';
import { Lantern } from './parts/Lights';

const FZ = EXTERIOR.facadeZ;
const X0 = EXTERIOR.houseX0;
const X1 = EXTERIOR.houseX1;
const EAVES = EXTERIOR.eaves;
const RIDGE = 13.2;
const RIDGE_Z = -6.4;
const BACK_Z = -13.4;
const WING_WIN_X = [-8.6, 8.6];
export const GROUND_DROP = 0.48;
export const PORCH_D = 2.4;

/** Stone surround: lintel with keystone and a projecting sill. */
function Surround({ x, b, t, w }: { x: number; b: number; t: number; w: number }) {
  const m = mats();
  return (
    <group position={[x, 0, FZ]}>
      <mesh geometry={boxGeo(w + 0.36, 0.3, 0.1, 'x')} material={m.stoneTrim} position={[0, t + 0.15, 0.05]} castShadow receiveShadow />
      <mesh geometry={boxGeo(0.2, 0.36, 0.14)} material={m.stoneTrim} position={[0, t + 0.16, 0.07]} castShadow />
      <mesh geometry={boxGeo(w + 0.26, 0.09, 0.2, 'x')} material={m.stoneTrim} position={[0, b - 0.045, 0.1]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={boxGeo(0.1, t - b, 0.05)} material={m.stoneTrim} position={[s * (w / 2 + 0.05), (t + b) / 2, 0.025]} castShadow />
      ))}
    </group>
  );
}

/** A window into a room we never visit: glass over a dark interior, optionally lamp-lit behind a blind. */
function FakeWindow({ x, b, t, w, lit = 0 }: { x: number; b: number; t: number; w: number; lit?: number }) {
  const m = mats();
  const glow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000',
        emissive: new THREE.Color('#ffb164'),
        emissiveIntensity: lit,
        roughness: 1,
      }),
    [lit],
  );
  const h = t - b;
  return (
    <group position={[x, (t + b) / 2, FZ - 0.12]}>
      <mesh geometry={boxGeo(w, h, 0.02)} material={lit > 0 ? glow : m.darkInterior} position={[0, 0, -0.3]} />
      {lit > 0 && <mesh geometry={boxGeo(w * 0.42, h * 0.95, 0.01)} material={m.velvetGreen} position={[-w * 0.3, 0, -0.25]} />}
      <mesh geometry={boxGeo(w, h, 0.004)} material={m.glass} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={boxGeo(0.06, h, 0.08)} material={m.paintTrim} position={[(s * (w - 0.06)) / 2, 0, 0]} />
      ))}
      <mesh geometry={boxGeo(w, 0.06, 0.08)} material={m.paintTrim} position={[0, 0, 0]} />
      <mesh geometry={boxGeo(0.03, h, 0.05)} material={m.paintTrim} position={[0, 0, 0]} />
      <mesh geometry={boxGeo(w, 0.06, 0.08)} material={m.paintTrim} position={[0, h / 2 - 0.03, 0]} />
      <mesh geometry={boxGeo(w, 0.06, 0.08)} material={m.paintTrim} position={[0, -h / 2 + 0.03, 0]} />
    </group>
  );
}

function Roof() {
  const m = mats();
  const geo = useMemo(() => {
    const w = X1 - X0 + 0.8;
    const frontLen = Math.hypot(RIDGE - EAVES, FZ + 0.6 - RIDGE_Z);
    const backLen = Math.hypot(RIDGE - EAVES, RIDGE_Z - BACK_Z);
    return { w, frontLen, backLen, fa: Math.atan2(RIDGE - EAVES, FZ + 0.6 - RIDGE_Z), ba: Math.atan2(RIDGE - EAVES, RIDGE_Z - BACK_Z) };
  }, []);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(FZ, EAVES);
    s.lineTo(RIDGE_Z, RIDGE);
    s.lineTo(BACK_Z, EAVES);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    return g;
  }, []);
  const chimney = (x: number) => (
    <group position={[x, RIDGE - 1.2, RIDGE_Z]}>
      <mesh geometry={boxGeo(1.0, 3.2, 0.7)} material={m.brick} position={[0, 1.6, 0]} castShadow />
      <mesh geometry={boxGeo(1.15, 0.2, 0.85)} material={m.stoneTrim} position={[0, 3.25, 0]} castShadow />
      {[-0.25, 0.25].map((px) => (
        <mesh key={px} material={m.brick} position={[px, 3.55, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, 0.45, 10]} />
        </mesh>
      ))}
    </group>
  );
  return (
    <group>
      <mesh
        geometry={boxGeo(geo.w, 0.12, geo.frontLen)}
        material={m.slate}
        position={[(X0 + X1) / 2, (EAVES + RIDGE) / 2, (FZ + 0.6 + RIDGE_Z) / 2]}
        rotation={[geo.fa, 0, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={boxGeo(geo.w, 0.12, geo.backLen)}
        material={m.slate}
        position={[(X0 + X1) / 2, (EAVES + RIDGE) / 2, (RIDGE_Z + BACK_Z) / 2]}
        rotation={[-geo.ba, 0, 0]}
        castShadow
      />
      <mesh geometry={boxGeo(geo.w, 0.14, 0.18)} material={m.blackPaint} position={[(X0 + X1) / 2, RIDGE + 0.04, RIDGE_Z]} />
      {[X0, X1 + 0.3].map((x) => (
        <mesh key={x} geometry={gable} material={m.brick} position={[x, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow />
      ))}
      {chimney(X0 + 2.4)}
      {chimney(X1 - 2.4)}
      {/* Eaves cornice and gutter */}
      <mesh geometry={boxGeo(X1 - X0 + 0.9, 0.32, 0.55, 'x')} material={m.paintTrim} position={[(X0 + X1) / 2, EAVES - 0.1, FZ + 0.25]} castShadow receiveShadow />
      <mesh material={m.blackPaint} position={[(X0 + X1) / 2, EAVES + 0.02, FZ + 0.58]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, X1 - X0 + 0.9, 10, 1, true, 0, Math.PI]} />
      </mesh>
      {Array.from({ length: 52 }, (_, i) => X0 + 0.1 + i * ((X1 - X0 - 0.2) / 51)).map((x) => (
        <mesh key={x} geometry={boxGeo(0.08, 0.14, 0.12)} material={m.paintTrim} position={[x, EAVES - 0.33, FZ + 0.06]} />
      ))}
    </group>
  );
}

function Porch() {
  const m = mats();
  const col = latheGeo('column', LATHES.column, 24);
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.25, 0);
    s.lineTo(2.25, 0);
    s.lineTo(0, 0.95);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: false });
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    return g;
  }, []);
  const depth = PORCH_D - 0.1;
  return (
    <group>
      {/* Porch platform and three steps down to the drive */}
      <mesh geometry={boxGeo(4.6, GROUND_DROP, PORCH_D, 'x')} material={m.stoneSteps} position={[0, -GROUND_DROP / 2, FZ + PORCH_D / 2]} castShadow receiveShadow />
      {[1, 2, 3].map((k) => (
        <mesh key={k} geometry={boxGeo(4.6, GROUND_DROP - 0.16 * k, 0.34, 'x')} material={m.stoneSteps} position={[0, -GROUND_DROP + (GROUND_DROP - 0.16 * k) / 2, FZ + PORCH_D + 0.32 * (k - 0.5)]} castShadow receiveShadow />
      ))}
      {[-1.75, 1.75].map((x) => (
        <group key={x} position={[x, 0, FZ + depth - 0.2]}>
          <mesh geometry={boxGeo(0.56, 0.2, 0.56)} material={m.stoneTrim} position={[0, 0.1, 0]} castShadow />
          <mesh geometry={col} material={m.paintTrim} position={[0, 0.2, 0]} scale={[1, 1.0, 1]} castShadow receiveShadow />
        </group>
      ))}
      {[-1.75, 1.75].map((x) => (
        <mesh key={`p${x}`} geometry={boxGeo(0.42, 3.1, 0.25)} material={m.paintTrim} position={[x, 1.55, FZ + 0.12]} castShadow />
      ))}
      {/* Entablature, porch ceiling, pediment */}
      <mesh geometry={boxGeo(4.5, 0.42, depth + 0.1, 'x')} material={m.paintTrim} position={[0, 3.29, FZ + depth / 2 - 0.1]} castShadow receiveShadow />
      <mesh geometry={boxGeo(4.7, 0.08, depth + 0.3, 'x')} material={m.paintTrim} position={[0, 3.54, FZ + depth / 2]} castShadow />
      <mesh geometry={pediment} material={m.paintTrim} position={[0, 3.58, FZ + depth - 0.25]} castShadow />
      <mesh geometry={boxGeo(4.9, 0.1, 0.4)} material={m.paintTrim} position={[0, 3.58, FZ + depth - 0.1]} />
      <Lantern position={[-1.25, 2.35, FZ + 0.18]} intensity={0} seed={61} />
      <Lantern position={[1.25, 2.35, FZ + 0.18]} intensity={0} seed={62} />
    </group>
  );
}

/** Procedural bare tree: recursive branching merged into one mesh. */
function Tree({ position, seed, scale = 1 }: { position: [number, number, number]; seed: number; scale?: number }) {
  const geo = useMemo(() => {
    const rnd = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
      const end = start.clone().addScaledVector(dir, len);
      const g = new THREE.CylinderGeometry(rad * 0.7, rad, len, depth > 2 ? 7 : 4, 1, true);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      g.translate(start.x, start.y, start.z);
      parts.push(g.toNonIndexed());
      if (depth <= 0 || rad < 0.012) return;
      const n = depth > 3 ? 2 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const nd = dir.clone();
        nd.x += (rnd() - 0.5) * 1.3;
        nd.z += (rnd() - 0.5) * 1.3;
        nd.y += 0.25 + rnd() * 0.3;
        nd.normalize();
        grow(end, nd, len * (0.62 + rnd() * 0.18), rad * 0.62, depth - 1);
      }
    };
    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1, 0).normalize(), 3.4, 0.28, 6);
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
  }, [seed]);
  const bark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 0.95 }), []);
  return <mesh geometry={geo} material={bark} position={position} scale={scale} castShadow />;
}

function Railings() {
  const m = mats();
  const bars = useMemo(() => {
    const xs: number[] = [];
    for (let x = -14; x <= 14; x += 0.14) if (Math.abs(x) > 1.9) xs.push(x);
    return xs;
  }, []);
  const inst = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.012, 0.012, 1.5, 5);
    const mesh = new THREE.InstancedMesh(g, m.iron, bars.length);
    const mat4 = new THREE.Matrix4();
    bars.forEach((x, i) => mesh.setMatrixAt(i, mat4.makeTranslation(x, 0.75, 14)));
    mesh.castShadow = true;
    return mesh;
  }, [bars, m]);
  return (
    <group>
      <primitive object={inst} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={boxGeo(12.1, 0.04, 0.04, 'x')} material={m.iron} position={[s * 8.0, 1.3, 14]} />
          <mesh geometry={boxGeo(12.1, 0.04, 0.04, 'x')} material={m.iron} position={[s * 8.0, 0.2, 14]} />
          <group position={[s * 1.75, 0, 14]}>
            <mesh geometry={boxGeo(0.5, 2.0, 0.5)} material={m.stoneTrim} position={[0, 1.0, 0]} castShadow />
            <mesh geometry={boxGeo(0.62, 0.12, 0.62)} material={m.stoneTrim} position={[0, 2.06, 0]} castShadow />
            <mesh material={m.stoneTrim} position={[0, 2.3, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 12]} />
            </mesh>
          </group>
          {/* Open gate leaf */}
          <group position={[s * 1.5, 0, 14]} rotation={[0, s * 1.2, 0]}>
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} material={m.iron} position={[-s * (0.1 + i * 0.14), 0.85, 0]}>
                <cylinderGeometry args={[0.013, 0.013, 1.6, 5]} />
              </mesh>
            ))}
            <mesh geometry={boxGeo(1.3, 0.05, 0.05, 'x')} material={m.iron} position={[-s * 0.65, 1.55, 0]} />
            <mesh geometry={boxGeo(1.3, 0.05, 0.05, 'x')} material={m.iron} position={[-s * 0.65, 0.25, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function Exterior() {
  const m = mats();
  const win = HALL.window;
  const uw = HALL.upperWindow;
  return (
    <group>
      {/* Ground: three steps below the house floor */}
      <group position={[0, -GROUND_DROP, 0]}>
      <mesh material={m.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 10]} receiveShadow>
        <planeGeometry args={[120, 80]} />
      </mesh>
      <mesh material={m.gravel} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 9.2]} receiveShadow>
        <planeGeometry args={[2.8, 13]} />
      </mesh>
      <mesh material={m.gravel} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 4.2]} receiveShadow>
        <planeGeometry args={[24, 3.4]} />
      </mesh>
      <Railings />
      <Tree position={[-9.5, 0, 8.5]} seed={3} scale={1.15} />
      <Tree position={[12.5, 0, 5.5]} seed={7} scale={1.3} />
      <Tree position={[-15, 0, -1]} seed={11} scale={1.4} />
      <Tree position={[6.5, 0, 17]} seed={17} scale={0.9} />
      <Tree position={[-6, 0, 21]} seed={23} scale={1.2} />
      </group>

      {/* Facade wings and upper band (the hall's front wall forms the centre) */}
      {[
        [X0, -6.3],
        [6.3, X1],
      ].map(([a, b], i) => (
        <Wall
          key={i}
          axis="x"
          from={a}
          to={b}
          at={WALL_T / 2}
          y0={-GROUND_DROP - 0.05}
          height={EAVES + GROUND_DROP + 0.05}
          openings={[
            { c: WING_WIN_X[i], w: win.width, b: win.sill, t: win.top },
            { c: WING_WIN_X[i], w: win.width, b: uw.sill, t: uw.top },
          ]}
          matPos={m.brick}
          matNeg={m.darkInterior}
        />
      ))}
      <Wall axis="x" from={-6.3} to={6.3} at={WALL_T / 2} y0={HALL.height + 0.4} height={EAVES - HALL.height - 0.4} matPos={m.brick} matNeg={m.darkInterior} />
      <Wall axis="z" from={FZ} to={BACK_Z} at={X0 - 0.15} y0={-GROUND_DROP - 0.05} height={EAVES + GROUND_DROP + 0.05} matPos={m.darkInterior} matNeg={m.brick} />
      <Wall axis="z" from={FZ} to={BACK_Z} at={X1 + 0.15} y0={-GROUND_DROP - 0.05} height={EAVES + GROUND_DROP + 0.05} matPos={m.brick} matNeg={m.darkInterior} />

      {WING_WIN_X.map((x, i) => (
        <group key={x}>
          <FakeWindow x={x} b={win.sill} t={win.top} w={win.width} />
          <FakeWindow x={x} b={uw.sill} t={uw.top} w={win.width} lit={i === 1 ? 2.2 : 0} />
        </group>
      ))}
      {[...HALL.frontWindows, ...WING_WIN_X].flatMap((x) => [
        <Surround key={`a${x}`} x={x} b={win.sill} t={win.top} w={win.width} />,
        <Surround key={`b${x}`} x={x} b={uw.sill} t={uw.top} w={win.width} />,
      ])}
      {/* String course, plinth and quoins */}
      <mesh geometry={boxGeo(X1 - X0 + 0.3, 0.22, 0.12, 'x')} material={m.stoneTrim} position={[0, 3.85, FZ + 0.06]} castShadow receiveShadow />
      <mesh geometry={boxGeo(X1 - X0 + 0.3, 0.55 + GROUND_DROP, 0.1, 'x')} material={m.stoneTrim} position={[0, (0.55 - GROUND_DROP) / 2, FZ + 0.05]} receiveShadow />
      {[X0, X1].flatMap((x) =>
        Array.from({ length: 14 }, (_, i) => (
          <mesh key={`${x}-${i}`} geometry={boxGeo(i % 2 ? 0.45 : 0.7, 0.3, 0.1)} material={m.stoneTrim} position={[x + (x < 0 ? 1 : -1) * (i % 2 ? 0.22 : 0.35), 0.75 + i * 0.56, FZ + 0.05]} castShadow />
        )),
      )}

      <Roof />
      <Porch />
    </group>
  );
}
