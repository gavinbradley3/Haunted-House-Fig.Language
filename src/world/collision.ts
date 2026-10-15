/**
 * Lightweight 2D (x/z) collision: the player is a circle, the world is a set of
 * axis-aligned boxes. Doors register dynamic boxes that switch off when open.
 */
import { CORRIDOR, EXTERIOR, GALLERY, HALL, MIRRORS, PLAYER_RADIUS, WALL_T } from './layout';

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const box = (x0: number, x1: number, z0: number, z1: number): Box => ({
  minX: Math.min(x0, x1),
  maxX: Math.max(x0, x1),
  minZ: Math.min(z0, z1),
  maxZ: Math.max(z0, z1),
});

/** Box centred at (x, z) with full size w (x) by d (z). */
export const boxAt = (x: number, z: number, w: number, d: number): Box => box(x - w / 2, x + w / 2, z - d / 2, z + d / 2);

/** A wall running along x at depth z with gaps [centre, width]. */
function wallX(x0: number, x1: number, z: number, gaps: [number, number][] = [], t = WALL_T): Box[] {
  const out: Box[] = [];
  let cursor = x0;
  for (const [c, w] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (c - w / 2 > cursor) out.push(box(cursor, c - w / 2, z - t / 2, z + t / 2));
    cursor = c + w / 2;
  }
  if (cursor < x1) out.push(box(cursor, x1, z - t / 2, z + t / 2));
  return out;
}

/** A wall running along z at x with gaps [centre, width]. */
function wallZ(z0: number, z1: number, x: number, gaps: [number, number][] = [], t = WALL_T): Box[] {
  const lo = Math.min(z0, z1);
  const hi = Math.max(z0, z1);
  const out: Box[] = [];
  let cursor = lo;
  for (const [c, w] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (c - w / 2 > cursor) out.push(box(x - t / 2, x + t / 2, cursor, c - w / 2));
    cursor = c + w / 2;
  }
  if (cursor < hi) out.push(box(x - t / 2, x + t / 2, cursor, hi));
  return out;
}

const h = WALL_T / 2;

export const STATIC_BOXES: Box[] = [
  // --- Entrance hall shell ---
  ...wallX(HALL.x0, HALL.x1, HALL.zFront + h, [[HALL.frontDoor.x, HALL.frontDoor.width]]),
  ...wallX(HALL.x0, HALL.x1, HALL.zBack - h, [[0, HALL.corridorOpening.width]]),
  ...wallZ(HALL.zFront, HALL.zBack, HALL.x0 - h),
  ...wallZ(HALL.zFront, HALL.zBack, HALL.x1 + h),
  // Staircase footprint (upstairs is roped off).
  box(HALL.stair.x0, HALL.stair.x1 + 0.05, HALL.stair.zStart + 0.35, HALL.stair.zEnd),
  // Fireplace hearth and surround
  boxAt(HALL.x1 - 0.35, HALL.fireplace.z, 0.75, 2.5),
  // Centre table and rug furniture
  boxAt(0.6, -4.6, 1.35, 1.35),
  // Grandfather clock
  boxAt(2.55, HALL.zBack + 0.3, 0.6, 0.5),
  // Console table under the landing
  boxAt(-2.9, HALL.zBack + 0.28, 1.6, 0.5),
  // Settle bench against the right wall near the front
  boxAt(HALL.x1 - 0.3, -1.7, 0.6, 1.6),
  // Coat stand, front left
  boxAt(-1.75, -0.45, 0.5, 0.5),

  // --- Corridor ---
  ...wallZ(CORRIDOR.zStart, CORRIDOR.zEnd, CORRIDOR.x0 - h, [[GALLERY.doorZ, 0.96]]),
  ...wallZ(CORRIDOR.zStart, CORRIDOR.zEnd, CORRIDOR.x1 + h),
  ...wallX(CORRIDOR.x0 - WALL_T, CORRIDOR.x1 + WALL_T, CORRIDOR.zEnd - h, [[0, CORRIDOR.mirrorDoor.width]]),
  // Pier table on the corridor's right wall
  boxAt(CORRIDOR.x1 - 0.2, -12.3, 0.42, 1.1),

  // --- Hall of Mirrors ---
  ...wallX(MIRRORS.x0, MIRRORS.x1, MIRRORS.zStart + h, [[0, CORRIDOR.mirrorDoor.width]]),
  ...wallX(MIRRORS.x0, MIRRORS.x1, MIRRORS.zEnd - h),
  ...wallZ(MIRRORS.zStart, MIRRORS.zEnd, MIRRORS.x0 - h, [[MIRRORS.jibDoor.z, MIRRORS.jibDoor.width]]),
  ...wallZ(MIRRORS.zStart, MIRRORS.zEnd, MIRRORS.x1 + h),
  // Console beneath the speaking mirror
  boxAt(MIRRORS.x1 - 0.28, MIRRORS.speaking.z, 0.55, 1.9),
  // Consoles under the outer right mirrors are absent; chaise in the middle of the room
  boxAt(-0.2, -26.6, 0.85, 2.0),
  // The space behind the hidden door is only a shallow alcove
  boxAt(MIRRORS.x0 - 1.0, MIRRORS.jibDoor.z, 1.4, 1.6),

  // --- Portrait Gallery (its east wall is the corridor's west wall) ---
  ...wallX(GALLERY.x0 - WALL_T, GALLERY.x1, GALLERY.zN + h),
  ...wallX(GALLERY.x0 - WALL_T, GALLERY.x1, GALLERY.zS - h),
  ...wallZ(GALLERY.zN, GALLERY.zS, GALLERY.x0 - h),
  // Long upholstered bench in the middle of the room
  boxAt(GALLERY.bench.x, GALLERY.bench.z, 2.5, 0.75),
  // Rope in front of the caretaker's portrait
  box(GALLERY.x0 + 1.0, GALLERY.x0 + 1.1, GALLERY.caretaker.z - 0.95, GALLERY.caretaker.z + 0.95),
  // Pedestals in the far corners
  boxAt(GALLERY.x0 + 0.45, GALLERY.zN - 0.45, 0.6, 0.6),
  boxAt(GALLERY.x0 + 0.45, GALLERY.zS + 0.45, 0.6, 0.6),

  // --- Exterior: keep the player near the porch ---
  box(EXTERIOR.houseX0, EXTERIOR.houseX1, EXTERIOR.facadeZ + 0.0, EXTERIOR.facadeZ + 0.1),
  box(-12, 12, 14, 14.5),
  box(-12, -11.5, 0, 14.5),
  box(11.5, 12, 0, 14.5),
];

/** Dynamic colliders keyed by id (doors). */
const dynamic = new Map<string, { box: Box; active: boolean }>();

export function setDynamicCollider(id: string, b: Box, active: boolean) {
  dynamic.set(id, { box: b, active });
}
export function setDynamicActive(id: string, active: boolean) {
  const d = dynamic.get(id);
  if (d) d.active = active;
}
export function removeDynamicCollider(id: string) {
  dynamic.delete(id);
}

function activeBoxes(): Box[] {
  const out = STATIC_BOXES.slice();
  for (const d of dynamic.values()) if (d.active) out.push(d.box);
  return out;
}

/**
 * Push a circle at (x, z) out of all boxes. Returns the corrected position.
 * Runs a few iterations so corners resolve cleanly.
 */
export function resolveCircle(x: number, z: number, r = PLAYER_RADIUS, boxes: Box[] = activeBoxes()): [number, number] {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // Centre is inside the box: push out along the shallowest axis.
        const pushes = [
          [b.minX - r - x, 0],
          [b.maxX + r - x, 0],
          [0, b.minZ - r - z],
          [0, b.maxZ + r - z],
        ];
        pushes.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
        x += pushes[0][0];
        z += pushes[0][1];
      }
      moved = true;
    }
    if (!moved) break;
  }
  return [x, z];
}
