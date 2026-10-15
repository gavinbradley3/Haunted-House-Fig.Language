/**
 * Recorded sound clips, all optional. Drop audio files into `src/assets/audio/`
 * named after a slot below (for example `whisper.mp3`, or `whisper-1.mp3`,
 * `whisper-2.mp3` for variants) and rebuild. A slot with no file keeps the
 * synthesised sound, or its event simply does not happen.
 *
 * See docs/SOUNDS.md for what to look for in each slot.
 */

export const CLIP_SLOTS = {
  /** Background music, looped quietly under exploration and lower during lessons. */
  music: 'loop',
  /** Wind outside the house, looped. Replaces the synthesised wind. */
  wind: 'loop',
  /** Soft, unintelligible whispering, heard close behind you. */
  whisper: 'event',
  /** A single child's giggle, far away in the house. */
  giggle: 'event',
  /** A few notes of a music box from another room. */
  'music-box': 'event',
  /** Slow footsteps on the floor above. */
  'footsteps-above': 'event',
  /** A tired sigh or breath near a painting or mirror. */
  sigh: 'event',
  /** An old door creaking open. Replaces the synthesised door creak. */
  'door-creak': 'replace',
  /** Your own footsteps on wooden boards. Replaces the synthesised wood steps. */
  'step-wood': 'replace',
  /** Your own footsteps on a rug. Replaces the synthesised carpet steps. */
  'step-carpet': 'replace',
} as const;

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
