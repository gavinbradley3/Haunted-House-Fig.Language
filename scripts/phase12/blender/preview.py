"""Render a quick preview of the Last Dance props: blender --background <file.blend> --python preview.py -- <out.png> [root]"""
import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out = args[0]
only = args[1] if len(args) > 1 else None
sc = bpy.context.scene
for r in [o for o in bpy.data.objects if o.parent is None and o.type == "EMPTY"]:
    if only and r.name != only:
        for c in [r] + list(r.children_recursive):
            c.hide_render = True
targets = [o for o in bpy.data.objects if o.type == "MESH" and not o.hide_render]
lo = Vector((min(o.matrix_world @ Vector(c) for o in targets for c in o.bound_box)[i] for i in range(3))) if False else None
xs = [(o.matrix_world @ Vector(c)) for o in targets for c in o.bound_box]
mn = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
mx = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
ctr = (mn + mx) / 2
size = (mx - mn).length
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
cam.location = ctr + Vector((size * 0.55, -size * 1.05, size * 0.45))
cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam
for loc, e in [((2, -3, 4), 600), ((-3, -1, 2), 200)]:
    l = bpy.data.objects.new("l", bpy.data.lights.new("l", "POINT"))
    l.data.energy = e * max(1, size)
    l.location = ctr + Vector(loc) * max(1, size * 0.6)
    sc.collection.objects.link(l)
try:
    sc.render.engine = "BLENDER_EEVEE"
except TypeError:
    pass
sc.render.resolution_x, sc.render.resolution_y = 900, 640
sc.world = sc.world or bpy.data.worlds.new("w")
sc.world.color = (0.03, 0.03, 0.035)
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("rendered", out)
