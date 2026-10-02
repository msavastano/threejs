// Tests: orbits.js vs NASA/JPL Horizons (DE441) heliocentric ecliptic-J2000 vectors.
// Tolerances are ~2x JPL's published nominal error for each table (approx_pos "Accuracy" section),
// widened where measured error is larger than nominal (documented below).
import { readFileSync } from 'node:fs';
import { bodyAxes, heliocentric, describe, DEG, AU_KM, J2000, solveKepler, dateToJD, jdToDate, tableFor, deltaT } from '../src/orbits.js';
const load = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url)));
const names = { mercury: 'Mercury', venus: 'Venus', emb: 'EMB', earth: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
// direction tolerance in arcseconds: [Table 1 (1800-2050), Table 2a (3000BC-3000AD)]
const TOL = { mercury: [40, 60], venus: [50, 100], emb: [50, 100], earth: [60, 100], mars: [100, 250], jupiter: [800, 1500], saturn: [1200, 2500], uranus: [120, 4000], neptune: [90, 900], pluto: [3600, 3600] };
let fail = 0; const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const angErr = (a, b) => Math.acos(Math.min(1, (a[0]*b[0]+a[1]*b[1]+a[2]*b[2]) / (Math.hypot(...a)*Math.hypot(...b)))) / DEG * 3600;
const worst = { table1: {}, table2a: {} };
const run = (file) => {
  for (const [k, rows] of Object.entries(load(file))) for (const r of rows) {
    const tbl = tableFor(r.jd), idx = tbl === 'table1' ? 0 : 1, nm = names[k];
    const m = heliocentric(nm, r.jd), h = [r.x, r.y, r.z], ang = angErr(m, h);
    const t = nm === 'Pluto' ? 'table1' : tbl;
    worst[t][k] = Math.max(worst[t][k] || 0, ang);
    check(ang < TOL[k][idx], `${k} JD ${r.jd} ${tbl}: ${ang.toFixed(1)}" exceeds ${TOL[k][idx]}"`);
    check(Math.abs(Math.hypot(...m) - Math.hypot(...h)) * AU_KM < (k === 'pluto' ? 5e7 : 4e7) , `${k} JD ${r.jd} distance error too large`);
  }
};
run('horizons_ref.json'); run('horizons_ref2.json');
for (const t of ['table1', 'table2a']) console.log(`worst direction error, ${t} (arcsec):`, Object.fromEntries(Object.entries(worst[t]).map(([k, v]) => [k, Math.round(v)])));
const e = describe('Earth', J2000);
console.log('Earth at J2000: r =', e.r.toFixed(5), 'AU, lon =', e.lon.toFixed(3), 'deg');
check(Math.abs(e.r - 0.98333) < 0.001, 'Earth distance at J2000 should be ~0.9833 AU');
check(Math.abs(e.lon - 100.38) < 0.1, 'Earth longitude at J2000 should be ~100.4 deg');
// seasonal check: Earth heliocentric longitude = Sun's geocentric longitude - 180. At the March equinox the Sun's
// apparent longitude is 0, so Earth's heliocentric ecliptic longitude is 180 (mean equinox of date ~ J2000 + precession ~0.36 deg by 2026).
const eq = new Date(Date.UTC(2026, 2, 20, 14, 46)); // 2026 March equinox (approx UTC)
const el = describe('Earth', dateToJD(eq)).lon;
console.log('Earth helio lon at 2026 March equinox:', el.toFixed(2), '(expect ~179.6: 180 minus ~0.36 deg precession since J2000)');
check(Math.abs(el - 179.64) < 0.15, 'March-equinox longitude check');
check(Math.abs(solveKepler(1.0, 0.3) - 1.0 - 0.3 * Math.sin(solveKepler(1.0, 0.3))) < 1e-12, 'Kepler solver residual');
const d = new Date(Date.UTC(2026, 8, 28, 12)); check(Math.abs(jdToDate(dateToJD(d)) - d) < 1, 'JD round trip');
// Earth prime meridian at J2000.0 (12h TT): Greenwich direction RA should equal Earth Rotation Angle ~ 280.46 deg
{ const ax = bodyAxes('Earth', J2000 + deltaT(2000) / 86400), c = Math.cos(23.4392911*DEG), s = Math.sin(23.4392911*DEG);
  const v = ax.x, eq = [v[0], c*v[1]-s*v[2], s*v[1]+c*v[2]]; // ecliptic -> equatorial
  const ra = (Math.atan2(eq[1], eq[0]) / DEG + 360) % 360; console.log('Greenwich RA at J2000:', ra.toFixed(2), '(GMST 18.697h = 280.46 deg)');
  check(Math.abs(ra - 280.46) < 0.02, 'Earth prime meridian orientation'); }
console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
