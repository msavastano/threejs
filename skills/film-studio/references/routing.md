# Routing: which maker makes each shot

Decide per shot, and per layer inside a shot. Ask what the shot NEEDS, then take the first row
that fits. When two fit, take the cheaper and more controllable one.

| The shot needs | Maker | Why it wins | Watch out for |
|---|---|---|---|
| Text, titles, numbers, labels, diagrams, maps, charts, UI | **code** | exact, free, re-timable to the frame | nothing generated may carry text |
| Abstract motion design, shaders, particles, stylized or low-poly 3D, glass and neon looks | **code** (canvas 2D, WebGL, three.js) | instant iteration, deterministic, free | heavy WebGL slows capture: use `--img jpeg` |
| A real-feeling object or room lit by real light; a designed camera move; mechanisms that must move correctly; the same object from many angles; one continuous shot longer than 10 s | **Blender** | physically based light, full camera control, thousands of free assets | render time (see costs), texture VRAM, local only |
| A custom hero object that no asset library has | **Blender** with `generate_3d` (one object from a prompt or a Nano Banana image; costs a credit, ask first), or modelled in bpy when it is simple | | one object per generation, arbitrary scale |
| People, animals, faces, hands, crowds, water, fire, smoke, weather, foliage in wind: organic life, a filmed look | **Gemini Omni / Veo clip**, started from a Nano Banana first frame | hard or impossible in 3D on this machine | 3–10 s per clip, no frame-exact timing, no text, identity drifts without refs, paid per second |
| A painted, illustrated or photographic world: backgrounds, plates, textures, concept frames | **Nano Banana stills, moved in code** (push-in, parallax layers, masks, light sweeps) | cents per image, a whole set matches through one style string and refs | leave the frame room for graphics; no text in the image |
| The person's own photos and clips | **footage** inside a code design (masks, cards, frames) | free and real | never cover a face; never move or change originals |
| Transitions between makers, the grade, titles, captions, timing | **code** | the compositor owns the edit | |
| Narration | **Gemini TTS**, aligned with `align.py` | cached per line, word timings drive the picture | write numbers as spoken |
| Music | **Lyria 3** takes, measured with `beats.py`; or a procedural score | cents per take | ~30 s clips (`lyria-3-clip-preview`); longer needs `lyria-3-pro-preview`, stitching on downbeats, or a synthesized score |
| Sound effects, room tone, mechanisms, UI blips | **synth** (`tools/sfx.mjs`, the film's `audio.py`) driven by the film's own event times | lands exactly on the picture | a clip's own audio can be the bed for that shot |

Rules of thumb:

1. **Exact goes to code. Physical goes to Blender. Alive goes to generated video. Painted goes to
   generated stills.** The code film is always the edit, even when every shot comes from Blender.
2. **Never generate what must be exact**: text, logos, numbers, a precise camera path, a
   frame-exact action. **Never model what a library already has**: search BlenderKit and Poly
   Haven first. **Never fake physical light in 2D** when the shot is about light.
3. **Keep one world.** Mixing makers works when they share a palette, a light direction, a lens
   and a grade. Write those into `docs/brief.md` and apply one grade in code over everything.
4. **Prefer fewer makers per film.** Each maker adds a look to match and a pipeline to run. Two
   makers plus code is usually plenty for 30 s.

## What it costs (Nov 2026; check the tools' `--dry-run`, prices drift)

| Maker | Cost | Time |
|---|---|---|
| code | free | capture at 1080p is usually seconds per film-second; measure a 1 s slice |
| Blender (Mike's PC: GTX 1050, 3 GB, EEVEE) | free | 480p / 8 samples ~7–10 s per frame; 1080p / 8 ~13 s; 1080p / 12 ~17 s; 1080p / 16 ~34 s; heavy volumes much slower. 30 s at 24 fps = 720 frames, about 3.5 h at 17 s/frame |
| Nano Banana 2.1 | ~$0.034 (1K), ~$0.05 (2K), ~$0.11 (4K) per image | seconds |
| Gemini Omni 1.1 Flash | ~$0.03/s (360p), $0.10/s (720p), $0.15/s (1080p), $0.30/s (4k) | 1–3 min per clip |
| Veo 3.1 | ~$0.40/s; Fast $0.10–0.30/s; Lite $0.05–0.08/s | 1–5 min per clip |
| Gemini TTS, Lyria 3 | a few cents per line or take | seconds |

Test a clip prompt at 360p on Omni (an 8 s test is ~$0.24) before paying for 720p. A new
resolution is a new take, so judge the final take again.

## Hybrid patterns that have worked

- **Blender layer over a 2D code world** (PLEXUS): render Blender with a transparent film,
  export the 2D screen positions of the points graphics must pin to (`world_to_camera_view`, see
  `blender.md`), and draw the 2D layer in code against those tracks.
- **Still, clip, last frame, next still** (LAMINA): image A becomes clip A's first frame; clip A's
  last frame (`ffmpeg -sseof -0.05 -i a.mp4 -frames:v 1 a_last.png`) becomes the reference for
  image B. The world continues across the cut.
- **Generated cut-outs** (LAMINA): prompt for the subject "on a flat chroma-green background, no
  shadow", key it in a `prep.py`, and animate the cut-out in code as a paper or puppet layer.
- **A single physical shot** (LAST LIGHT): everything in one Blender scene, with the fade, grade
  and grain in the encode step and a synthesized sound bed driven by the scene's own events.
- **Blender layout, generated life**: render a Blender still with the camera and composition you
  want, give it to Omni as `first_frame` with a prompt for one organic motion. Untested here:
  try it at 360p first.
- **Code drives the sound**: export the film's event times (`window.TIMING`, Blender frame
  numbers of impacts and ticks) and synthesize the effects from them, so sound and picture can
  never drift.

## When a maker isn't available

- **No Blender** (cloud sessions): three.js in code for stylized 3D; Nano Banana stills moved in
  code, or Omni clips, for photoreal. Say which shots changed maker.
- **No Gemini key or $0 budget**: code and Blender for picture; `music.py` or a film `score.py`
  for music; `tts_kokoro.py` for an offline voice; `sfx.mjs` for effects.
- **No GPU or a slow one**: keep Blender shots short, render 480p drafts, use EEVEE at 8–12
  samples, and put long shots in code or generated video.
