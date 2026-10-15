/**
 * Footstep synthesis, kept free of the Web Audio API so it can be tested and
 * rendered to WAV files offline (see scripts/render-footsteps.mjs).
 *
 * A real step on an old hardwood floor is two events about 60–90 ms apart:
 * the heel knocks the board (a short, woody, damped resonance in the 200 Hz–3 kHz
 * range), then the sole rolls down with a quieter contact and a faint scuff.
 * There is almost no deep "thump": the previous version's loud 70 Hz sine sweep
 * was the main reason it sounded like a stomp or a drum.
 */

export type Surface = 'wood' | 'carpet' | 'gravel';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Floorboard modes: frequency (Hz), decay time constant (s), amplitude. */
const WOOD_MODES: [number, number, number][] = [
  [118, 0.018, 0.12],
  [232, 0.026, 0.55],
  [415, 0.022, 0.6],
  [760, 0.016, 0.42],
  [1380, 0.01, 0.26],
  [2650, 0.006, 0.14],
  [4100, 0.004, 0.06],
];

function addImpact(out: Float32Array, sr: number, start: number, gain: number, bright: number, r: () => number, surface: Surface) {
  const modes =
    surface === 'carpet'
      ? WOOD_MODES.slice(0, 3).map(([f, d, a]) => [f * 0.8, d * 0.6, a] as [number, number, number])
      : WOOD_MODES.map(([f, d, a], i) => [f, d, a * (i > 3 ? bright : 1)] as [number, number, number]);
  const s0 = Math.floor(start * sr);
  const len = Math.floor(0.11 * sr);
  // Each strike detunes the board slightly and gives every mode a random phase.
  const detune = modes.map(() => 0.92 + r() * 0.16);
  const phase = modes.map(() => r() * Math.PI * 2);
  let lp = 0;
  for (let k = 0; k < len && s0 + k < out.length; k++) {
    const t = k / sr;
    let v = 0;
    for (let m = 0; m < modes.length; m++) {
      const [f, d, a] = modes[m];
      v += a * Math.exp(-t / d) * Math.sin(2 * Math.PI * f * detune[m] * t + phase[m]);
    }
    // The contact transient: a burst of noise lasting about a millisecond
    const click = t < 0.0012 ? (r() * 2 - 1) * (1 - t / 0.0012) * (surface === 'carpet' ? 0.15 : 0.9) : 0;
    // Amplitude roughness breaks up the modes so they read as wood, not as tones
    const rough = 0.75 + 0.25 * r();
    lp += (v * rough + click - lp) * (surface === 'carpet' ? 0.25 : 0.85);
    out[s0 + k] += lp * gain;
  }
}

function addScuff(out: Float32Array, sr: number, start: number, dur: number, gain: number, r: () => number, centre: number) {
  const s0 = Math.floor(start * sr);
  const n = Math.floor(dur * sr);
  // Band-passed noise via a simple two-pole resonator.
  const w = (2 * Math.PI * centre) / sr;
  const q = 0.9;
  let y1 = 0;
  let y2 = 0;
  for (let k = 0; k < n && s0 + k < out.length; k++) {
    const t = k / n;
    const env = Math.min(1, t * 8) * Math.pow(1 - t, 2);
    const x = (r() * 2 - 1) * env;
    const y = x + 2 * q * Math.cos(w) * y1 - q * q * y2;
    y2 = y1;
    y1 = y;
    out[s0 + k] += y * gain * 0.12;
  }
}

/** Gravel: many tiny stone clicks spread over the step. */
function addGravel(out: Float32Array, sr: number, r: () => number) {
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(r(), 1.6) * 0.16;
    const s0 = Math.floor(t * sr);
    const f = 1800 + r() * 4500;
    const a = (0.15 + r() * 0.5) * (1 - t / 0.2);
    for (let k = 0; k < sr * 0.006 && s0 + k < out.length; k++) {
      const tt = k / sr;
      out[s0 + k] += a * Math.exp(-tt * 900) * Math.sin(2 * Math.PI * f * tt + r());
    }
  }
}

/** Render one footstep. Returns mono samples normalised to a 0.9 peak. */
export function renderFootstep(sr: number, surface: Surface, seed: number): Float32Array {
  const r = rng(seed * 7919 + (surface === 'wood' ? 1 : surface === 'carpet' ? 2 : 3));
  const out = new Float32Array(Math.floor(sr * 0.26));
  if (surface === 'gravel') {
    addGravel(out, sr, r);
    addScuff(out, sr, 0.02, 0.15, 1.2, r, 2600);
  } else {
    const gap = 0.055 + r() * 0.03; // heel to sole
    addImpact(out, sr, 0.004, 1, surface === 'wood' ? 1 : 0.3, r, surface);
    addImpact(out, sr, 0.004 + gap, 0.42 + r() * 0.15, surface === 'wood' ? 1.3 : 0.3, r, surface);
    addScuff(out, sr, 0.004 + gap * 0.6, 0.06, surface === 'wood' ? 0.9 : 0.5, r, surface === 'wood' ? 3200 : 1400);
  }
  // Fade the tail and normalise
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const tail = i > out.length * 0.8 ? 1 - (i - out.length * 0.8) / (out.length * 0.2) : 1;
    out[i] *= tail;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.9 / peak;
  return out;
}

/** The previous footstep, kept only so tests can show what changed. */
export function renderLegacyFootstep(sr: number, k: number): Float32Array {
  const r = rng(20 + k);
  const n = Math.floor(sr * 0.22);
  const out = new Float32Array(n);
  const f0 = 70 + k * 9;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const thud = Math.sin(2 * Math.PI * f0 * t * (1 - t)) * Math.exp(-t * 32);
    const knock = Math.sin(2 * Math.PI * (380 + k * 40) * t) * Math.exp(-t * 90) * 0.35;
    const scuff = (r() * 2 - 1) * Math.exp(-t * 60) * 0.18;
    out[i] = (thud + knock + scuff) * 0.8;
  }
  return out;
}

/** Simple spectral measurements used by the tests. */
export function analyse(x: Float32Array, sr: number) {
  // Energy in bands via a naive DFT on the first 4096 samples.
  const N = Math.min(4096, x.length);
  const bins = 256;
  let total = 0;
  let low = 0;
  let centroidNum = 0;
  for (let b = 1; b < bins; b++) {
    const f = (b / bins) * (sr / 2);
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * f) / sr;
    for (let i = 0; i < N; i++) {
      re += x[i] * Math.cos(w * i);
      im -= x[i] * Math.sin(w * i);
    }
    const p = re * re + im * im;
    total += p;
    centroidNum += p * f;
    if (f < 150) low += p;
  }
  // Duration above -40 dB of peak
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  let last = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > peak * 0.01) last = i;
  return { centroid: centroidNum / total, lowShare: low / total, audibleMs: (last / sr) * 1000 };
}
