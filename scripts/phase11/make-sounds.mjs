// Rebuild the Phase 11 sounds (the Lady in Green, the knocks) from the Freesound recordings.
// Put the downloaded files in one folder, named by their Freesound sound ID (e.g. 377742.wav or
// 377742_6769439.mp3); the first file whose name starts with the ID is used.
// Needs ffmpeg: on the PATH, or give its path in FFMPEG.
// Usage: node scripts/phase11/make-sounds.mjs <folder> [outFolder = src/assets/audio]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [dir, outDir = 'src/assets/audio'] = process.argv.slice(2);
if (!dir) throw new Error('usage: node scripts/phase11/make-sounds.mjs <folder of originals> [outFolder]');
const ff = process.env.FFMPEG ?? 'ffmpeg';
const src = (id) => {
  const f = fs.readdirSync(dir).find((n) => n.startsWith(String(id)));
  if (!f) throw new Error(`no file for Freesound sound ${id} in ${dir}`);
  return path.join(dir, f);
};

const DN = 'afftdn=nf=-40:nr=10';
const NORM = 'loudnorm=I=-20:TP=-3:LRA=11';
const LAUGH = `highpass=f=160,lowpass=f=6500,${DN},apad=pad_dur=1.6,aecho=0.85:0.6:140|310|520:0.28|0.18|0.1,afade=t=in:d=0.06`;
const WH = `highpass=f=220,lowpass=f=9000,${DN},afade=t=in:d=0.35`;
const HUM = `highpass=f=150,lowpass=f=3200,${DN},afade=t=in:d=0.6,apad=pad_dur=1.2,aecho=0.85:0.6:160|380:0.3|0.15`;
const KN = 'highpass=f=60,lowpass=f=2400,afade=t=in:d=0.004,afade=t=out:st=0.17:d=0.1';

// [output, Freesound id, start s, length s, filter]
const CUTS = [
  ['giggle-1', 377742, 0.05, 2.88, `${LAUGH},afade=t=out:st=3.4:d=1.0,${NORM}`],
  ['giggle-2', 382998, 3.7, 1.65, `${LAUGH},afade=t=out:st=2.2:d=1.0,${NORM}`],
  ['giggle-3', 382998, 5.62, 1.3, `${LAUGH},afade=t=out:st=1.9:d=1.0,${NORM}`],
  ['whisper-1', 377743, 0.1, 3.4, `${WH},afade=t=out:st=2.7:d=0.7,${NORM}`],
  ['whisper-2', 377743, 3.4, 3.4, `${WH},afade=t=out:st=2.7:d=0.7,${NORM}`],
  ['whisper-3', 377743, 6.8, 3.7, `${WH},afade=t=out:st=2.9:d=0.8,${NORM}`],
  ['whisper-4', 377743, 1.8, 3.2, `areverse,${WH},afade=t=out:st=2.5:d=0.7,${NORM}`],
  ['sigh-1', 377736, 0, 2.6, `highpass=f=140,lowpass=f=8000,${DN},afade=t=in:d=0.08,apad=pad_dur=0.5,aecho=0.8:0.5:90|200:0.2|0.1,afade=t=out:st=2.4:d=0.7,${NORM}`],
  ['hum-1', 193938, 0.1, 5.7, `${HUM},afade=t=out:st=5.6:d=1.3,${NORM}`],
  ['hum-2', 193938, 7.8, 4.1, `${HUM},afade=t=out:st=4.0:d=1.3,${NORM}`],
  ['knock-1', 573835, 13.82, 0.27, KN],
  ['knock-2', 573835, 14.12, 0.27, KN],
  ['knock-3', 573835, 22.9, 0.27, KN],
  ['knock-4', 573835, 29.24, 0.27, KN],
];

for (const [name, id, ss, t, af] of CUTS) {
  const out = path.join(outDir, `${name}.mp3`);
  execFileSync(ff, ['-v', 'error', '-y', '-ss', String(ss), '-t', String(t), '-i', src(id), '-af', af, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', out]);
  console.log(`${out}  ${fs.statSync(out).size} bytes`);
}
// Note: the cut points were found on Freesound's previews; an original may start a few milliseconds
// differently. Listen to the knocks after rebuilding (each should begin on its knock).
