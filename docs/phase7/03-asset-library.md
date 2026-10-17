# Phase 7.3 — Modular asset library (proposed)

Each entry is a reusable kit or model, the source it should come from, and where it goes in the game.
**Status:** ✅ pilot built and validated · 🔜 recommended next · ⏸ later / only if needed.

Principles: build kits, not one-offs; share materials with the house; let the runtime assemble sizes
(stretch zones, unit-length runs, mirrored corners) so one model serves many places; load per room.

## Architecture

| Asset | Status | Source | Game locations (component → replacement) |
|---|---|---|---|
| Four-panel door leaf (stretchable) | ✅ | Built in Blender (`build_door_kit.py`) | `Door`/`KeyedDoor` leaves: kitchen, study, gallery, dining, echoes, press, ballroom, front pair (0.95 × 3.1), mirror door (1.25 × 2.45) |
| Door hardware (knob, rose, escutcheon, hinges) | ✅ | Built, uses the house brass | Merged into every leaf |
| Architrave kit (leg, head, corner block + rosette, plinth) | ✅ | Built | `Architrave` (16 uses) |
| Door jamb lining + stop bead | 🔜 | Build (unit-length run, wall-depth parameter) | Every door opening; fixes the dark reveal seen with the door open |
| Panelled jib door variant | ⏸ | Door kit + wainscot material | `JibDoor` (Hall of Mirrors) |
| Wainscot panel / dado / skirting kit | ⏸ | Build; same walnut as the doors | `Wainscot` (27 runs). The procedural version is adequate; upgrade only the material first |
| Crown moulding / picture rail runs | ⏸ | Build profile runs | `Cornice`, `Run profile="pictureRail"` |
| Staircase newel, baluster, handrail | ⏸ | Build | Entrance hall staircase |

## Furniture

| Asset | Status | Source | Game locations |
|---|---|---|---|
| Rococo Revival console table (walnut) | ✅ | Poly Haven `ClassicConsole_01` (CC0), retinted | Hall (under the landing); Corridor console; Hall of Mirrors consoles (marble-top variant) |
| Victorian side chair | 🔜 | Poly Haven search first, else build | `SideChair` ×6 |
| Hall settle / upholstered armchair | 🔜 | Poly Haven (velvet) | `Settle`, study, nursery |
| Writing desk | ⏸ | Poly Haven `vintage` desks or build | Scholar's Study `Desk` (interactive: keep its drawer logic) |
| Bookcase | ⏸ | Poly Haven `vintage_cabinet_01` style / build | Study `Bookcases` |
| Display cabinet / glass case | ⏸ | Poly Haven `vintage_cabinet_01` | Ballroom `SecretCase` (interactive) |
| Side tables, centre table | ⏸ | Poly Haven `ClassicNightstand_01`, `side_table_tall_01` | Hall centre table, drawing rooms |

## Fittings and environmental objects

| Asset | Status | Source | Game locations |
|---|---|---|---|
| Wall sconce (brass, glass shades) | ⏸ | Build, instanced | `Sconce` ×16 (keep `CandleLight` logic) |
| Candelabrum / candlesticks | ⏸ | Build | `Candelabrum` ×8 |
| Chandelier | ⏸ | Build | `Chandelier` ×5 (keep lights and events) |
| Grandfather clock | ⏸ | Build; pendulum and hands stay separate objects | Hall (animated, audio-synced) |
| Vases, urns, small decorative objects | ⏸ | Poly Haven | Mantels, consoles |

## Paintings

| Asset | Status | Source | Game locations |
|---|---|---|---|
| Ornate swept gilt frame kit (corner + rails, any aspect) | ✅ | Poly Haven `fancy_picture_frame_02` (CC0), decimated and cut into a kit | The 9 lesson `ArtPainting`s (inspected close up) |
| Plain / slim mitred frame (same moulding, 1 draw call) | ✅ | Runtime variant of the same kit | The 16 decorative `Painting`s, and distant LOD for ornate frames |
| Dark wood frame variant | 🔜 | Same kit with a walnut material | Portraits in the study and nursery |
| Picture light, nameplate | keep | Existing components | Already work with the new frame |

Astra's paintings are never part of a frame: the canvas is a separate plane with its own texture
(the game's living painting material), sized by the image's aspect ratio. The frame is built around it.

## Model → game location map (pilots)

| File | Node | Replaces | Location |
|---|---|---|---|
| `console_table_walnut.glb` | `ConsoleTable_Walnut` | `ConsoleTable` at `[-2.9, 0, HALL.zBack]` | Entrance hall, under the landing. Collider must widen to 1.55 × 0.62 m; candelabrum rises to the 0.95 m top |
| `door_kit_victorian.glb` | `DoorLeaf_4Panel` + `DoorLeaf_Hardware` | `DoorLeaf` inside `Door` | Every door (stretch zones handle other sizes) |
| `door_kit_victorian.glb` | `Architrave_*` | `Architrave` | Every door opening, both faces |
| `frame_kit_ornate.glb` | `FrameOrnate_*` | `ProfileFrame` in `ArtPainting` / `Painting` | Every painting (ornate or plain) |
