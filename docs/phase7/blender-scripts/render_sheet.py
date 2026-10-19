"""
House of Strange Language - Phase 7 asset sheet renders (EEVEE, warm candle-like key + cool moon fill).
Writes hosl-asset-production/renders/sheet_<asset>.png and copies them into the repo docs.
Run inside Blender: exec(open(r"...render_sheet.py").read())
"""
import bpy, math, os, shutil
from mathutils import Vector

OUT = r'C:\Users\gavin.bradley\Desktop\hosl-asset-production\renders'
DOCS = r'C:\Users\gavin.bradley\Desktop\Haunted-House-Fig.Language\docs\phase7\screenshots\blender'
os.makedirs(DOCS, exist_ok=True)
sc = bpy.context.scene

SHOTS = {
    'console_table': (['ConsoleTable_Walnut'], Vector((1.25, -1.75, 1.15)), Vector((0, -0.3, 0.55)), 38),
    'door_kit': ([o.name for o in bpy.data.collections['_Lookdev'].objects if o.name.startswith('REV_')], Vector((4.95, -2.9, 1.55)), Vector((3.48, -0.1, 1.2)), 40),
    'frame_kit': ([o.name for o in bpy.data.collections['_Lookdev'].objects if o.name.startswith('TESTF_')], Vector((-2.35, -1.25, 0.25)), Vector((-3.0, 0, 0.0)), 42),
    'frame_corner_detail': ([o.name for o in bpy.data.collections['_Lookdev'].objects if o.name.startswith('TESTF_')], Vector((-3.05, -0.42, 0.52)), Vector((-3.25, 0, 0.36)), 35),
}


def rig():
    for n in ('SHEET_cam', 'SHEET_key', 'SHEET_fill', 'SHEET_rim'):
        if n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n])
    cam = bpy.data.objects.new('SHEET_cam', bpy.data.cameras.new('SHEET_cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam

    def light(name, kind, energy, color, loc, size=0.6):
        l = bpy.data.lights.new(name, kind)
        l.energy = energy
        l.color = color
        if kind == 'AREA':
            l.size = size
        o = bpy.data.objects.new(name, l)
        o.location = loc
        sc.collection.objects.link(o)
        return o
    key = light('SHEET_key', 'AREA', 140, (1.0, 0.72, 0.45), (0, 0, 0))
    fill = light('SHEET_fill', 'AREA', 35, (0.55, 0.65, 0.9), (0, 0, 0), 1.5)
    rim = light('SHEET_rim', 'AREA', 60, (1.0, 0.85, 0.65), (0, 0, 0), 0.4)
    w = sc.world or bpy.data.worlds.new('World')
    sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.012, 0.012, 0.016, 1)
    bg.inputs['Strength'].default_value = 1.0
    return cam, key, fill, rim


def aim(o, target):
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()


def render():
    try:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1000
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    cam, key, fill, rim = rig()
    every = [o for o in sc.objects if o.type == 'MESH']
    saved = {o.name: o.hide_render for o in every}
    try:
        for name, (objs, eye, target, lens) in SHOTS.items():
            for o in every:
                o.hide_render = o.name not in objs
            cam.location = eye
            cam.data.lens = lens
            aim(cam, target)
            side = (eye - target).cross(Vector((0, 0, 1))).normalized()
            dist = (eye - target).length
            key.location = target + side * dist * 0.8 + Vector((0, -dist * 0.4, dist * 0.7))
            fill.location = target - side * dist * 1.1 + Vector((0, -dist * 0.6, dist * 0.2))
            rim.location = target + Vector((0, dist * 0.9, dist * 0.6)) - side * 0.3
            for l in (key, fill, rim):
                aim(l, target)
            path = os.path.join(OUT, f'sheet_{name}.png')
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            shutil.copy2(path, DOCS)
            print('rendered', path)
    finally:
        for o in every:
            o.hide_render = saved[o.name]
        for n in ('SHEET_cam', 'SHEET_key', 'SHEET_fill', 'SHEET_rim'):
            bpy.data.objects.remove(bpy.data.objects[n])


render()
