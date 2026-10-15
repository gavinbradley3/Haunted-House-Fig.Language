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
| `whisper-1.mp3`, `whisper-2.mp3`, `whisper-3.mp3` | Soft whispering with no words you can make out. It plays just behind the player's shoulder. | "whisper unintelligible", "ghostly whisper", "whispering voices" | 2 to 5 s each | Clear words, growls, anything aggressive |
| `giggle-1.mp3`, `giggle-2.mp3` | One child's giggle, short and a little far off. The game adds distance and echo. | "child giggle", "little girl laugh short", "kid giggle" | 1 to 2 s | Long laughter, maniacal laughs, crowds |
| `music-box.mp3` | A music box playing a few notes, ideally slowing down as it winds down | "music box", "music box winding down" | 5 to 15 s | Full songs |
| `footsteps-above.mp3` | Slow footsteps on wooden floorboards, as if someone is walking upstairs | "footsteps upstairs", "footsteps wooden floor slow", "footsteps attic" | 4 to 10 s | Running, high heels, stomping |

## Nice to have

| Slot (file name) | What you want | Search for | Length |
|---|---|---|---|
| `wind.mp3` | Wind around an old house, looping. Replaces the built-in wind, which plays loud outside and muffled inside. | "wind howling house loop", "wind window rattle loop" | 30 s to 2 min, loops cleanly |
| `sigh.mp3` | A tired sigh or slow breath. Plays near paintings, and when a mirror fogs over. | "woman sigh", "breath sigh soft" | 1 to 3 s |
| `door-creak.mp3` | An old wooden door creaking open. Replaces the built-in creak whenever any door opens. | "old door creak open" | 1 to 3 s |
| `step-wood-1.mp3` … `step-wood-6.mp3` | **Only if the built-in footsteps bother you.** Single steps on old floorboards, one step per file, trimmed tight. | "footstep wood single", "footsteps wooden floor" (cut into single steps) | 0.2 to 0.4 s each |
| `step-carpet-1.mp3` … `step-carpet-4.mp3` | Same, on a rug. Only needed if you replace the wood steps too, so the two match. | "footstep carpet" | 0.2 to 0.4 s each |

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
