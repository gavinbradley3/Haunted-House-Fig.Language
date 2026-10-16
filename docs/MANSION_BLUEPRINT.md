# The House of Strange Language: Mansion Blueprint

The plan for the complete classroom version: five lessons in one house, joined by a chain of keys, ending in the entrance hall where the class started.

## 1. Audit of what existed before this phase

| Area | State | Device | Key / door |
|---|---|---|---|
| Exterior, arrival | Complete | — | Front doors open in the arrival cinematic |
| Entrance Hall | Complete (hub) | Paintings hint at personification | Upstairs roped off; landing doors decorative |
| Corridor | Complete | Paintings hint at personification and idiom | Gallery door (Mirror Key); **Dining Room door locked, "recognises" the Gallery Key but never opens** |
| Hall of Mirrors | Complete | **Simile** | Mirror Key in the console drawer; **hidden jib door never opens** |
| Portrait Gallery | Complete | **Metaphor** | Gallery Key in the safe behind the empty frame; *A Deafening Silence* hints at oxymoron |

Engine pieces reused by every new room: the lesson state machine (`src/lesson/lessonMachine.ts`), per-room content files (`src/content/*.ts`), the lesson panel, the progression reducer, keys (`CollectibleKey`), doors, the interaction registry, layer culling, the teacher panel, strange events, synthesised audio.

**Gaps found:**
1. The Gallery Key had no lock to open, so the game stopped mid-story.
2. Two devices the paintings promise (personification, hyperbole via the corridor plaque) were never taught.
3. There was no ending, and no lesson asked students to tell devices apart once they had learned several.
4. Every challenge was a single multiple-choice question.
5. Oxymoron and idiom are hinted by two paintings. **Decision:** they are *not* taught in this version (five lessons is the right size for the week). Their paintings stay as extension discussion prompts, and their teacher notes now say so.

## 2. The complete route

```
Arrival → Entrance Hall → Corridor
  → Hall of Mirrors   SIMILE            → Mirror Key      (opens the Portrait Gallery)
  → Portrait Gallery  METAPHOR          → Gallery Key     (opens the Giant's Dining Room)
  → Giant's Dining Room HYPERBOLE       → Tiny Key        (opens the hidden door in the Hall of Mirrors)
  → The Nursery       PERSONIFICATION   → Music Box Key   (opens the Lady's writing box in the Entrance Hall)
  → Entrance Hall     THE LADY'S LETTER (all four devices together) → the ending: the house exhales and dawn comes
```

The route doubles back on purpose: the class returns to the Hall of Mirrors through a door they have walked past twice, and finishes where they began. Every lesson can be replayed, every door stays unlocked once opened, and the teacher panel can grant any stage of progress, so no class can get stuck.

## 3. Room design principles applied to every room

- **One lesson shape, varied interactions.** Discover → Learn → Challenge A → Challenge B → Prove → Complete stays the same everywhere, because teachers learn it once. What changes is *how* students engage in the challenges: choosing, sorting objects in the room, waking toys, listening, decoding a letter.
- **The device is physical.** A simile changes reflections; a metaphor changes paintings; hyperbole distorts scale; personification makes objects behave like people; the finale relights the house one device at a time.
- **Every wrong answer teaches.** Each wrong option has its own explanation of what it is instead (literal, a different device, the right device with the wrong mood).
- **Nothing is auto-graded or timed.** The teacher selects the class's answer and presses Check.
- **Restrained horror.** Sounds, slow movement, things that were not like that a moment ago. No jump scares.
- **Performance rules.** New rooms add no shadow-casting lights, no reflections and no post-processing. They share **two** dynamic point lights (`RoomLights`) that move to whichever new room the camera is in, so the house's light count, and therefore every shader, stays fixed. Candles are emissive meshes. Materials reuse the existing texture library (tinted, not regenerated). Rooms are hidden by the existing layer culling when out of view.

## 4. Room blueprints

### Room 1: The Hall of Mirrors (existing, unchanged)
- **Location:** end of the corridor. **Device:** simile.
- **Objective:** identify similes (two different things compared with *like* or *as*), reject false "like"s, choose a simile for its mood, write one.
- **Motif:** six pier mirrors, velvet curtains, green damask. **Interaction:** reflections, curtains that act out sentences, an endless-tunnel mirror.
- **Reward:** Mirror Key in the console drawer.

### Room 2: The Portrait Gallery (existing, unchanged)
- **Location:** first door on the left of the corridor (Mirror Key). **Device:** metaphor.
- **Objective:** identify metaphors (one thing said to *be* another), tell them apart from similes and literal statements, choose one for its mood, write one.
- **Motif:** top-lit oxblood gallery, living portraits. **Interaction:** paintings transform (storm, fading old man, moths).
- **Reward:** Gallery Key in the safe behind the empty frame.

### Room 3: The Giant's Dining Room (new)
- **Location:** first door on the right of the corridor; opened with the Gallery Key.
- **Device:** hyperbole.
- **Objective:** Students identify hyperbole as deliberate exaggeration that is not meant literally, tell it apart from statements that are large but true, explain its purpose (emphasis, humour, feeling), and write one for effect.
- **Visual motif:** scale. A long, normal dining table for guests runs toward a **giant's end**: a chair three times human size, a plate a metre across, a silver cloche, cutlery taller than a person leaning on the wall. Moonlit windows behind the giant's chair. Blue-grey damask.
- **Atmosphere and audio:** cavernous reverb; a low rumble that might be thunder or a stomach; the rattle of cutlery when something "grows".
- **Primary interaction:** *hyperbole distorts scale.* Dishes swell to giant size when the class correctly calls a statement a hyperbole.
- **Sequence:**
  - **Discover:** "The giant was very hungry." vs "The giant was so hungry he ate the table and asked for the chairs." On the second, the dishes swell.
  - **Learn:** definition; why writers use it (try-it); annotated example; a second annotated example ("I've told you a million times"); non-example ("The giant's table was nine metres long": big but true).
  - **Challenge A, The Giant's Place Cards (sorting):** six remarks written on the guests' place cards. For each, the class decides *Hyperbole* or *Literal*. A correct hyperbole makes its dish swell; a literal card stays the right size.
  - **Challenge B, Exaggerate with a Purpose (choice with room preview):** which sentence makes the giant frightening rather than funny? Options cover a worn-out comic hyperbole, an intensifier, a simile, and the correct frightening hyperbole. The room previews each.
  - **Prove:** rewrite "The soup was hot." as a hyperbole; it is chalked onto the giant's menu board. Model: "The soup was so hot that the spoon melted before it reached the giant's mouth."
- **Wrong-answer feedback:** every option explains *literal vs exaggerated*, or which other device it is.
- **Puzzle and reward:** completing the lesson lifts the giant's cloche. Underneath, on a plate a metre wide, lies a key barely two centimetres long: **the Tiny Key**.
- **Progression:** the Tiny Key opens the hidden jib door in the Hall of Mirrors.
- **Performance:** no new shadow maps; 2 shared lights; target ≤ 350 draws in view.
- **Reused:** walls, wainscot, cornice, sash windows, chairs, rug, doors, keys, damask maps.

### Room 4: The Nursery (new)
- **Location:** behind the hidden jib door in the Hall of Mirrors, papered to match the wall. It has been in plain sight since the first lesson.
- **Device:** personification.
- **Objective:** Students identify personification as giving human actions, feelings or qualities to something that is not human; tell it apart from things doing what they really do (a chair creaks) and from people doing human things; explain how it builds mood; and write one.
- **Visual motif:** a child's room left exactly as it was. Rocking horse, music box, a dollhouse that is a miniature of *this* house, a teddy bear on a small bed, a slate on an easel, alphabet blocks. Faded rose walls, a low ceiling, a moonlit window.
- **Atmosphere and audio:** quiet; a music box that sometimes plays two notes on its own; the creak of rockers.
- **Primary interaction:** *personification makes objects alive.* Toys move like people when the class gives them human actions.
- **Sequence:**
  - **Discover:** "The rocking horse stood in the corner." vs "The rocking horse waited in the corner, hoping someone would come back to play." On the second, the horse starts to rock.
  - **Learn:** definition; why (try-it); annotated "The music box sang itself to sleep."; annotated "The wind whispered secrets at the window."; non-example "The rocking chair creaked by the fire." (real chairs creak).
  - **Challenge A, Wake the Toys (sentence completion, one toy at a time):** for each toy, choose the word that personifies it rather than describing what it really does. Horse *stood / sulked*; music box *played / hummed to itself*; dollhouse *had lit windows / blinked its tiny windows*; teddy *sat / kept watch over the empty pillow*. Each correct choice wakes that toy.
  - **Challenge B, The Music Box's Song (listening):** which sentence uses personification to make the nursery feel lonely? Each option plays its own music-box performance: a bright jingle, a skipping dance, a lullaby that slows and stops, plain notes. The class judges by listening as well as reading.
  - **Prove:** rewrite "The wind blew through the nursery window." with personification that feels lonely or unsettling; it is chalked onto the slate. Model: "The wind crept through the nursery window and searched every empty bed for someone to wake."
- **Puzzle and reward:** the music box lid opens fully; inside, **the Music Box Key**.
- **Progression:** the key opens the Lady's writing box in the Entrance Hall.
- **Performance:** same rules as the Dining Room.

### Finale: The Lady's Letter (Entrance Hall)
- **Location:** the writing box on the hall's centre table, under the portrait of *The Lady of the House*.
- **Devices:** all four.
- **Objective:** Students identify and tell apart simile, metaphor, hyperbole and personification in one connected text, explain how they work together, and write a sentence using two of them.
- **Visual motif:** the room the class knows best, dimmed. As each device is decoded, the hall's candles return. At the end, dawn.
- **Sequence:**
  - **Discover:** "The house was quiet." vs "The house was as quiet as a held breath, and every window watched us come home." How many kinds of strange language are in the second?
  - **Learn:** figurative language, defined; the four devices side by side with a question to ask for each; "one sentence can do two jobs" (metaphor + hyperbole).
  - **Challenge A, Decode the Lady's Letter (four-way classification):** five phrases from her letter, each labelled Simile / Metaphor / Hyperbole / Personification. Each correct label relights part of the hall.
  - **Challenge B, What Is She Really Saying? (interpretation):** "The house is a sleeping giant, and it dreams of company." Literal and misreadings are explained.
  - **Prove:** describe the house in one sentence using at least two devices; the class's sentence appears on the letter on the mantel.
- **Ending:** the Lady's portrait turns to face the class, every light in the house rises, the front doors swing open on a dawn sky, and an end card summarises what the class learned, with *Keep exploring* and *Play again*.

## 5. Systems added or extended

| System | Change |
|---|---|
| `content/types.ts` | `RoomId` gains `dining`, `nursery`, `finale`. Challenges gain an optional `items` list for multi-part challenges (sorting, sentence completion, classification). Legend shows only the annotation roles a sentence uses. |
| `lesson/lessonMachine.ts` | Item-level select, check and reveal; a challenge with items is solved when every item is solved. Existing single-question challenges are unchanged. |
| `lesson/progression.ts` | Keys `diningKey` (Tiny Key) and `nurseryKey` (Music Box Key); unlock flags for the dining door, the jib door and the writing box; teacher grants for every stage; older saved progress still loads. |
| `world/layout.ts`, `collision.ts` | Dining Room and Nursery dimensions, zones, entry poses, lesson shots, colliders, door gaps. |
| `scene/RoomLights.tsx` | Two shared point lights that follow the camera between the new rooms. |
| Directors | One per new room, mapping lesson state to room effects. |
| Audio | Synthesised music box (four performances), giant rumble, cutlery rattle. |
| Teacher panel | All five lessons, jumps to every room, key status for the whole chain, grants. |
| UI | Multi-item challenge view; ending card. |

## 6. Validation plan

For each room: unit tests for content integrity and progression; a scripted browser run through the whole lesson (correct and incorrect answers); key, door and revisit checks; screenshots; frame-time measurement on this machine's Intel UHD 630 at Balanced and Low; a regression run of the earlier rooms (`scripts/phase2.mjs`-style checks).

At the end: a new-player run from the title to the ending, teacher grants and resets, lowest graphics preset, and a completion report.


---

# Part 2: The five further rooms (curriculum completion)

Correction: Phase 3 deferred oxymoron and idiom and did not include onomatopoeia, alliteration or allusion. All five are required. This part adds a room for each and moves the final lesson to the end of a longer chain. Rooms 1–4 keep their lessons unchanged.

## The complete route (10 lessons)

```
Entrance Hall → Corridor
  1 Hall of Mirrors            SIMILE           → Mirror Key     → Portrait Gallery door
  2 Portrait Gallery           METAPHOR         → Gallery Key    → Giant's Dining Room door
  3 Giant's Dining Room        HYPERBOLE        → Tiny Key       → hidden door in the Hall of Mirrors
  4 The Nursery                PERSONIFICATION  → Music Box Key  → door in the nursery's south wall
  5 Chamber of Echoes          ONOMATOPOEIA     → Bell Key       → door in the music room's west wall
  6 The Whispering Press       ALLITERATION     → Type Key       → door in the Entrance Hall's east wall
  7 The Crooked Kitchen        IDIOM            → Pantry Key     → door in the Dining Room's south wall
  8 Ballroom of Contradictions OXYMORON         → Ballroom Key   → door under the landing (hall, west wall)
  9 Forgotten Scholar's Study  ALLUSION         → Scholar's Key  → the Lady's writing box
 10 The Lady's Letter          ALL NINE         → the ending
```

**Order:** the two sound devices come together (onomatopoeia, then alliteration). Idiom follows hyperbole and metaphor, which students have already met, and needs no special knowledge. Oxymoron builds on contrast. Allusion, the most knowledge-dependent device, comes last, with evidence supplied in the room.

**Where the rooms are.** All are on the ground floor and reached through doors in rooms the class already knows, so the house stays one connected building:

| Room | Position | Reached from |
|---|---|---|
| Chamber of Echoes | South of the Nursery | Door in the Nursery's south wall |
| Whispering Press | West of the Chamber of Echoes | Door in the music room's west wall |
| Crooked Kitchen | East of the Entrance Hall, beside the Dining Room | Door in the hall's east wall |
| Ballroom | South of the Dining Room, beside the Hall of Mirrors | Door in the Dining Room's south wall |
| Scholar's Study | West of the Entrance Hall, under the landing | Door in the hall's west wall |

**Ending gate:**
- The writing box needs the Scholar's Key, and the Scholar's Key comes only from the last room.
- The final lesson cannot be marked complete until all nine device rooms are complete. This holds even when a teacher opens the final lesson directly from the teacher panel.

## Instructional structure in every new room

| Requirement | Where it lives |
|---|---|
| Student-friendly instruction | Learn cards: definition, why writers use it, two annotated examples, a non-example |
| Memorable environmental demonstration | Discover: the room acts out the plain sentence and the figurative one |
| Guided practice | Challenge A: several short items, one at a time, each checked and explained |
| Independent application | Challenge B: a different interaction (listening, construction, completion, context judgement, interpretation) |
| Explanatory wrong-answer feedback | Every option of every item carries its own explanation |
| Mastery checkpoint required for progression | Prove: the class must enter its own sentence **and the teacher must tick every success criterion** before "Complete" unlocks. The key, and so the next room, comes only after Complete. |

## Room blueprints

### 5. Chamber of Echoes: onomatopoeia
- **Motif:** a Victorian music room with a piano, a gramophone, a ticking metronome, a dripping pipe and a pump organ. Objects make sounds on their own.
- **Objective:** onomatopoeia is a word that imitates the sound it names; telling it apart from words that only describe a sound ("noisy", "loud").
- **Discover:** "The pipe made a noise in the dark." against "Drip. Drip. Drip. The pipe would not stop." The pipe drips audibly.
- **Challenge A, Name That Sound (listening):** each item plays a sound from an object in the room; the class picks the word that imitates it.
- **Challenge B, Find the Sound Word (identification):** pick the onomatopoeia inside a sentence, including one sentence that has none.
- **Prove:** describe the music room at midnight using onomatopoeia.
- **Accessibility:** every sound has a written caption and makes its object glow, so the activity works without audio.

### 6. The Whispering Press: alliteration
- **Motif:** a printing room with a hand press, type cases and hanging proofs. The press thumps by itself, in rhythm.
- **Objective:** alliteration is the repetition of the same *beginning consonant sound* in nearby words. It is about sound, not spelling: *phantom fog* alliterates; *cold ceiling* does not.
- **Challenge A, Sound or Spelling? (judgement):** six word pairs, including sound/spelling traps.
- **Challenge B, Set the Headline (construction):** build a headline from three trays of type. It must alliterate **and** make sense. Strings that merely repeat a letter, or alliterate nonsensically, are rejected with a reason.
- **Prove:** write an alliterative sentence about the press at night.

### 7. The Crooked Kitchen: idiom
- **Motif:** a below-stairs kitchen where idioms have come true: spilled beans, a cook's boots sticking out of a pot of hot water, a cake with one slice missing, a small rain cloud over a chair, a cracked block of ice. When the class understands an idiom, its real meaning is chalked above the scene.
- **Objective:** an idiom is an established expression whose meaning cannot be worked out from its words; context tells literal from idiomatic use.
- **Challenge A, What Does It Really Mean? (literal against figurative):** each idiom in a sentence; choose the intended meaning over the literal reading. Every idiom used is taught here; none is assumed.
- **Challenge B, Literal or Idiom? (context):** the same words in different sentences; decide which is meant.
- **Prove:** use one of the kitchen's idioms in a sentence about the house.

### 8. Ballroom of Contradictions: oxymoron
- **Motif:** a vast, decayed ballroom where contradictions are visible: candles with frozen blue flames, two dress forms that waltz in silence, a glass case holding an "open secret".
- **Objective:** an oxymoron puts two contradictory words together to express one idea. It is not a list of ordinary opposites ("hot and cold") and not an ordinary pair ("quiet whisper").
- **Challenge A, Sort the Ballroom:** for each phrase, choose Oxymoron, Ordinary opposites or No contradiction. Each oxymoron makes its contradiction appear in the room.
- **Challenge B, Complete the Contradiction (construction):** choose the word that makes each phrase an oxymoron.
- **Prove:** describe the ballroom with an oxymoron.

### 9. Forgotten Scholar's Study: allusion
- **Motif:** a study of books, maps and index cards, under the landing. Each allusion has a book on the desk that opens when its evidence is consulted.
- **Objective:** an allusion is a brief reference to a well-known person, story, place or event; the reader must recognise *what* it refers to and *why* the writer chose it.
- **No trivia required:** every reference comes with an evidence card (a two-sentence summary) the class reads before answering.
- **Challenge A, What Is the Reference? (investigation):** open the evidence, then identify the reference.
- **Challenge B, Why Does It Matter? (interpretation):** the same allusions; choose what each one tells us in context.
- **Prove:** use one of the study's allusions about something in the house, and say why it fits.

### 10. The Lady's Letter (extended)
- Learn shows all nine devices side by side.
- Challenge A labels **nine** phrases in the letter, one per device.
- The end card lists all nine rooms.

## Performance
- The new rooms add **no** new lights: the two shared room lights (`RoomLights`) move to whichever room can be seen.
- No reflections or post-processing; existing materials are tinted, not regenerated.
- Each room is hidden by layer culling when out of view. Repeated small objects (beans) are instanced.
- Frame rate and shader compiles are measured after the rooms are in.
