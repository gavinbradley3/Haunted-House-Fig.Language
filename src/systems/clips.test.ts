import { describe, expect, it } from 'vitest';
import { slotOf } from './clips';

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
