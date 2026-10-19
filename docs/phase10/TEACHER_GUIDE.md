# Teacher guide: students playing on their own Chromebooks

## Two editions of the game

| Edition | Build command | Output folder | Who uses it | Teacher panel (T) |
|---|---|---|---|---|
| **Student** | `npm run build` | `dist/` | Every student, on their own Chromebook | Not included. The code is left out of this build entirely. |
| **Teacher** | `npm run build:teacher` | `dist-teacher/` | You: projecting, and fixing a student's game | Included |

Both editions use the same saved game. A browser keeps saved data per **web address origin** (for example `https://our-house.netlify.app`), not per folder. If the teacher edition is published in a sub-folder of the same site as the student edition, it can open and repair any student's save on that student's Chromebook.

## Publishing (Netlify Drop or any static host)

1. Run `npm run build` and `npm run build:teacher`.
2. Make one folder to upload, for example `site/`:
   - copy everything inside `dist/` into `site/`;
   - copy everything inside `dist-teacher/` into a sub-folder with a name students will not guess, for example `site/staff-7q4m/`.
3. Upload `site/` (drag it onto app.netlify.com/drop, or your school's host).
4. Give students the site address. Keep the teacher address (`…/staff-7q4m/`) to yourself.

**Be honest with yourself about what this protects.** The student build contains no teacher controls at all, so there is nothing hidden inside it to unlock. The teacher edition's sub-folder is only *unlisted*, not locked: anyone who learns the address can open it. With no server or accounts there is no real password protection, and a hidden shortcut or a password typed into the page would not be real protection either. If a student does find the teacher address, all they can do is change **their own** saved game on **their own** Chromebook. If that is not acceptable, do not publish the teacher edition at all; keep it on your own computer for projecting, and reset a student's game by clearing site data instead (see below).

## Where progress is saved, and its limits

- Progress saves automatically, as students work, in the Chromebook profile's browser storage for the site's address. It survives closing the tab, signing out, restarting and shutting down.
- It belongs to **that Chromebook, that school account, that web address**. A different Chromebook, a different account, a guest or incognito window, or a different address (a new Netlify link, `http` instead of `https`) starts a new game.
- Deleting the student's profile from the Chromebook, or "Clear browsing data → Cookies and other site data" for the site, deletes the save.
- If a school policy clears browsing data at sign-out, progress will not survive. Check this on one Chromebook before relying on saving (see the checklist).
- The game asks the browser to keep its storage even when the disk is nearly full. The browser may decline; the game still saves either way.

## Helping a student who is stuck

| Problem | What to do |
|---|---|
| "I don't know where to go" | The bottom-left corner always shows the next step. The **Menu** (Esc, or the ≡ button) repeats it. |
| Stuck in a corner, or lost | **Menu → "I'm stuck: take me to the entrance hall"** (press twice). |
| Stuck on a challenge | Every wrong answer explains why it is wrong. If needed, open the teacher edition on their Chromebook: **T → Reveal the answer**. |
| Cannot finish a room's writing check | Read their sentence with them against the criteria. Teacher edition: **T → Lesson stage → Complete** moves them on. |
| The game froze or went black | The game shows "The house needs a moment": press **Reload the house**. Progress is kept. Close other tabs first. |
| "The house is open in another tab" | They opened the game twice. Close one tab; press the button in the tab they keep. |
| Wants to start again | Teacher edition: **T → Reset all progress** (press twice). A mistaken reset can be undone with **T → Undo the last reset**. |
| A save was damaged | The game notices, sets the damaged copy aside, and carries on from its backup (made at every completed room, key and door). The title screen says so. |
| You want to see a student's writing | Teacher edition: **T → Student's writing** lists the sentence that passed each room's writing check. |
| Reset without the teacher edition | In Chrome on that profile: Settings → Privacy and security → Third-party cookies → See all site data → search the site → delete. This erases the save completely (no undo). |

## What students can change themselves (Menu)

Volume and mute, their own footsteps on or off, captions for the house's sounds (when sound is off / always / never), look speed for mouse or trackpad, and how active the house is (Normal, Gentle, Off). Graphics are fixed at Low for every student.
