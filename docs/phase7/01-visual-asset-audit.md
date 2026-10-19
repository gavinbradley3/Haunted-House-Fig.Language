# Phase 7.1 — Visual asset audit

Measured on the target hardware: **Intel UHD Graphics 630** (ANGLE / Direct3D 11), Chrome, 1600×900,
**Low** quality (the classroom default for integrated graphics). Screenshots:
`docs/phase7/screenshots/audit/` (game as released) and `screenshots/hall-baseline/`.

## How the mansion is built today

Everything in the house is generated in code at load time. There are no model files and no texture
files: `systems/geometry.ts` builds boxes, lathes (turned profiles) and swept mouldings; `systems/textures.ts`
paints every PBR texture on a canvas (wood, damask, marble, brass, rugs). `systems/materials.ts` shares
about 70 `MeshStandardMaterial`s across all rooms, so the whole house compiles only ~35 shader programs.

This is a strong technical base: consistent, cheap to load, compile stalls already eliminated. The
weakness is purely visual. The geometry vocabulary is boxes, lathes and straight profile runs, so
anything carved, curved or joined reads as "assembled from primitives" once the player is within two
metres of it.

## Where the procedural approach shows (entrance hall, Low quality)

| Object | What the player sees | Why it reads as amateur |
|---|---|---|
| **Picture frames** (`ProfileFrame`, 25 in the house) | A flat slab with four overlapping moulding runs; lit stripes at the corners | Mitre-free corners (runs overlap rather than meet); no carving; the gilt texture tiles visibly; the backing box shows at the sides |
| **Door leaves** (`DoorLeaf`, 13) | One flat plank with faint panels | Raised panels are 2 mm extrusions on a box, so they barely cast shading; the procedural veneer grain is coarse and stretched ("zebra" stripes); 27 draw calls per door + architrave |
| **Console table** (`ConsoleTable`, 3) | A marble slab on four spindly turned legs with a shelf | Kitchen-table proportions; plain box apron; no carving — the least "Victorian" object in the hall |
| Architraves (`Architrave`, 16) | Correct structure (blocks, rosettes, plinths) | Mouldings shallow; rosette is a single lathe; acceptable |
| Side chairs (`SideChair`, 6) | Bentwood-like hoop on a box seat | Seat is a box with a squashed sphere cushion; reads as a placeholder |
| Settle, coat stand, centre table | Box-and-lathe assemblies | Proportions fine, detail absent |
| Sconces (16), candelabra (8), chandeliers (5) | Lathe brass and tubes | Read acceptably in candlelight; lower priority |
| Wainscot / panelling (27 runs) | Raised fields with dado and skirting | Convincing at distance; the shared procedural walnut is the weakest material in close view |
| Staircase, landing, fireplace | Lathe balusters, marble boxes | Good silhouette; fine for now |

Simple geometry is the right choice for invisible structure (walls, floors, ceilings, collision boxes)
and for objects the lessons animate procedurally; those should stay as they are.

## Objects with gameplay that any replacement must preserve

| Object | Behaviour to keep |
|---|---|
| Doors: `kitchen-door`, `study-door`, `gallery-door`, `dining-door`, `echoes-door`, `press-door`, `ballroom-door`, `mirror-door`, `jib-door`, front doors | `Door.tsx` spring animation, dynamic collider, interaction label/use, key-turn sequence (`KeyedDoor`), room plaque |
| Lesson paintings (`painting-${id}`, 9 `ArtPainting`s) | Living shader effects (moths, warmth, shiver, fade, text), tilt on its nail, close inspection camera, nameplates, picture lights |
| Keys (`key-${id}`), mirror-room key drawer, study desk, press machine, piano, music box | Interaction targets and reveal animations |
| Grandfather clock | Swinging pendulum and hands synced to audio and house events |

## Highest-value replacements (ranked)

1. **Picture frames.** 25 instances, seen at eye level in every room, and the 9 lesson paintings are
   inspected at ~1.3 m. A frame kit lifts every room at once.
2. **Door leaves + architraves.** 13 leaves and 16 architraves; doors are the player's most frequent
   close-up interaction.
3. **Console / hall furniture.** Few instances but hero placement (first room, under the first
   lesson painting); sets the furniture standard for later rooms.
4. Side chairs (6) and the settle — clearly placeholder in close view.
5. Sconces / candelabra — later, only if a shared brass kit can be instanced.

These three were built as the pilots (see `04-pilot-report.md`).

## Baseline performance (entrance hall, Low, UHD 630)

| View | Frame time | Draw calls | Triangles |
|---|---|---|---|
| Hall entry | 51–56 ms | ~1,280 | ~138k |
| Console + painting | 45–48 ms | ~760 | ~77k |
| Kitchen door | 38–41 ms | ~475 | ~55k |

Frame time is dominated by fill rate and lighting at this resolution, not geometry: the hall already
renders well over 100k triangles a frame. That is why the pilot budget was set by draw calls,
shader programs and texture memory, not just triangle counts.
