# Sound

Sound is planned with the picture, not added at the end. Order: voice, then music, then effects,
then the mix.

## Voice

See google-media.md (Gemini TTS). The picture locks to `vo.json`. Offline or with no key:
`tools/tts_kokoro.py`.

## Music

- **Lyria takes** (google-media.md): measure every take with `beats.py`, choose by structure, and
  time the cuts to `beats.json`.
- **Synthesized score**: `tools/music.py` (procedural), or a film's own `score.py` when the music
  has to follow the picture exactly (DYSON SPHERE and OUT OF FRAME did this). Write `beats.json`
  straight from the chosen BPM: `beats.py --bpm 96 --dur 30`.
- **None**: a mood piece can live on sound design alone (LAST LIGHT: ticks, room tone, birds, one
  low swell at the turn).
- The score changes at act breaks (instruments, density or tempo). Under narration keep it sparse,
  and let the mix duck it.

## Effects

- `tools/sfx.mjs cues.json out.wav [dur]` synthesizes seeded effects at given times. Types: click,
  pop, thump, whoosh, tick, riser, crack, stamp, chirp, scratch, rewind, clank, key, carriage, bell,
  strike, ding, pencil, blip, paper, tear (read its header for options like `gain`, `dur`, `len`).
- Drive cues from the film's own times (`window.TIMING`, Blender frame numbers of impacts and
  ticks, `vo.json` cues), written to `sfx_cues.json` by a small cue script, never typed by hand.
- Bespoke sounds (a clock, a servo, room tone, wind): a film `audio.py` with numpy that writes a
  WAV (LAST LIGHT and PLEXUS have working examples).
- A generated clip's own audio is often a good bed for its shot; place it in `mix.json` at the
  shot's start.

## The mix: `mix.json` + `scripts/mix.py`

```json
{
  "duration": 30, "loudness": -14, "true_peak": -1, "out": "out/mix.wav",
  "stems": [
    {"id": "vo", "file": "audio/vo_track.wav", "gain_db": 2},
    {"id": "music", "file": "audio/music/take2.mp3", "gain_db": -3, "fade_out": 1.0, "duck": "vo"},
    {"id": "sfx", "file": "audio/sfx.wav"},
    {"id": "c01", "file": "assets/gen/video/c01.mp4", "at": 12.1, "from": 0, "dur": 4, "gain_db": -6, "fade_in": 0.04, "fade_out": 0.2}
  ]
}
```

- `at` places a stem on the film clock, `from` / `dur` trim it, `fade_in` / `fade_out` in seconds,
  `duck` names the stem it ducks under (sidechain compression), `pan` from -1 to 1.
- `mix.py` mixes, then brings the whole mix to `loudness` LUFS with one gain and a peak limiter
  (no automatic level riding, so the balance stays as mixed), and re-measures until it is within
  0.3 LU. It prints the loudness, true peak and gain; if it notes more than 12 dB of gain, the
  stems are too quiet and the limiter is squashing the peaks: raise their `gain_db`.
- -14 LUFS is the house target. A quiet, close mood piece may sit lower (LAST LIGHT is about -21);
  say so in the README.
- `build.py` runs `mix.py` whenever `mix.json` exists, after any `prebuild` steps in `plan.json`.

## Checking sound you can't hear

- Levels: the mix step prints integrated loudness and true peak.
- Shape: `ffmpeg -v error -i out/mix.wav -filter_complex "showwavespic=s=1600x240:split_channels=1" -frames:v 1 out/wave.png`,
  then read the image against the shot table (hits where cuts are, ducking under lines, no clipping).
- Sync: hits must land within one frame of their visual. Check a strip (`review.py --strip T`) at
  each big hit against the cue time.
- Voice over music: in the waveform picture the music should dip under every line (the duck).
