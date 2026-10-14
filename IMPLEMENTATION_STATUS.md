# Implementation Status

The first chapter is a vertical slice: title → arrival → entrance hall → corridor → Hall of Mirrors (simile) → completion → return.

## What works

### World and visuals
- **Title screen** over a live 3D establishing shot of the house: moon, drifting cloud, bare trees, iron railings, warm porch and window light. It offers *Enter the House*, a sound toggle and *Skip the arrival*.
- **Arrival cinematic** (15 s, skippable with Space or a button) walks up the drive. The front doors open on cue and the camera ends standing in the hall.
- **Entrance hall** (12 × 10 m, 6.4 m high): staircase with turned balusters, a stair runner with brass rods, newel posts and a raking dado; a landing gallery on columns; panelled walnut wainscot, damask wallpaper, a cove cornice, a ceiling rose and picture rails; a marble fireplace with a basket grate, flickering embers and an overmantel portrait; a longcase clock with a swinging pendulum and hands showing real time; a chandelier and sconces; sash windows with velvet drapes; a Persian rug, centre table, settle, coat stand, chairs and a console.
- **Corridor** with a runner, sconces, paintings, and two locked doors with brass plaques (*The Portrait Gallery*, *The Giant's Dining Room*). They rattle and give an in-story message.
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
- **Completion**: the mirror inscription appears, a drawer slides out with a glowing brass key, and the hidden door clicks open onto warm light and a glimpse of the next room. The panel summarises the four key ideas.

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
5. Generalise `lessonMachine.ts` into a per-room lesson definition, so each new device only needs content plus its room-specific effects. The Portrait Gallery (metaphor) can reuse the jib-door passage as its entrance.
