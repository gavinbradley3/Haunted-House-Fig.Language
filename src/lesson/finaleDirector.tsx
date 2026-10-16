/**
 * Final lesson director: the Entrance Hall listens to the class read the Lady's letter.
 * The hall dims while the letter is read, each decoded phrase brings its light back,
 * the Lady turns to the class when they understand her, and the ending brings the dawn.
 */
import { useEffect, useRef } from 'react';
import { FINALE } from '../content/finale';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { FINALE as SPOT, HALL } from '../world/layout';
import { ffx, resetFfx } from './finaleFx';
import { itemState, type LessonState } from './lessonMachine';

const BOX: [number, number, number] = [SPOT.box.x, 1, SPOT.box.z];

const timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
const clearTimers = () => {
  while (timers.length) clearTimeout(timers.pop());
};

/** The house when the finale is not on screen: normal light, and morning once the class has finished. */
function settle() {
  const done = game().progress.completed.finale;
  ffx.hallTarget = done ? 1.15 : 1;
  ffx.dawnTarget = done ? 1 : 0;
  ffx.ladyTurned = done;
  ffx.mantel = done ? lastReply() : '';
}

function lastReply() {
  const p = game().lessons.finale.prove;
  return p.modelRevealed ? FINALE.prove.model : (p.responses[p.responses.length - 1] ?? FINALE.complete.inscription);
}

function apply(l: LessonState, prev: LessonState | null) {
  const s = game();
  if (!s.lessonActive || s.room !== 'finale') {
    if (l.stage !== 'complete') settle();
    return;
  }
  ffx.ladyTurned = false;
  ffx.mantel = '';
  ffx.dawnTarget = s.progress.completed.finale ? 1 : 0;

  switch (l.stage) {
    case 'discover':
    case 'learn': {
      // The house goes quiet and dim while its letter is read.
      ffx.hallTarget = 0.5;
      if (prev && prev.stage !== l.stage) audio.shimmer(0.3);
      break;
    }
    case 'playA': {
      const items = FINALE.playA.items;
      const solved = items.filter((it) => itemState(l.playA, it.id).solved).length;
      ffx.hallTarget = 0.4 + (0.75 * solved) / items.length;
      const it = l.playA.activeItem;
      if (prev && it) {
        const now = itemState(l.playA, it);
        const before = itemState(prev.playA, it);
        if (now.checked && !before.checked) {
          if (now.solved) audio.shimmer(0.25 + solved * 0.06);
          else {
            audio.mist();
            audio.distantCreak([HALL.x0 + 1, 3.5, -8]);
          }
        }
      }
      if (l.playA.solved && prev && !prev.playA.solved) later(800, () => audio.shimmer(0.6));
      break;
    }
    case 'playB': {
      ffx.hallTarget = 1;
      const opt = FINALE.playB.options.find((o) => o.id === l.playB.selected);
      // Understood, the Lady turns to look at the class.
      ffx.ladyTurned = opt?.effect === 'turn';
      if (prev && prev.playB.selected !== l.playB.selected) {
        if (opt?.effect === 'turn') audio.shimmer(0.4);
        if (opt?.effect === 'shiver') audio.houseGroan();
      }
      if (prev && l.playB.checked && !prev.playB.checked) {
        if (l.playB.solved) audio.shimmer(0.5);
        else audio.mist();
      }
      break;
    }
    case 'prove': {
      ffx.hallTarget = 1;
      ffx.ladyTurned = true;
      const p = l.prove;
      ffx.mantel = p.modelRevealed ? FINALE.prove.model : (p.responses[p.responses.length - 1] ?? '');
      if (prev && prev.prove.responses.length !== p.responses.length) audio.shimmer(0.3);
      break;
    }
    case 'complete': {
      ffx.ladyTurned = true;
      ffx.mantel = lastReply();
      if (!prev || prev.stage !== 'complete') runEnding();
      break;
    }
  }
}

/** The house exhales: every light rises, the front doors open, and morning comes. */
function runEnding() {
  clearTimers();
  audio.shimmer(0.7);
  ffx.hallTarget = 1.3;
  later(1200, () => audio.gust());
  later(2600, () => {
    const g = useGame.getState();
    if (!g.doors.front) {
      g.setDoor('front', true);
      audio.doorOpen([0, 1.5, HALL.zFront], true);
    }
    ffx.dawnTarget = 1;
  });
  later(4200, () => audio.musicBox('lullaby', BOX, 0.6));
}

export function FinaleDirector() {
  const lesson = useGame((s) => s.lessons.finale);
  const active = useGame((s) => s.lessonActive && s.room === 'finale');
  const finished = useGame((s) => s.progress.completed.finale);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      clearTimers();
      resetFfx();
    }
    apply(lesson, p);
    prev.current = lesson;
  }, [lesson, active]);

  // A teacher reset (or loading saved progress) puts the house back the way it should be.
  useEffect(() => {
    if (!game().lessonActive || game().room !== 'finale') settle();
  }, [finished]);

  useEffect(() => {
    if (replayTick === 0 || game().room !== 'finale') return;
    const l = game().lessons.finale;
    if (l.stage === 'complete') runEnding();
    else apply(l, null);
  }, [replayTick]);

  useEffect(() => () => clearTimers(), []);
  return null;
}

