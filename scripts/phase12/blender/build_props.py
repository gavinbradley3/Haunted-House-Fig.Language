"""
The Last Dance: Blender source for the upstairs rooms' focal props.

Run headless (Blender 5.2):
  blender --background --factory-startup --python scripts/phase12/blender/build_props.py -- <out folder>
Writes one GLB per prop (public/models/lastdance/*.glb in the game) and a .blend of everything.

Conventions (as the Phase 7 kits): metres, glTF y up; each prop's front faces the viewer (+z in the game,
-Y in Blender); its back stands against a wall at -z (+Y in Blender). Material names are the game's own
materials (walnut, mahogany, gilt, brass, linen, leather, pages, velvet): the game swaps in its own textured
materials by name, so the props are lit and textured exactly like the rest of the house. UVs are cube-projected
at one unit per metre, the scale the game's tiled materials expect.
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix

out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.abspath("public/models/lastdance")
os.makedirs(out_dir, exist_ok=True)
random.seed(7)
sc = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def mat(name, col, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


M = {
    "gilt": mat("gilt", (0.62, 0.46, 0.16), 0.4, 1.0),
    "linen": mat("linen", (0.74, 0.71, 0.63), 0.95),
    "walnut": mat("walnut", (0.25, 0.14, 0.07), 0.55),
    "mahogany": mat("mahogany", (0.3, 0.09, 0.05), 0.45),
    "brass": mat("brass", (0.75, 0.55, 0.25), 0.3, 1.0),
    "leather": mat("leather", (0.23, 0.13, 0.08), 0.55),
    "pages": mat("pages", (0.86, 0.81, 0.69), 0.9),
    "velvet": mat("velvet", (0.29, 0.07, 0.06), 0.9),
    "canvas": mat("canvas", (0.05, 0.04, 0.03), 0.35),
}


def activate(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def finish(o, material, uv=True):
    """Apply transforms and modifiers, give it its material and metric cube-projected UVs."""
    activate(o)
    for mod in list(o.modifiers):
        if mod.type in {"COLLISION"}:
            o.modifiers.remove(mod)
            continue
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.data.materials.clear()
    o.data.materials.append(M[material])
    if uv:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.cube_project(cube_size=1.0, correct_aspect=False, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
        b.limit_method = "ANGLE"
    return finish(o, material)


def lathe(name, profile, loc, material, segs=16):
    """A turned part from (radius, height) pairs, around the local z axis."""
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b in zip(verts, verts[1:]):
        bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], angle=math.tau, steps=segs, axis=(0, 0, 1), cent=(0, 0, 0))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.location = loc
    return finish(o, material)


def group(name, parts):
    root = bpy.data.objects.new(name, None)
    sc.collection.objects.link(root)
    for p in parts:
        p.parent = root
    return root


def export(root, file):
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for c in root.children_recursive:
        c.select_set(True)
    path = os.path.join(out_dir, file)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB", export_apply=True, export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    print("wrote", path, os.path.getsize(path), "bytes")


# ---------------------------------------------------------------- 1. the portraits under dust sheets
# Five frames leaning back against the wall (+Y), each with a linen sheet dropped over it by a cloth simulation.
def drape_sheet(name, w, h, d, seed):
    """A dust sheet thrown over a frame: down the front to a pooled hem on the floor, over the top edge and a
    little way down the back, wrapping round the sides; folds deepen toward the floor."""
    rnd = random.Random(seed)
    NU, NV = 24, 32
    over = 0.13  # how far the sheet reaches past each side of the frame
    flare, back = 0.2, 0.32
    # The path the sheet's centre line takes, from the hem on the floor up the front, over the top, down the back.
    segs = [("floor", flare), ("front", h), ("top", d), ("back", back)]
    total = sum(l for _, l in segs)
    ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    bm = bmesh.new()
    rows = []
    for j in range(NV + 1):
        t = j / NV * total
        for kind, l in segs:
            if t <= l + 1e-9:
                break
            t -= l
        row = []
        for i in range(NU + 1):
            s = i / NU * 2 - 1
            x = s * (w / 2 + over)
            e = max(0.0, abs(x) - w / 2)  # past the frame's edge: the cloth hangs round the side
            sx = math.copysign(1, x)
            if kind == "floor":
                y, z = -d / 2 - flare + t, 0.004
            elif kind == "front":
                y, z = -d / 2, t
            elif kind == "top":
                y, z = -d / 2 + t, h + 0.004
            else:
                y, z = d / 2, h - t
            if e > 0:
                x = sx * (w / 2 + 0.006 + e * 0.12)
                y += e * (0.8 if kind != "back" else -0.4)
                if kind == "top":
                    z -= e * 1.6
            # Folds: shallow near the top, deeper and wider toward the floor
            low = 1 - min(1.0, z / max(h, 0.01))
            amp = 0.006 + 0.03 * low * low + (0.02 if kind == "floor" else 0)
            fold = math.sin(x * 15 + ph[0] + low * 2) * 0.6 + math.sin(x * 31 + ph[1]) * 0.3 + math.sin(x * 7 + ph[2]) * 0.4
            if kind in ("front", "floor"):
                y -= amp * max(0.15, 0.6 + fold) + 0.008
            if kind == "floor":
                z += max(0.0, fold) * 0.02 * (1 - t / flare)
                y -= (abs(s) ** 2) * 0.06
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(NV):
        for i in range(NU):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.003
    return o


def covered_portraits():
    items = [(-0.85, 0.7, 0.95), (-0.25, 0.62, 0.82), (0.3, 0.8, 1.05), (0.8, 0.55, 0.75), (1.12, 0.6, 0.86)]
    tilt = math.radians(9)
    parts = []
    for i, (x, w, h) in enumerate(items):
        y = 0.12 - 0.05 * (i % 2)
        d = 0.055
        f = box(f"frame{i}", (w, d, h), (0, 0, h / 2), "gilt", 0.012)
        s = drape_sheet(f"sheet{i}", w, h, d, i * 13 + 5)
        # The fourth sheet has slipped: it only covers the bottom of its frame, so gilt and dark canvas show above.
        if i == 3:
            for v in s.data.vertices:
                if v.co.z > h * 0.55:
                    v.co.z = h * 0.55 + (v.co.z - h * 0.55) * 0.12
                    v.co.y -= 0.03
        finish(s, "linen")
        group_parts = [f, s]
        if i == 3:
            # The uncovered top of the slipped sheet: a dark, varnished canvas inside the gilt.
            c = box(f"canvas{i}", (w - 0.12, 0.004, h * 0.42), (0, -d / 2 - 0.002, h * 0.76), "canvas")
            group_parts.append(c)
        for o in group_parts:
            # Lean back against the wall about the bottom edge
            o.data.transform(Matrix.Rotation(-tilt, 4, "X"))
            o.location = (x, y, 0)
        parts += group_parts
    return group("CoveredPortraits", parts)


# ---------------------------------------------------------------- 2. the guest book on its reading stand
def ledger_stand():
    parts = []
    # Three carved feet around a turned column
    for k in range(3):
        a = math.radians(90 + k * 120)
        parts.append(box(f"foot{k}", (0.07, 0.3, 0.06), (math.cos(a) * 0.13, math.sin(a) * 0.13, 0.03), "walnut", 0.01, (0, 0, a + math.pi / 2)))
    parts.append(
        lathe(
            "column",
            [(0.0, 0.0), (0.09, 0.0), (0.09, 0.05), (0.06, 0.08), (0.05, 0.12), (0.035, 0.18), (0.03, 0.55), (0.045, 0.6), (0.03, 0.66), (0.028, 0.9), (0.05, 0.93), (0.055, 0.98), (0.0, 0.98)],
            (0, 0, 0.06),
            "walnut",
            20,
        )
    )
    # The sloping desk, tilted toward the reader (-Y), with a ledge at its foot
    tilt = math.radians(24)
    desk_c = Vector((0, -0.02, 1.08))
    R = Matrix.Rotation(tilt, 4, "X")
    parts.append(box("desk", (0.62, 0.46, 0.035), desk_c, "walnut", 0.008, (tilt, 0, 0)))
    ledge = desk_c + (R @ Vector((0, -0.235, 0.03)).to_4d()).to_3d()
    parts.append(box("ledge", (0.62, 0.03, 0.05), ledge, "walnut", 0.006, (tilt, 0, 0)))
    # The book: leather boards, and the open pages curving up from the spine (UVs span both pages: the game paints them)
    parts.append(box("boards", (0.58, 0.42, 0.016), desk_c + (R @ Vector((0, 0, 0.026)).to_4d()).to_3d(), "leather", 0.004, (tilt, 0, 0)))
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=40, y_subdivisions=10, size=1)
    pg = bpy.context.object
    pg.name = "pages"
    pg.scale = (0.55, 0.36, 1)
    bpy.ops.object.transform_apply(scale=True)
    for v in pg.data.vertices:
        u = v.co.x / 0.275  # -1 .. 1 across the spread
        v.co.z = 0.022 * (1 - math.exp(-abs(u) * 6)) + 0.008 * abs(u)
    pg.location = desk_c + (R @ Vector((0, 0, 0.036)).to_4d()).to_3d()
    pg.rotation_euler = (tilt, 0, 0)
    activate(pg)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    pg.data.materials.append(M["pages"])
    for p in pg.data.polygons:
        p.use_smooth = True
    parts.append(pg)  # keeps the grid's own 0..1 UVs (the ledger texture)
    return group("LedgerStand", parts)


# ---------------------------------------------------------------- 3. the Lady's vanity and its mirror frame
def vanity():
    parts = []
    W, D, H = 1.25, 0.5, 0.74
    parts.append(box("top", (W, D, 0.035), (0, 0, H - 0.018), "mahogany", 0.01))
    # Two pedestals of drawers, and a shallow drawer between them
    for s in (-1, 1):
        parts.append(box(f"pedestal{s}", (0.32, D - 0.04, H - 0.14), (s * 0.44, 0, (H - 0.14) / 2 + 0.09), "mahogany", 0.006))
        for k in range(3):
            z = 0.2 + k * 0.17
            parts.append(box(f"drawer{s}{k}", (0.28, 0.012, 0.14), (s * 0.44, -(D - 0.04) / 2 - 0.004, z), "mahogany", 0.004))
            parts.append(lathe(f"knob{s}{k}", [(0.0, 0.0), (0.008, 0.0), (0.012, 0.01), (0.0, 0.018)], (s * 0.44, -(D - 0.04) / 2 - 0.01, z), "brass", 10))
        # turned bun feet
        for t in (-1, 1):
            parts.append(lathe(f"foot{s}{t}", [(0.0, 0.0), (0.03, 0.0), (0.04, 0.03), (0.03, 0.07), (0.035, 0.09), (0.0, 0.09)], (s * 0.44 + t * 0.12, t * 0.0 + (D / 2 - 0.06) * (1 if t > 0 else -1), 0), "mahogany", 12))
    parts.append(box("apron", (0.56, D - 0.04, 0.12), (0, 0, H - 0.1), "mahogany", 0.005))
    parts.append(box("middrawer", (0.5, 0.012, 0.09), (0, -(D - 0.04) / 2 - 0.004, H - 0.1), "mahogany", 0.004))
    # The mirror: an opening 0.72 x 0.92 centred 1.62 above the floor, in a gilt frame with a carved crest,
    # held between two turned posts. The glass itself is the game's (a reflection), just in front of the backboard.
    ow, oh, cy = 0.72, 0.92, 1.62
    back_y = D / 2 - 0.025
    rail = 0.075
    for nm, size, loc in [
        ("frameTop", (ow + 2 * rail, 0.05, rail), (0, back_y - 0.02, cy + oh / 2 + rail / 2 - 0.01)),
        ("frameBottom", (ow + 2 * rail, 0.05, rail), (0, back_y - 0.02, cy - oh / 2 - rail / 2 + 0.01)),
        ("frameLeft", (rail, 0.05, oh), (-(ow / 2 + rail / 2 - 0.01), back_y - 0.02, cy)),
        ("frameRight", (rail, 0.05, oh), ((ow / 2 + rail / 2 - 0.01), back_y - 0.02, cy)),
    ]:
        parts.append(box(nm, size, loc, "gilt", 0.016))
    parts.append(box("backboard", (ow + 0.02, 0.012, oh + 0.02), (0, back_y + 0.012, cy), "mahogany"))
    # A carved crest over the frame: a scallop of three lobes
    for k, (dx, r) in enumerate([(-0.09, 0.05), (0.0, 0.075), (0.09, 0.05)]):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=8, location=(dx, back_y - 0.02, cy + oh / 2 + rail + r * 0.55))
        c = bpy.context.object
        c.name = f"crest{k}"
        c.scale = (1, 0.25, 0.9)
        parts.append(finish(c, "gilt"))
    for s in (-1, 1):
        parts.append(
            lathe(
                f"post{s}",
                [(0.0, 0.0), (0.032, 0.0), (0.032, 0.04), (0.022, 0.08), (0.018, 0.4), (0.026, 0.45), (0.018, 0.5), (0.016, 0.9), (0.028, 0.94), (0.0, 1.0)],
                (s * (ow / 2 + rail + 0.04), back_y - 0.02, H),
                "mahogany",
                14,
            )
        )
    return group("Vanity", parts)


# ---------------------------------------------------------------- 4. the music box
def music_box():
    parts = []
    parts.append(box("case", (0.2, 0.13, 0.075), (0, 0, 0.0375), "walnut", 0.006))
    parts.append(box("lining", (0.18, 0.11, 0.004), (0, 0, 0.072), "velvet"))
    # The lid, hinged at the back and standing open
    lid = box("lid", (0.2, 0.13, 0.014), (0, 0.065, 0.075 + 0.065), "walnut", 0.005, (math.radians(-100), 0, 0))
    parts.append(lid)
    # Brass cylinder with its pins, and the comb
    bpy.ops.mesh.primitive_cylinder_add(radius=0.017, depth=0.12, vertices=16, location=(0, 0.01, 0.078), rotation=(0, math.radians(90), 0))
    cyl = bpy.context.object
    cyl.name = "cylinder"
    parts.append(finish(cyl, "brass"))
    parts.append(box("comb", (0.11, 0.035, 0.004), (0, -0.025, 0.08), "brass"))
    parts.append(lathe("key", [(0.0, 0.0), (0.004, 0.0), (0.004, 0.02), (0.014, 0.024), (0.014, 0.03), (0.0, 0.034)], (0.1, 0, 0.04), "brass", 8))
    parts[-1].rotation_euler = (0, math.radians(90), 0)
    return group("MusicBox", parts)


props = [(covered_portraits(), "covered_portraits.glb"), (ledger_stand(), "ledger_stand.glb"), (vanity(), "vanity.glb"), (music_box(), "music_box.glb")]
# Lay them out side by side in the .blend (the GLBs are exported at their own origins)
for i, (root, f) in enumerate(props):
    export(root, f)
for i, (root, f) in enumerate(props):
    root.location.x = i * 2.5
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, "..", "lastdance_props.blend") if out_dir.endswith("lastdance") else os.path.join(out_dir, "lastdance_props.blend"))
print("done")
