"""BlenderKit search and download for free assets, no login and no Blender UI needed.
Runs on any Python 3 (or Blender's bundled one: <blender dir>/<ver>/python/bin/python.exe -I).

  python bk.py search "<query>" <out_dir> [n] [asset_type]
      Free assets only. asset_type: model (default), material, hdr, scene, brush.
      Saves the thumbnails as <out_dir>/<NN>.jpg and <out_dir>/results.json (name, ids, author,
      size in metres, face count, animated, rigged, download urls) and prints one line per result.
  python bk.py get <out_dir> <NN> [<NN> ...] [file_type]
      Downloads the chosen results into ~/blenderkit_data/<type>s/<slug>/ and records the local
      path in results.json. file_type: blend (default); for an HDRI use e.g. resolution_2K.

How it works: GET /api/v1/search/ with "is_free:true", then each file's downloadUrl with a
random ?scene_uuid= returns a signed filePath to fetch. Paid assets are skipped.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import uuid

API = "https://www.blenderkit.com/api/v1"
UA = {"User-Agent": "film-studio/1.0"}
DATA = os.path.join(os.path.expanduser("~"), "blenderkit_data")


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.loads(r.read().decode())


def fetch(url, path):
    tmp = path + ".part"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(tmp, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    os.replace(tmp, path)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "asset"


def search(query, out_dir, n=12, asset_type="model"):
    os.makedirs(out_dir, exist_ok=True)
    q = f"{query} asset_type:{asset_type} is_free:true order:_score"
    data = get_json(f"{API}/search/?" + urllib.parse.urlencode({"query": q, "page_size": n, "dict_parameters": 1}))
    rows = []
    for i, a in enumerate(data.get("results", [])[:n]):
        if not a.get("isFree"):
            continue
        thumb = a.get("thumbnailMiddleUrl") or a.get("thumbnailSmallUrl")
        tp = os.path.join(out_dir, f"{i:02d}.jpg")
        if thumb:
            try:
                fetch(thumb, tp)
            except Exception:  # noqa: BLE001  (a missing thumbnail shouldn't stop the search)
                tp = None
        dp = a.get("dictParameters") or {}
        files = {f["fileType"]: f["downloadUrl"] for f in a.get("files", [])}
        rows.append({
            "n": i, "name": a.get("name"), "id": a.get("id"), "assetBaseId": a.get("assetBaseId"),
            "type": a.get("assetType"), "author": (a.get("author") or {}).get("fullName"),
            "dict": {k: dp.get(k) for k in ("dimensionX", "dimensionY", "dimensionZ", "faceCount", "animated", "rig")},
            "files": files, "thumb": tp,
        })
    with open(os.path.join(out_dir, "results.json"), "w", encoding="utf-8") as f:
        json.dump({"query": query, "asset_type": asset_type, "total": data.get("count"), "results": rows}, f, indent=1)
    for r in rows:
        d = r["dict"]
        dims = "x".join(f"{float(d[k]):.2f}" for k in ("dimensionX", "dimensionY", "dimensionZ") if d.get(k) is not None)
        extra = " ".join(k for k in ("animated", "rig") if d.get(k))
        print(f'{r["n"]:02d}  {r["name"]}  by {r["author"]}  {dims + " m" if dims else ""}  {d.get("faceCount") or ""} faces {extra}'.rstrip())
    print(f"total {data.get('count')} free matches; thumbnails in {out_dir}")


def get(out_dir, picks, file_type="blend"):
    p = os.path.join(out_dir, "results.json")
    with open(p, encoding="utf-8") as f:
        res = json.load(f)
    for r in res["results"]:
        if r["n"] not in picks:
            continue
        url = r["files"].get(file_type)
        if not url:
            print("no", file_type, "for", r["name"], "; it has", list(r["files"]))
            continue
        d = get_json(url + "?" + urllib.parse.urlencode({"scene_uuid": str(uuid.uuid4())}))
        ext = os.path.splitext(urllib.parse.urlparse(d["filePath"]).path)[1] or ".blend"
        dest_dir = os.path.join(DATA, f'{r["type"]}s', slug(r["name"]))
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, slug(r["name"]) + "_" + r["id"][:8] + ext)
        if not os.path.exists(dest):
            fetch(d["filePath"], dest)
        r["local"] = dest
        r["folder"] = slug(r["name"])
        print(f'got {r["n"]:02d} {r["name"]} -> {dest} ({os.path.getsize(dest) // 1024} KB); assets.json folder "{r["folder"]}"')
    with open(p, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # asset names are not cp1252-safe
    if len(sys.argv) < 3 or sys.argv[1] not in ("search", "get"):
        sys.exit(__doc__)
    if sys.argv[1] == "search":
        search(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 12,
               sys.argv[5] if len(sys.argv) > 5 else "model")
    else:
        args = sys.argv[3:]
        ft = "blend"
        if args and not args[-1].isdigit():
            ft = args.pop()
        get(sys.argv[2], [int(x) for x in args], ft)
