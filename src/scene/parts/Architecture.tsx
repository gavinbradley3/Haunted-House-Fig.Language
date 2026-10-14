/**
 * Reusable architectural building blocks. Everything is built from a small set
 * of consistent parts (walls, panelling, mouldings) so every room shares one
 * architectural language.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { boxGeo, latheGeo, planeGeo, profileGeo, PROFILES, runTransform } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { registerOccluder } from '../../systems/interaction';

export interface Opening {
  c: number;
  w: number;
  b: number;
  t: number;
}

interface WallProps {
  axis: 'x' | 'z';
  from: number;
  to: number;
  /** Centre line of the wall on the other horizontal axis. */
  at: number;
  thickness?: number;
  height: number;
  y0?: number;
  openings?: Opening[];
  /** Material on the + side (toward +z for axis x, +x for axis z) and the − side. */
  matPos: THREE.Material;
  matNeg: THREE.Material;
  matEdge?: THREE.Material;
}

/** A straight wall slab with rectangular openings for doors and windows. */
export function Wall({ axis, from, to, at, thickness = 0.3, height, y0 = 0, openings = [], matPos, matNeg, matEdge }: WallProps) {
  const ref = useRef<THREE.Group>(null!);
  useEffect(() => {
    const off = registerOccluder(ref.current);
    return () => void off();
  }, []);
  const pieces = useMemo(() => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const out: { a: number; b: number; y0: number; y1: number }[] = [];
    let cur = lo;
    // Group openings that share a column (door + fanlight, lower + upper window).
    const cols = new Map<string, Opening[]>();
    for (const o of openings) {
      const k = `${o.c.toFixed(3)}:${o.w.toFixed(3)}`;
      cols.set(k, [...(cols.get(k) ?? []), o]);
    }
    const sorted = [...cols.values()].sort((p, q) => p[0].c - q[0].c);
    for (const group of sorted) {
      const { c, w } = group[0];
      const oa = c - w / 2;
      const ob = c + w / 2;
      if (oa > cur) out.push({ a: cur, b: oa, y0, y1: y0 + height });
      let yCur = y0;
      for (const o of [...group].sort((p, q) => p.b - q.b)) {
        if (o.b > yCur) out.push({ a: oa, b: ob, y0: yCur, y1: o.b });
        yCur = Math.max(yCur, o.t);
      }
      if (yCur < y0 + height) out.push({ a: oa, b: ob, y0: yCur, y1: y0 + height });
      cur = ob;
    }
    if (cur < hi) out.push({ a: cur, b: hi, y0, y1: y0 + height });
    return out;
  }, [from, to, openings, y0, height]);

  const edge = matEdge ?? mats().walnut;
  // BoxGeometry material order: +x, -x, +y, -y, +z, -z
  const material = axis === 'x' ? [edge, edge, edge, edge, matPos, matNeg] : [matPos, matNeg, edge, edge, edge, edge];

  return (
    <group ref={ref}>
      {pieces.map((p, i) => {
        // Overlap neighbouring pieces by a millimetre so no hairline seams show.
        const len = p.b - p.a + 0.002;
        const h = p.y1 - p.y0 + 0.002;
        const mid = (p.a + p.b) / 2;
        const geo = axis === 'x' ? boxGeo(len, h, thickness) : boxGeo(thickness, h, len);
        const position: [number, number, number] = axis === 'x' ? [mid, (p.y0 + p.y1) / 2, at] : [at, (p.y0 + p.y1) / 2, mid];
        return <mesh key={i} geometry={geo} material={material} position={position} castShadow receiveShadow />;
      })}
    </group>
  );
}

/**
 * Local frame on a wall face: children use x along the wall, y up, z out of the wall (z = 0 on the face).
 * `along` positions passed to children should go through `wallLocal()`.
 */
export function OnWall({ axis, face, normal, children }: { axis: 'x' | 'z'; face: number; normal: 1 | -1; children: ReactNode }) {
  const rotY = axis === 'x' ? (normal > 0 ? 0 : Math.PI) : normal > 0 ? Math.PI / 2 : -Math.PI / 2;
  const position: [number, number, number] = axis === 'x' ? [0, 0, face] : [face, 0, 0];
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {children}
    </group>
  );
}

/** Convert a world coordinate along a wall to the OnWall local x. */
export function wallLocal(axis: 'x' | 'z', normal: 1 | -1, along: number) {
  const s = axis === 'x' ? (normal > 0 ? 1 : -1) : normal > 0 ? -1 : 1;
  return s * along;
}

const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

/** A moulding run in the local wall frame from x0 to x1 at height y. */
export function Run({
  profile,
  x0,
  x1,
  y,
  z = 0,
  material,
  vertical = false,
  lateral,
  shadow = false,
}: {
  profile: keyof typeof PROFILES;
  x0: number;
  x1: number;
  y: number;
  z?: number;
  material: THREE.Material;
  /** Vertical run: x0/x1 are y extents and `y` is the x position. */
  vertical?: boolean;
  lateral?: THREE.Vector3;
  shadow?: boolean;
}) {
  const { matrix, length } = useMemo(() => {
    const a = vertical ? new THREE.Vector3(y, x0, z) : new THREE.Vector3(x0, y, z);
    const b = vertical ? new THREE.Vector3(y, x1, z) : new THREE.Vector3(x1, y, z);
    return runTransform(a, b, Z, lateral ?? UP);
  }, [x0, x1, y, z, vertical, lateral]);
  const geo = profileGeo(profile, PROFILES[profile], length);
  return <mesh geometry={geo} material={material} matrix={matrix} matrixAutoUpdate={false} castShadow={shadow} receiveShadow />;
}

/** A bevelled raised panel, centred on its local origin, facing +z. */
function panelGeo(w: number, h: number) {
  const key = `${w.toFixed(3)}x${h.toFixed(3)}`;
  let g = panelCache.get(key);
  if (!g) {
    const bevel = Math.min(0.045, w * 0.15, h * 0.15);
    const s = new THREE.Shape();
    const hw = w / 2 - bevel;
    const hh = h / 2 - bevel;
    s.moveTo(-hw, -hh);
    s.lineTo(hw, -hh);
    s.lineTo(hw, hh);
    s.lineTo(-hw, hh);
    s.closePath();
    g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.012, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    g.computeVertexNormals();
    panelCache.set(key, g);
  }
  return g;
}
const panelCache = new Map<string, THREE.BufferGeometry>();

/** Panelled frame: board, stiles and rails with raised panels. Local frame, bottom-left at (x0, y0). */
export function PanelField({
  x0,
  x1,
  y0,
  y1,
  cols,
  rows = 1,
  material,
  frameDepth = 0.02,
}: {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cols: number;
  rows?: number;
  material: THREE.Material;
  frameDepth?: number;
}) {
  const w = x1 - x0;
  const h = y1 - y0;
  const stile = Math.min(0.14, w / (cols * 4));
  const pw = (w - stile * (cols + 1)) / cols;
  const ph = (h - stile * (rows + 1)) / rows;
  const panels: [number, number][] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) panels.push([x0 + stile + c * (pw + stile) + pw / 2, y0 + stile + r * (ph + stile) + ph / 2]);
  return (
    <group>
      <mesh geometry={boxGeo(w, h, frameDepth)} material={material} position={[(x0 + x1) / 2, (y0 + y1) / 2, frameDepth / 2]} receiveShadow />
      {panels.map(([x, y], i) => (
        <mesh key={i} geometry={panelGeo(pw, ph)} material={material} position={[x, y, frameDepth - 0.004]} receiveShadow castShadow={false} />
      ))}
    </group>
  );
}

interface WainscotProps {
  x0: number;
  x1: number;
  height?: number;
  gaps?: [number, number][];
  material?: THREE.Material;
  panelWidth?: number;
  skirting?: boolean;
}

/** Panelled dado with skirting and a dado rail, along local x, skipping door gaps. */
export function Wainscot({ x0, x1, height = 1.12, gaps = [], material, panelWidth = 0.78, skirting = true }: WainscotProps) {
  const m = material ?? mats().walnutPanel;
  const segs: [number, number][] = [];
  let cur = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  for (const [c, w] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (c - w / 2 > cur + 0.02) segs.push([cur, c - w / 2]);
    cur = c + w / 2;
  }
  if (hi > cur + 0.02) segs.push([cur, hi]);
  return (
    <group>
      {segs.map(([a, b], i) => {
        const cols = Math.max(1, Math.round((b - a) / panelWidth));
        return (
          <group key={i}>
            <PanelField x0={a} x1={b} y0={0.2} y1={height - 0.02} cols={cols} material={m} />
            {skirting && <Run profile="skirting" x0={a} x1={b} y={0} material={m} />}
            <Run profile="dado" x0={a} x1={b} y={height} material={m} />
          </group>
        );
      })}
    </group>
  );
}

/** Victorian architrave with corner rosette blocks and plinth blocks. Opening centred at local x = c. */
export function Architrave({ c, w, h, material, z = 0 }: { c: number; w: number; h: number; material?: THREE.Material; z?: number }) {
  const m = material ?? mats().walnut;
  const L = c - w / 2;
  const R = c + w / 2;
  const block = 0.165;
  const rosette = latheGeo('rosette', [
    [0, 0],
    [0.06, 0],
    [0.065, 0.006],
    [0.05, 0.014],
    [0.03, 0.018],
    [0.02, 0.026],
    [0, 0.03],
  ]);
  return (
    <group position={[0, 0, z]}>
      <Run profile="architrave" vertical x0={0.26} x1={h} y={L} material={m} lateral={new THREE.Vector3(-1, 0, 0)} />
      <Run profile="architrave" vertical x0={0.26} x1={h} y={R} material={m} lateral={new THREE.Vector3(1, 0, 0)} />
      <Run profile="architrave" x0={L} x1={R} y={h} material={m} />
      {[L - block / 2 + 0.0, R + block / 2 - 0.0].map((x, i) => (
        <group key={i}>
          <mesh geometry={boxGeo(block, block, 0.046)} material={m} position={[x + (i ? -0.0 : 0), h + block / 2 - 0.0, 0.023]} castShadow />
          <mesh geometry={rosette} material={m} position={[x, h + block / 2, 0.046]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={boxGeo(block, 0.27, 0.05)} material={m} position={[x, 0.135, 0.025]} castShadow />
        </group>
      ))}
    </group>
  );
}

/** Cornice around a rectangular room at the given ceiling height (world space). */
export function Cornice({ x0, x1, z0, z1, y, material }: { x0: number; x1: number; z0: number; z1: number; y: number; material?: THREE.Material }) {
  const m = material ?? mats().ceiling;
  return (
    <group>
      <OnWall axis="x" face={z0} normal={1}>
        <Run profile="cornice" x0={x0} x1={x1} y={y} material={m} />
      </OnWall>
      <OnWall axis="x" face={z1} normal={-1}>
        <Run profile="cornice" x0={wallLocal('x', -1, x0)} x1={wallLocal('x', -1, x1)} y={y} material={m} />
      </OnWall>
      <OnWall axis="z" face={x0} normal={1}>
        <Run profile="cornice" x0={wallLocal('z', 1, z0)} x1={wallLocal('z', 1, z1)} y={y} material={m} />
      </OnWall>
      <OnWall axis="z" face={x1} normal={-1}>
        <Run profile="cornice" x0={wallLocal('z', -1, z0)} x1={wallLocal('z', -1, z1)} y={y} material={m} />
      </OnWall>
    </group>
  );
}

/** Floor or ceiling slab spanning a rectangle (world space). */
export function Slab({
  x0,
  x1,
  z0,
  z1,
  y,
  material,
  ceiling = false,
  thickness = 0.2,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  material: THREE.Material;
  ceiling?: boolean;
  thickness?: number;
}) {
  const w = Math.abs(x1 - x0);
  const d = Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      <mesh
        geometry={planeGeo(w, d)}
        material={material}
        position={[cx, y, cz]}
        rotation={[ceiling ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
        receiveShadow
      />
      <mesh geometry={boxGeo(w, thickness, d)} material={mats().darkInterior} position={[cx, ceiling ? y + thickness / 2 + 0.002 : y - thickness / 2 - 0.002, cz]} castShadow />
    </group>
  );
}

/** Ceiling rose for a chandelier. */
export function CeilingRose({ position, r = 0.45 }: { position: [number, number, number]; r?: number }) {
  const g = latheGeo(`rose${r}`, [
    [0, 0],
    [r, 0],
    [r * 0.96, -0.02],
    [r * 0.8, -0.03],
    [r * 0.7, -0.05],
    [r * 0.5, -0.055],
    [r * 0.35, -0.08],
    [r * 0.2, -0.09],
    [0, -0.1],
  ], 40);
  return <mesh geometry={g} material={mats().ceiling} position={position} receiveShadow />;
}
