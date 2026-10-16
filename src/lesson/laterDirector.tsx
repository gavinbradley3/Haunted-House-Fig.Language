/**
 * Directors for the five later rooms. One shared engine turns lesson-state changes into
 * room reactions (board text, sounds on checks, resets, replays); each room's config adds
 * only what is particular to it.
 */
import { useEffect, useRef } from 'react';
import type { LessonContent, RoomId } from '../content/types';
import { game, useGame, CONTENT } from '../state/store';
import { audio } from '../systems/audio';
import { playCue, showCaption } from '../systems/soundCues';
import { BALLROOM, ECHOES, KITCHEN, PRESS, STUDY } from '../world/layout';
import { bfx, efx, kfx, pfx, pulse, resetLaterFx, sfx } from './laterFx';
import { evaluateBuild, itemState, type LessonState } from './lessonMachine';
import type { ChallengeId } from '../content/simile';

type V3 = [number, number, number];
type Later = 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study';

interface Config {
  at: V3;
  setBoard: (text: string) => void;
  /** Visual state that follows from the lesson (and from the room being complete). */
  persist: (l: LessonState, done: boolean, c: LessonContent) => void;
  discover?: (which: 'A' | 'B') => void;
  learn?: (id: string) => void;
  /** An item was checked and was right. */
  solved?: (challenge: ChallengeId, itemId: string, c: LessonContent) => void;
  /** A phrase was built and checked. */
  built?: (ok: boolean, l: LessonState, c: LessonContent) => void;
  complete: () => void;
}

const CONFIGS: Record<Later, Config> = {
  echoes: {
    at: [ECHOES.piano.x, 1, ECHOES.piano.z],
    setBoard: (t) => (efx.board = t),
    persist: (_l, done) => (efx.silent = done),
    discover: (w) => w === 'B' && playCue('drip'),
    learn: (id) => {
      if (id === 'annotate') playCue('hiss');
      if (id === 'example2') {
        audio.thudFar([ECHOES.piano.x, 1, ECHOES.piano.z]);
        pulse('piano');
        showCaption('Bang! The piano lid slams shut.');
      }
    },
    solved: (ch, id, c) => {
      const it = (ch === 'playA' ? c.playA : c.playB).items?.find((i) => i.id === id);
      if (it?.sound) playCue(it.sound);
    },
    complete: () => {
      efx.silent = true;
      showCaption('The organ plays one last chord by itself. Then the room is silent.');
    },
  },
  press: {
    at: [PRESS.press.x, 1.2, PRESS.press.z],
    setBoard: (t) => (pfx.board = t),
    persist: (l, done, c) => {
      pfx.inked.clear();
      for (const it of c.playA.items ?? []) if (itemState(l.playA, it.id).solved || done) pfx.inked.add(it.id);
      const spec = c.playB.build!;
      pfx.proof = l.playB.solved ? spec.trays.map((t, i) => t.tiles.find((x) => x.id === l.playB.build[i])?.text ?? '').join(' ') : '';
      pfx.workTarget = l.stage === 'discover' && l.discover.active === 'B' ? 1 : 0.25;
    },
    discover: (w) => {
      audio.pressThump([PRESS.press.x, 1.2, PRESS.press.z], w === 'B' ? 5 : 1, 0.42);
      if (w === 'B') audio.whisperS([PRESS.cases.x, 1.4, PRESS.cases.z]);
      showCaption(w === 'B' ? 'The press thumps in time with the words: p… p… p… p.' : 'The press thumps once.');
    },
    learn: (id) => id === 'annotate' && audio.whisperS([PRESS.cases.x, 1.4, PRESS.cases.z]),
    solved: () => audio.pressThump([PRESS.press.x, 1.2, PRESS.press.z], 1),
    built: (ok) => {
      if (ok) {
        audio.pressThump([PRESS.press.x, 1.2, PRESS.press.z], 3, 0.4);
        showCaption('The press thumps three times and prints the headline.');
      }
    },
    complete: () => {
      audio.pressThump([PRESS.press.x, 1.2, PRESS.press.z], 5, 0.35);
      pfx.keyTarget = 1;
    },
  },
  kitchen: {
    at: [KITCHEN.table.x, 1, KITCHEN.table.z],
    setBoard: (t) => (kfx.board = t),
    persist: (l, done, c) => {
      kfx.labelled.clear();
      for (const it of c.playA.items ?? []) if (itemState(l.playA, it.id).solved || done) kfx.labelled.add(it.id);
      kfx.spillTarget = l.discover.revealedB || l.stage !== 'discover' || done ? 1 : 0;
      if (done) kfx.pantryTarget = 1;
    },
    discover: (w) => {
      if (w !== 'B') return;
      kfx.spillTarget = 1;
      audio.cutleryRattle([KITCHEN.beans.x, 0.4, KITCHEN.beans.z], 1.2);
      showCaption('The sack tips over. Beans pour across the floor.');
    },
    learn: (id) => id === 'annotate' && pulse('pot'),
    solved: () => audio.shimmer(0.25),
    complete: () => {
      kfx.pantryTarget = 1;
      audio.creakLong([KITCHEN.x1 - 0.3, 1.2, KITCHEN.zN + 0.4]);
    },
  },
  ballroom: {
    at: [BALLROOM.dancers.x, 1.5, BALLROOM.dancers.z],
    setBoard: (t) => (bfx.board = t),
    persist: (l, done, c) => {
      bfx.shown.clear();
      for (const it of c.playA.items ?? []) {
        const st = itemState(l.playA, it.id);
        const oxy = it.options.find((o) => o.correct)?.id === 'oxy';
        if (oxy && (st.solved || done)) bfx.shown.add(it.id);
      }
      const hushed = bfx.shown.has('silence') || (l.stage === 'discover' && l.discover.active === 'B');
      bfx.waltzTarget = hushed ? 0 : 1;
      if (done) bfx.caseTarget = 1;
    },
    discover: (w) => {
      if (w === 'A') {
        audio.musicBox('dance', [BALLROOM.dancers.x, 1.5, BALLROOM.dancers.z], 0.6);
        showCaption('A faint waltz plays in the empty ballroom.');
      } else {
        audio.stopMusicBox();
        audio.shimmer(0.35);
        showCaption('The music stops dead. The silence seems to ring.');
      }
    },
    solved: (_ch, id) => {
      if (id === 'fire') showCaption('The candle flames turn blue and stop flickering: frozen fire.');
      if (id === 'silence') {
        audio.stopMusicBox();
        showCaption('The dancers stop mid-step. The silence is deafening.');
      }
      if (id === 'secret') showCaption('Inside the glass case, a sealed letter glows: an open secret.');
    },
    complete: () => {
      bfx.caseTarget = 1;
      audio.mechanism([BALLROOM.secret.x, 1, BALLROOM.secret.z]);
    },
  },
  study: {
    at: [STUDY.desk.x, 1, STUDY.desk.z],
    setBoard: (t) => (sfx.board = t),
    persist: (l, done, c) => {
      for (const it of c.playA.items ?? []) if (itemState(l.playA, it.id).solved || done) sfx.opened.add(it.id);
      if (done) sfx.cardTarget = 1;
    },
    discover: (w) => {
      if (w !== 'B') return;
      playCue('evidence:pandora');
    },
    solved: () => audio.shimmer(0.25),
    complete: () => {
      sfx.cardTarget = 1;
      audio.shimmer(0.5);
    },
  },
};

function useLaterDirector(room: Later) {
  const lesson = useGame((s) => s.lessons[room]);
  const done = useGame((s) => s.progress.completed[room]);
  const replayTick = useGame((s) => s.replayTick);
  const prev = useRef<LessonState | null>(null);
  const cfg = CONFIGS[room];
  const content = CONTENT[room as RoomId];

  useEffect(() => {
    const p = prev.current;
    const l = lesson;
    if (p && p !== l && l.stage === 'discover' && !l.discover.revealedA && !l.discover.revealedB && p.stage !== 'discover') resetLaterFx(room);
    cfg.persist(l, done, content);
    // Board: the class's latest sentence in Prove, the model once revealed, the inscription at the end.
    const pr = l.prove;
    cfg.setBoard(l.stage === 'complete' || (done && l.stage !== 'prove') ? content.complete.inscription : l.stage === 'prove' ? (pr.modelRevealed ? content.prove.model : (pr.responses[pr.responses.length - 1] ?? '')) : '');
    if (p) {
      if (l.discover.active && l.discover.active !== p.discover.active) cfg.discover?.(l.discover.active);
      if (l.stage === 'learn' && (p.stage !== 'learn' || p.learnStep !== l.learnStep)) {
        const id = content.learn.steps[l.learnStep].id;
        if (id === 'term') audio.shimmer(0.35);
        cfg.learn?.(id);
      }
      for (const ch of ['playA', 'playB'] as ChallengeId[]) {
        const it = l[ch].activeItem;
        if (it && l.stage === ch) {
          const now = itemState(l[ch], it);
          const before = itemState(p[ch], it);
          if (now.checked && !before.checked) {
            if (now.solved) cfg.solved?.(ch, it, content);
            else audio.mist();
          }
        }
        const spec = (ch === 'playA' ? content.playA : content.playB).build;
        if (spec && l[ch].checked && !p[ch].checked) {
          const ok = evaluateBuild(spec, l[ch].build).ok;
          if (!ok) audio.mist();
          cfg.built?.(ok, l, content);
        }
        if (l[ch].solved && !p[ch].solved) window.setTimeout(() => audio.shimmer(0.5), 700);
      }
      if (pr.responses.length !== p.prove.responses.length) audio.shimmer(0.3);
      if (l.stage === 'complete' && p.stage !== 'complete') {
        audio.shimmer(0.6);
        cfg.complete();
      }
    }
    prev.current = l;
  }, [lesson, done]);

  useEffect(() => {
    if (replayTick === 0 || game().room !== room) return;
    const l = game().lessons[room];
    if (l.stage === 'discover' && l.discover.active) cfg.discover?.(l.discover.active);
    else if (l.stage === 'complete') cfg.complete();
    else audio.shimmer(0.3);
  }, [replayTick]);
}

function One({ room }: { room: Later }) {
  useLaterDirector(room);
  return null;
}

export function LaterDirectors() {
  return (
    <>
      {(['echoes', 'press', 'kitchen', 'ballroom', 'study'] as Later[]).map((r) => (
        <One key={r} room={r} />
      ))}
    </>
  );
}

