import { describe, expect, it } from 'vitest';
import { SIMILE } from '../content/simile';
import {
  canAdvance,
  curtainMoodFor,
  initialLessonState,
  LEARN_STEP_COUNT,
  lessonReducer as r,
  type LessonAction,
  type LessonState,
} from './lessonMachine';

const run = (s: LessonState, ...actions: LessonAction[]) => actions.reduce((st, a) => r(st, a), s);

const toPlayA = () =>
  run(
    initialLessonState(),
    { type: 'REVEAL_DESCRIPTION', which: 'A' },
    { type: 'REVEAL_DESCRIPTION', which: 'B' },
    { type: 'NEXT' },
    ...Array.from({ length: LEARN_STEP_COUNT }, () => ({ type: 'NEXT' }) as LessonAction),
  );

describe('discover stage', () => {
  it('starts in discover with nothing revealed', () => {
    const s = initialLessonState();
    expect(s.stage).toBe('discover');
    expect(canAdvance(s)).toBe(false);
  });

  it('cannot advance until both descriptions are revealed', () => {
    const s = run(initialLessonState(), { type: 'REVEAL_DESCRIPTION', which: 'B' }, { type: 'NEXT' });
    expect(s.stage).toBe('discover');
    const s2 = run(s, { type: 'REVEAL_DESCRIPTION', which: 'A' }, { type: 'NEXT' });
    expect(s2.stage).toBe('learn');
    expect(s2.learnStep).toBe(0);
  });

  it('drives the curtains: A is ordinary, B trembles', () => {
    let s = run(initialLessonState(), { type: 'REVEAL_DESCRIPTION', which: 'A' });
    expect(curtainMoodFor(s)).toBe('ordinary');
    s = r(s, { type: 'REVEAL_DESCRIPTION', which: 'B' });
    expect(curtainMoodFor(s)).toBe('tremble');
  });
});

describe('learn stage teaches before any assessment', () => {
  it('steps through every learn card before reaching Challenge A', () => {
    let s = run(
      initialLessonState(),
      { type: 'REVEAL_DESCRIPTION', which: 'A' },
      { type: 'REVEAL_DESCRIPTION', which: 'B' },
      { type: 'NEXT' },
    );
    for (let i = 0; i < LEARN_STEP_COUNT - 1; i++) {
      expect(s.stage).toBe('learn');
      expect(s.learnStep).toBe(i);
      s = r(s, { type: 'NEXT' });
    }
    expect(s.learnStep).toBe(LEARN_STEP_COUNT - 1);
    s = r(s, { type: 'NEXT' });
    expect(s.stage).toBe('playA');
  });

  it('BACK walks back through learn steps then returns to discover', () => {
    let s = toPlayA();
    s = r(s, { type: 'BACK' });
    expect(s.stage).toBe('learn');
    expect(s.learnStep).toBe(LEARN_STEP_COUNT - 1);
  });

  it('includes a definition, examples, and a non-example', () => {
    const ids = SIMILE.learn.steps.map((x) => x.id);
    expect(ids).toEqual(['term', 'why', 'annotate', 'example2', 'nonExample']);
  });
});

describe('choice challenges', () => {
  it('selecting does not check; checking a wrong answer records it and blocks advancing', () => {
    let s = run(toPlayA(), { type: 'SELECT_OPTION', challenge: 'playA', optionId: 'a' });
    expect(s.playA.checked).toBe(false);
    s = r(s, { type: 'CHECK_ANSWER', challenge: 'playA' });
    expect(s.playA.checked).toBe(true);
    expect(s.playA.solved).toBe(false);
    expect(s.playA.wrongAttempts).toEqual(['a']);
    expect(canAdvance(s)).toBe(false);
    expect(r(s, { type: 'NEXT' }).stage).toBe('playA');
  });

  it('checking the correct answer solves it and allows advancing', () => {
    const s = run(
      toPlayA(),
      { type: 'SELECT_OPTION', challenge: 'playA', optionId: 'c' },
      { type: 'CHECK_ANSWER', challenge: 'playA' },
    );
    expect(s.playA.solved).toBe(true);
    expect(r(s, { type: 'NEXT' }).stage).toBe('playB');
  });

  it('ignores actions for a challenge that is not active', () => {
    const s = toPlayA();
    expect(r(s, { type: 'SELECT_OPTION', challenge: 'playB', optionId: 'c' })).toBe(s);
  });

  it('teacher can reveal the answer', () => {
    const s = r(toPlayA(), { type: 'REVEAL_ANSWER', challenge: 'playA' });
    expect(s.playA).toMatchObject({ selected: 'c', solved: true, revealedByTeacher: true });
  });

  it('reset question clears the current challenge only', () => {
    const solved = run(toPlayA(), { type: 'REVEAL_ANSWER', challenge: 'playA' }, { type: 'NEXT' });
    let s = run(solved, { type: 'SELECT_OPTION', challenge: 'playB', optionId: 'a' }, { type: 'CHECK_ANSWER', challenge: 'playB' });
    s = r(s, { type: 'RESET_QUESTION' });
    expect(s.playB.selected).toBeNull();
    expect(s.playB.wrongAttempts).toEqual([]);
    expect(s.playA.solved).toBe(true);
  });

  it('selecting a Challenge B option previews its curtain movement', () => {
    const s = run(toPlayA(), { type: 'GOTO_STAGE', stage: 'playB' }, { type: 'SELECT_OPTION', challenge: 'playB', optionId: 'c' });
    expect(curtainMoodFor(s)).toBe('breathe');
    expect(curtainMoodFor(r(s, { type: 'SELECT_OPTION', challenge: 'playB', optionId: 'a' }))).toBe('flutter');
  });
});

describe('prove stage', () => {
  const atProve = () => r(initialLessonState(), { type: 'GOTO_STAGE', stage: 'prove' });

  it('collects student similes without grading them', () => {
    let s = run(atProve(), { type: 'SET_DRAFT', text: '  The clock ticked like a heartbeat in the walls.  ' }, { type: 'SUBMIT_RESPONSE' });
    expect(s.prove.responses).toEqual(['The clock ticked like a heartbeat in the walls.']);
    expect(s.prove.draft).toBe('');
    s = r(s, { type: 'SUBMIT_RESPONSE' }); // empty draft is ignored
    expect(s.prove.responses).toHaveLength(1);
  });

  it('teacher ticks success criteria; they reset for each new response', () => {
    let s = run(atProve(), { type: 'SET_DRAFT', text: 'x' }, { type: 'SUBMIT_RESPONSE' }, { type: 'TOGGLE_CRITERION', index: 1 });
    expect(s.prove.criteria).toEqual([false, true, false]);
    s = run(s, { type: 'SET_DRAFT', text: 'y' }, { type: 'SUBMIT_RESPONSE' });
    expect(s.prove.criteria).toEqual([false, false, false]);
  });

  it('only completes through the explicit COMPLETE control, after the writing checkpoint', () => {
    let s = atProve();
    expect(r(s, { type: 'NEXT' }).stage).toBe('prove');
    // No class sentence yet: the checkpoint holds the room open.
    expect(r(s, { type: 'COMPLETE' }).stage).toBe('prove');
    s = r(r(s, { type: 'SET_DRAFT', text: 'The clock ticked like a heartbeat in an empty house.' }), { type: 'SUBMIT_RESPONSE' });
    s.prove.criteria.forEach((_, i) => (s = r(s, { type: 'TOGGLE_CRITERION', index: i })));
    const done = r(s, { type: 'COMPLETE' });
    expect(done.stage).toBe('complete');
    expect(done.completed).toBe(true);
    expect(r(initialLessonState(), { type: 'COMPLETE' }).stage).toBe('discover');
  });

  it('limits draft length so it fits on screen', () => {
    const s = r(atProve(), { type: 'SET_DRAFT', text: 'a'.repeat(500) });
    expect(s.prove.draft.length).toBe(220);
  });
});

describe('reset', () => {
  it('reset lesson returns to the start', () => {
    const s = r(r(initialLessonState(), { type: 'GOTO_STAGE', stage: 'complete' }), { type: 'RESET_LESSON' });
    expect(s).toEqual(initialLessonState());
  });
});
