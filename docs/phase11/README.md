# Phase 11 — The Haunting (the Lady in Green)

Branch `phase11-haunting`. The live site is unchanged until this is approved.
The known-good build students play now is tagged `classroom-release-v3-chromebook`. A byte-identical copy of the published files is in `Desktop/HOSL-Audit/rollback/classroom-release-v3-chromebook-student-build/`.

## What students will notice

The house now has one occupant: **the Lady in Green**, the woman in the portrait above the hall fireplace. Every new effect is hers.

| | Effect | Where | How often (Normal) |
|---|---|---|---|
| A | **Her whisper**, unintelligible: just behind one shoulder, or through a wall | anywhere inside | her voice at most once every 75 s; each kind every 3–4 min at most |
| B | **Her laugh**: soft, closed-mouthed, echoing, far off. Her signature sound | anywhere inside; also just after she is seen, or after her portrait is noticed | at most every 6 min |
| C | **Unseen movement**: knocks in the wall (now recorded knuckles on wood), steps in the next room, steps overhead, her humming behind a wall, footsteps that echo yours | anywhere inside | the minor clock: one event every ~35–65 s of exploring |
| D | **Paintings that change**: her face appears in the darkness behind the sitter of the Builder (hall stair), the Young Man in Mourning (gallery), the Host (dining room) and the Girl with a China Doll (nursery) | those rooms | the painting clock: every ~2–4 min, when one can change unseen |
| E | **The watching portrait**: once a student has looked at her portrait and turned away, she is looking out at the room. Sometimes her laugh follows when they notice | entrance hall | painting clock |
| F | **The apparition** (Astra's full-length painting of her, with a faint contact shadow): she stands far off for two or three seconds (landing rail, the doorway at the end of the corridor, by the front door seen from the corridor, the far end of the Hall of Mirrors, the end of the corridor seen from the mirrors, the gallery's far wall, the dining-room window), then steps out of sight as the lamps near her stutter. Sometimes her laugh follows. Rarely, she crosses instead, and may be glimpsed at the edge of vision | hall, corridor, mirrors, gallery, dining room | first chance after 8–12 min of exploring; while she cannot be seen it stays due; then every ~6–10 min |
| E2 | **Her empty portrait** (Astra): with her back turned, the student finds the portrait empty but for the chair and curtain; looking away again, she is back. Noticing it may bring the apparition sooner | entrance hall | painting clock |
| G | **Disturbances** (existing, kept): a lamp stutters, a door drifts open, the hall chair moves, the clock stops, candles bow in a draught, the lights sink, a mirror fogs (now with her sigh) | various | minor clock |

An altered painting goes back to normal a few seconds after the student has seen it and looked away. It also goes back if they open it in the painting viewer, so the viewer always shows the real painting. The student is left unsure it happened.

**Never:** during a lesson, challenge, writing check, the painting viewer, the menu, a diary note, a notice, a cutscene or a room transition, or in the first 15 s after one. Not while a student stands still with an unmoving view (reading). No chasing, no blocking, no flashing, no loud stingers, nothing saved. "Gentle" (student menu) slows every clock and leaves out the startling events, including the apparition. "Off" stops everything.

## How it is built

- **One controller:** `src/scene/HouseEvents.tsx` (the haunting director). It runs three clocks of *exploring* time (minor, painting, apparition), with:
  - weighted random choice by what the student is doing;
  - per-event cooldowns, and a shared gap for her voice;
  - 45 s between major events, and 10 s between a major and a minor one;
  - no event twice running;
  - follow-ups (seen, then laugh);
  - look tracking (paintings change only unseen and revert after being noticed).
- **Apparition:** `src/scene/HauntFigure.tsx`. One billboard (2 triangles, one texture, 316×768), invisible at zero opacity between appearances. No lights, shadows or particles.
- **Images:** `src/assets/haunting/` (the cut-out and four altered portraits, about 140 KB). Recipe: `scripts/phase11/make-images.cjs` (reproduces the files byte for byte).
- **Sounds:** 14 files in `src/assets/audio/` (`giggle-*`, `whisper-*`, `sigh-1`, `hum-*`, `knock-*`), about 770 KB. Her voice decodes in the background a few seconds after play begins. Recipe: `scripts/phase11/make-sounds.mjs`. Sources and licences: `ASSETS.md` → "Phase 11".
- **Developer triggers** (dev server and test build only; never in the student or teacher builds):
  - open the game with `?haunt` in the address (e.g. `http://localhost:5173/?haunt`) for a panel with one button per event (forced now), plus the clocks and recent log;
  - or use `window.__hosl.forceHaunt(id, true)`, `apparitionAt(spot)`, `hauntDueNow()`, `setHauntSpeed(k)`, `settleHouse()`.

## Review

- **Sounds:** open `docs/phase11/sound-review.html` in a browser.
- **Astra artwork:** both images delivered and integrated (`docs/phase11/ASTRA_REQUESTS.md`).

## Final release check (classroom-release-v4-haunting)

Unit tests 176/176 · haunting suite 62/62 (including the empty portrait: changes unseen, noticed, back after looking away, put right by the viewer) · developer panel forces the apparition and the empty portrait 2/2 · 51 simulated minutes: 57 minor events (median gap 52 s), 9 painting changes (median 3.9 min), 4 apparitions at 10.8, 21.4, 30.3 and 40.8 min, nothing while the menu was open, no repeats · student build smoke 21/22 (the two-tab check, failing identically on v3) · save from the live v3 build resumed by the new build 9/9 · student and teacher builds separated (no developer panel or test hook in either; no teacher panel in the student build).

The earlier long-run figures below under-count majors: that bot's mouse drags clicked paintings open and stalled the run; `haunt-long.mjs` now turns the view without clicking.

## Tests (2026-10-19, this laptop: Intel UHD 630, Low graphics, 1366×768)

| Test | Result |
|---|---|
| Unit tests (`npm test`) | 175/175, including new `src/systems/hauntImages.test.ts` |
| `scripts/phase11/haunt-check.mjs`: every event runs (loudness measured); painting flow (changes unseen, noticed, reverts; viewer and lesson start put it right); nothing during lesson, viewer, menu, note, transition | 56/56 |
| `scripts/phase11/haunt-long.mjs`: 48 min of simulated exploring (×10), with lessons opened | 53 minor events, median gap 54 s (36–95); 3 painting changes; 1 apparition; her voice 13 times; 0 events in a lesson; 0 repeats; majors ≥64 s apart; 0 errors |
| Full student playthrough, `scripts/e2e/playthrough.mjs` (all lessons, keys, doors, 25 paintings, ending) | 213/213 |
| `scripts/phase11/save-compat.mjs`: a save from the live build (`index-DquA_RUP.js`) opened by the new build at the same address and profile | 9/9: same progress, Continue to the same room, nothing damaged |
| Student build smoke (`scripts/phase10/student-smoke.mjs`) | All pass except "older tab says the game is open in another tab", which **fails identically on the live build**: an existing test-timing issue, not a regression |
| Teacher build (`scripts/out/deploy-check.mjs … teacher`) | 6/6 |
| Build separation | Developer panel and test hook only in the test build; teacher panel not in the student build |
| Performance A/B (`scripts/phase10/perf-tour.mjs`, live v3 vs Phase 11, same session) | Every room within noise (fps, p50/p95). Draw calls ±1%; shader programs 41 = 41; 0 compiles after the title; load 17.1 s = 17.1 s; heap +4 MB |

Her sounds in the final mix: peaks -30 to -35 dBFS, 5–13 dB over the room's ambience. Quieter than a door closing (-24) and the lesson sounds.

**Not established here:** the real Chromebook's frame rate. The additions cost no measurable frame time on this laptop, but the Chromebook is the benchmark.
