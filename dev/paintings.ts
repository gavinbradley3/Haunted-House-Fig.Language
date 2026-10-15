// Dev-only preview of every generated painting: open /dev/paintings.html with `npm run dev`.
// Add ?only=<id> to show one painting large.
import { artCanvas, type ArtId } from '../src/systems/paintingScenes';
const all: ArtId[] = ['houseBreath', 'deafeningSilence', 'caretaker', 'coldFeet', 'whisperingWalls', 'oldManShadow', 'nervousSitter', 'ladyOfHouse', 'ladyOfHouseTurned'];
const only = new URLSearchParams(location.search).get('only') as ArtId | null;
const t0 = performance.now();
for (const id of only ? [only] : all) {
  const c = artCanvas(id);
  if (only) c.style.height = '1300px';
  document.body.appendChild(c);
}
(window as unknown as { __done: number }).__done = performance.now() - t0;
