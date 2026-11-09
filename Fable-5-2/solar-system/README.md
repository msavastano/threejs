# Solar System Orrery

An interactive 3D Solar System in three.js. Planet positions are computed for any date
from NASA JPL's Keplerian elements.

- `index.html` — the finished page. One self-contained file (textures embedded); it only
  loads three.js r180 from cdnjs. Open it directly in a browser.
- `orbits.js` — the standalone orbital-mechanics module (no dependencies, works in Node).
- `orbits.test.mjs` — unit tests: `node --test`
- `src/app.html` — the page source. `node tools/build.mjs` inlines `orbits.js`,
  `vendor/OrbitControls.js` and `textures/*` into `index.html`.
- `data/` — the saved JPL Table 1 and the JPL Horizons reference vectors used by the tests.

## Accuracy

| | Source | Measured against JPL Horizons (DE441), 7 dates 1850–2040 |
|---|---|---|
| Mercury–Mars, Earth | JPL "Approximate Positions of the Planets", Table 1 | ≤ 0.38′ |
| Jupiter / Saturn | same | ≤ 5.2′ / ≤ 10.3′ (JPL quotes ~400″ / ~600″) |
| Uranus / Neptune | same | ≤ 1.4′ / ≤ 0.8′ |
| Pluto | Horizons osculating elements at J2000, two-body (JPL removed Pluto from the table) | ≤ 0.9′ |
| Moon | JPL mean elements, 5.145°, sidereal month, uniform precession | ≤ 1.3° seen from Earth |
| Io, Europa, Ganymede, Callisto | JPL mean elements (Laplace plane) | ≤ 3.9°, 8.7°, 0.2°, 0.2° |
| Titan | Horizons osculating elements at J2000 + JPL mean period | ≤ 2.7° |

Earth is the table's Earth–Moon barycenter corrected by the simplified Moon.
The table is valid for 1800–2050; the page warns outside that range.

## Credits

- Orbital elements and physical data: NASA/JPL Solar System Dynamics, JPL Horizons, NASA NSSDC.
- Texture maps (Sun, Mercury, Venus, Earth day/night, Moon, Mars, Jupiter, Saturn and rings,
  Uranus, Neptune, Milky Way): © [Solar System Scope](https://www.solarsystemscope.com/textures/),
  CC BY 4.0, recompressed. Pluto, Io, Europa, Ganymede, Callisto and Titan are procedural.
- three.js r180 and OrbitControls: MIT License (see `vendor/THREE-LICENSE`). OrbitControls is
  not hosted on cdnjs, so it is vendored and inlined.
