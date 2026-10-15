# The House of Strange Language

*Some doors are opened with keys. Others are opened with words.*

A first-person 3D mystery for teaching figurative language to Grade 7–8 classes. You drive it on the classroom screen while students discuss, vote and create. It currently has two complete lessons: **the Hall of Mirrors** (simile) and **the Portrait Gallery** (metaphor), joined by a trail of keys.

---

## 1. One-time setup

You need **Node.js 20 or newer** (download the "LTS" version from nodejs.org and install it with the default options).

Open a terminal in this folder and run:

```bash
npm install
```

This downloads the libraries the game uses. It takes a minute and only needs doing once.

## 2. Run the game

```bash
npm run dev
```

The terminal prints an address, usually **http://localhost:5173**. Open it in **Chrome or Edge**. Press **F** for fullscreen.

To stop the game, click the terminal and press `Ctrl + C`.

### Classroom tip: build once, run anywhere

```bash
npm run build      # creates the finished game in the dist/ folder
npm run preview    # serves that finished copy at http://localhost:4173
```

The `dist/` folder is a self-contained website. It needs no internet connection and works from any folder, so you can copy it to a USB stick or drag it onto Netlify Drop (app.netlify.com/drop) to get a public link that opens on any device.

## 3. Playing

| Action | Control |
|---|---|
| Look around | **Click** the scene to capture the mouse, then move it. You can also click-and-drag without capturing. |
| Walk | **W A S D** or the arrow keys. Hold **Shift** to walk faster. |
| Use a door, mirror or object | Aim at it and press **E**, or click it |
| Free the mouse / open the controls card | **Esc** |
| Skip a cinematic | **Space**, or the Skip button |
| Fullscreen | **F** |
| Mute | **M** |
| Pause the whole house | **P** |
| Teacher controls | **T**, or the small key icon in the top-right corner |

**Route:**
1. Enter the House → walk through the entrance hall → go under the landing into the corridor → open the door at the end (*The Hall of Mirrors*) → look into the large mirror above the marble console. That starts the simile lesson.
2. When the lesson is complete, a drawer under the mirror slides open. Press **Go and take the key**, then press **E** (or click) on the brass key.
3. Back in the corridor, the first door on the left is *The Portrait Gallery*. With the Mirror Key it unlocks and swings open. It stays unlocked after that.
4. In the gallery, look at the large portrait at the far end (*The Caretaker Was a Storm*) and choose **Begin the lesson here**.
5. When the metaphor lesson is complete, the empty frame swings away from the wall. Take the Gallery Key from the safe behind it. The door opposite the gallery (*The Giant's Dining Room*) recognises the key but will not open yet: that is the next chapter.

**Paintings:** many paintings can be inspected. Aim at one and press **E** (or click it) to step closer and read its museum label and a question for the class. Press **E** or **Esc** to step back. Their titles hint at devices the class will meet later.

**Progress is saved** in the browser (keys, unlocked doors, completed rooms). Use **Reset all progress** in the teacher controls to start a fresh class.

## 4. Teacher controls (press T)

- **Pause / Resume** freezes the clock, the curtains and the sound while the class talks.
- **Skip animation** jumps to the end of any camera move.
- **Replay this moment** re-runs the room's reaction for the current step (ripples, light changes, curtain movement).
- **Reveal the answer** applies to Challenges A and B.
- **Reset this question** clears only the current step.
- **Reset the lesson** starts the simile lesson from the beginning.
- **Lesson** chooses which room's lesson the panel shows (Mirrors or Gallery), and **Jump to lesson stage** goes straight to any stage of it.
- **Keys and doors** shows where the class is. **Stand at the key** moves you in front of a waiting key. **Unlock the Gallery** and **Give both keys** skip ahead. **Reset all progress** locks everything again (press twice to confirm).
- **Atmosphere**: set how often the house does strange things while the class explores (*off*, *subtle*, or *eerie*, the default), make one happen on demand, and turn footsteps and music on or off. Nothing strange happens during a lesson.
- **Sound clips**: whispers, a distant giggle, a music box, footsteps upstairs and background music play once you add the sound files. See [docs/SOUNDS.md](docs/SOUNDS.md) for what to look for and where to put them.
- **Walk to / Jump to the Mirrors or the Hall**: *Walk* plays a guided camera walk and opens doors automatically. *Jump* fades to black and moves you instantly.
- **Open the lesson / Leave lesson view** opens or closes the lesson panel. Your place in the lesson is kept.
- **Sound** has mute and a volume slider.
- **Graphics**: High, Balanced or Low. On High, the game lowers itself automatically if the computer struggles.

Nothing in the lesson advances on a timer. Every step waits for you.

## 5. The simile lesson at a glance

1. **Discover.** Reveal two descriptions of the same curtains. The real curtains move to match each one (an ordinary sway, then a nervous tremble). Discussion questions appear on request.
2. **Learn.** The word SIMILE, a definition, why writers use similes, two annotated examples (*what is described / comparison word / what it is compared to / effect*), and a non-example ("I like mysterious stories").
3. **Play A: Find the Genuine Simile.** The class votes, you select their choice, then press *Check*. Wrong answers get an explanation. The correct answer turns a mirror into an endless tunnel.
4. **Play B: Change the Mood.** Selecting each option makes the curtains act it out (cheerful flutter, slow sway, stillness, or *breathing*). Students judge both "is it a simile?" and "is it unsettling?".
5. **Prove: The Mirror's Final Request.** Partners rewrite "The old clock ticked loudly." Type a student's simile and it appears inside the mirror. Tick the success criteria together, then reveal the model answer. The clock's ticking turns into slow footsteps.
6. **Complete.** The mirror shows an inscription, a drawer slides open with a brass key, and a hidden door in the panelling swings open.

The game never auto-grades student writing. You decide when the class has shown understanding.

## 6. The metaphor lesson at a glance

1. **Discover.** The caretaker's portrait is titled *The Caretaker Was a Storm*; lightning flickers in the painting. Then reveal *The caretaker was like a storm.* How are they different?
2. **Learn.** METAPHOR and its definition; simile and metaphor side by side; *Her smile was a locked door.* (what might it suggest?); a non-example (*The caretaker stood outside during a storm.*).
3. **Play A: Restore the Missing Title.** Pick the metaphor from a simile, a metaphor and a literal sentence. The correct answer restores the brass nameplate and the old man fades into his own shadow.
4. **Play B: The Painting Changes.** Each option changes the waiting lady's portrait: moths circle her (the correct metaphor), golden light (a metaphor with the wrong mood), a shiver (a simile), or nothing (plain description).
5. **Prove: The Portrait's Final Request.** Rewrite *The house was quiet.* as a metaphor. Each student metaphor is painted onto the empty frame. Model answer: *The house was a sleeping giant.*
6. **Complete.** The empty frame swings open; the Gallery Key waits in a small wall safe.

## 7. For developers

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (lesson logic, content checks, collision)
npm run build       # production build
node scripts/shots.mjs "http://localhost:4173/?testdt=0.5"     # phase 1 walkthrough + screenshots (needs npm run preview running)
node scripts/phase2.mjs                                        # keys, doors, paintings, gallery lesson, events (25 checks)
node scripts/interact.mjs                                      # real mouse and keyboard checks
npx vite-node scripts/render-footsteps.ts                      # renders footstep WAVs to docs/audio for listening
```

| Folder | What lives there |
|---|---|
| `src/content/simile.ts`, `metaphor.ts` | **All lesson wording.** Edit text here without touching game code. |
| `src/content/paintings.ts` | Painting titles, museum labels and questions |
| `src/lesson/` | Lesson state machine (pure, tested), the director that turns lesson state into room effects, navigation |
| `src/scene/` | 3D rooms (`EntranceHall`, `Corridor`, `HallOfMirrors`, `Exterior`), the player, lighting, sky |
| `src/scene/parts/` | Reusable building blocks: walls, panelling, mouldings, doors, windows, lights, furniture, mirrors, curtains |
| `src/systems/` | Procedural textures, materials, geometry helpers, synthesised audio, interaction registry |
| `src/world/` | Room dimensions, camera shots, collision |
| `src/ui/` | Title screen, HUD, lesson panel, teacher panel |

**Adding the next room:** add its dimensions to `src/world/layout.ts`, build it from the parts in `src/scene/parts/`, put its wording in a new `src/content/<device>.ts`, and give it a lesson machine like `src/lesson/lessonMachine.ts`. See `IMPLEMENTATION_STATUS.md` for the recommended next steps.

## Screenshots

Captured from the real game by `scripts/shots.mjs` (software renderer, 1600 × 900): see `docs/screenshots/`.

| | |
|---|---|
| ![Title](docs/screenshots/01-title.jpg) | ![Entrance hall](docs/screenshots/02-hall-start.jpg) |
| ![Hall of Mirrors](docs/screenshots/09-mirrors-back.jpg) | ![Learn](docs/screenshots/13-learn-annotate.jpg) |
| ![Endless tunnel](docs/screenshots/16-playA-right.jpg) | ![Prove](docs/screenshots/20-prove-model.jpg) |

Phase 2, captured by `scripts/phase2.mjs`:

| | |
|---|---|
| ![Mirror Key in the drawer](docs/screenshots/p2-05-mirror-key-in-drawer.jpg) | ![Portrait Gallery](docs/screenshots/p2-07-gallery-wide.jpg) |
| ![Inspecting the caretaker](docs/screenshots/p2-10-inspect-caretaker.jpg) | ![Simile or metaphor](docs/screenshots/p2-14b-compare-settled.jpg) |
| ![Moths](docs/screenshots/p2-18b-moths.jpg) | ![Gallery complete](docs/screenshots/p2-21-gallery-complete.jpg) |
