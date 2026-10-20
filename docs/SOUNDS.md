# Sound shopping list

The goal is atmosphere, not fright. Every sound below should be quiet, distant or brief: something a student half-notices and then wonders about. The game works without any of them. Each file you add either replaces a built-in sound or switches on a new event.

## Where to find sounds

- **freesound.org** (free account). In the search filters, set **Licence: Creative Commons 0**, so you don't have to credit anyone.
- **pixabay.com/sound-effects** and **pixabay.com/music**. Free to use under the Pixabay licence.

For each file you use, note its web address. Add a line for it in `ASSETS.md` under "Third-party assets".

## Start with these five

These give the most atmosphere per file.

| Slot (file name) | What you want | Search for | Length | Avoid |
|---|---|---|---|---|
| `music.mp3` | Slow, sparse background music that loops. A music box lullaby, a lone cello or a dark ambient drone. It plays quietly while students explore and drops further during lessons. | "dark ambient loop", "music box lullaby", "haunted house ambience music" | 1 to 3 min, loops cleanly | Drums, melodies that grab attention, horror-movie stingers |
| `whisper-1.mp3` … | **Filled in Phase 11** (the Lady in Green). Soft whispering with no words you can make out, just behind the player or through a wall. | "whisper unintelligible", "indistinct whispering" | 2 to 5 s each | Clear words, growls, anything aggressive |
| `giggle-1.mp3` … | **Filled in Phase 11.** The Lady in Green's laugh: one woman, soft, closed-mouthed, a little far off (the game adds distance and echo). Keep the same voice as the whisper. | "woman soft chuckle", "female giggle calm" | 1 to 3 s | Children, cackling, screams, crowds |
| `music-box.mp3` | A music box playing a few notes, ideally slowing down as it winds down | "music box", "music box winding down" | 5 to 15 s | Full songs |
| `footsteps-above.mp3` | Slow footsteps on wooden floorboards, as if someone is walking upstairs | "footsteps upstairs", "footsteps wooden floor slow", "footsteps attic" | 4 to 10 s | Running, high heels, stomping |

## Nice to have

| Slot (file name) | What you want | Search for | Length |
|---|---|---|---|
| `wind.mp3` | Wind around an old house, looping. Replaces the built-in wind, which plays loud outside and muffled inside. | "wind howling house loop", "wind window rattle loop" | 30 s to 2 min, loops cleanly |
| `sigh-1.mp3` | **Filled in Phase 11.** The Lady's sigh, when a mirror fogs over. | "woman sigh", "breath sigh soft" | 1 to 3 s |
| `hum-1.mp3` … | **Phase 11.** A few bars hummed, muffled, from behind a wall. | "woman humming lullaby" | 4 to 8 s |
| `knock-1.mp3` … | **Phase 11.** A single knuckle knock on wood, one per file; the game spaces them. | "knock wood door" (cut into single knocks) | 0.2 to 0.4 s |
| `door-creak.mp3` | An old wooden door creaking open. Replaces the built-in creak whenever any door opens. | "old door creak open" | 1 to 3 s |
| `step-wood-1.mp3` … `step-wood-6.mp3` | **Only if the built-in footsteps bother you.** Single steps on old floorboards, one step per file, trimmed tight. | "footstep wood single", "footsteps wooden floor" (cut into single steps) | 0.2 to 0.4 s each |
| `step-carpet-1.mp3` … `step-carpet-4.mp3` | Same, on a rug. Only needed if you replace the wood steps too, so the two match. | "footstep carpet" | 0.2 to 0.4 s each |

## House sounds (added in Phase 6B)

These replace synthesised sounds. Until a slot has a file, the synthesised version keeps playing. `src/assets/audio/` lists what is in use now, and `ASSETS.md` has its sources.

| Slot (file name) | Replaces / plays as | Length | Loading |
|---|---|---|---|
| `step-wood-1.mp3` … | Your footsteps on wood | 0.2–0.6 s, one step per file, mono | at start |
| `step-carpet-1.mp3` … | Your footsteps on rugs and the corridor runner | 0.2–0.6 s each | at start |
| `step-stone-1.mp3` … | Your footsteps on stone flags: the Crooked Kitchen and the porch (without one, the wood step plays brighter and thinner there, as a stand-in that still sounds like wood) | 0.2–0.6 s each | at start |
| `door-open.mp3` | A whole door opening (handle and creak) | 1–2 s | at start |
| `door-close.mp3` | A door closing and latching (also used, quieter, for a door elsewhere in the house) | 0.5–1.5 s | at start |
| `unlock.mp3` | A key turning in a lock (the eight locked doors, the writing box) | 1–2 s | at start |
| `creak-floor.mp3` … | A single floorboard creak (under footsteps now and then; the "creak" event) | about 1 s | at start |
| `book.mp3` | An evidence book falling open in the Scholar's Study | under 1 s | in the background |
| `page.mp3` | A page turning (the Lady's letter) | under 1.5 s | in the background |
| `clock-grandfather.ogg` | The Entrance Hall grandfather clock, looped | 10–15 s, **OGG** (loops without a gap) | in the background |
| `clock-tick.ogg` | The "tick-tock" lesson sound in the Chamber of Echoes | about 10 s | in the background |
| `fire.ogg` | The Entrance Hall fire, looped | 20–35 s, **OGG** | in the background |
| `drip.mp3` … | The drip lesson sound and the music room's drip | under 1 s each | in the background |

Use **OGG** for anything that loops: MP3 adds a sliver of silence at each end, which clicks every time the loop repeats.

You don't need to match levels by hand. When a recording is decoded, the game measures it and levels it (its loudest 50 ms), so variants in a slot sound equally loud. Footstep recordings start at their heel strike (the game skips any scuff before it), so the strike sounds 20 ms after the footfall, as the built-in steps do. A door unlocked with a key swings open as the bolt in the recording is thrown. A rare event's recording loads the first time the event happens and plays a moment later.

The hall's clock and fire are heard in full only in the Entrance Hall, faintly through its open doorways (corridor, study, kitchen, the drive), and not at all elsewhere. Ambience sits about 6 dB lower while a lesson panel is open.

## Leave these out

- **Screams, jump-scare stingers, monster growls.** They frighten instead of building atmosphere, and they pull a class out of a lesson.
- **Recognisable voices saying words.** If you want words, record your own students whispering lines from the lessons ("the walls were listening…"). Get permission before their voices go into a shared game.

## Preparing the files

- **Format:** MP3 is safest. OGG, WAV and M4A also work.
- **Trim the silence** at the start and end (free tool: Audacity, Effect → Truncate Silence).
- **Normalise** each clip so they're similar in loudness. The game sets each sound's level itself.
- **Mono** is best for whispers, giggles, footsteps and sighs, because the game positions them in the house. Music and wind can be stereo.
- **Variants:** add `-1`, `-2` and so on to the name (`whisper-1.mp3`, `whisper-2.mp3`). The game picks one at random and never plays the same one twice in a row.

## Adding them to the game

1. Put the files in `src/assets/audio/` with the names above.
2. Rebuild (`npm run build`) or restart `npm run dev`.
3. In the teacher panel (T), set *Strange events: eerie* to hear whispers more often. Use *Make something happen* to trigger one now.

If a name doesn't match a slot, the browser console says so and lists the valid names. You can also send the files to Claude to rename and add.
