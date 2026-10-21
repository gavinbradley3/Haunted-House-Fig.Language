// Build the Last Dance's recorded sounds from Kenney's CC0 packs (kenney.nl: "Impact Sounds" 1.0 and "RPG Audio").
// Unzip the packs into one folder as kenney-impact/ and kenney-rpg/ (each with its Audio/ subfolder), then:
//   node scripts/phase12/make-sounds.mjs <folder> [outFolder = src/assets/audio]
// Needs ffmpeg: on the PATH, or give its path in FFMPEG (the build used ffmpeg-static 5.2.0).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [dir, outDir = 'src/assets/audio'] = process.argv.slice(2);
if (!dir) throw new Error('usage: node scripts/phase12/make-sounds.mjs <folder with kenney-impact/ and kenney-rpg/> [outFolder]');
const ff = process.env.FFMPEG ?? 'ffmpeg';
const src = (f) => {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
  return p;
};
const ENC = ['-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k'];

/** Loudest sample of a file, in dBFS. */
function peakOf(file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/max_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1] ?? 0);
}

/** Render a filter graph to a temporary WAV, then peak-normalise it to -3 dBFS (as every recorded clip in the game) and encode. */
function render(name, inputs, graph) {
  const wav = path.join(outDir, `${name}.tmp.wav`);
  const out = path.join(outDir, `${name}.mp3`);
  execFileSync(ff, ['-v', 'error', '-y', ...inputs.flatMap((i) => ['-i', src(i)]), '-filter_complex', graph, '-ac', '1', '-ar', '44100', wav]);
  const gain = -3 - peakOf(wav);
  execFileSync(ff, ['-v', 'error', '-y', '-i', wav, '-af', `volume=${gain.toFixed(2)}dB`, ...ENC, out]);
  fs.unlinkSync(wav);
  console.log(`${out}  ${fs.statSync(out).size} bytes, peak ${peakOf(out).toFixed(1)} dBFS`);
}

// A heavy door slammed: a door closing, pitched down a little (a bigger, heavier door), with a hard wooden impact
// laid under the moment it meets the frame, and a short room tail.
for (const [name, door, hit] of [
  ['door-slam-1', 'kenney-rpg/Audio/doorClose_1.ogg', 'kenney-impact/Audio/impactWood_heavy_000.ogg'],
  ['door-slam-2', 'kenney-rpg/Audio/doorClose_3.ogg', 'kenney-impact/Audio/impactWood_heavy_001.ogg'],
]) {
  render(
    name,
    [door, hit],
    '[0:a]asetrate=44100*0.88,aresample=44100,highpass=f=45[d];' +
      '[1:a]asetrate=44100*0.8,aresample=44100,adelay=40,volume=0.9[h];' +
      '[d][h]amix=inputs=2:normalize=0,apad=pad_dur=0.6,aecho=0.8:0.5:60|130:0.25|0.12,afade=t=out:st=0.9:d=0.35',
  );
}

// Sharp knuckle knocks on a door close by (not through a wall: no low-pass).
for (const [name, f] of [
  ['knock-door-1', 'kenney-impact/Audio/impactWood_medium_000.ogg'],
  ['knock-door-2', 'kenney-impact/Audio/impactWood_medium_001.ogg'],
  ['knock-door-3', 'kenney-impact/Audio/impactWood_medium_002.ogg'],
]) {
  render(name, [f], '[0:a]highpass=f=70,afade=t=out:st=0.22:d=0.1');
}
