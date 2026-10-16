/** Mutable effect state for the Nursery, written by its director and read by the scene. */

export const TOYS = ['horse', 'musicBox', 'dollhouse', 'teddy'] as const;
export type Toy = (typeof TOYS)[number];

export const nfx = {
  /** How awake each toy is (0 asleep, 1 behaving like a person). */
  awakeTarget: { horse: 0, musicBox: 0, dollhouse: 0, teddy: 0 } as Record<Toy, number>,
  awake: { horse: 0, musicBox: 0, dollhouse: 0, teddy: 0 } as Record<Toy, number>,
  /** The rocking horse rocks without anyone on it (Discover). */
  rockTarget: 0,
  rock: 0,
  /** Music box lid: 0 shut, 0.4 ajar (humming), 1 wide open (the key). */
  lidTarget: 0,
  lid: 0,
  /** Seconds of shivering left for every toy (a wrong answer). */
  shiver: 0,
  /** What is chalked on the slate. */
  slate: '',
};

export function resetNfx() {
  for (const t of TOYS) nfx.awakeTarget[t] = 0;
  nfx.rockTarget = 0;
  nfx.lidTarget = 0;
  nfx.shiver = 0;
  nfx.slate = '';
}
