# The code film: the edit that holds everything

Every film's picture is assembled by `films/<slug>/index.html`, which `render.mjs` opens in
headless Chromium and captures frame by frame. Blender frames, generated stills and clips, the
person's footage and all graphics are layers drawn by `src/film.js`.

The one exception: a film that is a single Blender shot can skip the code film. Set `"picture":
"frames"` in `plan.json` and `build.py` encodes the frame sequence directly (with `grade_vf` for
the fades, vignette and grain).

## The contract (house rules in `$MV/CLAUDE.md`)

- `window.seek(t)` paints frame `t` from scratch and may be async (await the images it needs).
  Nothing carries between frames: no state, no CSS transitions, no timers, no `Math.random`
  (use `mulberry32` from `lib/motion.js`), no `Date.now`.
- `window.__ready = true` once fonts and data are loaded and frame 0 is drawn.
- No network at render time: fonts are woff2 files in `assets/fonts/` (from Fontsource, with
  their OFL licence next to them), declared in `index.html` and loaded with `document.fonts.load`.
- A live preview loop runs only when `!navigator.webdriver` (Playwright sets it).
- Draw in design pixels (the plan's `width` x `height`) under one scale `K = W / DESIGN_W`, so
  the 960x540 draft and the 1080p final are the same picture.
- `build.py draft` adds `?draft=1` to the URL: use it to read lighter sources (480p Blender
  frames) in drafts.

## Layout of a film folder

```
plan.json            shots, times, methods, budget, picture source      (step 2)
docs/brief.md        brief in numbers;  docs/review_log.md  critique rounds
shots.json           Nano Banana images and Omni/Veo clips              (--gen)
vo_script.json       narration                                          (--vo)
music_prompt.json    Lyria takes                                        (--music)
blender/             build_scene.py, assets.json, bk.py, assets.py, render_frames.py, still.py   (--blender)
prep.py              turns generated media into what the film loads (clip frames, keyed cut-outs, decoded audio)
index.html, src/film.js, src/layers.js
mix.json             the sound mix
assets/  audio/  prep/ (regenerable, gitignored)  out/ (deliverables)
```

## `src/layers.js`

| Helper | Use |
|---|---|
| `getJSON(url)`, `loadImage(url)` | load data and stills at boot |
| `sequence({url, count, fps, start, first})` | an image sequence on the film clock: `await seq.at(t)` returns the frame for time `t` (Blender renders, clip frames). Caches a few frames, prefetches ahead in the live preview |
| `cover(ctx, img, x, y, w, h, {zoom, fx, fy})` | draw like `object-fit: cover`, zoomed about a focus point |
| `kenBurns(ctx, img, t, t0, t1, rect, {z0, z1, from, to})` | a slow push and drift on a still |
| `keyed(t, [[t, v], ...])`, `win(t, a, b)`, `smooth`, `easeInOut`, `lerp` | eased values over time |
| `spring`, `track`, `SPRINGS` | closed-form springs from `lib/motion.js` (no restarting springs) |
| `dip(ctx, W, H, a)` | a black overlay for fades |
| `vignette(ctx, W, H, s)`, `grain(ctx, W, H, t, fps, amount)` | the shared grade (grain is seeded per frame) |
| `pad(n, width)` | frame numbers in file names |

## Bringing each maker in

- **Blender frames**: `prep/frames_1080/f0001.png ...` (and `prep/frames_480/` for drafts).
  `sequence({ url: i => \`prep/frames_${draft ? 480 : 1080}/f${pad(i + 1)}.png\`, count, fps, start: shot.start })`.
  For layered shots render with `--transparent` and draw the code world underneath.
- **Generated clips**: extract to JPEG frames in `prep.py` (see google-media.md) and play them with
  `sequence()`. Clips are 24 fps; on a 30 or 60 fps film, `sequence` holds each frame correctly.
  Grade them toward the neighbouring shots with `ctx.filter` (`saturate()`, `contrast()`,
  `sepia()`) or a colour overlay in `multiply`/`soft-light`, then the shared grade.
- **Generated stills**: `kenBurns` for a camera move; split a still into layers (keyed cut-outs) for
  parallax; mask reveals and light sweeps with gradients.
- **The person's footage**: same as clips. Never draw over a face.
- **Type and graphics**: one display face, one UI face, one accent colour; text holds for at least
  (words / 3) + 0.5 s; no centered title on a gradient, no everything-fades-in, no corner labels.

## Time comes from data

- Shot boundaries: `plan.json` (`shot.start`, `shot.end`), loaded at boot.
- Narration: `vo.json` (segment starts and ends, word times, `cues`). Visual beats key off cues,
  so re-voicing a line re-times the film.
- Music: `beats.json` (`beats`, `downbeats`, `hits`). Cuts and hits land on the grid.
- Blender: frame numbers in the scene script; film time = shot start + (frame - 1) / fps.
- Expose the resolved times as `window.TIMING` so a cue script can write `sfx_cues.json` from them.

## Rendering

From `$MV`:

```
node render.mjs --film films/<slug> --fps 24 --sub 1 --img jpeg --start 0 --dur 30 --w 960 --h 540 --out films/<slug>/out/draft_silent.mp4
node tools/still.mjs --film films/<slug> --w 1920 --h 1080 --t 2.0,7.5 --out films/<slug>/out/still
```

`build.py` wraps these (draft, parallel final slices, mux, sheets). `--sub 4` adds real sub-frame
motion blur for code-drawn motion; keep `--sub 1` when the picture is mostly Blender or clip frames
(blending identical frames only costs time).

**Determinism check** before the final: render the same one-second slice twice and compare hashes
(`certutil -hashfile a.mp4 SHA256` on Windows, `sha256sum` elsewhere). They must match.
