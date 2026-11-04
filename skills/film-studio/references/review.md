# Gates and critique

Nothing reaches the person before at least one critique round. Look at real frames, never at code.

## The gates

| Gate | Show | Wait for |
|---|---|---|
| 1. Plan | logline, beat list, `plan.py` table, cost, render time | yes before any paid call or long render |
| 2. Look | 3 key stills (one per maker), with scores | yes before animating everything |
| 3. Draft | the 960x540 draft with the real sound | notes or yes before the final |

Unattended runs skip the waiting, never the critique.

## Making the sheets

```
$PY $SKILL/scripts/review.py films/<slug>/out/draft.mp4                 # contact sheet (6x5) + phone test (5x3 at 360 px)
$PY $SKILL/scripts/review.py films/<slug>/out/draft.mp4 --strip 12.1    # 12 consecutive frames from 12.1 s
$PY $SKILL/scripts/review.py films/<slug>/out/draft.mp4 --at 3.2,9.8    # full-size stills
$PY $SKILL/scripts/review.py "films/<slug>/prep/frames_480/f%04d.png" --fps 24   # a Blender frame sequence
```

It prints each image path and the film time of every tile. Read every image.

## Scoring (1–10, as a harsh senior director)

- **Hook**: is the first 2 s the most striking image or question?
- **Clarity**: could a viewer say what it was about and how it felt?
- **Composition**: one clear subject per frame, room for text, nothing important at the edges.
- **Light and material** (3D and generated shots): does it feel lit by one world?
- **Motion**: springs and eases, no linear slides on things the eye follows, no dead seconds;
  something new every 2–4 s.
- **Continuity across makers**: palette, light direction, lens and grade match; cuts feel like
  one film, not a reel of different tools.
- **Type**: readable at 360 px wide; holds long enough; one display face, one UI face.
- **Sound sync**: hits within a frame of their visual; voice clear over music.
- **Technical**: no flicker, fireflies, texture pops, banding, aliasing on fine lines, morphing
  hands, melting objects, garbled text, sudden cuts inside a clip.

Log every round in `docs/review_log.md`: the scores, the three worst problems with timestamps, and
the fix. Fix those three, re-render only the affected seconds (`render.mjs --start --dur`, or a
Blender frame range), and score again. Stop when every score is 8 or more.

## What to hunt for, by maker

- **code**: text overlapping during swaps, things scaling up from zero, everything fading in,
  centered titles on gradients, corner labels, blurry scaled text.
- **Blender**: noise in the volumes, shadow acne, light leaking through walls, objects floating
  above surfaces (check contact shadows), wrong real-world scale, mirror-like glass, motion-blur
  streaks, a camera move that is linear or stops dead.
- **generated stills**: extra fingers, warped architecture, inconsistent identity between images,
  text-like scribbles, a style that drifts across the set.
- **generated clips**: morphing, melting, sudden cuts, the subject leaving frame, camera moves that
  fight the cut before or after, colour that doesn't match its neighbours.
- **sound**: hits off the picture, music fighting narration, a loudness jump at a cut, clipping.
