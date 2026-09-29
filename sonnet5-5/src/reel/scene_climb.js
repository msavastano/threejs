'use strict';
/* ==========================================================================
   scene_climb.js — SHOT 1, one continuous take (0 → 5.0 s)
     bars 0–1   the lift hill: the cart lurches forward on every chain clack,
                HOLD ON! slams in letter by letter, riders' hearts pound
     hang       the crest: everything freezes, eyes bulge
     bar 2      the drop: camera whips into the plunge, riders scream
   ========================================================================== */

/* ---- 2D track profile (turtle), world px, y down --------------------------- */
const SIDE = (() => {
  const ds = 8, pts = [], ang = [];
  let x = 0, y = 0, a = 0;
  const push = () => { pts.push([x, y]); ang.push(a); };
  const straight = len => { const n = Math.round(len / ds); for (let i = 0; i < n; i++) { x += Math.cos(a) * ds; y -= Math.sin(a) * ds; push(); } };
  const arc = (dA, R) => { const n = Math.max(1, Math.round(Math.abs(dA) * R / ds)), da = dA / n; for (let i = 0; i < n; i++) { a += da; x += Math.cos(a) * ds; y -= Math.sin(a) * ds; push(); } };
  push();
  straight(1400);
  arc(rad(32), 900);
  straight(2700);
  arc(rad(-102), 300);
  straight(1000);
  arc(rad(70), 1000);
  straight(7000);
  return { pts, ang, ds, n: pts.length };
})();
function sideAt(s) {
  const q = clamp(s / SIDE.ds, 0, SIDE.n - 1.001), i = Math.floor(q), f = q - i;
  const p0 = SIDE.pts[i], p1 = SIDE.pts[i + 1];
  return { x: lerp(p0[0], p1[0], f), y: lerp(p0[1], p1[1], f), a: lerp(SIDE.ang[i], SIDE.ang[i + 1], f) };
}
function cartPose(s) {
  const f = sideAt(s + 190), r = sideAt(s - 190);
  return { x: (f.x + r.x) / 2, y: (f.y + r.y) / 2, a: Math.atan2(-(f.y - r.y), f.x - r.x) };
}

const CLK = EVT.clack.slice(0, 14);
const CLK_S0 = 2150, CLK_D = i => 130 + 7 * i;
const HANG1 = SC.hang[0], DROP_T = HANG1[1];
const GROUND_Y = 60;

function cartS(t) {
  let s = CLK_S0;
  for (let i = 0; i < CLK.length; i++) s += CLK_D(i) * E.outCubic(clamp((t - CLK[i]) / .17));
  if (t > HANG1[0]) s += 64 * E.inQuad(clamp((t - HANG1[0]) / (HANG1[1] - HANG1[0])));
  if (t > DROP_T) { const d = t - DROP_T; s += 60 * d + 1300 * d * d; }
  return s;
}
const CAM0 = cartPose(CLK_S0);

/* ---- camera ---------------------------------------------------------------- */
function climbCam(t) {
  const pose = cartPose(cartS(t - .02));
  const ta = Math.cos(pose.a), tb = -Math.sin(pose.a);
  const hang = unlerp(HANG1[0], HANG1[1], t);
  const dropU = unlerp(DROP_T, DROP_T + .55, t);
  let zoom = lerp(1.0, .86, smooth(0, 3.12, t));
  if (t >= HANG1[0] && t < DROP_T) zoom = lerp(.86, 1.75, E.inOutQuad(hang));
  if (t >= DROP_T) zoom = lerp(1.75, .62, E.outBack(dropU, 1.3)) + .02 * Math.sin(t * 9) * (1 - dropU);
  const k = t >= DROP_T ? .8 * E.outCubic(unlerp(DROP_T, DROP_T + .32, t)) : 0;
  let rot = k * pose.a + (t < DROP_T ? -.035 + .012 * Math.sin(t * .9) : 0);
  if (t >= HANG1[0] && t < DROP_T) rot += -.03 * E.inOutQuad(hang) + Math.sin(t * 90) * .003;
  const look = t < DROP_T ? 90 * (1 - E.inOutQuad(hang)) : 140 * E.outCubic(dropU);
  /* in the hang the camera climbs onto the riders' faces */
  const fx = -Math.sin(pose.a) * 290 * E.inOutQuad(hang) * (t < DROP_T ? 1 : 1 - E.outCubic(unlerp(DROP_T, DROP_T + .25, t)));
  const fy = -Math.cos(pose.a) * 290 * E.inOutQuad(hang) * (t < DROP_T ? 1 : 1 - E.outCubic(unlerp(DROP_T, DROP_T + .25, t)));
  const drop = t >= DROP_T;
  const sh = drop ? 16 * (1 - dropU * .5) : (t >= HANG1[0] ? 3 : 0);
  return {
    x: pose.x + ta * look + fx, y: pose.y + tb * look + fy, zoom, rot, pose,
    ax: W * (drop ? .40 : .42) + (hash1(t * 61.3) - .5) * 2 * sh,
    ay: H * (drop ? .66 : lerp(.56, .52, hang)) + (hash1(t * 47.9 + 5) - .5) * 2 * sh,
  };
}

/* ---- parallax layers --------------------------------------------------------- */
function withLayer(c, cam, p, fn) {
  c.save();
  c.translate(CAM0.x + (cam.x - CAM0.x) * (1 - p), CAM0.y + (cam.y - CAM0.y) * (1 - p));
  fn();
  c.restore();
}
const VG = 340;                                   // authored ground line (offset from the start camera)

function drawSkyLayers(c, cam, t) {
  withLayer(c, cam, .05, () => {
    const g = c.createLinearGradient(0, -3200, 0, VG + 30);
    g.addColorStop(0, '#05031a'); g.addColorStop(.3, '#150a4a'); g.addColorStop(.62, '#4a1a90');
    g.addColorStop(.83, '#c93a9a'); g.addColorStop(.94, '#ff8a4a'); g.addColorStop(1, '#ffc060');
    c.fillStyle = g; c.fillRect(-9000, -3200, 18000, VG + 3230);
    /* stars */
    for (let i = 0; i < 190; i++) {
      const u = (hash1(i * 3.1) - .5) * 4200, v = -300 - hash1(i * 7.7) * 2900, tw = .55 + .45 * Math.sin(t * (2 + hash1(i) * 4) + i);
      c.globalAlpha = tw * smooth(-300, -1500, v) * .0 + tw * .9; c.fillStyle = C.white;
      const r = 1 + hash1(i * 1.9) * 2.6; c.beginPath(); c.arc(u, v, r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  });
  /* the sun: enormous, backlighting the whole climb */
  withLayer(c, cam, .06, () => {
    const cx = 330, cy = 130, R = 330;
    const g = c.createRadialGradient(cx, cy, R * .6, cx, cy, R * 2.6);
    g.addColorStop(0, 'rgba(255,170,90,.55)'); g.addColorStop(1, 'rgba(255,90,160,0)');
    c.fillStyle = g; c.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
    const gg = c.createLinearGradient(0, cy - R, 0, cy + R);
    gg.addColorStop(0, C.yellow); gg.addColorStop(.55, C.orange); gg.addColorStop(1, C.mag);
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
    c.fillStyle = gg; c.fillRect(cx - R, cy - R, R * 2, R * 2);
    c.fillStyle = 'rgba(70,20,110,.95)';
    for (let i = 0; i < 8; i++) { const y = cy + R * (-.05 + i * .155), h = R * (.018 + i * .02); c.fillRect(cx - R, y, R * 2, h); }
    c.restore();
  });
  withLayer(c, cam, .13, () => {
    for (let i = 0; i < 12; i++) {
      const u = -1600 + i * 480 + hash1(i) * 220, v = -1500 + hash1(i * 5.3) * 1500, w = 380 + hash1(i * 2.1) * 520, h = 46 + hash1(i * 9.3) * 30;
      const drift = t * (6 + hash1(i * 4) * 10);
      const x = u - drift;
      c.fillStyle = 'rgba(255,140,200,.22)';
      c.beginPath(); c.roundRect(x, v, w, h, h / 2); c.fill();
      c.beginPath(); c.roundRect(x + w * .18, v - h * .6, w * .42, h, h / 2); c.fill();
      c.fillStyle = 'rgba(255,225,240,.16)'; c.beginPath(); c.roundRect(x + 14, v + 4, w - 28, h * .3, h * .15); c.fill();
    }
  });
}

function drawFarCoasters(c, cam, t) {
  withLayer(c, cam, .28, () => {
    const base = VG - 10;
    c.beginPath(); c.moveTo(-3000, base + 4000);
    const pts = [];
    for (let u = -3000; u <= 7000; u += 30) {
      const h = 150 * Math.pow(Math.abs(Math.sin(u * .0019 + 1.2)), 1.6) + 90 * Math.pow(Math.abs(Math.sin(u * .0047)), 2.2) + 40;
      pts.push([u, base - h]);
    }
    pts.forEach(p => c.lineTo(p[0], p[1]));
    c.lineTo(7000, base + 4000); c.closePath();
    c.fillStyle = '#2a0f5e'; c.fill();
    c.strokeStyle = '#6b3fd6'; c.lineWidth = 5; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    c.strokeStyle = 'rgba(107,63,214,.55)'; c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < pts.length; i += 2) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i][0], base + 40); if (i + 2 < pts.length) { c.moveTo(pts[i][0], pts[i][1] + 30); c.lineTo(pts[i + 2][0], base + 10); } }
    c.stroke();
    /* a loop-de-loop on the far ride */
    c.strokeStyle = '#8a5cff'; c.lineWidth = 6; c.beginPath(); c.arc(1350, base - 110, 92, 0, TAU); c.stroke();
    c.beginPath(); c.arc(-900, base - 90, 75, 0, TAU); c.stroke();
  });
}

function drawWheel(c, cx, cy, R, t, seedOff) {
  const rot = t * .16 + seedOff;
  const boost = pulse('clack', t, .12);
  c.save();
  c.translate(cx, cy);
  /* A-frame legs */
  c.strokeStyle = '#1a0a45'; c.lineWidth = 18; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-R * .62, R * 1.32); c.lineTo(0, 0); c.lineTo(R * .62, R * 1.32); c.stroke();
  c.strokeStyle = '#4a2a9c'; c.lineWidth = 5; c.stroke();
  /* rim + spokes */
  c.rotate(rot);
  c.strokeStyle = '#1a0a45'; c.lineWidth = 22;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, R * .72, 0, TAU); c.stroke();
  c.strokeStyle = '#ff7ac6'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = '#a06cff'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R * .72, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(160,108,255,.8)'; c.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = TAU * i / 12; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.stroke(); }
  /* rim lights */
  for (let i = 0; i < 40; i++) {
    const a = TAU * i / 40, on = ((i + Math.floor(t * 9)) % 4 === 0) ? 1 : .35;
    c.fillStyle = `rgba(255,${Math.round(200 + 55 * boost)},120,${clamp(on * .9 + boost * .5)})`;
    c.beginPath(); c.arc(Math.cos(a) * R, Math.sin(a) * R, 7 + on * 3 + boost * 4, 0, TAU); c.fill();
  }
  /* gondolas: always upright */
  for (let i = 0; i < 12; i++) {
    const a = TAU * i / 12, gx = Math.cos(a) * R, gy = Math.sin(a) * R;
    c.save(); c.translate(gx, gy); c.rotate(-rot);
    c.strokeStyle = '#1a0a45'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 44); c.stroke();
    c.fillStyle = pop(i + seedOff * 3); c.strokeStyle = C.ink; c.lineWidth = 6;
    c.beginPath(); c.roundRect(-30, 40, 60, 52, 14); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,246,232,.85)'; c.beginPath(); c.roundRect(-20, 52, 40, 20, 8); c.fill();
    c.restore();
  }
  c.fillStyle = C.yellow; c.strokeStyle = C.ink; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.stroke();
  c.restore();
}

function drawTents(c, cam, t) {
  withLayer(c, cam, .7, () => {
    const base = VG + 40;
    c.fillStyle = '#1b0a3f'; c.fillRect(-4000, base, 12000, 4000);
    c.fillStyle = '#5a2fc0'; c.fillRect(-4000, base, 12000, 8);
    for (let i = 0; i < 26; i++) {
      const u = -2400 + i * 330 + hash1(i * 3.3) * 90, w = 210 + hash1(i * 1.7) * 120, h = 150 + hash1(i * 5.1) * 120;
      const col = pop(i * 2 + 1), col2 = C.cream;
      c.save(); c.translate(u, base);
      c.fillStyle = '#26105a'; c.fillRect(-w / 2, -h * .48, w, h * .48);
      for (let k = 0; k < 6; k++) {
        c.fillStyle = k % 2 ? col : col2;
        c.beginPath(); c.moveTo(-w / 2 + k * w / 6, -h * .48); c.lineTo(-w / 2 + (k + 1) * w / 6, -h * .48); c.lineTo(0, -h); c.closePath(); c.fill();
      }
      c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(-w / 2, -h * .48); c.lineTo(0, -h); c.lineTo(w / 2, -h * .48); c.closePath(); c.stroke();
      c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -h); c.lineTo(0, -h - 40); c.stroke();
      c.fillStyle = C.yellow; c.beginPath(); c.moveTo(0, -h - 40); c.lineTo(38, -h - 28 + Math.sin(t * 6 + i) * 4); c.lineTo(0, -h - 16); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,225,120,.9)'; c.beginPath(); c.roundRect(-w * .16, -h * .38, w * .32, h * .38, 12); c.fill();
      c.restore();
      /* string lights to the next tent */
      c.strokeStyle = 'rgba(255,225,120,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(u, base - h * .5); c.quadraticCurveTo(u + 165, base - h * .5 + 60, u + 330, base - 150); c.stroke();
      for (let k = 1; k < 6; k++) { const q = k / 6; c.fillStyle = k % 2 ? C.yellow : C.pink; c.beginPath(); c.arc(lerp(u, u + 330, q), lerp(base - h * .5, base - 150, q) + Math.sin(q * PI) * 46, 5, 0, TAU); c.fill(); }
    }
  });
}

/* ---- world: track, supports, cart ------------------------------------------ */
function drawTrackWorld(c, cam, t, zoom) {
  const sC = cartS(t), s0 = Math.max(0, sC - 2400 / zoom), s1 = sC + 3200 / zoom;
  /* supports */
  c.lineCap = 'butt';
  const gy = GROUND_Y + CAM0.y * 0;      // ground in world coords = its authored y (world y is absolute)
  const step = 240;
  let prev = null;
  for (let s = Math.ceil(s0 / step) * step; s < s1; s += step) {
    if (s > 1400 + 503 + 2700 + 620 && s < 1400 + 503 + 2700 + 620 + 1200) { /* plunge: taller scaffold */ }
    const p = sideAt(s), top = p.y + 16, bot = Math.max(top + 30, 240 + 0);
    const groundY = 240;                   // world ground (lift base sits here)
    c.strokeStyle = '#1a0a45'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(p.x, top); c.lineTo(p.x, groundY); c.stroke();
    c.strokeStyle = '#6a3fe0'; c.lineWidth = 6; c.stroke();
    if (prev && Math.abs(prev.x - p.x) < 400) {
      c.strokeStyle = 'rgba(122,77,255,.75)'; c.lineWidth = 5;
      c.beginPath();
      const hTop = Math.min(prev.top, top), hBot = groundY;
      for (let y = hBot; y > Math.max(prev.top, top) + 20; y -= 230) {
        c.moveTo(prev.x, y); c.lineTo(p.x, y);
        c.moveTo(prev.x, y); c.lineTo(p.x, y - 230);
      }
      c.stroke();
    }
    prev = { x: p.x, top };
  }
  /* rail body */
  const sp = 24;
  const pathRail = (off) => {
    c.beginPath();
    let first = true;
    for (let s = s0; s <= s1; s += sp) {
      const p = sideAt(s), nx = Math.sin(p.a) * off, ny = Math.cos(p.a) * off;
      first ? (c.moveTo(p.x - nx * -1 * -1, p.y - ny), first = false) : c.lineTo(p.x - nx * -1 * -1, p.y - ny);
    }
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = C.ink; c.lineWidth = 34; pathRail(0); c.stroke();
  c.strokeStyle = C.cream; c.lineWidth = 20; pathRail(0); c.stroke();
  c.strokeStyle = '#ff9ad2'; c.lineWidth = 5; pathRail(-4); c.stroke();
  /* chain teeth + sleepers */
  const chainOn = sC < 1400 + 503 + 2700 + 120;
  for (let s = Math.ceil(s0 / 36) * 36; s <= s1; s += 36) {
    const p = sideAt(s), ux = -Math.sin(p.a), uy = -Math.cos(p.a), tx = Math.cos(p.a), ty = -Math.sin(p.a);
    if (chainOn && s > 1400 + 503 - 200 && s < 1400 + 503 + 2700 + 300) {
      c.fillStyle = '#2a1260'; c.save(); c.translate(p.x + ux * 22, p.y + uy * 22); c.rotate(-p.a); c.beginPath(); c.roundRect(-9, -7, 18, 14, 3); c.fill();
      c.fillStyle = C.yellow; c.fillRect(-3, -2, 6, 4); c.restore();
    }
    c.strokeStyle = 'rgba(10,6,32,.7)'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(p.x - ux * 15, p.y - uy * 15); c.lineTo(p.x - ux * 34, p.y - uy * 34); c.stroke();
  }
}

function drawCart(c, t, pose, zoom) {
  const k = pulse('clack', t, .09);
  const drop = t >= DROP_T;
  const hangU = unlerp(HANG1[0], HANG1[1], t);
  c.save();
  c.translate(pose.x, pose.y); c.rotate(-pose.a);
  c.scale(1 + .045 * k, 1 - .05 * k);
  /* sparks at the rear axle: the anti-rollback dog biting the chain */
  const cs = since('clack', t);
  if (cs < .22 && !drop) {
    const u = cs / .22, ci = count('clack', t);
    for (let i = 0; i < 9; i++) {
      const a = -PI * (.15 + .7 * hash1(ci * 13 + i)) - .4, d = (30 + 80 * hash1(ci * 7 + i)) * E.outCubic(u);
      c.strokeStyle = i % 2 ? C.yellow : C.white; c.lineWidth = 5 * (1 - u); c.lineCap = 'round';
      c.beginPath(); c.moveTo(-190 + Math.cos(a) * d * .5, -20 + Math.sin(a) * d * .5); c.lineTo(-190 + Math.cos(a) * d, -20 + Math.sin(a) * d); c.stroke();
    }
  }
  /* wheels */
  const wheel = x => { c.fillStyle = C.ink; c.beginPath(); c.arc(x, -26, 27, 0, TAU); c.fill(); c.fillStyle = C.cream; c.beginPath(); c.arc(x, -26, 14, 0, TAU); c.fill(); c.fillStyle = C.mag; c.beginPath(); c.arc(x, -26, 6, 0, TAU); c.fill(); };
  wheel(-190); wheel(190);
  /* riders (behind the tub) */
  const xs = [205, 0, -205];
  for (let i = 2; i >= 0; i--) {
    const rs = riderState(i, t, k, hangU);
    c.save();
    c.translate(xs[i] + rs.dx, -282 + rs.dy);
    c.scale(90, 90);
    CH.rider(c, RIDERS[i], rs.o);
    c.restore();
  }
  /* tub */
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(-306, -134, 630, 108, 38); c.fill();
  const tg = c.createLinearGradient(0, -128, 0, -34); tg.addColorStop(0, '#ff5cae'); tg.addColorStop(1, '#d1157a');
  c.fillStyle = tg; c.beginPath(); c.roundRect(-296, -124, 610, 88, 32); c.fill();
  c.fillStyle = C.cyan; c.beginPath(); c.roundRect(-270, -88, 560, 18, 9); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(-270, -116, 520, 10, 5); c.fill();
  /* nose + light */
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(280, -112, 74, 64, 26); c.fill();
  c.fillStyle = C.yellow; c.beginPath(); c.roundRect(292, -102, 52, 44, 20); c.fill();
  const gl = c.createRadialGradient(340, -78, 4, 340, -78, 130); gl.addColorStop(0, 'rgba(255,240,150,.7)'); gl.addColorStop(1, 'rgba(255,240,150,0)');
  c.fillStyle = gl; c.fillRect(200, -220, 300, 300);
  /* rear fin */
  c.fillStyle = C.ink; c.beginPath(); c.roundRect(-330, -190, 62, 100, 22); c.fill();
  c.fillStyle = C.violet; c.beginPath(); c.roundRect(-322, -182, 46, 84, 16); c.fill();
  /* lap bars */
  c.strokeStyle = C.ink; c.lineWidth = 16; c.lineCap = 'round';
  for (const x of xs) { c.beginPath(); c.moveTo(x + 62, -128); c.quadraticCurveTo(x + 96, -150, x + 70, -178); c.stroke(); }
  c.strokeStyle = C.cream; c.lineWidth = 7;
  for (const x of xs) { c.beginPath(); c.moveTo(x + 62, -128); c.quadraticCurveTo(x + 96, -150, x + 70, -178); c.stroke(); }
  c.restore();
}

/* per-rider performance */
function riderState(i, t, k, hangU) {
  const ph = i * .11;
  const drop = t >= DROP_T, dl = t - DROP_T;
  const fear = clamp(smooth(.15 + ph, 3.05, t) * .85 + (t >= HANG1[0] ? .15 : 0));
  const inHang = t >= HANG1[0] && t < DROP_T;
  const o = {
    fear, joy: clamp(.75 - fear * 1.1), wob: fear,
    lookX: .85, lookY: -.55 + (drop ? .6 : 0) - .18 * Math.sin(t * 4 + i * 2) * fear,
    flutter: t * 9 + i * 1.7,
    wind: drop ? clamp(dl * 6, 0, 1) * .95 + .05 : .06 + .18 * pulse('clack', t, .1),
    sweat: fear > .22 ? t * .8 + i * .37 : 0,
    teeth: i === 1 && fear > .55 && !drop,
    blink: (t > .5 + i * .3 && t < .62 + i * .3) ? Math.sin(unlerp(.5 + i * .3, .62 + i * .3, t) * PI) : 0,
    scream: 0, squeeze: 0, armUp: 0,
    headTilt: -.16 * k, tilt: 0,
  };
  let dx = -14 * k * (1 + i * .1), dy = -10 * k;
  if (inHang) {
    o.fear = 1; o.lookY = -.9; o.wob = 1.6;
    dx += Math.sin(t * 120 + i) * 2.2; dy += Math.cos(t * 97 + i * 2) * 2.2;
    o.sweat = t * 1.4 + i * .37;
    o.blink = 0;
  }
  if (drop) {
    const u = (i === 2 ? 0 : i === 0 ? .05 : .09);
    o.scream = clamp(smooth(u, u + .07, dl));
    o.squeeze = clamp(smooth(u + .02, u + .12, dl));
    o.armUp = clamp(unlerp(.10 + u, .32 + u, dl));
    o.fear = .25; o.joy = 0; o.wob = 0;
    o.lookY = 0;
    dx += -30 * E.outCubic(clamp(dl / .3)) * (1 + i * .08);
    dy += Math.sin(t * 40 + i * 2) * 5;
    o.headTilt = -.22;
    o.armWave = 1.4;
    o.sweat = 0;
  }
  return { o, dx, dy };
}

/* ---- HUD pieces ---------------------------------------------------------------- */
const ECG_T = [...CLK];
for (let k = 0; k < 14; k++) ECG_T.push(DROP_T + .03 + k * .17);
function ecgVal(tt) {
  let v = 0;
  const g = (d, m, s, a) => a * Math.exp(-Math.pow((d - m) / s, 2));
  for (const tc of ECG_T) {
    const d = tt - tc; if (d < -.02 || d > .4) continue;
    const big = tc >= DROP_T ? 1.55 : 1;
    v += g(d, .04, .02, .12) + g(d, .085, .008, -.22) + g(d, .105, .009, 1.0 * big) + g(d, .13, .01, -.34) + g(d, .24, .04, .26);
  }
  return v;
}
function drawECG(c, t) {
  const x0 = 1450, y0 = 44, w = 410, h = 104;
  const a = smooth(.05, .4, t) * (1 - smooth(DROP_T + 1.3, DROP_T + 1.6, t));
  if (a <= .01) return;
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(10,6,32,.74)'; c.beginPath(); c.roundRect(x0, y0, w, h, 22); c.fill();
  c.strokeStyle = 'rgba(255,246,232,.24)'; c.lineWidth = 2; c.stroke();
  const wx0 = x0 + 20, wx1 = x0 + 262, mid = y0 + h * .6;
  c.save(); c.beginPath(); c.rect(wx0, y0 + 6, wx1 - wx0, h - 12); c.clip();
  c.strokeStyle = C.lime; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath();
  const inHang = t >= HANG1[0] && t < DROP_T;
  for (let x = wx0; x <= wx1; x += 2) {
    const tt = t - (wx1 - x) / (wx1 - wx0) * 1.5;
    let v = inHang ? 0 : ecgVal(tt);
    if (t > HANG1[0] && tt > HANG1[0]) v = 0;         // flatline through the hang
    v += (hash1(x * .77 + Math.floor(t * 60) * .13) - .5) * (inHang ? .1 : .03);
    x === wx0 ? c.moveTo(x, mid - v * 36) : c.lineTo(x, mid - v * 36);
  }
  c.stroke(); c.restore();
  c.fillStyle = C.lime; c.beginPath(); c.arc(wx1, mid - (inHang ? 0 : ecgVal(t)) * 36, 6, 0, TAU); c.fill();
  const bpm = Math.round(lerp(84, 178, E.inQuad(clamp(t / 3.1)))) + (t >= DROP_T ? 12 : 0);
  FONT.drawText(c, inHang ? '--' : String(bpm), x0 + w - 24, y0 + 40, 54, { wt: .2, align: 'r', color: inHang ? C.mag : C.white, track: .06 });
  FONT.drawText(c, 'BPM', x0 + w - 24, y0 + 82, 20, { wt: .16, align: 'r', color: C.yellow, track: .14 });
  c.restore();
}
function drawAlt(c, t, pose) {
  const a = smooth(.1, .5, t) * (1 - smooth(DROP_T + .25, DROP_T + .5, t));
  if (a <= .01) return;
  const alt = Math.max(0, Math.round((240 - pose.y) / 17.5));
  const x = 1860, y = 196;
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(10,6,32,.74)'; c.beginPath(); c.roundRect(x - 410, y, 410, 74, 22); c.fill();
  c.strokeStyle = 'rgba(255,246,232,.24)'; c.lineWidth = 2; c.stroke();
  FONT.drawText(c, 'ALT', x - 384, y + 37, 24, { wt: .16, align: 'l', color: C.yellow, track: .14 });
  const pop_ = 1 + .25 * pulse('clack', t, .1);
  c.save(); c.translate(x - 96, y + 37); c.scale(pop_, pop_);
  FONT.drawText(c, String(alt).padStart(3, '0'), 0, 0, 56, { wt: .2, align: 'r', color: C.white, track: .08 });
  c.restore();
  FONT.drawText(c, 'M', x - 30, y + 46, 30, { wt: .16, align: 'r', color: C.cyan, track: .1 });
  c.restore();
}

/* ---- kinetic words -------------------------------------------------------------- */
const HOLD_T = [0, .4167, .8333, 1.25, null, 1.6667, 1.875, 2.0833];
function drawHoldOn(c, t) {
  if (t >= DROP_T + .55) return;
  const dl = t - DROP_T;
  const clackPop = pulse('clack', t, .08);
  const rumble = 2 + 12 * smooth(2.1, 3.1, t) + (t >= HANG1[0] ? 3 : 0);
  const word = 'HOLD ON!';
  const cols = [C.white, C.yellow];
  c.save();
  FONT.drawText(c, word, 790, 190, 204, {
    wt: .27, track: .05, outline: { w: 11, color: C.ink }, shadow: { dx: 15, dy: 17, color: C.mag, steps: 9 }, inline: 'rgba(255,90,160,.55)', color: C.white,
    fn: (i, ch) => {
      const t0 = HOLD_T[i]; if (t0 == null) return { skip: true };
      const lt = t - t0; if (lt < 0) return { skip: true };
      const u = clamp(lt / .2);
      const m = {
        sx: lerp(2.2, 1, E.outBack(u, 2.2)), sy: lerp(.35, 1, E.outBack(u, 2.8)),
        dy: lerp(-120, 0, E.outBack(u, 1.6)) + (hash1(t * 60 + i) - .5) * rumble * 1.4,
        dx: (hash1(t * 63 + i * 3) - .5) * rumble,
        rot: (hash1(t * 41 + i * 7) - .5) * .01 * rumble * .3,
        color: lt < .07 ? C.yellow : (clackPop > .5 && lt > .3 ? C.yellow : C.white),
      };
      m.sx *= 1 + .07 * clackPop; m.sy *= 1 + .07 * clackPop;
      if (dl > 0) {
        const hv = hash1(i * 5.5 + 1);
        m.dx += (hash1(i * 9.1) - .5) * 3600 * dl;
        m.dy += (-600 - hv * 900) * dl + 2600 * dl * dl;
        m.rot = (hash1(i * 2.3) - .5) * 16 * dl;
        m.sx *= 1 + 2.5 * dl; m.sy *= 1 + 2.5 * dl;
        m.alpha = clamp(1 - dl / .5);
      }
      return m;
    },
  });
  c.restore();
}
const WHOA_T = 3.333 + .16;
function drawWhoa(c, t) {
  const dl = t - WHOA_T;
  if (dl < 0 || t > 4.95) return;
  const out = smooth(4.55, 4.9, t);
  c.save();
  FONT.drawText(c, 'WHOA!', W / 2 - out * 2600, 250, 330, {
    wt: .27, track: .05, color: C.yellow, outline: { w: 14, color: C.ink }, shadow: { dx: 20, dy: 22, color: C.mag, steps: 10 }, inline: '#fff6d8',
    fn: (i) => {
      const lt = dl - i * .104; if (lt < 0) return { skip: true };
      const u = clamp(lt / .22);
      const kk = pulse('kick', t, .08);
      return {
        sx: lerp(3.2, 1, E.outBack(u, 2)) * (1 + .05 * kk), sy: lerp(.3, 1, E.outBack(u, 2.6)) * (1 + .05 * kk),
        dy: lerp(-200, 0, E.outBack(u, 1.4)) + Math.sin(t * 26 + i * 1.7) * 9,
        rot: Math.sin(t * 19 + i) * .045 + (1 - u) * (i % 2 ? .3 : -.3),
        color: i % 2 ? C.yellow : C.white,
      };
    },
  });
  c.restore();
}

function drawSpeedLines(c, t) {
  const dl = t - DROP_T;
  if (dl < 0) return;
  const a = smooth(0, .18, dl);
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const seed = i * 1.913, sp = 5200 + hash1(seed) * 9000, L = 260 + hash1(seed * 2.3) * 900;
    const off = hash1(seed * 3.7) * (W + 2 * L);
    const x = W + L - ((dl * sp + off) % (W + 2 * L));
    const y = hash1(seed * 5.1) * H, slope = .16;
    c.globalAlpha = a * (.25 + hash1(seed * 7.9) * .5);
    c.strokeStyle = i % 5 === 0 ? C.cyan : i % 5 === 1 ? C.pink : C.white;
    c.lineWidth = 2 + hash1(seed * 1.3) * 5;
    c.beginPath(); c.moveTo(x, y + (x - W / 2) * slope * .3); c.lineTo(x + L, y + (x + L - W / 2) * slope * .3); c.stroke();
  }
  c.restore();
}
function drawImpactFX(c, t) {
  const dl = t - DROP_T;
  if (dl < 0 || dl > .8) return;
  const u = dl / .6;
  c.save();
  c.strokeStyle = `rgba(255,246,232,${clamp(1 - u) * .9})`; c.lineWidth = 70 * (1 - clamp(u));
  c.beginPath(); c.arc(W * .4, H * .52, 1700 * E.outExpo(clamp(u)), 0, TAU); c.stroke();
  c.strokeStyle = `rgba(255,225,74,${clamp(1 - u) * .8})`; c.lineWidth = 26 * (1 - clamp(u));
  c.beginPath(); c.arc(W * .4, H * .52, 1200 * E.outExpo(clamp(u)), 0, TAU); c.stroke();
  for (let i = 0; i < 26; i++) {
    const a = TAU * i / 26 + hash1(i) * .2, r0 = 260 * E.outCubic(clamp(u * 2)), r1 = r0 + 320 * (1 - clamp(u));
    c.strokeStyle = i % 2 ? C.yellow : C.white; c.lineWidth = 9 * (1 - clamp(u)); c.globalAlpha = 1 - clamp(u);
    c.beginPath(); c.moveTo(W * .4 + Math.cos(a) * (r0 + 200), H * .52 + Math.sin(a) * (r0 + 200)); c.lineTo(W * .4 + Math.cos(a) * (r1 + 380), H * .52 + Math.sin(a) * (r1 + 380)); c.stroke();
  }
  c.restore();
}

/* ---- the shot -------------------------------------------------------------------- */
SCENES.climb = function (c, lt, t) {
  const cam = climbCam(t);
  c.save();
  c.translate(cam.ax, cam.ay); c.rotate(cam.rot); c.scale(cam.zoom, cam.zoom); c.translate(-cam.x, -cam.y);
  drawSkyLayers(c, cam, t);
  drawFarCoasters(c, cam, t);
  withLayer(c, cam, .42, () => drawWheel(c, -470, 80, 300, t, 0));
  drawTents(c, cam, t);
  drawTrackWorld(c, cam, t, cam.zoom);
  drawCart(c, t, cam.pose, cam.zoom);
  c.restore();

  /* screen-space */
  if (t >= HANG1[0] && t < DROP_T) {          // vertigo squeeze during the hang
    const u = unlerp(HANG1[0], HANG1[1], t);
    const g = c.createRadialGradient(cam.ax, cam.ay - 120, 160, cam.ax, cam.ay - 120, 1250);
    g.addColorStop(0, 'rgba(10,6,32,0)'); g.addColorStop(1, `rgba(10,6,32,${.85 * E.inQuad(u) + .15})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  drawSpeedLines(c, t);
  drawImpactFX(c, t);
  drawHoldOn(c, t);
  drawWhoa(c, t);
  drawECG(c, t);
  drawAlt(c, t, cam.pose);
};
SHOT_LIST.find(s => s.id === 'climb').sub = 5;
