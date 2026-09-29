'use strict';
/* ==========================================================================
   scenes_c.js — the second drop, part 1
     geo      11.67–12.50   a grid of shapes that morph in a travelling wave
     kaleido  12.50–13.33   12-fold mirror symmetry, driven by the beat
     voxel    13.33–14.17   a 5×5×5 cube that breathes on every stab
   ========================================================================== */

/* -------------------------------- GEOMETRY -------------------------------- */
const polyR = (n, th) => { const a = TAU / n, x = mod(th + a / 2, a) - a / 2; return Math.cos(a / 2) / Math.cos(x); };
const starR = th => { const a = TAU / 10, x = mod(th, a) / a; return .42 + .58 * (x < .5 ? x * 2 : 2 - x * 2); };
const SHAPES = [th => polyR(3, th - PI / 2) * 1.02, th => polyR(4, th - PI / 4) * .98, th => polyR(6, th) * .98, th => .93, th => starR(th - PI / 2) * 1.08];
function shapeRadius(k, th) {
  const n = SHAPES.length, i = Math.floor(k) % n, f = k - Math.floor(k), j = (i + 1) % n;
  const e = f * f * (3 - 2 * f);
  return lerp(SHAPES[i](th), SHAPES[j](th), e);
}
function drawMorph(c, x, y, r, k, rot, fill, stroke) {
  c.beginPath();
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const th = TAU * i / N, rr = shapeRadius(k, th) * r;
    const px = x + Math.cos(th + rot) * rr, py = y + Math.sin(th + rot) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); }
}

SCENES.geo = function (c, lt, t) {
  c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
  const cols = 12, rows = 7, cell = 160, ox = (W - cols * cell) / 2 + cell / 2, oy = (H - rows * cell) / 2 + cell / 2 + 4;
  const stabs = count('stab', t), sp = pulse('stab', t, .14), kk = pulse('kick', t, .1);
  /* radiating background bands */
  for (let i = 0; i < 6; i++) {
    const r = ((t * 900 + i * 420) % 2400);
    c.strokeStyle = `rgba(122,77,255,${.22 * (1 - r / 2400)})`; c.lineWidth = 60;
    c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke();
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = ox + i * cell, cy = oy + j * cell;
    const dx = i - (cols - 1) / 2, dy = j - (rows - 1) / 2, d = Math.hypot(dx, dy * 1.05);
    const enter = E.outBack(clamp((lt - d * .028) / .22), 2.2);
    if (enter <= 0) continue;
    const wave = t * 3.4 - d * .55;
    const kind = mod(wave * .7, SHAPES.length);
    const rot = Math.sin(wave) * .6 + stabs * .5;
    const scale = (.62 + .26 * (.5 + .5 * Math.sin(wave * 1.3)) + .18 * sp * Math.cos(d - t * 9)) * enter * (1 + .05 * kk);
    const ci = Math.floor(d) - stabs;
    const col = pop(ci + (j + i) % 2 * 0);
    drawMorph(c, cx, cy, cell * .5 * scale, kind, rot, col, C.ink);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(cx - cell * .12 * scale, cy - cell * .14 * scale, cell * .05 * scale, 0, TAU); c.fill();
  }
  /* a big shockwave on each stab */
  const cs = since('stab', t);
  if (cs < .4) { c.strokeStyle = `rgba(255,246,232,${1 - cs / .4})`; c.lineWidth = 40 * (1 - cs / .4); c.beginPath(); c.arc(W / 2, H / 2, cs * 2600, 0, TAU); c.stroke(); }
};
SHOT_LIST.find(s => s.id === 'geo').sub = 4;

/* ------------------------------- KALEIDOSCOPE ------------------------------ */
const KN = 12;
function kaleidoWedge(c, t, lt, R) {
  const A = TAU / KN;
  const kick = pulse('kick', t, .1), acid = pulse('acid', t, .09);
  /* petals: wavy stripes flowing outward */
  for (let s = 0; s < 4; s++) {
    c.strokeStyle = pop(s * 2 + 1); c.lineWidth = 34 - s * 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (let r = 30; r < R; r += 14) {
      const th = A / 2 + (A * .38) * Math.sin(r * .011 - t * (3 + s) + s * 1.7);
      const x = Math.cos(th) * r, y = Math.sin(th) * r;
      r === 30 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
  }
  /* orbiting beads */
  for (let i = 0; i < 26; i++) {
    const base = hash1(i * 3.7), r = 90 + base * (R - 120) + Math.sin(t * 2 + i) * 30 + kick * 24;
    const tri = x => Math.abs(mod(x, 2) - 1);
    const th = tri(hash1(i * 5.1) * 2 + t * (.3 + hash1(i * 9.9) * .5)) * A;
    const rr = (10 + hash1(i * 2.2) * 34) * (1 + .5 * kick);
    c.fillStyle = pop(i); c.strokeStyle = C.ink; c.lineWidth = 4;
    c.beginPath(); c.arc(Math.cos(th) * r, Math.sin(th) * r, rr, 0, TAU); c.fill(); c.stroke();
  }
  /* facets */
  for (let i = 0; i < 9; i++) {
    const r0 = 60 + i * (R / 9), r1 = r0 + R / 9 * .8;
    const a0 = A * (.15 + .1 * Math.sin(t * 2 + i)), a1 = A * (.85 - .1 * Math.cos(t * 2.3 + i));
    c.fillStyle = rgba(pop(i * 3 + 2), .32 + .3 * acid);
    c.beginPath(); c.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); c.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1); c.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); c.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0); c.closePath(); c.fill();
  }
}
SCENES.kaleido = function (c, lt, t) {
  const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) * .58;
  const bg = c.createRadialGradient(cx, cy, 30, cx, cy, R);
  bg.addColorStop(0, '#5a1fb0'); bg.addColorStop(.5, '#22095c'); bg.addColorStop(1, '#0a0620');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const kick = pulse('kick', t, .1);
  const zoom = 1.12 + .07 * kick + .5 * (1 - E.outCubic(clamp(lt / .3)));
  c.save(); c.translate(cx, cy); c.rotate(t * .42 + lt * 1.2); c.scale(zoom, zoom);
  const A = TAU / KN;
  for (let i = 0; i < KN; i++) {
    c.save(); c.rotate(i * A); if (i % 2) c.scale(1, -1);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(R, 0); c.arc(0, 0, R, 0, A); c.closePath(); c.clip();
    kaleidoWedge(c, t, lt, R);
    c.restore();
  }
  c.restore();
  /* jewel in the centre */
  c.save(); c.translate(cx, cy); c.rotate(-t * 1.2);
  const jr = 92 * (1 + .16 * kick);
  for (let k = 0; k < 3; k++) {
    c.rotate(TAU / 24); c.fillStyle = k % 2 ? C.yellow : C.mag; c.strokeStyle = C.ink; c.lineWidth = 6;
    c.beginPath(); for (let j = 0; j < 12; j++) { const a = TAU * j / 12, rr = j % 2 ? jr * .5 : jr * (1 - k * .16); j ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(rr, 0); } c.closePath(); c.fill(); c.stroke();
  }
  c.fillStyle = C.white; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill();
  c.restore();
};
SHOT_LIST.find(s => s.id === 'kaleido').sub = 4;

/* --------------------------------- VOXEL ---------------------------------- */
function rotXYZ(p, yaw, pitch) {
  let [x, y, z] = p;
  const cy = Math.cos(yaw), sy = Math.sin(yaw); [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cp = Math.cos(pitch), sp = Math.sin(pitch); [y, z] = [y * cp - z * sp, y * sp + z * cp];
  return [x, y, z];
}
const CUBE_F = [
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] }, { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] }, { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] }, { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
];
SCENES.voxel = function (c, lt, t) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12073a'); g.addColorStop(1, '#3a1180');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  /* huge outlined "3D" behind */
  c.save(); c.translate(W / 2, H / 2); c.rotate(-.06);
  FONT.drawText(c, '3D', 0, 0, 880, { wt: .05, color: 'rgba(255,225,74,.28)' });
  c.restore();
  const n = 5, sp = 2.3, half = (n - 1) / 2;
  const yaw = lt * 2.6 + .5, pitch = .62 + Math.sin(lt * 4) * .12;
  const stab = pulse('stab', t, .13);
  const explode = 1 + .3 * stab + .1 * pulse('kick', t, .1);
  const dist = 24 - 4 * E.outCubic(clamp(lt / .3)), f = 1500;
  const quads = [];
  const L = norm3([.5, .9, -.7]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    const w = .5 + .5 * Math.sin(t * 8 - (i + j + k) * 1.1);
    const s = (.14 + .34 * Math.pow(w, 1.4)) * E.outBack(clamp((lt - (i + j + k) * .012) / .2), 2);
    const cxyz = [(i - half) * sp * explode, (j - half) * sp * explode, (k - half) * sp * explode];
    const col = mixc(C.mag, C.cyan, (j + i * .3 + k * .2) / (n * 1.5));
    for (const face of CUBE_F) {
      const nrm = rotXYZ(face.n, yaw, pitch);
      if (nrm[2] > 0) continue;                                  // back-face
      const vs = face.v.map(v => rotXYZ([cxyz[0] + v[0] * s, cxyz[1] + v[1] * s, cxyz[2] + v[2] * s], yaw, pitch));
      const zc = (vs[0][2] + vs[1][2] + vs[2][2] + vs[3][2]) / 4;
      quads.push({ vs, zc, sh: .5 + .5 * Math.max(0, dot3(nrm, L)), col, hot: w > .82 });
    }
  }
  quads.sort((a, b) => b.zc - a.zc);
  c.lineJoin = 'round';
  for (const q of quads) {
    c.beginPath();
    q.vs.forEach((v, i) => { const z = v[2] + dist, px = W / 2 + v[0] * f / z, py = H / 2 - 20 + v[1] * f / z; i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.closePath();
    const rgb = q.col.match(/\d+/g).map(Number);
    const sh = q.sh;
    const br = .32 + .62 * sh;
    c.fillStyle = `rgb(${Math.round(rgb[0] * br)},${Math.round(rgb[1] * br)},${Math.round(rgb[2] * br)})`;
    c.fill();
    c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
    if (q.hot) { c.fillStyle = 'rgba(255,246,232,.32)'; c.fill(); }
  }
  /* floor glow */
  const fg = c.createRadialGradient(W / 2, H - 30, 20, W / 2, H - 30, 560);
  fg.addColorStop(0, 'rgba(255,46,147,.35)'); fg.addColorStop(1, 'rgba(255,46,147,0)');
  c.fillStyle = fg; c.fillRect(0, H - 400, W, 400);
};
SHOT_LIST.find(s => s.id === 'voxel').sub = 4;
