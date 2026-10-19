# Phase 7.4 — Pilot report: console table, door kit, frame kit

All measurements: Intel UHD Graphics 630 (ANGLE / D3D11), Chrome, 1600×900, **Low** quality.

## What was built

| Pilot | Approach | Why |
|---|---|---|
| **A. Console table** | Poly Haven `ClassicConsole_01` (CC0), retinted to the house walnut, metallic map removed, single-sided, pivot at back-centre-floor | A genuine Rococo Revival (1840–70) carved console at 7.6k triangles. Hand-carved quality that procedural modelling could not match in reasonable time |
| **B. Door kit** | Built in Blender by script: four-panel leaf with stuck ogee mouldings and raised fields, brass knob/rose/escutcheon/hinges, architrave leg/head/corner block (bullseye rosette)/plinth. Poly Haven smoked walnut veneer, AO and wear baked into vertex colours | No suitable CC0 Victorian door exists (Poly Haven only has a medieval castle gate) |
| **C. Frame kit** | Poly Haven `fancy_picture_frame_02` (CC0) decimated 35k → 8.8k triangles, backing removed, cut into one carved corner (mirrored ×4) and two unit-length rails that continue its exact cross-section. Corner rebaked into a packed 512 atlas; rail texture sampled from the corner's cut edge plus gesso speckle; aged gilt (metalness 0.6) | Authentic carving at any aspect ratio; artwork stays an independent texture |

Runtime variants: the frame kit also builds a **plain mitred** frame (same moulding, 500 triangles,
optional `slim` factor) for decorative paintings. The door leaf stretches only inside its flat panel
fields, so one model serves 0.96 × 2.3 interior doors, 0.95 × 3.1 front leaves and the 1.25 × 2.45
mirror door, with the lock rail staying at hand height.

## Statistics

| | Console | Door kit (leaf + hardware + architrave) | Ornate frame (assembled) | Plain frame |
|---|---|---|---|---|
| Triangles | 7,566 | 3,694 | 8,012 | ~500 |
| Draw calls | 1 | 4 (wood, brass, keyhole, architrave) | 2 | 1 |
| New textures | 1k colour, 1k normal, 512 roughness | 1k colour | 3 × 512² + 512×256 | shared |
| GPU texture memory (RGBA8 + mips) | 12.6 MB | 5.6 MB | 4.9 MB | shared |
| GLB file | 587 KB | 171 KB | 195 KB | (same file) |
| Load: fetch + parse + upload | 51 ms | 25 ms | 23 ms | — |
| …at 4× CPU throttle | 152 ms | 68 ms | 81 ms | — |
| Shader programs added | 0 | 1 (vertex-colour AO) | 0 | 0 |

**Replaced procedural assets for comparison:** console 2,148 tris / 7 draws; door leaf + architrave
1,756 tris / **27 draws**; frame 142 tris / 6 draws.

All three pilots together: 973 KB on disk, +8 textures (≈23 MB GPU), +1 shader program
(35 → 36 in the hall). Raw data: `export-stats.json`, `bench-low.json`, `loadbench-cpu*.json`,
`screenshots/*/low-metrics.json`, `screenshots/preview/low-stats.json`.

## Performance

In-session A/B in the real entrance hall (`scripts/phase7/bench.mjs`): the same page swaps the
original assets and the pilots in place, 4 alternating repetitions × 150 frames per view, medians.

| View | Original | Pilot | Δ | Draw calls | Triangles |
|---|---|---|---|---|---|
| Hall entry | 51.6 ms | 51.0 ms | −1.2% | 1252 → 1206 | 135k → 154k |
| Console + painting | 44.4 | 45.6 | +2.7% | 740 → 739 | 74k → 94k |
| Console close-up | 48.0 | 50.3 | **+4.9%** | 694 → 708 | 72k → 94k |
| Kitchen door | 38.0 | 38.0 | 0.0% | 454 → 432 | 52k → 59k |
| Painting close-up | 44.1 | 44.4 | +0.8% | 677 → 681 | 65k → 86k |

Spread between repetitions of the same condition is 1.4–3.8 ms, so most deltas are noise. The
console close-up is consistently a little slower in both benchmark runs (+0.8 and +2.3 ms): the table
fills a large part of the screen with a normal-mapped material. Overall the pilots are close to
performance-neutral on Low, while cutting draw calls for doors.

Issues found and fixed during measurement (each would have shipped otherwise):

- Pre-compiling against the screen instead of the effect composer's buffer built **24 unused shader
  programs**; `warmUp()` now compiles for the half-float target, as the game's own `Precompile` does.
- GLTFLoader binds the packed roughness map as a metalness map, Poly Haven materials are double-sided,
  and baked AO arrived as RGBA. Each made a new shader variant; the loader and exporter now enforce
  house-compatible materials.
- Wall-hung frames cast shadows: ~8k triangles per shadow pass for a shadow a few millimetres wide.
  Disabled.
- Page-to-page comparisons on this laptop varied by up to ±6 ms (thermal throttling, other processes),
  which is why the final numbers come from the in-session A/B.

## Quality gate

| Question | Console | Door kit | Frame kit |
|---|---|---|---|
| More believable than the procedural version? | **Yes, by far** — real carving vs a slab on sticks | **Yes** — real panel depth, correct joinery, period hardware | **Yes** at room and inspection distance |
| Fits 1840–1890? | Rococo Revival, 1840s–60s | 1860–90 four-panel with corner-block architrave | Swept compo frame, typical of the period |
| Materials convincing under game lighting? | Yes after retint; wear on the top is on the heavy side | Yes after grime pass | Yes after aged-gilt tuning; Poly Haven's original pale paint was not |
| Proportions accurate? | Yes (0.95 h, 1.54 w) | Yes (see art direction) | Yes; ornament stays outside the sight edge |
| One coherent mansion? | Calibrated to the house walnut | Same walnut; uses the house brass | Same family as the existing gilt |
| Reusable? | 3 console slots (marble-top variant needed for the mirror room) | All 13 leaves and 16 architraves | All 25 paintings (ornate + plain) |
| Interaction and collision preserved? | Collider must widen (1.55 × 0.62); candelabrum lifted to the new top | **Proven in game**: leaf inside the existing `Door`, swings, collides, keeps plaque and label | Works with the living painting material, tilt and inspection |
| Performance acceptable on school hardware? | Yes; the heaviest pilot in texture memory | Yes; fewer draw calls than the original | Yes if ornate frames are limited to the 9 lesson paintings |
| Worth implementing throughout? | Yes, for hero placements | **Yes** | Yes, after the joint fix below |

**Known weaknesses (not hidden):**

1. **Frame corner–rail joint.** In close studio light (`screenshots/blender/sheet_frame_corner_detail.png`)
   the carved corner's gesso texture reads paler and matter than the plainer rail. In game at
   inspection distance it shows as a faint tone step. Fix before using it on lesson paintings: bake the
   rail strip from the source frame's own straight sections, or cap each joint with a small carved
   ornament, as period swept frames do.
2. **No door jamb lining.** With the door open the reveal reads as a dark slot. Add a lining + stop
   bead piece to the kit.
3. **Console texture budget.** 12.6 MB for one table. Test a 512 normal map; for mansion-wide rollout,
   adopt KTX2/Basis compression (three's own `KTX2Loader`, no npm dependency, but the transcoder
   files must be copied into the build — needs your approval).
4. The frame kit was cut interactively; its steps are recorded but not yet a single rebuild script.

**Verdict:** door kit approved for wider integration; console approved for hero placements; frame kit
approved with fix 1 required first. None of this has been merged into the game.

## Recommendations

**Next assets, in order:**

1. Frame joint fix + dark-wood frame variant, then integrate frames (ornate for the 9 lesson paintings,
   plain/slim for the 16 decorative ones, plain as distance LOD).
2. Door jamb lining; then integrate the door kit for all doors (both faces of each architrave).
3. Side chair (×6) and settle — the most visibly placeholder furniture left.
4. Marble-top console variant for the Hall of Mirrors and corridor.
5. Shared brass sconce/candelabrum kit (instanced) — only after measuring.

**Integration approach (when approved):** move GLBs to `public/models/`; load per room during the
title screen with `warmUp()`; replace `DoorLeaf`, `Architrave`, `ProfileFrame` and `ConsoleTable`
behind their existing props so `Door`, `KeyedDoor`, `ArtPainting` and room layouts don't change;
update the console collider; re-run `bench.mjs` on each room.
