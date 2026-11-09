// orbits.js — standalone orbital mechanics for the Solar System viewer.
// No dependencies. Works in the browser and in Node (ES module).
//
// Planets: NASA JPL "Approximate Positions of the Planets", Table 1
//   https://ssd.jpl.nasa.gov/planets/approx_pos.html  (valid 1800 AD – 2050 AD)
//   Numbers are copied verbatim; data/jpl_approx_pos_table1.txt is the saved copy
//   and the test suite checks this file against it.
// All positions are heliocentric, J2000 mean ecliptic and equinox, in AU.

export const AU_KM = 149597870.7;
export const J2000 = 2451545.0;
export const DEG = Math.PI / 180;
export const OBLIQUITY_J2000 = 23.43928; // degrees, from the JPL page
// TT − UTC, seconds. 32.184 s + 37 leap seconds (constant since 2017).
// Used for every date, so dates long before 2017 carry an error of up to ~1 minute.
export const TT_MINUS_UTC = 69.184;
// Earth/Moon mass ratio (ratio of DE440 GM values).
export const EARTH_MOON_MASS_RATIO = 81.3005682;

// [a (au), e, I (deg), L (deg), long.peri. (deg), long.node. (deg)]
// first row: value at J2000, second row: rate per Julian century.
export const ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  emb:     [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
            [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
            [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
            [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
};

// Pluto. JPL has removed Pluto from the current "Approximate Positions" page, so it
// cannot come from Table 1. Instead: JPL Horizons osculating elements of the Pluto
// system barycenter about the Solar System barycenter at J2000.0 (DE441, ecliptic
// J2000), propagated as a fixed two-body ellipse. APPROXIMATION.
const PLUTO_OSC = {
  EC: 2.489763560923634E-01, IN: 1.714055930776762E+01,
  OM: 1.103012538561415E+02, W: 1.137774660018993E+02,
  N: 3.974725912433208E-03,  // deg/day
  MA: 1.484874908032896E+01, A: 3.948741550384992E+01,
};
ELEMENTS.pluto = [
  [PLUTO_OSC.A, PLUTO_OSC.EC, PLUTO_OSC.IN,
   PLUTO_OSC.OM + PLUTO_OSC.W + PLUTO_OSC.MA, PLUTO_OSC.OM + PLUTO_OSC.W, PLUTO_OSC.OM],
  [0, 0, 0, PLUTO_OSC.N * 36525, 0, 0],
];

export const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

// ---------------------------------------------------------------- time
/** Julian Date (UTC) from JavaScript milliseconds since the Unix epoch. */
export function jdFromUnixMs(ms) { return ms / 86400000 + 2440587.5; }
export function unixMsFromJd(jd) { return (jd - 2440587.5) * 86400000; }
/** Julian ephemeris date (TT, used as TDB) from a UTC Julian Date. */
export function jdTT(jdUtc) { return jdUtc + TT_MINUS_UTC / 86400; }
/** T: Julian centuries past J2000.0. */
export function centuries(jd) { return (jd - J2000) / 36525; }

export function norm360(d) { d %= 360; return d < 0 ? d + 360 : d; }
export function norm180(d) { d = norm360(d); return d > 180 ? d - 360 : d; }

// ---------------------------------------------------------------- Kepler
/**
 * Solve Kepler's equation M = E − e* sin E (degrees, e* = e·180/π) by Newton
 * iteration, exactly as on the JPL page. Returns E in degrees.
 */
export function solveKepler(Mdeg, e, tolDeg = 1e-6) {
  const eStar = e / DEG;
  let E = Mdeg + eStar * Math.sin(Mdeg * DEG);
  for (let i = 0; i < 50; i++) {
    const dM = Mdeg - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) <= tolDeg) break;
  }
  return E;
}

/** Elements of a planet at T centuries past J2000. Angles in degrees. */
export function elementsAt(name, T) {
  const key = name === 'earth' ? 'emb' : name;
  const [o, r] = ELEMENTS[key];
  const a = o[0] + r[0] * T, e = o[1] + r[1] * T, I = o[2] + r[2] * T;
  const L = o[3] + r[3] * T, peri = o[4] + r[4] * T, node = o[5] + r[5] * T;
  const argPeri = peri - node;          // ω = ϖ − Ω
  const M = norm180(L - peri);          // M = L − ϖ, in −180…+180
  return { a, e, I, L, peri, node, argPeri, M };
}

/**
 * Rotate orbital-plane coordinates (x′ toward perihelion) into the J2000 ecliptic:
 * r_ecl = Rz(−Ω) Rx(−I) Rz(−ω) r′. Returns [x, y, z].
 */
export function orbitalToEcliptic(xp, yp, argPeriDeg, nodeDeg, incDeg) {
  const w = argPeriDeg * DEG, O = nodeDeg * DEG, I = incDeg * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    (sw * sI) * xp + (cw * sI) * yp,
  ];
}

/** Point on the orbit described by `el` at eccentric anomaly E (degrees). */
export function orbitPoint(el, Edeg) {
  const E = Edeg * DEG;
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  return orbitalToEcliptic(xp, yp, el.argPeri, el.node, el.I);
}

/** r, ecliptic longitude and latitude (degrees) of a vector. */
export function toSpherical(v) {
  const r = Math.hypot(v[0], v[1], v[2]);
  return { r, lon: norm360(Math.atan2(v[1], v[0]) / DEG), lat: Math.asin(v[2] / r) / DEG };
}

/**
 * Heliocentric state from the Keplerian table for 'mercury' … 'neptune', 'pluto',
 * or 'emb' (Earth–Moon barycenter). `jd` is the Julian ephemeris date (TT/TDB).
 * Returns { pos:[x,y,z] AU, r, lon, lat, E, el }.
 */
export function keplerPosition(name, jd) {
  const el = elementsAt(name, centuries(jd));
  const E = solveKepler(el.M, el.e);
  const pos = orbitPoint(el, E);
  return { pos, ...toSpherical(pos), E, el };
}

// ---------------------------------------------------------------- moons (simplified)
// Mean orbital elements from JPL "Planetary Satellite Mean Elements"
// (https://ssd.jpl.nasa.gov/sats/elem/, epoch 2000-01-01.5 TDB), copied verbatim.
// frame 'ecliptic': referred to the ecliptic. frame 'laplace': referred to the local
// Laplace plane whose pole is (ra, dec) in the ICRF.
// P is the period of the mean anomaly; Papsis / Pnode are precession periods (years).
// apsis: +1 prograde, −1 retrograde (Io and Europa regress — forced by the Laplace
// resonance — which reproduces their sidereal periods). Nodes regress.
// SIMPLIFIED: no perturbations beyond uniform precession.
export const MOONS = {
  moon:     { parent: 'earth',   frame: 'ecliptic', a: 384400,  e: 0.0554, w: 318.15, M: 135.27, i: 5.16, node: 125.08, P: 27.322,    Papsis: 5.997,   Pnode: 18.600,  apsis: 1 },
  io:       { parent: 'jupiter', frame: 'laplace',  a: 421800,  e: 0.004,  w: 49.1,   M: 330.9,  i: 0.0,  node: 0.0,    P: 1.762732,  Papsis: 1.333,   Pnode: 0,       apsis: -1, ra: 268.1, dec: 64.5 },
  europa:   { parent: 'jupiter', frame: 'laplace',  a: 671100,  e: 0.009,  w: 45.0,   M: 345.4,  i: 0.5,  node: 184.0,  P: 3.525463,  Papsis: 1.394,   Pnode: 30.202,  apsis: -1, ra: 268.1, dec: 64.5 },
  ganymede: { parent: 'jupiter', frame: 'laplace',  a: 1070400, e: 0.001,  w: 198.3,  M: 324.8,  i: 0.2,  node: 58.5,   P: 7.155588,  Papsis: 68.301,  Pnode: 137.812, apsis: 1,  ra: 268.2, dec: 64.6 },
  callisto: { parent: 'jupiter', frame: 'laplace',  a: 1882700, e: 0.007,  w: 43.8,   M: 87.4,   i: 0.3,  node: 309.1,  P: 16.690440, Papsis: 277.921, Pnode: 577.264, apsis: 1,  ra: 268.7, dec: 64.8 },
  // Titan: the table's Laplace-plane phase angles could not be reconciled with Horizons
  // under the convention that works for the Galilean moons, so its orientation and
  // phase are JPL Horizons osculating elements about Saturn at J2000.0 (SAT441,
  // ecliptic J2000). The semi-major axis and period are still the JPL mean values.
  titan:    { parent: 'saturn',  frame: 'ecliptic', a: 1221900, e: 2.860066256432539E-02, w: 1.644091285733822E+02, M: 1.634361974944248E+02, i: 2.771833887311165E+01, node: 1.692391602866279E+02, P: 15.945448, Papsis: 0, Pnode: 0, apsis: 1 },
};
// The task asks for the Moon's textbook mean inclination and sidereal period.
// These replace the rounded JPL table entries (5.16°, 27.322 d) for the Moon only;
// the sidereal period fixes the mean-longitude rate.
export const MOON_INCLINATION = 5.145;
export const MOON_SIDEREAL_DAYS = 27.321661;

/** Equatorial (ICRF) → J2000 ecliptic. */
export function equatorialToEcliptic(v) {
  const c = Math.cos(OBLIQUITY_J2000 * DEG), s = Math.sin(OBLIQUITY_J2000 * DEG);
  return [v[0], c * v[1] + s * v[2], -s * v[1] + c * v[2]];
}
/** Unit vector (J2000 ecliptic) for an ICRF right ascension / declination in degrees. */
export function raDecToEcliptic(raDeg, decDeg) {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  return equatorialToEcliptic([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]);
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; };

/** Mean elements of a moon at `jd`, with uniform apsidal and nodal precession. */
export function moonElementsAt(name, jd) {
  const m = MOONS[name];
  const d = jd - J2000;
  const nodeRate = m.Pnode ? -360 / (m.Pnode * 365.25) : 0;
  const apsisRate = m.Papsis ? m.apsis * 360 / (m.Papsis * 365.25) : 0; // rate of ω
  let i = m.i, Mrate = 360 / m.P;
  if (name === 'moon') {
    i = MOON_INCLINATION;
    Mrate = 360 / MOON_SIDEREAL_DAYS - apsisRate - nodeRate; // so that L advances 360° per sidereal month
  }
  return {
    a: m.a / AU_KM, e: m.e, I: i,
    node: m.node + nodeRate * d,
    argPeri: m.w + apsisRate * d,
    M: norm180(m.M + Mrate * d),
    frame: m.frame, ra: m.ra, dec: m.dec,
  };
}

function laplaceToEcliptic(v, ra, dec) {
  const p = raDecToEcliptic(ra, dec);                       // pole of the Laplace plane
  const zEq = raDecToEcliptic(0, 90);                       // ICRF north pole
  const n = unit(cross(zEq, p));                            // ascending node on the ICRF equator
  const q = cross(p, n);
  return [
    n[0] * v[0] + q[0] * v[1] + p[0] * v[2],
    n[1] * v[0] + q[1] * v[1] + p[1] * v[2],
    n[2] * v[0] + q[2] * v[1] + p[2] * v[2],
  ];
}

/** Point on a moon's orbit (relative to its planet, AU, J2000 ecliptic) at eccentric anomaly E. */
export function moonOrbitPoint(el, Edeg) {
  const v = orbitPoint(el, Edeg);
  return el.frame === 'laplace' ? laplaceToEcliptic(v, el.ra, el.dec) : v;
}

/** Position of a moon relative to its planet's centre, AU, J2000 ecliptic. SIMPLIFIED. */
export function moonPosition(name, jd) {
  const el = moonElementsAt(name, jd);
  const E = solveKepler(el.M, el.e);
  const pos = moonOrbitPoint(el, E);
  return { pos, ...toSpherical(pos), E, el };
}

// ---------------------------------------------------------------- bodies
/**
 * Heliocentric position of any body ('sun', a planet, 'pluto' or a moon) at `jd` (TT).
 * Earth is the table's Earth–Moon barycenter corrected by the simplified Moon.
 */
export function heliocentric(name, jd) {
  if (name === 'sun') return { pos: [0, 0, 0], r: 0, lon: 0, lat: 0 };
  if (name === 'earth') {
    const emb = keplerPosition('emb', jd);
    const m = moonPosition('moon', jd).pos;
    const k = 1 / (1 + EARTH_MOON_MASS_RATIO);
    const pos = [emb.pos[0] - m[0] * k, emb.pos[1] - m[1] * k, emb.pos[2] - m[2] * k];
    return { pos, ...toSpherical(pos), E: emb.E, el: emb.el };
  }
  if (MOONS[name]) {
    const p = heliocentric(MOONS[name].parent, jd).pos;
    const m = moonPosition(name, jd);
    const pos = [p[0] + m.pos[0], p[1] + m.pos[1], p[2] + m.pos[2]];
    return { pos, ...toSpherical(pos), rel: m };
  }
  return keplerPosition(name, jd);
}

/** Distance between two bodies in AU. */
export function distanceBetween(a, b, jd) {
  const p = heliocentric(a, jd).pos, q = heliocentric(b, jd).pos;
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// ---------------------------------------------------------------- orientation
// North pole directions (ICRF right ascension, declination, degrees at J2000) from the
// IAU WGCCRE report on cartographic coordinates and rotational elements.
// With these poles Venus and Uranus spin negatively (retrograde). Pluto's entry is its
// positive (right-hand-rule) pole, as the IAU uses for dwarf planets, so its spin is positive.
export const POLES = {
  sun: [286.13, 63.87], mercury: [281.0103, 61.4155], venus: [272.76, 67.16],
  earth: [0, 90], mars: [317.681, 52.887], jupiter: [268.057, 64.495],
  saturn: [40.589, 83.537], uranus: [257.311, -15.175], neptune: [299.36, 43.46],
  pluto: [132.993, -6.163],
};
/** Unit vector of a body's north pole in the J2000 ecliptic frame. */
export function poleEcliptic(name) {
  const p = POLES[name];
  return raDecToEcliptic(p[0], p[1]);
}
/** Unit normal of a planet's orbit (J2000 ecliptic frame) at `jd`. */
export function orbitNormal(name, jd) {
  const el = elementsAt(name, centuries(jd));
  const O = el.node * DEG, I = el.I * DEG;
  return [Math.sin(I) * Math.sin(O), -Math.sin(I) * Math.cos(O), Math.cos(I)];
}
/** Greenwich mean sidereal angle in degrees for a UT Julian Date (Earth's rotation phase). */
export function gmstDeg(jdUt) {
  return norm360(280.46061837 + 360.98564736629 * (jdUt - J2000));
}
