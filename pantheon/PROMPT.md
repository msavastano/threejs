# Prompt: Pantheon, Rome — coffered dome, oculus, time-of-day sunbeam

Build a single-file Three.js scene (`pantheon/index.html`, ES modules via importmap, three r160,
same conventions as the other demos in this repo) of the Pantheon in Rome.

## Reference images (in `pantheon/reference/`)

| File | What to take from it |
|---|---|
| `01-engraving-interior-view.webp` | Overall interior composition seen from the doorway: 8 recesses (apse opposite the door), two columns per recess, aedicules with triangular pediments on the piers between them, the main entablature, the panelled attic zone, a plain band, then the coffered dome. Marble floor of squares and circles. |
| `02-dome-looking-straight-up.webp` | Coffer layout. **5 rings of 28 coffers**, each coffer a stepped (4-step) recess, ribs between them, rings getting smaller toward the top, then a smooth unbroken annulus (~4x the oculus radius) around the oculus. Warm grey-brown plaster colour. Bronze rim at the oculus. |
| `03-oculus-light-beam.webp` | How the sunbeam looks: a hard-edged cone/cylinder of light leaving the oculus, hazy blue-white in the air (Tyndall effect), lighting a patch of coffers where it meets the dome, with a soft edge. |

## Geometry (metres)

- Interior is a cylinder topped by a hemisphere: radius **21.65**, so the height to the oculus is 43.3 (a sphere fits exactly).
- Oculus: 8.2 m across (radius 4.1). Open to the sky. Bronze ring at the rim.
- Dome springs at y = 21.65. Coffers run from the springline up to 38.5 deg from vertical. Model the
  coffers as real stepped recesses, not a texture.
- Lower order: 8 recesses at 45 deg spacing (entrance north, apse south), two Corinthian columns each,
  entablature at y = 9.2 to 11.4, attic panels above, attic cornice at about y = 19.
- Exterior: brick drum (outer radius 27.9), 7 stepped rings, lead-grey outer dome, portico with 16 granite columns
  (8 in front, two files of 4 behind), pediment, bronze doors.

## Sunbeam

- Sun position computed from real astronomy for Rome (41.9 N, 12.5 E), local clock time (CET/CEST) and day of year.
- The beam is the oculus disc projected along the sun direction. Do the light with a shadow-casting
  directional light so the lit patch is physically correct on coffers, walls, columns and floor, and draw the visible shaft with a ray-marched volume
  (analytic disc-projection test, penumbra widening with distance at 0.0093 per metre from the sun's angular size, HG phase function, drifting dust noise).
- Beam fades with sun altitude and warms toward orange near the horizon. Nothing at night.
- Add a warm bounce light at the point where the beam lands.
- Controls: time-of-day slider, date slider, play/pause with speed, presets for the solstices, equinoxes and
  **21 April (Natale di Roma)**, when at solar noon the beam lands on the doorway.
- Readout of sun altitude/azimuth and where the beam centre lands (floor, wall height, or dome).

## Views

Inside (walkable, drag to look, WASD), Under the oculus (looking straight up), Outside (orbit), plus a cutaway toggle that
slices the building open so the beam can be watched from outside.

## Quality bar

Bloom and ACES tone mapping. Physically plausible exposure: the interior should be dim with a bright beam.
Check the result with screenshots at several times of day and dates before finishing.
