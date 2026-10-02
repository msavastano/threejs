# Solar System Live

Interactive three.js solar system. Planet positions come from NASA/JPL Keplerian elements for any date (3000 BC to 3000 AD).

- `solar-system.html`  standalone page (open it in a browser; needs internet for three.js from jsDelivr)
- `src/orbits.js`      orbital math (also runs in Node)
- `src/app.js`         scene and UI
- `src/elements.gen.js` generated data (JPL tables, NAIF poles, radii). Regenerate with `data/gen_data.py` then `data/gen_elements.py`
- `test/orbits.test.mjs` compares against NASA Horizons (`node test/orbits.test.mjs`)
- `build.py`           rebuilds the standalone page from `index.html`, `src/` and `tex/`

Accuracy (worst direction error vs Horizons, arcseconds, 1800-2050): Mercury 12, Venus 18, Earth 12, Mars 59, Jupiter 309, Saturn 610, Uranus 79, Neptune 45, Pluto ~2100 (approximate two-body orbit).
Moons use simplified JPL mean elements. Sky texture is artistic.

Credits: JPL SSD (planet elements, SBDB, satellite mean elements, physical parameters), NAIF pck00011, planet maps by James Hastings-Trew via jeromeetienne/threex.planets (MIT), Earth and Moon maps from the three.js examples.
