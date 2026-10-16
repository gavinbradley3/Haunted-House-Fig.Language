/** Mutable effect state for the final lesson in the Entrance Hall, written by its director. */
export const ffx = {
  /** Brightness of the hall's candles (1 = normal). The finale dims them, then brings them back. */
  hallTarget: 1,
  /** The Lady over the fireplace has turned to look at the class. */
  ladyTurned: false,
  /** Night (0) to dawn (1) in the sky outside. */
  dawnTarget: 0,
  dawn: 0,
  /** What is written on the letter standing on the mantel (Prove). Empty hides it. */
  mantel: '',
};

export function resetFfx() {
  ffx.hallTarget = 1;
  ffx.ladyTurned = false;
  ffx.dawnTarget = 0;
  ffx.mantel = '';
}
