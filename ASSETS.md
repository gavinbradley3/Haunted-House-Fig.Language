# Assets and Licences

## Summary

This project contains **no third-party art, models, textures, or audio files**. Code generates every visual and sound when the game loads.

The reason: the development environment's network policy blocked every 3D-asset host we tried, including Poly Haven, ambientCG, Freesound, and the jsDelivr CDN (each returned an HTTP 403 policy denial). We downloaded nothing, so there is nothing to license and nothing to attribute.

## What is generated, and where

| Asset | How it is made | File |
|---|---|---|
| Wood floors (planks, herringbone parquet), walnut and mahogany veneer | Tileable value-noise wood grain with growth rings, pores, plank gaps and wear; albedo + roughness + normal maps | `src/systems/textures.ts` |
| Damask wallpapers (olive, forest green, ochre) | Canvas-drawn symmetrical damask motif, half-drop repeat, aging and fibre noise; motif is glossier and raised | `src/systems/textures.ts` |
| Marble, plaster, stone, brick, slate, gravel, grass | Procedural noise patterns with seamless tiling | `src/systems/textures.ts` |
| Persian rugs and stair runner | Canvas-drawn borders, medallion and field motifs with knot noise and wear | `src/systems/textures.ts` |
| Oil paintings (Phase 1, minor works) | Canvas-painted landscapes, seascape, portrait silhouette and still life with brush noise, varnish and craquelure | `src/systems/textures.ts` |
| The curated paintings (Phase 2): *The House That Held Its Breath*, *A Deafening Silence*, *The Caretaker Was a Storm*, *Cold Feet*, *The Whispering Walls*, *The Old Man Was a Shadow*, *Portrait of a Lady, Waiting*, *The Lady of the House* (two versions) | Original compositions drawn in code, then repainted by a brush-stroke pass (strokes follow the image's edges), with varnish, canvas weave and craquelure | `src/systems/painterly.ts`, `src/systems/paintingScenes.ts` |
| Footsteps (wood, carpet, gravel; 8 variants each) | Modal synthesis of a heel strike on floorboards, a sole contact and a scuff. Rendered to WAV for listening by `scripts/render-footsteps.ts` (files in `docs/audio/`) | `src/systems/footstepSynth.ts` |
| Thunder, key pickup, lock, distant door, house groan | Web Audio synthesis | `src/systems/audio.ts` |
| Clock face, brass door plaques | Canvas with Cormorant Garamond type | `src/systems/textures.ts` |
| Mirror silvering ("foxing") | Procedural edge and spot mask used by the mirror shader | `src/systems/textures.ts` |
| Mouldings, panelling, doors, staircase, furniture, chandeliers, sconces, fireplace, facade, roof, trees | Swept 2D profiles, lathe profiles, bevelled extrusions, recursive branching | `src/systems/geometry.ts`, `src/scene/**` |
| Night sky, moon, stars, clouds | GLSL shader | `src/scene/Sky.tsx` |
| Mirror reflections and effects | Planar reflection render + GLSL shader | `src/scene/parts/Reflection.tsx` |
| Wind, room tone, clocks, footsteps, creaks (stick-slip synthesis), door latch, fire, mechanisms, shimmer, reverb | Web Audio API synthesis | `src/systems/audio.ts` |

## Third-party code (npm packages)

All of these are open-source libraries installed through npm, not art assets:

- three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing: MIT
- react, react-dom, zustand: MIT
- `three/examples/jsm/environments/RoomEnvironment.js`: MIT (part of three.js). Generates a neutral studio environment for reflections in code.

## Fonts

- **Cormorant Garamond** (headings, in-world text): SIL Open Font License 1.1, via `@fontsource/cormorant-garamond`
- **Literata** (instruction text): SIL Open Font License 1.1, via `@fontsource/literata`

Both fonts are bundled with the build, so the game works without an internet connection.

## Painting quality, honestly

The paintings are drawn by code, not painted by an artist and not produced by an image generator (none was available). Landscapes and interiors read as convincing dark oil paintings. Portraits read as naive, dark folk portraits by an unknown hand: faces are modelled with soft light and shadow but are simpler than real 19th-century portraiture. Each painting is a single function in `src/systems/paintingScenes.ts`, and the painting system accepts any canvas or image, so you can replace one with a licensed or commissioned image without touching the game logic (see `artTexture()` in `src/scene/parts/Artwork.tsx`).

## Temporary or replaceable assets

None of these are placeholders in the "grey box" sense, but you could improve the following with licensed scanned assets (for example CC0 material scans from Poly Haven or ambientCG) if network access allows later:

- Wood and marble textures (procedural, 512 to 1024 px)
- Furniture upholstery (simple shapes with a velvet material, no sewn detail)
- The grandfather clock hood and the chaise longue are simplified models
- Audio is synthesised. Recorded foley would sound more natural, especially the door creak and footsteps. The footsteps were rebuilt in Phase 2 and measured (see `IMPLEMENTATION_STATUS.md`), but have not been listened to by the developer: listen to `docs/audio/footsteps-new-wood.wav` against `footsteps-old.wav`.
- Portrait paintings (see above): the strongest candidates for replacement with real artwork.

## Third-party assets

None yet. Recorded sound clips can be added to `src/assets/audio/` (see `docs/SOUNDS.md`). List each one here with its source URL, author, licence and any changes you made.
