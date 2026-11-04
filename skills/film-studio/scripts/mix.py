#!/usr/bin/env python3
"""Mix a film's sound from mix.json: place, trim, fade, duck and pan stems, then bring the mix to
the target loudness with one gain and a true-peak limiter (no dynamic loudness riding), measured
and corrected until it is within 0.3 LU.

    python mix.py films/<slug>/mix.json          # paths in mix.json are relative to its folder

mix.json
{
  "duration": 30, "loudness": -14, "true_peak": -1, "out": "out/mix.wav",
  "stems": [
    {"id": "vo", "file": "audio/vo_track.wav", "gain_db": 2},
    {"id": "music", "file": "audio/music/take2.mp3", "gain_db": -3, "fade_out": 1.0, "duck": "vo"},
    {"id": "sfx", "file": "audio/sfx.wav"},
    {"id": "c01", "file": "assets/gen/video/c01.mp4", "at": 12.1, "from": 0, "dur": 4,
     "gain_db": -6, "fade_in": 0.04, "fade_out": 0.2, "pan": -0.3}
  ]
}
  at        where the stem starts on the film clock (s)        from / dur  trim the source (s)
  fade_in / fade_out (s)    gain_db    pan (-1 left .. 1 right)
  duck      the id of a stem this one ducks under (sidechain compression)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from common import ffprobe_duration


def ff(args):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", *args], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit("ffmpeg failed:\n" + (p.stderr or "")[-2000:])
    return p.stderr or ""


def measure(path, target, tp):
    out = ff(["-i", str(path), "-af", f"loudnorm=I={target}:TP={tp}:LRA=11:print_format=json", "-f", "null", "-"])
    return json.loads(re.findall(r"\{[^{}]*\}", out, re.S)[-1])


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    spec_path = Path(sys.argv[1]).resolve()
    base = spec_path.parent
    spec = json.loads(spec_path.read_text(encoding="utf-8-sig"))
    dur = float(spec["duration"])
    target, tp = float(spec.get("loudness", -14)), float(spec.get("true_peak", -1))
    out = base / spec.get("out", "out/mix.wav")
    out.parent.mkdir(parents=True, exist_ok=True)
    stems = [s for s in spec.get("stems", []) if not s.get("mute")]
    if not stems:
        sys.exit("mix.json has no stems")
    ids = [s.get("id", f"st{i}") for i, s in enumerate(stems)]
    for s, i in zip(stems, ids):
        s["id"] = i
        if not (base / s["file"]).is_file():
            sys.exit(f"stem {i}: file not found: {s['file']}")
    keys = {}
    for s in stems:
        if s.get("duck"):
            if s["duck"] not in ids:
                sys.exit(f"stem {s['id']}: ducks under unknown stem {s['duck']!r}")
            keys[s["duck"]] = keys.get(s["duck"], 0) + 1

    inputs, chains = [], []
    for n, s in enumerate(stems):
        inputs += ["-i", str(base / s["file"])]
        src = ffprobe_duration(base / s["file"]) or dur
        start = float(s.get("from", 0))
        length = float(s.get("dur", max(0.0, src - start)))
        length = min(length, max(0.0, src - start))
        f = [f"[{n}:a]aresample=48000", "aformat=channel_layouts=stereo",
             f"atrim=start={start}:duration={length}", "asetpts=PTS-STARTPTS"]
        if s.get("fade_in"):
            f.append(f"afade=t=in:st=0:d={s['fade_in']}")
        if s.get("fade_out"):
            f.append(f"afade=t=out:st={max(0.0, length - float(s['fade_out']))}:d={s['fade_out']}")
        if s.get("gain_db"):
            f.append(f"volume={s['gain_db']}dB")
        if s.get("pan"):
            p = max(-1.0, min(1.0, float(s["pan"])))
            f.append(f"pan=stereo|c0={1 - max(0, p):.3f}*c0|c1={1 + min(0, p):.3f}*c1")
        at = int(round(float(s.get("at", 0)) * 1000))
        if at:
            f.append(f"adelay={at}|{at}")
        f.append(f"apad=whole_dur={dur},atrim=0:{dur}")
        uses = keys.get(s["id"], 0)
        if uses:
            outs = "".join(f"[{s['id']}_k{k}]" for k in range(uses))
            chains.append(",".join(f) + f",asplit={uses + 1}[{s['id']}]{outs}")
        else:
            chains.append(",".join(f) + f"[{s['id']}]")
    used = {}
    finals = []
    for s in stems:
        if s.get("duck"):
            k = used.get(s["duck"], 0)
            used[s["duck"]] = k + 1
            chains.append(f"[{s['id']}][{s['duck']}_k{k}]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[{s['id']}_d]")
            finals.append(f"[{s['id']}_d]")
        else:
            finals.append(f"[{s['id']}]")
    chains.append("".join(finals) + f"amix=inputs={len(finals)}:normalize=0,highpass=f=28,atrim=0:{dur}[mix]")

    premix = out.with_name(out.stem + "_premix.wav")
    ff(["-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chains), "-map", "[mix]", "-ar", "48000", str(premix)])
    gain = target - float(measure(premix, target, tp)["input_i"])
    ceiling = 10 ** ((tp - 1.0) / 20)  # sample-peak ceiling 1 dB under the true-peak target (inter-sample overs)
    for _ in range(3):
        ff(["-y", "-loglevel", "error", "-i", str(premix), "-af",
            f"volume={gain:.2f}dB,alimiter=limit={ceiling:.4f}:attack=2:release=60:level=disabled", "-ar", "48000", str(out)])
        m = measure(out, target, tp)
        err = target - float(m["input_i"])
        if abs(err) <= 0.3:
            break
        gain += err
    premix.unlink(missing_ok=True)
    print(f"wrote {out}: {float(m['input_i']):.1f} LUFS, true peak {float(m['input_tp']):.1f} dBTP, "
          f"gain {gain:+.1f} dB, {len(stems)} stems, {dur:g} s")
    if gain > 12:
        print("note: the mix needed more than 12 dB of gain, so the limiter is working hard; "
              "raise the stems' gain_db or lower the target if it sounds squashed")


if __name__ == "__main__":
    main()