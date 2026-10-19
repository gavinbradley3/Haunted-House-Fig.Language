"""
House of Strange Language - Phase 7 look-development finishing for the pilot assets.

Values were chosen in the game-lit preview (preview/assets.html, Intel UHD 630, Low quality),
then baked here so Blender stays the single source of truth. Idempotent: every adjustment starts
from a pristine '<name>__src' copy made on the first run.

  Console table: base colour scaled to the house walnut (game WOOD.walnut mid, sRGB ~0.25/0.155/0.095).
  Ornate frame:  aged gold leaf - base colour x #e3d3a0, roughness x 0.85, metallic 0.6
                 (Poly Haven authored it as pale non-metallic paint, which read as a new shop frame).

Run inside Blender: exec(open(r"...lookdev_finish.py").read())
"""
import bpy
import numpy as np


def pixels(im):
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    return a.reshape(h, w, 4)


def store(im, a):
    im.pixels.foreach_set(np.clip(a, 0, 1).astype(np.float32).ravel())
    im.update()
    im.pack()


def pristine(name):
    """The untouched source for an image, copied once."""
    src = bpy.data.images.get(name + '__src')
    if src is None:
        src = bpy.data.images[name].copy()
        src.name = name + '__src'
        src.pack()
        src.use_fake_user = True
    return pixels(src)


def to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def console():
    name = 'T_ConsoleTable_diff'
    a = pristine(name)
    target = np.array([0.24, 0.15, 0.095])
    a[..., :3] = a[..., :3] * (target / a[..., :3].mean((0, 1)))
    store(bpy.data.images[name], a)
    print('console base colour mean', a[..., :3].mean((0, 1)).round(3))


def gilt():
    factor = to_lin(np.array([0xE3, 0xD3, 0xA0]) / 255.0)
    for name in ('T_FrameOrnate_Corner_diff', 'T_FrameOrnate_Rail_diff'):
        a = pristine(name)
        a[..., :3] = to_srgb(to_lin(a[..., :3]) * factor)
        store(bpy.data.images[name], a)
        print(name, 'mean', a[..., :3].mean((0, 1)).round(3))
    a = pristine('T_FrameOrnate_Corner_rough')
    a[..., :3] *= 0.85
    store(bpy.data.images['T_FrameOrnate_Corner_rough'], a)   # the rail's roughness is made in rail_gesso()
    for mname in ('M_FrameOrnate_Corner', 'M_FrameOrnate_Rail'):
        b = next(n for n in bpy.data.materials[mname].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        for l in list(b.inputs['Metallic'].links):
            bpy.data.materials[mname].node_tree.links.remove(l)
        b.inputs['Metallic'].default_value = 0.6
    rail_gesso()


RAIL_DETAIL_MAPS = False


def rail_gesso():
    """Close up (painting inspection), plain extruded rails read as smooth brushed CG gold beside the
    carved corners' gesso. Give them the same grain: fine isotropic speckle in colour and roughness,
    a subtle grain normal map, and the corner's slightly darker tone. Colour + roughness + normal maps
    is the house's standard shader variant, so this adds no shader program."""
    W, H = 512, 256
    rng = np.random.default_rng(23)
    # Texel density differs by axis: 512 px per 0.25 m along the run, 124 rows per ~0.26 m of profile.
    # Grain must be round in metres, so its features are ~4x wider (in texels) along u than along v.
    ANISO = (W / 0.25) / (124 / 0.26)

    def blur(x, ru, rv):
        for _ in range(2):
            x = sum(np.roll(x, k, 1) for k in range(-ru, ru + 1)) / (2 * ru + 1)       # wraps along the run
            x = sum(np.roll(x, k, 0) for k in range(-rv, rv + 1)) / (2 * rv + 1)
        return x

    def field(r):
        f = blur(rng.standard_normal((H, W)).astype(np.float32), max(1, round(r * ANISO)), r)
        return f / np.abs(f).max()
    fine, mid = field(1), field(3)
    for block in (slice(0, 128), slice(128, 256)):          # keep the two rails' rows independent
        fine[block] -= fine[block].mean()
        mid[block] -= mid[block].mean()
    d = bpy.data.images['T_FrameOrnate_Rail_diff']
    a = pixels(d)
    a[..., :3] *= (0.86 * (1 + 0.16 * fine + 0.08 * mid))[..., None]
    store(d, a)
    r = bpy.data.images.get('T_FrameOrnate_Rail_rough') or bpy.data.images.new('T_FrameOrnate_Rail_rough', W, H, alpha=False)
    r.colorspace_settings.name = 'Non-Color'
    ra = pristine_or_new('T_FrameOrnate_Rail_rough', W, H)
    ra[..., :3] = np.clip(ra[..., :3] * 0.85 + (0.08 * fine + 0.04 * mid)[..., None], 0, 1)
    store(r, ra)
    # Fine grain only: anything coarser reads as hammered copper on a metallic surface under a point light.
    h = fine
    du = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * ANISO      # slopes per metre, not per texel
    dv = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    n = np.dstack([-du * 0.4, -dv * 0.4, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    nm = bpy.data.images.get('T_FrameOrnate_Rail_nrm') or bpy.data.images.new('T_FrameOrnate_Rail_nrm', W, H, alpha=False)
    nm.colorspace_settings.name = 'Non-Color'
    store(nm, np.dstack([(n + 1) / 2, np.ones((H, W, 1), np.float32)]))
    if not RAIL_DETAIL_MAPS:
        # Tested in game light: a grain normal map on the curved metallic profile ripples like
        # hammered copper at grazing angles. The speckle in the colour map alone reads as gesso,
        # and colour-map-only is a shader the house already compiles.
        mat = bpy.data.materials['M_FrameOrnate_Rail']
        nt = mat.node_tree
        b = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
        for sock in ('Roughness', 'Normal'):
            for l in list(b.inputs[sock].links):
                src = l.from_node
                nt.links.remove(l)
                if src.type == 'NORMAL_MAP':
                    for l2 in list(src.inputs['Color'].links):
                        nt.nodes.remove(l2.from_node)
                if src.type in ('TEX_IMAGE', 'NORMAL_MAP'):
                    nt.nodes.remove(src)
        b.inputs['Roughness'].default_value = 0.38
        print('rail gesso (colour only): diffuse mean', a[..., :3].mean((0, 1)).round(3))
        return
    # wire roughness + normal maps into the rail material
    mat = bpy.data.materials['M_FrameOrnate_Rail']
    nt = mat.node_tree
    b = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
    for sock in ('Roughness', 'Normal'):
        for l in list(b.inputs[sock].links):
            src = l.from_node
            nt.links.remove(l)
            if src.type in ('TEX_IMAGE', 'NORMAL_MAP'):
                for l2 in list(src.inputs[0].links if src.type == 'NORMAL_MAP' else []):
                    nt.nodes.remove(l2.from_node)
                nt.nodes.remove(src)
    uv = next((x for x in nt.nodes if x.type == 'TEX_IMAGE' and x.image and x.image.name.startswith('T_FrameOrnate_Rail_diff')), None)
    tr = nt.nodes.new('ShaderNodeTexImage')
    tr.image = r
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = nm
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = 1.0
    if uv and uv.inputs['Vector'].is_linked:
        src = uv.inputs['Vector'].links[0].from_socket
        nt.links.new(src, tr.inputs['Vector'])
        nt.links.new(src, tn.inputs['Vector'])
    nt.links.new(tr.outputs['Color'], b.inputs['Roughness'])
    nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], b.inputs['Normal'])
    print('rail gesso: diffuse mean', a[..., :3].mean((0, 1)).round(3))


def pristine_or_new(name, w, h):
    src = bpy.data.images.get(name + '__src')
    if src is not None:
        return pixels(src)
    return np.full((h, w, 4), 0.45, np.float32)


console()
gilt()
