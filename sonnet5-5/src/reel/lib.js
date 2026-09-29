'use strict';
/* ==========================================================================
   lib.js — the tiny toolbox everything else stands on.
   Math, easing, noise, colour and the "score" helpers that lock pictures to
   the soundtrack.  Nothing here holds state: every animation is a pure
   function of time, so any frame can be rendered on its own.
   ========================================================================== */
const W = 1920, H = 1080, TAU = Math.PI * 2, PI = Math.PI;
const FPS = 60;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const unlerp = (a, b, x) => clamp((x - a) / (b - a));
const remap = (x, a, b, c, d) => lerp(c, d, unlerp(a, b, x));
const smooth = (a, b, x) => { const t = unlerp(a, b, x); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = unlerp(a, b, x); return t * t * t * (t * (t * 6 - 15) + 10); };
const mod = (a, n) => ((a % n) + n) % n;
const rad = d => d * PI / 180;
const deg = r => r * 180 / PI;
const sat = x => clamp(x, 0, 1);

/* ---- easing ------------------------------------------------------------- */
const E = {
  lin: t => t,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: t => t ** 4, outQuart: t => 1 - Math.pow(1 - t, 4),
  inOutQuart: t => (t < .5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: t => t ** 5, outQuint: t => 1 - Math.pow(1 - t, 5),
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  inCirc: t => 1 - Math.sqrt(1 - t * t), outCirc: t => Math.sqrt(1 - (t - 1) * (t - 1)),
  inBack: (t, s = 1.70158) => t * t * ((s + 1) * t - s),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inOutBack: (t, s = 1.70158 * 1.525) => (t < .5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2),
  outElastic: (t, p = .35) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - p / 4) * TAU / p) + 1),
  outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
  /* critically-tuned damped spring that settles to 1 (overshoots on the way) */
  spring: (t, f = 2.2, d = 5.5) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(f * TAU * t)),
  /* 0→1→0 bump */
  bump: t => Math.sin(clamp(t) * PI),
  /* eases with a step-y stutter (used for the chain-lift clacks) */
  steps: (t, n) => Math.floor(t * n) / n,
};
/* ease a clamped local time */
const ez = (fn, a, b, t) => fn(unlerp(a, b, t));

/* ---- random ------------------------------------------------------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
const hash2 = (a, b) => hash1(a * 57.31 + b * 113.97 + 7.7);
const hash3 = (a, b, c) => hash1(a * 57.31 + b * 113.97 + c * 29.13 + 3.3);

/* smooth value noise + fbm */
function vnoise(x, y = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
function fbm(x, y = 0, oct = 4) {
  let s = 0, a = .5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= .5; }
  return s;
}

/* ---- colour ------------------------------------------------------------- */
const C = {
  ink: '#0a0620', night: '#150a3d', plum: '#2b0d63', violet: '#7a4dff', indigo: '#3b2bd9',
  mag: '#ff2e93', pink: '#ff7ac6', cyan: '#1fe4ff', ice: '#9af3ff', lime: '#c8ff2e',
  yellow: '#ffe14a', orange: '#ff7a2e', coral: '#ff5a5f', white: '#fff6e8', cream: '#ffeecf',
};
const _rgb = {};
function rgb(hex) {
  if (_rgb[hex]) return _rgb[hex];
  const h = hex.replace('#', '');
  return (_rgb[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
}
function rgba(hex, a = 1) { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function mixc(a, b, t, al = 1) {
  const p = rgb(a), q = rgb(b);
  return `rgba(${Math.round(lerp(p[0], q[0], t))},${Math.round(lerp(p[1], q[1], t))},${Math.round(lerp(p[2], q[2], t))},${al})`;
}
function hsl(h, s, l, a = 1) { return `hsla(${mod(h, 360)},${s}%,${l}%,${a})`; }
/* pick from the palette by index (wraps) */
const POP = [C.mag, C.cyan, C.yellow, C.lime, C.orange, C.violet, C.pink];
const pop = i => POP[mod(Math.floor(i), POP.length)];

/* ---- vec helpers -------------------------------------------------------- */
const v3 = (x, y, z) => [x, y, z];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = a => Math.hypot(a[0], a[1], a[2]);
const norm3 = a => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function rot3(v, axis, ang) { /* Rodrigues */
  const c = Math.cos(ang), s = Math.sin(ang), k = axis, d = dot3(k, v), x = cross3(k, v);
  return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
}

/* ==========================================================================
   SCORE — the soundtrack's hit list (generated by make_audio.py)
   ========================================================================== */
const SC = window.SCORE;
const BPM = SC.bpm, BEAT = SC.beat, BAR = SC.bar, DUR = SC.duration;
const EVT = {};
for (const k in SC.events) EVT[k] = SC.events[k].map(e => e[0]).sort((a, b) => a - b);

/* index of last event <= t (or -1) */
function lastIdx(arr, t) {
  let lo = 0, hi = arr.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
/* seconds since the last `name` event (Infinity before the first) */
function since(name, t) { const a = EVT[name], i = lastIdx(a, t); return i < 0 ? Infinity : t - a[i]; }
/* seconds until the next `name` event */
function until(name, t) { const a = EVT[name], i = lastIdx(a, t); return i + 1 >= a.length ? Infinity : a[i + 1] - t; }
/* how many `name` events have fired by t */
function count(name, t) { return lastIdx(EVT[name], t) + 1; }
/* exponential pulse: 1 on the hit, decaying */
function pulse(name, t, decay = .12) { const s = since(name, t); return s === Infinity ? 0 : Math.exp(-s / decay); }
/* pulse that also *anticipates* (rises before the hit) */
function swell(name, t, lead = .08, decay = .14) {
  const u = until(name, t), s = since(name, t);
  const a = u < lead ? 1 - u / lead : 0;
  const b = s === Infinity ? 0 : Math.exp(-s / decay);
  return Math.max(a * .6, b);
}
/* several events at once */
function pulseAny(names, t, decay = .12) { let m = 0; for (const n of names) m = Math.max(m, pulse(n, t, decay)); return m; }
/* measured band energy of the real mix, 0..~1 */
function band(name, t) {
  const b = SC.env.bands[name], r = SC.env.rate, x = clamp(t * r, 0, b.length - 1.001), i = Math.floor(x);
  return lerp(b[i], b[i + 1], x - i);
}
const beatOf = t => t / BEAT;
const barOf = t => t / BAR;
/* triangle-ish beat phase 0..1 */
const bph = t => mod(t / BEAT, 1);
/* where are we relative to the two "hangs"? */
function hangAmt(t) { /* 0..1 inside a hang (silence at the top of the hill) */
  for (const [a, b] of SC.hang) if (t >= a && t < b) return 1;
  return 0;
}

/* section lookup */
function section(t) { for (const s of SC.sections) if (t >= s.t0 && t < s.t1) return s.name; return 'station'; }

/* utility to make quick seeded arrays */
function seeded(seed, n, fn) { const r = mulberry32(seed); return Array.from({ length: n }, (_, i) => fn(r, i)); }
