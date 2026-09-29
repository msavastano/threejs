#!/usr/bin/env python3
"""
Render the reel offline: headless Chromium draws every frame of reel/index.html
(1920x1080, 60 fps, motion-blurred), then ffmpeg muxes them with soundtrack.wav.

    python3 src/render.py                  # full 20 s -> rollercoaster-reel.mp4
    python3 src/render.py --start 0 --end 120 --no-encode
    python3 src/render.py --encode-only

Frames are pure functions of time, so workers render interleaved frames in parallel.
"""
import argparse, asyncio, base64, os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
HTML = os.path.join(HERE, "reel", "index.html")
CHROME = os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium")


def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


async def worker(wid, frames, args, q, stats):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        launch = dict(args=["--no-sandbox", "--allow-file-access-from-files"])
        if os.path.exists(CHROME):
            launch["executable_path"] = CHROME
        b = await p.chromium.launch(**launch)
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        pg.on("pageerror", lambda e: print("PAGEERROR", e, flush=True))
        await pg.goto("file://" + HTML + "?export")
        await pg.wait_for_function("window.READY===true", timeout=30000)
        while True:
            try:
                i = q.get_nowait()
            except asyncio.QueueEmpty:
                break
            t = i / args.fps
            await pg.evaluate(f"renderFrame({t!r})")
            data = await pg.evaluate("frameDataURL('image/png')")
            with open(os.path.join(frames, f"f_{i:05d}.png"), "wb") as f:
                f.write(base64.b64decode(data.split(",", 1)[1]))
            stats["done"] += 1
            if stats["done"] % 30 == 0:
                el = time.time() - stats["t0"]
                rate = stats["done"] / el
                print(f"  {stats['done']}/{stats['total']} frames  {rate:.2f} fps  eta {(stats['total'] - stats['done']) / rate:.0f}s", flush=True)
        await b.close()


async def render_frames(args, frames):
    q = asyncio.Queue()
    todo = [i for i in range(args.start, args.end) if args.force or not os.path.exists(os.path.join(frames, f"f_{i:05d}.png"))]
    for i in todo:
        q.put_nowait(i)
    stats = {"done": 0, "total": len(todo), "t0": time.time()}
    print(f"rendering {len(todo)} frames with {args.workers} workers", flush=True)
    await asyncio.gather(*[worker(w, frames, args, q, stats) for w in range(args.workers)])
    print(f"done in {time.time() - stats['t0']:.0f}s", flush=True)


def encode(args, frames, out):
    wav = os.path.join(ROOT, "soundtrack.wav")
    cmd = [ffmpeg_exe(), "-y", "-framerate", str(args.fps), "-i", os.path.join(frames, "f_%05d.png"), "-i", wav,
           "-map", "0:v", "-map", "1:a",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf), "-profile:v", "high", "-level", "4.2",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", "20", "-movflags", "+faststart", out]
    print(" ".join(cmd), flush=True)
    subprocess.check_call(cmd)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=1200)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--frames", default=os.environ.get("FRAMES_DIR", os.path.join(ROOT, "_frames")))
    ap.add_argument("--out", default=os.path.join(ROOT, "rollercoaster-reel.mp4"))
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--no-encode", action="store_true")
    ap.add_argument("--encode-only", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.frames, exist_ok=True)
    if not a.encode_only:
        asyncio.run(render_frames(a, a.frames))
    if not a.no_encode:
        encode(a, a.frames, a.out)
        print("wrote", a.out, f"{os.path.getsize(a.out) / 1e6:.1f} MB")
