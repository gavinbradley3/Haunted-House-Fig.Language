/**
 * Pure, framework-free state machine for the simile lesson.
 * DISCOVER → LEARN → PLAY (A, B) → PROVE → COMPLETE
 *
 * The teacher drives every transition. Nothing advances on a timer.
 */
import { getChallenge, SIMILE, type ChallengeId, type CurtainMood } from '../content/simile';
import type { BuildSpec, BuildTile, LessonContent } from '../content/types';

/** The first combination of tiles (in tray order) that the rules accept. */
function firstValidBuild(spec: BuildSpec): string[] {
  const walk = (i: number, acc: string[]): string[] | null => {
    if (i === spec.trays.length) return evaluateBuild(spec, acc).ok ? acc : null;
    for (const t of spec.trays[i].tiles) {
      const r = walk(i + 1, [...acc, t.id]);
      if (r) return r;
    }
    return null;
  };
  const found = walk(0, []);
  if (!found) throw new Error('Build challenge has no valid answer');
  return found;
}

export const STAGES = ['discover', 'learn', 'playA', 'playB', 'prove', 'complete'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  discover: 'Discover',
  learn: 'Learn',
  playA: 'Play: Find the Simile',
  playB: 'Play: Change the Mood',
  prove: 'Prove',
  complete: 'Complete',
};

/** Selection state of one question: a whole challenge, or one item of a multi-part challenge. */
export interface ItemState {
  selected: string | null;
  /** True once the teacher has pressed "Check" for the current selection. */
  checked: boolean;
  /** Ids the class tried that were wrong, in order. */
  wrongAttempts: string[];
  /** Correct answer found (by checking) or revealed by the teacher. */
  solved: boolean;
  revealedByTeacher: boolean;
}

export interface ChoiceState extends ItemState {
  /** Multi-part challenges: one state per item id (missing means untouched). */
  items: Record<string, ItemState>;
  /** The item the class touched most recently (drives the room's reaction). */
  activeItem: string | null;
  /** Phrase-building challenges: the chosen tile id in each tray. */
  build: (string | null)[];
  /** Phrases the class checked that did not work, in order. */
  buildAttempts: string[];
}

export type BuildVerdict =
  | { ok: true; sound: string }
  | { ok: false; reason: 'incomplete' | 'noRepeat' | 'letterOnly' | 'nonsense'; detail: string };

/**
 * Judge a built phrase: it must repeat a beginning SOUND (not just a letter) at least
 * `minRepeats` times, and neighbouring words must make sense together.
 */
export function evaluateBuild(spec: BuildSpec, chosen: (string | null)[]): BuildVerdict {
  const tiles = spec.trays.map((t, i) => t.tiles.find((x) => x.id === chosen[i]) ?? null);
  if (tiles.some((t) => !t)) return { ok: false, reason: 'incomplete', detail: 'Choose one word from every tray.' };
  const ts = tiles as BuildTile[];
  const counts = new Map<string, number>();
  for (const t of ts) counts.set(t.sound, (counts.get(t.sound) ?? 0) + 1);
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const sensible = ts.every((t, i) => i === 0 || t.tags.some((g) => ts[i - 1].tags.includes(g)));
  if (n < spec.minRepeats) {
    // Same first LETTER but different first SOUND: the key misconception.
    const letters = new Map<string, BuildTile[]>();
    for (const t of ts) letters.set(t.text[0].toLowerCase(), [...(letters.get(t.text[0].toLowerCase()) ?? []), t]);
    const clash = [...letters.values()].find((g) => g.length >= 2 && new Set(g.map((t) => t.sound)).size > 1);
    if (clash)
      return {
        ok: false,
        reason: 'letterOnly',
        detail: `“${clash[0].text}” and “${clash[1].text}” start with the same letter, but not the same sound. Alliteration is about sound, not spelling.`,
      };
    return { ok: false, reason: 'noRepeat', detail: 'No beginning sound repeats, so there is no alliteration. Choose words that begin with the same sound.' };
  }
  if (!sensible)
    return {
      ok: false,
      reason: 'nonsense',
      detail: 'It alliterates, but the words do not make sense together. Alliteration should make a phrase more vivid, not turn it into nonsense.',
    };
  return { ok: true, sound: best };
}

export interface LessonState {
  stage: Stage;
  /** Discover: which descriptions have been revealed. */
  discover: { revealedA: boolean; revealedB: boolean; active: 'A' | 'B' | null; questionsShown: boolean };
  /** Learn: index into SIMILE.learn.steps. */
  learnStep: number;
  playA: ChoiceState;
  playB: ChoiceState;
  prove: {
    draft: string;
    responses: string[];
    criteria: boolean[];
    questionsShown: boolean;
    modelRevealed: boolean;
  };
  completed: boolean;
}

export type LessonAction =
  | { type: 'REVEAL_DESCRIPTION'; which: 'A' | 'B' }
  | { type: 'SHOW_DISCOVER_QUESTIONS' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO_STAGE'; stage: Stage }
  | { type: 'SELECT_OPTION'; challenge: ChallengeId; optionId: string }
  | { type: 'CHECK_ANSWER'; challenge: ChallengeId }
  | { type: 'SELECT_ITEM_OPTION'; challenge: ChallengeId; itemId: string; optionId: string }
  | { type: 'CHECK_ITEM'; challenge: ChallengeId; itemId: string }
  | { type: 'SET_BUILD'; challenge: ChallengeId; tray: number; tileId: string }
  | { type: 'CHECK_BUILD'; challenge: ChallengeId }
  | { type: 'REVEAL_ANSWER'; challenge: ChallengeId }
  | { type: 'RESET_QUESTION' }
  | { type: 'SET_DRAFT'; text: string }
  | { type: 'SUBMIT_RESPONSE' }
  | { type: 'REMOVE_RESPONSE'; index: number }
  | { type: 'TOGGLE_CRITERION'; index: number }
  | { type: 'SHOW_PROVE_QUESTIONS' }
  | { type: 'REVEAL_MODEL' }
  | { type: 'COMPLETE' }
  | { type: 'RESET_LESSON' };

const emptyItem = (): ItemState => ({
  selected: null,
  checked: false,
  wrongAttempts: [],
  solved: false,
  revealedByTeacher: false,
});

const emptyChoice = (): ChoiceState => ({ ...emptyItem(), items: {}, activeItem: null, build: [], buildAttempts: [] });

/** Has the class met the Prove stage's mastery checkpoint (a sentence of its own, every criterion ticked)? */
export function masteryMet(s: LessonState): boolean {
  return s.prove.responses.length > 0 && s.prove.criteria.length > 0 && s.prove.criteria.every(Boolean);
}

/** State of one item of a multi-part challenge (untouched items read as empty). */
export const itemState = (c: ChoiceState, itemId: string): ItemState => c.items[itemId] ?? emptyItem();

/** Check one selection: record a wrong attempt, or mark it solved. */
function checked(st: ItemState, ok: boolean): ItemState {
  const sel = st.selected!;
  return { ...st, checked: true, solved: ok, wrongAttempts: ok || st.wrongAttempts.includes(sel) ? st.wrongAttempts : [...st.wrongAttempts, sel] };
}

const emptyProve = (content: LessonContent = SIMILE) => ({
  draft: '',
  responses: [] as string[],
  criteria: content.prove.criteria.map(() => false),
  questionsShown: false,
  modelRevealed: false,
});

export function initialLessonState(content: LessonContent = SIMILE): LessonState {
  return {
    stage: 'discover',
    discover: { revealedA: false, revealedB: false, active: null, questionsShown: false },
    learnStep: 0,
    playA: emptyChoice(),
    playB: emptyChoice(),
    prove: emptyProve(content),
    completed: false,
  };
}

export const LEARN_STEP_COUNT = SIMILE.learn.steps.length;
export const learnCount = (content: LessonContent = SIMILE) => content.learn.steps.length;

/** Whether the "Continue" button should be enabled for the current stage. */
export function canAdvance(s: LessonState): boolean {
  switch (s.stage) {
    case 'discover':
      // The comparison is the point: both descriptions must have been seen.
      return s.discover.revealedA && s.discover.revealedB;
    case 'learn':
      return true;
    case 'playA':
      return s.playA.solved;
    case 'playB':
      return s.playB.solved;
    case 'prove':
      return false; // prove ends with the explicit COMPLETE control
    case 'complete':
      return false;
  }
}

function isCorrect(challenge: ChallengeId, optionId: string | null, content: LessonContent): boolean {
  if (!optionId) return false;
  return getChallenge(challenge, content).options.some((o) => o.id === optionId && o.correct);
}

function correctId(challenge: ChallengeId, content: LessonContent): string {
  const opt = getChallenge(challenge, content).options.find((o) => o.correct);
  if (!opt) throw new Error(`Challenge ${challenge} has no correct option`);
  return opt.id;
}

function nextStage(stage: Stage): Stage {
  const i = STAGES.indexOf(stage);
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
}

function prevStage(stage: Stage): Stage {
  const i = STAGES.indexOf(stage);
  return STAGES[Math.max(i - 1, 0)];
}

export function lessonReducer(s: LessonState, a: LessonAction, content: LessonContent = SIMILE): LessonState {
  const LEARN_STEP_COUNT = content.learn.steps.length;
  switch (a.type) {
    case 'REVEAL_DESCRIPTION': {
      if (s.stage !== 'discover') return s;
      const d = { ...s.discover, active: a.which };
      if (a.which === 'A') d.revealedA = true;
      else d.revealedB = true;
      return { ...s, discover: d };
    }
    case 'SHOW_DISCOVER_QUESTIONS':
      if (s.stage !== 'discover') return s;
      return { ...s, discover: { ...s.discover, questionsShown: true } };

    case 'NEXT': {
      if (s.stage === 'learn' && s.learnStep < LEARN_STEP_COUNT - 1) {
        return { ...s, learnStep: s.learnStep + 1 };
      }
      if (!canAdvance(s)) return s;
      const stage = nextStage(s.stage);
      return { ...s, stage, learnStep: stage === 'learn' ? 0 : s.learnStep };
    }
    case 'BACK': {
      if (s.stage === 'learn' && s.learnStep > 0) return { ...s, learnStep: s.learnStep - 1 };
      if (s.stage === 'discover' || s.stage === 'complete') return s;
      const stage = prevStage(s.stage);
      return { ...s, stage, learnStep: stage === 'learn' ? LEARN_STEP_COUNT - 1 : s.learnStep };
    }
    case 'GOTO_STAGE': {
      // Teacher override: jump anywhere. Completing still requires COMPLETE.
      if (a.stage === 'complete') return { ...s, stage: 'complete', completed: true };
      return { ...s, stage: a.stage, learnStep: a.stage === 'learn' ? 0 : s.learnStep };
    }
    case 'SELECT_OPTION': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      if (c.solved) return s; // answer locked in; reset to try again
      if (!getChallenge(a.challenge, content).options.some((o) => o.id === a.optionId)) return s;
      return { ...s, [a.challenge]: { ...c, selected: a.optionId, checked: false } };
    }
    case 'CHECK_ANSWER': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      if (!c.selected || c.solved) return s;
      return { ...s, [a.challenge]: { ...c, ...checked(c, isCorrect(a.challenge, c.selected, content)) } };
    }
    case 'SELECT_ITEM_OPTION': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      const item = getChallenge(a.challenge, content).items?.find((i) => i.id === a.itemId);
      if (!item || !item.options.some((o) => o.id === a.optionId)) return s;
      const st = itemState(c, a.itemId);
      if (st.solved) return s;
      const items = { ...c.items, [a.itemId]: { ...st, selected: a.optionId, checked: false } };
      return { ...s, [a.challenge]: { ...c, items, activeItem: a.itemId } };
    }
    case 'CHECK_ITEM': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      const ch = getChallenge(a.challenge, content);
      const item = ch.items?.find((i) => i.id === a.itemId);
      const st = itemState(c, a.itemId);
      if (!item || !st.selected || st.solved) return s;
      const ok = item.options.some((o) => o.id === st.selected && o.correct);
      const items = { ...c.items, [a.itemId]: checked(st, ok) };
      const all = ch.items!.every((i) => items[i.id]?.solved);
      return { ...s, [a.challenge]: { ...c, items, activeItem: a.itemId, solved: all } };
    }
    case 'SET_BUILD': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      const spec = getChallenge(a.challenge, content).build;
      if (!spec || c.solved || !spec.trays[a.tray]?.tiles.some((t) => t.id === a.tileId)) return s;
      const build = spec.trays.map((_, i) => (i === a.tray ? a.tileId : (c.build[i] ?? null)));
      return { ...s, [a.challenge]: { ...c, build, checked: false } };
    }
    case 'CHECK_BUILD': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      const spec = getChallenge(a.challenge, content).build;
      if (!spec || c.solved) return s;
      const v = evaluateBuild(spec, c.build);
      if (!v.ok && v.reason === 'incomplete') return s;
      const phrase = c.build.join('|');
      return {
        ...s,
        [a.challenge]: { ...c, checked: true, solved: v.ok, buildAttempts: v.ok || c.buildAttempts.includes(phrase) ? c.buildAttempts : [...c.buildAttempts, phrase] },
      };
    }
    case 'REVEAL_ANSWER': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
      const ch = getChallenge(a.challenge, content);
      if (ch.build) {
        // Show one phrase that works: the first combination the rules accept.
        const pick = firstValidBuild(ch.build);
        return { ...s, [a.challenge]: { ...c, build: pick, checked: true, solved: true, revealedByTeacher: true } };
      }
      if (ch.items?.length) {
        // Reveal every item the class has not solved yet.
        const items = { ...c.items };
        for (const it of ch.items) {
          const st = itemState(c, it.id);
          if (!st.solved) items[it.id] = { ...st, selected: it.options.find((o) => o.correct)!.id, checked: true, solved: true, revealedByTeacher: true };
        }
        return { ...s, [a.challenge]: { ...c, items, solved: true, revealedByTeacher: true } };
      }
      return {
        ...s,
        [a.challenge]: { ...c, selected: correctId(a.challenge, content), checked: true, solved: true, revealedByTeacher: true },
      };
    }
    case 'RESET_QUESTION': {
      switch (s.stage) {
        case 'discover':
          return { ...s, discover: initialLessonState(content).discover };
        case 'learn':
          return { ...s, learnStep: 0 };
        case 'playA':
          return { ...s, playA: emptyChoice() };
        case 'playB':
          return { ...s, playB: emptyChoice() };
        case 'prove':
          return { ...s, prove: emptyProve(content) };
        case 'complete':
          return s;
      }
      return s;
    }
    case 'SET_DRAFT':
      return { ...s, prove: { ...s.prove, draft: a.text.slice(0, 220) } };
    case 'SUBMIT_RESPONSE': {
      const text = s.prove.draft.trim();
      if (!text) return s;
      return {
        ...s,
        prove: { ...s.prove, draft: '', responses: [...s.prove.responses, text], criteria: s.prove.criteria.map(() => false) },
      };
    }
    case 'REMOVE_RESPONSE': {
      const responses = s.prove.responses.filter((_, i) => i !== a.index);
      return { ...s, prove: { ...s.prove, responses } };
    }
    case 'TOGGLE_CRITERION': {
      const criteria = s.prove.criteria.map((v, i) => (i === a.index ? !v : v));
      return { ...s, prove: { ...s.prove, criteria } };
    }
    case 'SHOW_PROVE_QUESTIONS':
      return { ...s, prove: { ...s.prove, questionsShown: true } };
    case 'REVEAL_MODEL':
      return { ...s, prove: { ...s.prove, modelRevealed: true, questionsShown: true } };
    case 'COMPLETE':
      if (s.stage !== 'prove') return s;
      // Mastery checkpoint: the teacher can still jump straight to "Complete" from the teacher panel.
      if (content.requireMastery && !masteryMet(s)) return s;
      return { ...s, stage: 'complete', completed: true };
    case 'RESET_LESSON':
      return initialLessonState(content);
  }
}

/** What the curtains in the room should be doing right now, derived from lesson state. */
export function curtainMoodFor(s: LessonState): CurtainMood {
  if (s.stage === 'discover') {
    if (s.discover.active === 'A') return 'ordinary';
    if (s.discover.active === 'B') return 'tremble';
    return 'still';
  }
  if (s.stage === 'learn') {
    const id = SIMILE.learn.steps[s.learnStep]?.id;
    return id === 'annotate' ? 'tremble' : 'still';
  }
  if (s.stage === 'playB') {
    const opt = SIMILE.playB.options.find((o) => o.id === s.playB.selected);
    return opt?.curtain ?? 'still';
  }
  if (s.stage === 'complete') return 'ordinary';
  return 'still';
}
