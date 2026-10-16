/**
 * Nursery director: turns the personification lesson into toys that behave like people,
 * and a music box whose song the class judges by listening.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PERSONIFICATION } from '../content/personification';
import { roomLightLevel } from '../scene/RoomLights';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { world } from '../systems/time';
import { NURSERY } from '../world/layout';
import { itemState, type LessonState } from './lessonMachine';
import { nfx, resetNfx, TOYS, type Toy } from './nurseryFx';

const BOX: [number, number, number] = [NURSERY.musicBox.x, 0.9, NURSERY.musicBox.z];
const HORSE: [number, number, number] = [NURSERY.horse.x, 0.6, NURSERY.horse.z];
type Song = 'cheerful' | 'dance' | 'lullaby' | 'plain';

const timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
const clearTimers = () => {
  while (timers.length) clearTimeout(timers.pop());
};

/** What each toy does the moment it wakes. */
function wake(toy: Toy) {
  if (toy === 'horse') audio.creak(HORSE);
  if (toy === 'musicBox') audio.musicBox('hum', BOX);
  if (toy === 'dollhouse') audio.shimmer(0.25);
  if (toy === 'teddy') audio.creak([NURSERY.bed.x, 0.7, NURSERY.bed.z]);
}

function apply(l: LessonState, prev: LessonState | null) {
  const done = game().progress.completed.nursery;
  nfx.rockTarget = 0;
  let lid = 0;
  let light = 1;
  if (l.stage !== 'prove' && l.stage !== 'complete') nfx.slate = '';
  // Toys woken in Challenge A stay awake for the rest of the lesson (and after it).
  for (const t of TOYS) nfx.awakeTarget[t] = itemState(l.playA, t).solved || done ? 1 : 0;

  switch (l.stage) {
    case 'discover': {
      const d = l.discover;
      if (d.active === 'B') {
        nfx.rockTarget = 1;
        light = 0.8;
      }
      if (prev && d.active === 'B' && prev.discover.active !== 'B') later(900, () => audio.musicBox('two', BOX, 0.8));
      if (prev && d.active === 'A' && prev.discover.active !== 'A') audio.stopMusicBox();
      break;
    }
    case 'learn': {
      const id = PERSONIFICATION.learn.steps[l.learnStep].id;
      const changed = prev && (prev.stage !== 'learn' || prev.learnStep !== l.learnStep);
      if (id === 'annotate') lid = 0.35;
      if (changed) {
        audio.stopMusicBox();
        if (id === 'term') audio.shimmer(0.4);
        if (id === 'annotate') audio.musicBox('lullaby', BOX, 0.9);
        if (id === 'example2') audio.gust();
        if (id === 'nonExample') audio.creak([NURSERY.bed.x + 1, 0.5, NURSERY.bed.z]);
      }
      break;
    }
    case 'playA': {
      const c = l.playA;
      const it = c.activeItem as Toy | null;
      if (prev && it) {
        const now = itemState(c, it);
        const before = itemState(prev.playA, it);
        if (now.checked && !before.checked) {
          if (now.solved) wake(it);
          else {
            nfx.shiver = 0.9;
            audio.mist();
          }
        }
      }
      if (nfx.awakeTarget.musicBox) lid = 0.35;
      if (c.solved && prev && !prev.playA.solved) later(1200, () => audio.shimmer(0.5));
      break;
    }
    case 'playB': {
      const opt = PERSONIFICATION.playB.options.find((o) => o.id === l.playB.selected);
      lid = 0.35;
      if (prev && prev.playB.selected !== l.playB.selected && opt) {
        // The point of this challenge is to listen: each option plays its own song.
        audio.musicBox(opt.effect as Song, BOX);
        if (opt.effect === 'lullaby') light = 0.7;
      }
      if (opt?.effect === 'lullaby') light = 0.7;
      if (opt?.effect === 'dance') nfx.rockTarget = 1;
      if (prev && l.playB.checked && !prev.playB.checked) {
        if (l.playB.solved) audio.shimmer(0.5);
        else audio.mist();
      }
      break;
    }
    case 'prove': {
      const p = l.prove;
      const latest = p.responses[p.responses.length - 1];
      nfx.slate = p.modelRevealed ? PERSONIFICATION.prove.model : (latest ?? '');
      if (prev && prev.prove.responses.length !== p.responses.length) audio.shimmer(0.3);
      if (prev && p.modelRevealed && !prev.prove.modelRevealed) audio.gust();
      break;
    }
    case 'complete': {
      nfx.slate = PERSONIFICATION.complete.inscription;
      lid = nfx.lidTarget;
      if (!prev || prev.stage !== 'complete') runCompletion();
      break;
    }
  }
  if (l.stage !== 'complete') nfx.lidTarget = done ? 1 : lid;
  roomLightLevel.nursery = light;
}

function runCompletion() {
  clearTimers();
  audio.shimmer(0.5);
  nfx.lidTarget = 0.35;
  later(900, () => audio.musicBox('lullaby', BOX, 0.9));
  later(5200, () => {
    audio.mechanism(BOX);
    nfx.lidTarget = 1;
  });
}

export function NurseryDirector() {
  const lesson = useGame((s) => s.lessons.nursery);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      clearTimers();
      resetNfx();
    }
    apply(lesson, p);
    prev.current = lesson;
  }, [lesson]);

  useEffect(() => {
    if (replayTick === 0 || game().room !== 'nursery') return;
    const l = game().lessons.nursery;
    if (l.stage === 'complete') runCompletion();
    else apply(l, null);
    if (l.stage === 'playB') {
      const opt = PERSONIFICATION.playB.options.find((o) => o.id === l.playB.selected);
      if (opt) audio.musicBox(opt.effect as Song, BOX);
    }
  }, [replayTick]);

  // While the class explores the nursery, the music box sometimes plays two notes on its own.
  const ambient = useRef(14);
  useFrame(() => {
    if (game().zone !== 'nursery' || world.dt === 0 || game().lessonActive) return;
    ambient.current -= world.dt;
    if (ambient.current <= 0) {
      ambient.current = 30 + Math.random() * 35;
      audio.musicBox('two', BOX, 0.55);
    }
  });

  useEffect(() => () => clearTimers(), []);
  return null;
}
