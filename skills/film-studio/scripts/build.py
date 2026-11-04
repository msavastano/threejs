#!/usr/bin/env python3
"""Build a film: sound, picture, and review sheets.

    python build.py films/<slug> audio     # the plan's prebuild steps, then mix.py -> out/mix.wav
    python build.py films/<slug> draft     # audio + a draft picture (long side 960)  -> out/draft.mp4
    python build.py films/<slug> final     # audio + full size, parallel slices         -> out/final.mp4
    python build.py films/<slug> sheet     # contact sheet + poster from out/final.mp4  -> out/contact.png, out/poster.png

Options: --jobs N (final slices, default 3)   --sub N (sub-frames of motion blur; default plan "sub" or 1)
         --img jpeg|png (capture format, default jpeg)   --start S --dur D (render only a slice, draft)
         --no-audio (skip the sound steps and mux nothing)

Picture: plan "picture": "code" renders index.html with render.mjs (the draft URL gets ?draft=1);
"frames" encodes plan "frames" {"draft", "final", "start_number"} (a Blender PNG sequence) with
plan "grade_vf". Sound: the commands in plan "prebuild" (run in the film folder), then mix.py on
mix.json when it has stems. If Playwright's own Chromium is missing, CHROME_BIN is set to another
Playwright Chromium on this machine.
"""
import argparse
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path

from common import SKILL, film_dir, find_chrome, find_mv, load_plan


def sh(cmd, cwd, **kw):
    print("$ " + " ".join(shlex.quote(str(c)) for c in cmd), flush=True)
    p = subprocess.run([str(c) for c in cmd], cwd=cwd, **kw)
    if p.returncode != 0:
        sys.exit(f"failed ({p.returncode}): {cmd[0]}")


def even(x):
    return int(round(x / 2)) * 2


def audio(film, plan):
    for cmd in plan.get("prebuild", []):
        print(f"$ {cmd}", flush=True)
        if subprocess.run(cmd, cwd=film, shell=True).returncode != 0:
            sys.exit(f"prebuild step failed: {cmd}")
    mix = film / "mix.json"
    if mix.is_file():
        import json
        if json.loads(mix.read_text(encoding="utf-8-sig")).get("stems"):
            sh([sys.executable, SKILL / "scripts" / "mix.py", mix], film)
            return film / json.loads(mix.read_text(encoding="utf-8-sig")).get("out", "out/mix.wav")
    print("no mix.json stems: the picture goes out silent")
    return None


def render_code(mv, film, plan, mode, a, out):
    rel = film.relative_to(mv).as_posix()
    W, H, fps, dur = int(plan["width"]), int(plan["height"]), int(plan["fps"]), float(plan["duration"])
    sub = a.sub or int(plan.get("sub", 1))
    env = dict(os.environ)
    chrome, how = find_chrome(mv)
    if how == "fallback":
        env["CHROME_BIN"] = chrome
        print(f"note: Playwright's Chromium is missing; using {chrome}")
    base = ["node", "render.mjs", "--film", rel, "--fps", fps, "--sub", sub, "--img", a.img]
    if mode == "draft":
        s = 960 / max(W, H)
        start = a.start or 0
        d = a.dur or (dur - start)
        sh(base + ["--start", start, "--dur", d, "--w", even(W * s), "--h", even(H * s), "--query", "draft=1", "--out", out], mv, env=env)
        return
    F, n = round(dur * fps), max(1, a.jobs)
    parts, procs = [], []
    t0 = time.time()
    for k in range(n):
        f0, f1 = F * k // n, F * (k + 1) // n
        part = out.with_name(f"part_{k}.mp4")
        log = open(out.with_name(f"part_{k}.log"), "w")
        cmd = [str(c) for c in base + ["--start", f0 / fps, "--dur", (f1 - f0) / fps, "--w", W, "--h", H, "--out", part]]
        procs.append((subprocess.Popen(cmd, cwd=mv, env=env, stdout=log, stderr=subprocess.STDOUT), log, k))
        parts.append(part)
    print(f"rendering {F} frames in {n} slices (logs: out/part_*.log)", flush=True)
    for p, log, k in procs:
        if p.wait() != 0:
            sys.exit(f"slice {k} failed: see {out.with_name(f'part_{k}.log')}")
        log.close()
    lst = out.with_name("parts.txt")
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    sh(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out], film)
    for p in parts + [lst] + [out.with_name(f"part_{k}.log") for k in range(n)]:
        p.unlink(missing_ok=True)
    print(f"picture rendered in {int(time.time() - t0)} s")


def encode_frames(film, plan, mode, out):
    fr = plan.get("frames") or {}
    pattern = fr.get(mode) or fr.get("final")
    if not pattern:
        sys.exit('plan "frames" needs a "final" (and optionally "draft") pattern like prep/frames_1080/f%04d.png')
    vf = ",".join(v for v in (plan.get("grade_vf", ""), "format=yuv420p") if v)
    sh(["ffmpeg", "-loglevel", "error", "-y", "-framerate", plan["fps"], "-start_number", fr.get("start_number", 1),
        "-i", pattern, "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", 16 if mode == "final" else 20, out], film)


def mux(film, silent, mix, out, mode, dur):
    if mix and mix.is_file():
        v = ["-c:v", "copy"] if mode == "draft" else ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p"]
        sh(["ffmpeg", "-loglevel", "error", "-y", "-i", silent, "-i", mix, *v, "-c:a", "aac", "-b:a", "192k",
            "-t", dur, "-movflags", "+faststart", out], film)
    else:
        sh(["ffmpeg", "-loglevel", "error", "-y", "-i", silent, "-c", "copy", "-movflags", "+faststart", out], film)
    print(f"wrote {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film")
    ap.add_argument("mode", choices=["audio", "draft", "final", "sheet"])
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--sub", type=int, default=0)
    ap.add_argument("--img", default="jpeg", choices=["jpeg", "png"])
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--dur", type=float, default=0)
    ap.add_argument("--no-audio", action="store_true")
    a = ap.parse_args()

    film = film_dir(a.film)
    mv = find_mv(film)
    if not mv:
        sys.exit("error: this film is not inside the motion-videos studio")
    plan = load_plan(film)
    outd = film / "out"
    outd.mkdir(exist_ok=True)
    dur = float(plan["duration"])

    if a.mode == "sheet":
        src = outd / "final.mp4" if (outd / "final.mp4").is_file() else outd / "draft.mp4"
        sh([sys.executable, SKILL / "scripts" / "review.py", src, "--sheet", "--poster", plan.get("poster", round(dur * 0.75, 2)),
            "--out", outd], film)
        return
    mix = None if a.no_audio else audio(film, plan)
    if a.mode == "audio":
        return
    silent = outd / f"{a.mode}_silent.mp4"
    if plan.get("picture", "code") == "frames":
        encode_frames(film, plan, a.mode, silent)
    else:
        render_code(mv, film, plan, a.mode, a, silent)
    mux(film, silent, mix, outd / f"{a.mode}.mp4", a.mode, a.dur or dur)


if __name__ == "__main__":
    main()
