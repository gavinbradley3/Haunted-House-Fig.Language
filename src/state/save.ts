/**
 * Each student's saved game, kept in the browser on their own Chromebook profile.
 *
 * One versioned record ("hosl.save") holds everything needed to carry on: completed rooms, keys
 * and unlocked doors, where every lesson is up to (answers, sentences, self-check ticks), the
 * sentence that passed each room's writing check, optional discoveries, and where the student
 * was standing. It is written as things happen, not on a timer, so closing the tab, restarting
 * the Chromebook or signing out loses at most the last fraction of a second.
 *
 * Safety rules:
 *  - Reading never throws. Damaged data is set aside (never overwritten) and the backup is used.
 *  - A save written by a newer version of the game is read as far as possible and never overwritten.
 *  - If the game is open in two tabs, only the one that saved last keeps saving; the other is told.
 *  - Saves from before this format (hosl.progress / hosl.lessons) are read once and carried over,
 *    and those keys keep being written too, so an older build of the game still finds the progress.
 *
 * No accounts, servers or cloud storage: the save belongs to this browser profile at this web address.
 */
import { ROOMS, type LessonContent, type RoomId } from '../content/types';
import { restoreLesson, type LessonState } from '../lesson/lessonMachine';
import { restoreProgress, type Progress } from '../lesson/progression';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'hosl.save';
export const BACKUP_KEY = 'hosl.save.backup';
export const REV_KEY = 'hosl.save.rev';
export const DAMAGED_KEY = 'hosl.save.damaged';
export const BEFORE_RESET_KEY = 'hosl.save.beforeReset';
export const LEGACY_KEYS = { progress: 'hosl.progress', lessons: 'hosl.lessons' } as const;

/** Where the student was standing (the zone is worked out again from the position on load). */
export interface Place {
  x: number;
  z: number;
  yaw: number;
  upstairs: boolean;
  /** The lesson that was open, so it can be reopened. */
  lesson: RoomId | null;
}

export interface GameSave {
  progress: Progress;
  lessons: Record<RoomId, LessonState>;
  place: Place | null;
  /** The sentence that passed each room's writing check, kept even if the lesson is replayed. */
  writing: Partial<Record<RoomId, string>>;
  /** Optional discoveries, such as the things on the upstairs landing. */
  found: Record<string, boolean>;
}

export type LoadStatus =
  /** Nothing saved yet. */
  | 'fresh'
  | 'loaded'
  /** Carried over from the older save format. */
  | 'migrated'
  /** The save was damaged; the backup (or older format) was used and the damaged copy set aside. */
  | 'recovered'
  /** Saved by a newer version of the game: read as far as possible, and left untouched. */
  | 'newer'
  /** The browser will not store anything here (a guest or incognito window, or storage switched off). */
  | 'unavailable';

export interface Loaded {
  status: LoadStatus;
  save: GameSave;
  savedAt: number | null;
}

export type WriteResult = 'ok' | 'conflict' | 'failed' | 'off';

interface Envelope extends GameSave {
  v: number;
  rev: number;
  savedAt: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function restorePlace(v: unknown): Place | null {
  if (!isObj(v) || typeof v.x !== 'number' || typeof v.z !== 'number' || !Number.isFinite(v.x) || !Number.isFinite(v.z)) return null;
  return {
    x: v.x,
    z: v.z,
    yaw: finite(v.yaw),
    upstairs: v.upstairs === true,
    lesson: ROOMS.includes(v.lesson as RoomId) ? (v.lesson as RoomId) : null,
  };
}

function restoreWriting(v: unknown): Partial<Record<RoomId, string>> {
  const out: Partial<Record<RoomId, string>> = {};
  if (!isObj(v)) return out;
  for (const r of ROOMS) if (typeof v[r] === 'string' && v[r]) out[r] = (v[r] as string).slice(0, 220);
  return out;
}

function restoreFound(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) if (x === true && /^[a-z][a-zA-Z0-9]{0,40}$/.test(k)) out[k] = true;
  return out;
}

export function freshSave(content: Record<RoomId, LessonContent>): GameSave {
  return {
    progress: restoreProgress(null),
    lessons: Object.fromEntries(ROOMS.map((r) => [r, restoreLesson(null, content[r])])) as Record<RoomId, LessonState>,
    place: null,
    writing: {},
    found: {},
  };
}

/** Rebuild a save from parsed data, keeping every part that is valid. */
export function restoreSave(d: Record<string, unknown>, content: Record<RoomId, LessonContent>): GameSave {
  const lessons = isObj(d.lessons) ? d.lessons : {};
  return {
    progress: restoreProgress(d.progress),
    lessons: Object.fromEntries(ROOMS.map((r) => [r, restoreLesson(lessons[r], content[r])])) as Record<RoomId, LessonState>,
    place: restorePlace(d.place),
    writing: restoreWriting(d.writing),
    found: restoreFound(d.found),
  };
}

/** Has this save any progress worth continuing (as opposed to a brand-new game)? */
export function hasProgress(s: GameSave): boolean {
  if (s.place) return true;
  if (Object.values(s.progress.completed).some(Boolean) || Object.values(s.progress.keys).some(Boolean)) return true;
  return ROOMS.some((r) => {
    const l = s.lessons[r];
    return l.stage !== 'discover' || l.discover.revealedA || l.discover.revealedB;
  });
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Reads and writes one student's save in a Storage (localStorage in the game, a stand-in in tests).
 * Keeps the revision it last read or wrote, so a write from another tab is noticed, not overwritten.
 */
export class Saver {
  private rev = 0;
  /** False when storage is unavailable, the save is from a newer version, or another tab has taken over. */
  private writable = true;
  conflict = false;

  constructor(
    private readonly ls: Store | null,
    private readonly content: Record<RoomId, LessonContent>,
  ) {}

  private get(key: string): string | null {
    try {
      return this.ls?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private parse(raw: string | null): { v: number; rev: number; savedAt: number; save: GameSave } | null {
    if (!raw) return null;
    try {
      const d = JSON.parse(raw) as unknown;
      if (!isObj(d) || typeof d.v !== 'number' || !isObj(d.progress)) return null;
      return { save: restoreSave(d, this.content), v: d.v, rev: finite(d.rev), savedAt: finite(d.savedAt) };
    } catch {
      return null;
    }
  }

  private legacy(): GameSave | null {
    const p = this.get(LEGACY_KEYS.progress);
    const l = this.get(LEGACY_KEYS.lessons);
    if (!p && !l) return null;
    let progress: unknown = null;
    let lessons: unknown = null;
    try {
      progress = p ? JSON.parse(p) : null;
    } catch {
      /* damaged: fresh progress */
    }
    try {
      lessons = l ? JSON.parse(l) : null;
    } catch {
      /* damaged: fresh lessons */
    }
    return restoreSave({ progress, lessons }, this.content);
  }

  load(): Loaded {
    const fresh = freshSave(this.content);
    if (!this.ls || !this.probe()) {
      this.writable = false;
      return { status: 'unavailable', save: fresh, savedAt: null };
    }
    const raw = this.get(SAVE_KEY);
    const main = this.parse(raw);
    if (main) {
      this.rev = Math.max(main.rev, finite(Number(this.get(REV_KEY))));
      if (main.v > SAVE_VERSION) {
        // Never overwrite a save this version does not fully understand.
        this.writable = false;
        return { status: 'newer', save: main.save, savedAt: main.savedAt };
      }
      return { status: 'loaded', save: main.save, savedAt: main.savedAt };
    }
    if (raw) {
      // Damaged: put it aside where it will not be overwritten, then fall back.
      this.set(DAMAGED_KEY, raw);
      this.rev = finite(Number(this.get(REV_KEY)));
      const backup = this.parse(this.get(BACKUP_KEY));
      if (backup) return { status: 'recovered', save: backup.save, savedAt: backup.savedAt };
      const old = this.legacy();
      return { status: 'recovered', save: old ?? fresh, savedAt: null };
    }
    const old = this.legacy();
    if (old) return { status: 'migrated', save: old, savedAt: null };
    return { status: 'fresh', save: fresh, savedAt: null };
  }

  private probe(): boolean {
    try {
      this.ls!.setItem('hosl.probe', '1');
      this.ls!.removeItem('hosl.probe');
      return true;
    } catch {
      return false;
    }
  }

  private set(key: string, value: string): boolean {
    try {
      this.ls?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  /** Did another tab save after this one last read or wrote? */
  othersSaved(): boolean {
    const stored = finite(Number(this.get(REV_KEY)));
    return stored > this.rev;
  }

  /**
   * Save now. `backup` also refreshes the backup copy (done at milestones: a room completed,
   * a key taken, a door unlocked), so a damaged save never costs more than the last few minutes.
   */
  write(save: GameSave, backup = false): WriteResult {
    if (!this.writable || !this.ls) return 'off';
    if (this.othersSaved()) {
      this.conflict = true;
      this.writable = false;
      return 'conflict';
    }
    const env: Envelope = { v: SAVE_VERSION, rev: this.rev + 1, savedAt: Date.now(), ...save };
    const json = JSON.stringify(env);
    if (!this.set(SAVE_KEY, json)) return 'failed';
    this.rev = env.rev;
    this.set(REV_KEY, String(env.rev));
    if (backup) this.set(BACKUP_KEY, json);
    // Older builds of the game read these two keys.
    this.set(LEGACY_KEYS.progress, JSON.stringify(save.progress));
    this.set(LEGACY_KEYS.lessons, JSON.stringify(save.lessons));
    return 'ok';
  }

  /**
   * Teacher reset: the next write replaces the save with a fresh game. A copy of the old save is
   * kept under its own key (never touched by normal saving), so a reset by mistake can be undone.
   */
  clear(): void {
    const raw = this.get(SAVE_KEY);
    if (raw) this.set(BEFORE_RESET_KEY, raw);
  }

  /** The game as it was before the last teacher reset, or null if there was no reset. */
  undoReset(): GameSave | null {
    return this.parse(this.get(BEFORE_RESET_KEY))?.save ?? null;
  }

  get canWrite() {
    return this.writable;
  }
}
