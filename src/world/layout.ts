/**
 * Single source of truth for the mansion's dimensions (metres, y up).
 * The front of the house faces +z. Moving "into" the house is moving toward -z.
 */

export const EYE_HEIGHT = 1.65;
export const PLAYER_RADIUS = 0.28;
export const WALL_T = 0.3;

export const HALL = {
  x0: -6,
  x1: 6,
  zFront: 0,
  zBack: -10,
  height: 6.4,
  frontDoor: { x: 0, width: 1.9, height: 3.1 },
  frontWindows: [-3.7, 3.7],
  window: { width: 1.45, sill: 0.85, top: 3.35 },
  upperWindow: { sill: 4.15, top: 5.75 },
  landing: { y: 3.4, zEdge: -7.6, thick: 0.32 },
  stair: { x0: -6, x1: -4.55, zStart: -1.7, zEnd: -7.6, rise: 3.4 },
  corridorOpening: { x: 0, width: 2.0, height: 2.75 },
  fireplace: { z: -4.6 },
};

export const CORRIDOR = {
  x0: -1.15,
  x1: 1.15,
  zStart: HALL.zBack - WALL_T, // -10.3
  zEnd: -18.6,
  height: 3.05,
  lockedDoors: [
    { side: -1 as const, z: -12.9, room: 'The Portrait Gallery', device: 'Metaphor' },
    { side: 1 as const, z: -15.4, room: "The Giant's Dining Room", device: 'Hyperbole' },
  ],
  mirrorDoor: { width: 1.25, height: 2.45 },
};

export const MIRRORS = {
  x0: -4.5,
  x1: 4.5,
  zStart: CORRIDOR.zEnd - WALL_T, // -18.9
  zEnd: -30.9,
  height: 4.9,
  window: { width: 2.3, sill: 0.45, top: 4.15 },
  /** Mirror centres along each long wall. */
  mirrorZ: [-21.4, -24.9, -28.4],
  mirror: { width: 1.36, bottom: 0.62, top: 3.65 },
  speaking: { z: -24.9, bottom: 1.15, top: 3.95, width: 1.62 },
  /** Hidden jib door in the left wall panelling, between the first two mirrors. */
  jibDoor: { z: -23.15, width: 0.92, height: 2.3 },
  /** The mirror whose reflection becomes an endless tunnel in Challenge A. */
  tunnelMirror: { side: -1 as const, z: -28.4 },
  clock: { x: 4.0, z: -25.75 },
};

export const EXTERIOR = {
  facadeZ: HALL.zFront + WALL_T, // 0.3
  houseX0: -10.5,
  houseX1: 10.5,
  eaves: 8.6,
};

/** The Portrait Gallery lies west of the corridor, behind the first locked door. */
export const GALLERY = {
  x0: -14.45,
  x1: CORRIDOR.x0 - WALL_T, // -1.45, the far face of the corridor wall
  zN: -10.6,
  zS: -17.6,
  height: 5.2,
  doorZ: -12.9,
  caretaker: { z: -14.1, y: 2.5, width: 1.35 },
  emptyFrame: { z: -16.35, y: 2.15, width: 0.72 },
  silence: { z: -11.85, y: 2.15, width: 0.72 },
  oldMan: { x: -10.0, y: 2.2, width: 0.9 },
  sitter: { x: -10.0, y: 2.2, width: 0.9 },
  bench: { x: -8.3, z: -14.1 },
};

export type Zone = 'exterior' | 'hall' | 'corridor' | 'mirrors' | 'gallery';

export function zoneAt(z: number, x = 0): Zone {
  if (x < CORRIDOR.x0 - WALL_T / 2 && z < GALLERY.zN + 0.2 && z > GALLERY.zS - 0.2 && x > GALLERY.x0 - 0.3) return 'gallery';
  if (z > HALL.zFront + 0.05) return 'exterior';
  if (z > CORRIDOR.zStart + 0.05) return 'hall';
  if (z > MIRRORS.zStart + 0.05) return 'corridor';
  return 'mirrors';
}

export interface Pose {
  position: [number, number, number];
  /** Yaw in radians: 0 looks toward -z. */
  yaw: number;
  pitch: number;
}

export const POSES = {
  hallStart: { position: [0, EYE_HEIGHT, -1.4], yaw: 0, pitch: -0.02 } as Pose,
  corridorMouth: { position: [0, EYE_HEIGHT, -8.9], yaw: 0, pitch: 0 } as Pose,
  mirrorEntry: { position: [0, EYE_HEIGHT, -20.2], yaw: 0, pitch: 0.02 } as Pose,
  /** Just inside the gallery door, facing the length of the room. */
  galleryEntry: { position: [-2.6, EYE_HEIGHT, -13.2], yaw: Math.PI / 2, pitch: 0.03 } as Pose,
  /** In front of the Hall of Mirrors console, looking down at the open drawer. */
  mirrorKey: { position: [2.95, EYE_HEIGHT, -24.75], yaw: -Math.PI / 2, pitch: -0.62 } as Pose,
  /** In front of the empty frame and the safe behind it. */
  galleryKey: { position: [-13.05, EYE_HEIGHT, -16.3], yaw: Math.PI / 2, pitch: -0.1 } as Pose,
};

type V3 = readonly [number, number, number];
/**
 * Aim a lesson camera so `at` sits to one side of the frame, leaving room for the panel.
 * side = 'right' puts the subject right of centre (panel on the left).
 */
function aim(position: V3, at: V3, side: 'right' | 'left', deg = 20): { position: V3; target: V3 } {
  const dx = at[0] - position[0];
  const dz = at[2] - position[2];
  const yaw = Math.atan2(-dx, -dz) + ((side === 'right' ? 1 : -1) * deg * Math.PI) / 180;
  const dist = Math.hypot(dx, dz);
  return { position, target: [position[0] - Math.sin(yaw) * dist, at[1], position[2] - Math.cos(yaw) * dist] };
}

/** Fixed camera shots used during the lesson, so the teacher never has to aim. */
export const SHOTS = {
  curtains: { position: [-1.2, 1.6, -26.0], target: [-1.75, 2.2, -30.9] },
  speaking: { position: [1.2, 1.6, -23.4], target: [4.1, 2.15, -26.2] },
  tunnel: { position: [1.8, 1.62, -25.4], target: [-4.4, 1.95, -28.6] },
  clock: { position: [0.9, 1.5, -24.0], target: [4.2, 1.25, -25.9] },
  jib: { position: [1.6, 1.62, -24.3], target: [-4.4, 1.5, -23.0] },
  drawer: { position: [2.35, 1.5, -23.6], target: [4.6, 0.55, -25.3] },
  caretaker: aim([-10.9, 1.75, -14.1], [-14.45, 2.4, -14.1], 'right', 19),
  oldMan: aim([-8.6, 1.7, -14.8], [-10.0, 2.15, -17.6], 'right', 19),
  sitter: aim([-8.6, 1.7, -13.4], [-10.0, 2.15, -10.6], 'right', 19),
  emptyFrame: aim([-11.6, 1.7, -14.9], [-14.45, 2.1, -16.35], 'right', 19),
} as const;
export type ShotName = keyof typeof SHOTS;

/** Height of the walkable surface (the drive outside is three steps below the floor). */
export function groundAt(x: number, z: number): number {
  const fz = EXTERIOR.facadeZ;
  if (z <= fz) return 0;
  const porch = Math.abs(x) < 2.3;
  if (porch && z <= fz + 2.4) return 0;
  if (porch && z <= fz + 3.36) return -0.16 * Math.ceil((z - fz - 2.4) / 0.32);
  return -0.48;
}

/** What the floor is made of here, for footstep sounds. */
export function surfaceAt(x: number, z: number): 'wood' | 'carpet' | 'gravel' {
  if (z > HALL.zFront + 0.05 && groundAt(x, z) < -0.05) return 'gravel';
  const rugs: [number, number, number, number][] = [
    [0.6, -4.6, 3.0, 4.4], // hall rug
    [0, -14.25, 0.95, 7.2], // corridor runner
    [0, -24.9, 2.8, 5.2], // mirror room rug
  ];
  for (const [cx, cz, w, d] of rugs) if (Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2) return 'carpet';
  return 'wood';
}
