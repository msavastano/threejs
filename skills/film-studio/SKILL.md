---
name: film-studio
description: Make any film with Claude as the director. It asks about the film first, then gives every shot to the maker that does it best (code motion graphics and three.js, Blender 3D with BlenderKit and Poly Haven assets, or Google's Gemini APIs for Nano Banana stills, Gemini Omni / Veo clips, Gemini TTS voice and Lyria music), writes all the code, checks real frames at every gate, and assembles the film in the motion-videos studio. Use when someone says "make a film", "make a short film", "make a movie / trailer / scene / short", "film studio", "/film-studio", or wants a film that mixes 3D, AI footage, voice, music and motion graphics. For a quick title card or loop, claude-video-2 fits better; for a narrated explainer, motion-explainer-vid also works.
---

# Film Studio

You are the director, the editor and the only programmer. You ask about the film, break it into
shots, give each shot to the maker that does it best, write every script, prompt and line of film
code, look at real frames before every decision, and assemble the result. The makers only render.

| Maker | What it makes best | How |
|---|---|---|
| **code** | the edit itself, type, graphics, diagrams, maps, stylized 3D, compositing, transitions, grade | `index.html` + `src/film.js`, rendered by `render.mjs` |
| **Blender** | physically lit 3D: rooms, objects, machines, designed camera moves, long continuous shots | bpy scripts, BlenderKit / Poly Haven assets, EEVEE |
| **Nano Banana** | stills: plates, illustrations, textures, first frames, character references | `tools/image_nanobanana.py` |
| **Gemini Omni / Veo 3.1** | 3–10 s clips of organic life: people, animals, faces, water, fire, weather | `tools/video_veo.py` |
| **Gemini TTS** | narration | `tools/tts_gemini.py` + `tools/align.py` |
| **Lyria 3** | music | `tools/music_lyria.py` + `tools/beats.py` |
| **synth** | sound effects, room tone, bespoke score | `tools/sfx.mjs`, a film's own `audio.py` |

- `$SKILL` is this folder (`~/.claude/skills/film-studio`).
- `$MV` is the studio repo, motion-videos (`github.com/msavastano/motion-videos`; on Mike's PC it
  is `C:\Users\millh\Local Documents\dev\motion-videos`). The doctor prints where it found it.
- `$PY` is `python` on Windows and `python3` elsewhere.
- Every film lives in `$MV/films/<slug>/`. Read `$MV/CLAUDE.md` (house rules) before writing film code.

## The three ideas that make this work

1. **Route by what the shot needs, not by habit.** Exact things go to code. Physical light and a
   controlled camera go to Blender. Organic life goes to generated video. Painted worlds go to
   generated stills moved by code. The code film is always the edit. Details and costs:
   [references/routing.md](references/routing.md).
2. **Spend the cheap thing first.** Words, then stills, then a 960x540 draft, then the final. No
   paid generation and no render over an hour until the person has said yes to the plan.
3. **Everything is a script or a cached spec.** Scenes are rebuilt by `build_scene.py`, generated
   media by their JSON specs (cached by hash, so re-runs only pay for changes), the picture by
   `seek(t)`, the sound by `mix.json`. Nothing is hand-edited, so any change re-flows.

## 0. Preflight

```
$PY $SKILL/scripts/doctor.py            # add --ping to check the Gemini key and models (one free call)
```

It prints which makers are ready here and the one fix for each missing piece. If a maker is
missing, either give that fix or plan around it and say so (a cloud session has no Blender: route
those shots to three.js in code or to generated media). Before the first Blender scene call, also
run the **blender-mcp** skill's preflight.

## 1. Ask about the film

Send the block in [questions.md](questions.md) as ONE message, word for word, leaving out anything
the person already told you. "go" takes every default. Use its follow-ups only when needed. Never
ask anyone to paste an API key into chat.

## 2. Treatment and shot plan

1. Scaffold the film (it refuses to overwrite an existing folder):
   ```
   $PY $SKILL/scripts/new_film.py <slug> --title "Title" --dur 30 --size 1920x1080 --fps 24 [--blender] [--gen] [--vo] [--music]
   ```
   `--blender` adds `blender/` (scene script, asset registry, BlenderKit and render helpers),
   `--gen` adds `shots.json`, `--vo` adds `vo_script.json`, `--music` adds `music_prompt.json`.
2. Write `docs/brief.md`: the brief in numbers (size, length, fps, palette in hex, fonts, the
   one-line takeaway, the ban list, budget). Write a logline and a beat list of 4–8 lines.
3. Fill `plan.json`: one entry per shot with `start`, `end`, `what`, `method` and one line of
   `why` (methods: `code`, `blender`, `image`, `video`, `footage`, joined with `+` for layered
   shots, e.g. `blender+code`). Write the media specs for the shots that need them at the same
   time: `shots.json` (images and clips), `vo_script.json`, `music_prompt.json`.
4. Check the plan:
   ```
   $PY $SKILL/scripts/plan.py films/<slug>
   ```
   It prints the shot table, the paid-generation estimate (each tool's own `--dry-run`; cached
   items are free), render time, and warnings (gaps, unknown ids, over budget). It exits non-zero
   when over budget.
5. **Gate 1, the plan.** Show the logline, the beat list, the table, the cost and the render time.
   Wait for a yes. If the person said to run unattended, go on within budget and write every
   assumption into the film's README under "Choices made unattended".

## 3. Look development: stills before motion

Prove each maker's look with the cheapest frame it can make, then critique it.

- **code**: `node tools/still.mjs --film films/<slug> --w 1920 --h 1080 --t 1.0,6.5 --out films/<slug>/out/still` (from `$MV`).
- **Blender**: build the scene with `blender/build_scene.py` ([references/blender.md](references/blender.md)), check
  it with the MCP `look` tool, then render look-dev stills in the background with `blender/still.py`.
- **Nano Banana**: generate the image set ([references/google-media.md](references/google-media.md));
  use 1K while a prompt is uncertain, 2K for keepers. Read every image before using it.

Score each still with [references/review.md](references/review.md), fix the worst three things,
repeat until every score is 8 or more. **Gate 2, the look.** Show three key stills (one per maker
used) with their scores and wait for a yes.

## 4. Make the parts (order matters)

1. **Voice first** if narrated: the picture locks to the voice. `tts_gemini.py`, then
   `align.py --verify` (or `align_lite.py` offline). Show the words with their count and length
   before voicing when Claude wrote them.
2. **Music**: 3–4 Lyria takes, `beats.py` on each, pick the take whose sections land on the story
   beats, and write down why. Or synthesize a score ([references/sound.md](references/sound.md)).
3. **Generated clips** from the approved stills (`first_frame`, `last_frame`, `refs`). Look at the
   first, middle and last frame of every clip; re-roll only failures (`--only <id> --force`).
4. **Blender animation** in the scene script; render the 480p preview in the background with
   `blender/render_frames.py preview` (never through the MCP: its calls time out after ~2 min).
   Run long jobs with the shell's background option and keep working while they render.
5. **The code film** composes every layer in `src/film.js` using `src/layers.js`
   ([references/assembly.md](references/assembly.md)). Times come from `plan.json`, `vo.json`,
   `beats.json` and Blender frame numbers, never from retyped seconds.
6. **Sound effects** from the film's own event times, then `mix.json` and the mix.

## 5. Draft and critique

```
$PY $SKILL/scripts/build.py films/<slug> draft         # 960x540 with the real mix -> out/draft.mp4
$PY $SKILL/scripts/review.py films/<slug>/out/draft.mp4   # contact sheet + phone test; --strip T for fast moves
```

Open every sheet and look properly, as a harsh senior director, not a proud author. At least three
critique rounds, logged in `docs/review_log.md` with scores and timestamps; fix the worst three
problems each round and re-render only the affected seconds (`--start/--dur`). **Gate 3, the
draft.** Send the draft video with one line on what changed since the stills. This is the cheapest
moment for the person to change pacing, framing or mood.

## 6. Final

1. Blender final frames in the background (time 3 frames at final settings first, put the real
   s/frame into `plan.json`, re-run `plan.py`). Overnight is fine inside the person's render budget.
2. `$PY $SKILL/scripts/build.py films/<slug> final` (parallel slices, then the mix), then
   `build.py films/<slug> sheet` for `out/contact.png` and `out/poster.png`.
3. Check: duration, loudness (the mix step prints it), a determinism check on one second of the
   code film, and the final contact sheet with your own eyes.

## 7. Deliver

1. Fill the film's `README.md` (the template has the sections): the film by time, how each maker
   was used and why, rebuild steps, generation cost, assets and credits, choices made unattended,
   what you would improve next.
2. Keep big regenerables out of git (`new_film.py` added a `.gitignore` block: `.blend` files,
   frame renders, decoded audio). Commit the scripts, specs, generated media (small, so a fresh
   clone never pays again) and `out/final.mp4`, `out/poster.png`, `out/contact.png`.
3. Branch, commit, push, open a draft PR in motion-videos. Send the final video, poster and
   contact sheet with the PR link.
4. Save anything new you learned about a maker (a gotcha, a timing, a price) to memory, so the
   next film starts from it.

## Hard rules

- API keys live in `$MV/.env` or the cloud environment's network secret. Never ask for, print, log
  or commit one.
- No paid generation before Gate 1's yes, never over the budget, and always `--dry-run` first.
- Text, numbers, logos and UI are always drawn in code, never generated inside an image or clip.
- Real people, brands and products appear only from material the person supplied.
- Never render or run anything long through `execute_blender_code`. Save the .blend and render
  with `blender -b ... --python` in the background.
- Every film is a pure function of time: `window.seek(t)` paints frame t. Seeded noise only.
- Never say something looks right, passed or is done without looking at the frame or running the check.
- Credit every CC-BY asset and every BlenderKit author in the README.

## Files

- `questions.md`: the intake questions and follow-ups (edit freely).
- `references/`: `routing.md` (which maker for which shot, costs, hybrid patterns), `blender.md`,
  `google-media.md`, `assembly.md` (the code film), `sound.md`, `review.md` (gates and critique).
- `scripts/`: `doctor.py`, `new_film.py`, `plan.py`, `build.py`, `mix.py`, `review.py`, `install.py`.
- `blender/`: `bk.py` (free BlenderKit search and download, no login), `assets.py` (append assets,
  cap textures, measure), `render_frames.py` (resumable background renders), `still.py`.
- `templates/`: what `new_film.py` copies into a new film.
