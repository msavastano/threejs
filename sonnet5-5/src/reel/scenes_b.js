'use strict';
/* ==========================================================================
   scenes_b.js — the middle of the ride
     type     6.67–8.33   four words, four beats, four kinds of physics
     air      8.33–10.0   weightless: metaballs, floating riders, calliope notes
     build    10.0–11.67  3·2·1, rings collapsing, the hang
   ========================================================================== */

/* ============================== KINETIC TYPE ============================== */
function typeShared(c, lt, t) {
  /* a colour block sweeps across on every beat — the "cut" has a body */
  const bi = Math.floor(lt / BEAT), bl = lt - bi * BEAT;
  return { bi, bl };
}
const TYPE_BG = [C.mag, C.yellow, C.cyan, C.orange];

function stripes(c, col, angle, gap, thick, scroll, alpha = 1) {
  c.save(); c.translate(W / 2, H / 2); c.rotate(angle); c.fillStyle = col; c.globalAlpha = alpha;
  const n = Math.ceil(Math.hypot(W, H) / gap) + 2;
  for (let i = -n; i <= n; i++) c.fillRect(-2600, i * gap + (scroll % gap), 5200, thick);
  c.restore();
}

function wordFAST(c, bl, t) {
  c.fillStyle = C.mag; c.fillRect(0, 0, W, H);
  stripes(c, '#e01578', -.28, 150, 64, t * 2600);
  stripes(c, 'rgba(255,255,255,.55)', -.28, 300, 6, t * 5200 + 40);
  /* corner wedges */
  c.fillStyle = C.ink; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * .28, 0); c.lineTo(0, H * .34); c.fill();
  c.fillStyle = C.yellow; c.beginPath(); c.moveTo(W, H); c.lineTo(W * .74, H); c.lineTo(W, H * .68); c.fill();
  const word = 'FAST', size = 470;
  c.save();
  c.translate(W / 2, H / 2 + 20); c.transform(1, 0, -.24, 1, 0, 0); c.translate(-W / 2, -(H / 2 + 20));
  /* speed trails on entry */
  for (let g = 5; g >= 0; g--) {
    c.save(); c.globalAlpha = g === 0 ? 1 : .14 * (1 - g / 6) * (bl < .14 ? 1 : 0);
    c.translate(-g * 130 * (1 - clamp(bl / .3)), 0);
    FONT.drawText(c, word, W / 2, H / 2 + 20, size, {
      wt: .27, track: .05, color: g ? C.white : C.cream, outline: g ? null : { w: 16, color: C.ink }, shadow: g ? null : { dx: 46, dy: 0, color: C.ink, steps: 14 },
      fn: (i) => {
        const u = clamp((bl - i * .022) / .17);
        const e = E.outExpo(u);
        return { dx: lerp(-1700, 0, e), sx: lerp(4.2, 1, e), skip: bl - i * .022 < 0 };
      },
    });
    c.restore();
  }
  c.restore();
  /* hi-hat ticks */
  const h = pulse('hat', t, .05);
  c.fillStyle = `rgba(255,255,255,${h * .5})`; c.fillRect(0, H * (.15 + .7 * hash1(Math.floor(t * 60))), W, 8);
}

function wordLOUD(c, bl, t) {
  c.fillStyle = C.yellow; c.fillRect(0, 0, W, H);
  /* halftone speaker-cone vignette */
  const cx = W / 2, cy = H / 2, sp = 52;
  const kick = pulse('kick', t, .09), clap = pulse('clap', t, .16);
  c.fillStyle = 'rgba(255,46,147,.55)';
  for (let y = sp / 2; y < H; y += sp) for (let x = sp / 2 + ((Math.floor(y / sp) % 2) * sp / 2); x < W; x += sp) {
    const d = Math.hypot(x - cx, (y - cy) * 1.5) / 1100, r = clamp(d - .35) * 24 * (1 + .25 * kick);
    if (r > .8) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }
  /* shock rings from the clap */
  const cs = since('clap', t);
  for (let k = 0; k < 6; k++) {
    const r = (cs - k * .055) * 2500;
    if (r < 0 || r > 2400) continue;
    c.strokeStyle = `rgba(10,6,32,${clamp(1 - r / 2400) * .85})`; c.lineWidth = 34 * (1 - r / 2600);
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  }
  const shakeA = 26 * clap;
  const pop_ = bl < .5 ? lerp(.55, 1, E.outElastic(clamp(bl / .5), .38)) : 1;
  c.save();
  c.translate(cx + (hash1(t * 77) - .5) * shakeA, cy + 10 + (hash1(t * 91 + 2) - .5) * shakeA);
  c.scale(pop_ * 1.02 * (1 + .04 * pulse('bass', t, .05)), pop_ * 1.02 * (1 + .04 * pulse('bass', t, .05)));
  const size = 420;
  FONT.drawText(c, 'LOUD', 0, 0, size, {
    wt: .28, track: .05, color: C.ink, outline: { w: 16, color: C.cream }, shadow: { dx: 26, dy: 28, color: C.mag, steps: 12 }, inline: 'rgba(255,225,74,.9)',
    fn: (i) => ({ dy: -22 * pulse('hat', t - i * .02, .06) - 60 * (1 - E.outBack(clamp((bl - i * .03) / .2), 2.4)) , rot: (i % 2 ? 1 : -1) * .03 * clap }),
  });
  c.restore();
}

function wordLOOPY(c, bl, t) {
  c.fillStyle = C.cyan; c.fillRect(0, 0, W, H);
  /* ripples */
  for (let k = 0; k < 7; k++) {
    const ph = ((t * .9 + k / 7) % 1), r = ph * 1500;
    c.strokeStyle = `rgba(10,6,32,${(1 - ph) * .22})`; c.lineWidth = 6 + 16 * (1 - ph);
    c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke();
  }
  /* dots */
  for (let i = 0; i < 60; i++) {
    const a = hash1(i) * TAU + t * (.4 + hash1(i * 3) * .5), r = 380 + hash1(i * 7) * 520;
    c.fillStyle = i % 3 ? 'rgba(255,255,255,.9)' : C.yellow; c.beginPath(); c.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * .72, 5 + hash1(i * 9) * 9, 0, TAU); c.fill();
  }
  const R = 270, cx = W / 2, cy = H / 2 + 70;
  const u0 = clamp(bl / (BEAT * .9));
  const rot = -PI * .5 - (1 - E.outBack(u0, 1.1)) * TAU;          // the word swings all the way round, then sits on top of the loop
  /* the loop: a coaster ring */
  c.lineCap = 'round';
  c.strokeStyle = C.ink; c.lineWidth = 46; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.strokeStyle = C.cream; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.strokeStyle = C.ink; c.lineWidth = 8;
  for (let i = 0; i < 44; i++) { const a = TAU * i / 44 + t * .5; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22)); c.lineTo(cx + Math.cos(a) * (R + 46), cy + Math.sin(a) * (R + 46)); c.stroke(); }
  /* letters ride the loop */
  const word = 'LOOPY', size = 236, wt = .27, tr = .05;
  const Lo = FONT.layout(word, wt, tr);
  const Rt = R + 118;
  Lo.items.forEach((it, i) => {
    const mid = (it.x + it.w / 2 - Lo.width / 2) * size;
    const a = rot + mid / Rt;
    const pop_ = E.outBack(clamp((bl - i * .02) / .2), 2);
    c.save(); c.translate(cx + Math.cos(a) * Rt, cy + Math.sin(a) * Rt); c.rotate(a + PI / 2); c.scale(pop_, pop_);
    FONT.drawText(c, it.ch, 0, 0, size, { wt, color: C.white, outline: { w: 12, color: C.ink }, shadow: { dx: 14, dy: 16, color: C.mag, steps: 8 } });
    c.restore();
  });
  /* a tiny cart doing laps */
  const ca = t * 6;
  c.save(); c.translate(cx + Math.cos(ca) * (R - 6), cy + Math.sin(ca) * (R - 6)); c.rotate(ca + PI / 2);
  c.fillStyle = C.mag; c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.roundRect(-28, -46, 56, 34, 10); c.fill(); c.stroke();
  c.fillStyle = C.yellow; c.beginPath(); c.arc(-11, -54, 10, 0, TAU); c.arc(11, -54, 10, 0, TAU); c.fill(); c.stroke();
  c.restore();
  /* centre: a huge ? that breathes */
  const br = 1 + .06 * Math.sin(t * 8) + .1 * pulse('kick', t, .1);
  c.save(); c.translate(cx, cy); c.scale(br, br);
  FONT.drawText(c, 'O', 0, 0, 300, { wt: .3, color: 'rgba(10,6,32,.14)' });
  c.restore();
}

function wordWILD(c, bl, t) {
  const st = Math.floor(t / STEP_S), col = [C.orange, C.lime, C.mag, C.cyan, C.yellow][mod(st, 5)];
  c.fillStyle = col; c.fillRect(0, 0, W, H);
  /* zigzag rows */
  c.strokeStyle = 'rgba(10,6,32,.24)'; c.lineWidth = 14; c.lineJoin = 'miter';
  for (let r = 0; r < 9; r++) {
    c.beginPath();
    for (let x = -80; x <= W + 80; x += 60) { const y = 60 + r * 130 + ((x / 60) % 2 ? 34 : -34) * (r % 2 ? 1 : -1); x === -80 ? c.moveTo(x + (t * 200 % 120), y) : c.lineTo(x + (t * 200 % 120), y); }
    c.stroke();
  }
  const size = 360;
  c.save();
  FONT.drawText(c, 'WILD!', W / 2, H / 2 + 20, size, {
    wt: .3, track: .06, outline: { w: 16, color: C.ink }, shadow: { dx: 26, dy: 28, color: C.ink, steps: 10 }, color: C.white,
    fn: (i) => {
      const k = st * 7 + i * 13;
      const u = clamp((bl - i * .03) / .2), ent = E.outBack(u, 2.6);
      const wob = 1 - clamp(bl / .3);
      return {
        rot: (hash1(k) - .5) * .6 * (.35 + .65 * wob) + Math.sin(t * 30 + i) * .03,
        dy: (hash1(k + 3) - .5) * 110 * (.3 + .7 * wob) + lerp(-500, 0, ent),
        dx: (hash1(k + 5) - .5) * 44,
        sx: (.82 + hash1(k + 7) * .3) * ent, sy: (.82 + hash1(k + 9) * .34) * ent,
        color: hash1(k + 11) < .5 ? C.white : C.ink, outlineColor: hash1(k + 11) < .5 ? C.ink : C.white,
        wt: .3 + (hash1(k + 15) - .5) * .08,
      };
    },
  });
  c.restore();
  /* stamp: burst shapes */
  for (let i = 0; i < 7; i++) {
    const k = st * 3 + i, x = hash1(k * 1.3) * W, y = hash1(k * 2.9) * H;
    if (Math.abs(x - W / 2) < 500 && Math.abs(y - H / 2) < 220) continue;
    c.save(); c.translate(x, y); c.rotate(hash1(k * 4.1) * TAU); c.fillStyle = C.ink; c.globalAlpha = .9;
    const r = 26 + hash1(k * 5.7) * 40;
    c.beginPath(); for (let j = 0; j < 10; j++) { const a = TAU * j / 10, rr = j % 2 ? r * .45 : r; j ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(rr, 0); } c.closePath(); c.fill();
    c.restore();
  }
}
const STEP_S = BEAT / 4;

SCENES.type = function (c, lt, t) {
  const { bi, bl } = typeShared(c, lt, t);
  const words = [wordFAST, wordLOUD, wordLOOPY, wordWILD];
  const k = clamp(bi, 0, 3);
  if (bl < .1 && k > 0) {
    /* previous colour stays under a wipe that reveals the new word left → right */
    const u = E.outCubic(bl / .1);
    c.fillStyle = TYPE_BG[k - 1]; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.rect(0, 0, W * u, H); c.clip();
    words[k](c, bl, t);
    c.restore();
    c.fillStyle = C.ink; c.fillRect(W * u - 6, 0, 12, H);
  } else words[k](c, bl, t);
};
SHOT_LIST.find(s => s.id === 'type').sub = 4;

/* ================================ AIRTIME ================================ */
/* metaballs computed on a small grid, coloured through a palette ramp, upscaled smooth */
const MB = { w: 288, h: 162 };
const mbCv = document.createElement('canvas'); mbCv.width = MB.w; mbCv.height = MB.h;
const mbCtx = mbCv.getContext('2d');
const mbImg = mbCtx.createImageData(MB.w, MB.h);
const RAMP = [[0, [24, 8, 70]], [.32, [86, 30, 168]], [.5, [255, 46, 147]], [.72, [255, 122, 46]], [.9, [255, 225, 74]], [1, [255, 250, 220]]];
function ramp(v) {
  for (let i = 1; i < RAMP.length; i++) if (v <= RAMP[i][0]) {
    const a = RAMP[i - 1], b = RAMP[i], f = (v - a[0]) / (b[0] - a[0]);
    return [lerp(a[1][0], b[1][0], f), lerp(a[1][1], b[1][1], f), lerp(a[1][2], b[1][2], f)];
  }
  return RAMP[RAMP.length - 1][1];
}
const RAMP_LUT = Array.from({ length: 256 }, (_, i) => ramp(i / 255));
function drawMetaballs(c, t, lt) {
  const balls = [];
  for (let i = 0; i < 9; i++) {
    const a = t * (.5 + hash1(i * 3.3) * .5) + i * 2.1, b = t * (.4 + hash1(i * 5.1) * .5) + i * 1.3;
    balls.push([.5 + Math.cos(a) * (.18 + hash1(i) * .3), .5 + Math.sin(b) * (.16 + hash1(i * 2) * .22) - .02 * i + .05, (.075 + hash1(i * 7.7) * .06) * (1 + .4 * pulse('calliope', t - i * .01, .16))]);
  }
  const d = mbImg.data, aspect = MB.w / MB.h;
  for (let y = 0; y < MB.h; y++) {
    const py = y / MB.h;
    for (let x = 0; x < MB.w; x++) {
      const px = x / MB.w;
      let f = 0;
      for (let k = 0; k < 9; k++) {
        const bx = balls[k][0], by = balls[k][1], r = balls[k][2];
        const dx = (px - bx) * aspect, dy = py - by;
        f += (r * r) / (dx * dx + dy * dy + 1e-4);
      }
      const v = clamp(f * .3, 0, 1.15);
      const edge = clamp((v - .28) * 5, 0, 1);
      const col = RAMP_LUT[Math.min(255, Math.floor(clamp(v - .1, 0, 1) * 255))];
      const o = (y * MB.w + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = edge * 255;
    }
  }
  mbCtx.putImageData(mbImg, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(mbCv, 0, 0, W, H);
}

SCENES.air = function (c, lt, t) {
  const push = 1 + .07 * lt / 1.667;
  c.translate(W / 2, H / 2); c.scale(push, push); c.rotate(Math.sin(t * .7) * .012); c.translate(-W / 2, -H / 2);
  /* dawn-pastel sky */
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a1470'); g.addColorStop(.55, '#8a3fc4'); g.addColorStop(1, '#ffa27a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  /* bokeh drifting UP — the opposite of the drop */
  for (let i = 0; i < 46; i++) {
    const sp = 30 + hash1(i * 3.7) * 90, r = 20 + hash1(i * 1.9) * 70;
    const x = hash1(i * 9.1) * W, y = H + 100 - ((hash1(i * 5.3) * (H + 200) + t * sp) % (H + 200));
    c.fillStyle = `rgba(255,${200 + 40 * hash1(i)},${230 + 20 * hash1(i * 2)},${.06 + hash1(i * 4.4) * .12})`;
    c.beginPath(); c.arc(x + Math.sin(t * .7 + i) * 24, y, r, 0, TAU); c.fill();
  }
  drawMetaballs(c, t, lt);
  /* rising note bubbles fired by the calliope */
  const notes = SC.events.calliope;
  notes.forEach(([tn, midi], i) => {
    const dt = t - tn; if (dt < 0 || dt > 1.1) return;
    const u = dt / 1.1;
    const x = W * (.12 + .76 * ((midi - 72) / 12 % 1 + 1) % 1) + Math.sin(i * 2.7) * 90;
    const y = H * .78 - E.outCubic(u) * H * .55;
    const r = 26 + 16 * E.outElastic(clamp(dt / .3)) ;
    c.globalAlpha = 1 - u * u;
    c.fillStyle = pop(i); c.strokeStyle = C.white; c.lineWidth = 6;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .28, 0, TAU); c.fill();
    c.globalAlpha = 1;
  });
  /* floating riders, hands up */
  const cfg = [[.32, .66, 0, 1.15], [.5, .54, 1, 1.32], [.68, .68, 2, 1.15]];
  cfg.forEach(([fx, fy, ri, sc], k) => {
    const ph = k * 1.9, bob = Math.sin(t * 1.5 + ph) * 26, sway = Math.sin(t * 1.1 + ph * 1.3) * .12;
    const enter = E.outCubic(clamp((lt - k * .06) / .5));
    c.save();
    c.translate(W * fx + Math.sin(t * .8 + ph) * 26, lerp(H + 300, H * fy + bob, enter));
    c.rotate(sway); c.scale(102 * sc, 102 * sc);
    CH.rider(c, RIDERS[ri], { joy: 1, teeth: true, armUp: .95, armWave: 1.2, flutter: t * 2 + ph, wind: .12, lookX: .5, lookY: -.3, headTilt: -.1 + Math.sin(t * 1.7 + ph) * .1, sweat: 0, blink: (Math.sin(t * 2.1 + ph) > .97) ? 1 : 0 });
    c.restore();
  });
  /* AIRTIME letters, each on its own zero-g drift */
  const rise = E.outBack(clamp(lt / .5), 1.4);
  FONT.drawText(c, 'AIRTIME', W / 2, 230, 260, {
    wt: .24, track: .08, color: 'rgba(255,246,232,.98)', outline: { w: 10, color: 'rgba(42,20,112,.9)' }, shadow: { dx: 0, dy: 12, color: 'rgba(255,46,147,.65)', steps: 6 },
    fn: (i) => ({
      dy: Math.sin(t * 1.6 + i * .8) * 22 + (1 - rise) * -420, dx: Math.cos(t * 1.1 + i) * 8, rot: Math.sin(t * 1.3 + i * 1.1) * .07,
      sy: 1 + .04 * Math.sin(t * 2 + i), sx: 1 + .04 * Math.cos(t * 2 + i),
    }),
  });
  /* sparkles from the bells */
  SC.events.bell.forEach(([tb], i) => {
    const dt = t - tb; if (dt < 0 || dt > .7 || tb > 10.1) return;
    const u = dt / .7, x = W * (.2 + .6 * hash1(i * 4.2)), y = H * (.2 + .5 * hash1(i * 6.6));
    c.save(); c.translate(x, y); c.rotate(u * 2); c.globalAlpha = 1 - u;
    c.fillStyle = C.white;
    const R = 80 * E.outBack(clamp(u * 3)) * (1 - u * .5);
    c.beginPath(); for (let j = 0; j < 8; j++) { const a = TAU * j / 8, rr = j % 2 ? R * .16 : R; j ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(rr, 0); } c.closePath(); c.fill();
    c.restore();
  });
};
SHOT_LIST.find(s => s.id === 'air').sub = 4;

/* ================================= BUILD ================================= */
const BUILD_T0 = at(6);
function drawRings(c, cx, cy, lt, colA, colB) {
  /* concentric rings sucked into the centre, faster and faster */
  const sp0 = .6, sp1 = 2.6, P = sp0 * lt + .5 * (sp1 - sp0) / 1.667 * lt * lt;
  const N = 14;
  for (let j = 0; j < N; j++) {
    const ph = ((P + j / N) % 1), r = 1250 * Math.pow(1 - ph, 1.9) + 6;
    const a = clamp(ph * 3.2) * clamp(1 - (1 - ph) * .0) ;
    c.strokeStyle = j % 2 ? colA : colB; c.globalAlpha = a * .95;
    c.lineWidth = 3 + 26 * (1 - ph) * (1 - ph);
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  }
  c.globalAlpha = 1;
}
SCENES.build = function (c, lt, t) {
  const cx = W / 2, cy = H / 2 + 10;
  const beat = Math.floor(lt / BEAT), bl = lt - beat * BEAT;
  const hang = t >= SC.hang[1][0];
  const cols = [[C.mag, C.pink], [C.orange, C.yellow], [C.cyan, C.ice], [C.white, C.yellow]][clamp(beat, 0, 3)];
  const bg = c.createRadialGradient(cx, cy, 40, cx, cy, 1200);
  bg.addColorStop(0, '#2b0d63'); bg.addColorStop(.6, '#12073a'); bg.addColorStop(1, '#05030f');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  /* wheel spokes spinning up */
  const spin = .8 * lt * lt * 2.2;
  c.save(); c.translate(cx, cy); c.rotate(spin);
  for (let i = 0; i < 24; i++) {
    c.rotate(TAU / 24);
    const g = c.createLinearGradient(0, 0, 1300, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.3, rgba(cols[i % 2], .3)); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(1300, -34); c.lineTo(1300, 34); c.closePath(); c.fill();
  }
  c.restore();
  const hangU = hang ? unlerp(SC.hang[1][0], SC.hang[1][1], t) : 0;
  const collapse = 1 - E.inQuad(hangU);
  c.save(); c.translate(cx, cy); c.scale(collapse, collapse); c.translate(-cx, -cy);
  drawRings(c, cx, cy, lt, cols[0], cols[1]);
  /* particles sucked to the centre */
  for (let i = 0; i < 140; i++) {
    const ph = ((hash1(i * 2.1) + lt * (.5 + hash1(i * 5.5) * 1.3)) % 1), a = hash1(i * 9.3) * TAU + ph * 1.6;
    const r = 1000 * Math.pow(1 - ph, 1.7) + 14;
    c.fillStyle = i % 3 ? C.white : cols[0]; c.globalAlpha = clamp(ph * 2.4) * .9;
    c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + 4 * ph, 0, TAU); c.fill();
  }
  c.globalAlpha = 1; c.restore();

  /* the countdown */
  if (beat <= 2 && !hang) {
    const num = String(3 - beat), u = clamp(bl / .32);
    const s = E.outElastic(u, .34), sz = 780;
    c.save(); c.translate(cx + (hash1(t * 70) - .5) * 14 * pulse('kick', t, .07), cy + 4 + (hash1(t * 71 + 1) - .5) * 14 * pulse('kick', t, .07));
    c.scale(s * (1 + .04 * pulse('kick', t, .09)), s * (1 + .04 * pulse('kick', t, .09)));
    FONT.drawText(c, num, 0, 0, sz, { wt: .3, color: C.white, outline: { w: 22, color: C.ink }, shadow: { dx: 0, dy: 0, color: cols[0], steps: 1 } });
    /* neon outline copy */
    FONT.drawText(c, num, 0, 0, sz, { wt: .06, color: cols[0] });
    c.restore();
    /* shockwave on the beat */
    const r = bl * 2300;
    c.strokeStyle = rgba(cols[1], clamp(1 - bl / .4)); c.lineWidth = 30 * (1 - bl / .5); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  } else if (beat === 3 && !hang) {
    /* snare-roll: a nervous, shrinking dot with a flickering ring — no number, just dread */
    const u = bl / BEAT, r = lerp(210, 60, E.inQuad(u)) * (1 + .06 * Math.sin(t * 90));
    c.strokeStyle = C.white; c.lineWidth = 16 + 10 * u; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
    c.fillStyle = C.mag; c.beginPath(); c.arc(cx, cy, r * .5, 0, TAU); c.fill();
    FONT.drawText(c, 'GO', cx, cy + 4, 150 * (1 - u * .4), { wt: .28, color: C.white, outline: { w: 8, color: C.ink } });
  }
  if (hang) {
    /* the hang: darkness, a heartbeat dot */
    c.fillStyle = `rgba(5,3,15,${.7 + .3 * hangU})`; c.fillRect(0, 0, W, H);
    const pr = 1 + .8 * Math.max(0, Math.sin(hangU * PI * 3.2)), rr = lerp(30, 4, hangU) * pr;
    c.fillStyle = C.white; c.beginPath(); c.arc(cx, cy, rr, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, rr * 3.4, 0, TAU); c.stroke();
  }
  /* rising tension text */
  if (!hang) {
    const a = smooth(.1, .4, lt);
    c.globalAlpha = a * .95;
    FONT.drawText(c, 'SECOND DROP IN', cx, 118, 34, { wt: .16, color: C.white, track: .3 });
    c.globalAlpha = 1;
  }
};
SHOT_LIST.find(s => s.id === 'build').sub = 4;
