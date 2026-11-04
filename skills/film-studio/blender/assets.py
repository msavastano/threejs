"""Bring downloaded assets into the open scene, cap their textures, and measure and place them.
Runs inside Blender (bpy). The registry is blender/assets.json next to this file:

{
  "tex_default": 1024,
  "models":    {"bench": {"folder": "wooden-table", "collection": "Wooden Table", "tex": 2048}},
  "materials": {"brick": {"folder": "old-brick-wall", "tex": 2048}},
  "hdrs":      {"sky":   {"folder": "sunset"}}
}

"folder" is the asset's folder under ~/blenderkit_data/<type>s/ (bk.py get prints it). "collection"
is the collection inside the asset's .blend (usually the asset's name). "tex" caps every image the
asset uses (2048 for hero props, 1024 for the rest; EEVEE on 3 GB of VRAM stalls on raw 4K-8K).
Each appended model's collection is linked under PROPS and renamed to its key.
"""
import glob
import json
import os

import bpy
from mathutils import Vector

DATA = os.path.join(os.path.expanduser("~"), "blenderkit_data")
REGISTRY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets.json")


def registry(path=REGISTRY):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def asset_file(folder, sub="models", exts=(".blend",)):
    files = sorted(f for e in exts for f in glob.glob(os.path.join(DATA, sub, folder, "*" + e)))
    if not files:
        raise FileNotFoundError(f"{sub}/{folder}: nothing downloaded yet; run bk.py get first")
    return files[0]


def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def append_model(key, reg=None):
    """Appends the asset once (later calls reuse it) and returns its root objects (no parent)."""
    if key in bpy.data.collections:
        return [o for o in bpy.data.collections[key].all_objects if o.parent is None]
    m = (reg or registry())["models"][key]
    path = asset_file(m["folder"])
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        want = m.get("collection") or (src.collections[0] if src.collections else None)
        if want not in src.collections:
            raise KeyError(f"{key}: no collection {want!r} in {path}; it has {list(src.collections)}")
        dst.collections = [want]
    col = dst.collections[0]
    col.name = key
    collection("PROPS").children.link(col)
    for o in col.all_objects:
        o["asset_key"] = key
    return [o for o in col.all_objects if o.parent is None]


def append_material(key, reg=None):
    name = f"MAT_{key}"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = (reg or registry())["materials"][key]
    with bpy.data.libraries.load(asset_file(m["folder"], "materials"), link=False) as (src, dst):
        dst.materials = list(src.materials[:1])
    mat = dst.materials[0]
    mat.name = name
    mat["asset_key"] = key
    return mat


def world_from_hdr(key, strength=1.0, rotation_z=0.0, reg=None):
    """Lights the world with a downloaded HDRI (bk.py get ... resolution_2K)."""
    m = (reg or registry())["hdrs"][key]
    path = asset_file(m["folder"], "hdrs", (".hdr", ".exr"))
    w = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    mp = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    env.image = bpy.data.images.load(path, check_existing=True)
    mp.inputs["Rotation"].default_value[2] = rotation_z
    bg.inputs["Strength"].default_value = strength
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return w


def _images_of(tree, seen):
    out = set()
    if not tree:
        return out
    for n in tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            out.add(n.image)
        elif n.type == "GROUP" and n.node_tree and n.node_tree.name not in seen:
            seen.add(n.node_tree.name)
            out |= _images_of(n.node_tree, seen)
    return out


def shrink_images(max_count=10**6, reg=None):
    """Downscales packed or file images to the cap of the asset that uses them. Returns a log.
    max_count limits the work per call, so a live MCP call (2 min limit) can do it in batches."""
    reg = reg or registry()
    default = reg.get("tex_default", 1024)
    cap = {}
    for key, m in reg.get("models", {}).items():
        c = bpy.data.collections.get(key)
        if not c:
            continue
        for o in c.all_objects:
            for slot in getattr(o, "material_slots", []):
                if slot.material:
                    for im in _images_of(slot.material.node_tree, set()):
                        cap[im.name] = max(cap.get(im.name, 0), m.get("tex", default))
    for key, m in reg.get("materials", {}).items():
        mat = bpy.data.materials.get(f"MAT_{key}")
        if mat:
            for im in _images_of(mat.node_tree, set()):
                cap[im.name] = max(cap.get(im.name, 0), m.get("tex", default))
    log = []
    for im in bpy.data.images:
        lim = cap.get(im.name)
        if not lim or im.get("shrunk_to") == lim:
            continue
        w, h = im.size
        if max(w, h) <= lim:
            im["shrunk_to"] = lim
            continue
        if len(log) >= max_count:
            break
        s = lim / max(w, h)
        im.scale(max(1, int(w * s)), max(1, int(h * s)))
        im.pack()  # keep the smaller pixels in the .blend
        im["shrunk_to"] = lim
        log.append((im.name, w, int(w * s)))
    return log


def world_bbox(objs):
    """Axis-aligned bounds over all mesh descendants of objs, evaluated (modifiers applied)."""
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    seen, stack = set(), list(objs)
    while stack:
        o = stack.pop()
        if o.name in seen:
            continue
        seen.add(o.name)
        stack.extend(o.children)
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = ev.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def root_empty(objs):
    """One empty ("<key>.root") that the asset's root objects hang from, so it moves, turns and
    scales as one. Safe to call again with the empty itself, or with append_model's result."""
    if len(objs) == 1 and objs[0].get("is_root"):
        return objs[0]
    key = objs[0].get("asset_key") or objs[0].name
    e = bpy.data.objects.get(f"{key}.root")
    if e is None:
        e = bpy.data.objects.new(f"{key}.root", None)
        objs[0].users_collection[0].objects.link(e)
        e["is_root"], e["asset_key"] = True, key
    for o in objs:
        if o.parent is None and o is not e:
            mw = o.matrix_world.copy()
            o.parent = e
            o.matrix_parent_inverse = e.matrix_world.inverted()
            o.matrix_world = mw
    return e


def fit(objs, size, axis="max"):
    """Uniformly scales the asset (via its root empty) so its largest side, or its 'x', 'y' or 'z'
    side, is `size` metres. Scaling moves it about the origin, so call place_on afterwards."""
    e = root_empty(objs)
    bpy.context.view_layer.update()
    lo, hi = world_bbox([e])
    d = hi - lo
    cur = {"x": d.x, "y": d.y, "z": d.z}.get(axis, max(d))
    if cur > 0:
        e.scale *= size / cur
    bpy.context.view_layer.update()
    return e


def place_on(objs, x=0.0, y=0.0, z=0.0):
    """Moves the asset so its bounds sit centred on (x, y) with the bottom at height z."""
    e = root_empty(objs)
    bpy.context.view_layer.update()
    lo, hi = world_bbox([e])
    e.location += Vector((x - (lo.x + hi.x) / 2, y - (lo.y + hi.y) / 2, z - lo.z))
    bpy.context.view_layer.update()
    return e


def pivot(name, location, children):
    """An empty at `location` that `children` hang from, keeping their world transforms.
    BlenderKit origins are often all at (0, 0, 0): rotate this instead of the part itself."""
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if not e.users_collection:
        children[0].users_collection[0].objects.link(e)
    e.location = Vector(location)
    bpy.context.view_layer.update()
    for c in children:
        mw = c.matrix_world.copy()
        c.parent = e
        c.matrix_parent_inverse = e.matrix_world.inverted()
        c.matrix_world = mw
    return e
