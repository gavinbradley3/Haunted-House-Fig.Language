/**
 * Portrait Gallery director: turns the metaphor lesson into changes in the paintings.
 * The caretaker's storm flickers, the old man fades into his shadow, the waiting
 * lady's portrait acts out each sentence, and the empty frame takes the class's title.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { METAPHOR } from '../content/metaphor';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { world } from '../systems/time';
import { GALLERY } from '../world/layout';
import { gfx, resetGfx } from './galleryFx';
import type { LessonState } from './lessonMachine';

const CARETAKER_POS: [number, number, number] = [GALLERY.x0 + 0.3, 2.6, GALLERY.caretaker.z];
const timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
const clearTimers = () => {
  while (timers.length) clearTimeout(timers.pop());
};

function flash(strength = 1) {
  gfx.caretaker.flash = Math.max(gfx.caretaker.flash, strength);
  later(260, () => (gfx.caretaker.flash = Math.max(gfx.caretaker.flash, strength * 0.6)));
  later(700 + Math.random() * 900, () => audio.thunder(CARETAKER_POS, strength));
}

function apply(l: LessonState, prev: LessonState | null) {
  const s = gfx.sitter.targets;
  const o = gfx.oldMan.targets;
  // Defaults for every stage; each case turns on only what it needs.
  s.moths = 0;
  s.warm = 0;
  s.shiver = 0;
  o.fade = l.playA.solved || game().progress.completed.gallery ? 1 : 0;
  o.shiver = 0;
  gfx.stormEvery = 0;
  if (l.stage !== 'complete') gfx.swingTarget = 0;
  if (l.stage !== 'prove' && l.stage !== 'complete') gfx.frame.text = '';

  switch (l.stage) {
    case 'discover': {
      const d = l.discover;
      // The title "a storm" makes the storm in the painting come alive.
      if (d.active === 'A') gfx.stormEvery = 9;
      if (prev && d.active === 'A' && prev.discover.active !== 'A') flash(1);
      break;
    }
    case 'learn': {
      const id = METAPHOR.learn.steps[l.learnStep].id;
      if (prev && (prev.stage !== 'learn' || prev.learnStep !== l.learnStep)) {
        if (id === 'term') flash(0.8);
        else audio.shimmer(0.25);
      }
      if (id === 'compare') gfx.stormEvery = 14;
      break;
    }
    case 'playA': {
      const c = l.playA;
      if (prev && c.checked && !prev.playA.checked && !c.solved) {
        o.shiver = 1;
        audio.mist();
        later(1400, () => (gfx.oldMan.targets.shiver = 0));
      }
      if (c.solved && prev && !prev.playA.solved) audio.shimmer(0.55);
      break;
    }
    case 'playB': {
      const opt = METAPHOR.playB.options.find((x) => x.id === l.playB.selected);
      if (opt?.effect === 'moths') {
        s.moths = 1;
        s.shiver = 0.25;
      }
      if (opt?.effect === 'sunflowers') s.warm = 1;
      if (opt?.effect === 'shiver') s.shiver = 1;
      if (prev && prev.playB.selected !== l.playB.selected && opt) audio.creak([GALLERY.sitter.x, 2.2, GALLERY.zN + 0.3]);
      if (prev && l.playB.checked && !prev.playB.checked) {
        if (l.playB.solved) audio.shimmer(0.5);
        else audio.mist();
      }
      break;
    }
    case 'prove': {
      const p = l.prove;
      const latest = p.responses[p.responses.length - 1];
      gfx.frame.text = p.modelRevealed ? METAPHOR.prove.model : latest ?? '';
      if (prev && prev.prove.responses.length !== p.responses.length) audio.shimmer(0.3);
      if (prev && p.modelRevealed && !prev.prove.modelRevealed) audio.houseGroan();
      break;
    }
    case 'complete': {
      gfx.frame.text = METAPHOR.complete.inscription;
      if (!prev || prev.stage !== 'complete') runCompletion();
      break;
    }
  }
}

function runCompletion() {
  clearTimers();
  audio.shimmer(0.6);
  flash(0.5);
  later(1500, () => {
    audio.mechanism([GALLERY.x0 + 0.2, 2.1, GALLERY.emptyFrame.z]);
    gfx.swingTarget = 1;
  });
}

export function GalleryDirector() {
  const lesson = useGame((s) => s.lessons.gallery);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      clearTimers();
      resetGfx();
    }
    apply(lesson, p);
    prev.current = lesson;
  }, [lesson]);

  useEffect(() => {
    if (replayTick === 0 || game().room !== 'gallery') return;
    const l = game().lessons.gallery;
    if (l.stage === 'complete') runCompletion();
    else apply(l, null);
    flash(0.7);
  }, [replayTick]);

  // The caretaker's storm: during the lesson on cue, otherwise a rare flash while you are in the room.
  useFrame(() => {
    if (game().zone !== 'gallery' || world.dt === 0) return;
    gfx.stormTimer -= world.dt;
    if (gfx.stormTimer > 0) return;
    const every = gfx.stormEvery || 26;
    gfx.stormTimer = every * (0.7 + Math.random() * 0.6);
    flash(gfx.stormEvery ? 1 : 0.55);
  });

  useEffect(() => () => clearTimers(), []);
  return null;
}
