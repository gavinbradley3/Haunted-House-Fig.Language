# Phase 7.2 — Victorian art-direction guide

**The house:** an inherited residence furnished between about 1840 and 1890, expensive when new,
neglected since. Everything should look as if it was bought by someone wealthy and then left alone
for thirty years. The unease comes from the dark, the silence and small wrongness, never from props
that look like a haunted-house ride.

## Period vocabulary

| Use | Period | Avoid |
|---|---|---|
| Rococo Revival carving (cabriole legs, C- and S-scrolls, shells, acanthus) | 1840–1870 | Baroque excess, gothic spikes, skulls |
| Four-panel doors, raised-and-fielded panels, moulded architraves with corner blocks and plinths | 1860–1890 | Medieval plank doors, iron straps, castle hardware |
| Swept gilt frames with compo ornament at the corners | 1840–1890 | Clean modern gold, thin metal frames, oversized ornament |
| Turned and carved walnut, mahogany, oak | throughout | Pale or painted wood, plywood-straight grain |
| Mortice knobs on roses, keyhole escutcheons, butt hinges in brass | throughout | Lever handles, chrome, black iron |
| Marble tops and chimneypieces, damask wallpaper, walnut wainscot | throughout | Tiles, wallpaper with modern motifs |

## Materials

Values are linear-light PBR as the game's `MeshStandardMaterial` sees them. Every new material should
be checked under the game's own lighting (`preview/assets.html`) before it is accepted, not in Blender.

| Material | Base colour (sRGB mean) | Roughness | Metalness | Notes |
|---|---|---|---|---|
| Walnut (house standard) | ≈ 0.25 / 0.15 / 0.095 — the game's `WOOD.walnut` mid `#3f2717` | 0.6–0.7 | 0 | Every new walnut asset is calibrated to this so it sits with the existing panelling |
| Carved walnut furniture | ≈ 0.24 / 0.15 / 0.095 | texture 0.3–0.6 | 0 | Cavity darkening baked into the colour map |
| Aged gilt (frames) | gold leaf × `#e3d3a0`, mean ≈ 0.38 / 0.27 / 0.12 | 0.35–0.45 | 0.6 constant | Darker and yellower than new gold; reads warm-copper under candles. Never authored as pale non-metal paint |
| Brass hardware | the house `brass` material | 0.35 | 1 | Kits name it `M_Brass` and the loader swaps in the shared material |
| Black japanning / keyholes | the house `blackPaint` | 0.45 | 0 | `M_BlackPaint` swapped likewise |

**Wear:** subtle and logical — darker where hands and feet touch (around knobs, along the bottom rail
and plinths), grime in recesses, polish rubbed thin on the high points. No scratches for their own sake,
no cobwebs baked into furniture, nothing uniformly shiny.

## Proportion checks (metres)

| Element | Typical Victorian size | Game |
|---|---|---|
| Interior door | 0.84–0.91 × 2.03–2.29, 45–50 mm thick | 0.96 × 2.30 × 0.05 (game scale) |
| Door stiles / bottom rail / lock rail | 100–120 / 200–240 / 180–200 mm | 115 / 230 / 200 |
| Upper : lower panel height | ~1.6–1.9 : 1 | 1.83 : 1 |
| Architrave width | 115–150 mm | 140 mm, blocks 165 mm |
| Door knob height / diameter | ~0.9–1.0 m / 50–60 mm | 1.0 m / 62 mm |
| Hall console table | 0.80–0.95 high, 0.35–0.60 deep | 0.95 × 1.54 × 0.59 |
| Swept frame moulding width | 80–150 mm on a 0.5–1 m painting | 130 mm |

## Composition and lighting

- No new runtime lights for decorative models. Atmosphere comes from the existing sconces, candles,
  chandeliers and moon, plus baked occlusion in the assets.
- Hero pieces (lesson paintings, doors the player opens, the first room's furniture) get the richest
  assets; background pieces get the plain variants of the same kits.
- Nothing decorative may narrow a walking route or sit inside an interaction ray.
- Paintings: the frame is the setting, never the subject. The ornate kit's lip covers 10 mm of canvas
  per side; carved ornament stays outside the sight edge so Astra's artwork is never obscured.

## Asset standards

- Real scale in metres, Blender Z-up / front −Y, exported glTF Y-up / front +Z.
- Pivots where the game expects them (door hinge at the floor, furniture back edge at the floor,
  frame at the sight-opening corner, architrave on the wall face).
- Single-sided materials; constant metalness per material; colour + roughness + normal maps only
  (the variants the house already compiles). Vertex-colour AO is allowed on kit pieces (one program).
- Textures: 1024 only for hero colour/normal maps; roughness and small pieces 512 or less.
- Triangles: hero furniture ≤ 8k; kit pieces ≤ 2k; architectural runs a few dozen.
- Shadows: wall-hung objects do not cast shadows.
