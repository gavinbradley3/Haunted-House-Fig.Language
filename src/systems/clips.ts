/**
 * Recorded sound clips, all optional. Drop audio files into `src/assets/audio/`
 * named after a slot below (for example `whisper.mp3`, or `whisper-1.mp3`,
 * `whisper-2.mp3` for variants) and rebuild. A slot with no file keeps the
 * synthesised sound, or its event simply does not happen.
 *
 * Each slot has a loading tier, so the game never decodes every clip at start-up:
 *  - `core`: needed within seconds of entering (footsteps, doors, locks). Decoded right after the first click.
 *  - `idle`: room ambience and lesson sounds. Decoded one at a time in the background, a little later.
 *  - `demand`: rare events. Decoded the first time they are wanted (that first time falls back to the synth or is skipped).
 *
 * See docs/SOUNDS.md for what to look for in each slot, and ASSETS.md for the sources of the files in use.
 */

export type ClipTier = 'core' | 'idle' | 'demand';

export const CLIP_SLOTS = {
  /** Background music, looped quietly under exploration and lower during lessons. */
  music: { use: 'loop', tier: 'idle' },
  /** Wind outside the house, looped. Replaces the synthesised wind. */
  wind: { use: 'loop', tier: 'idle' },
  /** The Lady in Green: soft, unintelligible whispering, close behind you or in the next room. */
  whisper: { use: 'event', tier: 'demand' },
  /** The Lady in Green's laugh: soft, a little echoing, far away in the house. Her signature; used sparingly. */
  giggle: { use: 'event', tier: 'demand' },
  /** The Lady in Green humming a few bars, muffled, from another room. */
  hum: { use: 'event', tier: 'demand' },
  /** A single knuckle knock on wood, heard through a wall. The haunting director spaces them itself. */
  knock: { use: 'replace', tier: 'idle' },
  /** A few notes of a music box from another room. */
  'music-box': { use: 'event', tier: 'demand' },
  /** Slow footsteps on the floor above. */
  'footsteps-above': { use: 'event', tier: 'demand' },
  /** The Lady in Green's sigh, near a painting or mirror. */
  sigh: { use: 'event', tier: 'demand' },
  /** An old door creaking open, played after the synthesised latch. Kept for older sound packs; `door-open` is preferred. */
  'door-creak': { use: 'replace', tier: 'core' },
  /** A whole door opening (handle and creak). Replaces the synthesised latch and creak. */
  'door-open': { use: 'replace', tier: 'core' },
  /** A door closing and latching. Replaces the synthesised creak, thud and latch. */
  'door-close': { use: 'replace', tier: 'core' },
  /** A key turning in an old lock. Replaces the synthesised unlock. */
  unlock: { use: 'replace', tier: 'core' },
  /** A single floorboard creak (under footsteps now and then, and the "creak" event). */
  'creak-floor': { use: 'replace', tier: 'core' },
  /** Your own footsteps on wooden boards. Replaces the synthesised wood steps. */
  'step-wood': { use: 'replace', tier: 'core' },
  /** Your own footsteps on a rug. Replaces the synthesised carpet steps. */
  'step-carpet': { use: 'replace', tier: 'core' },
  /** Your own footsteps on stone flags (the Crooked Kitchen, the porch). Without it, the wood step plays brighter and thinner: a stand-in, not a stone sound. */
  'step-stone': { use: 'replace', tier: 'core' },
  /** A book falling open or shutting (the Scholar's Study evidence books). */
  book: { use: 'event', tier: 'idle' },
  /** A page turning (the Lady's letter, the press proof). */
  page: { use: 'event', tier: 'idle' },
  /** The Entrance Hall grandfather clock, looped. Replaces the synthesised tick-tock. */
  'clock-grandfather': { use: 'loop', tier: 'idle' },
  /** A clock ticking, used for the "tick-tock" lesson item in the Chamber of Echoes. */
  'clock-tick': { use: 'replace', tier: 'idle' },
  /** The Entrance Hall fire, looped. Replaces the synthesised crackle. */
  fire: { use: 'loop', tier: 'idle' },
  /** A single drip into the bucket (Chamber of Echoes lesson item and ambience). */
  drip: { use: 'replace', tier: 'idle' },
  /** The Last Dance: a heavy door slammed hard (a low boom is added under it). Without it, the door-close recording is driven hard. */
  'door-slam': { use: 'replace', tier: 'idle' },
  /** The Last Dance: sharp knuckle knocks on a door close by (not through a wall). Without it, a synthesised knock. */
  'knock-door': { use: 'replace', tier: 'idle' },
} as const satisfies Record<string, { use: 'loop' | 'event' | 'replace'; tier: ClipTier }>;

export type ClipSlot = keyof typeof CLIP_SLOTS;

const files = import.meta.glob('../assets/audio/*.{mp3,ogg,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Which file belongs to which slot: "whisper-2.mp3" → whisper. Unknown names are reported. */
export function slotOf(fileName: string): ClipSlot | null {
  const base = fileName.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
  const slot = base.replace(/[-_ ]?\d+$/, '');
  return slot in CLIP_SLOTS ? (slot as ClipSlot) : null;
}

/** URLs of the clip files present in this build, grouped by slot. */
export function clipFiles(): Partial<Record<ClipSlot, string[]>> {
  const out: Partial<Record<ClipSlot, string[]>> = {};
  for (const [path, url] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const slot = slotOf(path);
    if (!slot) {
      console.warn(`[sound] ${path} does not match a sound slot. Use one of: ${Object.keys(CLIP_SLOTS).join(', ')}`);
      continue;
    }
    (out[slot] ??= []).push(url);
  }
  return out;
}
