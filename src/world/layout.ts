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

/** Room 3: the Giant's Dining Room, east of the corridor behind its first door on the right. */
export const DINING = {
  x0: CORRIDOR.x1 + WALL_T, // 1.45, the far face of the corridor wall
  x1: 12.45,
  zN: -10.6,
  zS: -18.3,
  height: 4.4,
  doorZ: -15.4,
  /** Guests' table, running east toward the giant's end. */
  table: { x0: 2.7, x1: 10.9, z: -14.45, w: 1.5, h: 0.78 },
  /** The giant's place: plate and cloche at the end of the table, the giant's chair behind. */
  giant: { plateX: 10.25, chairX: 11.55 },
  windows: [-12.75, -16.15],
  menu: { x: 4.6, y: 1.75 },
};

/** Room 4: the Nursery, behind the hidden jib door in the Hall of Mirrors' west wall. */
export const NURSERY = {
  x0: -12.6,
  x1: MIRRORS.x0 - WALL_T, // -4.8, the far face of the mirror room's wall
  zN: -19.4,
  zS: -27.4,
  height: 3.5,
  horse: { x: -11.0, z: -20.6 },
  musicBox: { x: -8.3, z: -23.4 },
  dollhouse: { x: -11.95, z: -22.6 },
  bed: { x: -9.4, z: -26.55 },
  slate: { x: -6.9, z: -19.95 },
  window: { z: -25.4, width: 1.2, sill: 0.8, top: 2.6 },
};

/** Room 5: the Chamber of Echoes (music room), south of the Nursery. */
export const ECHOES = {
  x0: -12.6,
  x1: -5.1,
  zN: -27.7,
  zS: -37.0,
  height: 4.2,
  /** Door in the Nursery's south wall. */
  doorX: -5.9,
  piano: { x: -11.2, z: -30.3 }, // clear of the press doorway (west wall, z -32)
  gramophone: { x: -6.2, z: -35.6 },
  bucket: { x: -9.4, z: -28.5 },
  organ: { x: -9.0, z: -36.45 },
  board: { x: -6.0, z: -31.5 },
};

/** Room 6: the Whispering Press, west of the Chamber of Echoes. */
export const PRESS = {
  x0: -21.0,
  x1: ECHOES.x0 - WALL_T, // -12.9
  zN: -27.7,
  zS: -37.0,
  height: 4.0,
  /** Door in the music room's west wall. */
  doorZ: -32.0,
  press: { x: -17.4, z: -32.4 },
  cases: { x: -17.0, z: -28.15 },
  board: { x: -14.1, z: -36.2 },
};

/** Room 7: the Crooked Kitchen, east of the Entrance Hall (its west wall is the hall's). */
export const KITCHEN = {
  x0: HALL.x1 + WALL_T, // 6.3
  x1: 14.4,
  zN: -1.0,
  zS: -10.0,
  height: 3.6,
  /** Door in the hall's east wall, under the landing. */
  doorZ: -8.6,
  table: { x: 10.4, z: -5.4 },
  beans: { x: 8.1, z: -2.3 },
  pot: { x: 13.5, z: -3.6 },
  cloud: { x: 12.8, z: -8.4 },
  ice: { x: 11.0, z: -1.6 },
  board: { x: 7.3, z: -5.0 },
};

/** Room 8: the Ballroom of Contradictions, south of the Dining Room. */
export const BALLROOM = {
  x0: 5.1,
  x1: DINING.x1, // shares the Dining Room's south wall along its whole north side
  zN: DINING.zS - WALL_T, // -18.6
  zS: -31.5,
  height: 6.0,
  /** Door in the Dining Room's south wall. */
  doorX: 9.4,
  dancers: { x: 8.8, z: -25.4 },
  candles: [
    [6.0, -25.4],
    [11.6, -25.4],
  ] as [number, number][],
  secret: { x: 8.8, z: -30.4 },
  board: { x: 6.0, z: -20.9 },
  windows: [-22.6, -28.4],
};

/** Room 9: the Forgotten Scholar's Study, west of the Entrance Hall (its east wall is the hall's). */
export const STUDY = {
  x0: -14.4,
  x1: HALL.x0 - WALL_T, // -6.3
  zN: -1.0,
  zS: -10.0,
  height: 4.2,
  /** Door in the hall's west wall, under the landing. */
  doorZ: -8.8,
  desk: { x: -10.4, z: -5.0 },
  globe: { x: -12.9, z: -8.4 },
  board: { x: -7.2, z: -2.4 },
};

/** The finale: the Lady's writing box on the hall's centre table. */
export const FINALE = {
  box: { x: 0.78, y: 0.75, z: -4.32 },
  portrait: { x: HALL.x1 - 0.35, y: 2.6, z: HALL.fireplace.z },
};

export type Zone = 'exterior' | 'hall' | 'corridor' | 'mirrors' | 'gallery' | 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study';

export function zoneAt(z: number, x = 0): Zone {
  if (x < CORRIDOR.x0 - WALL_T / 2 && z < GALLERY.zN + 0.2 && z > GALLERY.zS - 0.2 && x > GALLERY.x0 - 0.3) return 'gallery';
  if (x > CORRIDOR.x1 + WALL_T / 2 && z < DINING.zN + 0.2 && z > DINING.zS - 0.2) return 'dining';
  if (x < MIRRORS.x0 - WALL_T / 2 && z < NURSERY.zN + 0.2 && z > NURSERY.zS - 0.2) return 'nursery';
  if (x < PRESS.x1 + WALL_T / 2 && z < PRESS.zN + 0.2 && z > PRESS.zS - 0.2) return 'press';
  if (x < ECHOES.x1 + WALL_T / 2 && z < ECHOES.zN + 0.2 && z > ECHOES.zS - 0.2) return 'echoes';
  if (x > MIRRORS.x1 + WALL_T / 2 && z < BALLROOM.zN + 0.2 && z > BALLROOM.zS - 0.2) return 'ballroom';
  if (x < HALL.x0 - WALL_T / 2 && z < STUDY.zN + 0.2 && z > STUDY.zS - 0.2) return 'study';
  if (x > HALL.x1 + WALL_T / 2 && z < KITCHEN.zN + 0.2 && z > KITCHEN.zS - 0.2) return 'kitchen';
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
  /** Just inside the dining room door, looking down the table to the giant's chair. */
  diningEntry: { position: [2.2, EYE_HEIGHT, -16.3], yaw: -Math.PI / 2 - 0.21, pitch: 0.02 } as Pose,
  /** Beside the giant's plate, looking down at the Tiny Key. */
  diningKey: { position: [9.5, EYE_HEIGHT, -16.0], yaw: -Math.PI + 0.45, pitch: -0.5 } as Pose,
  /** In the Hall of Mirrors, facing the hidden door. */
  jibDoor: { position: [-2.9, EYE_HEIGHT, -23.15], yaw: Math.PI / 2, pitch: -0.02 } as Pose,
  /** Just inside the nursery. */
  nurseryEntry: { position: [-5.6, EYE_HEIGHT, -23.4], yaw: Math.PI / 2 + 0.4, pitch: -0.06 } as Pose,
  /** Over the open music box. */
  nurseryKey: { position: [-7.35, EYE_HEIGHT, -23.4], yaw: Math.PI / 2, pitch: -0.75 } as Pose,
  /** Just inside each of the five later rooms, and where each room's key waits. */
  echoesEntry: { position: [-5.9, EYE_HEIGHT, -28.7], yaw: 0.67, pitch: -0.04 } as Pose,
  echoesKey: { position: [-9.2, EYE_HEIGHT, -30.3], yaw: Math.PI / 2, pitch: -0.5 } as Pose,
  pressEntry: { position: [-13.8, EYE_HEIGHT, -32.0], yaw: Math.PI / 2, pitch: -0.04 } as Pose,
  pressKey: { position: [-15.6, EYE_HEIGHT, -32.4], yaw: Math.PI / 2, pitch: -0.45 } as Pose,
  kitchenEntry: { position: [7.1, EYE_HEIGHT, -8.4], yaw: -2.36, pitch: -0.05 } as Pose,
  kitchenKey: { position: [10.4, EYE_HEIGHT, -7.0], yaw: Math.PI, pitch: -0.55 } as Pose,
  ballroomEntry: { position: [9.4, EYE_HEIGHT, -19.8], yaw: -0.12, pitch: 0.02 } as Pose,
  ballroomKey: { position: [8.8, EYE_HEIGHT, -28.9], yaw: 0, pitch: -0.42 } as Pose,
  studyEntry: { position: [-7.1, EYE_HEIGHT, -8.6], yaw: 2.39, pitch: -0.05 } as Pose,
  studyKey: { position: [-10.4, EYE_HEIGHT, -6.4], yaw: Math.PI, pitch: -0.6 } as Pose,
  /** In the hall, in front of the Lady's writing box. */
  finaleEntry: { position: [-0.55, EYE_HEIGHT, -2.85], yaw: -0.62, pitch: -0.38 } as Pose,
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
  // The Giant's Dining Room
  diningTable: aim([2.0, 2.3, -11.6], [7.2, 0.8, -14.45], 'right', 16),
  diningGiant: aim([5.9, 1.85, -11.4], [11.2, 1.75, -14.45], 'right', 17),
  diningMenu: aim([6.3, 1.65, -13.3], [DINING.menu.x, DINING.menu.y, DINING.zN], 'right', 19),
  // The Nursery
  nurseryHorse: aim([-7.7, 1.5, -23.6], [-11.0, 0.75, -20.6], 'right', 18),
  nurseryToys: aim([-5.4, 1.75, -25.9], [-10.0, 0.8, -22.4], 'right', 16),
  nurseryMusicBox: aim([-6.1, 1.5, -25.2], [-8.3, 0.85, -23.4], 'right', 17),
  nurserySlate: aim([-7.3, 1.6, -23.9], [-6.9, 1.3, -19.6], 'right', 19),
  // The Chamber of Echoes
  echoesWide: aim([-5.8, 1.8, -29.0], [-10.0, 1.0, -33.4], 'right', 15),
  echoesPipe: aim([-7.4, 1.65, -31.4], [ECHOES.bucket.x, 1.4, ECHOES.bucket.z], 'right', 17),
  echoesPiano: aim([-8.0, 1.6, -31.6], [ECHOES.piano.x, 1.0, ECHOES.piano.z], 'right', 17),
  echoesGram: aim([-8.4, 1.6, -32.6], [ECHOES.gramophone.x, 1.0, ECHOES.gramophone.z], 'right', 17),
  echoesBoard: aim([-8.6, 1.6, -33.4], [ECHOES.board.x, 1.5, ECHOES.board.z], 'right', 19),
  // The Whispering Press
  pressWide: aim([-13.7, 1.85, -29.0], [-18.0, 1.1, -33.2], 'right', 15),
  pressCases: aim([-15.4, 1.6, -31.0], [PRESS.cases.x, 1.3, PRESS.cases.z], 'right', 18),
  pressBoard: aim([-16.2, 1.6, -33.4], [PRESS.board.x, 1.5, PRESS.board.z], 'right', 19),
  // The Crooked Kitchen
  kitchenWide: aim([7.0, 1.9, -9.3], [11.4, 0.9, -4.0], 'right', 15),
  kitchenBeans: aim([9.6, 1.6, -5.0], [KITCHEN.beans.x, 0.4, KITCHEN.beans.z], 'right', 17),
  kitchenBoard: aim([9.6, 1.6, -7.2], [KITCHEN.board.x, 1.5, KITCHEN.board.z], 'right', 19),
  // The Ballroom of Contradictions
  ballroomWide: aim([7.0, 2.3, -19.5], [9.0, 1.3, -27.5], 'right', 14),
  ballroomDancers: aim([6.4, 1.65, -21.8], [BALLROOM.dancers.x, 1.2, BALLROOM.dancers.z], 'right', 17),
  ballroomCase: aim([7.6, 1.65, -27.2], [BALLROOM.secret.x, 1.0, BALLROOM.secret.z], 'right', 17),
  ballroomBoard: aim([8.6, 1.6, -23.0], [BALLROOM.board.x, 1.5, BALLROOM.board.z], 'right', 19),
  // The Scholar's Study
  studyWide: aim([-7.0, 1.9, -9.3], [-11.3, 1.1, -4.0], 'right', 15),
  studyDesk: aim([-7.9, 1.75, -7.0], [STUDY.desk.x, 0.85, STUDY.desk.z], 'right', 16),
  studyBoard: aim([-9.6, 1.6, -4.6], [STUDY.board.x, 1.5, STUDY.board.z], 'right', 19),
  // The finale, in the Entrance Hall
  hallLetter: aim([-0.9, 1.7, -2.4], [FINALE.box.x, 0.85, FINALE.box.z], 'right', 17),
  hallLady: aim([2.3, 1.7, -3.5], [FINALE.portrait.x, 2.05, FINALE.portrait.z], 'right', 18),
  hallDoors: aim([1.2, 1.75, -7.6], [0, 1.9, HALL.zFront], 'right', 15),
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
export function surfaceAt(x: number, z: number): 'wood' | 'carpet' | 'gravel' | 'stone' {
  // The porch and its steps are stone flags (the same stone as the kitchen floor).
  const fz = EXTERIOR.facadeZ;
  if (Math.abs(x) < 2.3 && z > fz && z <= fz + 3.36) return 'stone';
  if (z > HALL.zFront + 0.05 && groundAt(x, z) < -0.05) return 'gravel';
  // The Crooked Kitchen is floored with stone flags.
  if (x >= KITCHEN.x0 && x <= KITCHEN.x1 && z <= KITCHEN.zN && z >= KITCHEN.zS) return 'stone';
  const rugs: [number, number, number, number][] = [
    [0.6, -4.6, 3.0, 4.4], // hall rug
    [0, -14.25, 0.95, 7.2], // corridor runner
    [0, -24.9, 2.8, 5.2], // mirror room rug
    [6.2, -14.45, 8.2, 3.4], // dining room rug
    [-8.6, -23.4, 3.6, 3.0], // nursery rug
    [-8.8, -32.4, 3.6, 3.2], // music room rug
    [-10.4, -5.0, 3.4, 2.6], // study rug
  ];
  for (const [cx, cz, w, d] of rugs) if (Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2) return 'carpet';
  return 'wood';
}
