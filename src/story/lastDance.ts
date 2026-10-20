/**
 * The Last Dance: where the student is in the mystery, worked out from their saved discoveries.
 * Pure (no 3D, no React), so it can be tested on its own.
 *
 * Everything the mystery remembers is a flag in the save's `found` record (the same record as the diary
 * on the landing), so saves stay readable by every version of the game, older ones included: an older
 * build simply ignores flags it does not know.
 */
import { JOURNAL, OBJECTIVES } from '../content/lastDance';
import type { Progress } from '../lesson/progression';
import { ART_IMAGES, DECOR_IMAGES, paintingUrl, type DecorId } from '../systems/paintingImages';
import type { ArtId } from '../systems/paintingScenes';

/** The flags, by name. */
export const LD = {
  /** The story moment after the first lesson (a slammed door, a glimpse of green). */
  hookEarly: 'ldHookEarly',
  /** The story moment in the middle of the game (the Lady's portrait is empty). */
  hookMid: 'ldHookMid',
  /** The chapter card has been shown (the music box upstairs, the knocks). */
  started: 'ldStarted',
  /** The clue page in the diary has been read. */
  journal: 'ldJournal',
  /** The lock on the first door is open. */
  door1: 'ldDoor1',
  /** The guest book has been read. */
  ledger: 'ldLedger',
  /** The Lady's key has been taken. */
  key: 'ldKey',
  /** Her own door is open. */
  door2: 'ldDoor2',
  /** The encounter at her mirror has happened. */
  scare: 'ldScare',
  /** Her last letter has been read: the chapter is complete. */
  end: 'ldEnd',
  /** The figure in the empty frame has been seen (once). */
  twist: 'ldTwist',
} as const;

export type Found = Record<string, boolean>;

export type Stage = 'locked' | 'intro' | 'diary' | 'paintings' | 'records' | 'key' | 'ladyDoor' | 'mirror' | 'message' | 'done';

/** The single next step of the mystery. 'locked' until the nine lessons and the letter are finished. */
export function ldStage(found: Found, p: Pick<Progress, 'completed'>): Stage {
  if (!p.completed.finale) return 'locked';
  if (!found[LD.started]) return 'intro';
  if (!found[LD.journal]) return 'diary';
  if (!found[LD.door1]) return 'paintings';
  if (!found[LD.ledger]) return 'records';
  if (!found[LD.key]) return 'key';
  if (!found[LD.door2]) return 'ladyDoor';
  if (!found[LD.scare]) return 'mirror';
  if (!found[LD.end]) return 'message';
  return 'done';
}

/** The corner-of-the-screen line for the mystery (null before it begins). */
export function ldObjective(found: Found, p: Pick<Progress, 'completed'>): string | null {
  const s = ldStage(found, p);
  return s === 'locked' ? null : OBJECTIVES[s];
}

/** Is the mystery under way (begun and not finished)? The house stays at night while it is. */
export const ldActive = (found: Found, p: Pick<Progress, 'completed'>) => {
  const s = ldStage(found, p);
  return s !== 'locked' && s !== 'intro' && s !== 'done';
};

// ------------------------------------------------------------------ the lock

/** A picture on the lock's wheels: one of the house's paintings. */
export interface LockPicture {
  id: string;
  title: string;
  url: string | undefined;
}

const art = (id: ArtId, title: string): LockPicture => ({ id, title, url: ART_IMAGES[id] && paintingUrl(ART_IMAGES[id]!.file) });
const decor = (id: DecorId, title: string): LockPicture => ({ id, title, url: paintingUrl(DECOR_IMAGES[id].file) });

/**
 * Every wheel carries the same eight pictures: the four answers and four others from the house that a student
 * may have looked at. Pictures that could fit a clue as well as its answer are left off, so every clue has
 * exactly one picture that fits (the moonlit lane and the lake house, which both have one lit window, are not
 * on the wheels, and neither is the becalmed ship with its reflection).
 */
export const LOCK_PICTURES: LockPicture[] = [
  art('houseBreath', 'The House That Held Its Breath'),
  art('coldFeet', 'Cold Feet'),
  decor('D04', 'Still Life with Keys and a Snuffed Candle'),
  decor('D16', 'The Dolls’ House at Night'),
  art('whisperingWalls', 'The Whispering Walls'),
  art('deafeningSilence', 'A Deafening Silence'),
  decor('D10', 'A Feast Fit for a Giant'),
  decor('D07', 'Still Life with a Pewter Jug'),
];

export const ANSWER = JOURNAL.clues.map((c) => c.answer);

/** How many wheels are right, and which. */
export function checkLock(picks: (string | null)[]) {
  const right = ANSWER.map((a, i) => picks[i] === a);
  return { right, count: right.filter(Boolean).length, open: right.every(Boolean) };
}

/** The wheels are saved as flags, one per wheel ("ldWheel2x5": wheel 2 shows picture 5). */
export const wheelFlag = (wheel: number, pic: number) => `ldWheel${wheel}x${pic}`;

/** The picture each wheel was left showing (null: not turned yet). */
export function savedWheels(found: Found): (string | null)[] {
  return ANSWER.map((_, w) => {
    const k = LOCK_PICTURES.findIndex((_, i) => found[wheelFlag(w, i)]);
    return k < 0 ? null : LOCK_PICTURES[k].id;
  });
}

/** Flags to clear and set to save one wheel's new picture. */
export function wheelChange(wheel: number, picId: string): { clear: string[]; set: string } {
  const k = LOCK_PICTURES.findIndex((p) => p.id === picId);
  return { clear: LOCK_PICTURES.map((_, i) => wheelFlag(wheel, i)).filter((_, i) => i !== k), set: wheelFlag(wheel, Math.max(0, k)) };
}

// ------------------------------------------------------------------ paintings looked at

/** The paintings the mystery notices being examined (the eight on the wheels). Flag: "ldSaw" + id. */
export const sawFlag = (id: string) => `ldSaw${id.charAt(0).toUpperCase()}${id.slice(1)}`;
export const WATCHED = new Set(LOCK_PICTURES.map((p) => p.id));
