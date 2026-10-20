# Teacher guide: students playing on their own Chromebooks

## Two editions of the game

| Edition | Build command | Output folder | Who uses it | Teacher panel (T) |
|---|---|---|---|---|
| **Student** | `npm run build` | `dist/` | Every student, on their own Chromebook | Not included. The code is left out of this build entirely. |
| **Teacher** | `npm run build:teacher` | `dist-teacher/` | You: projecting, and fixing a student's game | Included |

**Final arrangement:** only the student build is published (one Netlify site). The teacher edition is **not** published; it runs on the teacher's own computer from the local launcher in the `Real Game` folder (see `Real Game/READ ME.txt`).

A browser keeps saved data per **web address origin** (for example `https://our-house.netlify.app`). The local teacher edition (`http://localhost:8765`) therefore has its own saves and **cannot read or change a student's Chromebook save**. Use it for projecting, demonstrating and practising.

## Publishing the student build

1. Run `npm run build` (the student build goes to `dist/`).
2. First time: deploy `dist/` to a new Netlify site and give students that address.
3. Updates: deploy to the **same** Netlify site (Netlify → the site → Deploys → drag the folder in, or `netlify deploy --prod` to that site). A new site would mean a new address, and students would start over.
4. Never upload `dist-teacher/`.

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
| Stuck on a challenge | Every wrong answer explains why it is wrong; read the explanation with the student. |
| Cannot finish a room's writing check | Read their sentence with them against the criteria; when every criterion is honestly met, they can tick them and complete the room. |
| The game froze or went black | The game shows "The house needs a moment": press **Reload the house**. Progress is kept. Close other tabs first. |
| "The house is open in another tab" | They opened the game twice. Close one tab; press the button in the tab they keep. |
| Wants to start again | Delete the site's data on their Chromebook (last row). This cannot be undone. |
| A save was damaged | The game notices, sets the damaged copy aside, and carries on from its backup (made at every completed room, key and door). The title screen says so. |
| You want to see a student's writing | It is shown on their end card ("You wrote …") after the final lesson. |
| Start a student over | In Chrome on that profile: Settings → Privacy and security → Third-party cookies → See all site data → search the site → delete. This erases the save completely (no undo). |

## What students can change themselves (Menu)

Volume and mute, their own footsteps on or off, captions for the house's sounds (when sound is off / always / never), look speed for mouse or trackpad, and how active the house is (Normal, Gentle, Off). Graphics are fixed at Low for every student.
