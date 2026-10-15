/**
 * Pure, framework-free state machine for the simile lesson.
 * DISCOVER → LEARN → PLAY (A, B) → PROVE → COMPLETE
 *
 * The teacher drives every transition. Nothing advances on a timer.
 */
import { getChallenge, SIMILE, type ChallengeId, type CurtainMood } from '../content/simile';
import type { LessonContent } from '../content/types';

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

export interface ChoiceState {
  selected: string | null;
  /** True once the teacher has pressed "Check" for the current selection. */
  checked: boolean;
  /** Ids the class tried that were wrong, in order. */
  wrongAttempts: string[];
  /** Correct answer found (by checking) or revealed by the teacher. */
  solved: boolean;
  revealedByTeacher: boolean;
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

const emptyChoice = (): ChoiceState => ({
  selected: null,
  checked: false,
  wrongAttempts: [],
  solved: false,
  revealedByTeacher: false,
});

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
      const ok = isCorrect(a.challenge, c.selected, content);
      return {
        ...s,
        [a.challenge]: {
          ...c,
          checked: true,
          solved: ok,
          wrongAttempts: ok || c.wrongAttempts.includes(c.selected) ? c.wrongAttempts : [...c.wrongAttempts, c.selected],
        },
      };
    }
    case 'REVEAL_ANSWER': {
      if (s.stage !== a.challenge) return s;
      const c = s[a.challenge];
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
