#!/usr/bin/env python3
"""Review sheets from a video or a frame sequence, for Claude to read.

    python review.py out/draft.mp4                     # contact sheet (6x5) + phone test (5x3 at 360 px)
    python review.py out/draft.mp4 --strip 12.1        # 12 consecutive frames from 12.1 s (fast motion, sync)
    python review.py out/draft.mp4 --at 3.2,9.8        # full-size stills at those times
    python review.py "prep/frames_480/f%04d.png" --fps 24 --start-number 1   # a Blender sequence
    python review.py out/final.mp4 --sheet --poster 22.5 --out out          # what build.py sheet runs

Writes into --out (default: a review/ folder next to the input) and prints every image path and the
film time of each tile.
"""
import argparse
import glob
import re
import subprocess
import sys
from pathlib import Path

from common import ffprobe_duration


def ff(args):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit("ffmpeg failed:\n" + (p.stderr or "")[-1500:])


def source(path, fps, start_number):
    """ffmpeg input args, duration and frame count for a video or a printf frame pattern."""
    if "%" in path:
        pat = re.sub(r"%0?(\d*)d", lambda m: "?" * int(m.group(1) or 1) if m.group(1) else "*", path)
        n = len(glob.glob(pat))
        if not n:
            sys.exit(f"no frames match {path}")
        return ["-framerate", str(fps), "-start_number", str(start_number), "-i", path], n / fps, n
    d = ffprobe_duration(path)
    if not d:
        sys.exit(f"can't read {path}")
    return ["-i", path], d, round(d * fps)


def tiles(inp, n_frames, fps, count, cols, width, out, pad=6):
    picks = [min(n_frames - 1, int((k + 0.5) * n_frames / count)) for k in range(count)]
    sel = "+".join(f"eq(n\\,{p})" for p in picks)
    rows = (count + cols - 1) // cols
    ff([*inp, "-vf", f"select='{sel}',scale={width}:-2,tile={cols}x{rows}:padding={pad}:color=0x202020",
        "-fps_mode", "vfr", "-frames:v", "1", str(out)])
    return [round(p / fps, 2) for p in picks]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--fps", type=float, default=0, help="frame rate (read from the video when omitted; needed for sequences)")
    ap.add_argument("--start-number", type=int, default=1)
    ap.add_argument("--out")
    ap.add_argument("--sheet", action="store_true", help="the delivery contact sheet (4x3 at 640 px)")
    ap.add_argument("--poster", type=float, help="write poster.png at this time (s)")
    ap.add_argument("--strip", help="comma-separated times: 12 consecutive frames from each")
    ap.add_argument("--at", help="comma-separated times: one full-size still each")
    a = ap.parse_args()

    path = a.input
    fps = a.fps
    if not fps and "%" not in path:
        p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                            "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
        num, _, den = (p.stdout.strip() or "24/1").partition("/")
        fps = float(num) / float(den or 1)
    fps = fps or 24
    inp, dur, n = source(path, fps, a.start_number)
    out = Path(a.out) if a.out else Path(path.split("%")[0]).parent / "review"
    out.mkdir(parents=True, exist_ok=True)
    made = []

    if a.sheet or a.poster is not None:
        if a.sheet:
            times = tiles(inp, n, fps, 12, 4, 640, out / "contact.png")
            made.append((out / "contact.png", f"4x3 at {times}"))
        if a.poster is not None:
            ff([*(["-ss", str(a.poster)] if "%" not in path else []), *inp,
                *(["-vf", f"select='eq(n\\,{int(a.poster * fps)})'", "-fps_mode", "vfr"] if "%" in path else []),
                "-frames:v", "1", str(out / "poster.png")])
            made.append((out / "poster.png", f"at {a.poster} s"))
    elif not (a.strip or a.at):
        times = tiles(inp, n, fps, 30, 6, 270, out / "contact.png")
        made.append((out / "contact.png", f"6x5, tile k at {times}"))
        times = tiles(inp, n, fps, 15, 5, 360, out / "phone.png")
        made.append((out / "phone.png", f"5x3 at 360 px, at {times}"))
    for t in (a.strip or "").split(","):
        if t.strip():
            t = float(t)
            f0 = int(t * fps)
            img = out / f"strip_{t:.2f}.png"
            ff([*inp, "-vf", f"select='between(n\\,{f0}\\,{f0 + 11})',scale=320:-2,tile=12x1:padding=4",
                "-fps_mode", "vfr", "-frames:v", "1", str(img)])
            made.append((img, f"frames {f0}-{f0 + 11} ({t:.2f}-{(f0 + 11) / fps:.2f} s)"))
    for t in (a.at or "").split(","):
        if t.strip():
            t = float(t)
            img = out / f"at_{t:.2f}.png"
            ff([*inp, "-vf", f"select='eq(n\\,{int(t * fps)})'", "-fps_mode", "vfr", "-frames:v", "1", str(img)])
            made.append((img, f"{t:.2f} s"))
    print(f"{path}: {dur:.2f} s, {n} frames at {fps:g} fps")
    for img, note in made:
        print(f"  {img}  ({note})")


if __name__ == "__main__":
    main()
