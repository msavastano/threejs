# film-studio

A Claude Code skill for making any film, with Claude as the director. It asks nine questions about
the film, then gives each shot to the maker that does it best and writes all the code:

- **code**: the edit, type, graphics and stylized 3D, rendered frame by frame from `seek(t)`
- **Blender**: physically lit 3D with free BlenderKit and Poly Haven assets, rendered with EEVEE
- **Google Gemini APIs**: Nano Banana stills, Gemini Omni / Veo clips, Gemini TTS voice, Lyria music
- **synth**: sound effects and room tone timed to the picture's own events

It works in the [motion-videos](https://github.com/msavastano/motion-videos) studio (renderer,
Gemini tools, house rules) and grew out of its films: LAST LIGHT (all Blender), PLEXUS (Blender over
a 2D code world), LAMINA (generated stills and footage turned into cut paper), DYSON SPHERE
(narrated, scored code film).

## Install

```
python skills/film-studio/scripts/install.py
```

That copies the skill to `~/.claude/skills/film-studio`; run it again after changing the skill.
Then, in a new Claude Code session, say "make a film about ..." or type `/film-studio`.

To make it load in cloud sessions on motion-videos too, install it into that repo's project skills:
`python skills/film-studio/scripts/install.py --to <motion-videos>/.claude/skills` and commit it there.

## How a film goes

1. **Preflight**: `scripts/doctor.py` says which makers are ready on this machine.
2. **Questions**: nine, with defaults; "go" takes them all.
3. **Plan**: `scripts/new_film.py` scaffolds `films/<slug>/`; Claude writes the brief and a shot list
   with a maker and a reason per shot; `scripts/plan.py` prints the table with the paid-generation
   estimate and render time. Nothing is paid for until you say yes.
4. **Look**: three key stills, critiqued until they score 8+, shown for a yes.
5. **Parts**: voice, music, generated clips, Blender renders (in the background), the code film.
6. **Draft**: `scripts/build.py <film> draft` at 960x540 with the real mix, critiqued, shown to you.
7. **Final**: full renders, `build.py final` and `build.py sheet`, a README, and a draft PR.

## Needs

Node 22+, ffmpeg, Python 3 with numpy, soundfile, scipy, pillow, librosa and google-genai,
Playwright's Chromium in motion-videos (`npm install && npx playwright install chromium`).
For 3D: Blender 5.x (the blender-mcp skill connects it). For generated media: a Gemini API key in
`motion-videos/.env` (`GEMINI_API_KEY=...`), or a network secret in a cloud environment.
