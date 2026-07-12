# The Time Cathedral

A self-contained Three.js experience — a gigantic Gothic cathedral where time itself is visible.
Single HTML file, no build step. Just open it in a browser.

## Run

Double-click `time-cathedral.html`, or serve it any way you like (not required — it works
straight from `file://` since Three.js loads from a CDN via an import map).

Click **▶ Enter the Cathedral** to start (this also unlocks audio, per browser autoplay rules).

## Controls

- **Drag** — orbit
- **Scroll** — zoom
- **R** — manually trigger a rewind

## What's in it

- **Massive Gothic architecture** — pointed barrel vault, clustered columns, transverse ribs,
  apse with a giant rose window.
- **Hundreds of animated clocks** — an instanced array on the apse wall plus floating rows down
  the nave, each with hour/minute/second hands spinning at its own rate.
- **Pendulum wave** — 40 pendulums of stepped periods forming evolving harmonic patterns, plus a
  grand altar pendulum.
- **Floating gears** — procedural extruded brass gears drifting through the upper nave.
- **Glowing particle rivers** — ~7,000 points flowing along curved paths through the building.
- **Procedural stained glass** — a shader rendering leaded panels with orbiting sun/moon, twinkling
  stars, and caustics; side windows + the apse rose window.
- **Time fractures** — a full-screen shader pass (chromatic aberration + glitch + scanlines) that
  ramps during rewinds.
- **Rewind** — roughly every 90 seconds (or on **R**), all motion reverses seamlessly, the screen
  fractures, and a descending bell chime sounds, then time resumes forward.
- **Graphics** — HDR image-based lighting (PMREM `RoomEnvironment`), ACES tone mapping, `UnrealBloom`,
  soft dynamic shadows, additive volumetric light shafts, exponential fog.
- **Audio** — procedural Web Audio bell tones (additive inharmonic partials with exponential decay)
  through a generated convolver reverb, plus a low ambient drone. Pentatonic chimes on a timer; a
  descending chime at each rewind.

## How the rewind works

Every animated element integrates its own phase from `dt × direction × rate` (not absolute time).
Flipping `direction` to −1 produces an exact, seamless reversal of clocks, pendulums, gears,
particle flow, and the stained-glass celestial motion; flipping back to +1 continues. The fracture
shader intensity and the rewind chime are tied to the same event.

## Tuning

All knobs live in the `CONFIG` object near the top of the `<script>` (bloom, fog, rewind interval/
duration, clock/pendulum/gear/particle counts, audio timings).
