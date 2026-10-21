# Phase 12: The Last Dance

Branch `feature/last-dance` (from `main` at ee697e1, the classroom-release-v4-haunting line). Not merged, not deployed.

## What was built

**The story.** In December 1874 the Lady held a winter ball; nine guests came; at midnight the music stopped and every door locked; by morning the guests were gone. They are in the portraits she painted that evening, and she is in her own. Told through the house, a step at a time, never in one long text. The question of whether she meant to save them or keep them is left open.

**During the nine lessons: two story moments** (once each, saved, never during a lesson; `src/scene/LastDanceDirector.tsx`):
- After the Hall of Mirrors lesson: walking back up the corridor, the Lady is seen at the far end of the corridor and steps out of sight; the door behind the student slams; *"Someone else is in the house."* If the student never walks that way, a quieter version happens in the hall or corridor within a few minutes.
- After the fourth lesson: back in the entrance hall, her humming by the fireplace draws the eye to her portrait, which is empty; *"The Lady's portrait is empty. Where has she gone?"* She is back when the student looks away.

These are separate from the random haunting (which stays as it was, except that it now leaves her portrait alone while the story is using it, and her sightings come due sooner while the student searches the house for the paintings).

**After the lessons: the bonus chapter** (`src/story/`, `src/content/lastDance.ts`, `src/scene/LastDanceRooms.tsx`, `src/ui/StoryCards.tsx`):
1. Chapter card after the ending card; the house returns to night; a music box upstairs, cut off; three knocks behind the locked doors. Her portrait stays empty while she is upstairs.
2. The landing diary holds a loose page of four clues (the diary glows while it is the next step).
3. A four-wheel picture lock on the right-hand door. Each wheel shows eight of the house's paintings (the four answers and four others; paintings that could also fit a clue are deliberately not on the wheels). Wrong tries say how many are right and keep the wheels; hints after two tries; right wheels glow after three. Wheels and examined paintings are saved. J rereads the clues anywhere.
4. The Guest Records room: guest book (nine signed in, none signed out, and the portrait each became), coats still on their hooks, a desk of bills ("Cancel the carriages for the morning. Nobody will be leaving."), five portraits under dust sheets. Closing the book: a draught, whispering, and her key falls.
5. Her key opens the left-hand door: her room (vanity and mirror facing the door, music box, green silk gown, chaise, writing desk, empty frame).
6. The mirror: about 13 s with the camera held on the glass. Music box, cut dead; silence; three knocks on the door behind; the door slams; she appears in the mirror just behind the student's shoulder (she exists only in the reflection: a layer only the mirror's camera draws). The view is handed back; turn round and nobody is there. Then the candles recover, the door creaks open, her laugh from the landing, and THEY NEVER LEFT surfaces in the mist on the glass.
7. Her last letter on the desk (both readings of her are in it), a closing card, and on the way out a figure, faceless, standing in the empty frame by her door.

Gentle: no slams, no sting, she fades in slowly; same story. The menu note now says so.

**Required fixes**
- Lesson headings: the big term (PERSONIFICATION, ONOMATOPOEIA...) was 104 px with wide tracking (about 1200 px wide) in a 560–780 px panel. It now sizes itself to the panel and the longest word (container query units); the reveal animation no longer widens the tracking. Measured with no horizontal overflow at 1366×768 and 1280×720 for every term.
- The missing floorboard at the top of the stairs: the staircase drew 18 of its 19 treads, leaving a 31 cm hole between the last tread and the landing. All 19 are drawn now; collision was already continuous (unit-tested).

**Upstairs rooms in the house.** Floored at the landing's height above the gallery and the dining room, which the culling never draws at the same time. Their inner walls stand clear of the corridor's tall side walls. The two landing doorways are real openings; the doors are ordinary doors on the upper floor's collision. No new lights: the house's two shared room lights move into whichever room is in view.

**Sound.** New CC0 recordings (Kenney): a heavy slam and close knocks. Synthesised: the sting, the drone, the music box cut, the key drop. Measured mix at default volume: room tone -40, door -27, knocks -23, slam -20, sting -15.6 dBFS (loudest 43 ms). Sources and changes: `ASSETS.md`. Rebuild: `scripts/phase12/make-sounds.mjs`.

**Blender.** Reading stand with the open guest book, five dust-sheeted portraits, the vanity with its mirror frame, the music box: `scripts/phase12/blender/build_props.py` (headless; source .blend and preview renders in `Desktop/hosl-asset-production/phase12/`). The files use the house's material names and are re-materialled on load; each room shows a code-built stand-in until its model arrives, and the models are fetched when the chapter begins. 684 KB in all.

**Small reconciliations.** Four museum labels re-dated to 1874 (the three guest portraits and *A Deafening Silence*), so the labels agree with the guest book.

## Saves

All mystery progress is flags in the existing `found` record: no save-version change, readable by v4 (which ignores unknown flags). Continue restores a student inside an upstairs room only if its door has been opened, with that door open. Story moments are flags, so none replays after a reload.

## Tests

- Unit: 192 passed (16 new: the mystery's steps, the lock, saved wheels, the upstairs zones and walls, resume upstairs).
- `scripts/e2e/playthrough.mjs` (the whole student path, nine lessons and the ending, all 25 paintings): 213 passed, 0 failed, no page errors.
- `scripts/phase12/last-dance.mjs` (the story moments, the ending card, the chapter on foot with E and the real mouse, the lock's feedback, save and Continue mid-mystery, the encounter, the letter, the frame, Gentle): 58 passed, 0 failed, no page errors. Screenshots in `scripts/out/phase12/`.
- Low, 1366×768, Intel UHD 630, production test bundle (`scripts/phase12/perf.mjs`): hall 42 fps (released-game baseline), gallery 51, Guest Records 42, the Lady's room 40, the mirror encounter 33 (the reflection is drawn sharper for those seconds), the landing with both doors open 36 (p95 83 ms: a periodic hitch, likely the shadow refresh with both rooms in view). No shader compiles after the title screen.
- Production builds: student (no test hook, no teacher panel), teacher and test all build.

## Not done / known limits

- The coats on the hooks are still code-built (simple shapes); they read as coats at a glance but are the plainest objects in the new rooms.
- The landing's occasional hitch with both doors open (above). The rooms themselves run at the hall's frame rate.
- Not tested on a real Chromebook or with a class; the student build has not been deployed.
- Early on, a factory-settings reset I ran through Blender MCP cleared the open Blender's scene (it held only the default cube; nothing was saved over) and stopped its MCP server. The props were then built with Blender run headless from the command line. The MCP server needs restarting inside Blender (or Blender restarting) before it is used again.
