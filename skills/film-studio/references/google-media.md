# The Google makers: stills, clips, voice, music

Four tools in `$MV/tools/`, all on the Gemini API with one key. Read a tool's header before using
it the first time in a session: it is the source of truth for models, fields and limits.

| Tool | Spec file (in the film folder) | Output |
|---|---|---|
| `image_nanobanana.py` | `shots.json` `images` | `assets/gen/images/<id>.jpg` + `<id>.json` |
| `video_veo.py` | `shots.json` `clips` | `assets/gen/video/<id>.mp4` + `<id>.json` |
| `tts_gemini.py` | `vo_script.json` | `audio/vo/<id>.wav`, then `align.py` -> `vo.json`, `audio/vo_track.wav`, `audio/vo.srt` |
| `music_lyria.py` | `music_prompt.json` | `audio/music/<id>.mp3` + `<id>.json` |

Run them from the film folder:

```
$PY ../../tools/image_nanobanana.py shots.json --out-dir assets/gen/images --dry-run      # then without --dry-run
$PY ../../tools/video_veo.py shots.json --out-dir assets/gen/video --images-dir assets/gen/images --dry-run
$PY ../../tools/tts_gemini.py vo_script.json
$PY ../../tools/align.py --verify          # or ../../tools/align_lite.py when WhisperX can't download
$PY ../../tools/music_lyria.py music_prompt.json
$PY ../../tools/beats.py audio/music/take1.mp3 --out beats.json
```

## The key

- Local: `GEMINI_API_KEY=...` in `$MV/.env` (gitignored), from https://aistudio.google.com/apikey.
  Images and video need billing on the key's project.
- Cloud: a network secret on the environment (see `$MV/README.md`, "Gemini API key"); the tools
  send a placeholder and the proxy swaps in the key.
- `$PY $SKILL/scripts/doctor.py --ping` makes one free call (it lists models) and reports which of
  the models the tools use are available. Never print, log, commit or ask for the key in chat.

## Habits for every paid call

- `--dry-run` first and report the estimate. `plan.py` runs these for you.
- Outputs are cached by a hash of their settings (and the bytes of any reference image), so a
  re-run only pays for what changed. Re-roll one item with `--only <id> --force`.
- Commit the generated media and their `.json` sidecars, so a fresh clone never pays again.
- Look at every result before it goes in the film: read each image; for each clip extract the
  first, middle and last frame (`ffmpeg -ss T -i c01.mp4 -frames:v 1 prep/look/c01_T.png`) and a strip
  around any fast motion (`review.py --strip`).
- Everything generated carries an invisible SynthID watermark. Say so in the README.
- No text in generated media (it comes out garbled); no real people or brands unless the person
  supplied references they have the rights to.

## Stills (Nano Banana)

- Models: `gemini-nano-banana-2.1` (default), `gemini-3-pro-image` for hard compositions,
  `gemini-3.1-flash-image`. Sizes `1K`, `2K`, `4K` (uppercase K); aspect ratios from 9:16 to 21:9.
- A prompt is: subject and action, framing (lens, angle, distance), light (direction, time of day,
  quality), materials, palette, and **what the frame is for** ("background plate, empty sky on the
  left for the title", "first frame of a slow push-in").
- `style` in `shots.json` is appended to every prompt, so a set matches. Override with `"style": ""`.
- Consistency: make one hero image of each character or object first, then pass it in `refs` (up to
  14) for every other image that shows it. Same for a location.
- Cut-outs: "on a flat chroma-green background, no shadow, no green in the subject", then key it in a
  film `prep.py` (LAMINA has a working keyer with despill).
- 1K while a prompt is still changing; 2K for keepers; 4K only for slow push-ins on a still.

## Clips (Gemini Omni, Veo 3.1)

- `gemini-omni-1.1-flash` (default): 3–10 s, 360p–4k (720p native; 1080p/4k are upscaled), takes
  `first_frame`, `last_frame`, and up to 3 `refs` named in the prompt as `<IMAGE_REF_0>` ...
- `veo-3.1-generate-preview` for the best realism (4, 6 or 8 s; 1080p/4k need 8 s); `-fast-` and
  `-lite-` are cheaper (Lite has no refs and no 4k).
- A prompt is: **the camera, one action, the light**. "Slow push-in; she looks up from the letter
  and smiles; warm window light from the left." Keep framing close to the first frame; big changes
  make the model cut mid-clip.
- Start every clip from an approved still (`first_frame`). Add `last_frame` to land on a planned
  composition (a transition, a match cut). Use `refs` to keep an identity without fixing the frame.
- Plan clip lengths to the shot, and cut the clip in code; don't count on the model's timing.
- Both families add sound. Mute it, or keep it as the shot's bed in `mix.json`.
- Into the code film: `ffmpeg -v error -i assets/gen/video/c01.mp4 -q:v 2 -start_number 0 assets/clip/c01/f%03d.jpg`
  and `ffmpeg -v error -i assets/gen/video/c01.mp4 -vn -ac 2 -ar 48000 audio/c01.wav` (put both in
  the film's `prep.py`; the frames are gitignored and rebuilt).
- Check for: hands and faces morphing, objects melting into each other, sudden cuts, text
  appearing, colour drifting from the neighbouring shots (fix colour in code with a grade).

## Voice (Gemini TTS)

- `gemini-3.8-flash-tts`, voice `Charon` (informative) by default. Others to try: `Kore` (firm),
  `Puck` (upbeat), `Zephyr` (bright), `Enceladus` (breathy), `Aoede` (breezy), `Fenrir` (excitable).
- Text is spoken verbatim: direction goes in `style`, vocal events as `<short pause>`, `<breath>`;
  `[[cue]]` marks the word a visual lands on (stripped before voicing); CAPS for emphasis.
- Budget about 2.5 spoken words per second. Write for the ear: short sentences, numbers as spoken.
- With the person's own words, never change them; solve timing with gaps, pins and pauses.
- `align.py --verify`: each line should verify at 0.97 or better; re-voice a real mismatch with `--only`.

## Music (Lyria 3)

- `lyria-3-clip-preview` makes ~30 s pieces; `lyria-3-pro-preview` for longer.
- Write 3–4 takes of the same brief with different emphasis. Say "Instrumental, no vocals", the
  tempo in BPM, the instruments, and the structure in seconds ("sparse 0–8 s, build 8–20 s, drop at
  20 s, resolve by 28 s").
- Decode, measure (`beats.py`), and choose the take whose sections land on the story beats. Then
  time the picture to the measured grid (`beats.json`), never the other way round.
- Longer than a take allows: Lyria pro, two takes joined on a downbeat with a short crossfade, or
  a synthesized score (`tools/music.py`, or a film `score.py`).
