/** Mutable effect state for the Giant's Dining Room, written by its director and read by the scene. */

/** Dishes on the table that can grow, keyed by the place card (Challenge A item) they belong to. */
export const DISHES = ['soup', 'pie', 'laugh'] as const;
export type Dish = (typeof DISHES)[number];

export const dfx = {
  /** How big each dish should be (1 = its real size). */
  growTarget: { soup: 1, pie: 1, laugh: 1 } as Record<Dish, number>,
  grow: { soup: 1, pie: 1, laugh: 1 } as Record<Dish, number>,
  /** Everything on the table swells together (Discover, the cathedral of bread). */
  swellTarget: 0,
  swell: 0,
  /** The giant's chair looms larger and the room darkens (Challenge B's frightening hyperbole). */
  loomTarget: 0,
  loom: 0,
  /** Seconds of trembling left for the plates and cutlery. */
  rattle: 0,
  /** The giant's cloche lifting off the plate (0..1). */
  clocheTarget: 0,
  cloche: 0,
  /** What is chalked on the menu board. */
  menu: '',
};

export function resetDfx() {
  for (const d of DISHES) dfx.growTarget[d] = 1;
  dfx.swellTarget = 0;
  dfx.loomTarget = 0;
  dfx.rattle = 0;
  dfx.clocheTarget = 0;
  dfx.menu = '';
}
