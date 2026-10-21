/**
 * Shared, non-reactive state for the Last Dance's 3D effects: written by the story's actions and read every
 * frame by the upstairs rooms, the landing and the hall. Nothing here is saved (the saved state is the flags).
 */
import type { MirrorFx } from '../lesson/fx';

const mirror = (): MirrorFx => ({ bright: 0, brightTarget: 0, mist: 0, mistTarget: 0, tunnel: 0, tunnelTarget: 0, ripple: 0, text: '', textAmt: 0 });

export const ldFx = {
  /** The Lady's mirror (mist and the words that surface in it). */
  mirror: mirror(),
  /** She is in the mirror (and only in the mirror): when she appeared, how long she stays, how solid (0-1). */
  lady: { start: -1e9, dur: 0, opacity: 0.9, lean: 0 },
  /** Candles in the two rooms: target brightness (1 normal; 0.15 nearly out). */
  candles: 1,
  candlesTarget: 1,
  /** The records room: when the draught from the guest book began (the coats sway, the dust sheets stir). */
  draughtAt: -1e9,
  /** The empty frame by her door: how strongly the figure shows in it (0-1), and its target. */
  frameFigure: 0,
  frameFigureTarget: 0,
  /** The mirror encounter is playing out (the camera is held on the glass until `releaseAt`). */
  scareRunning: false,
  /** Has the student turned away from the mirror since she appeared? */
  turned: false,
};

export function resetLdFx() {
  Object.assign(ldFx.mirror, mirror());
  ldFx.lady.start = -1e9;
  ldFx.candles = ldFx.candlesTarget = 1;
  ldFx.frameFigure = ldFx.frameFigureTarget = 0;
  ldFx.scareRunning = false;
  ldFx.turned = false;
}
