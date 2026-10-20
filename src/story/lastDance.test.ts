import { describe, expect, it } from 'vitest';
import { JOURNAL, OBJECTIVES } from '../content/lastDance';
import { CONTENT } from '../state/store';
import { freshSave, restoreSave } from '../state/save';
import { safePlace } from '../lesson/place';
import { boxesFor, floorAfter, removeDynamicCollider, resolveCircle, setDynamicCollider, upstairsDoorway } from '../world/collision';
import { BOUDOIR, HALL, RECORDS, UPSTAIRS, upstairsZoneAt, zoneAt } from '../world/layout';
import { ANSWER, checkLock, LD, ldActive, ldObjective, ldStage, LOCK_PICTURES, savedWheels, wheelChange, type Found } from './lastDance';

const done = { completed: { finale: true } } as never;
const notDone = { completed: { finale: false } } as never;
const flags = (...ids: string[]): Found => Object.fromEntries(ids.map((k) => [k, true]));

describe('the Last Dance: where the student is in the mystery', () => {
  it('stays locked until the nine lessons and the letter are finished', () => {
    expect(ldStage({}, notDone)).toBe('locked');
    expect(ldObjective({}, notDone)).toBeNull();
    expect(ldActive({}, notDone)).toBe(false);
  });

  it('walks through every step in order, one discovery at a time', () => {
    const order = [LD.started, LD.journal, LD.door1, LD.ledger, LD.key, LD.door2, LD.scare, LD.end];
    const stages = ['intro', 'diary', 'paintings', 'records', 'key', 'ladyDoor', 'mirror', 'message', 'done'];
    for (let i = 0; i <= order.length; i++) {
      const f = flags(...order.slice(0, i));
      expect(ldStage(f, done)).toBe(stages[i]);
      expect(ldObjective(f, done)).toBe(OBJECTIVES[stages[i] as keyof typeof OBJECTIVES]);
    }
  });

  it('keeps the house at night only while the mystery is under way', () => {
    expect(ldActive({}, done)).toBe(false);
    expect(ldActive(flags(LD.started), done)).toBe(true);
    expect(ldActive(flags(LD.started, LD.journal, LD.door1, LD.ledger, LD.key, LD.door2, LD.scare, LD.end), done)).toBe(false);
  });
});

describe('the picture lock', () => {
  it('wants the four paintings the clues describe, in the clue order', () => {
    expect(ANSWER).toEqual(['coldFeet', 'deafeningSilence', 'D07', 'D16']);
    expect(JOURNAL.clues.map((c) => c.text)).toEqual([
      'The threshold she could not cross.',
      'The silence after the final dance.',
      'The reflection where no mirror stood.',
      'The single illuminated window.',
    ]);
  });

  it('every answer is on the wheels, and every picture has an image', () => {
    for (const a of ANSWER) expect(LOCK_PICTURES.some((p) => p.id === a)).toBe(true);
    expect(new Set(LOCK_PICTURES.map((p) => p.id)).size).toBe(LOCK_PICTURES.length);
  });

  it('a wrong try says how many are right, without resetting anything', () => {
    expect(checkLock(['coldFeet', 'houseBreath', 'D07', 'D16'])).toMatchObject({ count: 3, open: false, right: [true, false, true, true] });
    expect(checkLock([null, null, null, null]).count).toBe(0);
    expect(checkLock(ANSWER).open).toBe(true);
  });

  it('remembers where each wheel was left (in the saved discoveries)', () => {
    let f: Found = {};
    const turn = (w: number, id: string) => {
      const c = wheelChange(w, id);
      for (const k of c.clear) delete f[k];
      f = { ...f, [c.set]: true };
    };
    turn(0, 'coldFeet');
    turn(2, 'D04');
    turn(2, 'D07');
    expect(savedWheels(f)).toEqual(['coldFeet', null, 'D07', null]);
  });

  it('the wheel flags survive a save and a reload', () => {
    const s = freshSave(CONTENT);
    const c = wheelChange(3, 'D16');
    const back = restoreSave(JSON.parse(JSON.stringify({ ...s, found: { ...s.found, [c.set]: true, [LD.journal]: true } })), CONTENT);
    expect(savedWheels(back.found)[3]).toBe('D16');
    expect(back.found[LD.journal]).toBe(true);
  });
});

describe('the two rooms upstairs', () => {
  const up = () => boxesFor('upper');

  it('are their own zones only on the upper floor (the gallery and dining room are below them)', () => {
    expect(zoneAt(-12, RECORDS.ledger.x, HALL.landing.y + 1.65)).toBe('records');
    expect(zoneAt(-12, RECORDS.ledger.x, 1.65)).toBe('dining');
    expect(zoneAt(-13, -3, HALL.landing.y + 1.65)).toBe('boudoir');
    expect(zoneAt(-13, -3, 1.65)).toBe('gallery');
    expect(upstairsZoneAt(-9, 0)).toBeNull();
  });

  it('a shut door closes its doorway; an open one lets you walk through and stay on the upper floor', () => {
    // Shut (the doorway collider is active): walking north into the doorway is stopped at the wall.
    setDynamicCollider('test:door', upstairsDoorway(UPSTAIRS.records.doorX), true, 'upper');
    const [, zShut] = resolveCircle(UPSTAIRS.records.doorX, HALL.zBack - 0.1, undefined, up());
    expect(zShut).toBeGreaterThan(HALL.zBack);
    removeDynamicCollider('test:door');
    // Open: the same step goes through the doorway, and the floor stays the upper one.
    const [x, z] = resolveCircle(UPSTAIRS.records.doorX, HALL.zBack - 0.1, undefined, up());
    expect(z).toBeLessThan(HALL.zBack);
    expect(floorAfter('upper', x, z)).toBe('upper');
  });

  it('the walls hold you in (no falling out of a room into the rooms below)', () => {
    for (const r of [UPSTAIRS.records, UPSTAIRS.boudoir]) {
      const [xw] = resolveCircle(r.x0 + 0.1, -10.85, undefined, up());
      expect(xw).toBeGreaterThanOrEqual(r.x0 + 0.27);
      const [xe] = resolveCircle(r.x1 - 0.1, -10.85, undefined, up());
      expect(xe).toBeLessThanOrEqual(r.x1 - 0.27);
      const [, zs] = resolveCircle(r === UPSTAIRS.records ? 2.3 : -4.3, r.zS + 0.1, undefined, up());
      expect(zs).toBeGreaterThanOrEqual(r.zS + 0.27);
    }
  });

  it('the inner walls stand clear of the corridor walls rising from below', () => {
    expect(UPSTAIRS.records.x0).toBeGreaterThanOrEqual(1.45 + 0.3);
    expect(UPSTAIRS.boudoir.x1).toBeLessThanOrEqual(-1.45 - 0.3);
  });

  it('you can stand where the mirror is looked into, and in front of the guest book', () => {
    const [x, z] = resolveCircle(BOUDOIR.mirrorSpot.x, BOUDOIR.mirrorSpot.z, undefined, up());
    expect(Math.hypot(x - BOUDOIR.mirrorSpot.x, z - BOUDOIR.mirrorSpot.z)).toBeLessThan(0.05);
    const [lx, lz] = resolveCircle(RECORDS.ledger.x, RECORDS.ledger.z + 0.75, undefined, up());
    expect(Math.hypot(lx - RECORDS.ledger.x, lz - (RECORDS.ledger.z + 0.75))).toBeLessThan(0.05);
  });
});

describe('carrying on a game saved upstairs', () => {
  const p = freshSave(CONTENT).progress;
  it('puts the student back in a room whose door they had opened, with the door open', () => {
    const w = safePlace({ x: RECORDS.ledger.x, z: RECORDS.ledger.z + 0.8, yaw: 0, upstairs: true, lesson: null }, p, flags(LD.door1));
    expect(w).toMatchObject({ zone: 'records', door: 'records', restored: true });
    expect(w.pose.position[1]).toBeCloseTo(HALL.landing.y + 1.65);
  });

  it('a room whose door is not open yet puts them in the hall instead', () => {
    expect(safePlace({ x: -3, z: -13, yaw: 0, upstairs: true, lesson: null }, p, {}).restored).toBe(false);
  });

  it('the landing itself is still restored, and older saves without the new flags still load', () => {
    expect(safePlace({ x: 2, z: -9, yaw: 0, upstairs: true, lesson: null }, p)).toMatchObject({ zone: 'hall', restored: true });
  });
});
