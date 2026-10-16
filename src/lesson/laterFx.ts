/**
 * Mutable effect state for the five later rooms, written by their directors and read by
 * their scenes. Each value eases toward its target in the scene's frame loop.
 */

/** How strongly each object glows (0..1): an object glows while its sound plays, so sound is also visible. */
export const glow: Record<string, number> = {};
export function pulse(id: string, amount = 1) {
  glow[id] = Math.max(glow[id] ?? 0, amount);
}

export const efx = {
  /** Chamber of Echoes: the room's sounds have stopped for good (completion). */
  silent: false,
  board: '',
  /** The organ bell has dropped out with the key. */
  bellTarget: 0,
};

export const pfx = {
  /** Whispering Press: how hard the press is working (0 idle, 1 thumping). */
  workTarget: 0,
  /** Lines printed on the proof hanging on the press. */
  proof: '',
  board: '',
  /** Type trays lit by Challenge A (item ids). */
  inked: new Set<string>(),
  keyTarget: 0,
};

export const kfx = {
  /** Crooked Kitchen: beans spilling out of the sack (Discover). */
  spillTarget: 0,
  spill: 0,
  /** Idioms whose real meaning has been chalked above their scene. */
  labelled: new Set<string>(),
  board: '',
  pantryTarget: 0,
};

export const bfx = {
  /** Ballroom: the phantom waltz (the dress forms turn while it plays). */
  waltzTarget: 1,
  waltz: 1,
  /** Oxymorons made visible: 'fire' (frozen flames), 'silence' (dancers freeze), 'secret' (the open case). */
  shown: new Set<string>(),
  board: '',
  caseTarget: 0,
};

export const sfx = {
  /** Study: books opened on the desk (allusion ids). */
  opened: new Set<string>(),
  board: '',
  cardTarget: 0,
};

export function resetLaterFx(room: 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study') {
  if (room === 'echoes') Object.assign(efx, { silent: false, board: '', bellTarget: 0 });
  if (room === 'press') {
    Object.assign(pfx, { workTarget: 0, proof: '', board: '', keyTarget: 0 });
    pfx.inked.clear();
  }
  if (room === 'kitchen') {
    Object.assign(kfx, { spillTarget: 0, board: '', pantryTarget: 0 });
    kfx.labelled.clear();
  }
  if (room === 'ballroom') {
    Object.assign(bfx, { waltzTarget: 1, board: '', caseTarget: 0 });
    bfx.shown.clear();
  }
  if (room === 'study') {
    Object.assign(sfx, { board: '', cardTarget: 0 });
    sfx.opened.clear();
  }
}
