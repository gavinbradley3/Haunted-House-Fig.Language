/**
 * Measurements taken once from each recorded clip when it is decoded, so the engine can
 * play recordings of different loudness and timing consistently. Pure functions on sample data.
 */

/** RMS of the loudest 50 ms window: how loud a short clip sounds at its peak. */
export function loudness(data: Float32Array, sampleRate: number) {
  const win = Math.max(1, Math.round(0.05 * sampleRate));
  const hop = Math.max(1, win >> 2);
  let best = 0;
  for (let i = 0; i + win <= data.length || i === 0; i += hop) {
    let s = 0;
    const end = Math.min(data.length, i + win);
    for (let k = i; k < end; k++) s += data[k] * data[k];
    best = Math.max(best, s / Math.max(1, end - i));
    if (end === data.length) break;
  }
  return Math.sqrt(best);
}

/** Seconds from the start of a clip to its loudest moment (the heel strike, the bolt, the slap). */
export function peakTime(data: Float32Array, sampleRate: number) {
  let p = 0;
  let k = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > p) (p = a), (k = i);
  }
  return k / sampleRate;
}

/** Start times (s) of distinct clicks or hits: 10 ms frames rising above 30% of the loudest frame, at least `gap` s apart. */
export function onsetTimes(data: Float32Array, sampleRate: number, gap = 0.3) {
  const hop = Math.max(1, Math.round(0.01 * sampleRate));
  const env: number[] = [];
  for (let i = 0; i + hop <= data.length; i += hop) {
    let s = 0;
    for (let k = i; k < i + hop; k++) s += data[k] * data[k];
    env.push(Math.sqrt(s / hop));
  }
  const top = Math.max(0, ...env);
  const out: number[] = [];
  let armed = true;
  for (let i = 0; i < env.length; i++) {
    const t = (i * hop) / sampleRate;
    if (armed && env[i] > top * 0.3) {
      if (!out.length || t - out[out.length - 1] >= gap) out.push(t);
      armed = false;
    }
    if (env[i] < top * 0.12) armed = true;
  }
  return out;
}
