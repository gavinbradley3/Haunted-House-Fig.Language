import { describe, expect, it } from 'vitest';
import {
  canCollect,
  doorState,
  galleryDoorState,
  GRANT_STEPS,
  initialProgress,
  KEY_FOR_ROOM,
  parseProgress,
  progressReducer as r,
  type GrantStep,
  type KeyId,
  type LockId,
  type Progress,
  type ProgressAction,
} from './progression';
import type { RoomId } from '../content/types';

const run = (p: Progress, ...a: ProgressAction[]) => a.reduce((s, x) => r(s, x), p);

describe('progression', () => {
  it('starts with everything locked', () => {
    const p = initialProgress();
    expect(galleryDoorState(p)).toBe('locked');
    expect(canCollect(p, 'mirrorKey')).toBe(false);
  });

  it('a key cannot be collected before its room is complete', () => {
    const p = r(initialProgress(), { type: 'COLLECT_KEY', key: 'mirrorKey' });
    expect(p.keys.mirrorKey).toBe(false);
  });

  it('completing the mirrors lets the mirror key be taken exactly once', () => {
    let p = run(initialProgress(), { type: 'COMPLETE_ROOM', room: 'mirrors' });
    expect(canCollect(p, 'mirrorKey')).toBe(true);
    p = r(p, { type: 'COLLECT_KEY', key: 'mirrorKey' });
    expect(p.keys.mirrorKey).toBe(true);
    expect(canCollect(p, 'mirrorKey')).toBe(false);
    expect(r(p, { type: 'COLLECT_KEY', key: 'mirrorKey' })).toBe(p);
  });

  it('the gallery door needs the mirror key and then stays open', () => {
    let p = r(initialProgress(), { type: 'UNLOCK_GALLERY' });
    expect(galleryDoorState(p)).toBe('locked');
    p = run(p, { type: 'COMPLETE_ROOM', room: 'mirrors' }, { type: 'COLLECT_KEY', key: 'mirrorKey' });
    expect(galleryDoorState(p)).toBe('unlockable');
    p = r(p, { type: 'UNLOCK_GALLERY' });
    expect(galleryDoorState(p)).toBe('open');
    // Completing rooms again or re-collecting changes nothing
    expect(run(p, { type: 'COMPLETE_ROOM', room: 'mirrors' }, { type: 'UNLOCK_GALLERY' })).toEqual(p);
  });

  it('the gallery key comes only from completing the gallery', () => {
    let p = progressReducer2('galleryOpen');
    expect(canCollect(p, 'galleryKey')).toBe(false);
    p = r(p, { type: 'COMPLETE_ROOM', room: 'gallery' });
    p = r(p, { type: 'COLLECT_KEY', key: 'galleryKey' });
    expect(p.keys.galleryKey).toBe(true);
  });

  it('teacher overrides and reset never leave a stuck state', () => {
    const full = progressReducer2('galleryKey');
    expect(full).toMatchObject({ galleryUnlocked: true, keys: { mirrorKey: true, galleryKey: true } });
    expect(r(full, { type: 'RESET_PROGRESS' })).toEqual(initialProgress());
  });

  it('parses saved progress defensively', () => {
    expect(parseProgress('not json')).toEqual(initialProgress());
    expect(parseProgress(null)).toEqual(initialProgress());
    // An "unlocked" door without the key that opens it is impossible; ignore it.
    expect(parseProgress(JSON.stringify({ galleryUnlocked: true })).galleryUnlocked).toBe(false);
    const saved = progressReducer2('galleryOpen');
    expect(parseProgress(JSON.stringify(saved))).toEqual(saved);
  });
});

describe('the full key chain', () => {
  it('each later door needs the key from the room before it, and the final box needs the music box key', () => {
    let p = progressReducer2('galleryKey');
    expect(doorState(p, 'dining')).toBe('unlockable');
    expect(doorState(p, 'nursery')).toBe('locked');
    expect(r(p, { type: 'UNLOCK', lock: 'nursery' })).toBe(p);
    p = run(p, { type: 'UNLOCK', lock: 'dining' }, { type: 'COMPLETE_ROOM', room: 'dining' }, { type: 'COLLECT_KEY', key: 'diningKey' });
    expect(doorState(p, 'dining')).toBe('open');
    expect(doorState(p, 'nursery')).toBe('unlockable');
    p = run(p, { type: 'UNLOCK', lock: 'nursery' }, { type: 'COMPLETE_ROOM', room: 'nursery' }, { type: 'COLLECT_KEY', key: 'nurseryKey' });
    // The five later rooms, each opened by the key from the room before.
    const later: [LockId, RoomId, KeyId][] = [
      ['echoes', 'echoes', 'echoesKey'],
      ['press', 'press', 'pressKey'],
      ['kitchen', 'kitchen', 'kitchenKey'],
      ['ballroom', 'ballroom', 'ballroomKey'],
      ['study', 'study', 'studyKey'],
    ];
    for (const [lock, room, key] of later) {
      expect(doorState(p, 'desk')).toBe('locked');
      expect(doorState(p, lock)).toBe('unlockable');
      p = run(p, { type: 'UNLOCK', lock }, { type: 'COMPLETE_ROOM', room }, { type: 'COLLECT_KEY', key });
      expect(doorState(p, lock)).toBe('open');
    }
    expect(doorState(p, 'desk')).toBe('unlockable');
    p = r(p, { type: 'UNLOCK', lock: 'desk' });
    expect(doorState(p, 'desk')).toBe('open');
    // The final lesson gives no key.
    expect(canCollect(r(p, { type: 'COMPLETE_ROOM', room: 'finale' }), KEY_FOR_ROOM.finale)).toBe(false);
  });

  it('every teacher grant matches the state reached by playing', () => {
    expect(progressReducer2('deskOpen')).toMatchObject({ galleryUnlocked: true, unlocked: { dining: true, nursery: true, desk: true } });
    expect(progressReducer2('diningKey').unlocked.nursery).toBe(false);
    for (const step of GRANT_STEPS) expect(parseProgress(JSON.stringify(progressReducer2(step)))).toEqual(progressReducer2(step));
  });

  it('progress saved by the two-room version still loads', () => {
    const old = JSON.stringify({ completed: { mirrors: true, gallery: true }, keys: { mirrorKey: true, galleryKey: true }, galleryUnlocked: true });
    const p = parseProgress(old);
    expect(p.keys.galleryKey).toBe(true);
    expect(p.completed.dining).toBe(false);
    expect(doorState(p, 'dining')).toBe('unlockable');
  });

  it('a save from the five-lesson version cannot skip the five new rooms', () => {
    // That version opened the writing box with the Music Box Key.
    const old = JSON.stringify({ ...progressReducer2('nurseryKey'), unlocked: { dining: true, nursery: true, desk: true } });
    const p = parseProgress(old);
    expect(p.unlocked.desk).toBe(false);
    expect(doorState(p, 'desk')).toBe('locked');
    expect(doorState(p, 'echoes')).toBe('unlockable');
  });

  it('the writing box opens only after every device room is complete', () => {
    const p = progressReducer2('deskOpen');
    expect(Object.entries(p.completed).filter(([r, done]) => r !== 'finale' && !done)).toEqual([]);
    expect(Object.values(p.keys).every(Boolean)).toBe(true);
  });
});

function progressReducer2(upTo: GrantStep) {
  return r(initialProgress(), { type: 'GRANT', upTo });
}
