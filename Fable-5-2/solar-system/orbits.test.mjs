// Run with:  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as O from './orbits.js';

const here = new URL('.', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, here), 'utf8');
const ref = JSON.parse(read('data/horizons_reference.json')).bodies;

const sepDeg = (a, b) => {
  const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.hypot(...a) / Math.hypot(...b);
  return Math.acos(Math.min(1, Math.max(-1, d))) / O.DEG;
};
const jdUtc = (iso) => O.jdTT(O.jdFromUnixMs(Date.parse(iso)));

test('element table matches the saved copy of JPL Table 1 digit for digit', () => {
  const lines = read('data/jpl_approx_pos_table1.txt').split('\n');
  const names = { Mercury: 'mercury', Venus: 'venus', 'EM Bary': 'emb', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune' };
  let checked = 0;
  for (let i = 0; i < lines.length; i++) {
    const label = Object.keys(names).find((n) => lines[i].startsWith(n + ' '));
    if (!label) continue;
    const row0 = lines[i].slice(label.length).trim().split(/\s+/).map(Number);
    if (row0.length !== 6 || row0.some(Number.isNaN)) continue; // legend line
    const row1 = lines[i + 1].trim().split(/\s+/).map(Number);
    assert.deepEqual(O.ELEMENTS[names[label]], [row0, row1], label);
    checked++;
  }
  assert.equal(checked, 8);
});

test('Kepler solver converges to 1e-6 degrees', () => {
  for (const e of [0, 0.0167, 0.2056, 0.2489, 0.6, 0.9]) {
    for (let M = -180; M <= 180; M += 7.3) {
      const E = O.solveKepler(M, e);
      const back = E - (e / O.DEG) * Math.sin(E * O.DEG);
      assert.ok(Math.abs(back - M) < 2e-6, `e=${e} M=${M}`);
    }
  }
});

test('Earth on 2000-01-01: r ≈ 0.983 AU, heliocentric longitude ≈ 100°', () => {
  const e = O.heliocentric('earth', 2451544.5); // 2000-01-01 00:00 TT
  assert.ok(Math.abs(e.r - 0.9833) < 0.0005, `r = ${e.r}`);
  assert.ok(Math.abs(e.lon - 100) < 0.6, `lon = ${e.lon}`);
  const noon = O.heliocentric('earth', O.J2000);
  assert.ok(Math.abs(noon.r - 0.9833) < 0.0005);
  console.log(`  Earth 2000-01-01 00:00 TT: r = ${e.r.toFixed(6)} AU, lon = ${e.lon.toFixed(4)}°`);
});

test('planets vs JPL Horizons (DE441) on 7 dates, 1850–2040', () => {
  // Limits in arcminutes. JPL quotes ~400″ (Jupiter) and ~600″ (Saturn) for Table 1.
  const limit = { mercury: 1, venus: 1, earth: 1, emb: 1, mars: 1, jupiter: 8, saturn: 12, uranus: 3, neptune: 3, pluto: 3 };
  let worst = { v: 0 }, worstInner = { v: 0 }, worstR = { v: 0 };
  console.log('  body      max angular error   max distance error');
  for (const name of Object.keys(limit)) {
    let mx = 0, mxR = 0;
    for (const r of ref[name]) {
      const p = name === 'emb' ? O.keplerPosition('emb', r.jd) : O.heliocentric(name, r.jd);
      const arcmin = sepDeg(p.pos, [r.x, r.y, r.z]) * 60;
      const dr = Math.abs(p.r - Math.hypot(r.x, r.y, r.z));
      if (arcmin > mx) mx = arcmin;
      if (dr > mxR) mxR = dr;
      if (arcmin > worst.v) worst = { v: arcmin, name, date: r.date };
      if (dr > worstR.v) worstR = { v: dr, name, date: r.date };
      if (['mercury', 'venus', 'earth', 'mars'].includes(name) && arcmin > worstInner.v) worstInner = { v: arcmin, name, date: r.date };
    }
    console.log(`  ${name.padEnd(9)} ${mx.toFixed(2).padStart(6)}′            ${mxR.toExponential(2)} AU`);
    assert.ok(mx < limit[name], `${name}: ${mx.toFixed(2)}′ exceeds ${limit[name]}′`);
  }
  console.log(`  MAX angular error: ${worst.v.toFixed(2)}′ (${worst.name}, ${worst.date.slice(0, 11)})`);
  console.log(`  MAX inner-planet error: ${worstInner.v.toFixed(2)}′ (${worstInner.name}, ${worstInner.date.slice(0, 11)})`);
  console.log(`  MAX distance error: ${worstR.v.toExponential(2)} AU (${worstR.name})`);
});

test('simplified moons vs JPL Horizons', () => {
  const limit = { moon: 3, io: 6, europa: 12, ganymede: 2, callisto: 2, titan: 5 }; // degrees
  for (const name of Object.keys(limit)) {
    let mx = 0, mxR = 0;
    for (const r of ref[name]) {
      const p = O.moonPosition(name, r.jd);
      mx = Math.max(mx, sepDeg(p.pos, [r.x, r.y, r.z]));
      mxR = Math.max(mxR, Math.abs(p.r / Math.hypot(r.x, r.y, r.z) - 1));
    }
    console.log(`  ${name.padEnd(9)} max ${mx.toFixed(2)}° as seen from the planet, distance within ${(mxR * 100).toFixed(1)}%`);
    assert.ok(mx < limit[name], `${name}: ${mx.toFixed(2)}°`);
  }
});

// Sun's geocentric ecliptic longitude referred to the equinox of date.
function sunLongitudeOfDate(jd) {
  const T = O.centuries(jd);
  const e = O.heliocentric('earth', jd);
  const precession = 1.396971 * T + 0.0003086 * T * T; // general precession in longitude, degrees
  return O.norm360(e.lon + 180 + precession);
}

test('2025 March equinox and June solstice line up with Earth', () => {
  const eq = sunLongitudeOfDate(jdUtc('2025-03-20T09:01:00Z'));
  const so = sunLongitudeOfDate(jdUtc('2025-06-21T02:42:00Z'));
  console.log(`  Sun longitude at equinox: ${O.norm180(eq).toFixed(4)}° (expect 0), at solstice: ${so.toFixed(4)}° (expect 90)`);
  assert.ok(Math.abs(O.norm180(eq)) < 0.03);
  assert.ok(Math.abs(so - 90) < 0.03);
  // In the J2000 frame Earth sits near heliocentric longitude 180° at the March equinox.
  const e = O.heliocentric('earth', jdUtc('2025-03-20T09:01:00Z'));
  assert.ok(Math.abs(e.lon - 180) < 0.5);
});

test('Mars opposition of 2025-01-16: Mars is opposite the Sun as seen from Earth', () => {
  const jd = jdUtc('2025-01-16T02:30:00Z');
  const e = O.heliocentric('earth', jd).pos, m = O.heliocentric('mars', jd).pos;
  const toMars = [m[0] - e[0], m[1] - e[1], m[2] - e[2]];
  const toSun = [-e[0], -e[1], -e[2]];
  const dLon = O.norm180(O.toSpherical(toMars).lon - O.toSpherical(toSun).lon);
  const elong = sepDeg(toMars, toSun);
  console.log(`  Mars − Sun geocentric longitude: ${dLon.toFixed(3)}° (expect ±180), elongation ${elong.toFixed(2)}°`);
  assert.ok(Math.abs(Math.abs(dLon) - 180) < 0.2);
  assert.ok(elong > 174);
  // and it is not at opposition a few months away
  const far = O.jdTT(O.jdFromUnixMs(Date.parse('2025-06-16T00:00:00Z')));
  const e2 = O.heliocentric('earth', far).pos, m2 = O.heliocentric('mars', far).pos;
  assert.ok(sepDeg([m2[0] - e2[0], m2[1] - e2[1], m2[2] - e2[2]], [-e2[0], -e2[1], -e2[2]]) < 120);
});

test('pole directions reproduce the published obliquities', () => {
  // NASA NSSDC Planetary Fact Sheet "Obliquity to Orbit" (degrees).
  const obliq = { mercury: 0.034, venus: 177.4, earth: 23.4, mars: 25.2, jupiter: 3.1, saturn: 26.7, uranus: 97.8, neptune: 28.3, pluto: 119.5 };
  const retro = { venus: 1, uranus: 1 }; // IAU north pole + negative spin (Pluto's pole is its positive-spin pole)
  for (const [name, want] of Object.entries(obliq)) {
    let got = sepDeg(O.poleEcliptic(name), O.orbitNormal(name, O.J2000));
    if (retro[name]) got = 180 - got;
    assert.ok(Math.abs(got - want) < 0.6, `${name}: ${got.toFixed(2)} vs ${want}`);
  }
});

test('orbit line passes through the planet (same elements)', () => {
  const p = O.heliocentric('mars', 2460000.5);
  const q = O.orbitPoint(p.el, p.E);
  assert.ok(Math.hypot(p.pos[0] - q[0], p.pos[1] - q[1], p.pos[2] - q[2]) < 1e-12);
  const peri = O.toSpherical(O.orbitPoint(p.el, 0)).r, aph = O.toSpherical(O.orbitPoint(p.el, 180)).r;
  assert.ok(Math.abs(peri - p.el.a * (1 - p.el.e)) < 1e-12 && Math.abs(aph - p.el.a * (1 + p.el.e)) < 1e-12);
});

test('index.html embeds this exact orbits.js', { skip: !fs.existsSync(new URL('index.html', here)) }, () => {
  const html = read('index.html');
  const src = read('orbits.js').replace(/^export /gm, '');
  assert.ok(html.includes(src), 'index.html is out of date — run: node tools/build.mjs');
});
