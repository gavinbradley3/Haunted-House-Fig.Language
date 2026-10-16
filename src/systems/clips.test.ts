import { describe, expect, it } from 'vitest';
import { CLIP_SLOTS, slotOf } from './clips';

describe('sound clip file names', () => {
  it('match a slot by name, with or without a variant number', () => {
    expect(slotOf('whisper.mp3')).toBe('whisper');
    expect(slotOf('../assets/audio/whisper-2.mp3')).toBe('whisper');
    expect(slotOf('Giggle_1.ogg')).toBe('giggle');
    expect(slotOf('music-box.wav')).toBe('music-box');
    expect(slotOf('footsteps-above 3.m4a')).toBe('footsteps-above');
    expect(slotOf('step-wood-4.mp3')).toBe('step-wood');
  });
  it('reject names that are not slots', () => {
    expect(slotOf('scream.mp3')).toBeNull();
    expect(slotOf('whispers.mp3')).toBeNull();
  });
});

describe('Phase 6B sound slots', () => {
  it('recognise the house-sound slots', () => {
    expect(slotOf('door-open.mp3')).toBe('door-open');
    expect(slotOf('door-close.mp3')).toBe('door-close');
    expect(slotOf('book.mp3')).toBe('book');
    expect(slotOf('step-stone-2.mp3')).toBe('step-stone');
    expect(slotOf('clock-grandfather.ogg')).toBe('clock-grandfather');
    expect(slotOf('creak-floor-3.mp3')).toBe('creak-floor');
    expect(slotOf('unlock.mp3')).toBe('unlock');
  });
  it('load footsteps, doors and locks first, and rare events only on demand', () => {
    for (const s of ['step-wood', 'step-carpet', 'step-stone', 'door-open', 'door-close', 'unlock', 'creak-floor'] as const) expect(CLIP_SLOTS[s].tier).toBe('core');
    for (const s of ['fire', 'clock-grandfather', 'drip', 'book', 'page'] as const) expect(CLIP_SLOTS[s].tier).toBe('idle');
    for (const s of ['whisper', 'giggle', 'sigh', 'footsteps-above', 'music-box'] as const) expect(CLIP_SLOTS[s].tier).toBe('demand');
  });
});
