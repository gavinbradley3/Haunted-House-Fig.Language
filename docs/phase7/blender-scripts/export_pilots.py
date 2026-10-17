"""
House of Strange Language - Phase 7 export pipeline for the three pilot assets.

Run inside Blender with hosl_phase7_pilots.blend open:
    exec(open(r"...export_pilots.py").read())

For each asset it:
  1. sets up shading normals (sharp by angle + weighted normals, applied on export),
  2. gives each material texture a practical resolution (low-frequency maps at 512),
  3. writes game metadata into glTF extras (kit type, footprint, stretch zones, intended location),
  4. exports a self-contained GLB with WebP textures into the game repo (preview/models/ during the pilot)
     and a review copy into the production workspace (exports-raw/),
  5. prints triangle, texture and file-size statistics.
Coordinate system: Blender Z-up, front = -Y  ->  glTF Y-up, front = +Z (three.js convention).
"""
import bpy, bmesh, math, os, json

# Dev-only during the pilot: preview/models is served by `npm run dev` but never copied by `npm run build`.
# On integration this becomes ...\public\models.
REPO_OUT = r'C:\Users\gavin.bradley\Desktop\Haunted-House-Fig.Language\preview\models'
RAW_OUT = r'C:\Users\gavin.bradley\Desktop\hosl-asset-production\exports-raw'
os.makedirs(REPO_OUT, exist_ok=True)
os.makedirs(RAW_OUT, exist_ok=True)

ASSETS = {
    'console_table_walnut': {
        'objects': ['ConsoleTable_Walnut'],
        'vertex_colors': False,
        'extras': {
            'ConsoleTable_Walnut': {
                'hosl_kit': 'furniture',
                'pivot': 'back edge, centre, floor (stand against the wall, front faces +z)',
                'footprint_m': [1.55, 0.6],
                'intended_location': 'Entrance Hall, back wall under the landing (replaces ConsoleTable at [-2.9, 0, zBack])',
                'source': 'Poly Haven ClassicConsole_01 (CC0, Kirill Sannikov), retinted to aged walnut',
            },
        },
        'sharp_angle': None,
        'tex_sizes': {'T_ConsoleTable_diff': 1024, 'ClassicConsole_01_roughness.png': 512, 'ClassicConsole_01_nor_gl.png': 1024},
    },
    'door_kit_victorian': {
        'objects': ['DoorLeaf_4Panel', 'DoorLeaf_Hardware', 'Architrave_Leg', 'Architrave_Head', 'Architrave_CornerBlock', 'Architrave_Plinth'],
        'vertex_colors': True,
        'extras': {
            'DoorLeaf_4Panel': {
                'hosl_kit': 'door-leaf',
                'pivot': 'hinge edge, floor; leaf extends +x, thickness centred on z (matches Door.tsx DoorLeaf)',
                'intended_location': 'All interior doors (0.96 x 2.3); front door leaves (0.95 x 3.1) via stretch zones',
            },
            'Architrave_Leg': {'hosl_kit': 'architrave', 'pivot': 'opening edge at x=0, base at y=0, wall face z=0; unit length along +y; mirror x for the right leg'},
            'Architrave_Head': {'hosl_kit': 'architrave', 'pivot': 'opening head at y=0, left edge x=0, wall face z=0; unit length along +x'},
            'Architrave_CornerBlock': {'hosl_kit': 'architrave', 'pivot': 'inner bottom corner at origin (sits above the leg); mirror x for the right'},
            'Architrave_Plinth': {'hosl_kit': 'architrave', 'pivot': 'inner bottom corner at origin, height 0.27; mirror x for the right'},
        },
        'sharp_angle': 35,
        'tex_sizes': {'T_DoorWalnut_diff': 1024},
    },
    'frame_kit_ornate': {
        'objects': ['FrameOrnate_Corner', 'FrameOrnate_RailH', 'FrameOrnate_RailV'],
        'vertex_colors': False,
        'extras': {
            'FrameOrnate_Corner': {
                'hosl_kit': 'frame',
                'pivot': 'top-left corner of the sight opening; frame back at z=0; mirror x / y for the other corners',
                'reach_h': 0.1129, 'reach_v': 0.1356, 'lip_m': 0.01,
                'intended_location': 'Every ArtPainting / Painting frame; Astra artwork plugs in as an independent texture',
                'source': 'Poly Haven fancy_picture_frame_02 (CC0, Rico Cilliers & Rob Tuytel), decimated and cut into a kit',
            },
            'FrameOrnate_RailH': {'hosl_kit': 'frame', 'pivot': 'unit length along +x from the corner cut; sight edge at y=0', 'tex_period_m': 0.25},
            'FrameOrnate_RailV': {'hosl_kit': 'frame', 'pivot': 'unit length along -y from the corner cut; sight edge at x=0', 'tex_period_m': 0.25},
        },
        'sharp_angle': 60,
        'tex_sizes': {},
    },
}


def setup_normals(obj, angle_deg):
    """Sharp edges by angle + weighted normals (non-destructive; applied by the exporter)."""
    if angle_deg is None:
        return
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(angle_deg)
    for e in bm.edges:
        e.smooth = not (e.is_boundary is False and len(e.link_faces) == 2 and e.calc_face_angle(0) > lim)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    for m in list(obj.modifiers):
        if m.type in ('WEIGHTED_NORMAL', 'NODES'):
            obj.modifiers.remove(m)
    w = obj.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
    w.mode = 'FACE_AREA'
    w.weight = 50
    w.keep_sharp = True
    if not any(m.type == 'TRIANGULATE' for m in obj.modifiers):
        obj.modifiers.new('Triangulate', 'TRIANGULATE')


def sized_copy(name, size):
    """Return an image no larger than size; downscaled copies are named <name>@<size> and packed."""
    im = bpy.data.images[name]
    if max(im.size) <= size:
        return im
    key = f'{name}@{size}'
    c = bpy.data.images.get(key)
    if c is None:
        c = im.copy()
        c.name = key
        c.scale(size, size)
        c.pack()
    return c


def apply_texture_sizes(objs, sizes):
    for o in objs:
        for m in o.data.materials:
            if not m or not m.use_nodes:
                continue
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    base = n.image.name.split('@')[0]
                    if base in sizes:
                        n.image = sized_copy(base, sizes[base])


def house_shader_rules(objs):
    """Keep kit materials on shader variants the house already compiles:
    single-sided (backs face walls; double-sided costs fill rate and a program variant),
    and constant metalness (the packed metallic-roughness map then serves only as roughness)."""
    for o in objs:
        for m in o.data.materials:
            if m:
                m.use_backface_culling = True


def export(name, spec):
    objs = [bpy.data.objects[n] for n in spec['objects']]
    house_shader_rules(objs)
    for o in objs:
        setup_normals(o, spec['sharp_angle'])
        for k, v in spec['extras'].get(o.name, {}).items():
            o[k] = v
    apply_texture_sizes(objs, spec['tex_sizes'])
    # export at the origin, unparented transforms preserved
    saved = {o.name: (o.matrix_world.copy(), o.hide_get(), o.hide_viewport) for o in objs}
    for o in objs:
        o.hide_set(False)
        o.hide_viewport = False
        if o.parent is None:
            o.matrix_world.identity()
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    out = {}
    for path in (os.path.join(REPO_OUT, name + '.glb'), os.path.join(RAW_OUT, name + '.glb')):
        bpy.ops.export_scene.gltf(
            filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_extras=True,
            export_yup=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_image_format='WEBP', export_image_quality=88,
            export_vertex_color='ACTIVE' if spec['vertex_colors'] else 'NONE',
            export_active_vertex_color_when_no_material=False,
            export_lights=False, export_cameras=False, export_animations=False,
        )
        out[path] = os.path.getsize(path)
    for o in objs:
        mw, hidden, hv = saved[o.name]
        if o.parent is None:
            o.matrix_world = mw
        o.hide_viewport = hv
        o.hide_set(hidden)
    # statistics
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for o in objs:
        me = o.evaluated_get(dg).to_mesh()
        me.calc_loop_triangles()
        tris += len(me.loop_triangles)
        o.evaluated_get(dg).to_mesh_clear()
    texs = sorted({(n.image.name, tuple(n.image.size)) for o in objs for m in o.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image})
    mats = sorted({m.name for o in objs for m in o.data.materials if m})
    stats = {'triangles': tris, 'materials': mats, 'textures': [f'{a} {b[0]}x{b[1]}' for a, b in texs], 'glb_bytes': out[os.path.join(REPO_OUT, name + '.glb')]}
    print(name, json.dumps(stats, indent=1))
    return stats


ALL = {name: export(name, spec) for name, spec in ASSETS.items()}
with open(os.path.join(RAW_OUT, 'export_stats.json'), 'w') as f:
    json.dump(ALL, f, indent=1)
