/**
 * The Last Dance: what happens when the student does something in the mystery (opens the clue page, tries the
 * lock, reads the guest book, takes the key, looks into the mirror...). The 3D rooms call these; they play
 * the sounds, set the saved flags and drive the shared effects in `ldFx`.
 *
 * Every startling moment has a Gentle version (the menu's "Gentle" haunting): the same story, told more softly
 * (no slam, no sting, she fades in slowly). Nothing flashes, and the camera is never moved for the student
 * except to hold it steady on the mirror for a few seconds.
 */
import { CHAPTER, ENDING, HOOKS, LAST_LETTER, LEDGER, LOCK } from '../content/lastDance';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { showCaption } from '../systems/soundCues';
import { world } from '../systems/time';
import { BOUDOIR, HALL, RECORDS, UPSTAIRS } from '../world/layout';
import { doorSlam } from '../scene/parts/Door';
import { ldFx } from './fx';
import { checkLock, LD, ldStage, savedWheels, wheelChange } from './lastDance';

type V3 = [number, number, number];
const Y = UPSTAIRS.y;
export const RECORDS_DOOR_AT: V3 = [UPSTAIRS.records.doorX, Y + 1.2, HALL.zBack];
export const LADY_DOOR_POS: V3 = [UPSTAIRS.boudoir.doorX, Y + 1.2, HALL.zBack];

/** The Gentle setting (or the computer asks for reduced motion): tell the story more softly. */
export const gentle = () => game().eventLevel !== 'eerie' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
export function cancelStoryTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

const mark = (id: string) => useGame.getState().markFound(id);

// ------------------------------------------------------------------ the chapter begins

/** The chapter card, shown once the ending card of the nine lessons has been closed. */
export function openChapterCard() {
  const s = useGame.getState();
  s.setNote({ kicker: CHAPTER.kicker, title: CHAPTER.title, body: CHAPTER.story, card: 'chapter', onClose: beginChapter });
}

/** Upstairs, behind the locked doors: a music box, cut off; then three knocks. */
function beginChapter() {
  if (game().found[LD.started]) return;
  mark(LD.started);
  const box: V3 = [RECORDS.ledger.x, Y + 1.0, RECORDS.ledger.z];
  later(900, () => {
    audio.musicBox('dance', box, 0.9);
    showCaption('Upstairs, behind a locked door, a music box begins to play.');
  });
  later(4600, () => audio.musicBoxCut(box));
  later(6200, () => {
    audio.knockDoor(LADY_DOOR_POS, 3, gentle() ? 0.7 : 1.2);
    showCaption('Three knocks, from behind the locked doors at the top of the stairs.');
  });
  later(9000, () => useGame.getState().showNotice('Something is waiting upstairs.', 'Read the Lady’s diary on the upper landing.'));
}

// ------------------------------------------------------------------ the clue page and the lock

export function openJournal() {
  mark(LD.journal);
  useGame.getState().setNote({ kicker: '', title: '', body: [], card: 'journal' });
}

export function openLock() {
  useGame.getState().setNote({ kicker: '', title: LOCK.title, body: [], card: 'lock' });
}

/** Turn one wheel of the lock to a picture (saved straight away). */
export function setWheel(wheel: number, picId: string) {
  const { clear, set } = wheelChange(wheel, picId);
  const s = useGame.getState();
  for (const c of clear) if (s.found[c]) s.setFound(c, false);
  s.setFound(set, true);
  audio.click();
}

/** Wrong tries this session (the lock offers hints after two). */
export const lockTries = { n: 0 };

/** Try the lock with the wheels as they are. */
export function tryLock(): ReturnType<typeof checkLock> {
  const r = checkLock(savedWheels(game().found));
  if (!r.open) {
    lockTries.n++;
    audio.locked(RECORDS_DOOR_AT);
    return r;
  }
  audio.mechanism(RECORDS_DOOR_AT);
  const wait = audio.unlockDoor(RECORDS_DOOR_AT);
  later(700, () => {
    useGame.getState().setNote(null);
    showCaption(LOCK.open);
    audio.musicBox('two', [RECORDS.ledger.x, Y + 1, RECORDS.ledger.z], 0.5);
  });
  later(wait + 200, () => {
    mark(LD.door1);
    useGame.getState().setDoor('records', true);
    audio.doorOpen(RECORDS_DOOR_AT, true);
  });
  return r;
}

// ------------------------------------------------------------------ the guest book

export function openLedger() {
  const first = !game().found[LD.ledger];
  audio.page([RECORDS.ledger.x, Y + 1.1, RECORDS.ledger.z]);
  audio.book([RECORDS.ledger.x, Y + 1.1, RECORDS.ledger.z]);
  useGame.getState().setNote({ kicker: LEDGER.kicker, title: LEDGER.title, body: [], card: 'ledger', onClose: first ? ledgerRevelation : undefined });
  if (!first) return;
}

/** Closing the guest book the first time: a cold draught through the room, and the key falls. */
function ledgerRevelation() {
  mark(LD.ledger);
  const soft = gentle();
  const at: V3 = [RECORDS.ledger.x, Y + 1.2, RECORDS.ledger.z];
  ldFx.draughtAt = world.t;
  ldFx.candlesTarget = 0.3;
  audio.gust();
  audio.houseGroan();
  // The guests: a whisper from each side of the room, from the covered portraits and the coats.
  later(500, () => audio.whisperAt([RECORDS.covered.x, Y + 1.2, RECORDS.covered.z], soft ? 1.2 : 2));
  later(1300, () => audio.whisperAt([RECORDS.x1 - 0.4, Y + 1.5, RECORDS.hooks.z], soft ? 1.0 : 1.8));
  later(1900, () => audio.whisperAt([RECORDS.desk.x, Y + 1.4, RECORDS.desk.z], soft ? 0.9 : 1.6));
  later(800, () => showCaption('A cold draught. Every coat on the hooks sways, and the dust sheets stir. Whispering, all around you.'));
  later(2600, () => {
    ldFx.candlesTarget = 1;
    audio.keyDrop(at);
    showCaption(LEDGER.key);
  });
}

export function takeKey() {
  if (game().found[LD.key]) return;
  mark(LD.key);
  audio.keyPickup();
  useGame.getState().showNotice('The Lady’s key.', 'Small, cold, tied with a green ribbon. Her own door is the left-hand door on the landing.');
}

/** Her door, with her key. */
export function unlockLadyDoor() {
  const wait = audio.unlockDoor(LADY_DOOR_POS);
  later(wait, () => {
    mark(LD.door2);
    useGame.getState().setDoor('boudoir', true);
    audio.doorOpen(LADY_DOOR_POS, true);
  });
}

/** Stepping into her room for the first time. */
export function enterBoudoir() {
  later(1200, () => {
    audio.musicBox('two', [BOUDOIR.vanity.x + 0.35, Y + 1, BOUDOIR.vanity.z], 0.55);
    showCaption('Her room is exactly as she left it. On the vanity, the music box plays two notes by itself.');
  });
}

// ------------------------------------------------------------------ the mirror

const MIRROR_Z = UPSTAIRS.boudoir.zS + 0.075;
export const MIRROR_CENTRE: V3 = [BOUDOIR.vanity.x, Y + BOUDOIR.mirror.y, MIRROR_Z];
/** Where she stands (her feet) while she is in the glass: just behind the student's right shoulder. */
/** Where the camera is held while you look into the glass: close enough that the mirror fills most of the view. */
export const MIRROR_EYE: V3 = [BOUDOIR.vanity.x + 0.04, Y + 1.66, MIRROR_Z + 0.9];
export const LADY_BEHIND: V3 = [MIRROR_EYE[0] + 0.27, Y, MIRROR_EYE[2] + 0.4];

/**
 * The encounter at the mirror. The camera is held on the glass while the music box plays and stops, three
 * knocks come at the door behind, the door slams, and she appears in the mirror behind the student. Then
 * the student has their view back: when they turn round, nobody is there.
 */
export function lookInMirror() {
  const s = useGame.getState();
  if (ldFx.scareRunning) return;
  // After the encounter, the mirror just shows its words again.
  if (s.found[LD.scare]) {
    ldFx.mirror.mistTarget = 0.55;
    ldFx.mirror.text = 'THEY NEVER LEFT';
    showCaption('In the mist on the glass: THEY NEVER LEFT.');
    return;
  }
  const soft = gentle();
  ldFx.scareRunning = true;
  afterDone = false;
  ldFx.turned = false;
  cancelStoryTimers();
  const box: V3 = [BOUDOIR.vanity.x + 0.38, Y + 0.95, BOUDOIR.vanity.z + 0.05];
  const door: V3 = LADY_DOOR_POS;
  useGame.setState({ shotPose: { position: MIRROR_EYE, target: [MIRROR_CENTRE[0], MIRROR_EYE[1] - 0.06, MIRROR_CENTRE[2]] }, hover: null });
  ldFx.mirror.brightTarget = 0.15;
  // 1. The music box begins.
  later(600, () => {
    audio.musicBox('dance', box, 0.85);
    showCaption('The music box on the vanity begins to play.');
  });
  later(3900, () => audio.musicBox('dance', box, 0.85));
  // 2. It stops dead. The house goes quiet.
  later(6500, () => {
    audio.musicBoxCut(box);
    audio.hush(true);
    ldFx.candlesTarget = 0.55;
    showCaption('The music stops.');
  });
  // 3. Three sharp knocks on the door behind you.
  later(8900, () => {
    audio.knockDoor(door, 3, soft ? 0.8 : 1.6);
    showCaption('Three knocks, on the door behind you.');
  });
  // 4. The door slams shut (Gentle: it swings shut).
  later(10600, () => {
    if (!soft) doorSlam.set('boudoir-door', world.t + 1.5);
    useGame.getState().setDoor('boudoir', false);
    if (soft) audio.doorClose(door);
    else audio.slam(door);
    ldFx.candlesTarget = 0.25;
    showCaption(soft ? 'The door swings shut behind you.' : 'The door slams shut behind you.');
  });
  // 5. Silence. Then she is in the mirror, behind you.
  later(12500, () => {
    mark(LD.scare);
    ldFx.lady.start = world.t;
    ldFx.lady.dur = soft ? 4.2 : 3.6;
    ldFx.lady.opacity = soft ? 0.7 : 0.95;
    ldFx.lady.lean = soft ? 0 : 1;
    if (soft) audio.ladySigh(LADY_BEHIND, 0.8);
    else audio.sting();
    audio.drone(true, soft ? 0.5 : 1);
    showCaption('In the mirror, someone is standing behind you.');
  });
  // 6. Your view is yours again. Turn round.
  later(soft ? 14600 : 13700, () => {
    useGame.setState({ shotPose: null });
    ldFx.scareRunning = false;
  });
  // 7. When she has gone: the candles come back, the door creaks open again, and nobody is there.
  later(soft ? 17200 : 16400, afterMirror);
}

let afterDone = false;
function afterMirror() {
  if (afterDone) return;
  afterDone = true;
  ldFx.lady.start = -1e9;
  audio.drone(false);
  audio.hush(false);
  ldFx.candlesTarget = 1;
  useGame.getState().setDoor('boudoir', true);
  audio.doorOpen(LADY_DOOR_POS, false);
  later(900, () => audio.ladyLaugh([UPSTAIRS.boudoir.doorX + 2, Y + 1.5, HALL.zBack + 1.4], 1.1));
  ldFx.mirror.mistTarget = 0.55;
  ldFx.mirror.text = 'THEY NEVER LEFT';
  showCaption('Nobody is there. The door creaks open again. On the mirror, words appear in the mist.');
  later(2500, () => useGame.getState().showNotice('THEY NEVER LEFT', 'Something has been left on her desk.'));
}

/** Tests: is the mirror sequence over? */
export const mirrorDone = () => afterDone;

/** Turning away from the mirror while she is in it: she goes at once. */
export function turnedFromMirror() {
  if (ldFx.turned) return;
  ldFx.turned = true;
  if (world.t < ldFx.lady.start + ldFx.lady.dur) ldFx.lady.dur = Math.max(0.5, world.t - ldFx.lady.start + 0.25);
}

// ------------------------------------------------------------------ her letter, and the end

export function openLetter() {
  audio.page([BOUDOIR.desk.x, Y + 0.9, BOUDOIR.desk.z]);
  const first = !game().found[LD.end];
  useGame.getState().setNote({
    kicker: LAST_LETTER.kicker,
    title: LAST_LETTER.title,
    body: LAST_LETTER.body,
    ask: LAST_LETTER.ask,
    card: 'letter',
    onClose: first
      ? () => {
          mark(LD.end);
          later(900, () => useGame.getState().setNote({ kicker: ENDING.kicker, title: ENDING.title, body: ENDING.lines, card: 'end' }));
        }
      : undefined,
  });
}

// ------------------------------------------------------------------ the story moments during the lessons

/** A door slams somewhere you can see (the early story moment). */
export function slamDoor(id: string, doorKey: 'mirror', at: V3) {
  const soft = gentle();
  if (!soft) doorSlam.set(id, world.t + 1.5);
  useGame.getState().setDoor(doorKey, false);
  if (soft) audio.doorClose(at);
  else audio.slam(at);
}

export const hookNotice = (k: keyof typeof HOOKS) => useGame.getState().showNotice(HOOKS[k].text, HOOKS[k].sub);

/** The chapter's step, for the 3D rooms. */
export const stage = () => ldStage(game().found, game().progress);
