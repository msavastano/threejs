#!/usr/bin/env python3
"""Check a film's plan and print the table to show at Gate 1: shots, makers, cost, render time.

    python plan.py films/<slug>          # or just the slug, from anywhere
    python plan.py films/<slug> --json

plan.json
{
  "title": "...", "duration": 30, "fps": 24, "width": 1920, "height": 1080,
  "budget_usd": 5, "render_hours": 8, "picture": "code",          // or "frames" (one Blender shot, encoded directly)
  "shots": [
    {"id": "s01", "start": 0, "end": 4, "what": "...", "method": "code", "why": "..."},
    {"id": "s02", "start": 4, "end": 12, "what": "...", "method": "blender+code", "why": "...",
     "blender": {"frames": [1, 192], "s_per_frame": 17, "preview_s_per_frame": 8}},
    {"id": "s03", "start": 12, "end": 18, "what": "...", "method": "video", "clips": ["c01"], "images": ["c01_first"]},
    {"id": "s04", "start": 18, "end": 30, "what": "...", "method": "image", "images": ["plate"]}
  ]
}
Methods: code, blender, image, video, footage; join layers with "+".

Paid estimates come from each tool's own --dry-run (so cached items cost nothing), run from the
film folder. Exit code 2 when the estimate is over budget_usd, 1 on errors in the plan.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from common import film_dir, find_mv, load_plan

METHODS = {"code", "blender", "image", "video", "footage"}
DEFAULT_S_PER_FRAME = {"final": 17.0, "preview": 8.0}   # GTX 1050, EEVEE, 1080p/12 and 480p/8 samples
CODE_S_PER_CAPTURE = 0.08                              # rough; measure a 1 s slice for a real number


def dry_run(mv, film, tool, args):
    try:
        p = subprocess.run([sys.executable, str(mv / "tools" / tool), *args, "--dry-run"], cwd=film,
                           capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"error": str(e)}
    out = (p.stdout or "") + (p.stderr or "")
    if p.returncode != 0:
        lines = [l for l in out.splitlines() if l.strip()]
        return {"error": lines[-1] if lines else f"exit {p.returncode}"}
    summary = next((l for l in out.splitlines() if re.search(r"\d+ (image|clip|segment|take)", l)), out.strip()[:120])
    cost = re.search(r"about \$(\d+(?:\.\d+)?)", summary)
    return {"summary": summary.strip(), "usd": float(cost.group(1)) if cost else 0.0}


def hms(sec):
    sec = int(round(sec))
    return f"{sec // 3600}h{sec % 3600 // 60:02d}m" if sec >= 3600 else f"{sec // 60}m{sec % 60:02d}s"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    film = film_dir(a.film)
    mv = find_mv(film)
    plan = load_plan(film)
    errors, warns = [], []
    dur, fps = float(plan.get("duration", 0)), int(plan.get("fps", 24))
    shots = plan.get("shots", [])
    if not shots:
        errors.append("plan has no shots")

    specs = {}
    for name in ("shots.json", "vo_script.json", "music_prompt.json"):
        p = film / name
        if p.is_file():
            try:
                specs[name] = json.loads(p.read_text(encoding="utf-8-sig"))
            except json.JSONDecodeError as e:
                errors.append(f"{name}: {e}")
    image_ids = {i["id"] for i in specs.get("shots.json", {}).get("images", [])}
    clip_ids = {c["id"] for c in specs.get("shots.json", {}).get("clips", [])}

    seen, t = set(), 0.0
    blender_frames = {"final": 0.0, "preview": 0.0}
    rows = []
    for s in sorted(shots, key=lambda s: s.get("start", 0)):
        sid = s.get("id", "?")
        if sid in seen:
            errors.append(f"{sid}: duplicate id")
        seen.add(sid)
        st, en = float(s.get("start", 0)), float(s.get("end", 0))
        if en <= st:
            errors.append(f"{sid}: end must be after start")
        if st > t + 1e-6:
            warns.append(f"gap {t:.2f}-{st:.2f} s before {sid}")
        elif st < t - 1e-6:
            warns.append(f"{sid} overlaps the shot before it by {t - st:.2f} s (fine for a planned transition)")
        t = max(t, en)
        methods = [m.strip() for m in str(s.get("method", "")).split("+") if m.strip()]
        bad = [m for m in methods if m not in METHODS]
        if not methods or bad:
            errors.append(f"{sid}: method {s.get('method')!r} (use {', '.join(sorted(METHODS))}, joined with +)")
        if not s.get("what"):
            errors.append(f"{sid}: say what happens in 'what'")
        if not s.get("why"):
            warns.append(f"{sid}: no 'why' for the choice of maker")
        for i in s.get("images", []):
            if i not in image_ids:
                errors.append(f"{sid}: image {i!r} is not in shots.json")
        for c in s.get("clips", []):
            if c not in clip_ids:
                errors.append(f"{sid}: clip {c!r} is not in shots.json")
        if "video" in methods and not s.get("clips"):
            warns.append(f"{sid}: method video but no 'clips' listed")
        if "image" in methods and not s.get("images"):
            warns.append(f"{sid}: method image but no 'images' listed")
        if "blender" in methods:
            b = s.get("blender", {})
            fr = b.get("frames")
            n = (fr[1] - fr[0] + 1) if fr else round((en - st) * fps)
            blender_frames["final"] += n * float(b.get("s_per_frame", DEFAULT_S_PER_FRAME["final"]))
            blender_frames["preview"] += n * float(b.get("preview_s_per_frame", DEFAULT_S_PER_FRAME["preview"]))
        rows.append({"id": sid, "time": f"{st:.1f}-{en:.1f}", "len": round(en - st, 2),
                     "method": "+".join(methods), "what": s.get("what", ""), "why": s.get("why", "")})
    if dur and abs(t - dur) > 1e-6:
        warns.append(f"shots end at {t:.2f} s but duration is {dur:.2f} s")
    if plan.get("picture") == "frames" and not plan.get("frames"):
        errors.append('picture is "frames" but plan has no "frames" patterns')

    paid = []
    if mv and "shots.json" in specs:
        if specs["shots.json"].get("images"):
            paid.append(("images", dry_run(mv, film, "image_nanobanana.py", ["shots.json", "--out-dir", "assets/gen/images"])))
        if specs["shots.json"].get("clips"):
            paid.append(("clips", dry_run(mv, film, "video_veo.py", ["shots.json", "--out-dir", "assets/gen/video",
                                                                     "--images-dir", "assets/gen/images"])))
    if mv and specs.get("vo_script.json", {}).get("segments"):
        paid.append(("voice", dry_run(mv, film, "tts_gemini.py", ["vo_script.json"])))
    if mv and specs.get("music_prompt.json", {}).get("takes"):
        paid.append(("music", dry_run(mv, film, "music_lyria.py", ["music_prompt.json"])))
    for kind, r in paid:
        if "error" in r:
            errors.append(f"{kind} dry run: {r['error']}")
    usd = sum(r.get("usd", 0.0) for _, r in paid)
    budget = float(plan.get("budget_usd", 0))
    if usd > budget + 1e-9:
        errors.append(f"estimated ${usd:.2f} is over the ${budget:.2f} budget")

    code_s = 0.0
    if plan.get("picture", "code") == "code":
        code_s = dur * fps * int(plan.get("sub", 1)) * CODE_S_PER_CAPTURE
    render_s = blender_frames["final"] + blender_frames["preview"] + code_s
    hours = float(plan.get("render_hours", 0))
    if hours and render_s > hours * 3600:
        warns.append(f"render time {hms(render_s)} is over the {hours:g} h render budget")

    report = {"title": plan.get("title"), "duration": dur, "fps": fps, "size": [plan.get("width"), plan.get("height")],
              "shots": rows, "paid": [{"kind": k, **r} for k, r in paid], "usd": round(usd, 2), "budget_usd": budget,
              "render": {"blender_final_s": blender_frames["final"], "blender_preview_s": blender_frames["preview"],
                         "code_s": round(code_s)}, "errors": errors, "warnings": warns}
    if a.json:
        print(json.dumps(report, indent=1))
    else:
        print(f"## {plan.get('title')}: {dur:g} s, {plan.get('width')}x{plan.get('height')}, {fps} fps\n")
        print("| shot | time (s) | maker | what happens | why this maker |")
        print("|---|---|---|---|---|")
        for r in rows:
            print(f"| {r['id']} | {r['time']} | {r['method']} | {r['what']} | {r['why']} |")
        print()
        if paid:
            for k, r in paid:
                print(f"- {k}: {r.get('summary') or r.get('error')}")
        print(f"- **paid generation: about ${usd:.2f}** of the ${budget:.2f} budget"
              + ("" if paid else " (nothing to generate)") + "; voice and music takes are a few cents each")
        parts = []
        if blender_frames["final"]:
            parts.append(f"Blender preview {hms(blender_frames['preview'])} + final {hms(blender_frames['final'])}")
        if code_s:
            parts.append(f"code film about {hms(code_s)} (rough)")
        if parts:
            print(f"- **render time**: {'; '.join(parts)} (budget {hours:g} h)")
        for w in warns:
            print(f"- warning: {w}")
        for e in errors:
            print(f"- ERROR: {e}")
    sys.exit(1 if any(not e.startswith("estimated $") for e in errors) else 2 if errors else 0)


if __name__ == "__main__":
    main()
