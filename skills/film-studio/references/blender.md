# The Blender maker

Blender makes the physically lit 3D. Claude writes every step as Python; Blender renders.

## Where it runs

- Mike's PC (luca-sav): Blender 5.2 LTS at `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`,
  a GTX 1050 laptop GPU with 3 GB. Use **EEVEE**, not Cycles.
- Cloud sessions have no Blender. Route those shots elsewhere (see `routing.md`).
- Two MCP bridges may be connected: `blender` (tools `mcp__blender__*`, the mcp-for-blender add-on,
  checked by the **blender-mcp** skill's doctor) and `Blender` (tools `mcp__Blender__*`, the official
  Blender Lab add-on). Both run Python in the live Blender. Use the one that answers; the official
  one's doc search (`search_api_docs`, `get_python_api_docs`) is handy for bpy signatures.
- **Every MCP call times out after about 2 minutes.** Build and look through the MCP; render, bake
  and download in the background with `blender -b`.

## The scene is a script

`films/<slug>/blender/build_scene.py` (from the template) rebuilds the whole scene every run:

- One section per concern (assets, room, materials, lights, animation, camera, render settings),
  each led by its constants. Change a constant, re-run, look.
- Everything it makes goes into collections it owns (`GEN_*`), cleared at the start of each run, so
  re-running never duplicates anything. Assets appended once are reused.
- Run it live to iterate: `execute_blender_code` with
  `exec(compile(open(r"<abs path>/build_scene.py").read(), "build_scene.py", "exec"), {"__name__": "__main__"})`,
  then `look` (`mode: "camera"` for framing, `mode: "frames"` for animation, `max_size` 384–512).
  If one run takes more than a minute, run it in the background instead:
  `blender -b --factory-startup --python blender/build_scene.py -- blender/scene.blend`.
- Never fix something by hand in the UI without folding the change back into the script.
- The saved `.blend` is gitignored (BlenderKit textures make it hundreds of MB); the scripts and
  the asset registry rebuild it.

## Assets: find, don't model

In this order:

1. **BlenderKit** (free assets, no login). Use Blender's bundled Python or any Python 3:
   ```
   $PY blender/bk.py search "wooden workbench" prep/search/bench 12      # thumbnails + results.json
   $PY blender/bk.py get prep/search/bench 3 7                            # into ~/blenderkit_data/models/<slug>/
   $PY blender/bk.py search "brick wall" prep/search/brick 12 material
   $PY blender/bk.py search "sunset" prep/search/sky 8 hdr   then   get ... 2 resolution_2K
   ```
   Read the thumbnails (`prep/search/<key>/NN.jpg`) before choosing; check `dims` in metres. Record
   each pick in `blender/assets.json` (`folder` under blenderkit_data, the asset's `collection`
   name, and a texture cap), then `assets.append_model(key)` in the scene script.
2. **Poly Haven** through the MCP: `search_assets` (`source: "polyhaven"`, `previews: 3–6`) and
   `import_asset` with a `target_size` in metres. CC0. HDRIs become world light.
3. **Sketchfab / Poly Pizza** through the same tools. CC-BY: credit the author in the README.
4. **`generate_3d`**: one custom object from a prompt or a Nano Banana image. It can cost a credit,
   so ask first, generate once, and duplicate the result for repeats.
5. **Model in bpy** only what is simple (walls, floors, boxes, panels) or procedural (Geometry Nodes).

After appending, measure before placing: `assets.world_bbox(objs)` gives the evaluated bounds;
`assets.place_on(objs, z=...)` and `assets.fit(objs, size)` put them on a surface at a real size.
**BlenderKit origins are often all at (0, 0, 0)**: for anything that rotates (hands, pendulums,
lids, wheels), make a pivot empty at the measured hub with `assets.pivot(...)` and parent to it.

## Textures and VRAM

BlenderKit files pack 4K–8K textures (one film had ~150 images, an 800 MB .blend). On 3 GB of VRAM
EEVEE stalls. `assets.shrink_images()` downscales every image to its asset's cap from
`assets.json` (2K for hero props, 1K for the rest). It takes `max_count` so a live MCP call can do
it in batches without timing out.

## EEVEE gotchas (each one cost hours)

- **Glass**: EEVEE treats Glass BSDF / full transmission as opaque to shadows (a window blocked
  the sun) and renders glass doors as mirrors. Use thin glass: Transparent mixed with a fresnel
  Glossy, and `use_transparent_shadow` on the material.
- **Light shafts**: a volume box over the room (density ~0.08, anisotropy ~0.3) lit only by the
  sun; turn the other lights' volume contribution off or down so it reads as beams.
- **Dust in a beam**: Shader to RGB does not give you lighting on points in EEVEE. Cull the points
  in Geometry Nodes instead: trace each point back toward the sun and keep only those whose ray
  passes through the window opening.
- **Motion blur with Geometry Nodes points whose count changes per frame** makes long streaks.
  Keep blur off or keep the point count stable.
- **Background renders need absolute output paths**; relative ones resolve against the drive root.
- Look shader nodes up by `type`, never by name (names are localized). Read enum values from
  `bl_rna` instead of hardcoding them. Set engine inside `try/except TypeError`.

## Animation

- Scene fps = film fps. A Blender shot that starts at film time `S` shows frame
  `1 + round((t - S) * fps)` at time `t`; record its frame range in the shot's `blender.frames` in `plan.json`.
- Periodic motion (pendulums, ticking hands, rotors): drivers with simple expressions on `frame`,
  e.g. `4 * sin(frame / 24 * pi)` or `floor(frame / 24) * -6` (simple expressions need no Python auto-run).
- Camera moves: a few keyframes with Bezier easing; a Noise modifier on the f-curves at very low
  strength for a hand-held feel. Rack focus with keyed `dof.focus_distance` or a focus empty.
- Lighting changes over time (a sunset): key the sun's strength, colour and angle.
- Characters: don't hand-animate a character from scratch. Use an asset with its own animation
  (BlenderKit `animated: true`), keep people out of frame, or route them to a generated clip.

## Rendering

```
blender -b blender/scene.blend --python blender/render_frames.py -- preview <abs>/prep/frames_480
blender -b blender/scene.blend --python blender/render_frames.py -- final   <abs>/prep/frames_1080 --samples 12
blender -b blender/scene.blend --python blender/render_frames.py -- final   <abs>/prep/frames_1080 --start 120 --end 122   # time 3 frames
blender -b blender/scene.blend --python blender/still.py -- <abs>/prep/look/look.png 1,150,240 50 32           # look-dev stills
```

- Run them with the shell's background option; they print `FRAME n 12.3s` lines (and an ETA), and
  they are **resumable**: a stopped job skips frames already on disk.
- Preview first (854x480 for 16:9, 8 samples), check it, then final. Time three frames at final
  settings before committing to the full run; in-focus detail at 8, 16 and 48 samples looked the
  same on LAST LIGHT, so 12 samples with 8 px volume tiles was the final.
- `--transparent` renders RGBA for layering over a code world.
- Output is `f0001.png ...`; `plan.json` `frames` tells `build.py` where they are when Blender is the
  whole picture, and the code film reads them with `sequence()` otherwise.

## Handing 3D positions to the code film

When 2D graphics must stick to 3D points, export their screen positions per frame:

```python
import bpy, json
from bpy_extras.object_utils import world_to_camera_view
sc = bpy.context.scene; cam = sc.camera; out = {}
for f in range(sc.frame_start, sc.frame_end + 1):
    sc.frame_set(f)
    for name in ("Anchor.hub", "Anchor.tip"):
        p = world_to_camera_view(sc, cam, bpy.data.objects[name].matrix_world.translation)
        out.setdefault(name, []).append([round(p.x, 5), round(1 - p.y, 5), round(p.z, 4)])  # x, y in 0..1 from top-left, depth
json.dump({"fps": sc.render.fps, "first": sc.frame_start, "tracks": out}, open(r"<abs>/prep/tracks.json", "w"))
```

Run it with `blender -b scene.blend --python export_tracks.py`. In code, multiply by the frame size.
