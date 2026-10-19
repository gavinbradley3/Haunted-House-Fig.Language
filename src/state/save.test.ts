import { describe, expect, it } from 'vitest';
import { ALLITERATION } from '../content/alliteration';
import { ALLUSION } from '../content/allusion';
import { FINALE } from '../content/finale';
import { HYPERBOLE } from '../content/hyperbole';
import { IDIOM } from '../content/idiom';
import { METAPHOR } from '../content/metaphor';
import { ONOMATOPOEIA } from '../content/onomatopoeia';
import { OXYMORON } from '../content/oxymoron';
import { PERSONIFICATION } from '../content/personification';
import { SIMILE } from '../content/simile';
import { DEVICE_ROOMS, type LessonContent, type RoomId } from '../content/types';
import { nextStep } from '../lesson/guide';
import { lessonReducer } from '../lesson/lessonMachine';
import { safePlace } from '../lesson/place';
import { GRANT_STEPS, progressReducer } from '../lesson/progression';
import { POSES } from '../world/layout';
import { BACKUP_KEY, BEFORE_RESET_KEY, DAMAGED_KEY, freshSave, hasProgress, LEGACY_KEYS, REV_KEY, SAVE_KEY, SAVE_VERSION, Saver, type GameSave } from './save';

const CONTENT: Record<RoomId, LessonContent> = {
  mirrors: SIMILE,
  gallery: METAPHOR,
  dining: HYPERBOLE,
  nursery: PERSONIFICATION,
  echoes: ONOMATOPOEIA,
  press: ALLITERATION,
  kitchen: IDIOM,
  ballroom: OXYMORON,
  study: ALLUSION,
  finale: FINALE,
};

/** A stand-in for one Chromebook profile's localStorage (shared by every "tab" made from it). */
class Profile {
  data = new Map<string, string>();
  full = false;
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.full) throw new Error('QuotaExceededError');
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

/** A game part-way through: two rooms done, keys taken, a lesson mid-way with a draft sentence. */
function playedSave(): GameSave {
  const s = freshSave(CONTENT);
  s.progress = progressReducer(s.progress, { type: 'GRANT', upTo: 'diningOpen' });
  let l = s.lessons.dining;
  l = lessonReducer(l, { type: 'REVEAL_DESCRIPTION', which: 'A' }, HYPERBOLE);
  l = lessonReducer(l, { type: 'REVEAL_DESCRIPTION', which: 'B' }, HYPERBOLE);
  l = lessonReducer(l, { type: 'NEXT' }, HYPERBOLE);
  l = lessonReducer(l, { type: 'GOTO_STAGE', stage: 'prove' }, HYPERBOLE);
  l = lessonReducer(l, { type: 'SET_DRAFT', text: 'The soup was hot enough to melt the' }, HYPERBOLE);
  s.lessons.dining = l;
  s.writing = { mirrors: 'The hallway stretched like a held breath.', gallery: 'The house was a sleeping wolf.' };
  s.place = { x: 6.0, z: -14.0 + 1.9, yaw: 1.2, upstairs: false, lesson: 'dining' };
  s.found = { diary: true };
  return s;
}

describe('student save', () => {
  it('a brand-new profile starts fresh and writes nothing until asked', () => {
    const p = new Profile();
    const r = new Saver(p, CONTENT).load();
    expect(r.status).toBe('fresh');
    expect(hasProgress(r.save)).toBe(false);
    expect(p.getItem(SAVE_KEY)).toBeNull();
  });

  it('saves everything and restores it exactly after a reload (a new Saver on the same profile)', () => {
    const p = new Profile();
    const a = new Saver(p, CONTENT);
    a.load();
    const s = playedSave();
    expect(a.write(s)).toBe('ok');
    const r = new Saver(p, CONTENT).load();
    expect(r.status).toBe('loaded');
    expect(r.save).toEqual(s);
    expect(r.save.lessons.dining.prove.draft).toBe('The soup was hot enough to melt the');
    expect(hasProgress(r.save)).toBe(true);
    expect(JSON.parse(p.getItem(SAVE_KEY)!).v).toBe(SAVE_VERSION);
  });

  it('keeps writing the older keys too, so an older build of the game still finds the progress', () => {
    const p = new Profile();
    const a = new Saver(p, CONTENT);
    a.load();
    a.write(playedSave());
    expect(JSON.parse(p.getItem(LEGACY_KEYS.progress)!).unlocked.dining).toBe(true);
    expect(JSON.parse(p.getItem(LEGACY_KEYS.lessons)!).dining.stage).toBe('prove');
  });

  it('carries over a save from the previous version (hosl.progress / hosl.lessons)', () => {
    const p = new Profile();
    const s = playedSave();
    p.setItem(LEGACY_KEYS.progress, JSON.stringify(s.progress));
    p.setItem(LEGACY_KEYS.lessons, JSON.stringify(s.lessons));
    const r = new Saver(p, CONTENT).load();
    expect(r.status).toBe('migrated');
    expect(r.save.progress).toEqual(s.progress);
    expect(r.save.lessons).toEqual(s.lessons);
  });

  it('a damaged save is set aside (not overwritten) and the backup is used', () => {
    const p = new Profile();
    const a = new Saver(p, CONTENT);
    a.load();
    const s = playedSave();
    a.write(s, true); // milestone: refreshes the backup
    p.setItem(SAVE_KEY, '{"v":2,"progress":{"compl'); // torn write
    const r = new Saver(p, CONTENT).load();
    expect(r.status).toBe('recovered');
    expect(r.save).toEqual(s);
    expect(p.getItem(DAMAGED_KEY)).toBe('{"v":2,"progress":{"compl');
  });

  it('damaged save and no backup: falls back to the older keys rather than a blank game', () => {
    const p = new Profile();
    const s = playedSave();
    p.setItem(LEGACY_KEYS.progress, JSON.stringify(s.progress));
    p.setItem(SAVE_KEY, 'not json at all');
    const r = new Saver(p, CONTENT).load();
    expect(r.status).toBe('recovered');
    expect(r.save.progress).toEqual(s.progress);
  });

  it('ignores impossible or tampered values but keeps the rest', () => {
    const p = new Profile();
    const s = playedSave();
    const raw = JSON.parse(JSON.stringify({ v: 2, rev: 1, savedAt: 1, ...s }));
    raw.progress.unlocked.study = true; // no Ballroom Key: impossible
    raw.lessons.mirrors = { stage: 'flying' };
    raw.place = { x: 'here', z: 2 };
    raw.writing.gallery = 42;
    raw.found = { diary: true, 'bad key!': true, other: 'yes' };
    p.setItem(SAVE_KEY, JSON.stringify(raw));
    const r = new Saver(p, CONTENT).load();
    expect(r.save.progress.unlocked.study).toBe(false);
    expect(r.save.progress.unlocked.dining).toBe(true);
    expect(r.save.lessons.mirrors.stage).toBe('discover');
    expect(r.save.lessons.dining).toEqual(s.lessons.dining);
    expect(r.save.place).toBeNull();
    expect(r.save.writing).toEqual({ mirrors: s.writing.mirrors });
    expect(r.save.found).toEqual({ diary: true });
  });

  it('never overwrites a save made by a newer version of the game', () => {
    const p = new Profile();
    const raw = JSON.stringify({ v: SAVE_VERSION + 1, rev: 3, savedAt: 1, ...playedSave() });
    p.setItem(SAVE_KEY, raw);
    const a = new Saver(p, CONTENT);
    expect(a.load().status).toBe('newer');
    expect(a.write(freshSave(CONTENT))).toBe('off');
    expect(p.getItem(SAVE_KEY)).toBe(raw);
  });

  it('two tabs: the older tab stops saving once the newer one has saved', () => {
    const p = new Profile();
    const first = new Saver(p, CONTENT);
    first.load();
    first.write(playedSave());
    const second = new Saver(p, CONTENT); // the same game opened again later
    second.load();
    expect(second.write(playedSave())).toBe('ok');
    // The first tab tries to save its (now out-of-date) game: refused, and it knows why.
    expect(first.othersSaved()).toBe(true);
    expect(first.write(freshSave(CONTENT))).toBe('conflict');
    expect(first.conflict).toBe(true);
    expect(new Saver(p, CONTENT).load().save).toEqual(playedSave());
    expect(Number(p.getItem(REV_KEY))).toBe(2);
  });

  it('storage that refuses everything (guest window): nothing is saved, and the game says so', () => {
    const p = new Profile();
    p.full = true;
    const a = new Saver(p, CONTENT);
    expect(a.load().status).toBe('unavailable');
    expect(a.write(playedSave())).toBe('off');
    expect(new Saver(null, CONTENT).load().status).toBe('unavailable');
  });

  it('storage filling up mid-game reports a failure instead of crashing', () => {
    const p = new Profile();
    const a = new Saver(p, CONTENT);
    a.load();
    p.full = true;
    expect(a.write(playedSave())).toBe('failed');
  });

  it('a teacher reset keeps the old game so it can be brought back', () => {
    const p = new Profile();
    const a = new Saver(p, CONTENT);
    a.load();
    const s = playedSave();
    a.write(s);
    a.clear();
    a.write(freshSave(CONTENT), true);
    expect(new Saver(p, CONTENT).load().save.progress.completed.mirrors).toBe(false);
    expect(p.getItem(BEFORE_RESET_KEY)).not.toBeNull();
    expect(a.undoReset()).toEqual(s);
    expect(p.getItem(BACKUP_KEY)).not.toBeNull();
  });
});

describe('what to do next', () => {
  const fresh = freshSave(CONTENT);
  it('starts at the Hall of Mirrors', () => {
    expect(nextStep(fresh.progress, fresh.lessons).text).toMatch(/Hall of Mirrors/);
  });
  it('points at a waiting key before anything else', () => {
    const p = progressReducer(fresh.progress, { type: 'COMPLETE_ROOM', room: 'mirrors' });
    expect(nextStep(p, fresh.lessons).text).toBe('Take the Mirror Key from the drawer under the speaking mirror.');
  });
  it('then to the door that key opens', () => {
    const p = progressReducer(fresh.progress, { type: 'GRANT', upTo: 'mirrorKey' });
    expect(nextStep(p, fresh.lessons).text).toMatch(/^Unlock the Portrait Gallery door .* with the Mirror Key\.$/);
  });
  it('gives a sensible step for every point in the chain, and never mentions an answer', () => {
    for (const step of GRANT_STEPS) {
      const p = progressReducer(fresh.progress, { type: 'GRANT', upTo: step });
      const t = nextStep(p, fresh.lessons).text;
      expect(t.length).toBeGreaterThan(10);
      expect(t).not.toMatch(/undefined|null/);
    }
    const all = progressReducer(fresh.progress, { type: 'GRANT', upTo: 'deskOpen' });
    expect(nextStep(all, fresh.lessons).text).toMatch(/letter/);
    const done = { ...all, completed: { ...all.completed, finale: true } };
    expect(nextStep(done, fresh.lessons).room).toBeNull();
  });
  it('says "carry on" for a lesson already started', () => {
    const s = playedSave();
    const p = { ...s.progress, keys: { ...s.progress.keys } };
    expect(nextStep(p, s.lessons).text).toMatch(/^Carry on in the Giant’s Dining Room/);
    expect(DEVICE_ROOMS.length).toBe(9);
  });
});

describe('putting a returning student back', () => {
  const fresh = freshSave(CONTENT);
  it('no saved place: the entrance hall', () => {
    expect(safePlace(null, fresh.progress)).toMatchObject({ zone: 'hall', restored: false, pose: POSES.hallStart });
  });
  it('a valid place in an unlocked room: there, with its door open', () => {
    const s = playedSave();
    const w = safePlace(s.place, s.progress);
    expect(w).toMatchObject({ zone: 'dining', door: 'dining', restored: true });
  });
  it('inside a room whose door is not unlocked (old or impossible): the hall instead', () => {
    const w = safePlace({ x: 6, z: -12.1, yaw: 0, upstairs: false, lesson: null }, fresh.progress);
    expect(w.zone).toBe('hall');
    expect(w.restored).toBe(false);
  });
  it('inside a wall or outside the house: the hall instead', () => {
    expect(safePlace({ x: 3, z: -10.15, yaw: 0, upstairs: false, lesson: null }, fresh.progress).restored).toBe(false);
    expect(safePlace({ x: 0, z: 8, yaw: 0, upstairs: false, lesson: null }, fresh.progress).zone).toBe('hall');
  });
});
