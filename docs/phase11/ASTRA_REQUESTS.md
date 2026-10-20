# Astra image requests — the Lady in Green (Phase 11)

**Status: both delivered and integrated (2026-10-19).** `painting-ladyOfHouse-empty.webp` (768×1024, opaque) switches on the `ladyGone` event; `lady-apparition.webp` (400×1024, RGBA; delivered as `lady-of-house-apparition.webp`, installed under the loader's name) replaced the stand-in cut-out. The requests are kept below as the record of what was asked for.

Two images would improve the haunting. Neither blocks the release: the game already runs without them.

- **Request 1** (empty portrait) switches on a new event that is already built and waiting for the file.
- **Request 2** (full-length figure) replaces a stand-in that is already in the game.

Both must show **the same woman as the existing paintings**, not a new or generic ghost.

## The reference: who she is

Reference images (attach both to each request):

- `src/assets/paintings/inspect/painting-ladyOfHouse.webp` (native resolution; in-game copy `src/assets/paintings/painting-ladyOfHouse.webp`, 768×1024)
- `src/assets/paintings/inspect/painting-ladyOfHouse-turned.webp` (the same painting, her face turned to the viewer)

Details that must stay identical:

- Pale oval face, dark straight brows, grey-green eyes, small mouth, **a small dark mole on her right cheek** (the viewer's left), below the eye.
- Dark brown hair parted in the centre, drawn back into a low knot at the nape, with **one white streak** sweeping back from her right temple (the viewer's left).
- **Single-strand pearl necklace**, close at the base of the throat.
- **Deep bottle-green silk taffeta gown** with a crinkled sheen, square neckline edged with **black lace**, fitted pointed bodice, long fitted sleeves, full skirt. A thin gold ring on her left hand.
- Mid-Victorian oil portrait style (c. 1870): soft academic brushwork, warm brown-and-umber background, warm candle or lamplight from the upper left, fine canvas texture.
- Expression: composed, unsmiling, quietly watchful. Never grotesque, never decayed, never glowing.

---

## Request 1 — her portrait, with her gone

**File:** `painting-ladyOfHouse-empty.webp` → put it in `src/assets/haunting/`

**What it is for:** Now and then, while a student has their back to the hall fireplace, the Lady's portrait shows only the empty chair and curtain. When they look back and then away again, she has returned. Shortly afterwards she may be seen somewhere in the house. The code is finished; the event switches on automatically once this file exists (`ladyGone` in `src/scene/HouseEvents.tsx`).

**Instruction to Astra:**

> Repaint `painting-ladyOfHouse.webp` exactly, but with the woman absent. Keep every other element pixel-aligned with the original: the canvas edges, the warm brown background and its brushwork, the red velvet curtain on the right with its folds, and the carved mahogany chair back with red velvet upholstery at lower right. Where she stood, continue the background wall and the chair naturally. Show more of the chair back where her hand and dress covered it, and add a hint of the chair's seat. No figure, no silhouette, no shadow of a person, no ghostly traces. The image should look like the same painting, simply without her.

**Specification:**

- Exactly **768 × 1024 px** (3:4 portrait), the same framing as `painting-ladyOfHouse.webp`, so it swaps in place.
- WebP, fully **opaque** (no transparency), sRGB, quality about 85 (under 150 KB).
- Same colour grading, brightness and canvas texture as the original. Overlay the two at 50%: the curtain and chair must line up.
- Optional: a 2000 px-wide version for the archive. The game only needs the 768 × 1024 file.

---

## Request 2 — the Lady, full length, for the apparition

**File:** `lady-apparition.webp` → **replaces** the stand-in in `src/assets/haunting/`

**What it is for:** The rare apparition. For two or three seconds she is seen standing far away, then she steps out of sight. She may appear at the landing rail, in the doorway at the end of the corridor, or by the window at the far end of the Hall of Mirrors. On screen she is about 80–200 pixels tall, drawn as a flat cut-out and dimmed to the light where she stands.

The current stand-in is cut from her portrait, which ends at her thighs. Below that, the skirt is stretched downward and fades out. It works at a distance, but a proper full-length figure would be better.

**Instruction to Astra:**

> Paint the same woman as in `painting-ladyOfHouse-turned.webp`, full length, standing upright and still, facing the viewer, arms relaxed at her sides with hands loosely together in front of her skirt. Same face (including the mole), same hair with the white streak, same pearls, same bottle-green silk gown with black lace neckline and long sleeves. The full skirt falls to the floor and hides her feet. Same mid-Victorian oil-painting style and warm light from the upper left. Paint the figure only, on a **fully transparent background**: no floor, no shadow, no frame, no vignette, no glow. Keep the edges clean and softly painted, not haloed.

**Specification:**

- **400 × 1024 px** (about 1:2.56). The figure fills the height: top of the hair about 8 px from the top edge, hem on the bottom edge, centred left to right.
- **WebP with alpha** (RGBA), sRGB, quality about 85 (under 120 KB). No semi-transparent fringe of background colour around the figure.
- Facing the viewer square-on: the game turns the flat image to face the student, so any pose that leans or turns sideways looks wrong.
- After saving it, change the size in one line of `src/systems/paintingImages.ts` (`HAUNT_IMAGES.apparition: { w: 400, h: 1024 }`). The game scales her to 1.68 m tall.

---

## Not needed

The watching portrait, and her face appearing in the Builder and Mourner portraits, are already done using the existing paintings. They need no new artwork.
