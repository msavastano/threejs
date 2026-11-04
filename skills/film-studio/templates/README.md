# {{TITLE}}

One or two sentences: what the film is and how it feels. {{DUR}} s, {{W}}x{{H}}, {{FPS}} fps.

**Deliverables** (`out/`): `final.mp4`, `poster.png`, `contact.png`.

## The film

| time | picture | sound |
| --- | --- | --- |
| 0.0 – | | |

## How it was made

One line per maker used, and why it got those shots (see `plan.json` for the full shot table).

- **code**:
- **Blender**:
- **Nano Banana / Gemini Omni / Veo**:
- **Voice, music, effects**:

## Rebuild

```
cd films/{{SLUG}}
# paid generation (cached: re-runs only pay for changes). Key: GEMINI_API_KEY in ../../.env
# Blender (local): blender -b --python blender/build_scene.py -- blender/scene.blend, then blender/render_frames.py
python prep.py            # if present: clip frames, cut-outs, decoded audio
python ~/.claude/skills/film-studio/scripts/build.py . draft   # or final, then sheet
```

## Generation cost

What was spent on images, clips, voice and music (list prices), including tests.

## Assets and credits

| asset | author | source and licence |
| --- | --- | --- |

Generated images, clips, voice and music carry Google's invisible SynthID watermark.

## Choices made unattended

## What I'd improve next
