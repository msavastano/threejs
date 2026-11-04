"""Look-dev stills in the background, so the live Blender session stays responsive.

  blender -b scene.blend --python still.py -- <out.png> <frame[,frame...]> [percent] [samples]

percent scales the scene resolution (default 50); samples default 32. With several frames each
file gets _f<frame> before the extension. Use an ABSOLUTE out path.
"""
import os
import sys
import time

import bpy

a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(a) < 2:
    sys.exit(__doc__)
out = os.path.abspath(a[0])
frames = [int(f) for f in a[1].split(",")]
pct = int(a[2]) if len(a) > 2 else 50
samples = int(a[3]) if len(a) > 3 else 32
sc = bpy.context.scene
sc.render.resolution_percentage = pct
if sc.render.engine == "CYCLES":
    sc.cycles.samples = samples
else:
    sc.eevee.taa_render_samples = samples
sc.render.image_settings.file_format = "PNG"
os.makedirs(os.path.dirname(out), exist_ok=True)
root, ext = os.path.splitext(out)
for f in frames:
    t0 = time.time()
    sc.frame_set(f)
    sc.render.filepath = out if len(frames) == 1 else f"{root}_f{f:04d}{ext}"
    bpy.ops.render.render(write_still=True)
    print(f"STILL {f} {time.time() - t0:.1f}s -> {sc.render.filepath}", flush=True)
