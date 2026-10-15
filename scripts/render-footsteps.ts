// Renders the footstep sounds to WAV files in docs/audio so they can be auditioned outside the game.
// Usage: npx vite-node scripts/render-footsteps.ts
import fs from 'node:fs';
import { analyse, renderFootstep, renderLegacyFootstep, type Surface } from '../src/systems/footstepSynth';

const SR = 44100;
fs.mkdirSync('docs/audio', { recursive: true });

function wav(samples: Float32Array) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return buf;
}

/** A short walk: steps every ~0.55 s with the in-game gain and pitch variation, plus a little room tail. */
function walk(make: (i: number) => Float32Array, steps = 8, gain = 0.5) {
  const out = new Float32Array(Math.floor(SR * (steps * 0.55 + 0.6)));
  for (let i = 0; i < steps; i++) {
    const s = make(i);
    const start = Math.floor(SR * (0.1 + i * 0.55 + (i % 2 ? 0.015 : 0)));
    const g = gain * (0.85 + ((i * 37) % 10) / 33);
    for (let k = 0; k < s.length && start + k < out.length; k++) out[start + k] += s[k] * g;
  }
  // crude room reflections
  const d1 = Math.floor(SR * 0.023);
  const d2 = Math.floor(SR * 0.041);
  for (let i = out.length - 1; i >= d2; i--) out[i] += out[i - d1] * 0.22 + out[i - d2] * 0.14;
  return out;
}

const surfaces: Surface[] = ['wood', 'carpet', 'gravel'];
for (const s of surfaces) fs.writeFileSync(`docs/audio/footsteps-new-${s}.wav`, wav(walk((i) => renderFootstep(SR, s, i))));
fs.writeFileSync('docs/audio/footsteps-old.wav', wav(walk((i) => renderLegacyFootstep(SR, i % 4), 8, 0.6)));

const fmt = (a: ReturnType<typeof analyse>) => `centroid ${a.centroid.toFixed(0)} Hz, energy below 150 Hz ${(a.lowShare * 100).toFixed(1)}%, audible ${a.audibleMs.toFixed(0)} ms`;
console.log('old   :', fmt(analyse(renderLegacyFootstep(SR, 0), SR)));
for (const s of surfaces) console.log(`${s.padEnd(6)}:`, fmt(analyse(renderFootstep(SR, s, 1), SR)));
