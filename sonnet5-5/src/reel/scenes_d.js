'use strict';
/* ==========================================================================
   scenes_d.js — the second drop, part 2 and the station
     panels   15.00–15.83   a control room: gauge · equalizer · scope · bouncing ball
     faces    15.83–16.67   four extreme close-ups, cut on eighth notes
     map      16.67–18.33   the whole ride at once, three comets racing round it
     end      18.33–20.00   the cart brakes into the station · AGAIN?
   ========================================================================== */

/* ---------------------------------- PANELS --------------------------------- */
function panelFrame(c, x, y, w, h, col, label, idx, lt, t) {
  const k = pulse('kick', t, .09);
  c.save();
  c.fillStyle = 'rgba(19,9,58,.94)'; c.beginPath(); c.roundRect(x, y, w, h, 34); c.fill();
  c.strokeStyle = mixc(col, '#ffffff', k * .8); c.lineWidth = 5 + 3 * k; c.stroke();
  /* faint grid */
  c.strokeStyle = 'rgba(255,246,232,.06)'; c.lineWidth = 2;
  for (let gx = x + 40; gx < x + w; gx += 60) { c.beginPath(); c.moveTo(gx, y + 60); c.lineTo(gx, y + h - 14); c.stroke(); }
  for (let gy = y + 70; gy < y + h; gy += 60) { c.beginPath(); c.moveTo(x + 14, gy); c.lineTo(x + w - 14, gy); c.stroke(); }
  /* header */
  c.fillStyle = col; c.beginPath(); c.arc(x + 40, y + 38, 10 + 3 * k, 0, TAU); c.fill();
  FONT.drawText(c, label, x + 64, y + 38, 27, { wt: .16, align: 'l', color: C.white, track: .16 });
  FONT.drawText(c, String(idx).padStart(2, '0'), x + w - 30, y + 38, 27, { wt: .16, align: 'r', color: col, track: .1 });
  c.restore();
}

function gaugePanel(c, x, y, w, h, t, lt) {
  const cx = x + w * .33, cy = y + h * .66, R = 150;
  const low = band('low', t), v = clamp(.18 + low * .62 + .12 * Math.sin(t * 9), 0, 1);
  const ent = E.outBack(clamp(lt / .3), 1.8);
  const a0 = rad(140), a1 = rad(400);
  c.save(); c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,246,232,.14)'; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, R, a0, a1); c.stroke();
  const gr = c.createLinearGradient(cx - R, cy, cx + R, cy); gr.addColorStop(0, C.cyan); gr.addColorStop(.55, C.yellow); gr.addColorStop(1, C.mag);
  c.strokeStyle = gr; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, R, a0, lerp(a0, a1, v * ent)); c.stroke();
  for (let i = 0; i <= 26; i++) {
    const a = lerp(a0, a1, i / 26), r0 = R + 26, r1 = R + (i % 5 === 0 ? 50 : 38);
    c.strokeStyle = i % 5 === 0 ? C.white : 'rgba(255,246,232,.45)'; c.lineWidth = i % 5 === 0 ? 5 : 3;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
  }
  /* needle with overshoot + tremor */
  const na = lerp(a0, a1, clamp(v * ent + Math.sin(t * 70) * .006));
  c.strokeStyle = C.white; c.lineWidth = 9; c.beginPath(); c.moveTo(cx - Math.cos(na) * 28, cy - Math.sin(na) * 28); c.lineTo(cx + Math.cos(na) * (R - 6), cy + Math.sin(na) * (R - 6)); c.stroke();
  c.fillStyle = C.mag; c.beginPath(); c.arc(cx, cy, 20, 0, TAU); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 5; c.stroke();
  c.restore();
  FONT.drawText(c, (1 + v * 5.6).toFixed(1), x + w * .8, y + h * .5, 132, { wt: .22, align: 'c', color: C.white });
  FONT.drawText(c, 'G', x + w * .8 + 158, y + h * .5 + 46, 54, { wt: .2, align: 'l', color: C.yellow });
  FONT.drawText(c, 'PEAK LOAD', x + w * .8, y + h * .5 + 118, 26, { wt: .16, align: 'c', color: C.mag, track: .22 });
}

function eqPanel(c, x, y, w, h, t, lt) {
  const n = 30, bw = (w - 90) / n, base = y + h - 34, maxH = h - 130;
  const val = (i, tt) => {
    const u = i / (n - 1);
    const b = lerp(lerp(band('low', tt), band('mid', tt), smooth(0, .5, u)), band('high', tt), smooth(.5, 1, u));
    return clamp(.1 + .75 * b + .28 * (vnoise(i * .9, tt * 9) * .5 + .5) * (.4 + b), 0, 1);
  };
  for (let i = 0; i < n; i++) {
    const ent = E.outBack(clamp((lt - i * .004) / .25), 2);
    const hh = val(i, t) * maxH * ent;
    let pk = 0; for (let k = 0; k < 9; k++) pk = Math.max(pk, val(i, t - k * .028) - k * .028 * 1.1);
    const bx = x + 46 + i * bw;
    const g = c.createLinearGradient(0, base, 0, base - maxH); g.addColorStop(0, C.cyan); g.addColorStop(.6, C.lime); g.addColorStop(1, C.yellow);
    c.fillStyle = g; c.beginPath(); c.roundRect(bx, base - hh, bw - 6, Math.max(8, hh), 6); c.fill();
    c.fillStyle = C.white; c.fillRect(bx, base - pk * maxH * ent - 12, bw - 6, 6);
  }
}

function scopePanel(c, x, y, w, h, t, lt) {
  const cy = y + h * .58, amp = h * .3;
  const all = band('all', t);
  c.save(); c.beginPath(); c.rect(x + 20, y + 60, w - 40, h - 80); c.clip();
  const path = () => {
    c.beginPath();
    for (let px = 0; px <= w - 60; px += 4) {
      const u = px / (w - 60), xx = x + 30 + px;
      const tt = t - (1 - u) * .05 * 2;
      const y_ = Math.sin(u * 22 + t * 30) * .55 + Math.sin(u * 51 - t * 44) * .3 + Math.sin(u * 9 + t * 7) * .4 + (vnoise(u * 40, t * 30)) * .25;
      const env = (.25 + .85 * band('all', tt)) * smooth(0, .12, u) * smooth(1, .88, u);
      const yy = cy + y_ * amp * env * E.outCubic(clamp(lt / .3));
      px === 0 ? c.moveTo(xx, yy) : c.lineTo(xx, yy);
    }
  };
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(31,228,255,.25)'; c.lineWidth = 22; path(); c.stroke();
  c.strokeStyle = 'rgba(31,228,255,.6)'; c.lineWidth = 10; path(); c.stroke();
  c.strokeStyle = C.white; c.lineWidth = 4; path(); c.stroke();
  /* trigger sweep */
  const sx = x + 30 + ((t * 620) % (w - 60));
  c.fillStyle = 'rgba(255,246,232,.35)'; c.fillRect(sx, y + 60, 6, h - 80);
  c.restore();
}

function ballPanel(c, x, y, w, h, t, lt) {
  const floor = y + h - 60, H_ = h - 190, cx = x + w / 2;
  const u = mod(t, BEAT) / BEAT;
  const hgt = 4 * u * (1 - u) * H_, vel = Math.abs(4 * (1 - 2 * u)) * H_ / BEAT;
  const r = 46;
  /* floor + shadow */
  c.strokeStyle = C.cream; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 40, floor); c.lineTo(x + w - 40, floor); c.stroke();
  const sh = 1 - hgt / H_ * .6;
  c.fillStyle = `rgba(0,0,0,${.35 * sh})`; c.beginPath(); c.ellipse(cx, floor + 16, r * 1.5 * sh, 10 * sh, 0, 0, TAU); c.fill();
  const drawBall = (bx, by, sx, sy, a) => {
    c.save(); c.globalAlpha = a; c.translate(bx, by); c.scale(sx, sy);
    const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1); g.addColorStop(0, '#ffb8de'); g.addColorStop(.5, C.mag); g.addColorStop(1, '#a30a5c');
    c.fillStyle = g; c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-r * .34, -r * .4, r * .17, r * .11, -.6, 0, TAU); c.fill();
    c.restore();
  };
  /* motion trail */
  for (let k = 5; k >= 1; k--) {
    const uk = mod(t - k * .012, BEAT) / BEAT, hk = 4 * uk * (1 - uk) * H_;
    drawBall(cx + Math.sin(t * 2.2 - k * .05) * 60, floor - r - hk, 1, 1 + .0, .07);
  }
  /* squash on contact, stretch in flight */
  const near = clamp(1 - hgt / 34), stretch = clamp(vel / (H_ / BEAT * 4)) * .3;
  const sx = 1 + .55 * near - stretch * .3, sy = 1 - .45 * near + stretch;
  const by = floor - r * sy - hgt;
  drawBall(cx + Math.sin(t * 2.2) * 60, by, sx, sy, 1);
  /* impact dust */
  const cs = mod(t, BEAT);
  if (cs < .16) for (let i = 0; i < 8; i++) {
    const dir = i < 4 ? -1 : 1, dd = 20 + (cs / .16) * (50 + i * 10);
    c.strokeStyle = `rgba(255,246,232,${1 - cs / .16})`; c.lineWidth = 6; c.beginPath();
    c.moveTo(cx + Math.sin(t * 2.2) * 60 + dir * dd, floor - 8 - (i % 4) * 8); c.lineTo(cx + Math.sin(t * 2.2) * 60 + dir * (dd + 24), floor - 12 - (i % 4) * 10); c.stroke();
  }
}

SCENES.panels = function (c, lt, t) {
  c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1a0a4a'); g.addColorStop(1, '#0a0620'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const gx = 70, gy = 118, pw = 880, ph = 418, gap = 24;
  const defs = [
    [gx, gy, C.mag, 'G-FORCE', 1, gaugePanel, -1, 0], [gx + pw + gap, gy, C.cyan, 'AUDIO', 2, eqPanel, 1, 0],
    [gx, gy + ph + gap, C.lime, 'SIGNAL', 3, scopePanel, -1, 0], [gx + pw + gap, gy + ph + gap, C.yellow, 'BOUNCE', 4, ballPanel, 1, 0],
  ];
  defs.forEach(([x, y, col, label, idx, fn, dir], i) => {
    const e = E.outExpo(clamp((lt - i * .045) / .24));
    const ox = dir * (1 - e) * 1400;
    c.save(); c.translate(ox, 0);
    const k = pulse('kick', t, .09);
    c.translate(x + pw / 2, y + ph / 2); c.scale(1 + .008 * k, 1 + .008 * k); c.translate(-(x + pw / 2), -(y + ph / 2));
    panelFrame(c, x, y, pw, ph, col, label, idx, lt, t);
    fn(c, x, y, pw, ph, t, lt - i * .045);
    c.restore();
  });
};
SHOT_LIST.find(s => s.id === 'panels').sub = 4;

/* ----------------------------------- FACES --------------------------------- */
const FACE_CUTS = [
  { r: 0, bg: C.mag, ring: C.pink, o: { fear: .15, scream: 1, squeeze: 1, wind: 1, joy: 0 }, roll: -.1 },
  { r: 1, bg: C.cyan, ring: C.white, o: { fear: 1, scream: .0, squeeze: 0, wind: .5, wob: 2.2, sweat: 1, teeth: true, lookX: .2, lookY: -.3 }, roll: .08 },
  { r: 2, bg: C.yellow, ring: C.orange, o: { fear: .1, scream: .85, squeeze: 1, wind: 1, joy: 1 }, roll: .12 },
  { r: -1, bg: C.orange, ring: C.yellow, o: {}, roll: 0 },
];
function faceBurst(c, cx, cy, t, col, ring) {
  c.save(); c.translate(cx, cy); c.rotate(t * .9);
  for (let i = 0; i < 22; i++) {
    c.rotate(TAU / 22);
    c.fillStyle = i % 2 ? col : ring; c.globalAlpha = i % 2 ? .0 : .55;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(2400, -110); c.lineTo(2400, 110); c.closePath(); c.fill();
  }
  c.restore();
}
SCENES.faces = function (c, lt, t) {
  const cutLen = BEAT / 2, k = clamp(Math.floor(lt / cutLen), 0, 3), cl = lt - k * cutLen;
  const F = FACE_CUTS[k];
  c.fillStyle = F.bg; c.fillRect(0, 0, W, H);
  faceBurst(c, W / 2, H / 2, t, F.bg, F.ring);
  /* wind streaks behind */
  c.strokeStyle = 'rgba(255,246,232,.6)'; c.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const sp = 6000 + hash1(i * 3.3 + k) * 9000, L = 300 + hash1(i * 1.7) * 700, off = hash1(i * 5.9 + k * 2) * (W + 2 * L);
    const x = W + L - ((lt * sp + off) % (W + 2 * L)), y = hash1(i * 7.3 + k) * H;
    c.lineWidth = 3 + hash1(i * 2.9) * 6; c.globalAlpha = .3 + hash1(i * 4.1) * .4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
  }
  c.globalAlpha = 1;
  const punch = 1 + .32 * Math.exp(-cl / .035);
  const zoom = lerp(.9, 1.06, cl / cutLen) * punch;
  const sh = 12;
  c.save();
  c.translate(W / 2 + (hash1(t * 61 + 3) - .5) * sh, H / 2 + 40 + (hash1(t * 59 + 8) - .5) * sh);
  c.rotate(F.roll + Math.sin(t * 30) * .008);
  c.scale(zoom, zoom);
  if (F.r >= 0) {
    c.save(); c.scale(430, 430);
    CH.rider(c, RIDERS[F.r], Object.assign({ flutter: t * 14 + F.r, armUp: 0, sweat: 0 }, F.o, { wob: F.o.wob }));
    c.restore();
    /* tears / sweat whipped backwards */
    for (let i = 0; i < 12; i++) {
      const ph = ((cl * 2.8 + hash1(i * 4.4)) % 1), ex = (i % 2 ? 210 : -60) + 160, ey = -30 + (hash1(i) - .5) * 60;
      const x = ex - ph * 1500 * (.5 + hash1(i * 2.2)), y = ey + ph * ph * 260 - ph * 60;
      c.fillStyle = '#7ad7ff'; c.strokeStyle = C.ink; c.lineWidth = 5;
      c.globalAlpha = 1 - ph * .6;
      c.save(); c.translate(x, y); c.rotate(-1.3); c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(15, 5, 0, 14); c.quadraticCurveTo(-15, 5, 0, -20); c.fill(); c.stroke(); c.restore();
    }
    c.globalAlpha = 1;
  } else {
    /* extreme close-up: two bulging eyes */
    for (let e = 0; e < 2; e++) {
      const ex = (e ? 300 : -300), R = 250;
      c.fillStyle = C.white; c.strokeStyle = C.ink; c.lineWidth = 22;
      c.beginPath(); c.arc(ex, -20, R, 0, TAU); c.fill(); c.stroke();
      const dart = Math.floor(t * 24), px = (hash1(dart * 2.1 + e) - .5) * 110, py = (hash1(dart * 3.7 + e) - .5) * 110 - 10;
      c.fillStyle = C.ink; c.beginPath(); c.arc(ex + px, -20 + py, 64 - 22 * (cl / cutLen), 0, TAU); c.fill();
      c.fillStyle = C.white; c.beginPath(); c.arc(ex + px - 18, -20 + py - 20, 18, 0, TAU); c.fill();
      c.strokeStyle = C.ink; c.lineWidth = 26; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - 170, -330 + (e ? 34 : -34)); c.lineTo(ex + 170, -330 - (e ? 34 : -34)); c.stroke();
    }
    c.fillStyle = '#7ad7ff'; c.strokeStyle = C.ink; c.lineWidth = 8;
    const p = (cl * 4) % 1; c.save(); c.translate(-520, -250 + p * 340); c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(38, 8, 0, 36); c.quadraticCurveTo(-38, 8, 0, -46); c.fill(); c.stroke(); c.restore();
  }
  c.restore();
  /* cut label */
  const lab = ['AAAAH!', 'NOPE.', 'AGAIN!!', ' 👀'.trim() || '!'][k] || '';
  if (k < 3) {
    const a = E.outBack(clamp(cl / .12), 2);
    c.save(); c.translate(W - 400, H - 250); c.rotate(-.1); c.scale(a, a);
    FONT.drawText(c, ['AAAAH!', 'NOPE.', 'AGAIN!!'][k], 0, 0, 120, { wt: .25, color: C.white, outline: { w: 8, color: C.ink }, shadow: { dx: 8, dy: 9, color: C.ink, steps: 4 }, align: 'c' });
    c.restore();
  }
};
SHOT_LIST.find(s => s.id === 'faces').sub = 4;

/* ------------------------------------ MAP ----------------------------------- */
const MAP_MARKS = [[70, 'THE DROP', C.mag], [212, 'LOOP', C.cyan], [350, 'BANKED TURN', C.yellow], [470, 'AIRTIME', C.lime], [640, 'CORKSCREW', C.orange], [790, 'HAIRPIN', C.pink]];
SCENES.map = function (c, lt, t) {
  const dur = 1.667, u = clamp(lt / dur);
  const tgt = [110, 30, 100];
  const az = lerp(-.5, 3.5, E.inOutCubic(u)), el = lerp(1.0, .58, E.inOutCubic(u)), dist = lerp(470, 330, E.inOutQuad(u));
  const pos = [tgt[0] + Math.sin(az) * Math.cos(el) * dist, tgt[1] + Math.sin(el) * dist, tgt[2] + Math.cos(az) * Math.cos(el) * dist];
  const cam = G3.camera(pos, tgt, [0, 1, 0], 54);
  const bgm = c.createRadialGradient(W / 2, H * .55, 60, W / 2, H * .55, 1300);
  bgm.addColorStop(0, '#4a1a9a'); bgm.addColorStop(.55, '#1e0a58'); bgm.addColorStop(1, '#090418');
  c.fillStyle = bgm; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  G3.grid(c, cam, { spacing: 20, extent: 34, fog: 1100, alpha: .95, colA: C.cyan, colB: C.violet });
  G3.city(c, cam, { fog: 1000 });
  const kick = pulse('kick', t, .1);
  G3.track(c, cam, 0, G3.TRACK.length, { fog: 1800, tie: 3.0, width: 6.5, pulse: kick, tint: [C.mag, C.pink, C.violet] });
  G3.gates(c, cam, 0, { every: 40, fog: 1800, radius: 8 });
  c.globalCompositeOperation = 'source-over';
  /* three comets — the three riders — racing the whole ride */
  const sMain = G3.TRACK.length * E.inOutQuad(u) * .97;
  const proj = (p) => { const pc = G3.toCam(cam, p); return pc[2] > .5 ? G3.proj(cam, pc) : null; };
  const comets = [[0, C.white], [-26, C.mag], [-52, C.cyan]];
  c.globalCompositeOperation = 'lighter';
  for (const [off, col] of comets) {
    const s = Math.max(0, sMain + off);
    for (let k = 60; k >= 0; k--) {
      const sk_ = Math.max(0, s - k * 2.6), p = proj(add3(G3.sample(sk_).p, [0, 1.5, 0]));
      if (!p) continue;
      const f = 1 - k / 60;
      c.fillStyle = rgba(col === C.white ? '#ffe9a8' : col, f * f * .9);
      c.beginPath(); c.arc(p[0], p[1], 3 + 15 * f * f, 0, TAU); c.fill();
    }
    const hp = proj(add3(G3.sample(s).p, [0, 1.5, 0]));
    if (hp) {
      const g = c.createRadialGradient(hp[0], hp[1], 2, hp[0], hp[1], 120); g.addColorStop(0, rgba(col, .95)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.fillRect(hp[0] - 120, hp[1] - 120, 240, 240);
      c.fillStyle = C.white; c.beginPath(); c.arc(hp[0], hp[1], 16, 0, TAU); c.fill();
    }
  }
  c.globalCompositeOperation = 'source-over';
  /* labels pop as the lead comet passes each landmark */
  for (const [ls, text, col] of MAP_MARKS) {
    if (sMain < ls) continue;
    const age = (sMain - ls) / (G3.TRACK.length * .0 + 700), p = proj(add3(G3.sample(ls).p, [0, 16, 0]));
    if (!p) continue;
    const pop_ = E.outBack(clamp((sMain - ls) / 22), 2.4);
    c.save(); c.translate(p[0], p[1]); c.scale(pop_, pop_);
    const tw = FONT.measure(text, 30, .18, .12) + 56;
    c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.stroke();
    c.fillStyle = 'rgba(10,6,32,.88)'; c.beginPath(); c.roundRect(-tw / 2, -54, tw, 54, 27); c.fill();
    c.strokeStyle = col; c.lineWidth = 4; c.stroke();
    FONT.drawText(c, text, 0, -27, 30, { wt: .18, color: C.white, track: .12, align: 'c' });
    c.restore();
  }
  /* headline */
  const a = E.outBack(clamp(lt / .25), 2);
  c.save(); c.translate(W - 70, 100); c.scale(a, a);
  FONT.drawText(c, 'EVERYTHING', 0, 0, 78, { wt: .22, align: 'r', color: C.white, outline: { w: 6, color: C.ink } });
  FONT.drawText(c, 'AT ONCE', 0, 78, 78, { wt: .22, align: 'r', color: C.yellow, outline: { w: 6, color: C.ink } });
  c.restore();
};
SHOT_LIST.find(s => s.id === 'map').sub = 5;

/* ------------------------------------ END ---------------------------------- */
const END_T = at(11);
function drawStation(c, t, lt) {
  const floorY = 830;
  c.fillStyle = '#1b0a3f'; c.fillRect(0, floorY, W, H - floorY);
  c.fillStyle = '#5a2fc0'; c.fillRect(0, floorY, W, 10);
  c.fillStyle = C.cream; c.fillRect(0, floorY + 14, W, 6);
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 220;
    c.fillStyle = '#26105a'; c.fillRect(x - 16, floorY - 250, 32, 250);
    c.fillStyle = 'rgba(255,225,120,.9)'; c.beginPath(); c.arc(x, floorY - 262, 14 + 4 * pulse('bell', t, .2), 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(255,225,120,.45)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 9; i++) { const x = 120 + i * 220; i ? c.quadraticCurveTo(x - 110, floorY - 220, x, floorY - 262) : c.moveTo(x, floorY - 262); } c.stroke();
}
const CONFETTI = seeded(9, 90, (r, i) => ({ a: -PI / 2 + (r() - .5) * 1.5, v: 900 + r() * 1200, s: 10 + r() * 16, rot: r() * TAU, rs: (r() - .5) * 14, col: i % 7 }));
SCENES.end = function (c, lt, t) {
  /* sunset — the same sky we started in */
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#150a4a'); g.addColorStop(.45, '#7a2aa8'); g.addColorStop(.75, '#e8409e'); g.addColorStop(1, '#ff9a4a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const tw = .5 + .5 * Math.sin(t * 3 + i); c.fillStyle = `rgba(255,246,232,${tw * .8})`; c.beginPath(); c.arc(hash1(i * 3.3) * W, hash1(i * 7.1) * H * .5, 1 + hash1(i) * 2, 0, TAU); c.fill(); }
  /* sun */
  const sx = W / 2, sy = 700, sr = 380;
  const sg = c.createRadialGradient(sx, sy, sr * .7, sx, sy, sr * 2.2); sg.addColorStop(0, 'rgba(255,170,90,.6)'); sg.addColorStop(1, 'rgba(255,90,160,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W, H);
  c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.clip();
  const gg = c.createLinearGradient(0, sy - sr, 0, sy + sr); gg.addColorStop(0, C.yellow); gg.addColorStop(.6, C.orange); gg.addColorStop(1, C.mag);
  c.fillStyle = gg; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  c.fillStyle = 'rgba(70,20,110,.95)'; for (let i = 0; i < 8; i++) c.fillRect(sx - sr, sy + sr * (-.2 + i * .13), sr * 2, sr * (.018 + i * .018));
  c.restore();
  drawStation(c, t, lt);

  /* the cart brakes into the station (screech + hiss are in the soundtrack) */
  const ua = clamp(lt / .92), cx = W / 2 - 1500 * (1 - E.outCubic(ua)) + 0;
  const brake = 1 - clamp(ua);
  const cheer = pulse('bell', t, .28);
  c.save();
  c.translate(cx, 946); c.scale(.7, .7);
  /* speed streaks + brake sparks */
  if (ua < .98) {
    c.strokeStyle = 'rgba(255,246,232,.7)'; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const y = -150 - hash1(i * 3.1) * 260, L = 200 + hash1(i * 7.7) * 520 * brake; c.lineWidth = 3 + hash1(i) * 5; c.globalAlpha = brake * .9; c.beginPath(); c.moveTo(-330 - hash1(i * 9) * 300, y); c.lineTo(-330 - hash1(i * 9) * 300 - L, y); c.stroke(); }
    c.globalAlpha = 1;
    if (lt > .4) for (let i = 0; i < 18; i++) {
      const k = (lt * 9 + i * .37) % 1, a = -PI + hash1(i * 4.4) * 1.1 - .2;
      c.strokeStyle = i % 2 ? C.yellow : C.white; c.lineWidth = 5 * (1 - k);
      c.beginPath(); c.moveTo(-190 + Math.cos(a) * k * 20, -6); c.lineTo(-190 + Math.cos(a) * (20 + k * 130), -6 + Math.sin(a) * k * 100 - k * 30); c.stroke();
    }
  }
  /* cart + riders (they lurch forward when the brakes bite, then cheer at the bell) */
  const wheel = x => { c.fillStyle = C.ink; c.beginPath(); c.arc(x, -26, 27, 0, TAU); c.fill(); c.fillStyle = C.cream; c.beginPath(); c.arc(x, -26, 14, 0, TAU); c.fill(); c.fillStyle = C.mag; c.beginPath(); c.arc(x, -26, 6, 0, TAU); c.fill(); };
  wheel(-190); wheel(190);
  const xs = [205, 0, -205];
  for (let i = 2; i >= 0; i--) {
    const lean = brake * brake * .5, bob = -30 * pulse('bell', t - i * .05, .12);
    c.save(); c.translate(xs[i] + lean * 80, -282 + bob); c.scale(90, 90); c.rotate(lean * .6);
    const arm = clamp((t - 19.27) / .15 - i * .1);
    CH.rider(c, RIDERS[i], { joy: 1, teeth: true, fear: brake * .6, wind: brake, flutter: t * 9 + i, armUp: arm, armWave: 1.6, scream: 0, lookX: .5, lookY: -.1, headTilt: -.1 * brake + Math.sin(t * 6 + i) * .05 * (1 - brake), wob: 0, sweat: brake > .4 ? t : 0, squeeze: 0 });
    c.restore();
  }
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(-306, -134, 630, 108, 38); c.fill();
  const tg = c.createLinearGradient(0, -128, 0, -34); tg.addColorStop(0, '#ff5cae'); tg.addColorStop(1, '#d1157a'); c.fillStyle = tg; c.beginPath(); c.roundRect(-296, -124, 610, 88, 32); c.fill();
  c.fillStyle = C.cyan; c.beginPath(); c.roundRect(-270, -88, 560, 18, 9); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(-270, -116, 520, 10, 5); c.fill();
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(280, -112, 74, 64, 26); c.fill(); c.fillStyle = C.yellow; c.beginPath(); c.roundRect(292, -102, 52, 44, 20); c.fill();
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(-330, -190, 62, 100, 22); c.fill(); c.fillStyle = C.violet; c.beginPath(); c.roundRect(-322, -182, 46, 84, 16); c.fill();
  c.restore();

  /* AGAIN? */
  const word = 'AGAIN?';
  const wob = pulse('bell', t, .3);
  FONT.drawText(c, word, W / 2, 262, 316, {
    wt: .27, track: .05, color: C.white, outline: { w: 14, color: C.ink }, shadow: { dx: 20, dy: 24, color: C.mag, steps: 10 }, inline: 'rgba(255,90,160,.5)',
    fn: (i) => {
      const t0 = i * .05, u = clamp((lt - t0) / .34), e = E.outBack(u, 2.5);
      const idle = u >= 1 ? Math.sin(t * 5 + i * .9) * 5 : 0;
      const bell = pulse('bell', t - i * .035, .16);
      return { sy: lerp(.25, 1, e) * (1 + .1 * bell), sx: lerp(2.6, 1, e) * (1 + .05 * bell), dy: lerp(-620, 0, e) + idle - 50 * bell, rot: (1 - e) * (i % 2 ? .5 : -.5) + Math.sin(t * 3.3 + i) * .02, color: bell > .35 ? C.yellow : C.white, skip: lt < t0 };
    },
  });
  const sub = smooth(.55, .85, lt);
  if (sub > 0) {
    c.globalAlpha = sub;
    FONT.drawText(c, 'MOTION REEL  ·  MADE ENTIRELY FROM CODE', W / 2, 500, 42, { wt: .17, color: C.white, track: .16, outline: { w: 5, color: C.ink } });
    FONT.drawText(c, '0 KEYFRAMES   ·   0 LIBRARIES   ·   1 RIDE', W / 2, 558, 30, { wt: .16, color: C.yellow, track: .2, outline: { w: 4, color: C.ink } });
    c.globalAlpha = 1;
  }
  /* confetti on the station bell */
  const bs = since('bell', t);
  if (t > 19.2) {
    const b0 = 19.271, dt = t - b0;
    if (dt > 0) for (const q of CONFETTI) {
      const x = W / 2 + Math.cos(q.a) * q.v * dt * .7 + (q.a * 40), y = 800 + Math.sin(q.a) * q.v * dt + 1700 * dt * dt;
      if (y > H + 40) continue;
      c.save(); c.translate(x, y); c.rotate(q.rot + q.rs * dt); c.fillStyle = pop(q.col); c.globalAlpha = clamp(1.6 - dt);
      c.beginPath(); c.roundRect(-q.s / 2, -q.s / 4, q.s, q.s / 2, 3); c.fill(); c.restore();
    }
  }
};
SHOT_LIST.find(s => s.id === 'end').sub = 4;
