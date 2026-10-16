/**
 * Lightweight 2D (x/z) collision: the player is a circle, the world is a set of
 * axis-aligned boxes. Doors register dynamic boxes that switch off when open.
 */
import { BALLROOM, CORRIDOR, DINING, ECHOES, EXTERIOR, GALLERY, HALL, KITCHEN, MIRRORS, NURSERY, PLAYER_RADIUS, PRESS, STUDY, WALL_T } from './layout';

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
  ...wallZ(HALL.zFront, HALL.zBack, HALL.x0 - h, [[STUDY.doorZ, 0.96]]),
  ...wallZ(HALL.zFront, HALL.zBack, HALL.x1 + h, [[KITCHEN.doorZ, 0.96]]),
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
  ...wallZ(CORRIDOR.zStart, CORRIDOR.zEnd, CORRIDOR.x1 + h, [[DINING.doorZ, 0.96]]),
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
  // (The hidden door opens into the Nursery; its leaf is a dynamic collider.)

  // --- The Giant's Dining Room (its west wall is the corridor's east wall) ---
  ...wallX(DINING.x0, DINING.x1 + WALL_T, DINING.zN + h),
  ...wallX(DINING.x0, DINING.x1 + WALL_T, DINING.zS - h, [[BALLROOM.doorX, 0.96]]),
  ...wallZ(DINING.zN, DINING.zS, DINING.x1 + h),
  // Guests' table with its chairs, the giant's plate, and the giant's chair
  box(DINING.table.x0 - 0.1, DINING.giant.plateX + 0.65, DINING.table.z - 1.2, DINING.table.z + 1.2),
  boxAt(DINING.giant.chairX, DINING.table.z, 1.5, 1.9),
  // Giant cutlery leaning on the north wall, sideboard on the south wall
  boxAt(8.4, DINING.zN - 0.35, 2.2, 0.5),
  boxAt(6.4, DINING.zS + 0.3, 2.0, 0.6),
  // Menu board on its easel
  boxAt(DINING.menu.x, DINING.zN - 0.4, 1.1, 0.5),

  // --- The Nursery (its east wall is the mirror room's west wall) ---
  ...wallX(NURSERY.x0 - WALL_T, NURSERY.x1, NURSERY.zN + h),
  ...wallX(NURSERY.x0 - WALL_T, NURSERY.x1, NURSERY.zS - h, [[ECHOES.doorX, 0.96]]),
  ...wallZ(NURSERY.zN, NURSERY.zS, NURSERY.x0 - h),
  boxAt(NURSERY.horse.x, NURSERY.horse.z, 1.2, 0.9),
  boxAt(NURSERY.musicBox.x, NURSERY.musicBox.z, 0.75, 0.75),
  boxAt(NURSERY.dollhouse.x, NURSERY.dollhouse.z, 0.9, 1.5),
  boxAt(NURSERY.bed.x, NURSERY.bed.z, 1.9, 1.0),
  boxAt(NURSERY.slate.x, NURSERY.slate.z, 1.0, 0.6),

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

  // --- Chamber of Echoes (north wall shared with the Nursery) ---
  ...wallZ(ECHOES.zN, ECHOES.zS, ECHOES.x1 + h),
  ...wallX(ECHOES.x0 - WALL_T, ECHOES.x1 + WALL_T, ECHOES.zS - h),
  ...wallZ(ECHOES.zN, ECHOES.zS, ECHOES.x0 - h, [[PRESS.doorZ, 0.96]]),
  boxAt(ECHOES.piano.x, ECHOES.piano.z, 1.5, 1.9),
  boxAt(ECHOES.gramophone.x, ECHOES.gramophone.z, 0.7, 0.7),
  boxAt(ECHOES.organ.x, ECHOES.organ.z, 1.5, 0.65),
  boxAt(ECHOES.bucket.x, ECHOES.bucket.z, 0.4, 0.4),
  boxAt(ECHOES.board.x, ECHOES.board.z, 0.6, 1.0),

  // --- Whispering Press (east wall shared with the music room) ---
  ...wallX(PRESS.x0 - WALL_T, PRESS.x1, PRESS.zN + h),
  ...wallX(PRESS.x0 - WALL_T, PRESS.x1, PRESS.zS - h),
  ...wallZ(PRESS.zN, PRESS.zS, PRESS.x0 - h),
  boxAt(PRESS.press.x, PRESS.press.z, 1.3, 1.7),
  boxAt(PRESS.cases.x, PRESS.cases.z, 2.6, 0.7),
  boxAt(PRESS.board.x, PRESS.board.z, 1.0, 0.6),
  boxAt(-19.5, -35.2, 1.5, 1.0),

  // --- Crooked Kitchen (west wall is the hall's) ---
  ...wallX(KITCHEN.x0, KITCHEN.x1 + WALL_T, KITCHEN.zN + h),
  ...wallX(KITCHEN.x0, KITCHEN.x1 + WALL_T, KITCHEN.zS - h),
  ...wallZ(KITCHEN.zN, KITCHEN.zS, KITCHEN.x1 + h),
  boxAt(KITCHEN.table.x, KITCHEN.table.z, 2.3, 1.2),
  boxAt(13.85, -3.8, 1.0, 2.2),
  boxAt(KITCHEN.ice.x, -1.35, 2.0, 0.65),
  boxAt(KITCHEN.beans.x, KITCHEN.beans.z, 0.7, 0.7),
  boxAt(KITCHEN.cloud.x, KITCHEN.cloud.z, 0.6, 0.6),
  boxAt(KITCHEN.board.x, KITCHEN.board.z, 0.6, 1.0),

  // --- Ballroom (north wall is the Dining Room's south wall) ---
  ...wallZ(BALLROOM.zN, BALLROOM.zS, BALLROOM.x0 - h),
  ...wallZ(BALLROOM.zN, BALLROOM.zS, BALLROOM.x1 + h),
  ...wallX(BALLROOM.x0 - WALL_T, BALLROOM.x1 + WALL_T, BALLROOM.zS - h),
  boxAt(BALLROOM.dancers.x, BALLROOM.dancers.z, 1.5, 1.5),
  ...BALLROOM.candles.map(([x, z]) => boxAt(x, z, 0.5, 0.5)),
  boxAt(BALLROOM.secret.x, BALLROOM.secret.z, 1.1, 0.8),
  boxAt(BALLROOM.board.x, BALLROOM.board.z, 0.6, 1.0),

  // --- Scholar's Study (east wall is the hall's) ---
  ...wallX(STUDY.x0 - WALL_T, STUDY.x1, STUDY.zN + h),
  ...wallX(STUDY.x0 - WALL_T, STUDY.x1, STUDY.zS - h),
  ...wallZ(STUDY.zN, STUDY.zS, STUDY.x0 - h),
  boxAt(STUDY.desk.x, STUDY.desk.z, 1.9, 1.0),
  boxAt(STUDY.x0 + 0.25, -5.5, 0.5, 6.0),
  boxAt(STUDY.globe.x, STUDY.globe.z, 0.7, 0.7),
  boxAt(STUDY.board.x, STUDY.board.z, 0.6, 1.0),

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
