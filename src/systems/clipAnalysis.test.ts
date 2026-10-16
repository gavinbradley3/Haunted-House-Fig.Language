import { describe, expect, it } from 'vitest';
import { loudness, onsetTimes, peakTime } from './clipAnalysis';

const SR = 48000;
/** A click: a 5 ms burst of a sine at `amp`, at time `t`. */
function clicks(seconds: number, at: number[], amp = 0.5) {
  const d = new Float32Array(Math.round(seconds * SR));
  for (const t of at) for (let i = 0; i < 240; i++) d[Math.round(t * SR) + i] = amp * Math.sin(i * 0.3) * (1 - i / 240);
  return d;
}

describe('clip analysis', () => {
  it('finds the loudest moment of a clip (a scuff, then the heel strike)', () => {
    const d = clicks(0.6, [0.02]);
    const strike = clicks(0.6, [0.25], 0.9);
    for (let i = 0; i < d.length; i++) d[i] += strike[i];
    expect(peakTime(d, SR)).toBeGreaterThan(0.25);
    expect(peakTime(d, SR)).toBeLessThan(0.256);
  });

  it('measures loudness from the loudest 50 ms, so a quiet tail does not count', () => {
    const short = clicks(0.2, [0.05]);
    const long = clicks(2, [0.05]);
    expect(loudness(long, SR)).toBeCloseTo(loudness(short, SR), 5);
    expect(loudness(clicks(0.2, [0.05], 0.25), SR)).toBeCloseTo(loudness(short, SR) / 2, 5);
  });

  it('finds evenly spaced ticks, so a clock excerpt can start on one', () => {
    const ticks = [0.097, 1.1, 2.108, 3.103];
    const on = onsetTimes(clicks(4, ticks), SR);
    expect(on).toHaveLength(4);
    on.forEach((t, i) => expect(Math.abs(t - ticks[i])).toBeLessThan(0.011));
  });
});
