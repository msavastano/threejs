'use strict';
/* ==========================================================================
   timeline.js — the edit.
   Shot list (cut on the beat), transitions, the always-on HUD (a tiny
   coaster whose track profile IS the structure of this reel), and the
   per-frame post parameters driven by the soundtrack.
   ========================================================================== */
const SCENES = {};          // id -> draw(c, lt, t, shot)

const B_ = n => n * BEAT;
/* B(bar, beat) helper for readability */
const at = (bar, beat = 0) => (bar * 4 + beat) * BEAT;

const SHOT_LIST = [
  { id: 'climb',   t0: at(0),       t1: at(3),       label: 'CHARACTER ANIMATION', tr: null },
  { id: 'fpv1',    t0: at(3),       t1: at(4),       label: 'PROCEDURAL 3D',        tr: { kind: 'whip', dir: 'D', dur: .18 } },
  { id: 'type',    t0: at(4),       t1: at(5),          label: 'KINETIC TYPE',         tr: { kind: 'slats', dur: .24 } },
  { id: 'air',     t0: at(5),       t1: at(6),       label: 'SOFT BODIES',          tr: { kind: 'zoom', dur: .28 } },
  { id: 'build',   t0: at(6),       t1: at(7),       label: 'TENSION',              tr: { kind: 'whip', dir: 'L', dur: .2 } },
  { id: 'geo',     t0: at(7),       t1: at(7, 2),    label: 'GEOMETRY',             tr: { kind: 'flash', dur: .16 } },
  { id: 'kaleido', t0: at(7, 2),    t1: at(8),       label: 'SYMMETRY',             tr: { kind: 'iris', dur: .2 } },
  { id: 'voxel',   t0: at(8),       t1: at(8, 2),    label: 'SOLID 3D',             tr: { kind: 'whip', dir: 'R', dur: .16 } },
  { id: 'fpv2',    t0: at(8, 2),    t1: at(9),       label: 'CORKSCREW',            tr: { kind: 'zoom', dur: .16 } },
  { id: 'panels',  t0: at(9),       t1: at(9, 2),    label: 'UI · DATA',            tr: { kind: 'glitch', dur: .2 } },
  { id: 'faces',   t0: at(9, 2),    t1: at(10),      label: 'CHARACTER ACTING',     tr: { kind: 'slats', dur: .1, vertical: false } },
  { id: 'map',     t0: at(10),      t1: at(11),      label: 'ALL AT ONCE',          tr: { kind: 'whip', dir: 'U', dur: .16 } },
  { id: 'end',     t0: at(11),      t1: DUR + 1,     label: '',                     tr: { kind: 'flash', dur: .3 } },
];
SHOT_LIST.forEach((s, i) => { s.i = i; s.dur = s.t1 - s.t0; });

function shotAt(t) {
  for (let i = SHOT_LIST.length - 1; i >= 0; i--) if (t >= SHOT_LIST[i].t0 - 1e-9) return SHOT_LIST[i];
  return SHOT_LIST[0];
}

/* ---- layers for transitions ---- */
function mkLayer() { const cv_ = document.createElement('canvas'); cv_.width = W; cv_.height = H; return { cv: cv_, c: cv_.getContext('2d') }; }
const LA = mkLayer(), LB = mkLayer();

function stub(c, lt, t, s) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, C.plum); g.addColorStop(1, C.ink);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  FONT.drawText(c, s.id.toUpperCase(), W / 2, H / 2, 200, { wt: .22, color: pop(s.i) });
}

function drawShot(c, shot, t) {
  const fn = SCENES[shot.id] || stub;
  c.save();
  fn(c, t - shot.t0, t, shot);
  c.restore();
}

/* ---- transitions -------------------------------------------------------- */
const DIRS = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
const TRANS = {
  whip(c, A, B, p, o) {
    const d = DIRS[o.dir || 'L'];
    const dist = d[0] ? W : H;
    const e = E.inOutCubic(p);
    const off = e * dist * 1.04;
    const spread = dist * .30 * Math.sin(PI * p);
    const K = 12;
    for (let k = 0; k < K; k++) {
      const s = (k / (K - 1) - .5) * spread;
      c.globalAlpha = 1 / (k + 1);
      c.drawImage(A.cv, d[0] * (off + s), d[1] * (off + s));
    }
    for (let k = 0; k < K; k++) {
      const s = (k / (K - 1) - .5) * spread;
      c.globalAlpha = 1 / (k + 1);
      c.drawImage(B.cv, d[0] * (off - dist * 1.04 + s), d[1] * (off - dist * 1.04 + s));
    }
    c.globalAlpha = 1;
  },
  zoom(c, A, B, p) {
    /* push-through: the old shot rushes past the lens, the new one settles in from just outside frame */
    const e = E.inCubic(p), K = 8;
    for (let k = 0; k < K; k++) {
      const s = lerp(1, 2.8, e) * (1 + k * .014 * e * 6);
      c.globalAlpha = (1 - e) / (K * .5);
      c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(A.cv, 0, 0); c.restore();
    }
    const s2 = lerp(1.45, 1, E.outCubic(p));
    c.globalAlpha = smooth(.05, .6, p);
    c.save(); c.translate(W / 2, H / 2); c.scale(s2, s2); c.translate(-W / 2, -H / 2); c.drawImage(B.cv, 0, 0); c.restore();
    c.globalAlpha = 1;
  },
  flash(c, A, B, p) {
    c.drawImage(B.cv, 0, 0);
    c.fillStyle = `rgba(255,246,232,${Math.pow(1 - p, 2.2) * .95})`;
    c.fillRect(0, 0, W, H);
  },
  iris(c, A, B, p) {
    c.drawImage(A.cv, 0, 0);
    const r = E.inOutCubic(p) * Math.hypot(W, H) * .56;
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.clip(); c.drawImage(B.cv, 0, 0); c.restore();
    c.lineWidth = 26 * (1 - p); c.strokeStyle = C.yellow; c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke();
  },
  slats(c, A, B, p, o) {
    c.drawImage(A.cv, 0, 0);
    const N = 10, vert = o.vertical !== false;
    for (let i = 0; i < N; i++) {
      const q = E.outCubic(unlerp(i / N * .5, i / N * .5 + .5, p));
      c.save();
      c.beginPath();
      if (vert) c.rect(W / N * i, 0, W / N * q + 1, H); else c.rect(0, H / N * i, W, H / N * q + 1);
      c.clip(); c.drawImage(B.cv, 0, 0); c.restore();
      if (q > 0 && q < 1) {
        c.fillStyle = pop(i + 1);
        if (vert) c.fillRect(W / N * i + W / N * q, 0, 10, H); else c.fillRect(0, H / N * i + H / N * q, W, 10);
      }
    }
  },
  glitch(c, A, B, p) {
    const S = 22;
    for (let i = 0; i < S; i++) {
      const y0 = Math.floor(H / S * i), h = Math.ceil(H / S) + 1;
      const useB = hash2(i, Math.floor(p * 9)) < smooth(.05, .8, p);
      const dx = (hash2(i, Math.floor(p * 11) + 5) - .5) * 260 * Math.sin(PI * p);
      c.save(); c.beginPath(); c.rect(0, y0, W, h); c.clip();
      c.drawImage(useB ? B.cv : A.cv, dx, 0); c.restore();
    }
  },
  colorwipe(c, A, B, p) {
    const cols = [C.mag, C.yellow, C.cyan, C.ink];
    const src = p < .5 ? A : B;
    c.drawImage(src.cv, 0, 0);
    for (let i = 0; i < 4; i++) {
      const a = unlerp(i * .07, i * .07 + .5, p * 2 > 1 ? 1 : p * 2);
      const b = unlerp(i * .07 + .5, i * .07 + 1, p * 2 - 1 + .5 * 0 + .0);
      const x0 = p < .5 ? W * (1 - E.outCubic(a)) : 0;
      const x1 = p < .5 ? W : W * E.inCubic(unlerp(i * .07, i * .07 + .55, (p - .5) * 2));
      c.fillStyle = cols[i];
      c.fillRect(x0, 0, x1 - x0, H);
    }
  },
};

/* ---- the always-on HUD: a tiny coaster whose track IS the reel's structure -- */
const HUD_PTS = [
  [0, .10], [1.6, .40], [3.33, 1.0], [3.62, .92], [4.3, .34], [5.0, .06], [5.7, .22], [6.67, .08],
  [7.5, .34], [8.33, .10], [9.2, .62], [10.0, .12], [11.0, .55], [11.67, .95], [12.0, .8], [13.33, .05],
  [14.2, .3], [15.0, .08], [15.9, .36], [16.67, .08], [17.5, .44], [18.33, .04], [19.2, .05], [20, .05],
];
function catmull(pts, u) { /* u: index in [0, n-1] */
  const n = pts.length, i = Math.min(n - 2, Math.max(0, Math.floor(u))), f = u - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
  const cr = (a, b, c_, d) => .5 * ((2 * b) + (-a + c_) * f + (2 * a - 5 * b + 4 * c_ - d) * f * f + (-a + 3 * b - 3 * c_ + d) * f * f * f);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
const HUD_CURVE = (() => { /* dense polyline, x = time */
  const out = [], n = HUD_PTS.length;
  for (let u = 0; u <= n - 1.0001; u += .04) out.push(catmull(HUD_PTS, u));
  return out;
})();
function hudHeight(t) {
  const c = HUD_CURVE;
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m][0] <= t) lo = m; else hi = m; }
  const f = unlerp(c[lo][0], c[hi][0], t);
  return lerp(c[lo][1], c[hi][1], f);
}

function drawHUD(c, t, shot) {
  const fadeOut = 1 - smooth(at(11) - .05, at(11) + .25, t);
  const fadeIn = smooth(.15, .6, t);
  const a = fadeOut * fadeIn;
  if (a <= 0.01) return;
  const x0 = 560, x1 = 1360, yb = 1036, hh = 64;
  c.save();
  c.globalAlpha = a;
  c.lineCap = 'round'; c.lineJoin = 'round';
  /* track (dim) */
  const sx = tt => x0 + (tt / DUR) * (x1 - x0), sy = h => yb - h * hh;
  c.strokeStyle = 'rgba(255,246,232,.28)'; c.lineWidth = 4;
  c.beginPath(); HUD_CURVE.forEach(([tt, h], i) => (i ? c.lineTo(sx(tt), sy(h)) : c.moveTo(sx(tt), sy(h)))); c.stroke();
  /* travelled part (lit) */
  const tc = clamp(t, 0, DUR);
  c.strokeStyle = C.yellow; c.lineWidth = 5;
  c.beginPath(); let first = true;
  for (const [tt, h] of HUD_CURVE) { if (tt > tc) break; first ? (c.moveTo(sx(tt), sy(h)), first = false) : c.lineTo(sx(tt), sy(h)); }
  c.lineTo(sx(tc), sy(hudHeight(tc))); c.stroke();
  /* beat ticks under the track */
  for (let b = 0; b <= 48; b++) {
    const bt = b * BEAT, x = sx(bt), major = b % 4 === 0;
    c.fillStyle = bt <= tc ? 'rgba(255,225,74,.9)' : 'rgba(255,246,232,.22)';
    c.fillRect(x - 1, yb + 10, 2, major ? 9 : 5);
  }
  /* cart */
  const h0 = hudHeight(tc - .05), h1 = hudHeight(tc + .05);
  const ang = Math.atan2(-(h1 - h0) * hh, sx(tc + .05) - sx(tc - .05));
  const cx = sx(tc), cy = sy(hudHeight(tc));
  c.translate(cx, cy); c.rotate(ang);
  const k = 1 + .18 * pulse('kick', t, .09);
  c.scale(k, k);
  c.fillStyle = C.mag; c.strokeStyle = C.ink; c.lineWidth = 3;
  c.beginPath(); c.roundRect(-14, -17, 28, 14, 5); c.fill(); c.stroke();
  c.fillStyle = C.cyan; c.beginPath(); c.arc(-6, -20, 4.5, 0, TAU); c.fill(); c.beginPath(); c.arc(6, -20, 4.5, 0, TAU); c.fill();
  c.fillStyle = C.white; c.beginPath(); c.arc(-8, -2, 3.5, 0, TAU); c.arc(8, -2, 3.5, 0, TAU); c.fill();
  c.restore();
  /* labels */
  c.save(); c.globalAlpha = a * .9;
  const secs = Math.floor(tc), fr = Math.floor((tc - secs) * FPS);
  FONT.drawText(c, `00:${String(secs).padStart(2, '0')}:${String(fr).padStart(2, '0')}`, x0 - 34, yb - 12, 24, { wt: .16, align: 'r', color: C.white, track: .1 });
  FONT.drawText(c, '144 BPM', x1 + 34, yb - 12, 24, { wt: .16, align: 'l', color: C.white, track: .1 });
  c.restore();
}

/* corner tag: slides in with every cut, names the technique on show */
function drawTag(c, t, shot) {
  if (!shot.label) return;
  const lt = t - shot.t0;
  const a = smooth(.02, .16, lt) * (1 - smooth(shot.dur - .1, shot.dur, lt)) * (1 - smooth(at(11) - .1, at(11), t));
  if (a <= 0.01) return;
  const slide = (1 - E.outBack(unlerp(0, .3, lt))) * -120;
  c.save();
  c.globalAlpha = a;
  c.translate(60 + slide, 62);
  const n = String(shot.i + 1).padStart(2, '0') + '/' + String(SHOT_LIST.length - 1);
  const nw = FONT.measure(n, 24, .16, .1);
  const tw = FONT.measure(shot.label, 26, .16, .12);
  const w = 26 + 22 + nw + 22 + tw + 30;
  c.fillStyle = 'rgba(10,6,32,.72)'; c.beginPath(); c.roundRect(0, -26, w, 52, 26); c.fill();
  c.strokeStyle = 'rgba(255,246,232,.25)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = pop(shot.i); c.beginPath(); c.arc(28, 0, 9, 0, TAU); c.fill();
  FONT.drawText(c, n, 52, 0, 24, { wt: .16, align: 'l', color: C.yellow, track: .1 });
  FONT.drawText(c, shot.label, 52 + nw + 22, 0, 26, { wt: .16, align: 'l', color: C.white, track: .12 });
  c.restore();
}

/* global camera: kick punch on drops, shake on impacts */
function globalCam(t) {
  const sec = section(t);
  const drop = (sec === 'drop1' || sec === 'drop2') ? 1 : 0;
  const k = pulse('kick', t, .07) * drop;
  const im = pulse('impact', t, .18);
  const shake = im * 16 + (sec === 'drop2' ? 2.2 : 0) * k;
  return {
    zoom: 1 + .012 * k + .05 * im,
    x: (hash1(t * 91.7) - .5) * 2 * shake,
    y: (hash1(t * 53.1 + 9) - .5) * 2 * shake,
    rot: (hash1(t * 37.3 + 3) - .5) * .012 * im,
  };
}

const TIMELINE = {
  draw(c, t) {
    const shot = shotAt(t);
    const lt = t - shot.t0;
    const g = globalCam(t);
    c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
    c.save();
    c.translate(W / 2 + g.x, H / 2 + g.y); c.rotate(g.rot); c.scale(g.zoom, g.zoom); c.translate(-W / 2, -H / 2);
    const tr = shot.tr;
    if (tr && lt < tr.dur) {
      const prev = SHOT_LIST[shot.i - 1];
      LA.c.setTransform(1, 0, 0, 1, 0, 0); LB.c.setTransform(1, 0, 0, 1, 0, 0);
      LA.c.globalAlpha = 1; LB.c.globalAlpha = 1;
      LA.c.clearRect(0, 0, W, H); LB.c.clearRect(0, 0, W, H);
      drawShot(LA.c, prev, t);
      drawShot(LB.c, shot, t);
      TRANS[tr.kind](c, LA, LB, lt / tr.dur, tr);
    } else drawShot(c, shot, t);
    c.restore();
    drawHUD(c, t, shot);
    drawTag(c, t, shot);
  },

  postParams(t) {
    const sec = section(t), shot = shotAt(t), lt = t - shot.t0;
    const drop = (sec === 'drop1' || sec === 'drop2') ? 1 : 0;
    const k = pulse('kick', t, .09) * drop;
    const im = pulse('impact', t, .10);
    const hang = hangAmt(t);
    const tr = shot.tr;
    let trG = 0;
    if (tr && lt < tr.dur) trG = Math.sin(PI * unlerp(0, tr.dur, lt));
    const isGlitch = tr && tr.kind === 'glitch' ? trG : 0;
    const startFade = smooth(0, .12, t);
    const endFade = 1 - smooth(DUR - .32, DUR, t) * .9;
    return {
      bloom: .78 + .3 * k + .6 * im,
      thr: .40,
      ca: .0016 + .0034 * k + .010 * im + .006 * trG,
      kick: .012 * k + .05 * im,
      glitch: Math.max(isGlitch * .9, .5 * im, hang * 0),
      vig: .34 + .3 * hang,
      grain: .038,
      flash: im * .55,
      flashCol: [1, .94, .86],
      sat: 1.1 - .45 * hang,
      contrast: 1.06 + .05 * hang,
      fade: startFade * endFade,
    };
  },
};
