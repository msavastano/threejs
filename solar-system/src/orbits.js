// orbits.js — solar system ephemeris math (no dependencies, runs in browser and Node)
//
// Planets: JPL "Keplerian Elements for Approximate Positions of the Major Planets"
//          (Standish & Williams). Table 1 for 1800-2050 AD, Table 2a/2b for 3000 BC - 3000 AD.
// Pluto:   two-body propagation of JPL SBDB osculating elements (APPROXIMATE).
// Moons:   JPL planetary-satellite mean elements (SIMPLIFIED, not for ephemeris use).
// Frame:   heliocentric ecliptic and mean equinox of J2000, distances in AU unless noted.

import { DATA } from './elements.gen.js';

export const DEG = Math.PI / 180;
export const AU_KM = 149597870.7;
export const J2000 = 2451545.0;
export const OBLIQUITY_J2000 = 23.4392911 * DEG; // mean obliquity at J2000 (IAU 1976)
export const PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// ---------- time ----------
// Approximate TT-UTC (seconds), linear interpolation of well-known values. The effect is below
// 1 arcminute for every planet, so a coarse table is enough.
const DT_TABLE = [[1800, 13], [1850, 7], [1900, -3], [1920, 21], [1940, 24], [1960, 33], [1980, 51], [2000, 63.8], [2017, 68.6], [2026, 69.2], [2050, 70]];
export function deltaT(year) {
  if (year <= DT_TABLE[0][0]) return DT_TABLE[0][1];
  for (let i = 1; i < DT_TABLE.length; i++) {
    if (year <= DT_TABLE[i][0]) {
      const [y0, v0] = DT_TABLE[i - 1], [y1, v1] = DT_TABLE[i];
      return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
    }
  }
  return DT_TABLE[DT_TABLE.length - 1][1];
}
/** JS Date (UTC) -> Julian Date on the TT/TDB-like scale used by the elements. */
export function dateToJD(date) {
  const jdUtc = date.getTime() / 86400000 + 2440587.5;
  const year = 1970 + (jdUtc - 2440587.5) / 365.2425;
  return jdUtc + deltaT(year) / 86400;
}
export function jdToDate(jd) {
  const year = 2000 + (jd - J2000) / 365.25;
  return new Date((jd - deltaT(year) / 86400 - 2440587.5) * 86400000);
}
export const centuries = (jd) => (jd - J2000) / 36525;

// ---------- Kepler ----------
/** Solve M = E - e sin E (radians) with Newton iteration; tolerance 1e-10 rad (~2e-8 deg). */
export function solveKepler(M, e) {
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e < 0.8 ? M + e * Math.sin(M) : Math.PI * Math.sign(M || 1);
  for (let i = 0; i < 50; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** Orbital-plane -> ecliptic rotation for (omega, Omega, I) in radians. Returns [x,y,z]. */
export function orbitToEcliptic(xp, yp, w, node, inc) {
  const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
  return [
    (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

// ---------- planets ----------
const KEY = { Earth: 'EM Bary' };
export function tableFor(jd) {
  const year = 2000 + (jd - J2000) / 365.25;
  return year >= 1800 && year <= 2050 ? 'table1' : 'table2a';
}
/** Osculating elements of a planet (or the Earth-Moon barycentre for 'Earth') at JD. Angles in radians. */
export function planetElements(name, jd, table = tableFor(jd)) {
  const T = centuries(jd);
  const row = DATA[table][KEY[name] || name];
  const v = row.map(([v0, rate]) => v0 + rate * T); // a, e, I, L, long.peri, long.node
  let M = v[3] - v[4];
  if (table === 'table2a' && DATA.table2b[name]) {
    const [b, c, s, f] = DATA.table2b[name];
    M += b * T * T + c * Math.cos(f * T * DEG) + s * Math.sin(f * T * DEG);
  }
  return { a: v[0], e: v[1], I: v[2] * DEG, L: v[3] * DEG, varpi: v[4] * DEG, node: v[5] * DEG, w: (v[4] - v[5]) * DEG, M: M * DEG, table };
}
function keplerToXYZ(a, e, M, w, node, I) {
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return orbitToEcliptic(xp, yp, w, node, I);
}
function pluto(jd) {
  const p = DATA.pluto;
  const M = (p.M0 + p.n * (jd - p.epoch)) * DEG;
  return keplerToXYZ(p.a, p.e, M, p.w * DEG, p.node * DEG, p.i * DEG);
}

// ---------- Moon (simplified) ----------
const MOON_MU = 0.01215058; // Moon/(Earth+Moon) mass ratio
/** Geocentric ecliptic position of the Moon in AU (mean elements with node regression + apsidal advance). */
export function moonGeocentric(jd) {
  const m = DATA.moons.Moon, dt = jd - J2000 - 0.5;
  const w = (m.w + (360 * dt) / (m.Pw * 365.25)) * DEG;
  const node = (m.node - (360 * dt) / (m.Pnode * 365.25)) * DEG;
  const M = (m.M + (360 * dt) / m.P) * DEG;
  const p = keplerToXYZ(m.a / AU_KM, m.e, M, w, node, m.i * DEG);
  return p;
}

/** Heliocentric ecliptic J2000 position [x,y,z] in AU. For 'EMB' returns the Earth-Moon barycentre. */
export function heliocentric(name, jd, opts = {}) {
  if (name === 'Pluto') return pluto(jd);
  const key = name === 'EMB' ? 'Earth' : name;
  const el = planetElements(key, jd, opts.table);
  const p = keplerToXYZ(el.a, el.e, el.M, el.w, el.node, el.I);
  if (name === 'Earth') {
    const m = moonGeocentric(jd);
    return [p[0] - MOON_MU * m[0], p[1] - MOON_MU * m[1], p[2] - MOON_MU * m[2]];
  }
  return p;
}

/** Convenience: position plus distance and ecliptic longitude/latitude (degrees) as seen from the Sun. */
export function describe(name, jd) {
  const [x, y, z] = heliocentric(name, jd);
  const r = Math.hypot(x, y, z);
  return { x, y, z, r, lon: ((Math.atan2(y, x) / DEG) + 360) % 360, lat: Math.asin(z / r) / DEG };
}
export function geocentricDistance(name, jd) {
  const a = heliocentric(name, jd), b = heliocentric('Earth', jd);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Sample the orbit ellipse of a planet (as of `jd`) for drawing: array of [x,y,z] in AU. */
export function orbitPath(name, jd, n = 256) {
  const pts = [];
  let a, e, w, node, I;
  if (name === 'Pluto') { const p = DATA.pluto; ({ a, e } = p); w = p.w * DEG; node = p.node * DEG; I = p.i * DEG; }
  else { const el = planetElements(name, jd); ({ a, e, w, node, I } = el); }
  for (let k = 0; k <= n; k++) {
    const E = (k / n) * 2 * Math.PI;
    pts.push(orbitToEcliptic(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), w, node, I));
  }
  return pts;
}
/** Perihelion and aphelion points (AU) for the orbit as of jd. */
export function apsides(name, jd) {
  let a, e, w, node, I;
  if (name === 'Pluto') { const p = DATA.pluto; ({ a, e } = p); w = p.w * DEG; node = p.node * DEG; I = p.i * DEG; }
  else { const el = planetElements(name, jd); ({ a, e, w, node, I } = el); }
  return { perihelion: orbitToEcliptic(a * (1 - e), 0, w, node, I), aphelion: orbitToEcliptic(-a * (1 + e), 0, w, node, I), a, e };
}

// ---------- satellites (simplified) ----------
const EQ2ECL = (v) => {
  const c = Math.cos(OBLIQUITY_J2000), s = Math.sin(OBLIQUITY_J2000);
  return [v[0], c * v[1] + s * v[2], -s * v[1] + c * v[2]];
};
/** Position of a Laplace-plane satellite relative to its planet, in km, ecliptic J2000 axes. */
export function moonPlanetocentricKm(name, jd) {
  if (name === 'Moon') { const p = moonGeocentric(jd); return p.map((v) => v * AU_KM); }
  const m = DATA.moons[name], dt = jd - J2000 - 0.5;
  const w = (m.w + (m.Pw > 0 ? (360 * dt) / (m.Pw * 365.25) : 0)) * DEG;
  const node = (m.node + (m.Pnode > 0 ? -(360 * dt) / (m.Pnode * 365.25) : 0)) * DEG;
  const M = (m.M + (360 * dt) / m.P) * DEG;
  const E = solveKepler(M, m.e);
  const xp = m.a * (Math.cos(E) - m.e), yp = m.a * Math.sqrt(1 - m.e * m.e) * Math.sin(E);
  const q = orbitToEcliptic(xp, yp, w, node, m.i * DEG); // in Laplace-plane frame
  // Laplace frame: z = plane pole, x = intersection with the equator (RA_pole + 90 deg)
  const ra = m.poleRA * DEG, dec = m.poleDec * DEG;
  const z = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const x = [-Math.sin(ra), Math.cos(ra), 0];
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const eq = [0, 1, 2].map((k) => q[0] * x[k] + q[1] * y[k] + q[2] * z[k]);
  return EQ2ECL(eq);
}
export const MOONS_OF = { Earth: ['Moon'], Jupiter: ['Io', 'Europa', 'Ganymede', 'Callisto'], Saturn: ['Titan'] };

// ---------- body orientation (IAU WGCCRE via NAIF pck00011) ----------
/** Spin pole unit vector in ecliptic J2000 coordinates. */
export function poleEcliptic(name, jd) {
  const p = DATA.poles[name], T = centuries(jd);
  const ra = (p.ra[0] + p.ra[1] * T) * DEG, dec = (p.dec[0] + p.dec[1] * T) * DEG;
  return EQ2ECL([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]);
}
/** Prime-meridian angle W in radians. */
export function primeMeridian(name, jd) {
  const p = DATA.poles[name];
  return (p.w[0] + p.w[1] * (jd - J2000)) * DEG;
}

/** Body-fixed axes in ecliptic J2000 coordinates: {x: prime meridian at equator, y: east, z: north pole}.
 *  body->ICRF = Rz(RA+90deg) Rx(90deg-Dec) Rz(W)  (IAU WGCCRE convention, as in NAIF PCK files). */
export function bodyAxes(name, jd) {
  const p = DATA.poles[name], T = centuries(jd);
  const ra = (p.ra[0] + p.ra[1] * T) * DEG, dec = (p.dec[0] + p.dec[1] * T) * DEG;
  let W = (p.w[0] + p.w[1] * (jd - J2000)) * DEG;
  if (name === 'Earth') {
    // The IAU/NAIF low-accuracy Earth prime meridian is ~0.3 deg off; use the IAU 2000 Earth Rotation Angle instead
    // (meridian RA = (RA_pole + 90deg) + W  =>  W = ERA - 90deg).
    const du = jd - deltaT(2000 + (jd - J2000) / 365.25) / 86400 - J2000; // UT1 ~ UTC
    W = (((0.779057273264 + 1.00273781191135448 * du) % 1) * 360 - 90) * DEG;
  }
  const rz = (v, t) => [Math.cos(t) * v[0] - Math.sin(t) * v[1], Math.sin(t) * v[0] + Math.cos(t) * v[1], v[2]];
  const rx = (v, t) => [v[0], Math.cos(t) * v[1] - Math.sin(t) * v[2], Math.sin(t) * v[1] + Math.cos(t) * v[2]];
  const axis = (v) => EQ2ECL(rz(rx(rz(v, W), Math.PI / 2 - dec), ra + Math.PI / 2));
  return { x: axis([1, 0, 0]), y: axis([0, 1, 0]), z: axis([0, 0, 1]) };
}
/** Sidereal rotation period in days (negative = retrograde), from the IAU prime-meridian rate. */
export const rotationPeriodDays = (name) => 360 / DATA.poles[name].w[1];
export const physical = (name) => ({ ...(DATA.phys[name] || {}), radiiKm: DATA.radii[name] });
export { DATA };
