/**
 * The LessonDirector turns lesson state into what happens in the room:
 * camera shots, mirror effects, curtain moods (via curtainMoodFor), light,
 * sound and the completion sequence. It renders nothing.
 */
import { useEffect, useRef } from 'react';
import { SIMILE } from '../content/simile';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { POSES, type ShotName } from '../world/layout';
import { lightMood } from '../scene/parts/Lights';
import { fx, pulseRipple, resetFx } from './fx';
import type { LessonState } from './lessonMachine';
import { jumpTo } from './navigation';

export function shotFor(l: LessonState): ShotName {
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
      return 'speaking';
  }
}

/** Shots whose subject is on the left of frame put the lesson panel on the right. */
export const panelSide = (shot: ShotName | null) => (shot === 'tunnel' || shot === 'jib' ? 'right' : 'left');

/** Begin (or resume) the lesson from the speaking mirror. */
export function openLesson() {
  const s = game();
  const enter = () => {
    const g = useGame.getState();
    if (document.pointerLockElement) document.exitPointerLock();
    g.markMirrorsVisited();
    g.setLessonActive(true);
    g.setHover(null);
    g.setShot(g.completionShot ?? shotFor(g.lesson));
    audio.shimmer(0.25);
    pulseRipple(fx.speaking, 0.8);
  };
  if (s.zone !== 'mirrors') {
    jumpTo(POSES.mirrorEntry, () => {
      useGame.getState().setDoor('mirror', true);
      enter();
    });
  } else enter();
}

export function closeLesson() {
  const g = useGame.getState();
  g.setLessonActive(false);
  g.setShot(null);
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
  if (l.stage !== 'complete') {
    fx.drawerTarget = 0;
    fx.jibTarget = 0;
  }

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
  later(4200, () => {
    audio.mechanism([-4.6, 1.2, -23.15]);
    audio.creak([-4.6, 1.2, -23.15]);
    fx.jibTarget = 1;
    fx.jibGlow = 1;
    const g = useGame.getState();
    g.setCompletionShot('jib');
    if (g.lessonActive) g.setShot('jib');
  });
}

export function LessonDirector() {
  const lesson = useGame((s) => s.lesson);
  const lessonActive = useGame((s) => s.lessonActive);
  const completionShot = useGame((s) => s.completionShot);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p && p !== lesson && lesson.stage === 'discover' && !lesson.discover.revealedA && !lesson.discover.revealedB && p.stage !== 'discover') {
      // Lesson was reset or jumped back to the start.
      clearTimers();
      resetFx();
      useGame.getState().setCompletionShot(null);
    }
    if (p && p.stage === 'complete' && lesson.stage !== 'complete') {
      clearTimers();
      fx.jibTarget = 0;
      fx.drawerTarget = 0;
      fx.jibGlow = 0;
      useGame.getState().setCompletionShot(null);
    }
    applyEffects(lesson, p);
    prev.current = lesson;
  }, [lesson]);

  // Camera follows the lesson while the lesson view is open.
  useEffect(() => {
    const g = useGame.getState();
    if (!lessonActive) return;
    g.setShot(lesson.stage === 'complete' && completionShot ? completionShot : shotFor(lesson));
  }, [lesson, lessonActive, completionShot]);

  // "Replay instructions": re-run the current stage's environmental moment.
  useEffect(() => {
    if (replayTick === 0) return;
    const l = game().lesson;
    pulseRipple(fx.speaking, 1);
    if (l.stage === 'complete') runCompletion();
    else applyEffects(l, null);
    audio.shimmer(0.3);
  }, [replayTick]);

  useEffect(() => () => clearTimers(), []);
  return null;
}
