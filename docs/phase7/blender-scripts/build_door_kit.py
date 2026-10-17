"""
House of Strange Language - Phase 7 pilot asset B: Victorian four-panel door kit.

Builds, in the open Blender file, collection B_DoorKit with:
  DoorLeaf_4Panel        hinge edge at x=0, floor at z=0, thickness centred on y (front = -Y)
  Architrave_Leg         left leg, opening edge at x=0, runs z 0..1 (stretched at runtime), wall face y=0
  Architrave_Head        head casing, x 0..1 (stretched), opening head at z=0
  Architrave_CornerBlock left corner block with turned bullseye rosette
  Architrave_Plinth      left plinth block
Units are metres, real scale. Proportions follow an 1860-1890 four-panel interior door.

Run inside Blender:  exec(open(r"...build_door_kit.py").read())
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

W, H, T = 0.96, 2.30, 0.05        # leaf width, height, thickness
ST = 0.115                        # stile width
MU = 0.10                         # muntin width
RT, RB, RL0, RL1 = 0.115, 0.23, 0.85, 1.05   # top rail, bottom rail, lock rail span
HALF = T / 2

# Panel + stuck ogee moulding, as (inset from the opening edge, height above the door's centre plane).
# Read outward-in: frame face, ogee moulding down to the panel, flat margin, bevel up to the raised field.
PANEL_RINGS = [
    (0.000, HALF), (0.002, HALF - 0.001), (0.005, HALF - 0.003), (0.008, HALF - 0.006),
    (0.011, HALF - 0.008), (0.014, HALF - 0.009), (0.017, HALF - 0.011), (0.019, HALF - 0.014),
    (0.024, 0.011), (0.064, 0.0165), (0.066, 0.0175),
]
FIELD_INSET = PANEL_RINGS[-1][0]


def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def material(name, color, rough, metal=0.0):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


class Builder:
    """Collects quads with a grain direction ('v' vertical / 'h' horizontal) and a material slot."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.grain = {}

    def quad(self, pts, grain='v', mat=0):
        vs = [self.bm.verts.new(p) for p in pts]
        f = self.bm.faces.new(vs)
        f.material_index = mat
        self.grain[f] = grain
        return f

    def finish(self, name, mats, merge=1e-5):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=merge)
        bm.normal_update()
        # Planar UVs in metres, oriented so the texture's grain (along U) follows each member.
        for f in bm.faces:
            n = f.normal
            g = self.grain.get(f, 'v')
            for l in f.loops:
                p = l.vert.co
                if abs(n.y) >= max(abs(n.x), abs(n.z)):      # faces
                    a, b = p.x, p.z
                elif abs(n.x) >= abs(n.z):                    # vertical edges
                    a, b = p.y, p.z
                else:                                          # horizontal edges
                    a, b = p.x, p.y
                l[self.uv].uv = (b, a) if g == 'v' and abs(n.z) < 0.7 else (a, b)
        me = bpy.data.meshes.get(name) or bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        me.materials.clear()
        for m in mats:
            me.materials.append(m)
        for p in me.polygons:
            p.use_smooth = False
        return me


def ring_pts(x0, z0, x1, z1, inset, y):
    return [Vector((x0 + inset, y, z0 + inset)), Vector((x1 - inset, y, z0 + inset)),
            Vector((x1 - inset, y, z1 - inset)), Vector((x0 + inset, y, z1 - inset))]


def panel(b, x0, z0, x1, z1, side):
    """Moulding rings + raised field on one face (side = -1 front, +1 back)."""
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    rings = [ring_pts(x0, z0, x1, z1, i, side * h) for i, h in PANEL_RINGS]
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(4):
            a, bb, c, d = r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4], r1[k]
            mid = (a + bb) / 2
            grain = 'v' if abs(mid.x - cx) / (x1 - x0) > abs(mid.z - cz) / (z1 - z0) else 'h'
            pts = [a, bb, c, d] if side < 0 else [d, c, bb, a]
            b.quad(pts, grain)
    f = rings[-1]
    b.quad(f if side < 0 else f[::-1], 'v')


def leaf():
    wood = material('M_DoorWalnut', (0.16, 0.10, 0.066), 0.55)
    brass = material('M_Brass', (0.72, 0.53, 0.25), 0.35, 1.0)
    dark = material('M_BlackPaint', (0.02, 0.02, 0.02), 0.5)
    b = Builder()
    openings = [
        (ST, RB, W / 2 - MU / 2, RL0), (W / 2 + MU / 2, RB, W - ST, RL0),
        (ST, RL1, W / 2 - MU / 2, H - RT), (W / 2 + MU / 2, RL1, W - ST, H - RT),
    ]
    C = 0.003  # arris chamfer on the leaf's outer edges
    # The frame face is a grid of joinery cells; every cut is shared so there are no T-junctions.
    xs = [C, ST, W / 2 - MU / 2, W / 2 + MU / 2, W - ST, W - C]
    zs = [C, RB, RL0, RL1, H - RT, H - C]
    e = HALF - C
    for side in (-1, 1):
        y = side * HALF
        for i in range(5):
            for j in range(5):
                if i in (1, 3) and j in (1, 3):
                    continue                                   # panel opening
                stile = i in (0, 4)
                muntin = i == 2 and j in (1, 3)
                g = 'v' if stile or muntin else 'h'
                x0, x1, z0, z1 = xs[i], xs[i + 1], zs[j], zs[j + 1]
                pts = [Vector((x0, y, z0)), Vector((x1, y, z0)), Vector((x1, y, z1)), Vector((x0, y, z1))]
                b.quad(pts if side < 0 else pts[::-1], g)
        for o in openings:
            panel(b, *o, side)
        # Chamfer strips, cut at the same grid lines as the face
        sx = [0.0] + xs[1:-1] + [W]
        sz = [0.0] + zs[1:-1] + [H]
        ix = xs
        iz = zs
        for k in range(5):
            for z_out, z_in, flip in ((0.0, C, False), (H, H - C, True)):     # bottom and top strips
                p = [Vector((sx[k], side * e, z_out)), Vector((sx[k + 1], side * e, z_out)), Vector((ix[k + 1], y, z_in)), Vector((ix[k], y, z_in))]
                if flip ^ (side > 0):
                    p = p[::-1]
                b.quad(p, 'h')
            for x_out, x_in, flip in ((0.0, C, True), (W, W - C, False)):     # left and right strips
                p = [Vector((x_out, side * e, sz[k])), Vector((x_out, side * e, sz[k + 1])), Vector((x_in, y, iz[k + 1])), Vector((x_in, y, iz[k]))]
                if flip ^ (side > 0):
                    p = p[::-1]
                b.quad(p, 'v')
    # Leaf edges, cut at the same grid lines
    sx = [0.0] + xs[1:-1] + [W]
    sz = [0.0] + zs[1:-1] + [H]
    for k in range(5):
        b.quad([Vector((sx[k], -e, 0)), Vector((sx[k], e, 0)), Vector((sx[k + 1], e, 0)), Vector((sx[k + 1], -e, 0))], 'h')
        b.quad([Vector((sx[k], e, H)), Vector((sx[k], -e, H)), Vector((sx[k + 1], -e, H)), Vector((sx[k + 1], e, H))], 'h')
        b.quad([Vector((0, -e, sz[k])), Vector((0, -e, sz[k + 1])), Vector((0, e, sz[k + 1])), Vector((0, e, sz[k]))], 'v')
        b.quad([Vector((W, e, sz[k])), Vector((W, e, sz[k + 1])), Vector((W, -e, sz[k + 1])), Vector((W, -e, sz[k]))], 'v')
    bmesh.ops.remove_doubles(b.bm, verts=b.bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(b.bm, faces=b.bm.faces[:])
    me = b.finish('DoorLeaf_4Panel', [wood])
    ob = bpy.data.objects.get('DoorLeaf_4Panel') or bpy.data.objects.new('DoorLeaf_4Panel', me)
    ob.data = me
    hw = hardware(brass, dark)
    return ob, hw


def lathe(bm, profile, center, axis_sign, segs, mat_index, cap=True):
    """Revolve (radius, height) around the leaf-normal axis (y). axis_sign: -1 front face, +1 back face."""
    rings = []
    for r, h in profile:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new(center + Vector((math.cos(a) * r, axis_sign * h, math.sin(a) * r))))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(segs):
            q = [r0[i], r0[(i + 1) % segs], r1[(i + 1) % segs], r1[i]]
            f = bm.faces.new(q if axis_sign < 0 else q[::-1])
            f.material_index = mat_index
            f.smooth = True
    return rings


def hardware(brass, dark):
    """Mortice knobs on roses, keyhole escutcheons and three butt hinges: one brass mesh, moves with the leaf."""
    bm = bmesh.new()
    kx, kz = W - 0.075, 1.0
    knob = [(0.0, 0.0), (0.030, 0.0), (0.031, 0.003), (0.030, 0.006), (0.010, 0.008), (0.008, 0.030),
            (0.012, 0.040), (0.024, 0.050), (0.028, 0.062), (0.026, 0.072), (0.018, 0.080), (0.0, 0.083)]
    esc = [(0.0, 0.0), (0.016, 0.0), (0.017, 0.002), (0.015, 0.004), (0.0, 0.0045)]
    for side in (-1, 1):
        lathe(bm, knob, Vector((kx, side * HALF, kz)), side, 20, 0)
        e = lathe(bm, esc, Vector((kx, side * HALF, kz - 0.085)), side, 12, 0)
    # hinge knuckles on the opening side (+y), with leaves let into the edge
    for z in (0.25, H / 2, H - 0.25):
        prof = [(0.0, -0.05), (0.0075, -0.05), (0.0075, 0.05), (0.0, 0.05)]
        segs = 10
        rings = []
        for r, h in prof:
            ring = [bm.verts.new(Vector((-0.002 + math.cos(2 * math.pi * i / segs) * r, HALF - 0.004 + math.sin(2 * math.pi * i / segs) * r, z + h))) for i in range(segs)]
            rings.append(ring)
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(segs):
                f = bm.faces.new([r0[i], r0[(i + 1) % segs], r1[(i + 1) % segs], r1[i]])
                f.smooth = True
        for z2, (r, h) in ((0.052, (0.0, 0.0)), (-0.052, (0.0, 0.0))):
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # keyhole slots: small dark plates just proud of each escutcheon
    for side in (-1, 1):
        y = side * (HALF + 0.0047)
        pts = [Vector((kx - 0.003, y, kz - 0.095)), Vector((kx + 0.003, y, kz - 0.095)), Vector((kx + 0.003, y, kz - 0.078)), Vector((kx - 0.003, y, kz - 0.078))]
        f = bm.faces.new([bm.verts.new(p) for p in (pts if side < 0 else pts[::-1])])
        f.material_index = 1
    # Planar UVs in metres: the game may swap M_Brass for its shared (textured) brass material
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops:
            p = l.vert.co
            l[uv].uv = (p.x + p.y, p.z)
    me = bpy.data.meshes.get('DoorLeaf_Hardware') or bpy.data.meshes.new('DoorLeaf_Hardware')
    # slots first: to_mesh clamps material indices to the existing slot count
    me.materials.clear()
    me.materials.append(brass)
    me.materials.append(dark)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.get('DoorLeaf_Hardware') or bpy.data.objects.new('DoorLeaf_Hardware', me)
    ob.data = me
    return ob


# ----------------------------------------------------------------------------------- architrave

# Casing profile across its width, (distance outward from the opening edge, projection from the wall).
CASING = [
    (0.000, 0.000), (0.000, 0.016), (0.003, 0.021), (0.007, 0.022), (0.011, 0.020), (0.012, 0.016),  # staff bead
    (0.016, 0.016), (0.060, 0.018),                                      # fascia, slight rise
    (0.064, 0.020), (0.072, 0.025), (0.080, 0.027),                      # ogee up
    (0.088, 0.026), (0.096, 0.022), (0.100, 0.021),                      # into the cove
    (0.104, 0.026), (0.110, 0.031), (0.118, 0.034), (0.126, 0.033),      # back band ovolo
    (0.132, 0.030), (0.136, 0.026), (0.140, 0.020), (0.140, 0.000),
]
CW = 0.140
BLOCK, PLINTH_H = 0.165, 0.27


def casing_run(name, vertical):
    """Unit-length straight casing. vertical: left leg along +z with width toward -x. else head along +x, width toward +z."""
    wood = bpy.data.materials['M_DoorWalnut']
    b = Builder()
    pts = CASING
    for (d0, h0), (d1, h1) in zip(pts, pts[1:]):
        if vertical:
            a0, a1 = Vector((-d0, -h0, 0)), Vector((-d1, -h1, 0))
            q = [a0, a0 + Vector((0, 0, 1)), a1 + Vector((0, 0, 1)), a1]
            b.quad(q, 'v')
        else:
            a0, a1 = Vector((0, -h0, d0)), Vector((0, -h1, d1))
            q = [a0, a0 + Vector((1, 0, 0)), a1 + Vector((1, 0, 0)), a1]
            b.quad(q, 'h')
    me = b.finish(name, [wood])
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.get(name) or bpy.data.objects.new(name, me)
    ob.data = me
    return ob


def box(b, x0, x1, z0, z1, y0, y1, grain, chamfer=0.0):
    """Block with optional chamfered front arrises (y is negative toward the room)."""
    c = chamfer
    f0 = [Vector((x0 + c, y1, z0 + c)), Vector((x1 - c, y1, z0 + c)), Vector((x1 - c, y1, z1 - c)), Vector((x0 + c, y1, z1 - c))]
    e0 = [Vector((x0, y1 + c, z0)), Vector((x1, y1 + c, z0)), Vector((x1, y1 + c, z1)), Vector((x0, y1 + c, z1))]
    back = [Vector((x0, y0, z0)), Vector((x1, y0, z0)), Vector((x1, y0, z1)), Vector((x0, y0, z1))]
    b.quad(f0, grain)
    for k in range(4):
        b.quad([e0[k], e0[(k + 1) % 4], f0[(k + 1) % 4], f0[k]], grain)
        b.quad([back[k], back[(k + 1) % 4], e0[(k + 1) % 4], e0[k]], grain)


def corner_block():
    wood = bpy.data.materials['M_DoorWalnut']
    b = Builder()
    box(b, -BLOCK, 0, 0, BLOCK, 0, -0.030, 'h', chamfer=0.004)
    me = b.finish('Architrave_CornerBlock', [wood])
    bm = bmesh.new()
    bm.from_mesh(me)
    # turned bullseye rosette: concentric beads and a domed boss
    # starts at the outer radius: no hidden disc under the rosette
    ros = [(0.060, 0.000), (0.062, 0.003), (0.060, 0.007), (0.052, 0.008), (0.048, 0.006),
           (0.044, 0.006), (0.040, 0.010), (0.036, 0.013), (0.030, 0.012), (0.026, 0.010), (0.022, 0.012),
           (0.018, 0.017), (0.012, 0.020), (0.006, 0.0215), (0.000, 0.022)]
    c = Vector((-BLOCK / 2, -0.030, BLOCK / 2))
    rings = lathe(bm, ros, c, -1, 28, 0)
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        for l in f.loops:
            if l[uv].uv.length == 0:
                l[uv].uv = (l.vert.co.x, l.vert.co.z)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.get('Architrave_CornerBlock') or bpy.data.objects.new('Architrave_CornerBlock', me)
    ob.data = me
    return ob


def plinth():
    wood = bpy.data.materials['M_DoorWalnut']
    b = Builder()
    box(b, -BLOCK, 0, 0, PLINTH_H, 0, -0.036, 'v', chamfer=0.005)
    me = b.finish('Architrave_Plinth', [wood])
    ob = bpy.data.objects.get('Architrave_Plinth') or bpy.data.objects.new('Architrave_Plinth', me)
    ob.data = me
    return ob


def grime(o):
    """Per-corner darkening for decades of use, multiplied into the AO layer (no texture cost):
    kick marks along the bottom of the leaf and plinths, hand grime around the knob."""
    import numpy as np
    me = o.data
    co = np.array([me.vertices[l.vertex_index].co[:] for l in me.loops], np.float32).reshape(-1, 3)
    x, z = co[:, 0], co[:, 2]
    f = np.ones(len(co), np.float32)
    if o.name == 'DoorLeaf_4Panel':
        f *= 1 - 0.22 * np.clip((0.32 - z) / 0.32, 0, 1)
        d = np.hypot(x - (W - 0.075), z - 1.0)
        f *= 1 - 0.18 * np.clip(1 - d / 0.28, 0, 1)
    elif o.name == 'Architrave_Plinth':
        f *= 1 - 0.2 * np.clip((0.2 - z) / 0.2, 0, 1)
    return f


def bake_ao(names, distance=0.05, samples=64):
    """Short-range ambient occlusion into a vertex colour layer 'AO' (exported as COLOR_0).
    Each object is baked alone so kit pieces sharing the origin don't shadow each other."""
    import numpy as np
    sc = bpy.context.scene
    engine = sc.render.engine
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.world = sc.world or bpy.data.worlds.new('World')
    sc.world.light_settings.distance = distance
    sc.render.bake.target = 'VERTEX_COLORS'
    sc.render.bake.use_selected_to_active = False   # a texture rebake may have left this on
    saved = {o.name: o.hide_render for o in sc.objects}
    try:
        for n in names:
            o = bpy.data.objects[n]
            for other in sc.objects:
                other.hide_render = other is not o
            me = o.data
            for a in list(me.color_attributes):
                me.color_attributes.remove(a)
            ca = me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
            me.color_attributes.active_color = ca
            bpy.ops.object.select_all(action='DESELECT')
            o.hide_set(False)
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            # Vertex-colour baking needs the base topology: switch off modifiers (e.g. Triangulate) meanwhile
            mods = [(m, m.show_render) for m in o.modifiers]
            for m, _ in mods:
                m.show_render = False
            try:
                bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
            finally:
                for m, s in mods:
                    m.show_render = s
            v = np.empty(len(ca.data) * 4, np.float32)
            ca.data.foreach_get('color', v)
            v = v.reshape(-1, 4)
            # soften: AO only darkens recesses, never below 35%
            v[:, :3] = 0.35 + 0.65 * v[:, :3]
            v[:, :3] *= grime(o)[:, None]
            ca.data.foreach_set('color', v.ravel())
            print(f'  AO {n:24s} mean {v[:, 0].mean():.2f} min {v[:, 0].min():.2f}')
    finally:
        for o in sc.objects:
            o.hide_render = saved.get(o.name, False)
        sc.render.engine = engine


def walnut_diffuse(source='smoked_walnut_veneer_Diffuse', target=(0.25, 0.155, 0.095)):
    """Darken the Poly Haven veneer to the house walnut (sRGB mean = target, the game's WOOD.walnut mid #3f2717) keeping its grain."""
    import numpy as np
    im = bpy.data.images[source]
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    a = a.reshape(h, w, 4)
    out = np.clip(a[..., :3] * (np.array(target) / a[..., :3].mean((0, 1))), 0, 1)
    nd = bpy.data.images.get('T_DoorWalnut_diff') or bpy.data.images.new('T_DoorWalnut_diff', w, h, alpha=False)
    nd.pixels.foreach_set(np.dstack([out, np.ones((h, w, 1), np.float32)]).astype(np.float32).ravel())
    nd.update()
    nd.pack()
    return nd


def walnut_material(diffuse_image, roughness=0.68):
    """M_DoorWalnut = darkened Poly Haven smoked_walnut_veneer diffuse x baked AO (vertex colour 'AO').
    The veneer's normal and roughness maps are near-uniform (std 0.005 / 0.02), so they are replaced
    by a constant: one texture instead of three, and a cheaper shader on surfaces that fill the screen."""
    m = bpy.data.materials['M_DoorWalnut']
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for n in [n for n in nt.nodes if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'VERTEX_COLOR', 'MIX')]:
        nt.nodes.remove(n)
    td = nt.nodes.new('ShaderNodeTexImage')
    td.image = diffuse_image
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'AO'
    mx = nt.nodes.new('ShaderNodeMix')
    mx.data_type = 'RGBA'
    mx.blend_type = 'MULTIPLY'
    mx.inputs['Factor'].default_value = 1.0
    nt.links.new(td.outputs['Color'], mx.inputs[6])
    nt.links.new(ca.outputs['Color'], mx.inputs[7])
    nt.links.new(mx.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = roughness


def build():
    kit = coll('B_DoorKit')
    objs = []
    lf, hw = leaf()
    objs += [lf, hw]
    objs += [casing_run('Architrave_Leg', True), casing_run('Architrave_Head', False), corner_block(), plinth()]
    for o in objs:
        if o.name not in kit.objects:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            kit.objects.link(o)
    hw.parent = lf
    lf['hosl_kit'] = 'door'
    # Runtime stretch zones (leaf-local metres): inside the flat raised fields only, so joinery never distorts.
    lf['stretch_x'] = [[ST + FIELD_INSET, W / 2 - MU / 2 - FIELD_INSET], [W / 2 + MU / 2 + FIELD_INSET, W - ST - FIELD_INSET]]
    lf['stretch_y'] = [[RL1 + FIELD_INSET, H - RT - FIELD_INSET]]
    lf['base_size'] = [W, H, T]
    for o in objs:
        me = o.data
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        print(f'{o.name:26s} tris {tris:5d}  dims {tuple(round(v, 3) for v in o.dimensions)}')
    bake_ao(['DoorLeaf_4Panel', 'Architrave_Leg', 'Architrave_Head', 'Architrave_CornerBlock', 'Architrave_Plinth'])
    if 'smoked_walnut_veneer_Diffuse' in bpy.data.images:
        walnut_diffuse()
    if 'T_DoorWalnut_diff' in bpy.data.images:
        walnut_material(bpy.data.images['T_DoorWalnut_diff'])
    return objs


build()
