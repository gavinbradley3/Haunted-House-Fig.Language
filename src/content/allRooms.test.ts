import { describe, expect, it } from 'vitest';
import { CONTENT } from '../state/store';
import { ROOMS, type ChoiceChallenge } from './types';
import { evaluateBuild, initialLessonState, itemState, lessonReducer, restoreLesson, type LessonAction, type LessonState } from '../lesson/lessonMachine';

const RENDERABLE_LEARN = ['term', 'why', 'annotate', 'example2', 'compare', 'nonExample'];

function challenges(room: (typeof ROOMS)[number]): ChoiceChallenge[] {
  return [CONTENT[room].playA, CONTENT[room].playB];
}

describe('every room’s lesson content', () => {
  for (const room of ROOMS) {
    const c = CONTENT[room];
    it(`${room}: every question has exactly one correct answer and every option explains itself`, () => {
      for (const ch of challenges(room)) {
        if (ch.build) continue; // phrase building is checked by its own rules below
        const questions = ch.items?.length ? ch.items.map((i) => i.options) : [ch.options];
        expect(questions.length).toBeGreaterThan(0);
        for (const opts of questions) {
          expect(opts.filter((o) => o.correct)).toHaveLength(1);
          expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
          for (const o of opts) {
            expect(o.verdict.length).toBeGreaterThan(3);
            expect(o.explanation.length).toBeGreaterThan(30);
          }
        }
      }
    });
    it(`${room}: learn cards can all be drawn and the lesson has every stage`, () => {
      for (const st of c.learn.steps) expect(RENDERABLE_LEARN).toContain(st.id);
      expect(c.discover.descriptionA).not.toBe(c.discover.descriptionB);
      expect(c.prove.criteria.length).toBeGreaterThanOrEqual(3);
      expect(c.prove.modelParts.map((p) => p.text).join('')).toBe(c.prove.model);
      expect(c.complete.summary.length).toBeGreaterThanOrEqual(3);
    });
  }

  it('blanks in sentence-completion items are filled by every option', () => {
    for (const room of ROOMS)
      for (const ch of challenges(room))
        for (const it of ch.items ?? []) if (it.text.includes('___')) expect(it.text.split('___')).toHaveLength(2);
  });

  it('the rooms vary how the class answers: not every challenge is single multiple choice', () => {
    const multi = ROOMS.flatMap((r) => challenges(r)).filter((ch) => ch.items?.length);
    expect(multi.length).toBeGreaterThanOrEqual(3);
  });
});

describe('multi-part challenges', () => {
  const room = 'dining' as const;
  const content = CONTENT[room];
  const run = (s: LessonState, ...a: LessonAction[]) => a.reduce((x, y) => lessonReducer(x, y, content), s);
  const atPlayA = () => run(initialLessonState(content), { type: 'GOTO_STAGE', stage: 'playA' });
  const items = content.playA.items!;
  const right = (i: number) => items[i].options.find((o) => o.correct)!.id;
  const wrong = (i: number) => items[i].options.find((o) => !o.correct)!.id;

  it('a wrong check records the attempt and leaves the item open', () => {
    const s = run(atPlayA(), { type: 'SELECT_ITEM_OPTION', challenge: 'playA', itemId: items[0].id, optionId: wrong(0) }, { type: 'CHECK_ITEM', challenge: 'playA', itemId: items[0].id });
    const st = itemState(s.playA, items[0].id);
    expect(st.solved).toBe(false);
    expect(st.wrongAttempts).toEqual([wrong(0)]);
    expect(s.playA.solved).toBe(false);
  });

  it('the challenge is solved only when every item is solved, and only then can the class move on', () => {
    let s = atPlayA();
    items.forEach((it, i) => {
      expect(s.playA.solved).toBe(false);
      expect(run(s, { type: 'NEXT' }).stage).toBe('playA');
      s = run(s, { type: 'SELECT_ITEM_OPTION', challenge: 'playA', itemId: it.id, optionId: right(i) }, { type: 'CHECK_ITEM', challenge: 'playA', itemId: it.id });
      expect(s.playA.activeItem).toBe(it.id);
    });
    expect(s.playA.solved).toBe(true);
    expect(run(s, { type: 'NEXT' }).stage).toBe('playB');
  });

  it('a solved item is locked, and the teacher can reveal the rest', () => {
    let s = run(atPlayA(), { type: 'SELECT_ITEM_OPTION', challenge: 'playA', itemId: items[0].id, optionId: right(0) }, { type: 'CHECK_ITEM', challenge: 'playA', itemId: items[0].id });
    expect(run(s, { type: 'SELECT_ITEM_OPTION', challenge: 'playA', itemId: items[0].id, optionId: wrong(0) })).toBe(s);
    s = run(s, { type: 'REVEAL_ANSWER', challenge: 'playA' });
    expect(s.playA.solved).toBe(true);
    expect(itemState(s.playA, items[0].id).revealedByTeacher).toBe(false);
    expect(itemState(s.playA, items[1].id).revealedByTeacher).toBe(true);
  });

  it('resetting the question clears every item', () => {
    let s = run(atPlayA(), { type: 'REVEAL_ANSWER', challenge: 'playA' }, { type: 'RESET_QUESTION' });
    expect(s.playA.solved).toBe(false);
    expect(s.playA.items).toEqual({});
    s = run(s, { type: 'SELECT_ITEM_OPTION', challenge: 'playA', itemId: 'not-an-item', optionId: 'h' });
    expect(s.playA.activeItem).toBeNull();
  });
});

describe('the five later rooms', () => {
  const later = ['echoes', 'press', 'kitchen', 'ballroom', 'study'] as const;

  it('each has a mastery checkpoint, and each uses at least one non-multiple-choice interaction', () => {
    for (const r of later) {
      const c = CONTENT[r];
      expect(c.requireMastery).toBe(true);
      const kinds = [c.playA, c.playB].map((ch) => (ch.build ? 'build' : ch.items?.some((i) => i.sound) ? 'listen' : ch.items?.some((i) => i.evidence) ? 'evidence' : ch.items?.some((i) => i.text.includes('___')) ? 'complete' : ch.items?.length ? 'items' : 'choice'));
      expect(kinds).not.toEqual(['choice', 'choice']);
    }
  });

  it('every listening item has a written caption (a text alternative to the sound)', () => {
    for (const r of later) for (const ch of challenges(r)) for (const it of ch.items ?? []) if (it.sound) expect(it.caption?.length).toBeGreaterThan(10);
  });

  it('every allusion question supplies its evidence (no prior knowledge needed)', () => {
    for (const ch of challenges('study')) for (const it of ch.items ?? []) expect(it.evidence?.text.length).toBeGreaterThan(40);
  });

  it('the correct answer does not sit in the same position in every item', () => {
    for (const r of later)
      for (const ch of challenges(r)) {
        const positions = new Set((ch.items ?? []).map((it) => it.options.findIndex((o) => o.correct)));
        if ((ch.items?.length ?? 0) >= 3) expect(positions.size).toBeGreaterThan(1);
      }
  });

  it('the final letter tests all nine devices, one phrase each', () => {
    const labels = CONTENT.finale.playA.items!.map((it) => it.options.find((o) => o.correct)!.id);
    expect(new Set(labels)).toEqual(new Set(['simile', 'metaphor', 'hyperbole', 'personification', 'onomatopoeia', 'alliteration', 'idiom', 'oxymoron', 'allusion']));
  });
});

describe('phrase building (alliteration)', () => {
  const spec = CONTENT.press.playB.build!;
  const ev = (...ids: string[]) => evaluateBuild(spec, ids);
  it('accepts phrases that repeat a SOUND and make sense', () => {
    expect(ev('silent', 'spirits', 'slip')).toEqual({ ok: true, sound: 's' });
    expect(ev('phantom', 'footsteps', 'fade').ok).toBe(true);
    expect(ev('cold', 'keys', 'clatter').ok).toBe(true);
  });
  it('rejects a repeated letter with different sounds, and says so', () => {
    const v = ev('cold', 'ceilings', 'fade');
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toBe('letterOnly');
  });
  it('rejects alliterative nonsense', () => {
    const v = ev('cold', 'cucumbers', 'clatter');
    expect(!v.ok && v.reason).toBe('nonsense');
  });
  it('rejects phrases with no repeated sound', () => {
    const v = ev('silent', 'keys', 'fade');
    expect(!v.ok && v.reason).toBe('noRepeat');
  });
  it('the teacher can reveal a valid headline', () => {
    const content = CONTENT.press;
    const s = lessonReducer(lessonReducer(initialLessonState(content), { type: 'GOTO_STAGE', stage: 'playB' }, content), { type: 'REVEAL_ANSWER', challenge: 'playB' }, content);
    expect(s.playB.solved).toBe(true);
    expect(evaluateBuild(spec, s.playB.build).ok).toBe(true);
  });
});

describe('mastery checkpoint', () => {
  const content = CONTENT.kitchen;
  const run = (s: LessonState, ...a: LessonAction[]) => a.reduce((x, y) => lessonReducer(x, y, content), s);
  const atProve = () => run(initialLessonState(content), { type: 'GOTO_STAGE', stage: 'prove' });
  it('a new room cannot be completed without a class sentence and every criterion ticked', () => {
    let s = run(atProve(), { type: 'COMPLETE' });
    expect(s.stage).toBe('prove');
    s = run(s, { type: 'SET_DRAFT', text: 'Opening the door was a piece of cake.' }, { type: 'SUBMIT_RESPONSE' }, { type: 'TOGGLE_CRITERION', index: 0 }, { type: 'COMPLETE' });
    expect(s.stage).toBe('prove');
    s = run(s, { type: 'TOGGLE_CRITERION', index: 1 }, { type: 'TOGGLE_CRITERION', index: 2 }, { type: 'COMPLETE' });
    expect(s.completed).toBe(true);
  });
  it('every room, the original four and the final letter included, has the same writing checkpoint', () => {
    for (const room of ROOMS) {
      const c = CONTENT[room];
      expect(c.requireMastery, room).toBe(true);
      expect(c.prove.task.length, room).toBeGreaterThan(40);
      expect(c.prove.criteria.length, room).toBeGreaterThanOrEqual(3);
      expect(c.prove.baseSentence.length, room).toBeGreaterThan(5);
    }
  });

  it('in every room, completion waits for a class sentence checked against every criterion', () => {
    for (const room of ROOMS) {
      const c = CONTENT[room];
      const go = (s: LessonState, ...a: LessonAction[]) => a.reduce((x, y) => lessonReducer(x, y, c), s);
      let s = go(initialLessonState(c), { type: 'GOTO_STAGE', stage: 'prove' }, { type: 'COMPLETE' });
      expect(s.stage, room + ': no sentence').toBe('prove');
      s = go(s, { type: 'SET_DRAFT', text: c.prove.model }, { type: 'SUBMIT_RESPONSE' });
      for (let i = 0; i < c.prove.criteria.length - 1; i++) s = go(s, { type: 'TOGGLE_CRITERION', index: i });
      expect(go(s, { type: 'COMPLETE' }).stage, room + ': one criterion unticked').toBe('prove');
      s = go(s, { type: 'TOGGLE_CRITERION', index: c.prove.criteria.length - 1 }, { type: 'COMPLETE' });
      expect(s.stage, room + ': all ticked').toBe('complete');
    }
  });

  it('a new sentence, or removing the latest one, clears the ticks', () => {
    let s = run(atProve(), { type: 'SET_DRAFT', text: 'The cook spilled the beans.' }, { type: 'SUBMIT_RESPONSE' });
    s = run(s, { type: 'TOGGLE_CRITERION', index: 0 }, { type: 'TOGGLE_CRITERION', index: 1 }, { type: 'TOGGLE_CRITERION', index: 2 });
    expect(run(s, { type: 'SET_DRAFT', text: 'It was a piece of cake.' }, { type: 'SUBMIT_RESPONSE' }).prove.criteria.some(Boolean)).toBe(false);
    s = run(s, { type: 'SET_DRAFT', text: 'It was a piece of cake.' }, { type: 'SUBMIT_RESPONSE' }, { type: 'TOGGLE_CRITERION', index: 0 });
    expect(run(s, { type: 'REMOVE_RESPONSE', index: 1 }).prove.criteria.some(Boolean)).toBe(false);
  });
});

describe('saved lessons', () => {
  it('a lesson saved mid-way comes back exactly, in every room', () => {
    for (const room of ROOMS) {
      const c = CONTENT[room];
      const go = (s: LessonState, ...a: LessonAction[]) => a.reduce((x, y) => lessonReducer(x, y, c), s);
      const s = go(initialLessonState(c), { type: 'GOTO_STAGE', stage: 'prove' }, { type: 'SET_DRAFT', text: c.prove.model }, { type: 'SUBMIT_RESPONSE' }, { type: 'TOGGLE_CRITERION', index: 0 });
      expect(restoreLesson(JSON.parse(JSON.stringify(s)), c), room).toEqual(s);
    }
  });
  it('damaged or outdated saves start the lesson fresh instead of breaking it', () => {
    const c = CONTENT.mirrors;
    const fresh = initialLessonState(c);
    expect(restoreLesson(null, c)).toEqual(fresh);
    expect(restoreLesson('nonsense', c)).toEqual(fresh);
    expect(restoreLesson({ stage: 'flying' }, c)).toEqual(fresh);
    expect(restoreLesson({ ...fresh, playA: { selected: 3 } }, c)).toEqual(fresh);
    // Criteria from an older version of the lesson (a different number) are cleared, not misapplied.
    const old = { ...fresh, stage: 'prove', prove: { ...fresh.prove, responses: ['x'], criteria: [true, true] } };
    const r = restoreLesson(old, c);
    expect(r.stage).toBe('prove');
    expect(r.prove.criteria).toEqual(c.prove.criteria.map(() => false));
    // An out-of-range learn step is pulled back into range.
    expect(restoreLesson({ ...fresh, stage: 'learn', learnStep: 99 }, c).learnStep).toBe(c.learn.steps.length - 1);
  });
});
