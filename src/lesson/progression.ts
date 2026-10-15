/**
 * Mansion progression: rooms are completed, keys are collected, doors are unlocked.
 * Pure and framework-free so the rules are easy to test.
 *
 * Hall of Mirrors (complete) → Mirror Key → Portrait Gallery door → Gallery (complete) → Gallery Key
 */
import type { RoomId } from '../content/types';

export type KeyId = 'mirrorKey' | 'galleryKey';

export const KEY_FOR_ROOM: Record<RoomId, KeyId> = { mirrors: 'mirrorKey', gallery: 'galleryKey' };

export const KEY_NAMES: Record<KeyId, string> = {
  mirrorKey: 'the Mirror Key',
  galleryKey: 'the Gallery Key',
};

export interface Progress {
  completed: Record<RoomId, boolean>;
  keys: Record<KeyId, boolean>;
  galleryUnlocked: boolean;
}

export type ProgressAction =
  | { type: 'COMPLETE_ROOM'; room: RoomId }
  | { type: 'COLLECT_KEY'; key: KeyId }
  | { type: 'UNLOCK_GALLERY' }
  | { type: 'RESET_PROGRESS' }
  /** Teacher override: put the house in the state it would be in after `upTo`. */
  | { type: 'GRANT'; upTo: 'mirrorKey' | 'galleryOpen' | 'galleryKey' };

export function initialProgress(): Progress {
  return {
    completed: { mirrors: false, gallery: false },
    keys: { mirrorKey: false, galleryKey: false },
    galleryUnlocked: false,
  };
}

const ROOM_FOR_KEY: Record<KeyId, RoomId> = { mirrorKey: 'mirrors', galleryKey: 'gallery' };

/** A key can be taken only once, and only after its room is complete. */
export function canCollect(p: Progress, key: KeyId): boolean {
  return p.completed[ROOM_FOR_KEY[key]] && !p.keys[key];
}

/** Is the key physically waiting in the room right now? */
export function keyWaiting(p: Progress, key: KeyId): boolean {
  return canCollect(p, key);
}

export type GalleryDoor = 'locked' | 'unlockable' | 'open';
export function galleryDoorState(p: Progress): GalleryDoor {
  if (p.galleryUnlocked) return 'open';
  return p.keys.mirrorKey ? 'unlockable' : 'locked';
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
    case 'RESET_PROGRESS':
      return initialProgress();
    case 'GRANT': {
      const next = initialProgress();
      next.completed.mirrors = true;
      next.keys.mirrorKey = true;
      if (a.upTo === 'mirrorKey') return next;
      next.galleryUnlocked = true;
      if (a.upTo === 'galleryOpen') return next;
      next.completed.gallery = true;
      next.keys.galleryKey = true;
      return next;
    }
  }
}

/** Read saved progress defensively: anything malformed falls back to a fresh start. */
export function parseProgress(raw: string | null): Progress {
  const base = initialProgress();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Progress>;
    return {
      completed: { mirrors: !!d.completed?.mirrors, gallery: !!d.completed?.gallery },
      keys: { mirrorKey: !!d.keys?.mirrorKey, galleryKey: !!d.keys?.galleryKey },
      galleryUnlocked: !!d.galleryUnlocked && !!d.keys?.mirrorKey,
    };
  } catch {
    return base;
  }
}
