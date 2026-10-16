/**
 * Giant's Dining Room director: turns the hyperbole lesson into changes of scale.
 * Exaggerations make dishes grow; literal sentences leave them the size they really are.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { HYPERBOLE } from '../content/hyperbole';
import { roomLightLevel } from '../scene/RoomLights';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { world } from '../systems/time';
import { DINING } from '../world/layout';
import { dfx, DISHES, resetDfx } from './diningFx';
import { itemState, type LessonState } from './lessonMachine';

const GIANT: [number, number, number] = [DINING.giant.chairX, 1.6, DINING.table.z];
const TABLE: [number, number, number] = [6.2, 0.9, DINING.table.z];

const timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
const clearTimers = () => {
  while (timers.length) clearTimeout(timers.pop());
};

function rattle(seconds = 1.2, strength = 1) {
  dfx.rattle = Math.max(dfx.rattle, seconds);
  audio.cutleryRattle(TABLE, strength);
}

function apply(l: LessonState, prev: LessonState | null) {
  const done = game().progress.completed.dining;
  dfx.swellTarget = 0;
  dfx.loomTarget = 0;
  let light = 1;
  if (l.stage !== 'complete') dfx.clocheTarget = 0;
  if (l.stage !== 'prove' && l.stage !== 'complete') dfx.menu = '';
  // Dishes keep the size Challenge A gave them for the rest of the lesson.
  for (const d of DISHES) {
    const st = itemState(l.playA, d);
    const hyperbole = HYPERBOLE.playA.items.find((i) => i.id === d)!.options.find((o) => o.correct)!.id === 'h';
    dfx.growTarget[d] = (st.solved || done) && hyperbole ? 2.3 : 1;
  }

  switch (l.stage) {
    case 'discover': {
      const d = l.discover;
      if (d.active === 'B') {
        dfx.swellTarget = 1;
        light = 0.8;
      }
      if (prev && d.active === 'B' && prev.discover.active !== 'B') {
        audio.giantRumble(GIANT, 0.9);
        later(500, () => rattle(1.4));
      }
      break;
    }
    case 'learn': {
      const id = HYPERBOLE.learn.steps[l.learnStep].id;
      if (id === 'annotate') dfx.swellTarget = 0.7;
      if (prev && (prev.stage !== 'learn' || prev.learnStep !== l.learnStep)) {
        if (id === 'term') audio.shimmer(0.4);
        if (id === 'annotate') audio.giantRumble(GIANT, 0.5);
      }
      break;
    }
    case 'playA': {
      const c = l.playA;
      const p = prev?.playA;
      const it = c.activeItem;
      if (prev && it && p) {
        const now = itemState(c, it);
        const before = itemState(p, it);
        if (now.checked && !before.checked) {
          if (now.solved) {
            if ((DISHES as readonly string[]).includes(it)) {
              audio.giantRumble(GIANT, 0.6);
              later(300, () => rattle(1.0, 0.8));
            } else audio.shimmer(0.3);
          } else {
            // A wrong answer: the plates shiver, the room disapproves.
            rattle(0.8, 0.6);
            audio.mist();
          }
        }
      }
      if (c.solved && prev && !prev.playA.solved) audio.shimmer(0.55);
      break;
    }
    case 'playB': {
      const opt = HYPERBOLE.playB.options.find((o) => o.id === l.playB.selected);
      const changed = prev && prev.playB.selected !== l.playB.selected;
      if (opt?.effect === 'loom') {
        dfx.loomTarget = 1;
        light = 0.45;
        if (changed) {
          audio.giantRumble(GIANT, 1.1);
          audio.houseGroan();
          later(700, () => rattle(1.6, 1));
        }
      }
      if (opt?.effect === 'rattle' && changed) rattle(0.9, 0.5);
      if (opt?.effect === 'shiver' && changed) rattle(0.5, 0.3);
      if (prev && l.playB.checked && !prev.playB.checked) {
        if (l.playB.solved) audio.shimmer(0.5);
        else audio.mist();
      }
      break;
    }
    case 'prove': {
      const p = l.prove;
      const latest = p.responses[p.responses.length - 1];
      dfx.menu = p.modelRevealed ? HYPERBOLE.prove.model : (latest ?? '');
      if (prev && prev.prove.responses.length !== p.responses.length) audio.shimmer(0.3);
      if (prev && p.modelRevealed && !prev.prove.modelRevealed) audio.giantRumble(GIANT, 0.6);
      break;
    }
    case 'complete': {
      dfx.menu = HYPERBOLE.complete.inscription;
      if (!prev || prev.stage !== 'complete') runCompletion();
      break;
    }
  }
  roomLightLevel.dining = light;
}

function runCompletion() {
  clearTimers();
  audio.shimmer(0.6);
  audio.giantRumble(GIANT, 0.8);
  later(1400, () => {
    audio.mechanism([DINING.giant.plateX, 1.0, DINING.table.z]);
    dfx.clocheTarget = 1;
  });
}

export function DiningDirector() {
  const lesson = useGame((s) => s.lessons.dining);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      clearTimers();
      resetDfx();
    }
    apply(lesson, p);
    prev.current = lesson;
  }, [lesson]);

  useEffect(() => {
    if (replayTick === 0 || game().room !== 'dining') return;
    const l = game().lessons.dining;
    if (l.stage === 'complete') runCompletion();
    else apply(l, null);
    rattle(1, 0.7);
    audio.giantRumble(GIANT, 0.7);
  }, [replayTick]);

  // Rattles wind down by themselves; now and then the giant's end of the room rumbles while you are there.
  const ambient = useRef(18);
  useFrame(() => {
    if (dfx.rattle > 0) dfx.rattle = Math.max(0, dfx.rattle - world.dt);
    if (game().zone !== 'dining' || world.dt === 0 || game().lessonActive) return;
    ambient.current -= world.dt;
    if (ambient.current <= 0) {
      ambient.current = 35 + Math.random() * 40;
      audio.giantRumble(GIANT, 0.35);
    }
  });

  useEffect(() => () => clearTimers(), []);
  return null;
}
