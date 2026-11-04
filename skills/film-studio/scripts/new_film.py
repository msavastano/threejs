#!/usr/bin/env python3
"""Scaffold a new film in the motion-videos studio: films/<slug>/ from this skill's templates.

    python new_film.py <slug> --title "Title" [--dur 30] [--fps 24] [--size 1920x1080]
                       [--blender] [--gen] [--vo] [--music] [--budget 5] [--render-hours 8]

  --blender   blender/: build_scene.py, assets.json, bk.py, assets.py, render_frames.py, still.py
  --gen       shots.json for Nano Banana images and Gemini Omni / Veo clips
  --vo        vo_script.json for Gemini TTS narration
  --music     music_prompt.json for Lyria takes

Always: plan.json, docs/brief.md, docs/review_log.md, README.md, index.html, src/film.js,
src/layers.js, mix.json, default fonts, and a .gitignore block in the studio for this film's
regenerable files. Refuses to touch an existing film folder.
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from common import SKILL, find_mv

TPL = SKILL / "templates"


def fill(text, subs):
    for k, v in subs.items():
        text = text.replace("{{" + k + "}}", str(v))
    return text


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return path


def default_fonts(mv, dest):
    """Copies a display and a UI face (with their OFL licences) from earlier films, if any."""
    picks = []
    for pattern, lic in (("space-grotesk-latin-600-normal.woff2", "OFL-SpaceGrotesk.txt"),
                         ("jetbrains-mono-latin-500-normal.woff2", "OFL-JetBrainsMono.txt")):
        hit = next(iter(sorted(mv.glob(f"films/*/assets/fonts/{pattern}"))), None)
        if hit:
            shutil.copy2(hit, dest / hit.name)
            if (hit.parent / lic).is_file():
                shutil.copy2(hit.parent / lic, dest / lic)
            picks.append(hit.name)
        else:
            picks.append(None)
    return picks


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--title", required=True)
    ap.add_argument("--dur", type=float, default=30)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--budget", type=float, default=5)
    ap.add_argument("--render-hours", type=float, default=8)
    for f in ("blender", "gen", "vo", "music"):
        ap.add_argument(f"--{f}", action="store_true")
    a = ap.parse_args()

    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", a.slug):
        sys.exit("error: slug must be lowercase letters, digits and dashes")
    W, H = (int(v) for v in a.size.lower().split("x"))
    mv = find_mv()
    if not mv:
        sys.exit("error: motion-videos not found; clone it or set MOTION_VIDEOS")
    film = mv / "films" / a.slug
    if film.exists():
        sys.exit(f"error: {film} already exists")
    dur = int(a.dur) if a.dur == int(a.dur) else a.dur
    subs = {"TITLE": a.title, "SLUG": a.slug, "W": W, "H": H, "FPS": a.fps, "DUR": dur,
            "BLENDER_DIR": (film / "blender").as_posix()}

    made = []
    for src in ("index.html", "README.md", "docs/brief.md", "docs/review_log.md", "src/film.js", "src/layers.js"):
        made.append(write(film / src, fill((TPL / src).read_text(encoding="utf-8"), subs)))
    for d in ("assets/fonts", "assets/gen", "audio", "prep", "out"):
        (film / d).mkdir(parents=True, exist_ok=True)

    disp, ui = default_fonts(mv, film / "assets" / "fonts")
    html = film / "index.html"
    html.write_text(fill(html.read_text(encoding="utf-8"), {"DISPLAY_FILE": disp or "display.woff2",
                                                            "UI_FILE": ui or "ui.woff2"}), encoding="utf-8", newline="\n")

    plan = {
        "title": a.title, "slug": a.slug, "logline": "",
        "duration": dur, "fps": a.fps, "width": W, "height": H,
        "budget_usd": a.budget, "render_hours": a.render_hours,
        "picture": "code",
        "poster": round(dur * 0.75, 2),
        "prebuild": [],
        "shots": [{"id": "s01", "start": 0, "end": dur, "what": "describe the shot", "method": "code",
                   "why": "one line: why this maker"}],
    }
    if a.blender:
        plan["frames"] = {"draft": "prep/frames_480/f%04d.png", "final": "prep/frames_1080/f%04d.png", "start_number": 1}
        plan["grade_vf"] = f"fade=t=in:st=0:d=0.4,fade=t=out:st={max(0, dur - 0.75)}:d=0.75,vignette=angle=PI/5,noise=alls=3:allf=t"
    made.append(write(film / "plan.json", json.dumps(plan, indent=2) + "\n"))
    made.append(write(film / "mix.json", json.dumps({
        "duration": dur, "loudness": -14, "true_peak": -1, "out": "out/mix.wav",
        "stems": []}, indent=2) + "\n"))

    if a.gen:
        made.append(write(film / "shots.json", json.dumps({
            "image_model": "gemini-nano-banana-2.1", "video_model": "gemini-omni-1.1-flash",
            "aspect_ratio": "9:16" if H > W else "16:9", "image_size": "2K",
            "video_resolution": "720p", "clip_seconds": 6,
            "style": "", "video_style": "Steady, deliberate camera. No text or captions on screen.",
            "images": [], "clips": []}, indent=2) + "\n"))
    if a.vo:
        made.append(write(film / "vo_script.json", json.dumps({
            "model": "gemini-3.8-flash-tts", "voice": "Charon", "style": "", "language": "en",
            "lead_in": 0.5, "gap": 0.6, "tail": 1.0, "segments": []}, indent=2) + "\n"))
    if a.music:
        made.append(write(film / "music_prompt.json", json.dumps({
            "model": "lyria-3-clip-preview" if dur <= 30 else "lyria-3-pro-preview", "takes": []}, indent=2) + "\n"))
    if a.blender:
        bd = film / "blender"
        bd.mkdir(parents=True, exist_ok=True)
        for f in ("bk.py", "assets.py", "render_frames.py", "still.py"):
            made.append(Path(shutil.copy2(SKILL / "blender" / f, bd / f)))
        for f in ("build_scene.py", "assets.json"):
            made.append(write(film / "blender" / f, fill((TPL / "blender" / f).read_text(encoding="utf-8"), subs)))

    gi = mv / ".gitignore"
    block = (f"# {a.title.upper()}: regenerable renders, clip frames, decoded audio and the rebuilt .blend\n"
             f"films/{a.slug}/prep/\nfilms/{a.slug}/audio/*.wav\nfilms/{a.slug}/blender/*.blend\n")
    text = gi.read_text(encoding="utf-8") if gi.is_file() else ""
    if f"films/{a.slug}/prep/" not in text:
        gi.write_text(text.rstrip("\n") + "\n" + block, encoding="utf-8", newline="\n")

    print(f"made {film}")
    for p in made:
        if p:
            print("  " + p.relative_to(film).as_posix())
    if not disp or not ui:
        print("note: no default fonts found in earlier films; put woff2 files in assets/fonts and update index.html")
    print(f"next: write docs/brief.md and the shots in plan.json, then: python {SKILL / 'scripts' / 'plan.py'} films/{a.slug}")


if __name__ == "__main__":
    main()
