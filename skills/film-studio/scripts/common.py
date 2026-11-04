"""Helpers shared by the film-studio scripts (paths to the studio, Chromium, Blender; the plan)."""
import glob
import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path

WIN = platform.system() == "Windows"
HOME = Path.home()
SKILL = Path(__file__).resolve().parent.parent


def run(cmd, cwd=None, timeout=30):
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except (OSError, subprocess.TimeoutExpired) as e:
        return -1, str(e)


def is_studio(p):
    return (p / "render.mjs").is_file() and (p / "tools").is_dir()


def find_mv(start=None):
    """The motion-videos studio: a parent of `start` or the cwd, $MOTION_VIDEOS, or a known clone."""
    cands = []
    for s in (start, Path.cwd()):
        if s:
            s = Path(s).resolve()
            cands += [s, *s.parents]
    if os.environ.get("MOTION_VIDEOS"):
        cands.append(Path(os.environ["MOTION_VIDEOS"]))
    cands += [HOME / "Local Documents" / "dev" / "motion-videos", HOME / "dev" / "motion-videos",
              HOME / "motion-videos", HOME / "src" / "motion-videos", Path("/workspace/motion-videos")]
    for c in cands:
        if is_studio(c):
            return c
    return None


def find_chrome(mv):
    """A Chromium that render.mjs can drive. Playwright's own build if installed, else the newest
    other Playwright Chromium on this machine (passed as CHROME_BIN), else None."""
    if os.environ.get("CHROME_BIN") and Path(os.environ["CHROME_BIN"]).exists():
        return os.environ["CHROME_BIN"], "CHROME_BIN"
    if mv and (mv / "node_modules" / "playwright").is_dir():
        c, o = run(["node", "-e", "import('playwright').then(p=>console.log(p.chromium.executablePath()))"], cwd=mv)
        want = o.strip().splitlines()[-1] if c == 0 and o.strip() else ""
        if want and Path(want).exists():
            return want, "playwright"
    roots = [Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")), HOME / "AppData" / "Local" / "ms-playwright",
             HOME / ".cache" / "ms-playwright", HOME / "Library" / "Caches" / "ms-playwright", Path("/opt/pw-browsers")]
    exe = ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"] if WIN else \
          ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]
    hits = []
    for r in roots:
        if str(r) and r.is_dir():
            for e in exe:
                hits += glob.glob(str(r / "chromium-*" / e))
    def build(p):
        m = re.search(r"chromium-(\d+)", p)
        return int(m.group(1)) if m else 0
    if hits:
        return max(hits, key=build), "fallback"
    return None, None


def find_blender():
    if os.environ.get("BLENDER") and Path(os.environ["BLENDER"]).is_file():
        return Path(os.environ["BLENDER"])
    w = shutil.which("blender")
    if w:
        return Path(w)
    pats = (["C:/Program Files/Blender Foundation/Blender */blender.exe"] if WIN else
            ["/Applications/Blender.app/Contents/MacOS/Blender", "/usr/bin/blender", "/snap/bin/blender",
             str(HOME / "blender*/blender"), "/opt/blender*/blender"])
    hits = [Path(p) for pat in pats for p in glob.glob(pat)]
    def ver(p):
        m = re.search(r"(\d+)\.(\d+)", str(p))
        return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
    return max(hits, key=ver) if hits else None


def film_dir(arg):
    """A film folder from a path or a slug (looked up under the studio's films/)."""
    p = Path(arg)
    if (p / "plan.json").is_file():
        return p.resolve()
    mv = find_mv()
    if mv and (mv / "films" / arg / "plan.json").is_file():
        return (mv / "films" / arg).resolve()
    raise SystemExit(f"error: no plan.json in {arg} (give a film folder or a slug under films/)")


def load_plan(film):
    return json.loads((Path(film) / "plan.json").read_text(encoding="utf-8-sig"))


def ffprobe_duration(path):
    c, o = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])
    try:
        return float(o.strip().splitlines()[0])
    except (ValueError, IndexError):
        return None
