# Phase 7 — Victorian 3D assets (pilot)

Branch `feature/victorian-3d-assets`, from `main` at `6905c1a` (= tag `classroom-release-v2-audio`).
Nothing here changes the classroom game: no game source file was modified, the pilot models live in
`preview/models/` (dev-served only), and `npm run build` produces output byte-identical to the release.

| # | Deliverable | Where |
|---|---|---|
| 1 | Visual asset audit | [01-visual-asset-audit.md](01-visual-asset-audit.md) |
| 2 | Victorian art-direction guide | [02-art-direction.md](02-art-direction.md) |
| 3 | Modular asset library + model → location map | [03-asset-library.md](03-asset-library.md) |
| 4 | Three pilot models in Blender | `Desktop/hosl-asset-production/blender/hosl_phase7_pilots.blend` |
| 5 | Game-ready GLBs | [`preview/models/`](../../preview/models/) |
| 6 | Preview scenes | `preview/assets.html` (isolated), `preview/hall.html` (real game) |
| 7 | Screenshots | [`screenshots/`](screenshots/) — `preview/`, `hall-pilot/`, `hall-baseline/`, `blender/`, `audit/` |
| 8 | Geometry / texture / file-size statistics | [04-pilot-report.md](04-pilot-report.md#statistics) |
| 9 | Performance comparison | [04-pilot-report.md](04-pilot-report.md#performance) |
| 10 | Recommended next assets | [04-pilot-report.md](04-pilot-report.md#recommendations) |
| — | Pipeline and how to rebuild/measure | [05-pipeline.md](05-pipeline.md), [`blender-scripts/`](blender-scripts/) |

## Try it

```
npm run dev -- --port 5180
open http://localhost:5180/preview/assets.html     # keys 1-6 camera views, O swings the doors
open http://localhost:5180/preview/hall.html       # the real game with the pilots in the entrance hall
open http://localhost:5180/preview/hall.html?pilot=0   # the same page without them
```

## Files added on this branch

```
preview/assets.html, preview/hall.html, preview/models/*.glb   dev-only pages and models
src/assets3d/pilotKits.ts                                       loader + kit assembly (not imported by the game)
src/preview/assets.tsx, src/preview/hall.tsx                    the two preview pages
scripts/phase7/*.mjs                                             capture, benchmark and validation scripts
docs/phase7/                                                     this documentation, screenshots, metrics
```
