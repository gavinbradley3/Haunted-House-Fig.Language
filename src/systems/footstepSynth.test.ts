import { describe, expect, it } from 'vitest';
import { analyse, renderFootstep, renderLegacyFootstep } from './footstepSynth';

const SR = 44100;

describe('footstep synthesis', () => {
  it('the old footstep was dominated by sub-150 Hz thump (the "stomp")', () => {
    const a = analyse(renderLegacyFootstep(SR, 0), SR);
    expect(a.lowShare).toBeGreaterThan(0.3);
  });

  it('wooden steps are woody, not boomy: little low-end, centroid in the knock range', () => {
    for (let seed = 0; seed < 6; seed++) {
      const a = analyse(renderFootstep(SR, 'wood', seed), SR);
      expect(a.lowShare).toBeLessThan(0.08);
      expect(a.centroid).toBeGreaterThan(350);
      expect(a.centroid).toBeLessThan(2500);
      expect(a.audibleMs).toBeLessThan(220);
    }
  });

  it('carpet is duller than wood', () => {
    const wood = analyse(renderFootstep(SR, 'wood', 3), SR);
    const carpet = analyse(renderFootstep(SR, 'carpet', 3), SR);
    expect(carpet.centroid).toBeLessThan(wood.centroid);
  });

  it('variants differ from each other (no machine-gun repetition)', () => {
    const a = renderFootstep(SR, 'wood', 1);
    const b = renderFootstep(SR, 'wood', 2);
    let diff = 0;
    for (let i = 0; i < 2000; i++) diff += Math.abs(a[i] - b[i]);
    expect(diff).toBeGreaterThan(20);
  });
});
