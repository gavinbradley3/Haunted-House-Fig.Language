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

### Phase 11: the Lady in Green

| File | Plays as | Source | Author | Licence | Changes |
|---|---|---|---|---|---|
| `giggle-1.mp3` | The Lady's laugh, far off in the house (her signature sound) | "Girl Chuckle", whole clip: https://freesound.org/people/BlueSiren/sounds/377742/ | BlueSiren | CC0 1.0 | 160 Hz high-pass, 6.5 kHz low-pass, light noise reduction, three-tap echo (140/310/520 ms) with a 1.6 s tail, fades; loudness-normalised (-20 LUFS, -3 dBTP); mono 44.1 kHz, MP3 128 kbps |
| `giggle-2.mp3`, `giggle-3.mp3` | Her laugh (shorter variants) | "Girl laughing and chuckling", 3.70–5.35 s and 5.62–6.92 s: https://freesound.org/people/BlueSiren/sounds/382998/ | BlueSiren | CC0 1.0 | As for `giggle-1.mp3` |
| `whisper-1.mp3` … `whisper-3.mp3` | Her whisper, close behind you or through a wall | "indistinctwhispering.wav", 0.10–3.50 s, 3.40–6.80 s, 6.80–10.50 s: https://freesound.org/people/BlueSiren/sounds/377743/ | BlueSiren | CC0 1.0 | Layered stereo summed to mono; 220 Hz high-pass, 9 kHz low-pass, light noise reduction, fades; loudness-normalised; MP3 128 kbps |
| `whisper-4.mp3` | Her whisper (reversed variant) | The same recording, 1.80–5.00 s, reversed | BlueSiren | CC0 1.0 | As above, reversed |
| `sigh-1.mp3` | Her sigh as a mirror fogs (Hall of Mirrors) | "Girl sighs": https://freesound.org/people/BlueSiren/sounds/377736/ | BlueSiren | CC0 1.0 | 140 Hz high-pass, 8 kHz low-pass, noise reduction, short echo, fades; loudness-normalised; MP3 128 kbps |
| `hum-1.mp3`, `hum-2.mp3` | Her humming behind the walls | "hum.wav" (a dark hummed lullaby), 0.10–5.80 s and 7.80–11.90 s: https://freesound.org/people/AlucardsBride/sounds/193938/ | AlucardsBride | CC0 1.0 | 150 Hz high-pass, 3.2 kHz low-pass (through a wall), noise reduction, echo, fades; loudness-normalised; MP3 128 kbps |
| `knock-1.mp3` … `knock-4.mp3` | Knocks inside the wall (replace the synthesised knock) | "Door knocks wood close", single knocks at 13.82, 14.12, 22.90 and 29.24 s: https://freesound.org/people/TRP/sounds/573835/ | TRP | CC0 1.0 | 0.27 s each; 60 Hz high-pass, 2.4 kHz low-pass (through a wall), 4 ms fade-in, 100 ms fade-out; mono, MP3 128 kbps |

Licence checked on each sound's Freesound page (CC0 1.0) on 2026-10-19. BlueSiren's recordings are all the uploader's own voice (stated on each page), so the laugh, whisper and sigh are one performer: the Lady.
**Unlike the Phase 6B files, these were cut from Freesound's high-quality MP3 previews (about 180 kbps), not from the original uploads**, because downloading originals needs a signed-in Freesound account. CC0 waives every right in the recording, so any copy of it, the preview included, may be used. To rebuild them from the originals, download the six sounds above while signed in and run `node scripts/phase11/make-sounds.mjs <folder of originals>`.

The haunting's images (`src/assets/haunting/`) are this project's own artwork, not third-party: `lady-apparition.webp` (the full-length Lady, 400×1024 with transparency) and `painting-ladyOfHouse-empty.webp` (her portrait with her gone) were generated by Astra from her portrait (requests: `docs/phase11/ASTRA_REQUESTS.md`); `decor-D02/D09/D12/D14-haunted.webp` are the Builder, the Young Man in Mourning, the Host and the Girl with a China Doll with her face (from the same painting, desaturated, darkened, brightness-keyed) in the darkness behind the sitter. Recipe: `scripts/phase11/make-images.cjs`.

Credit is not required by CC0; "Sound effects by Kenney (kenney.nl)" is welcome, and the Freesound authors above may be credited in the same way. The reviewed selections and source checks are recorded in the Phase 6B report (outside the repository, in HOSL-Audit).

### Phase 12: The Last Dance (bonus mystery)

Recorded sounds (`src/assets/audio/`), built by `scripts/phase12/make-sounds.mjs` from Kenney's packs (downloaded from kenney.nl on 2026-10-20; the CC0 licence file in each pack was checked):

| File | Plays as | Source | Author | Licence | Changes |
|---|---|---|---|---|---|
| `door-slam-1.mp3`, `door-slam-2.mp3` | A door slamming (the corridor door behind you after the first lesson; the Lady's door in the final encounter) | Kenney RPG Audio `doorClose_1.ogg` / `doorClose_3.ogg`, each mixed with Kenney Impact Sounds `impactWood_heavy_000.ogg` / `_001.ogg`: https://kenney.nl/assets/rpg-audio, https://kenney.nl/assets/impact-sounds | Kenney | CC0 1.0 | Door pitched down 12%, impact pitched down 20% and laid 40 ms in, 45 Hz high-pass, short two-tap room echo, fade-out; mono 44.1 kHz, peak -3 dBFS, MP3 128 kbps. The engine adds a synthesised low boom under it |
| `knock-door-1.mp3` … `knock-door-3.mp3` | Three sharp knocks on a door close by (the chapter's opening; behind you at the mirror) | Kenney Impact Sounds `impactWood_medium_000/001/002.ogg` | Kenney | CC0 1.0 | 70 Hz high-pass (no low-pass: not heard through a wall), 100 ms fade-out; as above |

Synthesised in `src/systems/audio.ts` (no files): the final sting (a falling sub-boom under a dissonant, trembling string cluster: the one loud moment in the game, kept under the master compressor), the suspense drone, the music box being cut off mid-note, the key dropping, the lock's wheel clicks. The music box's tune is the game's own original synthesised tune.

Measured in the game at the default volume (loudest 43 ms, dBFS at the master): room tone about -40, an ordinary door -27, the close knocks -23, the slam -20, the sting -15.6 (about 24 dB over the room tone). Students' own volume, mute and the menu's Gentle setting all apply; Gentle replaces the slam with a door swinging shut and leaves out the sting.

3D props (`src/assets/models/`, glTF binary), modelled in Blender 5.2 by script for this project: `scripts/phase12/blender/build_props.py` (source `.blend` and preview renders in `Desktop/hosl-asset-production/phase12/`). Material names in the files are the game's own materials, which replace them on load:

| File | What | Size |
|---|---|---|
| `ledger_stand.glb` | The guest book open on a turned walnut reading stand (the pages carry the game's painted ledger texture) | 63 KB |
| `covered_portraits.glb` | Five gilt frames leaning on the wall under dust sheets; one sheet has slipped to show a dark canvas | 469 KB |
| `vanity.glb` | The Lady's dressing table: two pedestals of drawers, turned posts, a gilt mirror frame with a carved crest (the glass is the game's live reflection) | 132 KB |
| `music_box.glb` | Walnut music box, lid open: velvet lining, brass cylinder, comb and key | 20 KB |

The green gown reuses the Ballroom's dress form; the chaise, curtains, rugs, candles and room shells are the house's existing code-built pieces. The figure in the empty frame is drawn by code (`silhouetteTexture` in `src/scene/LastDanceRooms.tsx`); the Lady in the mirror is the Phase 11 apparition image.
