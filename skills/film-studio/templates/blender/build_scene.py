"""{{TITLE}}: rebuilds the whole Blender scene from the downloaded assets. Re-runnable.

Live (to iterate, through the MCP's execute_blender_code; keep each run under ~1 min):
    p = r"{{BLENDER_DIR}}/build_scene.py"; exec(compile(open(p).read(), p, "exec"), {"__name__": "__main__", "__file__": p})
Background (and save):
    blender -b --factory-startup --python blender/build_scene.py -- "{{BLENDER_DIR}}/scene.blend"

Each section starts with its constants. Everything this script makes lives in GEN_* collections,
cleared at the start of each run; appended assets (PROPS) are reused, not re-appended.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"{{BLENDER_DIR}}"
sys.path.insert(0, HERE)
import assets  # noqa: E402  (blender/assets.py, next to this file)

FPS = {{FPS}}
DUR = {{DUR}}                       # seconds of this Blender shot
FRAMES = round(DUR * FPS)
RES = ({{W}}, {{H}})


def gen(name):
    """A GEN_* collection, emptied."""
    col = assets.collection(f"GEN_{name}")
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    return col


def link(obj, col):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    return obj


# ---------------------------------------------------------------- scene settings
sc = bpy.context.scene
# Blender's startup cube, light and camera are not part of the film (anything else is left alone)
for name, kind in (("Cube", "MESH"), ("Light", "LIGHT"), ("Camera", "CAMERA")):
    o = bpy.data.objects.get(name)
    if o and o.type == kind and not o.get("keep"):
        bpy.data.objects.remove(o, do_unlink=True)
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, FRAMES
sc.render.resolution_x, sc.render.resolution_y = RES
for name in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        sc.render.engine = name
        break
    except TypeError:
        continue
sc.view_settings.view_transform = "AgX"  # read enums from bl_rna if this ever fails

# ---------------------------------------------------------------- assets (from blender/assets.json)
REG = assets.registry()
# bench = assets.append_model("bench", REG)
# assets.fit(bench, 1.8); assets.place_on(bench, 0, 0, 0)
# brick = assets.append_material("brick", REG)
# print(assets.shrink_images(reg=REG))   # in batches (max_count=40) when run live

# ---------------------------------------------------------------- set (simple architecture only)
SET = gen("set")
FLOOR = 8.0
bpy.ops.mesh.primitive_plane_add(size=FLOOR)
floor = link(bpy.context.active_object, SET)
floor.name = "floor"

# ---------------------------------------------------------------- lights
LIGHTS = gen("lights")
SUN_ANGLE = (math.radians(55), 0, math.radians(30))
SUN_STRENGTH = 3.0
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = SUN_STRENGTH
sun.rotation_euler = SUN_ANGLE
LIGHTS.objects.link(sun)

# ---------------------------------------------------------------- camera (keys in seconds, eased)
CAM = gen("camera")
LENS = 35
CAM_KEYS = [(0.0, (4.0, -4.0, 1.6), (0.0, 0.0, 0.6)),     # (t, position, look-at)
            (DUR, (2.6, -2.6, 1.2), (0.0, 0.0, 0.5))]
cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
cam.data.lens = LENS
CAM.objects.link(cam)
target = bpy.data.objects.new("camera.target", None)
CAM.objects.link(target)
track = cam.constraints.new("TRACK_TO")
track.target, track.track_axis, track.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
for t, pos, look in CAM_KEYS:
    f = 1 + round(t * FPS)
    cam.location, target.location = pos, look
    cam.keyframe_insert("location", frame=f)
    target.keyframe_insert("location", frame=f)
sc.camera = cam

# ---------------------------------------------------------------- animation
# Periodic motion as simple-expression drivers on `frame` (no Python auto-run needed), e.g.
# d = pendulum.driver_add("rotation_euler", 1).driver; d.expression = "radians(4) * sin(frame / 24 * pi)"

bpy.context.view_layer.update()
print({"frames": FRAMES, "objects": len(bpy.data.objects), "camera": cam.name})

# ---------------------------------------------------------------- save (background runs)
if "--" in sys.argv:
    out = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print("saved", out)
