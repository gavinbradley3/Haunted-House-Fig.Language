import { describe, expect, it } from 'vitest';
import { canCollect, galleryDoorState, initialProgress, parseProgress, progressReducer as r, type Progress, type ProgressAction } from './progression';

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

function progressReducer2(upTo: 'mirrorKey' | 'galleryOpen' | 'galleryKey') {
  return r(initialProgress(), { type: 'GRANT', upTo });
}
