# Phase 7.5 — Blender → GLB → game pipeline

## Where things live

| What | Where | In git? |
|---|---|---|
| Blender source (`hosl_phase7_pilots.blend`, all textures packed) | `Desktop/hosl-asset-production/blender/` | No (large binary) |
| Pipeline scripts (repeatable) | `Desktop/hosl-asset-production/blender/scripts/` | No — copies in `docs/phase7/blender-scripts/` |
| Poly Haven downloads | packed in the .blend (CC0) | No |
| Review exports + `export_stats.json` | `Desktop/hosl-asset-production/exports-raw/` | No |
| Renders, look-dev captures | `Desktop/hosl-asset-production/renders/` | No (selected ones in `docs/phase7/screenshots/`) |
| Game-ready GLBs | `preview/models/` (pilot), `public/models/` on integration | Yes |
| Pre-Phase-7 Blender scene backup | `Desktop/hosl-asset-production/backup/pre_phase7_scene_backup.blend` | No |

`preview/models/` is served by `npm run dev` but never copied by `npm run build`, so the classroom
build stays byte-identical to `classroom-release-v2-audio` (verified with `diff -r`).

## Blender scene

Collections: `00_Reference_PolyHaven` (untouched originals), `A_ConsoleTable`, `B_DoorKit`,
`C_FrameKit`, `_Lookdev` (review assemblies), `_Archive_PreviousTable` (the table that was in the
scene before Phase 7, excluded from the view layer).

## Scripts (run inside Blender: `exec(open(path).read())`)

| Script | Does |
|---|---|
| `build_door_kit.py` | Builds the door leaf, hardware and architrave pieces from parameters; darkens the Poly Haven walnut to the house tone; bakes short-range AO + wear into vertex colours |
| `lookdev_finish.py` | Applies the values chosen in the game-lit preview: console walnut tone, aged gilt (×`#e3d3a0`, metalness 0.6, roughness ×0.85), gesso speckle on the frame rails. Idempotent (works from `__src` copies) |
| `export_pilots.py` | Normals (sharp by angle + weighted), texture sizes, single-sided materials, glTF extras (kit type, pivots, stretch zones, footprint, location); exports GLB with WebP textures; writes statistics |
| `render_sheet.py` | Studio renders for the asset sheet |

The frame kit was made interactively once (decimate Poly Haven frame 02 to 25%, remove its backing,
bisect at x = −0.075 / z = 0.10, extrude the cut sections into unit rails, sample the corner texture into
a rail strip, rebake the corner to a packed 512 atlas). The steps and constants are recorded in
`04-pilot-report.md`; a scripted rebuild is a recommended follow-up.

## Rules the exporter enforces (so kits share the house's shaders)

1. Materials single-sided.
2. Metalness is one constant per material (the packed metallic-roughness map is used for roughness
   only; the loader drops the metalness map).
3. Only colour, roughness and normal maps, plus optional vertex-colour AO.
4. Material names `M_Brass` / `M_BlackPaint` are swapped at load for the house materials.

Result: the three pilots add **one** shader program to the hall (the door's vertex-colour AO).

## Validation

```
node scripts/phase7/validate-glb.mjs preview/models/*.glb     # bounds, attributes, materials, images, extras
```

## Runtime (`src/assets3d/pilotKits.ts`)

- `loadModel` (cached GLTFLoader from three/examples, no new dependency)
- `frameGeometry(kit, w, h, 'ornate' | 'plain', slim)` → one merged geometry, two draw groups
- `doorLeaf(kit, w, h, sharedMaterials)` → leaf group stretched only inside the panel fields
- `architraveGeometry(kit, c, w, h)` → one merged mesh, same arguments as `<Architrave>`
- `consoleTable()`
- `warmUp(gl, objects, camera, scene)` → compiles for the composer's half-float target, uploads textures

## Preview and measurement

```
npm run dev -- --port 5180
http://localhost:5180/preview/assets.html        # isolated look-dev (keys 1-6 views, O doors)
http://localhost:5180/preview/hall.html          # real game, pilots in the entrance hall (?pilot=0 baseline)

node scripts/phase7/preview-shots.mjs            # look-dev screenshots + per-asset stats
node scripts/phase7/audit.mjs <url> low <dir>    # game screenshots + frame time / draw calls
node scripts/phase7/bench.mjs low 4              # in-session A/B (original vs pilot), medians
node scripts/phase7/programs.mjs                 # shader programs added by the pilots
node scripts/phase7/loadbench.mjs [cpuThrottle]  # fetch / parse / upload cost per model
```
