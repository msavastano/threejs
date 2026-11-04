"""Render a scene's frames as PNGs in the background. Resumable: frames already on disk are skipped,
so a stopped job just runs again.

  blender -b scene.blend --python render_frames.py -- <preview|final> <out_dir> [options]

  preview   480 px tall at the scene's aspect (854x480 for 16:9), 8 samples, coarse volumes
  final     the scene's resolution (or --res), 12 samples, 8 px volume tiles
  options   --start N --end N   frame range (default: the scene's)
            --samples N         EEVEE / Cycles samples
            --res WxH           output size
            --transparent       RGBA with a transparent film, for layering over the code film
            --engine eevee|cycles
            --vol-tile 2|4|8|16 --vol-samples N   EEVEE volumes (smaller tiles: finer, slower)

Use an ABSOLUTE out_dir: relative render paths resolve against the drive root. Frames are named
f0001.png, f0002.png ... by scene frame number. Prints "FRAME n 12.3s eta 1h04m" per frame.
"""
import os
import sys
import time

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) < 2 or argv[0] not in ("preview", "final"):
    sys.exit(__doc__)
mode, out_dir = argv[0], os.path.abspath(argv[1])
opts, i = {}, 2
while i < len(argv):
    k = argv[i].lstrip("-")
    if k == "transparent":
        opts[k] = True
        i += 1
    else:
        opts[k] = argv[i + 1]
        i += 2

sc = bpy.context.scene
r = sc.render
if "start" in opts:
    sc.frame_start = int(opts["start"])
if "end" in opts:
    sc.frame_end = int(opts["end"])

engine = opts.get("engine")
if engine:  # 4.2-4.x builds call EEVEE "BLENDER_EEVEE_NEXT"
    for name in (["CYCLES"] if engine.lower() == "cycles" else ["BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"]):
        try:
            r.engine = name
            break
        except TypeError:
            continue

aspect = r.resolution_x / max(1, r.resolution_y)
r.resolution_percentage = 100
if "res" in opts:
    w, h = (int(v) for v in opts["res"].lower().split("x"))
    r.resolution_x, r.resolution_y = w, h
elif mode == "preview":
    h = 480
    r.resolution_x, r.resolution_y = int(round(h * aspect / 2)) * 2, h

samples = int(opts.get("samples", 8 if mode == "preview" else 12))
if r.engine == "CYCLES":
    sc.cycles.samples = samples
else:
    e = sc.eevee
    e.taa_render_samples = samples
    for attr, val in (("volumetric_tile_size", opts.get("vol-tile", "8")),
                      ("volumetric_samples", int(opts.get("vol-samples", 48 if mode == "preview" else 64))),
                      ("shadow_ray_count", 1), ("shadow_step_count", 6)):
        if hasattr(e, attr):
            try:
                setattr(e, attr, val)
            except (TypeError, ValueError):
                pass

r.film_transparent = bool(opts.get("transparent"))
fmt = r.image_settings
fmt.file_format = "PNG"
fmt.color_mode = "RGBA" if r.film_transparent else "RGB"
fmt.color_depth = "8"
fmt.compression = 15
r.use_overwrite = False
r.use_placeholder = True
os.makedirs(out_dir, exist_ok=True)
r.filepath = os.path.join(out_dir, "f####")

todo = [f for f in range(sc.frame_start, sc.frame_end + 1)
        if not os.path.exists(os.path.join(out_dir, f"f{f:04d}.png"))]
state = {"t": time.time(), "done": 0, "secs": []}


def post(scene, *_):
    now = time.time()
    dt = now - state["t"]
    state["t"] = now
    state["done"] += 1
    state["secs"].append(dt)
    recent = state["secs"][-10:]
    left = (len(todo) - state["done"]) * sum(recent) / len(recent)
    print(f"FRAME {scene.frame_current} {dt:.1f}s eta {int(left // 3600)}h{int(left % 3600 // 60):02d}m", flush=True)


bpy.app.handlers.render_post.append(post)
print(f"RENDER {mode} {r.engine} {r.resolution_x}x{r.resolution_y} {samples} samples, "
      f"frames {sc.frame_start}-{sc.frame_end} ({len(todo)} to do) -> {out_dir}", flush=True)
if todo:
    bpy.ops.render.render(animation=True)
print("RENDER_DONE", flush=True)
