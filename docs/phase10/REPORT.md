# Phase 10 report: individual Chromebook play, visual refinement and an inhabited mansion

Branch `phase10-chromebook`, started from `b97e658` (tag `phase9-paintings-complete`). **Nothing is committed, pushed, merged or deployed.** `main`, `origin/main` and every classroom-release tag are untouched; the last verified release (`classroom-release-v2-audio`, and `phase9-paintings-complete`) can be rebuilt at any time.

**How things were verified, and where.** Every result below is labelled:
- **[auto]** automated test (unit tests, or a browser script driving the real game);
- **[laptop]** measured on this Windows laptop with Intel UHD 630 integrated graphics, Chrome, Low graphics, 1366×768 window. The laptop is *not* a Chromebook; Chromebook GPUs are usually slower;
- **[not verified]** not checked yet. **Nothing has been tested on a real school Chromebook, and no person has listened to any sound.** Loudness figures are measurements of the game's audio output, not listening tests.

---

## 1. Chromebook graphics restrictions

- Students always play on **Low**. The student build has no Balanced or High choice anywhere, ignores a quality saved by an older version, and `setQuality` does nothing in it. **[auto]** an old saved "High" setting is ignored: the 3D view is drawn at Low's resolution (canvas ≤ 1093 px wide for a 1366 px window).
- Higher presets exist only in development and test builds (`npm run dev`, `npm run build:test`).
- **Automatic resolution scaling within Low** (new): if the frame rate stays under 24 fps for two 3-second windows, the 3D view drops to 85 %, then 72 %, of Low's resolution; it steps back up after 12 s above 50 fps. Menus, lesson text and captions are HTML on top of the 3D view, so they stay sharp. **[auto]** with the CPU throttled 8× the scale dropped as designed (see §13).
- Low's existing optimisations (no ambient occlusion, no MSAA, capped 1280-pixel width, reduced reflections) are unchanged.

## 2. Individual student controls

| Control | Status |
|---|---|
| W A S D / arrows, Shift | Unchanged; **[auto]** real-key walking in the student build |
| Mouse or trackpad look (pointer lock) | Unchanged, plus a **Look speed** slider (0.4×–2.5×) in the Menu |
| Trackpad without pointer lock | **New:** a two-finger swipe over the house turns the view; click-and-drag still works |
| Pointer-lock refusals | **Fixed:** Chrome refuses re-locking just after Esc (and some managed devices refuse always); the refusal is now caught instead of throwing an error |
| E / click to use | Unchanged; E also closes the new diary page |
| Esc | Frees the pointer; the next Esc opens the **Menu** anywhere in play, including during a lesson (students need volume control there too) |
| Menu button (≡, top right) | **New**, for students who do not know Esc; moves to the left during lessons whose panel is on the right |
| Painting inspection | Unchanged; **[auto]** all 25 in the regression run |
| Lesson navigation, writing fields | Unchanged, plus: the sentence field gets focus automatically, is limited to 220 characters, and has spell-checking |
| Saving and resuming | See §4 |

New guidance for students unfamiliar with first-person games: the hint over the house now shows *W A S D walk · E use · Esc menu* and *Trackpad: slide two fingers to turn*; the **Menu** has a plain-language "How to play" table; and **the next step is always shown** in the bottom-left corner (for example "Unlock the Portrait Gallery door (the long corridor, on the left) with the Mirror Key."), worked out from the student's saved progress. It never reveals answers.

## 3. Teacher-panel security and access

- The teacher panel (pause/skip, reveal answer, reset question/lesson, jump to any stage, skip ahead through the key chain, reset all progress, jump to rooms, atmosphere and graphics settings) is **not in the student build at all**: the module is replaced with an empty stub at build time, the **T** key and the key button are gone, and the "For the teacher" notes on paintings are left out. **[auto]** the student bundle contains none of "Skip ahead", "Reveal the answer", "Teacher Controls", "Reset all progress", "For the teacher" or the test hook `__hosl`.
- Student-facing reset was also removed: the end card's "Start again with a new class" now exists only in the teacher edition.
- **Teacher edition** (`npm run build:teacher`): the full game plus the teacher panel, with two additions: **Student's writing** (the sentence that passed each room's check) and **Undo the last reset**.
- **How a teacher recovers a student's game:** publish the teacher edition in an unlisted sub-folder of the *same site*; browsers keep saves per site, so it opens that student's save on their Chromebook. **[auto]** student save → teacher edition shows Continue → skip ahead → student build sees the change and still has no panel → reset → undo restores it.
- **Honest limit:** with no server or accounts, the unlisted folder is concealment, not security. A student who learns the address can only change their own save on their own Chromebook. The alternative (never publish the teacher edition) is described in [TEACHER_GUIDE.md](TEACHER_GUIDE.md). No password or hidden shortcut was added, as either would be easy to bypass.

## 4. Student progress saving (verified)

One versioned record, `hosl.save` (version 2), holds: completed rooms, keys, unlocked doors, every lesson's stage and answers, written sentences, writing-check ticks, the draft being typed, **the sentence that passed each room's check** (kept even if a lesson is replayed), optional discoveries, **where the student was standing (and whether upstairs)**, and **the lesson that was open**.

- **When it saves:** every lesson and progress action immediately; typing 0.4 s after a pause; the student's place every 4 s while moving; and on tab close, page hide or the Chromebook sleeping.
- **Continue:** the title offers *Continue* with "N of 9 rooms complete. Next: …". Continue puts the student back where they were, but only in a room their keys allow and not inside furniture or walls (otherwise the entrance hall), opens that room's door behind them, and reopens their lesson.
- **Safety:** a damaged save is set aside under `hosl.save.damaged` and the game continues from `hosl.save.backup` (refreshed at every completed room, key and door), then from the old-format keys; a save written by a newer version is never overwritten; nothing is written until the student has entered the house, so opening the title screen can never replace a save; if the game is open in two tabs, the older one stops saving and says so; old-format saves (`hosl.progress`, `hosl.lessons`) are carried over, and those keys are still written so the previous release can still read the progress (rollback-safe); a teacher reset keeps the previous game in `hosl.save.beforeReset`.
- **[auto]** 21 unit tests: exact round trip, migration, damaged save → backup, damaged without backup → old keys, tampered values ignored, newer version untouched, two tabs, storage unavailable, storage full, reset and undo, the next-step guide across the whole key chain, and safe placement.
- **[auto]** student build, real input only: walk to the corridor → reload → Continue returns to the corridor; two tabs → the older one shows the warning. Upstairs: reload → Continue returns to the landing. Browser: a deliberately corrupted save → title says it was damaged, Continue keeps 2 of 9 rooms, damaged copy kept.
- **[not verified]** survival across sign-out and restart **on a real Chromebook** under the school's policies (browser closing and reloading were tested on Windows Chrome). This is the first thing to check on a Chromebook.

## 5. ChromeOS persistence limitations

Progress belongs to **one Chromebook, one school account, one web address**. A different Chromebook, account, guest/incognito window or address (a new Netlify link, `http` vs `https`) starts a new game. Deleting the profile or clearing the site's data deletes it. If a policy clears browsing data at sign-out, saving cannot work; the checklist tests this first. When storage is refused, the title says "This browser window cannot save your progress…" instead of failing silently. The game asks the browser for persistent storage (best effort).

## 6. Accessibility and audio

- **Student Menu:** mute and volume, my footsteps on/off, captions for the house's sounds (*when sound is off* by default / always / never), look speed, how active the house is (Normal / Gentle / Off), full screen, "I'm stuck: take me to the entrance hall" (press twice), what to do next, and the save status.
- **Captions:** lesson sounds were already captioned. Every new house sound has a caption (in square brackets, top centre, never during a lesson). By default they appear only when the student's sound is off or at 0 %, so a student playing muted in a busy classroom still notices that something happened. **[auto]** none while sound is on; shown once muted. No challenge depends on hearing a sound.
- **Readability on Chromebook screens:** the lesson type was sized for a projector. On screens up to 820 px tall (1366×768, 1280×720) it is now about 15–20 % smaller, so more of each stage fits without scrolling; large screens are unchanged. Checked by screenshot at 1366×768 and 1280×720. Contrast is unchanged (cream on near-black).
- **Recovery messages:** graphics context lost → "The house needs a moment … Your progress is saved" with Reload (**[auto]** triggered with a real context loss); a crash → a card with Reload instead of a blank page; storage blocked, full or newer → explained on the title and in the Menu.
- **Individual language (1C):** every Prove task's "With a partner, …" is now individual; "Talk with a partner" prompts became "Think it through" / "Before you check, …"; "Say it aloud" became "say it quietly to yourself" (a quiet classroom); "Check the class's answer" → "Check my answer"; "Class self-check" → **"My writing check"**; "Type a student's simile" → "Type your simile here"; "From the class" → "Your sentence"; criteria "The class can …" → "I can …"; the end card says "You learned to read it" and "You wrote". The task demands and success criteria are otherwise unchanged.
- **One instructional change, made for independent use:** "Reveal a model answer" is now "Compare with a model answer" and unlocks only after the student has written their own sentence (a teacher previously decided when to reveal it).

## 7. Instructional focal-object inventory

Method: every lesson camera shot (38) captured on Low at 1366×768; each object judged by how much of the frame it fills when the lesson points at it and what gives it away as artificial. Contact sheets: `scripts/out/phase10/sheet-A.png`, `sheet-B.png`.

| Rank | Room | Object | Lesson moments | Screen share | Was | What looked artificial | Change | Poly Haven option | Cost | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ballroom | Two waltzing dress forms | Discover, Learn, Challenge B; lesson start | ~15 % (centre) | Cone + ball | Read as chess pawns | **Done:** crinoline gowns on dressmaker's forms: pleated bell skirt, fitted bodice, bertha, puffed sleeves, sash, turned neck post; waltz kept | None suitable | +7k tris, 0 textures, 0 programs | High |
| 2 | Ballroom | Chairs under dust sheets | In every ballroom shot | ~5 % each | Cone + ball | Six more "pawns" | **Done:** sheets draped over a seat and chair back, folds to the floor | None | ~0 | High |
| 3 | Nursery | Rocking horse | Discover, Challenge A | ~10 % | Capsules on sticks | Featureless toy | **Done:** carved dapple-grey horse: barrel body, carved head profile, ears, bridle, mane, horsehair tail, saddle, stirrups, galloping legs on bow rockers; rock and sulk kept | None (no rocking horse) | 1 × 256² texture | High |
| 4 | Whispering Press | The hand press | Discover, Challenges, key | ~10 % | Two boxes and a slab | Not recognisable as a press | **Done:** Albion iron press: arched crowned frame (one casting), rails and front leg, tympan raised with its sheet, spindle, bar handle with wooden grip, rounce; platen strike kept | None | +14 draws, 0 textures | High |
| 5 | Nursery | Dollhouse | Challenge A ("watching") | ~6 % | Box + lopsided pyramid | Not a house | **Done:** miniature of the mansion: slate roof, two chimneys, cornice, string course, portico with pediment, glazing bars; blinking windows kept | None | +~30 small draws | Medium |
| 6 | Entrance Hall | Fireplace | Finale (Lady shot), arrival | ~8 % | See §9 | See §9 | **Done (Stage 5)** | — | see §9 | High |
| 7 | Crooked Kitchen | Spilled beans, cake, pot | Discover, Learn | 5–10 % | Simple shapes | Beans read as an orange blob | Not changed | `tea_set_01`, `vintage_candlestick` (dressing only) | — | Medium (next) |
| 8 | Hall of Mirrors | Mantel clock on the console | Speaking, clock shots | ~3 % | Lathe + face | Plain but credible at Low | Not changed | `mantel_clock_01` (CC0, rigged) | 1–2 textures | Low |
| 9 | Chamber of Echoes | Piano, gramophone, pipe and bucket | Challenge A items | 5–10 % | Procedural | Credible at Low | Not changed | — | — | Low |
| 10 | Scholar's Study | Desk, evidence books | Challenge A | ~10 % | Procedural | Credible | Not changed | `decorative_book_set_01` | — | Low |
| 11 | Dining Room | Table, cloche, giant's chair | Discover, Challenge A | 15 % | Procedural | Credible | Not changed | — | — | Low |
| 12 | Portrait Gallery | Lesson paintings | All stages | 20 % | Phase 9 images | Already high quality | Not changed | — | — | — |

Why procedural rather than imported models for 1–5: none exists in Poly Haven's CC0 library (Sketchfab is switched off in this Blender setup), each object has to keep its lesson animation (waltzing, rocking and sulking, the platen striking, blinking windows), and building in code adds no texture memory or download. Blender was connected (5.2 LTS) and used to search Poly Haven; no asset was imported. The Phase 7 GLB pipeline is ready for the clock and book candidates if wanted.

Before/after screenshots: `scripts/out/phase10/cmp-ballroom.png`, `cmp-nursery.png`, `horse-close.png`, `dollhouse-close.png`, `press-close.png`, `lesson-shots-before/` and `lesson-shots-after/`.

## 8. 3D asset changes

See §7 (rows 1–5) and §9. Measured cost **[laptop]**: nursery 437 → 474 draw calls, 37k → 39k triangles; ballroom 500 → 523 draws, 52k → 60k triangles; press 322 → 336 draws. Shader programs 35 → 41 in total (all Phase 10 additions), all compiled at the title screen. A NaN in the first version of the skirt geometry (32-bit rounding under a fractional power) blacked out the whole ballroom through the bloom pass; it was found by scanning the scene for non-finite vertices and fixed before measurement.

## 9. Fireplace: before and after

| | Before | After |
|---|---|---|
| Firebox | A flat arch painted on the iron insert | A real recess in the chimney breast: firebrick back, splayed iron cheeks, a sloping throat |
| Fuel | 26 bright-orange blobs and two plain cylinders in front of the opening | Three charred, knotted logs in a basket grate inside the arch; their cracks glow from underneath and breathe slowly; a few small glowing coals |
| Flames | None | Six crossed sheets of scrolling, domain-warped noise with ragged tips and tongues that tear off; colour from deep red to a yellow-white core |
| Embers | None | 22 sparks rising and fading inside the firebox |
| Light | The hall's fire light on a regular flicker | The same single light (no new lights, no shadows), driven by the same irregular fire level as the flames (slow swells, fast flutter, occasional flares), drifting a few centimetres |
| Audio | `fire.ogg` | Unchanged |

**[laptop] Cost:** 3 meshes (one draw call each), 3 shader programs (compiled at the title screen), no textures. In-session A/B (hiding only the new fire meshes): close-up 21.8 ms vs 21.9 ms per frame; hall view 23.4 vs 23.5 ms: no measurable difference. Screenshots: `scripts/out/phase10/fireplace/compare-close.png` (three frames 0.7 s apart each, before and after), `compare-close2.png` (final), `compare-hall.png` (from the front door). Movement was judged from frame sequences, not watched in real time by a person.

## 10. Haunting director

**The problem, from the code:** the old system already fired something every 22–50 s, so frequency was not the issue. Events were hard to notice: several were silent visual changes out of view, and the five most noticeable (whisper, giggle, music box, sigh, footsteps above) needed sound files that were never supplied, except footsteps above.

**Design.** The director tracks free exploring time, walking vs standing still, whether the view is turning (looking around vs reading), time in the room, the last events and their kinds, upstairs vs downstairs, and the lesson state. After a quiet spell (Normal: first at 28–42 s, then 34–68 s, with occasional lulls 1.8× longer; Gentle: 70–95 s, then 80–150 s) it chooses one event by context-weighted chance:

- *Walking:* footsteps that echo yours a beat late and take one step more after you stop; steps in the next room; a door ahead drifting slightly open or closed (never a locked door).
- *Standing still and looking around:* something shifts behind you; three knocks inside the wall (sometimes a fourth); a faint whisper.
- *Lingering:* knocks, a door settling elsewhere, furniture dragged overhead, footsteps crossing above.
- *Looking up at the landing or down the corridor:* a soft dark shape crosses far away (6–16 m), under a second.
- *Upstairs:* light under the Lady's door breaks as something passes, with soft steps behind it.
- Plus earlier events: creak, distant door, the hall clock stopping, a lamp stuttering, a crooked painting, the Lady turning her head, a draught, the lights sinking, a mirror fogging; and a new one: the hall's side chair found moved.

Rules: never during a lesson, painting, diary, menu, notice or cutscene, and quiet for 15 s after any of them; nothing while the student seems to be reading or away (still and not looking around for 20 s); never the same event twice running or the same kind three times; per-event cooldowns of 70–400 s; Gentle leaves out the startling ones (behind you, whisper, echo, shadow, lights sinking). Only existing sounds are used: the approved recordings (`footsteps-above`, `step-wood`, `creak-floor`, `door-close`, music box) and the game's own synthesised knock, whisper, creak and groan. **No new audio files.**

**Is it noticeable? [laptop, measured on the game's output]** Each event triggered in its situation, peak loudness of the final mix against the ambience just before:

| Event | Peak | Above ambience |
|---|---|---|
| Footsteps above | −33 dBFS | +6.2 dB |
| Steps in the next room | −37 | +7.6 |
| Knocks | −29 | +10.9 |
| Floorboard creak | −38 | +5.7 |
| Door settles | −34 | +10.0 |
| Something behind you | −32 | +6.7 |
| Whisper | −34 | +10.1 |
| Furniture dragged above | −35 | +4.9 |
| Gust | −25 | +10.2 |
| Lights sink (groan) | −29 | +13.9 |
| Steps behind the Lady's door | −35 | +8.2 |
| Mirror fogs | −29 | +9.0 |

The first measurement found footsteps above at only 0–3 dB, "behind you" at 4 dB, and the whisper, next-room steps and steps behind the Lady's door below 4 dB (likely missed, as in your walkthrough); they were raised. Knocks were lowered 2 dB. Every sound event now peaks 5–14 dB over the room's ambience and below the lesson sounds (−23 to −38 dBFS per the Phase 6C notes). **[not verified]** how they actually sound to a listener.

**A natural session [auto, real time]:** 7 minutes on Normal (walking, standing, lingering, a lesson open for 1 minute, the corridor, the mirrors, the landing): **7 events**, gaps 39–127 s (mean 59 s), no back-to-back repeats, **0 during the open lesson**: footsteps above ×2, something behind you, a crooked painting, the shadow on the landing, steps in the next room, the mirror fogging. Gentle, 6 minutes: 3 events (0.5 a minute), gaps 90–190 s, none of the startling ones. Visual events were screenshotted as they happened: `scripts/out/phase10/haunt-gallery/`. The shadow figure is deliberately faint; against bare wallpaper it was invisible, so its landing path now crosses in front of the lit painting and candle.

## 11. Upstairs: the Lady's landing

- **Navigable:** the rope is gone and the 19-step staircase can be climbed. Collision now has three levels (ground floor, stairs, landing), because the landing sits over the corridor arch and the study door: the stairs can only be entered from the bottom, the balustrade and walls keep you on the landing, and you can walk back down.
- **What is there:** the Lady's own door (locked; light shows underneath, and now and then something passes behind it); a second door left ajar with warm light behind it that swings quietly shut as you approach and stays shut ("a music box plays two notes and stops"); a console under the landing's marine painting (inspectable) with a candle and **her diary, open at a page** written the night she began her letter. It echoes the letter's own lines (the moon over the garden, waiting, "the stairs groan under every visitor") and contradicts nothing in it; it adds that her rooms are behind these doors and the rest of the floor is under dust sheets. Underneath, an optional prompt: *Can you find a simile? And where does something that is not human act like a person?* The landing also gives a view across the hall to her portrait.
- **Rewarded, not required:** finding the diary is saved and mentioned on the end card ("Not every visitor climbs the stairs"). No key, door or lesson depends on it. "I'm stuck" works from the landing, and Continue returns students to it.
- **[auto]** climbing with real keys (eye height reaches 5.05 m), corner label "The Upper Landing", landing remembered, the ajar door shuts on approach, diary opens by click and closes with Esc, Lady's door locked, balustrade stops you, save → Continue upstairs, "I'm stuck" brings you down, walking back down: 16/16. 6 unit tests for the stair/landing collision.
- **[laptop]** upper landing 45.8 fps; hall looking up at the landing 42.3 fps.

## 12. Performance

**[laptop]** Production test bundles, Low, 1366×768, Chrome with the frame-rate cap off, resolution guard off so every place is measured at the same resolution, nothing else using the GPU. Same script and machine for both versions.

| Place | Phase 9 fps | Phase 10 fps | Phase 10 p95 frame | Draw calls | Triangles |
|---|---|---|---|---|---|
| Hall, entering | 39.9 | 40.7 | 40 ms | 1637 | 170k |
| Hall, fireplace | 47.2 | 48.6 | 54 ms | 768 | 67k |
| Hall, looking up at the landing | 42.2 | 42.3 | 40 ms | 1611 | 169k |
| Upper landing | 42.4 | 45.8 | 55 ms | 1125 | 106k |
| **Corridor (slowest)** | 31.1 | 31.8 | 66 ms | 1831 | 186k |
| Hall of Mirrors | 35.3 | 35.8 | 30 ms | 3136 | 390k |
| Portrait Gallery | 53.5 | 53.6 | 36 ms | 421 | 39k |
| Dining Room | 38.2 | 37.5 | 77 ms | 918 | 93k |
| Nursery | 49.2 | 50.0 | 39 ms | 474 | 39k |
| Chamber of Echoes | 43.4 | 43.3 | 48 ms | 650 | 45k |
| Whispering Press | 55.1 | 52.6 | 90 ms | 336 | 27k |
| Crooked Kitchen | 58.2 | 57.9 | 33 ms | 361 | 31k |
| Ballroom | 51.6 | 47.2 | 46 ms | 523 | 60k |
| Scholar's Study | 52.8 | 49.3 | 94 ms | 341 | 31k |

| | Phase 9 | Phase 10 |
|---|---|---|
| Load to title screen | 16.5 s | 15.2 s |
| Shader programs | 35 | 41 |
| Programs compiled after the title (stutters) | 0 | 0 |
| Textures in GPU memory | 178 | 181 |
| JS heap | 219 MB | 221 MB |
| Audio | core clips after the first click, ambience later, rare clips on demand (unchanged) | same |

Reading: Phase 10 performs the same as Phase 9 within run-to-run noise (an earlier run with a second Chrome window open measured both versions about 40 % lower, so differences of a few fps are not meaningful). The ballroom's −4 fps may be the gowns (+7k triangles); it remains well above the slowest place. The 90 ms p95 spikes in the press and study occur in both versions (shadow-map refresh) and were not introduced here. On this laptop Low runs at 32–58 fps; **a Chromebook may run at half that or less**, which is what the automatic resolution guard is for. **[not verified]** any Chromebook frame rate.

## 13. Production-build and gameplay tests

| Test | Build | Input | Result |
|---|---|---|---|
| Unit tests (lesson logic, content, progression, saving, guide, placement, stairs, collision, clips, footsteps, GPU tier) | — | — | **167 / 167** (27 new) |
| Typecheck | — | — | Clean |
| Full student playthrough: 9 rooms, final lesson, every key and door, writing checkpoints, 25 paintings, the Lady’s gaze, staff portraits | dev (no-watch) | real mouse/keys for interaction; teleport between standing spots | **213 / 213** after Stages 1–2 and again on the final code |
| Student build smoke: title, no hook, no T panel, menu, real-key walking, save, reload, Continue, two tabs | **student production build** | real only | **24 / 24** |
| Teacher recovery on a same-site deployment | student + teacher production builds | real only | **13 / 13** |
| Upper landing | dev | real keys/mouse, teleports to set up | **16 / 16** |
| Captions when muted, graphics-lost card, resolution guard under 8× CPU throttle, damaged save, old "High" ignored | dev + student build | mixed | **9 / 9** |
| Haunting director: gallery and natural sessions | dev | mixed | §10 |
| Performance tour | test production builds | — | §12 |

**Final results, all on the finished code:** full playthrough **213 / 213** with every Phase 10 change in place; student-build smoke **24 / 24** on the rebuilt student bundle; browser checks **9 / 9**: no house captions while sound is on and captions once muted; a real graphics-context loss shows the recovery card; under 8× CPU throttling the 3D resolution stepped down 1 → 0.72 (pixel ratio 0.80 → 0.58) while menus stayed HTML; a corrupted save is reported on the title, Continue keeps the progress from the backup, and the damaged copy is kept; an old saved "High" setting is ignored by the student build (canvas 1092 px wide for a 1366 px window); the student menu has no graphics choices. The final student bundle contains none of the teacher strings, the test hook, "With a partner" or "Class self-check".

The student build can be tested only through its real controls (no hook), so the full 213-check playthrough still runs against the development build; the student build is covered by the smoke and teacher-recovery tests above, and by scanning the bundle for teacher and test strings.

## 14. Remaining classroom risks

1. **No real Chromebook test yet.** Frame rate, trackpad feel, pointer lock under school policy, and saving across sign-out are all unverified on ChromeOS. Run [CHROMEBOOK_CHECKLIST.md](CHROMEBOOK_CHECKLIST.md) first.
2. **A sign-out data-clearing policy would defeat saving.** Nothing in a client-side game can work around it.
3. **Memory pressure.** On this laptop, with little free memory, Chrome's GPU process crashed once during testing and a long-running dev server ran out of memory. Chromebooks with 4 GB may hit context loss; the game now shows a recovery card and keeps progress, but students should close other tabs.
4. **The teacher edition is unlisted, not locked** (§3).
5. **Sounds unheard by a person.** Levels are measured; whether the house feels "inhabited but not frightening" needs a listen with headphones, and a check with one or two students. Gentle and Off exist for anxious students.
6. **Students can still guess** through Challenge A/B options by elimination (as before); writing checks remain self-assessed by design. The teacher edition's "Student's writing" view makes it quick to review.
7. Typing in the sentence box on a Chromebook with an on-screen keyboard (tablet mode) is untested.

## 15. Recommendations for the next release

1. Run the Chromebook checklist on two models (the oldest and the most common) with a student test account, including sign-out and restart.
2. Listen to the haunting with headphones for ten minutes on Normal and Gentle; adjust `PACE` and the event levels in `src/scene/HouseEvents.tsx` if needed.
3. Next focal objects: the Crooked Kitchen's beans, cake and pot (rank 7), then the mirror-room mantel clock (Poly Haven `mantel_clock_01` via the Phase 7 pipeline).
4. If school policy allows, record a few unintelligible whisper clips (`whisper-1.mp3`…) so the whisper event uses a recording (see `docs/SOUNDS.md`).
5. Consider a teacher "class export" later only if teachers need to collect writing; it was deliberately not added (no accounts, no cloud).

## Files

New: `src/state/save.ts`, `src/lesson/guide.ts`, `src/lesson/place.ts`, `src/lesson/resume.ts`, `src/ui/Menu.tsx`, `src/ui/Recovery.tsx`, `src/ui/NoteCard.tsx`, `src/scene/UpperLanding.tsx`, `src/scene/HauntFigure.tsx`, tests `src/state/save.test.ts`, `src/world/stairs.test.ts`, scripts in `scripts/phase10/`, docs in `docs/phase10/`.
Changed: store, App, Player (look speed, trackpad swipe, floors), collision and layout (stairs), GameCanvas (resolution guard, context loss), HouseEvents (rewritten), Fireplace (rewritten), Door/KeyedDoor (nudge), EntranceHall (landing, chair, fire light), Ballroom, Nursery, Whispering Press, LessonPanel/Overlays/Ending/PaintingCard/TeacherPanel/SoundCaption, audio (event helpers, test meter), all ten lesson content files (wording), `vite.config.ts`, `package.json` (`build:teacher`), README.
