/**
 * Mansion progression: rooms are completed, keys are collected, doors are unlocked.
 * Pure and framework-free so the rules are easy to test.
 *
 * Hall of Mirrors → Mirror Key → Portrait Gallery door
 * Portrait Gallery → Gallery Key → Giant's Dining Room door
 * Dining Room → Tiny Key → hidden door in the Hall of Mirrors → Nursery
 * Nursery → Music Box Key → Chamber of Echoes → Bell Key → Whispering Press
 * Press → Type Key → Crooked Kitchen → Pantry Key → Ballroom → Ballroom Key → Scholar's Study
 * Study → Scholar's Key → the Lady's writing box in the Entrance Hall → the final lesson
 */
import { ROOMS, type RoomId } from '../content/types';

export type KeyId = 'mirrorKey' | 'galleryKey' | 'diningKey' | 'nurseryKey' | 'echoesKey' | 'pressKey' | 'kitchenKey' | 'ballroomKey' | 'studyKey';

/** The key each room gives when its lesson is complete. The final lesson gives none. */
export const KEY_FOR_ROOM: Partial<Record<RoomId, KeyId>> = {
  mirrors: 'mirrorKey',
  gallery: 'galleryKey',
  dining: 'diningKey',
  nursery: 'nurseryKey',
  echoes: 'echoesKey',
  press: 'pressKey',
  kitchen: 'kitchenKey',
  ballroom: 'ballroomKey',
  study: 'studyKey',
};

export const KEY_NAMES: Record<KeyId, string> = {
  mirrorKey: 'the Mirror Key',
  galleryKey: 'the Gallery Key',
  diningKey: 'the Tiny Key',
  nurseryKey: 'the Music Box Key',
  echoesKey: 'the Bell Key',
  pressKey: 'the Type Key',
  kitchenKey: 'the Pantry Key',
  ballroomKey: 'the Ballroom Key',
  studyKey: 'the Scholar’s Key',
};

/** Locks opened by keys after the gallery door (which keeps its own flag for older saves). */
export type LockId = 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study' | 'desk';

/** Which key opens which lock. */
export const LOCK_KEY: Record<'gallery' | LockId, KeyId> = {
  gallery: 'mirrorKey',
  dining: 'galleryKey',
  nursery: 'diningKey',
  echoes: 'nurseryKey',
  press: 'echoesKey',
  kitchen: 'pressKey',
  ballroom: 'kitchenKey',
  study: 'ballroomKey',
  desk: 'studyKey',
};

export interface Progress {
  completed: Record<RoomId, boolean>;
  keys: Record<KeyId, boolean>;
  galleryUnlocked: boolean;
  unlocked: Record<LockId, boolean>;
}

/** Teacher grants, in the order the class would reach them. */
export const GRANT_STEPS = [
  'mirrorKey',
  'galleryOpen',
  'galleryKey',
  'diningOpen',
  'diningKey',
  'nurseryOpen',
  'nurseryKey',
  'echoesOpen',
  'echoesKey',
  'pressOpen',
  'pressKey',
  'kitchenOpen',
  'kitchenKey',
  'ballroomOpen',
  'ballroomKey',
  'studyOpen',
  'studyKey',
  'deskOpen',
] as const;
export type GrantStep = (typeof GRANT_STEPS)[number];

export type ProgressAction =
  | { type: 'COMPLETE_ROOM'; room: RoomId }
  | { type: 'COLLECT_KEY'; key: KeyId }
  | { type: 'UNLOCK_GALLERY' }
  | { type: 'UNLOCK'; lock: LockId }
  | { type: 'RESET_PROGRESS' }
  /** Teacher override: put the house in the state it would be in after `upTo`. */
  | { type: 'GRANT'; upTo: GrantStep };

export function initialProgress(): Progress {
  return {
    completed: Object.fromEntries(ROOMS.map((r) => [r, false])) as Record<RoomId, boolean>,
    keys: Object.fromEntries(KEYS.map((k) => [k, false])) as Record<KeyId, boolean>,
    galleryUnlocked: false,
    unlocked: Object.fromEntries(LOCKS.map((l) => [l, false])) as Record<LockId, boolean>,
  };
}

const KEYS = Object.keys(KEY_NAMES) as KeyId[];
const LOCKS = (Object.keys(LOCK_KEY) as ('gallery' | LockId)[]).filter((l): l is LockId => l !== 'gallery');
const ROOM_FOR_KEY = Object.fromEntries(Object.entries(KEY_FOR_ROOM).map(([room, key]) => [key, room])) as Record<KeyId, RoomId>;

/** A key can be taken only once, and only after its room is complete. */
export function canCollect(p: Progress, key: KeyId | undefined): boolean {
  if (!key) return false;
  return p.completed[ROOM_FOR_KEY[key]] && !p.keys[key];
}

/** Is the key physically waiting in the room right now? */
export function keyWaiting(p: Progress, key: KeyId): boolean {
  return canCollect(p, key);
}

export type DoorState = 'locked' | 'unlockable' | 'open';
export type GalleryDoor = DoorState;

export function isUnlocked(p: Progress, lock: 'gallery' | LockId): boolean {
  return lock === 'gallery' ? p.galleryUnlocked : p.unlocked[lock];
}

/** Locked (no key), unlockable (holding its key), or open for good. */
export function doorState(p: Progress, lock: 'gallery' | LockId): DoorState {
  if (isUnlocked(p, lock)) return 'open';
  return p.keys[LOCK_KEY[lock]] ? 'unlockable' : 'locked';
}

export function galleryDoorState(p: Progress): GalleryDoor {
  return doorState(p, 'gallery');
}

/** Apply one grant step: "<room>Key" completes the room and gives its key; "<lock>Open" unlocks the lock. */
function applyStep(p: Progress, step: GrantStep) {
  if (step.endsWith('Key')) {
    const key = step as KeyId;
    p.completed[ROOM_FOR_KEY[key]] = true;
    p.keys[key] = true;
    return;
  }
  const lock = step.slice(0, -'Open'.length) as 'gallery' | LockId;
  if (lock === 'gallery') p.galleryUnlocked = true;
  else p.unlocked[lock] = true;
}

function grant(upTo: GrantStep): Progress {
  const next = initialProgress();
  for (const s of GRANT_STEPS) {
    applyStep(next, s);
    if (s === upTo) break;
  }
  return next;
}

export function progressReducer(p: Progress, a: ProgressAction): Progress {
  switch (a.type) {
    case 'COMPLETE_ROOM':
      if (p.completed[a.room]) return p;
      return { ...p, completed: { ...p.completed, [a.room]: true } };
    case 'COLLECT_KEY':
      if (!canCollect(p, a.key)) return p;
      return { ...p, keys: { ...p.keys, [a.key]: true } };
    case 'UNLOCK_GALLERY':
      if (!p.keys.mirrorKey || p.galleryUnlocked) return p;
      return { ...p, galleryUnlocked: true };
    case 'UNLOCK':
      if (!p.keys[LOCK_KEY[a.lock]] || p.unlocked[a.lock]) return p;
      return { ...p, unlocked: { ...p.unlocked, [a.lock]: true } };
    case 'RESET_PROGRESS':
      return initialProgress();
    case 'GRANT':
      return grant(a.upTo);
  }
}

/** Read saved progress defensively: anything malformed falls back to a fresh start. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return initialProgress();
  try {
    return restoreProgress(JSON.parse(raw));
  } catch {
    return initialProgress();
  }
}

/** Rebuild progress from parsed save data, keeping only what is valid. */
export function restoreProgress(v: unknown): Progress {
  if (!v || typeof v !== 'object') return initialProgress();
  const d = v as Partial<Progress>;
  const keys = Object.fromEntries(KEYS.map((k) => [k, !!d.keys?.[k]])) as Record<KeyId, boolean>;
  return {
    completed: Object.fromEntries(ROOMS.map((r) => [r, !!d.completed?.[r]])) as Record<RoomId, boolean>,
    keys,
    // An unlocked door without the key that opens it is impossible (or from an older version): ignore it.
    galleryUnlocked: !!d.galleryUnlocked && keys.mirrorKey,
    unlocked: Object.fromEntries(LOCKS.map((l) => [l, !!d.unlocked?.[l] && keys[LOCK_KEY[l]]])) as Record<LockId, boolean>,
  };
}
