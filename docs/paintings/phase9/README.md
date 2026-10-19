# Phase 9: Victorian painting experience

Branch `feature/victorian-3d-assets`, uncommitted. Nothing has been committed, pushed, merged or deployed. GitHub `main` and the tag `classroom-release-v2-audio` are untouched.

## 1. Problems found at baseline

Measured in the running game at 1920×1080 and 1366×768, Low quality, on an Intel UHD 630. Baseline captures are in `baseline/` and `baseline-1366/`.

- **Visibility.** Several canvases were barely lighter than the dark walls around them at walking distance: D09 (11 on a 0–255 scale), D15 (14), D11 (20), whisperingWalls (22), D08 (24), D04 and D05 (25). emptyFrame is dark on purpose.
- **Interaction.** Only the 9 lesson paintings could be examined. The 16 decorative paintings had no interaction and no description.
- **Inspection.** The old card cropped and shrank the art, the text took priority over the picture, and there was no zoom.
- **Moths.** The waiting portrait's moths circled at about 38% of the canvas height, while her head is at about 32%.
- **Reach.** The raycast stopped at 4 m, so the high hall paintings could never be targeted.

## 2. What changed

### Lighting and materials (no new lights, passes or glow)
- **Picture fill.** All 25 paintings now share one material program, `living-painting`. A shared uniform `PICTURE_FILL = 0.42` adds `albedo × 0.42` to the emissive term. A painting therefore keeps its own dark and light values: black stays black, and nothing glows or blooms. The old flat decorative emissive of 0.06 is removed.
- **Rooms unchanged.** Wall brightness beside every painting is the same before and after, within ±0.5 on a 0–255 scale. Table in §5.
- **Moth effect.** The moth loop now sits behind a uniform branch, so paintings without moths pay nothing for it.

### Interaction
- All 25 paintings are interactive. You look at a painting and press **E** ("Look closer at the painting"). Decorative paintings use the id `painting-D01` to `painting-D16`.
- The reach is 4.2 m. Paintings hung above 3 m reach 12 m, so the hall landing and stair paintings can be examined from the floor.
- The camera no longer moves. **Esc** or **Close** returns the player to the same position and view.
- The viewer stays out of the way during lessons. Lesson interactions, the hidden title for oldManShadow, the caretaker's "Begin the lesson here", the lightning, the fade and the Lady's gaze are all unchanged.

### Museum viewer (`src/ui/PaintingCard.tsx`, `src/index.css`)
- **Whole painting.** The full image is contain-fit, never cropped, and its aspect error is under 1%. It fills 88–92% of the viewer height. The label sits beside it in a narrow column (270–380 px) and moves below it on narrow or portrait screens.
- **Zoom.** Zoom goes from 1× to 4×. The mouse wheel zooms at the cursor, and +/−, double-click and drag-to-pan all work. **Whole painting** or the 0 key fits the painting again.
- **Inspection images.** The viewer loads a sharper copy, at native size (about 1100×1450), only when a painting is opened. These are 25 files totalling about 6 MB, in `src/assets/paintings/inspect/`, made by `scripts/paintings/make-inspect.mjs`. The in-game textures are unchanged.
- **Blank canvas.** The student canvas (emptyFrame) shows the student's own sentence if one is written, and is otherwise blank.

### Descriptions
`src/content/decorPaintings.ts` holds 16 museum labels, each with a title, a medium and date line, and a note of 26–40 words. Each note describes only what is painted. Notes on the mystery paintings point the eye ("Look long enough, and the room looks back.") but never explain anything.

## 3. Inventory of the 25 interactions

| Room | Paintings |
|---|---|
| Entrance hall | houseBreath, ladyOfHouse (two gaze states), D01 A Ship Becalmed at Dusk, D02 Portrait of the Builder of the House, D03 A Lane by Moonlight, D04 Still Life with Keys and a Snuffed Candle, D05 Lighthouse in a Gale |
| Long corridor | whisperingWalls, coldFeet |
| Portrait gallery | caretaker, oldManShadow, nervousSitter, deafeningSilence, emptyFrame, D06 The Sea at Dawn, Like a Ploughed Field, D07 Still Life with a Pewter Jug, D08 A House by the Lake, Night, D09 Portrait of a Young Man in Mourning |
| Giant's dining room | D10 A Feast Fit for a Giant, D11 The Sleeping Hill, D12 Portrait of a Host, D13 A Wave as High as a Mountain |
| Nursery | D14 Girl with a China Doll, D15 The Willow Leaning to Listen, D16 The Dolls' House at Night |

## 4. Checks

| Check | Result | Evidence |
|---|---|---|
| Moths centred on the waiting portrait's head | Pass. The loop centre moved from (0.50, 0.62) to (0.48, 0.66). | `moths/compare-moths.png` |
| "She Never Left" clues found by zooming in | Pass: the figure reflected in the pewter jug (D07), the figure in the lit dolls'-house window (D16), and the figure seen from behind in deafeningSilence. coldFeet and the Lady are intact. No clue text, no quest, and the Lady's Letter and the ending are unchanged. | `evidence/sheet-clues-lady.png`, `evidence/clue-*-zoom.png` |
| The Lady's two gaze states | Pass, both in the viewer and from the hall. The viewer always shows her current state. | `evidence/lady-*` |
| Staff likenesses (caretaker, Old Man) | Unchanged from Phase 8 and shown in the viewer. | `evidence/staff-*` |
| Blank student canvas | Pass: blank until a sentence is written. | E2E |
| Responsive viewer | Pass at 1920, 1600, 1366 and narrow widths. | `after/sheet-inspect.png`, `after-1366/` |

## 5. Walking-distance canvas brightness (1920×1080, Low, mean 0–255)

| Painting | Canvas before → after | Wall before → after |
|---|---|---|
| D09 gallery portrait | 10.8 → 20.6 | 6.2 → 6.1 |
| D15 nursery willow | 14.4 → 37.8 | 24.4 → 24.3 |
| D11 sleeping hill | 19.5 → 30.9 | 15.3 → 14.9 |
| whisperingWalls | 22.0 → 35.5 | 21.0 → 21.0 |
| D08 lake house | 23.6 → 31.5 | 11.0 → 11.0 |
| D04 keys still life | 24.5 → 32.6 | 18.8 → 18.0 |
| D05 lighthouse | 24.7 → 28.6 | 21.0 → 20.6 |
| D13 wave | 26.8 → 44.8 | 8.6 → 9.1 |
| D16 dolls' house | 28.7 → 47.6 | 36.1 → 36.2 |
| deafeningSilence | 38.4 → 83.1 | 7.3 → 7.3 |
| nervousSitter | 33.1 → 38.2 | 11.8 → 11.6 |
| emptyFrame (dark by design) | 5.9 → 8.2 | 8.5 → 8.5 |

All 25 rows are in `baseline/` and `after/walkthrough-1920x1080.json`. The visual before/after is `compare-walk-dark-rooms.png`; in the comparison sheets, left is before Phase 9 and right is after.

## 6. Performance (UHD 630, Low, 1600×900)

Phase 8 baseline compared with Phase 9, alternating A B A B. Data in `perf-low.json`.

| View | Mean frame ms | Draw calls | Textures | Programs |
|---|---|---|---|---|
| Hall, Lady | 28.3 → 28.2 | 733 → 733 | 126 → 127 | 30 → 30 |
| Hall entry | 29.4 → 29.2 | 1073 → 1066 | 126 → 127 | 30 → 30 |
| Gallery, caretaker | 26.9 → 25.6 | 372 → 372 | 137 → 137 | 32 → 31 |
| Gallery north | 22.3 → 21.8 | 293 → 286 | 137 → 137 | 32 → 31 |
| Dining room | 28.2 → 28.6 | 514 → 522 | 144 → 144 | 32 → 31 |

- **Loading.** Time to the title screen was 15.97 s before and 16.10 s after, which is within noise.
- **Shader compilation.** There is one fewer program, because decorative paintings now share `living-painting`.
- **Repeated inspection.** Over 32 open/close cycles, the JS heap went from 273.6 to 273.9 MB after garbage collection. GPU textures stayed at 132 and programs at 31, and no `<img>` elements were left behind. The first open takes 19–30 ms and repeat opens about 12 ms. Frame time is 22.7 ms with the viewer closed and 24.1 ms with it open. Data in `evidence/report.json`.

## 7. Automated tests

- **Type check.** `npx tsc -b` is clean.
- **Unit tests.** `npx vitest run` passed: 10 files, 140 tests.
- **Production build.** The test hook is stripped. The build contains 25 in-game WebPs, 25 inspection WebPs and no PNGs, about 13 MB in total.
- **Playthrough.** `scripts/e2e/playthrough.mjs` passed 213 checks with 0 failures and 0 page errors. Results are in `e2e-results.json`. It plays as a student would, by looking and pressing E with no teacher shortcuts. It covers:
  - all nine rooms, with the class sentence and self-check in each
  - keys and doors
  - the writing box, the final challenge and the ending
  - all 25 paintings: open, uncropped, zoom and fit, Esc back to the same place

## 8. Blender frame kit (Part 10): deferred

The pilot frame kit still has an unresolved seam where the corner pieces meet the rails. As the brief allows, it stays preview-only, and the game keeps its existing frames. Fix the seam in Blender before swapping the frames in.

## 9. Known limitations

- **D09.** The young man in mourning is mostly black paint on a dark wall in the darkest corner of the gallery. He is now visible at walking distance, but he is still the hardest painting to read until you step closer.
- **High hall paintings (D01–D03).** They look small from the floor, as real paintings hung that high would. They can be examined from the floor.
- **The Lady's gaze.** The change is subtle from the far side of the hall. This is intended, but it is worth a human eye.
- **Inspection images** add about 6 MB to the build. They are fetched only when a painting is opened.

## 10. Recommended human walkthrough

On a classroom PC at Low quality, check the following:
1. Walk each room and confirm that every painting reads without the room looking brighter.
2. Press E on a few decorative paintings and zoom in on the jug, the dolls' house and deafeningSilence.
3. Play one lesson through and check that the viewer never appears during it.
4. Confirm that the moths sit around the waiting woman's head.
