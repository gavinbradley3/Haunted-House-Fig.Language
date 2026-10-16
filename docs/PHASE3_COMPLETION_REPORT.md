# Phase 3 Completion Report: The Complete Mansion

**Date:** 15 October 2026 · **Tested on:** Intel Core i5-10500 with Intel UHD Graphics 630 (integrated), Windows 11, Chrome (Playwright and Chrome DevTools)

## What was built

The game is now complete from the title screen to an ending: five lessons in one house, joined by one chain of keys. The design is in `docs/MANSION_BLUEPRINT.md`.

| # | Room | Device | New interaction | Reward |
|---|---|---|---|---|
| 1 | Hall of Mirrors (unchanged) | Simile | Reflections and curtains act out sentences | Mirror Key |
| 2 | Portrait Gallery (unchanged) | Metaphor | Paintings transform | Gallery Key |
| 3 | **Giant's Dining Room** (new) | Hyperbole | **Sorting six place cards** (Hyperbole or Literal, one at a time); only exaggerations make their dish grow. Choosing a hyperbole for its effect. | Tiny Key, on a plate a metre wide |
| 4 | **The Nursery** (new, behind the hidden door in the Hall of Mirrors) | Personification | **Sentence completion that wakes toys**; **a listening challenge** in which each option plays its own music-box tune | Music Box Key |
| 5 | **The Lady's Letter** (new, Entrance Hall) | All four | **Four-way classification** of phrases in a letter (each one relights the hall); interpreting what the letter really means | The ending: the Lady turns, the doors open, dawn, and an end card showing the class's own sentences |

**Engine changes:**
- Lessons can now hold multi-part challenges (per-item select, check, feedback and teacher reveal). The single-question challenges in rooms 1 and 2 are unchanged.
- The key chain covers four keys and four locks; older saved progress still loads.
- The teacher panel lists all five lessons, has jumps to every room, a status line for the whole chain, and **Skip ahead** to any step.
- New synthesised sounds: a music box with six performances, a giant's rumble, and rattling cutlery.

**Performance rules followed:**
- No new shadow maps, reflections or post-processing.
- The new rooms share **two** moving lights, so the house's light count is fixed and nothing recompiles.
- Materials reuse the existing textures (tinted, not regenerated).

**One performance change for school computers:** the Balanced preset no longer runs ambient occlusion.

## Validation

| Check | Result |
|---|---|
| `tsc` type check | Passes |
| Unit tests (`npm test`) | **70 of 70 pass**. Added: the full key chain, teacher grants, compatibility with old saves, every room's content (exactly one correct answer per question, every option explained), multi-part challenge rules. |
| Production build | Succeeds: 1.96 MB JS (621 KB gzipped) |
| New-player run, production build, real GPU (Playwright) | **65 of 65 checks pass**, no page errors: arrival (real click and Space), every door locked before its key, all five lessons with a wrong answer and its explanation in every challenge, every key taken once only, a real mouse click on the Dining Room door and on the writing box, the hidden door hidden until the Tiny Key, nobody shut in the Nursery, the ending and end card, replaying every lesson after completion, progress surviving a reload, the teacher panel opened with T, and a teacher reset with real clicks. |
| Shader compiles during play | **None**: 33 programs at the title screen, 33 after visiting every room |
| Lowest preset | Every room renders correctly on Low; the lesson panel is readable at 1280×800 |

### Frame rate, production build (frames per second)

| Viewport | Preset | Hall | Mirrors | Gallery | Dining Room | Nursery |
|---|---|---|---|---|---|---|
| 1600×900 | Balanced | 15.1 | 13.0 | 17.7 | 14.9 | 17.8 |
| 1600×900 | Low | 25.5 | 21.7 | 30.4 | 25.1 | 29.7 |
| 1280×800 | Balanced | 20.1 | 17.9 | 24.8 | 20.3 | 24.4 |
| 1280×800 | Low | **34.2** | 28.9 | **42.1** | **34.3** | **40.3** |

- Balanced in the hall improved from 9.7 to 15.1 fps at 1600×900 (ambient occlusion removed).
- Low is unchanged from the audit's baseline (26.5 then, 25.5 now), so the two new rooms cost very little.

**Recommendation for next week:** on a school computer with built-in graphics, set **Low** in the teacher panel. On a projector, use 1280×800 or 1366×768 rather than 1920 wide if the frame rate feels slow.

## Remaining issues

### Technical
1. **Still GPU-bound on integrated graphics.** Only Low is smooth on the UHD 630. The audit's main performance fixes (a fixed light budget for the original rooms, instancing, pre-built textures) are not done.
2. **Loading still freezes for about 8 seconds** while textures are generated, then stutters for a few more seconds on the title screen. Open the game a minute before class.
3. **Sound has not been listened to by a person.** That includes the music-box tunes the Nursery's Challenge B depends on. Check the speakers and the music box before the lesson.
4. **Not tested:** pointer-lock (captured mouse) mode; Firefox, Safari and Chromebooks; a real projector. Click-drag looking, mouse clicks on objects, and keyboard shortcuts were tested.
5. The browser checks above were run through the Playwright MCP, not saved as a script in `scripts/`. Porting them to `scripts/phase3.mjs` would make future regression checks one command.

### Instructional
1. **Oxymoron and idiom are not taught.** *A Deafening Silence* and *Cold Feet* now say so in their teacher notes and work as extension questions.
2. The metaphor room still frames metaphors as "X *is* Y". Implied metaphors without *is/was* (for example "her thoughts swarmed") are not taught anywhere. This is a good Grade 9 extension.
3. In the final letter, "the stairs groaned" is marked as personification. A student might argue for onomatopoeia. Treat that as a good discussion, not a wrong answer.
4. The game is whole-class by design: there is no individual student record or score.

### Visual
1. The new rooms use simple code-built shapes, like the rest of the house: a scaled-up chair for the giant, simple toys. No Blender or Poly Haven assets were added this phase, given the deadline and the performance rules.
2. The dining place cards are blank in the room. Their sentences appear in the lesson panel.
3. The "Click to look around" hint still sits mid-screen whenever the mouse is not captured.

## Evidence
Screenshots from this phase: `C:\Users\gavin.bradley\Desktop\HOSL-Audit\phase3\`, outside the repository: `d*` Dining Room, `n*` Nursery, `f*` finale and ending, `z*` lowest preset.
