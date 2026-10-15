# Implementation Status

Two rooms are playable: title → arrival → entrance hall → corridor → Hall of Mirrors (simile) → Mirror Key → Portrait Gallery (metaphor) → Gallery Key. Phase 2 changes are listed in their own section below; the Phase 1 sections describe the original slice and note where Phase 2 changed it.

## What works

### World and visuals
- **Title screen** over a live 3D establishing shot of the house: moon, drifting cloud, bare trees, iron railings, warm porch and window light. It offers *Enter the House*, a sound toggle and *Skip the arrival*.
- **Arrival cinematic** (15 s, skippable with Space or a button) walks up the drive. The front doors open on cue and the camera ends standing in the hall.
- **Entrance hall** (12 × 10 m, 6.4 m high): staircase with turned balusters, a stair runner with brass rods, newel posts and a raking dado; a landing gallery on columns; panelled walnut wainscot, damask wallpaper, a cove cornice, a ceiling rose and picture rails; a marble fireplace with a basket grate, flickering embers and an overmantel portrait; a longcase clock with a swinging pendulum and hands showing real time; a chandelier and sconces; sash windows with velvet drapes; a Persian rug, centre table, settle, coat stand, chairs and a console.
- **Corridor** with a runner, sconces, paintings, and two doors with brass plaques. *The Portrait Gallery* opens with the Mirror Key (Phase 2). *The Giant's Dining Room* stays locked: it rattles and gives an in-story message.
- **Hall of Mirrors**: six gilt pier mirrors with **real planar reflections**. All mirrors on one wall share a single reflection render. Facing walls produce the "mirror in a mirror" recursion. The glass shows aged silvering ("foxing"). The room also has a speaking mirror over a marble console, a mantel clock, a candelabrum, herringbone parquet, a chaise longue, velvet curtains driven by cloth simulation over a moonlit window, and a hidden jib door disguised in the panelling.
- **Lighting**: moonlight through the windows (shadowed spotlights), flickering candle light, zone-based light levels, N8AO ambient occlusion, restrained bloom, vignette and film grain, ACES tone mapping.
- **Procedural assets**: every texture, model and sound is generated in code (see `ASSETS.md`).

### Interaction
- First-person **WASD + mouse** with pointer lock, or click-and-drag looking without it. Arrow keys work too, and Shift walks faster. Head bob, footsteps, collision with walls, furniture and closed doors, and a stepped ground level outside.
- **E or click** to use doors, mirrors and objects, with a restrained on-screen prompt. Walls block interaction rays.
- **Doors** swing on a damped spring with latch and creak sounds. Colliders switch off once a door is open.
- **Guided navigation**: *Walk to the Mirrors / Hall* plays a cinematic route and opens doors automatically. *Jump* fades and teleports.
- **Lesson camera shots** frame the curtains, the speaking mirror, the tunnel mirror and the hidden door, so the teacher never has to aim.

### The simile lesson (Discover → Learn → Play → Prove → Complete)
- **Discover**: reveal description A or B. The real curtains sway (A) or tremble nervously while the candles dim (B). The mirror writes the sentence in its glass. Discussion questions appear on request. You can't continue until both descriptions have been seen.
- **Learn** (5 cards): the word SIMILE, a definition, why writers use similes, two colour-annotated examples (described / comparison word / compared to / effect), and the "I like…" non-example. The room responds to each card (the ambience hushes for "as quiet as an empty theatre", for example).
- **Play A**: select the class's answer, then *Check*. Wrong answers get an explanation and the mirror mists. The correct answer turns a mirror into an endless receding tunnel. The panel then explains why each other option fails.
- **Play B**: each option acts out its sentence on the curtains: flutter (cheerful simile, wrong mood), slow sway (not a simile), stillness (filler "like"), or breathing (correct). Explanations follow the same pattern as Play A.
- **Prove**: type any number of student similes. Each one appears in the speaking mirror. You tick three success criteria together, and the game never auto-grades. Discussion questions, then an annotated model answer. The clock's ticking turns into slow footsteps.
- **Completion**: the mirror inscription appears and a drawer slides out with the brass Mirror Key, which the class has to take. The panel summarises the four key ideas. (Phase 1 also opened the jib door here. Phase 2 removed that: the key now opens the gallery instead.)

### Teacher controls (T)
Pause/resume, skip animation, replay the current moment, reveal answer, reset question, reset lesson, jump to any stage, walk or jump between rooms, open or close the lesson view, mute, volume, fullscreen, and graphics quality (High/Balanced/Low, with automatic step-down on High). Nothing advances on a timer.

## Verification performed

| Check | Result |
|---|---|
| `npm run typecheck` | Passes |
| `npm test`: 36 unit tests (lesson state machine, content integrity, collision, zones) | All pass |
| `npm run build` | Succeeds (one 1.5 MB JS bundle, 470 KB gzipped) |
| `scripts/shots.mjs`: scripted walkthrough of the production build in headless Chromium, 21 screenshots from the title through completion | Completed, no page errors. Screenshots inspected and used to fix issues (see below). |
| `scripts/interact.mjs`: 22 checks driven by **real** mouse clicks and key presses (Enter the House, Space to skip, W to walk, hovering and clicking a door, walking through it, T panel, lesson buttons, wrong answer, reveal, typing a simile, complete, P, M, return to the hall) | All 22 pass |

Issues found by inspecting screenshots and fixed: roof gables rotated wrongly; stacked wall openings (door + fanlight, lower + upper windows) walled over by the opening algorithm; blotchy "camouflage" wood grain; dust reading as snow; overall too dark for a projector; the curtain shot framing the curtains behind the lesson panel; revealed answers landing below the fold; white plaster reveals on door openings; and keyboard shortcuts swallowed by the teacher panel after clicking one of its buttons.

## Known limitations and honest caveats

1. **Performance on real hardware is untested.** The test machine has no GPU. Every screenshot came from a software renderer running at about 0.2–0.4 fps, so smoothness on the classroom computer is unverified. The scene uses about 13 point lights, 4 shadow maps, ambient occlusion and two extra reflection renders in the mirror room. A mid-range dedicated GPU or a recent Apple Silicon Mac should be fine. Older integrated graphics will probably need *Balanced* or *Low*, which the game selects automatically if the frame rate stays under ~34 fps. **Test on the actual classroom computer before the lesson.**
2. **No scanned or licensed assets.** The network policy blocked asset sites, so wood, marble, fabric and furniture are procedural. They look convincing at room scale but don't match photogrammetry up close. The chaise, settle and chairs are the simplest models.
3. **Audio is synthesised** (Web Audio). It is atmospheric and quiet, but the door creak and footsteps are recognisably synthetic. **Audio was never heard during testing**: headless Chromium plays no sound, so levels and mix are judged from the code only.
4. **Curtain motion and the mirror tunnel** were verified as working in still frames only. Their motion and feel have not been watched in real time.
5. **Upstairs is roped off** and the landing doors are decorative. The two corridor doors are locked by design.
6. Reflections of reflections use the main camera's projection, so deep recursion in facing mirrors is approximate. It reads as atmosphere, not as optical accuracy.
7. Outside, the house is a facade: the sides and back are plain brick and only the front was designed to be seen.
8. Pointer lock behaves differently on some school-managed browsers. Click-and-drag looking always works as a fallback.

## Recommended next steps (before building the other eight rooms)

1. **Run it on the classroom computer and projector.** Check frame rate, readability from the back row, and sound levels. Adjust `src/scene/Lighting.tsx` intensities if the projector washes out the darks.
2. **Teacher rehearsal**: run the full lesson once (about 30–40 minutes with discussion) and note any step where you wanted a different button or wording. All wording lives in `src/content/simile.ts`.
3. If asset hosts become reachable, swap the floor, wood and marble for CC0 scans (Poly Haven or ambientCG) and the door, footstep and clock sounds for recorded foley. The material system only needs new texture maps.
4. Split the JS bundle (load room content lazily) before adding more rooms.
5. ~~Generalise `lessonMachine.ts` into a per-room lesson definition.~~ Done in Phase 2.

---

# Phase 2: the Portrait Gallery and mansion enhancements

## What was built

### Keys and progression (`src/lesson/progression.ts`)
- One pure reducer holds progress: rooms completed, keys held, gallery unlocked. The browser saves it in `localStorage` (`hosl.progress`), so a refresh keeps it.
- **Mirror Key**: the simile lesson's completion opens a drawer under the speaking mirror. The key is a physical brass object; you take it with E or a click, it lifts and fades, and a key glyph appears bottom right. It cannot be taken before the lesson completes or taken twice (the interactable unregisters).
- **Gallery door**: three states. *Locked* (rattle and "The Portrait Gallery is locked."), *unlockable* (holding the Mirror Key: a lock sound, a notice, then the door swings open), and *open* (stays unlocked for good, toggles like any door). Once inside the gallery the door always opens from that side, so nobody can be shut in.
- **Gallery Key**: the metaphor lesson's completion swings the empty frame open on a hinge and reveals a wall safe with the second key. The Dining Room door recognises it ("slides into the lock, but it will not turn"). Room 3 is not built.
- **Revisits**: both lessons can be replayed after completion. Progress, keys and the open door survive.

### Teacher controls added
Lesson room selector; *Jump to Gallery*; *Stand at the key*; *Unlock the Gallery*; *Give both keys*; *Reset all progress* (two presses, relocks everything); strange events on or off; *Make something happen*; footsteps on or off.

### Footsteps (`src/systems/footstepSynth.ts`)
The old step was a low thud: 91.5% of its energy sat below 150 Hz, which reads as a stomp. The new step is modal synthesis of a heel strike on boards, then the sole landing 55 to 85 ms later, then a scuff. Each surface (wood, carpet on the three rugs, gravel outside) has 8 variants, never the same one twice running, with alternating feet. Steps fire on distance walked, not on a timer, so they stop the moment you stop. The teacher can turn them off.

| Render | Spectral centroid | Energy below 150 Hz |
|---|---|---|
| Old step | 411 Hz | 91.5% |
| New wood | 1075 Hz | 1.4% |
| New carpet | 407 Hz | 3.7% |
| New gravel | 3125 Hz | 0.6% |

**Nobody has listened to them.** The numbers show the stomp is gone; they cannot show the steps sound natural. Listen to `docs/audio/footsteps-old.wav` against `docs/audio/footsteps-new-wood.wav` (regenerate with `npx vite-node scripts/render-footsteps.ts`).

### Strange events (`src/scene/HouseEvents.tsx`)
Seven events: a distant board creak, a distant door, the hall clock stopping for a few seconds, a light stuttering near you, a painting going crooked while you look away, the Lady over the fireplace turning her head while you look away, and a draught in the mirror-room curtains. The first comes after 45 s, then one every 38 to 93 s, each with its own cooldown (60 to 200 s). Nothing fires during a lesson, cutscene, pause or inspection. Motion events are skipped when the OS asks for reduced motion.

### Paintings (`src/systems/paintingScenes.ts`, `src/scene/parts/Artwork.tsx`)
Nine original paintings with figurative titles, drawn in code then repainted by a brush-stroke pass with varnish and craquelure. Any curated painting can be inspected with E or a click: the camera frames it and a museum card shows the title, medium, a note, a question for the class and a teacher note. E, Esc or *Step back* closes it.

### The Portrait Gallery (`src/scene/PortraitGallery.tsx`)
A 13 × 7 m room off the corridor: oxblood walls, a laylight ceiling, picture lights, a rope barrier, an ottoman, the caretaker in a storm on the far wall, the faded *Old Man Was a Shadow* with a missing nameplate, the nervous sitter, *A Deafening Silence*, and an empty frame. Lightning flashes in the caretaker painting every ~26 s.

### The metaphor lesson (`src/content/metaphor.ts`)
Same five stages as the simile lesson, now driven by per-room content.
- **Discover**: "The caretaker was a storm." vs "The caretaker was like a storm."
- **Learn**: METAPHOR; simile and metaphor annotated side by side; "Her smile was a locked door." annotated with a question; the non-example.
- **Challenge A**: restore the old man's title. The correct answer restores the nameplate and the figure fades into shadow.
- **Challenge B**: each option changes the sitter. The correct metaphor fills the canvas with moths; the simile makes the painting shiver; the sunflower metaphor warms it (vivid, wrong mood).
- **Prove**: the class turns "The house was quiet." into metaphors; each appears painted into the empty frame. Model: "The house was a sleeping giant." The teacher decides when it is done; nothing auto-grades.

## Phase 2 verification

| Check | Result |
|---|---|
| `npm run typecheck` | Passes |
| `npm test`: 47 unit tests (adds progression reducer, footstep synthesis, gallery zones) | All pass |
| `npm run build` | Succeeds |
| `scripts/phase2.mjs`: 24 checks plus screenshots on the production build (inspect and close paintings; locked door; no early key; complete mirrors; take key; no second take; unlock; door stays unlocked; caretaker card opens the lesson; wrong answer A; nameplate restored; no early second key; completion; take Gallery Key; revisit keeps progress; saved locally; Dining Room acknowledges the key; triggered events; teacher reset; no page errors) | 24 of 24 pass |
| `scripts/interact.mjs` (Phase 1 real-input regression, updated for the key) | 23 of 23 pass (two stale state paths in the script updated for per-room lessons) |

These checks drive state through the test hook (`window.__hosl`) for most steps; only `interact.mjs` uses real mouse and keyboard input. Screenshots were inspected; fixes from that review: paintings rendering black (texture resize), crude portraits, zebra veneer, a too-blue laylight, invisible moths, the inspection card covering the painting, and a camera teleport race. A frame-timing probe also caught a regression: the painting pass read pixels back from a GPU canvas, which froze the main thread for 16 to 20 s at a time under software rendering and made `interact.mjs` time out on the title button. The output canvas is now CPU-backed, and title-screen frame rate matches Phase 1 (11 frames in 40 s for both under the software renderer).

## Phase 2 limitations

1. **Still no real-GPU test.** All of the above ran under a software renderer.
2. **Audio unheard**, including the new footsteps, key, lock and thunder sounds.
3. **Portraits look naive**: convincing as folk portraits, not as academic oil painting. Landscapes and interiors hold up better. Each painting is one function and can be swapped for a real image (see `ASSETS.md`).
4. **Painting generation costs CPU.** The paintings are made one at a time from the title screen onward. Under the software renderer they finish about 6 s after the title appears, as one-painting tasks of up to 0.55 s (one took 2.2 s); a real machine should be faster but was not measured. The title screen may stutter briefly during that time. A painting you reach before its turn shows plain canvas.
5. **The strange events were triggered on demand in tests**, not observed arising naturally over a long session. Their spacing comes from the code, not from play-testing.
6. Motion effects (moths, shiver, door swing, lightning) were checked in still frames only. In a still frame the moths read as pale wing shapes swarming the sitter; whether they read as moths in motion is unverified.

## Phase 2 next steps
1. Play both rooms on the classroom machine with sound; decide whether to keep footsteps on.
2. Replace the portrait functions with commissioned or licensed images if they distract.
3. Build Room 3 behind the Dining Room door using the same content and progression pattern (`KEY_FOR_ROOM`, a new `LessonContent`).
4. Split the bundle per room before adding more.

---

# Phase 2.1: smoother rooms, creepier moths, a livelier house

Changes after the first classroom-laptop test, which reported stutters, angelic moths and events that were too easy to miss.

## Stutters
- **Cause:** whole rooms were hidden when out of view, lights included. three.js compiles the number of lights into every material's shader, so walking into the gallery recompiled the house. Shaders and textures also compiled the first time each surface came on screen.
- **Fix:** hidden rooms now move their meshes to a layer the camera does not draw, and keep their lights in the scene at zero brightness (shadows paused). Every material is compiled, and every texture uploaded, while the title screen is showing. Compiling targets the effect composer's buffer, because shader variants differ between the screen and a buffer.
- **Measured** with `scripts/compile-probe.mjs`, which counts shader programs as the player moves from the title screen through the hall, corridor, Hall of Mirrors and Portrait Gallery: **23 programs compiled mid-game before the fix, 0 after.** The software renderer can't show whether the laptop stutter is gone, but a mid-game shader compile was its likely cause, and none remain.

## Moths
- **In the painting:** dusty grey-brown moths with swept wings and darting, panicky flight, in place of the pale blobs.
- **The swarm:** a second after the class picks the moth metaphor, about 34 moths burst out of the portrait and flutter past the viewer for about 2.5 s, with a papery wing sound. The swarm is drawn under the lesson panel, so it never covers the text, and it is skipped when the computer asks for reduced motion.

## Strange events
- A three-way **level** in the teacher panel: *off*, *subtle* (the old pacing) and *eerie* (new default: first event after ~25 s, then every 22 to 50 s).
- **New events at eerie:** every lamp in the house sinks to a fraction of its light and recovers (verified: the frame is about 40% darker at full depth); a gust makes every flame bow and dip, with a wind sound; a mirror fogs as if breathed on.
- **Recorded-clip events**, which only run once sound files are added: whispers behind you, a distant giggle, a music box, footsteps upstairs, a sigh.

## Sound clips
`src/systems/clips.ts` defines the slots. Drop a file named after a slot into `src/assets/audio/` and rebuild, and the game picks it up with no code change. Slots: `music`, `wind`, `whisper`, `giggle`, `music-box`, `footsteps-above`, `sigh`, `door-creak`, `step-wood`, `step-carpet`. Music plays quietly while exploring and drops lower during lessons, with its own teacher toggle. `docs/SOUNDS.md` is the shopping list. **Checked** in the browser with stand-in files: they load, play, fall back cleanly when a slot is empty, and a wrongly named file is reported in the console. No real clips have been chosen or heard yet.

## Phase 2.1 verification
| Check | Result |
|---|---|
| `npm test` (adds clip file-name tests) | RESULT_UNIT |
| `scripts/compile-probe.mjs` | RESULT_COMPILE |
| `scripts/phase2.mjs` | RESULT_P2 |
| `scripts/interact.mjs` | RESULT_INT |

Still unverified: how the gust, the lamps sinking and the swarm feel in motion on a real screen, and every sound level.
