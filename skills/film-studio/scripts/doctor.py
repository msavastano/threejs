#!/usr/bin/env python3
"""Which film makers are ready on this machine, and the one fix for each missing piece.

    python doctor.py            # local checks only, no network
    python doctor.py --ping     # also one free Gemini call (lists models) to check the key and model names
    python doctor.py --json     # the same, as JSON

Never prints an API key. Exit code 0 when the code film (the edit) can render here.
"""
import argparse
import glob
import importlib.util
import json
import os
import platform
import re
import shutil
import socket
import sys
from pathlib import Path

from common import HOME, WIN, find_blender, find_chrome, find_mv, run

MODELS = {  # what the motion-videos tools use by default
    "image": ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-3.1-flash-image"],
    "video": ["gemini-omni-1.1-flash", "veo-3.1-generate-preview", "veo-3.1-fast-generate-preview"],
    "voice": ["gemini-3.8-flash-tts"],
    "music": ["lyria-3-clip-preview", "lyria-3-pro-preview"],
}


def has_mod(name):
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        return False


def key_status(mv):
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return "set in the environment"
    if mv and (mv / ".env").is_file():
        for line in (mv / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"\s*(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*(\S+)", line)
            if m and m.group(2).strip("'\"") not in ("", "your_key"):
                return f"set in {mv / '.env'}"
    return None


def load_env(mv):
    if not mv or not (mv / ".env").is_file():
        return
    for line in (mv / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def ping(mv):
    """One free call: list the models this key can use."""
    load_env(mv)
    key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or "proxy-injected"
    try:
        from google import genai
        names = {m.name.split("/")[-1] for m in genai.Client(api_key=key).models.list()}
    except Exception as e:  # noqa: BLE001  (bad key, no network, old SDK)
        msg = (str(e).splitlines() or [""])[0][:160]
        return {"ok": False, "error": f"{type(e).__name__}: {msg}"}
    found = {k: [m for m in v if m in names] for k, v in MODELS.items()}
    return {"ok": True, "models": len(names), "found": found}


def blender_python(blender):
    """Blender's bundled Python (runs bk.py when the system Python is missing)."""
    for pat in ("*/python/bin/python.exe", "*/python/bin/python3*"):
        hits = sorted(glob.glob(str(blender.parent / pat)))
        if hits:
            return Path(hits[-1])
    return None


def blenderkit_addon():
    roots = ([Path(os.environ.get("APPDATA", "")) / "Blender Foundation" / "Blender"] if WIN else
             [HOME / ".config" / "blender", HOME / "Library" / "Application Support" / "Blender"])
    return any(glob.glob(str(r / "*" / "extensions" / "*" / "blenderkit")) or
               glob.glob(str(r / "*" / "scripts" / "addons" / "blenderkit")) for r in roots)


def port_open(port, host="127.0.0.1"):
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def gpu():
    if not shutil.which("nvidia-smi"):
        return None
    code, out = run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"])
    return out.strip().splitlines()[0] if code == 0 and out.strip() else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ping", action="store_true", help="one free Gemini call to check the key and models")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    rows, fixes = [], []

    def row(name, ok, detail, fix=None):
        rows.append({"check": name, "ok": bool(ok), "detail": detail})
        if not ok and fix:
            fixes.append(f"{name}: {fix}")

    mv = find_mv()
    row("studio", mv, str(mv) if mv else "motion-videos not found",
        "git clone https://github.com/msavastano/motion-videos (or set MOTION_VIDEOS to its path)")

    code, out = run(["node", "--version"])
    nv = re.search(r"v(\d+)", out or "")
    row("node", code == 0 and nv and int(nv.group(1)) >= 22, out.strip() or "missing", "install Node 22 or newer")
    for tool in ("ffmpeg", "ffprobe"):
        row(tool, shutil.which(tool), shutil.which(tool) or "missing",
            "winget install Gyan.FFmpeg" if WIN else "apt-get install ffmpeg (or brew install ffmpeg)")

    if mv:
        pw = (mv / "node_modules" / "playwright").is_dir()
        chrome, how = find_chrome(mv) if pw else (None, None)
        detail = {"playwright": chrome, "CHROME_BIN": f"CHROME_BIN={chrome}",
                  "fallback": f"Playwright's own Chromium is missing; build.py will use {chrome}"}.get(how)
        row("chromium", chrome, detail or ("node_modules missing" if not pw else "no Chromium found"),
            f"cd \"{mv}\" && npm install && npx playwright install chromium")

    py = Path(sys.executable)
    mods = {"numpy": "numpy", "soundfile": "soundfile", "scipy": "scipy", "PIL": "pillow",
            "librosa": "librosa", "google.genai": "google-genai"}
    missing = [pkg for m, pkg in mods.items() if not has_mod(m)]
    row("python", not missing, f"{py.name} {platform.python_version()}" + (f", missing {' '.join(missing)}" if missing else ""),
        f"{'python' if WIN else 'python3'} -m pip install {' '.join(missing)}")

    key = key_status(mv)
    cloud = bool(os.environ.get("CLAUDE_CODE_REMOTE")) or Path("/opt/pw-browsers").is_dir()
    row("gemini key", key,
        key or ("not found here; in a cloud session it may be a network secret (run --ping)" if cloud else "not found"),
        f"add GEMINI_API_KEY=... to {mv / '.env' if mv else 'motion-videos/.env'} "
        "(https://aistudio.google.com/apikey); never paste it in chat")
    pinged = None
    if a.ping:
        pinged = ping(mv)
        if pinged["ok"]:
            miss = [k for k, v in pinged["found"].items() if not v]
            row("gemini models", not miss,
                f"{pinged['models']} models; " + ", ".join(f"{k}: {v[0] if v else 'none'}" for k, v in pinged["found"].items()),
                "a model the tools use isn't offered to this key: read the tool's header for current names")
        else:
            row("gemini models", False, pinged["error"], "check the key, billing on its project, and the network")

    bl = find_blender()
    if bl:
        c, o = run([str(bl), "--version"], timeout=90)
        bv = re.search(r"Blender (\d+\.\d+(\.\d+)?)", o or "")
        row("blender", True, f"{bv.group(1) if bv else '?'} at {bl}")
        bp = blender_python(bl)
        row("blender python", bp, str(bp) if bp else "not found (bk.py also runs on the system Python)")
        bk = blenderkit_addon()
        row("blenderkit add-on", True, "installed" if bk else "not installed (blender/bk.py downloads free assets without it)")
        live = port_open(9876)
        row("live blender (MCP)", True, "port 9876 answers" if live else "not running now; the blender-mcp skill's doctor can start it")
    else:
        row("blender", False, "not found" + (" (cloud session: route 3D to three.js or generated media)" if cloud else ""),
            None if cloud else "install Blender 5.x from blender.org, or set BLENDER to its executable")
    g = gpu()
    if g:
        vram = re.search(r"(\d+)\s*MiB", g)
        tip = " -> EEVEE, cap textures at 1-2K" if vram and int(vram.group(1)) <= 4096 else ""
        row("gpu", True, g + tip)

    ok = {r["check"]: r["ok"] for r in rows}
    routes = {
        "code film (the edit)": all(ok.get(k, False) for k in ("studio", "node", "ffmpeg", "chromium")),
        "blender (3D)": ok.get("blender", False),
        "google (stills, clips, voice, music)": has_mod("google.genai") and (ok.get("gemini key", False) or bool((pinged or {}).get("ok"))),
        "sound tools (beats, mix)": ok.get("ffmpeg", False) and has_mod("numpy") and has_mod("soundfile"),
    }
    if a.json:
        print(json.dumps({"checks": rows, "routes": routes, "fixes": fixes,
                          "studio": str(mv) if mv else None, "python": str(py)}, indent=1))
    else:
        for r in rows:
            print(f"{'ok' if r['ok'] else '--'}  {r['check']:<19} {r['detail']}")
        print()
        for k, v in routes.items():
            print(f"{'READY    ' if v else 'NOT READY'}  {k}")
        if fixes:
            print("\nFixes:")
            for f in fixes:
                print("  " + f)
    sys.exit(0 if routes["code film (the edit)"] else 1)


if __name__ == "__main__":
    main()
