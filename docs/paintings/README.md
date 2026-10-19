# Final painting collection — integration record

Source: `Downloads/HOSL-Final-Painting-Collection/HOSL-Final-Painting-Collection/textures/` (25 WebP).
Installed byte-identical (SHA-256 checked) into `src/assets/paintings/`. The `native-png/` archive copies
are not in the game. The students' blank canvas (`emptyCanvas`) stays procedural, as the manifest specifies.

## Inventory (validated)

All 25 files: valid WebP headers, untruncated, decoded in Chrome, not blank, fully opaque, no duplicates,
dimensions exactly as the painting manifest (`HOSL-Audit/painting-inventory/PAINTING_ASSET_MANIFEST.csv`).
`painting-oldManShadow.webp` is 50,790 bytes (the earlier 0-byte export is fixed in this collection).
Records: `image-validation.json`, `webp-headers.json`.

| Game id | File | Pixels | Where |
|---|---|---|---|
| houseBreath | painting-houseBreath.webp | 1024×768 | Entrance hall, back wall |
| ladyOfHouse | painting-ladyOfHouse.webp | 768×1024 | Hall, above the fireplace (base gaze) |
| ladyOfHouseTurned | painting-ladyOfHouse-turned.webp | 768×1024 | Same canvas, swapped in place |
| deafeningSilence | painting-deafeningSilence.webp | 768×1024 | Portrait gallery, west wall |
| caretaker | painting-caretaker.webp | 768×1024 | Gallery, west wall centre |
| oldManShadow | painting-oldManShadow.webp | 768×1024 | Gallery, south wall |
| nervousSitter | painting-nervousSitter.webp | 768×1024 | Gallery, north wall |
| coldFeet | painting-coldFeet.webp | 768×1024 | Corridor, east wall |
| whisperingWalls | painting-whisperingWalls.webp | 768×1024 | Corridor, west wall |
| D01–D05 | decor-D01…D05-hall-*.webp | 512 on the long side | Entrance hall (landing, stair wall, east wall) |
| D06–D09 | decor-D06…D09-gallery-*.webp | 512 on the long side | Portrait gallery |
| D10–D13 | decor-D10…D13-dining-*.webp | 512 on the long side | Giant's dining room |
| D14–D16 | decor-D14…D16-nursery-*.webp | 512 on the long side | Nursery |

Each D-number is placed at exactly the scene line the manifest names (e.g. D01 → `EntranceHall.tsx:268`).

## What changed in code

- `src/systems/paintingImages.ts` (new): id → file + exact pixel size; background loading.
- `Artwork.tsx` `artTexture()`: loads the file for lesson paintings; procedural only for the blank canvas.
- `paintingScenes.ts` `artAspect()`: uses the file's own pixel size.
- `Furnishings.tsx` `Painting`: takes `art="D01"…`; height comes from the image's aspect ratio
  (frame heights move by at most 3 mm; nothing is stretched or cropped).
- 16 decorative call sites in EntranceHall, PortraitGallery, DiningRoom, Nursery.
- `src/content/paintingAssets.test.ts` (new, 29 tests): files present, sizes, Lady pair, blank canvas.

Unchanged: painting ids, titles, museum text, lesson content, interactions, effects shader, frames.

## Verification

- Lady states differ only in her head and hair (5.4% of pixels, box x 220–488, y 20–341; 29 stray pixels
  elsewhere): `screenshots/lady-states-diff.png`. Swap works in game (`screenshots/compare-lady.png`).
- Moths still circle the waiting portrait's head (her head sits ~32% from the top; the effect centres at 38%,
  so the swarm centres near her chin) and the caretaker's lightning flashes as before
  (`screenshots/compare-effects-gallery.png`). The blank canvas is identical to the release.
- In game: 25/25 textures loaded at their recorded size, 24/24 hung canvases at their image's exact aspect,
  9/9 lesson paintings still interactive, no console errors. Every painting: `screenshots/ingame/`,
  original vs final: `screenshots/original/` and `compare-*.png`.
- Performance (UHD 630, Low; original → final): frame time within ±0.5 ms in five views, draw calls equal,
  shader programs equal, no mid-game shader compiles (compile-probe: 0), painting GPU memory 64 → 54 MB
  (`perf-low.json`).
