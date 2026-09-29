'use strict';
/* ==========================================================================
   scenes_a.js — opening act: the FPV ride shots (procedural 3D)
   ========================================================================== */

/* piecewise-smooth 1D interpolation through [t, v] keys (Catmull-Rom in v) */
function keyInterp(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && keys[i + 1][0] < t) i++;
  const f = unlerp(keys[i][0], keys[i + 1][0], t);
  const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(n - 1, i + 2)][1];
  return .5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

/* the hands on the handles — every FPV shot shares them */
function drawLapBar(c, t, handsUp, tint) {
  const k = pulse('kick', t, .08);
  const up = E.outBack(clamp(handsUp));
  c.save();
  c.lineCap = 'round';
  for (const s of [-1, 1]) {
    const bx = W / 2 + s * 700, baseY = H - 46 + k * 5;
    const y = lerp(baseY, H + 330, up), rot = s * lerp(.1, .42, up);
    /* grab handle */
    c.globalAlpha = 1 - up;
    c.fillStyle = '#120a33'; c.beginPath(); c.roundRect(bx - 22 + s * 40, baseY - 10, 44, 150, 22); c.fill();
    c.fillStyle = tint || C.mag; c.beginPath(); c.roundRect(bx - 7 + s * 40, baseY, 8, 120, 4); c.fill();
    c.globalAlpha = 1;
    c.save(); c.translate(bx, y); c.rotate(rot);
    c.fillStyle = C.cream; c.strokeStyle = C.ink; c.lineWidth = 8;
    c.beginPath(); c.roundRect(-34, 30, 68, 420, 34); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 68, 60, 0, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 6;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 27, -36 + Math.abs(i) * 6, 17, 0, TAU); c.fill(); c.stroke(); }
    c.restore();
  }
  c.restore();
}

/* speed + G readout */
function drawSpeedHUD(c, t, kmh, g, label) {
  c.save();
  const x = W - 70, y = 96;
  FONT.drawText(c, String(Math.round(kmh)), x - 150, y, 78, { wt: .2, align: 'r', color: C.white, outline: { w: 5, color: C.ink } });
  FONT.drawText(c, 'KM/H', x, y + 22, 26, { wt: .16, align: 'r', color: C.yellow, track: .14 });
  /* g meter */
  const gy = y + 74;
  c.fillStyle = 'rgba(10,6,32,.7)'; c.beginPath(); c.roundRect(x - 330, gy, 330, 26, 13); c.fill();
  const gf = clamp((g + 1) / 6);
  const grad = c.createLinearGradient(x - 330, 0, x, 0); grad.addColorStop(0, C.cyan); grad.addColorStop(.5, C.yellow); grad.addColorStop(1, C.mag);
  c.fillStyle = grad; c.beginPath(); c.roundRect(x - 326, gy + 4, Math.max(18, 322 * gf), 18, 9); c.fill();
  FONT.drawText(c, g.toFixed(1) + ' G', x - 340, gy + 13, 24, { wt: .16, align: 'r', color: C.white, track: .12 });
  c.restore();
}

/* One FPV render pass.  s = arclength on the track, v = speed in units/s */
function fpvRender(c, s, v, t, o = {}) {
  const kick = pulse('kick', t, .1);
  const fov = (o.fov || 84) + kick * 2.5 + clamp(v / 140) * 8;
  const cam = G3.cartCam(s, { fov, look: o.look || 18, lift: 1.3, anticip: .55 });
  const sk = G3.sky(c, cam, Object.assign({ gnd: '#170a44', haze: 'rgba(255,90,160,.7)' }, o.sky));
  c.globalCompositeOperation = 'source-over';
  G3.sun(c, cam, [.05, .16, 1], 150, sk);
  c.globalCompositeOperation = 'lighter';
  G3.grid(c, cam, { spacing: 12, alpha: .8, colA: o.gridA || C.violet, colB: o.gridB || C.cyan });
  G3.city(c, cam, {});
  G3.dust(c, cam, s, v);
  G3.gates(c, cam, s, { every: o.gateEvery || 46, pulse: kick });
  G3.track(c, cam, s - 30, s + 300, { tie: 2.6, pulse: kick, tint: o.tint, width: 1.5 });
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  return cam;
}

/* ---- SHOT: fpv1  (drop → loop) ------------------------------------------- */
const FPV1_S = [[0, 24], [.28, 52], [.6, 92], [.82, 118], [1.05, 141], [1.3, 168], [1.5, 196], [1.67, 232]];
SCENES.fpv1 = function (c, lt, t, S) {
  const s = keyInterp(FPV1_S, lt);
  const v = (keyInterp(FPV1_S, lt + .02) - keyInterp(FPV1_S, lt - .02)) / .04;
  const cam = fpvRender(c, s, v, t, {});
  /* roller-coaster “g-force” vignette squeeze at the bottom of the drop */
  const bottom = Math.exp(-Math.pow((s - G3.S.bottom) / 16, 2));
  if (bottom > .05) {
    const g = c.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .85);
    g.addColorStop(0, 'rgba(10,6,32,0)'); g.addColorStop(1, `rgba(10,6,32,${bottom * .75})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  drawLapBar(c, t, unlerp(.95, 1.15, lt) * 0, C.mag);
  drawSpeedHUD(c, t, 40 + v * .85, 1 + bottom * 4.2 + (s > G3.S.loopStart ? 1.5 : 0), 'FPV');
};
SHOT_LIST.find(s => s.id === 'fpv1').sub = 6;

/* ---- SHOT: fpv2  (corkscrew) ---------------------------------------------- */
const FPV2_S = [[0, 566], [.2, 588], [.45, 622], [.7, 662], [.83, 686]];
SCENES.fpv2 = function (c, lt, t, S) {
  const s = keyInterp(FPV2_S, lt);
  const v = (keyInterp(FPV2_S, lt + .02) - keyInterp(FPV2_S, lt - .02)) / .04;
  fpvRender(c, s, v, t, { tint: [C.lime, C.orange, '#ffd98a'], sky: { hor: '#ffb14a', mid: '#7a2a8a', top: '#0f0a3a' }, gridA: C.cyan, gridB: C.violet });
  drawLapBar(c, t, unlerp(.08, .3, lt), C.lime);
  drawSpeedHUD(c, t, 40 + v * .85, 2.2 + Math.sin(lt * 14) * 1.2, 'FPV');
};
SHOT_LIST.find(s => s.id === 'fpv2').sub = 6;
