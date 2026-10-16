/**
 * Directors turn lesson state into what happens in the room: camera shots,
 * room effects, light, sound and completion sequences. They render nothing.
 * This file holds the shared pieces and the Hall of Mirrors director.
 */
import { useEffect, useRef } from 'react';
import { SIMILE } from '../content/simile';
import type { RoomId } from '../content/types';
import { activeLesson, game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { POSES, type Pose, type ShotName, type Zone } from '../world/layout';
import type { DoorId } from '../state/store';
import { lightMood } from '../scene/parts/Lights';
import { fx, pulseRipple, resetFx } from './fx';
import type { LessonState } from './lessonMachine';
import { jumpTo } from './navigation';

export function shotFor(room: RoomId, l: LessonState): ShotName {
  const later = LATER_SHOTS[room];
  if (later) {
    if (l.stage === 'discover') return room === 'kitchen' ? 'kitchenBeans' : room === 'echoes' ? 'echoesPipe' : later.wide;
    if (l.stage === 'prove') return later.board;
    if (l.stage === 'complete') return later.key;
    return later.focus(l);
  }
  if (room === 'dining') {
    switch (l.stage) {
      case 'discover':
      case 'playA':
        return 'diningTable';
      case 'learn':
        return l.learnStep === 2 ? 'diningGiant' : 'diningTable';
      case 'prove':
        return 'diningMenu';
      default:
        return 'diningGiant';
    }
  }
  if (room === 'nursery') {
    switch (l.stage) {
      case 'discover':
        return 'nurseryHorse';
      case 'learn':
        return l.learnStep === 2 ? 'nurseryMusicBox' : 'nurseryToys';
      case 'playA': {
        // The camera turns to whichever toy the class is waking.
        const it = l.playA.activeItem;
        return it === 'horse' ? 'nurseryHorse' : it === 'musicBox' ? 'nurseryMusicBox' : 'nurseryToys';
      }
      case 'prove':
        return 'nurserySlate';
      default:
        return 'nurseryMusicBox';
    }
  }
  if (room === 'finale') {
    switch (l.stage) {
      case 'discover':
        return 'hallLetter';
      case 'playA':
      case 'complete':
        return 'hallDoors';
      default:
        return 'hallLady';
    }
  }
  if (room === 'gallery') {
    switch (l.stage) {
      case 'discover':
        return 'caretaker';
      case 'learn':
        return l.learnStep === 2 ? 'sitter' : 'caretaker';
      case 'playA':
        return 'oldMan';
      case 'playB':
        return 'sitter';
      default:
        return 'emptyFrame';
    }
  }
  switch (l.stage) {
    case 'discover':
      return 'curtains';
    case 'learn': {
      const id = SIMILE.learn.steps[l.learnStep]?.id;
      return id === 'annotate' ? 'curtains' : 'speaking';
    }
    case 'playA':
      return 'tunnel';
    case 'playB':
      return 'curtains';
    case 'prove':
      return 'speaking';
    case 'complete':
      return 'drawer';
  }
}

/** Shots whose subject is on the left of frame put the lesson panel on the right. */
export const panelSide = (shot: ShotName | null) => (shot === 'tunnel' || shot === 'jib' ? 'right' : 'left');

/** Where each lesson happens: the zone, where to stand on arrival, the door to open, and where its key waits. */
export const ROOM_PLACES: Record<RoomId, { zone: Zone; entry: Pose; door: DoorId | null; keyPose: Pose | null; hint: string }> = {
  mirrors: { zone: 'mirrors', entry: POSES.mirrorEntry, door: 'mirror', keyPose: POSES.mirrorKey, hint: 'Look into the mirror' },
  gallery: { zone: 'gallery', entry: POSES.galleryEntry, door: 'gallery', keyPose: POSES.galleryKey, hint: 'Look closer at the caretaker’s portrait' },
  dining: { zone: 'dining', entry: POSES.diningEntry, door: 'dining', keyPose: POSES.diningKey, hint: 'Look at the giant’s place' },
  nursery: { zone: 'nursery', entry: POSES.nurseryEntry, door: 'jib', keyPose: POSES.nurseryKey, hint: 'Use the music box' },
  echoes: { zone: 'echoes', entry: POSES.echoesEntry, door: 'echoes', keyPose: POSES.echoesKey, hint: 'Use the piano' },
  press: { zone: 'press', entry: POSES.pressEntry, door: 'press', keyPose: POSES.pressKey, hint: 'Use the press' },
  kitchen: { zone: 'kitchen', entry: POSES.kitchenEntry, door: 'kitchen', keyPose: POSES.kitchenKey, hint: 'Look at the kitchen table' },
  ballroom: { zone: 'ballroom', entry: POSES.ballroomEntry, door: 'ballroom', keyPose: POSES.ballroomKey, hint: 'Look at the dancers' },
  study: { zone: 'study', entry: POSES.studyEntry, door: 'study', keyPose: POSES.studyKey, hint: 'Sit at the scholar’s desk' },
  finale: { zone: 'hall', entry: POSES.finaleEntry, door: 'desk', keyPose: null, hint: 'Read the letter in the writing box' },
};

/** Camera shots for the five later rooms: wide for Discover, the object being studied, the board for Prove. */
const LATER_SHOTS: Partial<Record<RoomId, { wide: ShotName; focus: (l: LessonState) => ShotName; board: ShotName; key: ShotName }>> = {
  echoes: {
    wide: 'echoesWide',
    board: 'echoesBoard',
    key: 'echoesPiano',
    // Each listening item turns the camera to the object making the sound.
    focus: (l) => {
      const it = l.stage === 'playA' ? l.playA.activeItem : null;
      if (it === 'drip') return 'echoesPipe';
      if (it === 'hiss') return 'echoesGram';
      if (it === 'tick' || it === 'knock') return 'echoesPiano';
      return 'echoesWide';
    },
  },
  press: { wide: 'pressWide', board: 'pressBoard', key: 'pressWide', focus: (l) => (l.stage === 'playB' ? 'pressBoard' : 'pressCases') },
  kitchen: { wide: 'kitchenWide', board: 'kitchenBoard', key: 'kitchenWide', focus: (l) => (l.stage === 'learn' && l.learnStep === 0 ? 'kitchenBeans' : 'kitchenWide') },
  ballroom: { wide: 'ballroomWide', board: 'ballroomBoard', key: 'ballroomCase', focus: (l) => (l.stage === 'playB' ? 'ballroomDancers' : 'ballroomWide') },
  study: { wide: 'studyWide', board: 'studyBoard', key: 'studyDesk', focus: () => 'studyDesk' },
};

/** Begin (or resume) a room's lesson. If the camera is elsewhere, fade to that room first. */
export function openLesson(room: RoomId = game().room) {
  const enter = () => {
    const g = useGame.getState();
    if (document.pointerLockElement) document.exitPointerLock();
    g.setInspecting(null);
    g.setRoom(room);
    if (room === 'mirrors') g.markMirrorsVisited();
    g.setLessonActive(true);
    g.setHover(null);
    g.setShot(shotFor(room, g.lessons[room]));
    audio.shimmer(0.25);
    if (room === 'mirrors') pulseRipple(fx.speaking, 0.8);
  };
  const place = ROOM_PLACES[room];
  if (game().zone !== place.zone) {
    jumpTo(place.entry, () => {
      if (place.door) useGame.getState().setDoor(place.door, true);
      enter();
    });
  } else {
    // Already in the room: make sure its door is open so nobody is shut in afterwards.
    if (place.door && room === 'finale') useGame.getState().setDoor(place.door, true);
    enter();
  }
}

/** Teacher shortcut: fade into a room (opening its door so nobody is shut in) without starting the lesson. */
export function jumpToRoom(room: RoomId) {
  const place = ROOM_PLACES[room];
  closeLesson();
  useGame.getState().setCompletionShot(null);
  jumpTo(place.entry, () => {
    if (place.door && room !== 'finale') useGame.getState().setDoor(place.door, true);
  });
}

export function closeLesson() {
  const g = useGame.getState();
  g.setLessonActive(false);
  g.setShot(null);
}

/** Leave the lesson view and stand in front of this room's key, ready to take it. */
export function goToKey(room: RoomId) {
  const pose = ROOM_PLACES[room].keyPose;
  if (!pose) return;
  closeLesson();
  jumpTo(pose);
}

/** Camera follows the active lesson while the lesson view is open. */
export function LessonCamera() {
  const lessons = useGame((s) => s.lessons);
  const room = useGame((s) => s.room);
  const lessonActive = useGame((s) => s.lessonActive);
  useEffect(() => {
    if (!lessonActive) return;
    useGame.getState().setShot(shotFor(room, lessons[room]));
  }, [lessons, room, lessonActive]);
  return null;
}

const timers: number[] = [];
function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}
function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

function applyEffects(l: LessonState, prev: LessonState | null) {
  const sp = fx.speaking;
  const tn = fx.tunnel;
  let mood = 1;
  let hush = false;
  audio.mantelVoice = 'tick';
  fx.clockLightTarget = 0;
  sp.mistTarget = 0;
  if (l.stage !== 'playA') tn.tunnelTarget = 0;
  if (l.stage !== 'complete') fx.drawerTarget = 0;

  switch (l.stage) {
    case 'discover': {
      const d = l.discover;
      sp.text = d.active === 'A' ? SIMILE.discover.descriptionA : d.active === 'B' ? SIMILE.discover.descriptionB : 'Look closer.';
      sp.brightTarget = d.active ? 0.35 : 0.18;
      if (d.active === 'B') mood = 0.72;
      if (prev && prev.discover.active !== d.active) pulseRipple(sp, 0.9);
      if (prev && d.active === 'B' && prev.discover.active !== 'B') audio.creak([0, 3, -30.6]);
      break;
    }
    case 'learn': {
      const id = SIMILE.learn.steps[l.learnStep].id;
      const text: Record<string, string> = {
        term: 'Simile',
        why: 'like  ·  as',
        annotate: SIMILE.discover.descriptionB,
        example2: 'The room was as quiet as an empty theatre.',
        nonExample: 'I like mysterious stories.',
      };
      sp.text = text[id] ?? '';
      sp.brightTarget = id === 'term' ? 0.65 : 0.35;
      sp.mistTarget = id === 'nonExample' ? 0.45 : 0;
      if (id === 'annotate') mood = 0.72;
      if (id === 'example2') hush = true;
      if (prev && (prev.stage !== 'learn' || prev.learnStep !== l.learnStep)) {
        pulseRipple(sp, 0.7);
        if (id === 'term') audio.shimmer(0.45);
      }
      break;
    }
    case 'playA': {
      sp.text = '';
      sp.brightTarget = 0.1;
      const c = l.playA;
      if (c.solved) {
        tn.tunnelTarget = 1;
        tn.brightTarget = 0.25;
        if (prev && !prev.playA.solved) {
          audio.shimmer(0.55);
          pulseRipple(tn, 1);
        }
      } else {
        tn.tunnelTarget = 0;
        tn.brightTarget = c.selected ? 0.18 : 0.05;
        if (prev && c.checked && !prev.playA.checked && !c.solved) {
          tn.mistTarget = 0.85;
          audio.mist();
          later(1800, () => (fx.tunnel.mistTarget = 0));
        }
      }
      break;
    }
    case 'playB': {
      const c = l.playB;
      const opt = SIMILE.playB.options.find((o) => o.id === c.selected);
      sp.text = opt ? opt.text : SIMILE.playB.baseSentence ?? '';
      sp.brightTarget = 0.3;
      if (opt?.curtain === 'breathe') mood = 0.6;
      if (opt?.curtain === 'flutter') mood = 1.25;
      if (prev && prev.playB.selected !== c.selected) pulseRipple(sp, 0.6);
      if (prev && c.checked && !prev.playB.checked) {
        if (c.solved) audio.shimmer(0.55);
        else {
          sp.mistTarget = 0.7;
          audio.mist();
          later(1800, () => (fx.speaking.mistTarget = 0));
        }
      }
      if (c.solved && prev && !prev.playB.solved && c.revealedByTeacher) audio.shimmer(0.4);
      break;
    }
    case 'prove': {
      const p = l.prove;
      const latest = p.responses[p.responses.length - 1];
      sp.text = p.modelRevealed ? SIMILE.prove.model : latest ?? SIMILE.prove.baseSentence;
      sp.brightTarget = 0.4;
      fx.clockLightTarget = 1;
      audio.mantelVoice = p.modelRevealed ? 'footsteps' : 'loud';
      if (p.modelRevealed) mood = 0.7;
      if (prev && prev.prove.responses.length !== p.responses.length) {
        pulseRipple(sp, 1);
        audio.shimmer(0.3);
      }
      if (prev && p.modelRevealed && !prev.prove.modelRevealed) pulseRipple(sp, 1);
      break;
    }
    case 'complete': {
      sp.text = SIMILE.complete.inscription;
      sp.brightTarget = 0.85;
      mood = 1.1;
      if (!prev || prev.stage !== 'complete') runCompletion();
      break;
    }
  }
  lightMood.mirrorsTarget = mood;
  audio.hush(hush);
}

function runCompletion() {
  clearTimers();
  pulseRipple(fx.speaking, 1);
  audio.shimmer(0.7);
  later(1300, () => {
    audio.mechanism([4.2, 0.7, -24.9]);
    fx.drawerTarget = 1;
  });
}

/** Hall of Mirrors director. */
export function LessonDirector() {
  const lesson = useGame((s) => s.lessons.mirrors);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      // Lesson was reset or jumped back to the start.
      clearTimers();
      resetFx();
    }
    if (p && p.stage === 'complete' && lesson.stage !== 'complete') {
      clearTimers();
      fx.drawerTarget = 0;
    }
    applyEffects(lesson, p);
    prev.current = lesson;
  }, [lesson]);

  // "Replay this moment": re-run the current stage's environmental moment.
  useEffect(() => {
    if (replayTick === 0 || game().room !== 'mirrors') return;
    const l = activeLesson(game());
    pulseRipple(fx.speaking, 1);
    if (l.stage === 'complete') runCompletion();
    else applyEffects(l, null);
    audio.shimmer(0.3);
  }, [replayTick]);

  useEffect(() => () => clearTimers(), []);
  return null;
}
