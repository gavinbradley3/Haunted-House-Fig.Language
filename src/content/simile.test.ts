import { describe, expect, it } from 'vitest';
import { SIMILE } from './simile';

const hasComparisonWord = (t: string) => /\b(like|as)\b/i.test(t);

describe('simile content integrity', () => {
  for (const ch of [SIMILE.playA, SIMILE.playB]) {
    it(`${ch.id} has exactly one correct option`, () => {
      expect(ch.options.filter((o) => o.correct)).toHaveLength(1);
    });
    it(`${ch.id} explains every option`, () => {
      for (const o of ch.options) {
        expect(o.explanation.length).toBeGreaterThan(40);
        expect(o.verdict.length).toBeGreaterThan(3);
      }
    });
    it(`${ch.id} option ids and letters are unique`, () => {
      expect(new Set(ch.options.map((o) => o.id)).size).toBe(ch.options.length);
      expect(new Set(ch.options.map((o) => o.letter)).size).toBe(ch.options.length);
    });
    it(`${ch.id} correct answer contains a comparison word`, () => {
      expect(hasComparisonWord(ch.options.find((o) => o.correct)!.text)).toBe(true);
    });
  }

  it('Challenge A includes a "like" non-example and a plain description', () => {
    const texts = SIMILE.playA.options.filter((o) => !o.correct).map((o) => o.text);
    expect(texts.some((t) => /\blike\b/i.test(t))).toBe(true);
    expect(texts.some((t) => !hasComparisonWord(t))).toBe(true);
  });

  it('Challenge B gives every option a distinct curtain preview', () => {
    const moods = SIMILE.playB.options.map((o) => o.curtain);
    expect(moods.every(Boolean)).toBe(true);
    expect(new Set(moods).size).toBe(moods.length);
  });

  it('annotated sentences reassemble to the original text', () => {
    const annotate = SIMILE.learn.steps.find((s) => s.id === 'annotate') as { parts: { text: string }[] };
    expect(annotate.parts.map((p) => p.text).join('')).toBe(SIMILE.discover.descriptionB);
    expect(SIMILE.prove.modelParts.map((p) => p.text).join('')).toBe(SIMILE.prove.model);
  });

  it('every annotated sentence marks subject, comparison word, and compared thing', () => {
    const sets = [
      (SIMILE.learn.steps[2] as { parts: { role?: string }[] }).parts,
      (SIMILE.learn.steps[3] as { parts: { role?: string }[] }).parts,
      SIMILE.prove.modelParts,
    ];
    for (const parts of sets) {
      const roles = new Set(parts.map((p) => p.role).filter(Boolean));
      expect(roles).toEqual(new Set(['subject', 'word', 'compared']));
    }
  });
});
