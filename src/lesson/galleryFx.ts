/** Mutable effect state for the Portrait Gallery's living paintings, written by the gallery director. */
import { makeLivingFx } from '../scene/parts/Artwork';

export const gfx = {
  caretaker: makeLivingFx(),
  oldMan: makeLivingFx(),
  sitter: makeLivingFx(),
  frame: makeLivingFx(),
  /** Lightning in the caretaker's window: seconds until the next flash, and how often. */
  stormEvery: 0,
  stormTimer: 6,
  /** Empty frame swinging away from the wall to reveal the safe (0..1). */
  swing: 0,
  swingTarget: 0,
  /** Picture-light boost on the painting currently being taught. */
  spot: { caretaker: 1, oldMan: 1, sitter: 1, frame: 1 },
};

export function resetGfx() {
  for (const k of ['caretaker', 'oldMan', 'sitter', 'frame'] as const) Object.assign(gfx[k], makeLivingFx());
  gfx.stormEvery = 0;
  gfx.swing = gfx.swingTarget = 0;
}
