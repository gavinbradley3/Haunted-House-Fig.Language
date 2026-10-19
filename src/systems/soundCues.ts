/**
 * Named sound cues with written captions. A room registers each sound it can make
 * (and what happens in the room when it plays); the lesson panel and directors play
 * them by name. Every cue shows its caption on screen, so nothing depends on hearing.
 */
interface Cue {
  play: () => void;
  caption: string;
}

const cues = new Map<string, Cue>();
const listeners = new Set<(caption: string) => void>();

export function registerCue(id: string, caption: string, play: () => void) {
  cues.set(id, { play, caption });
  return () => {
    if (cues.get(id)?.play === play) cues.delete(id);
  };
}

/** Play a cue and show its caption. Returns false if no room has registered it. */
export function playCue(id: string): boolean {
  const c = cues.get(id);
  if (!c) return false;
  c.play();
  for (const l of listeners) l(c.caption);
  return true;
}

/** Show a caption without a registered cue (for sounds a director plays directly). */
export function showCaption(caption: string) {
  for (const l of listeners) l(caption);
}

export function onCaption(fn: (caption: string) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

const houseListeners = new Set<(caption: string) => void>();

/**
 * Caption one of the house's own noises (a creak, a knock, steps somewhere else). Shown according to
 * the student's caption setting: by default only when their sound is off, so a student playing
 * muted in a busy classroom still notices that something happened.
 */
export function showHouseCaption(caption: string) {
  for (const l of houseListeners) l(caption);
}

export function onHouseCaption(fn: (caption: string) => void) {
  houseListeners.add(fn);
  return () => void houseListeners.delete(fn);
}
