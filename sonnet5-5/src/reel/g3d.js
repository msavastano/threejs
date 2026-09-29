'use strict';
/* ==========================================================================
   g3d.js — a small 3D engine for wireframe neon, written from scratch.
   • perspective camera with roll (so loops really flip the horizon)
   • near-plane line clipping, depth fog, additive glow strokes
   • a turtle-graphics rollercoaster: pitch / yaw / bank / corkscrew segments
     integrate into a smooth track with a proper rolling frame
   World: x right, y up, z forward.  pitch>0 = nose up, yaw>0 = turn right,
   roll>0 = bank right.
   ========================================================================== */
const G3 = (() => {
  /* ---------------------------------------------------------------- camera */
  function camera(pos, target, up, fovDeg, w = W, h = H) {
    const f = norm3(sub3(target, pos));
    const r = norm3(cross3(up, f));
    const u = cross3(f, r);
    return { pos, f, r, u, fpx: (w / 2) / Math.tan(rad(fovDeg) / 2), cx: w / 2, cy: h / 2 };
  }
  function toCam(cam, p) {
    const d = sub3(p, cam.pos);
    return [dot3(d, cam.r), dot3(d, cam.u), dot3(d, cam.f)];
  }
  function proj(cam, pc) { /* pc: camera-space point with z>0 */
    return [cam.cx + cam.fpx * pc[0] / pc[2], cam.cy - cam.fpx * pc[1] / pc[2]];
  }
  const NEAR = .25;
  /* clip a camera-space segment to the near plane; returns null or [a,b] */
  function clipNear(a, b) {
    if (a[2] < NEAR && b[2] < NEAR) return null;
    if (a[2] >= NEAR && b[2] >= NEAR) return [a, b];
    const t = (NEAR - a[2]) / (b[2] - a[2]);
    const m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR];
    return a[2] < NEAR ? [m, b] : [a, m];
  }

  /* --------------------------------------------------------------- track */
  const DS = .5;
  function buildTrack() {
    let P = [0, 0, 0], T = [0, 0, 1], U = [0, 1, 0], R = [1, 0, 0];
    const pts = [], Ts = [], Us = [], Rs = [];
    const push = () => { pts.push(P.slice()); Ts.push(T.slice()); Us.push(U.slice()); Rs.push(R.slice()); };
    push();
    const Y = [0, 1, 0];
    function seg(len, pitch = 0, yaw = 0, roll = 0, helix = null) {
      const n = Math.max(1, Math.round(len / DS));
      for (let i = 0; i < n; i++) {
        const w = 1 - Math.cos(TAU * (i + .5) / n);         // raised-cosine rate profile, mean 1
        const dp = rad(pitch) / n * w, dy = rad(yaw) / n * w, dr = rad(roll) / n * w;
        if (dp) { T = rot3(T, R, -dp); U = rot3(U, R, -dp); }
        if (dy) { T = rot3(T, Y, dy); U = rot3(U, Y, dy); R = rot3(R, Y, dy); }
        if (dr) { U = rot3(U, T, -dr); R = rot3(R, T, -dr); }
        if (helix) {
          const ph = TAU * helix.cycles * (i + .5) / n;
          const kp = helix.kappa * Math.cos(ph) * DS, ky = helix.kappa * Math.sin(ph) * DS;
          T = rot3(T, R, -kp); U = rot3(U, R, -kp);
          T = rot3(T, U, ky); R = rot3(R, U, ky);
          const rr = TAU * helix.cycles / n;               // and roll the whole frame
          U = rot3(U, T, -rr); R = rot3(R, T, -rr);
        }
        T = norm3(T); R = norm3(cross3(U, T)); U = cross3(T, R);
        P = add3(P, mul3(T, DS));
        push();
      }
    }
    /* ---- the ride ---- */
    seg(8);                                   // crest
    seg(34, -70);                             // tip over
    seg(50);                                  // the plunge
    seg(48, +70);                             // pull-out
    seg(22);
    seg(100, +360, -17);                      // vertical loop (with a little helix so it clears itself)
    seg(26);
    seg(24, 0, 0, +52); seg(76, 0, +150, 0); seg(24, 0, 0, -52);   // banked right-hander
    seg(18);
    seg(28, +42); seg(14); seg(46, -84); seg(14); seg(28, +42);    // camelback
    seg(20);
    seg(120, 0, 0, 0, { kappa: .05, cycles: 2 });                  // corkscrew (720° roll)
    seg(24);
    seg(20, 0, 0, -48); seg(72, 0, -140, 0); seg(20, 0, 0, +48);   // banked left-hander
    seg(30);
    seg(90);                                  // brake run
    /* lift so the lowest point sits just above the ground */
    let minY = 1e9; for (const p of pts) minY = Math.min(minY, p[1]);
    const lift = 4 - minY;
    for (const p of pts) p[1] += lift;
    /* landmark arclengths (units) — found by walking the same recipe */
    return { pts, Ts, Us, Rs, n: pts.length, length: (pts.length - 1) * DS };
  }
  const TRACK = buildTrack();
  /* named stretches of the ride (arclength in units) */
  const S = { crest: 0, plungeStart: 8, bottom: 8 + 34 + 50 + 20, loopStart: 8 + 34 + 50 + 48 + 22, };
  S.loopEnd = S.loopStart + 100;
  S.turn1 = S.loopEnd + 26;
  S.camel = S.turn1 + 24 + 76 + 24 + 18;
  S.cork = S.camel + 28 + 14 + 46 + 14 + 28 + 20;
  S.cork2 = S.cork + 120;
  S.turn2 = S.cork2 + 24;
  S.end = TRACK.length;

  function sample(s) {
    const x = clamp(s / DS, 0, TRACK.n - 1.001), i = Math.floor(x), f = x - i;
    const L = (a, b) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    const p = L(TRACK.pts[i], TRACK.pts[i + 1]);
    const T = norm3(L(TRACK.Ts[i], TRACK.Ts[i + 1]));
    const U0 = L(TRACK.Us[i], TRACK.Us[i + 1]);
    const R = norm3(cross3(U0, T)), U = cross3(T, R);
    return { p, T, U, R };
  }

  /* ---------------------------------------------------------------- draw */
  const fog = (z, zf) => { const k = 1 - z / zf; return k <= 0 ? 0 : k * k; };

  function line3(c, cam, a, b, col, w, alpha, zf) {
    const ca = toCam(cam, a), cb = toCam(cam, b);
    const cl = clipNear(ca, cb);
    if (!cl) return;
    const zm = (cl[0][2] + cl[1][2]) * .5;
    const al = alpha * fog(zm, zf);
    if (al < .012) return;
    const p0 = proj(cam, cl[0]), p1 = proj(cam, cl[1]);
    if ((p0[0] < -200 && p1[0] < -200) || (p0[0] > W + 200 && p1[0] > W + 200) || (p0[1] < -200 && p1[1] < -200) || (p0[1] > H + 200 && p1[1] > H + 200)) return;
    c.globalAlpha = al;
    c.strokeStyle = col;
    c.lineWidth = clamp(w * cam.fpx / zm, .7, 26);
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
  }

  /* horizon-aware sky: fills the screen with ground colour, then the sky half-plane */
  function sky(c, cam, o = {}) {
    const top = o.top || C.night, mid = o.mid || C.plum, hor = o.hor || '#ff5aa0', gnd = o.gnd || '#0c0524';
    /* world up expressed in camera axes */
    const up = [cam.r[1], cam.u[1], cam.f[1]];       // dot(world_up, r), dot(world_up, u), dot(world_up, f)
    c.fillStyle = gnd; c.fillRect(0, 0, W, H);
    /* horizon line: up.x*px - up.y*py + up.z*fpx = 0  (px,py relative to centre, y down) */
    const nx = up[0], ny = -up[1], k = up[2] * cam.fpx;
    const nl = Math.hypot(nx, ny) || 1e-6;
    const d0 = -k / nl;                                // signed distance of horizon from centre along n
    const ux = nx / nl, uy = ny / nl;                  // direction pointing to the sky side (in screen space y-down coords)
    /* screen-space unit vector that points "up in the world" */
    const dirx = ux, diry = uy;
    const R = Math.hypot(W, H);
    const cx = W / 2, cy = H / 2;
    const hx = cx + dirx * d0, hy = cy + diry * d0;    // point on the horizon
    const g = c.createLinearGradient(hx, hy, hx + dirx * R * .55, hy + diry * R * .55);
    g.addColorStop(0, hor); g.addColorStop(.28, mid); g.addColorStop(1, top);
    c.save();
    c.beginPath();
    const tx = -diry, ty = dirx;                       // tangent
    c.moveTo(hx + tx * R * 2, hy + ty * R * 2); c.lineTo(hx - tx * R * 2, hy - ty * R * 2);
    c.lineTo(hx - tx * R * 2 + dirx * R * 2, hy - ty * R * 2 + diry * R * 2);
    c.lineTo(hx + tx * R * 2 + dirx * R * 2, hy + ty * R * 2 + diry * R * 2);
    c.closePath(); c.fillStyle = g; c.fill();
    /* ground haze right under the horizon */
    const g2 = c.createLinearGradient(hx, hy, hx - dirx * 260, hy - diry * 260);
    g2.addColorStop(0, o.haze || 'rgba(255,90,160,.55)'); g2.addColorStop(1, 'rgba(255,90,160,0)');
    c.beginPath();
    c.moveTo(hx + tx * R * 2, hy + ty * R * 2); c.lineTo(hx - tx * R * 2, hy - ty * R * 2);
    c.lineTo(hx - tx * R * 2 - dirx * 260, hy - ty * R * 2 - diry * 260); c.lineTo(hx + tx * R * 2 - dirx * 260, hy + ty * R * 2 - diry * 260);
    c.closePath(); c.fillStyle = g2; c.fill();
    c.restore();
    return { hx, hy, dirx, diry, tx, ty, d0 };
  }

  /* glowing sun disc at a world direction (with slats) */
  function sun(c, cam, dir, radiusPx, hz) {
    const d = norm3(dir);
    const pc = [dot3(d, cam.r), dot3(d, cam.u), dot3(d, cam.f)];
    if (pc[2] <= .05) return;
    const p = proj(cam, pc);
    c.save();
    const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], radiusPx * 3.2);
    g.addColorStop(0, 'rgba(255,225,110,.55)'); g.addColorStop(1, 'rgba(255,90,160,0)');
    c.fillStyle = g; c.fillRect(p[0] - radiusPx * 3.2, p[1] - radiusPx * 3.2, radiusPx * 6.4, radiusPx * 6.4);
    const gg = c.createLinearGradient(0, p[1] - radiusPx, 0, p[1] + radiusPx);
    gg.addColorStop(0, C.yellow); gg.addColorStop(1, C.mag);
    c.beginPath(); c.arc(p[0], p[1], radiusPx, 0, TAU); c.clip();
    c.fillStyle = gg; c.fillRect(p[0] - radiusPx, p[1] - radiusPx, radiusPx * 2, radiusPx * 2);
    c.fillStyle = 'rgba(20,10,60,.9)';
    for (let i = 0; i < 6; i++) { const y = p[1] + radiusPx * (.05 + i * .17), h = radiusPx * (.02 + i * .022); c.fillRect(p[0] - radiusPx, y, radiusPx * 2, h); }
    c.restore();
  }

  /* infinite floor grid */
  function grid(c, cam, o = {}) {
    const sp = o.spacing || 12, ext = o.extent || 26, zf = o.fog || 420, y = 0;
    const cxg = Math.round(cam.pos[0] / sp) * sp, czg = Math.round(cam.pos[2] / sp) * sp;
    c.lineCap = 'butt';
    for (let i = -ext; i <= ext; i++) {
      const x = cxg + i * sp, z = czg + i * sp;
      const a = o.alpha ?? .55;
      line3(c, cam, [x, y, czg - ext * sp], [x, y, czg + ext * sp], o.colA || C.violet, .12, a, zf);
      line3(c, cam, [cxg - ext * sp, y, z], [cxg + ext * sp, y, z], o.colB || C.violet, .12, a, zf);
    }
  }

  /* wireframe skyline: deterministic boxes scattered around the whole track */
  const CITY = (() => {
    const r = mulberry32(2024), arr = [];
    for (let i = 0; i < 260; i++) {
      const s = r() * TRACK.length, sm = sample(s);
      const side = r() < .5 ? -1 : 1, off = 26 + r() * 170;
      const p = [sm.p[0] + sm.R[0] * off * side + (r() - .5) * 30, 0, sm.p[2] + sm.R[2] * off * side + (r() - .5) * 30];
      arr.push({ x: p[0], z: p[2], w: 5 + r() * 12, d: 5 + r() * 12, h: 8 + Math.pow(r(), 1.8) * 70, hue: r() });
    }
    return arr;
  })();
  function city(c, cam, o = {}) {
    const zf = o.fog || 520;
    c.lineCap = 'round';
    for (const b of CITY) {
      const dx = b.x - cam.pos[0], dz = b.z - cam.pos[2];
      if (dx * cam.f[0] + dz * cam.f[2] < -20) continue;
      if (dx * dx + dz * dz > zf * zf) continue;
      const col = b.hue < .33 ? C.cyan : b.hue < .66 ? C.mag : C.violet;
      const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
      const P = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]];
      for (let k = 0; k < 4; k++) {
        const a = P[k], bb = P[(k + 1) % 4];
        line3(c, cam, [a[0], b.h, a[2]], [bb[0], b.h, bb[2]], col, .16, .7, zf);
        line3(c, cam, a, [a[0], b.h, a[2]], col, .12, .5, zf);
        if (b.h > 40) line3(c, cam, [a[0], b.h * .55, a[2]], [bb[0], b.h * .55, bb[2]], col, .1, .3, zf);
      }
    }
  }

  /* the track itself */
  function track(c, cam, s0, s1, o = {}) {
    const zf = o.fog || 300, tie = o.tie || 1.5, pulseK = o.pulse || 0;
    const tint = o.tint;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const i0 = Math.max(0, Math.floor(s0 / DS)), i1 = Math.min(TRACK.n - 1, Math.ceil(s1 / DS));
    const wm = o.width || 1;
    const railW = (.16 + pulseK * .05) * wm;
    const half = .62, drop = .78;
    const rails = [[], [], []];   // left, right, spine in world coords
    for (let i = i0; i <= i1; i++) {
      const p = TRACK.pts[i], U = TRACK.Us[i], R = TRACK.Rs[i];
      rails[0].push(add3(p, add3(mul3(R, -half), mul3(U, .0))));
      rails[1].push(add3(p, add3(mul3(R, half), mul3(U, .0))));
      rails[2].push(add3(p, mul3(U, -drop)));
    }
    const cols = [tint ? tint[0] : C.mag, tint ? tint[1] : C.cyan, tint ? tint[2] : '#b9a3ff'];
    /* far → near so nearer glow overlays */
    const cams = rails.map(r => r.map(q => toCam(cam, q)));
    const step = Math.max(1, Math.round(tie / DS));
    /* glow pass (wide, dim) then core pass (thin, bright) */
    for (let pass = 0; pass < 2; pass++) {
      for (let r = 0; r < 3; r++) {
        const pc = cams[r];
        c.strokeStyle = cols[r];
        const wdt = (r === 2 ? railW * .7 : railW) * (pass === 0 ? 3.2 : 1);
        const a0 = (r === 2 ? .55 : .95) * (pass === 0 ? .16 : 1);
        for (let k = pc.length - 1; k > 0; k--) {
          const cl = clipNear(pc[k - 1], pc[k]);
          if (!cl) continue;
          const zm = (cl[0][2] + cl[1][2]) * .5;
          const al = a0 * fog(zm, zf);
          if (al < .01) continue;
          const p0 = proj(cam, cl[0]), p1 = proj(cam, cl[1]);
          c.globalAlpha = al; c.lineWidth = clamp(wdt * cam.fpx / zm, .8, 34);
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
        }
      }
    }
    /* ties + lattice struts */
    for (let k = pcLen(cams[0]) - 1; k >= 0; k -= step) {
      const a = cams[0][k], b = cams[1][k], s = cams[2][k];
      const seg_ = (p, q, col, w, al) => {
        const cl = clipNear(p, q); if (!cl) return;
        const zm = (cl[0][2] + cl[1][2]) * .5, aa = al * fog(zm, zf); if (aa < .01) return;
        const p0 = proj(cam, cl[0]), p1 = proj(cam, cl[1]);
        c.globalAlpha = aa; c.strokeStyle = col; c.lineWidth = clamp(w * cam.fpx / zm, .7, 20);
        c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      };
      seg_(a, b, C.yellow, .1 * wm, .85);
      seg_(a, s, '#7a4dff', .07 * wm, .7);
      seg_(b, s, '#7a4dff', .07 * wm, .7);
      /* supports */
      if ((i0 + k) % (step * 5) === 0) {
        const wp = rails[2][k];
        line3(c, cam, wp, [wp[0], 0, wp[2]], '#5a3bd6', .08 * wm, .8, zf);
      }
    }
    c.globalAlpha = 1;
  }
  const pcLen = a => a.length;

  /* glowing gates around the track that beat with the kick */
  function gates(c, cam, sC, o = {}) {
    const every = o.every || 55, zf = o.fog || 320;
    const s0 = Math.floor((sC - 20) / every) * every;
    c.lineCap = 'round';
    for (let s = s0; s < sC + zf; s += every) {
      if (s < 0 || s > TRACK.length) continue;
      const sm = sample(s), col = pop(Math.round(s / every));
      const N = 28, rr = o.radius || 5.6;
      const ring = [];
      for (let i = 0; i <= N; i++) { const a = TAU * i / N; ring.push(add3(sm.p, add3(mul3(sm.U, Math.sin(a) * rr), mul3(sm.R, Math.cos(a) * rr)))); }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) line3(c, cam, ring[i], ring[i + 1], pass ? C.white : col, pass ? .12 : .5, pass ? (.8 + (o.pulse || 0) * .2) : .32, zf);
    }
    c.globalAlpha = 1;
  }

  /* world-fixed streaming dust along the whole ride */
  const DUST = (() => {
    const r = mulberry32(77), arr = [];
    for (let i = 0; i < 1700; i++) {
      const s = r() * TRACK.length, sm = sample(s), a = r() * TAU, rr = 4 + Math.pow(r(), .6) * 60;
      arr.push({ p: add3(sm.p, add3(mul3(sm.U, Math.sin(a) * rr), mul3(sm.R, Math.cos(a) * rr))), col: pop(Math.floor(r() * 7)), sz: .05 + r() * .12 });
    }
    return arr;
  })();
  function dust(c, cam, sC, speed, zf = 200) {
    c.lineCap = 'round';
    const sl = Math.max(.001, speed) * .022;
    for (const d of DUST) {
      const dd = sub3(d.p, cam.pos);
      const z = dot3(dd, cam.f);
      if (z < .5 || z > zf) continue;
      const a = toCam(cam, d.p), b = toCam(cam, sub3(d.p, mul3(cam.f, -sl)));   // streak toward camera-forward
      const cl = clipNear(a, b); if (!cl) continue;
      const p0 = proj(cam, cl[0]), p1 = proj(cam, cl[1]);
      if (p0[0] < -50 || p0[0] > W + 50 || p0[1] < -50 || p0[1] > H + 50) continue;
      c.globalAlpha = fog(z, zf) * .9; c.strokeStyle = d.col; c.lineWidth = clamp(d.sz * cam.fpx / z, .8, 5);
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* first-person cart camera at arclength s */
  function cartCam(s, o = {}) {
    const sm = sample(s), la = o.look || 16, lift = o.lift ?? 1.15;
    const ahead = sample(s + la);
    const pos = add3(sm.p, mul3(sm.U, lift));
    const tgt = add3(ahead.p, mul3(ahead.U, lift * .85));
    /* blend the camera up between track-up and the look-ahead frame → anticipates rolls */
    const up = norm3(add3(mul3(sm.U, 1 - (o.anticip ?? .0)), mul3(ahead.U, o.anticip ?? .0)));
    return camera(pos, tgt, up, o.fov || 82);
  }

  return { camera, toCam, proj, clipNear, TRACK, S, sample, sky, sun, grid, city, track, gates, dust, cartCam, line3, fog, DS };
})();
