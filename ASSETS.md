# Assets and Licences

## Summary

This project contains **no third-party art, models or textures**. Code generates every visual when the game loads, and every sound has a synthesised version.

Since Phase 6B, some sounds also have **recorded clips** (all CC0), listed under "Third-party assets" below. Each one replaces its synthesised version; without the files, the game falls back to the synthesis.

Early in development, the environment's network policy blocked every asset host we tried, including Poly Haven, ambientCG, Freesound and the jsDelivr CDN (each returned an HTTP 403 policy denial). That is why the visuals are generated.

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
- Audio: footsteps (wood and carpet), doors, the lock, floor creaks, books, the drip, the clocks and the fire now use recordings (see below). Gravel steps, wind, room tone, the lesson sounds and the music box are still synthesised.
- Portrait paintings (see above): the strongest candidates for replacement with real artwork.

## Third-party assets

Recorded sound clips live in `src/assets/audio/` (see `docs/SOUNDS.md`). Each one is listed here with its source, author, licence and changes.

| File | Plays as | Source | Author | Licence | Changes |
|---|---|---|---|---|---|
| `step-wood-1.mp3` | Your footsteps on wood (and, until a stone recording exists, a brighter, thinner stand-in on the kitchen and porch stone) | Kenney RPG Audio, `footstep03.ogg`: https://kenney.nl/assets/rpg-audio | Kenney (kenney.nl) | CC0 1.0 (licence file in the pack) | Trimmed, 80 Hz high-pass, mono 44.1 kHz, peak-normalised to -3 dBFS, MP3 128 kbps |
| `door-open.mp3` | Every door opening | Kenney RPG Audio, `doorOpen_2.ogg` | Kenney | CC0 1.0 | As above |
| `door-close.mp3` | Every door closing; a door closing elsewhere in the house | Kenney RPG Audio, `doorClose_4.ogg` | Kenney | CC0 1.0 | As above |
| `book.mp3` | An evidence book falling open in the Scholar's Study | Kenney RPG Audio, `bookClose.ogg` | Kenney | CC0 1.0 | As above |

| `step-wood-2.mp3` | Your footsteps on wood (second recording, alternating with the first) | "Walking On A Wooden Floor", step 2 (1.33 s, 0.6 s): https://freesound.org/people/ralph.whitehead/sounds/331451/ | ralph.whitehead | CC0 1.0 | Cut from the original WAV; 80 Hz high-pass, mono 44.1 kHz, peak -3 dBFS, MP3 128 kbps |
| `step-carpet-1.mp3` … `step-carpet-3.mp3` | Your footsteps on rugs and the corridor runner | "Footsteps on Wooden Floor and Carpet", steps 4, 5 and 6 (2.43 s, 2.98 s, 3.53 s): https://freesound.org/people/ftpalad/sounds/119913/ | ftpalad | CC0 1.0 | Cut from the original AIFF; each ends where the step meets the recording's hiss floor; otherwise as above |
| `creak-floor.mp3` | A floorboard creak under your feet now and then; a board creaking elsewhere | "Wood Creak Single V2": https://freesound.org/people/Rudmer_Rotteveel/sounds/502504/ | Rudmer_Rotteveel | CC0 1.0 | Silence trimmed; as above |
| `unlock.mp3` | A key turning in a lock (the locked doors, the hidden door, the writing box) | "Key Turning in Lock.wav", 2.92–4.57 s: https://freesound.org/people/Solar01/sounds/662888/ | Solar01 | CC0 1.0 | As above |
| `drip.mp3` | The drip in the Chamber of Echoes (lesson sound and ambience) | "Water Dripping on Thin Metal", the drip at 2.43 s: https://freesound.org/people/Elements-Library/sounds/683778/ | Elements-Library | CC0 1.0 | As above |
| `book-2.mp3` | An evidence book in the Scholar's Study (second recording) | "Page turns and book close/open", event at 4.11 s: https://freesound.org/people/exterminat/sounds/164806/ | exterminat | CC0 1.0 | As above |
| `footsteps-above.mp3` | Slow footsteps on the floor above (an occasional event in the hall and corridor) | "neighbour's footsteps", first 8 s: https://freesound.org/people/Yuval/sounds/210592/ | Yuval | CC0 1.0 | 0.4 s fade in, 0.8 s fade out; as above |
| `clock-tick.ogg` | The metronome's tick-tock (Chamber of Echoes lesson sound) | "Clock Tick 10sec (Precise Loop, CC0)": https://freesound.org/people/modusmogulus/sounds/790486/ | modusmogulus | CC0 1.0 | Whole loop; 80 Hz high-pass applied round the loop so the join stays seamless; mono 44.1 kHz, peak -3 dBFS, OGG Vorbis |
| `clock-grandfather.ogg` | The Entrance Hall grandfather clock (loop) | "Grandfather clock.wav": https://freesound.org/people/Ryding/sounds/125968/ | Ryding | CC0 1.0 | Loop cut at 12.921 s, where the tick-tock pattern repeats, with an 80 ms crossfade; light noise reduction; otherwise as for `clock-tick.ogg` |
| `fire.ogg` | The Entrance Hall fire (loop) | "Crackling Flames (loop)": https://freesound.org/people/NickTayloe/sounds/813328/ | NickTayloe | CC0 1.0 | Low-passed at 6 kHz; otherwise as for `clock-tick.ogg` |

The Freesound files were cut from the original uploads (downloaded with a Freesound account), not from Freesound's MP3 previews. Each original was checked against the preview that was reviewed (same sound ID and author, same length, waveform match).

Credit is not required by CC0; "Sound effects by Kenney (kenney.nl)" is welcome, and the Freesound authors above may be credited in the same way. The reviewed selections and source checks are recorded in the Phase 6B report (outside the repository, in HOSL-Audit).
