/**
 * The shell of a room: floor, ceiling, cornice, the walls it owns, doorways and windows,
 * with wainscot and a picture rail on every wall (including walls it shares with a
 * neighbour, which that neighbour builds). Rooms add their own furniture on top.
 * Kept modular so a Blender-made kit can replace these pieces later.
 */
import type * as THREE from 'three';
import { mats } from '../../systems/materials';
import { WALL_T } from '../../world/layout';
import { Architrave, Cornice, OnWall, Run, Slab, Wainscot, Wall, wallLocal } from './Architecture';
import { SashWindow } from './Furnishings';

export type Side = 'N' | 'S' | 'E' | 'W';

interface Opening {
  side: Side;
  /** Position along the wall: x for N/S walls, z for E/W walls. */
  at: number;
  width: number;
}

interface Props {
  x0: number;
  x1: number;
  zN: number;
  zS: number;
  height: number;
  wall: THREE.Material;
  floor: THREE.Material;
  /** Walls this room builds; the others belong to a neighbour. */
  own: Side[];
  doors?: Opening[];
  windows?: (Opening & { sill: number; top: number })[];
  /** Material on the outside of the walls this room owns (what a neighbour or the outside sees). */
  outside?: Partial<Record<Side, THREE.Material>>;
  wainscot?: number;
  rail?: number;
  trim?: THREE.Material;
}

const DOOR_H = 2.3;

export function RoomShell({ x0, x1, zN, zS, height, wall, floor, own, doors = [], windows = [], outside = {}, wainscot = 1.0, rail, trim }: Props) {
  const m = mats();
  const t = trim ?? m.walnut;
  const h = WALL_T / 2;
  const railY = rail ?? Math.min(height - 0.7, 3.2);
  const openings = (side: Side) => [
    ...doors.filter((d) => d.side === side).map((d) => ({ c: d.at, w: d.width, b: 0, t: DOOR_H })),
    ...windows.filter((w) => w.side === side).map((w) => ({ c: w.at, w: w.width, b: w.sill, t: w.top })),
  ];
  const out = (s: Side) => outside[s] ?? m.brick;
  // Local "along the wall" coordinate on each wall face (see OnWall).
  const local = (side: Side, v: number) => (side === 'N' ? wallLocal('x', -1, v) : side === 'S' ? v : side === 'W' ? wallLocal('z', 1, v) : wallLocal('z', -1, v));
  const ends: Record<Side, [number, number]> = { N: [x0, x1], S: [x0, x1], W: [zN, zS], E: [zN, zS] };
  const face = (side: Side) => {
    const [a, b] = ends[side];
    const la = local(side, a);
    const lb = local(side, b);
    const gaps = [...doors, ...windows].filter((o) => o.side === side).map((o) => [local(side, o.at), o.width + 0.3] as [number, number]);
    return (
      <>
        <Wainscot x0={Math.min(la, lb)} x1={Math.max(la, lb)} height={wainscot} gaps={gaps} material={t === m.walnut ? undefined : t} />
        <Run profile="pictureRail" x0={Math.min(la, lb)} x1={Math.max(la, lb)} y={railY} material={t} />
        {doors
          .filter((d) => d.side === side)
          .map((d) => (
            <Architrave key={d.at} c={local(side, d.at)} w={d.width} h={DOOR_H} material={t} />
          ))}
        {windows
          .filter((w) => w.side === side)
          .map((w) => (
            <SashWindow key={w.at} c={local(side, w.at)} w={w.width} b={w.sill} t={w.top} />
          ))}
      </>
    );
  };
  return (
    <group>
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={0} material={floor} />
      <Slab x0={x0} x1={x1} z0={zS} z1={zN} y={height} material={m.ceiling} ceiling />
      <Cornice x0={x0} x1={x1} z0={zS} z1={zN} y={height} />
      {own.includes('N') && <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zN + h} height={height} openings={openings('N')} matPos={out('N')} matNeg={wall} />}
      {own.includes('S') && <Wall axis="x" from={x0 - WALL_T} to={x1 + WALL_T} at={zS - h} height={height} openings={openings('S')} matPos={wall} matNeg={out('S')} />}
      {own.includes('W') && <Wall axis="z" from={zN} to={zS} at={x0 - h} height={height} openings={openings('W')} matPos={wall} matNeg={out('W')} />}
      {own.includes('E') && <Wall axis="z" from={zN} to={zS} at={x1 + h} height={height} openings={openings('E')} matPos={out('E')} matNeg={wall} />}
      <OnWall axis="x" face={zN} normal={-1}>
        {face('N')}
      </OnWall>
      <OnWall axis="x" face={zS} normal={1}>
        {face('S')}
      </OnWall>
      <OnWall axis="z" face={x0} normal={1}>
        {face('W')}
      </OnWall>
      <OnWall axis="z" face={x1} normal={-1}>
        {face('E')}
      </OnWall>
    </group>
  );
}
