/**
 * "What do I do next?" for a student playing alone: one short line for the corner of the screen,
 * worked out from their saved progress. It never gives answers, only where to go and what to use.
 */
import { DEVICE_ROOMS, type RoomId } from '../content/types';
import type { LessonState } from './lessonMachine';
import { KEY_FOR_ROOM, KEY_NAMES, LOCK_KEY, isUnlocked, type KeyId, type LockId, type Progress } from './progression';

interface RoomGuide {
  /** The lock on the way into the room (none for the Hall of Mirrors). */
  lock: 'gallery' | LockId | null;
  /** Where the room's door is, for "Unlock …" and "Go to …". */
  door: string;
  /** How to begin the lesson once inside. */
  start: string;
  /** Where the room's key appears when the lesson is complete. */
  key: string;
}

export const ROOM_GUIDE: Record<RoomId, RoomGuide> = {
  mirrors: {
    lock: null,
    door: 'the Hall of Mirrors, through the door at the end of the long corridor',
    start: 'Look into the large mirror above the marble console',
    key: 'from the drawer under the speaking mirror',
  },
  gallery: {
    lock: 'gallery',
    door: 'the Portrait Gallery door (the long corridor, on the left)',
    start: 'Look closer at the caretaker’s portrait at the far end',
    key: 'from the safe behind the empty frame',
  },
  dining: {
    lock: 'dining',
    door: 'the Giant’s Dining Room door (the long corridor, on the right)',
    start: 'Use the giant’s place: the silver cloche at the end of the table',
    key: 'from the giant’s plate',
  },
  nursery: {
    lock: 'nursery',
    door: 'the hidden door in the Hall of Mirrors (left wall, between the first two mirrors)',
    start: 'Use the music box',
    key: 'from inside the music box',
  },
  echoes: {
    lock: 'echoes',
    door: 'the Chamber of Echoes door (the Nursery’s far wall)',
    start: 'Use the piano',
    key: 'from the piano lid',
  },
  press: {
    lock: 'press',
    door: 'the Whispering Press door (the music room’s side wall)',
    start: 'Use the press',
    key: 'from the bed of the press',
  },
  kitchen: {
    lock: 'kitchen',
    door: 'the Crooked Kitchen door (entrance hall, right side, past the fireplace)',
    start: 'Look at the kitchen table',
    key: 'from beside the cake',
  },
  ballroom: {
    lock: 'ballroom',
    door: 'the Ballroom door (the far wall of the Giant’s Dining Room)',
    start: 'Look at the dancers',
    key: 'from the glass case',
  },
  study: {
    lock: 'study',
    door: 'the Scholar’s Study door (entrance hall, left side, under the landing)',
    start: 'Sit at the scholar’s desk',
    key: 'from the desk',
  },
  finale: {
    lock: 'desk',
    door: 'the Lady’s writing box on the centre table in the entrance hall',
    start: 'Read the letter in the writing box',
    key: '',
  },
};

const ROOM_NAME: Record<RoomId, string> = {
  mirrors: 'the Hall of Mirrors',
  gallery: 'the Portrait Gallery',
  dining: 'the Giant’s Dining Room',
  nursery: 'the Nursery',
  echoes: 'the Chamber of Echoes',
  press: 'the Whispering Press',
  kitchen: 'the Crooked Kitchen',
  ballroom: 'the Ballroom',
  study: 'the Scholar’s Study',
  finale: 'the Lady’s letter',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const keyName = (k: KeyId) => KEY_NAMES[k].replace(/^the /, 'the ');

export interface NextStep {
  /** The room this step belongs to, if any. */
  room: RoomId | null;
  text: string;
}

/** Has the student started this lesson (and not finished it)? */
const started = (l: LessonState) => !l.completed && (l.stage !== 'discover' || l.discover.revealedA || l.discover.revealedB);

/** The single next thing to do, from saved progress. */
export function nextStep(p: Progress, lessons: Record<RoomId, LessonState>): NextStep {
  // A key is waiting to be taken: always the most urgent step.
  for (const r of DEVICE_ROOMS) {
    const k = KEY_FOR_ROOM[r]!;
    if (p.completed[r] && !p.keys[k]) return { room: r, text: `Take ${keyName(k)} ${ROOM_GUIDE[r].key}.` };
  }
  for (const r of [...DEVICE_ROOMS, 'finale' as const]) {
    if (p.completed[r]) continue;
    const g = ROOM_GUIDE[r];
    if (g.lock && !isUnlocked(p, g.lock)) {
      const k = LOCK_KEY[g.lock];
      return { room: r, text: `Unlock ${g.door} with ${keyName(k)}.` };
    }
    if (started(lessons[r])) return { room: r, text: `Carry on in ${ROOM_NAME[r]}: ${g.start.charAt(0).toLowerCase() + g.start.slice(1)}.` };
    if (r === 'finale') return { room: r, text: `${g.start} (on the centre table in the entrance hall).` };
    return { room: r, text: `Go to ${g.door}. ${cap(g.start)}.` };
  }
  return { room: null, text: 'You have read the whole house. Explore as long as you like.' };
}
