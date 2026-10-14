# The House of Strange Language

*Some doors are opened with keys. Others are opened with words.*

A first-person 3D mystery for teaching figurative language to Grade 7–8 classes. You drive it on the classroom screen while students discuss, vote and create. This first chapter covers the arrival, the entrance hall, a corridor, and **the Hall of Mirrors**, a complete lesson on **simile**.

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

The `dist/` folder is a self-contained website. It needs no internet connection, and you can copy it to a USB stick or host it on any static web host.

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

**Route:** Enter the House → walk through the entrance hall → go under the landing into the corridor → open the door at the end (*The Hall of Mirrors*) → look into the large mirror above the marble console. That starts the lesson.

## 4. Teacher controls (press T)

- **Pause / Resume** freezes the clock, the curtains and the sound while the class talks.
- **Skip animation** jumps to the end of any camera move.
- **Replay this moment** re-runs the room's reaction for the current step (ripples, light changes, curtain movement).
- **Reveal the answer** applies to Challenges A and B.
- **Reset this question** clears only the current step.
- **Reset the lesson** starts the simile lesson from the beginning.
- **Jump to lesson stage** goes straight to Discover, Learn, Play, Prove or Complete.
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

## 6. For developers

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (lesson logic, content checks, collision)
npm run build       # production build
node scripts/shots.mjs "http://localhost:4173/?testdt=0.5"   # automated browser walkthrough + screenshots (needs npm run preview running)
```

| Folder | What lives there |
|---|---|
| `src/content/simile.ts` | **All lesson wording.** Edit text here without touching game code. |
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
