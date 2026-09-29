'use strict';
/* ==========================================================================
   chars.js — three fearless passengers, drawn from scratch.
   One parametric face/body rig: fear, scream, squeezed “> <” eyes, sweat,
   blinking, wind-blown hair, arms in the air.  Head radius = 1 unit.
   ========================================================================== */
const RIDERS = [
  { id: 'pip', skin: '#ffa552', shirt: '#ff2e93', hair: '#ff2e93', style: 'spikes', seed: 1 },
  { id: 'bo',  skin: '#c8ff2e', shirt: '#1fe4ff', hair: '#7a4dff', style: 'tail',   seed: 2 },
  { id: 'zed', skin: '#5ef0ff', shirt: '#ffe14a', hair: '#ff7a2e', style: 'beanie', seed: 3 },
];

const CH = (() => {
  const INK = C.ink;
  const ln = (c, w) => { c.lineWidth = w; c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round'; };

  function hair(c, r, o, layer) {
    const w = o.wind || 0, fl = o.flutter || 0;
    c.save();
    if (r.style === 'spikes') {
      if (layer !== 'back') { c.restore(); return; }
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = rad(212 + i * (116 / (n - 1)));                 // fan across the top of the head
        const bx = Math.cos(a) * .96, by = Math.sin(a) * .93;
        const blow = w * (.55 + .5 * Math.sin(fl * 1.7 + i * 1.3) * .35);
        const dirA = a - blow * 1.25;
        const L = .62 + (i % 2) * .22;
        const tip = [bx + Math.cos(dirA) * L - w * .35 * (1 + .15 * Math.sin(fl + i)), by + Math.sin(dirA) * L];
        const nx = Math.cos(a + PI / 2) * .22, ny = Math.sin(a + PI / 2) * .22;
        c.beginPath(); c.moveTo(bx - nx, by - ny); c.quadraticCurveTo(bx + Math.cos(dirA) * L * .35, by + Math.sin(dirA) * L * .35, tip[0], tip[1]);
        c.quadraticCurveTo(bx + Math.cos(dirA) * L * .35 + nx * .6, by + Math.sin(dirA) * L * .35 + ny * .6, bx + nx, by + ny);
        c.closePath(); c.fillStyle = r.hair; c.fill(); ln(c, .08); c.stroke();
      }
    } else if (r.style === 'tail') {
      if (layer === 'back') {
        const ax = -.86, ay = -.2;
        const len = 1.5 + w * 1.2;
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const wav = Math.sin(fl * 2.3 - u * 5) * (.12 + .3 * w) * u;
          pts.push([ax - u * len * (.55 + .45 * w) - .1 * (1 - w) * u, ay + u * (.9 - w * .85) * (1 - w * .5) + wav]);
        }
        const path = () => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); };
        ln(c, .5); path(); c.stroke();
        c.strokeStyle = r.hair; c.lineWidth = .36; path(); c.stroke();
        c.fillStyle = C.yellow; c.beginPath(); c.arc(ax + .02, ay + .04, .18, 0, TAU); c.fill(); ln(c, .06); c.stroke();
      } else {
        c.fillStyle = r.hair;
        c.beginPath(); c.moveTo(-.95, -.3); c.quadraticCurveTo(-.3, -1.42, .86, -.5); c.quadraticCurveTo(.32, -.86, .1, -.62); c.quadraticCurveTo(-.3, -.9, -.6, -.6); c.closePath();
        c.fill(); ln(c, .08); c.stroke();
      }
    } else if (layer === 'front') {
      /* beanie with a flapping pompom */
      const px = -.2 - w * 1.0 + Math.sin(fl * 3) * .06 * w, py = -1.82 + w * .5 + Math.cos(fl * 2.6) * .06 * w;
      c.strokeStyle = INK; c.lineWidth = .07; c.beginPath(); c.moveTo(-.05, -1.6); c.quadraticCurveTo(-.1 - w * .5, -1.86, px, py); c.stroke();
      c.fillStyle = C.cream; c.beginPath(); c.arc(px, py, .27, 0, TAU); c.fill(); ln(c, .07); c.stroke();
      c.fillStyle = r.hair;
      c.beginPath(); c.moveTo(-.98, -.74); c.bezierCurveTo(-1.06, -1.78, 1.0, -1.78, .98, -.74); c.closePath(); c.fill(); ln(c, .08); c.stroke();
      c.strokeStyle = 'rgba(10,6,32,.32)'; c.lineWidth = .05;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * .28, -.8); c.lineTo(i * .21, -1.52 + Math.abs(i) * .06); c.stroke(); }
      c.fillStyle = C.cream; c.beginPath(); c.roundRect(-1.04, -.98, 2.08, .32, .16); c.fill(); ln(c, .07); c.stroke();
    }
    c.restore();
  }

  function eyes(c, r, o) {
    const fear = o.fear || 0, sq = o.squeeze || 0, blink = o.blink || 0;
    const lx = o.lookX || 0, ly = o.lookY || 0;
    const eyes_ = [[-.14, -.1], [.52, -.1]];
    eyes_.forEach(([ex, ey], k) => {
      const re = lerp(.27, .39, fear) * (k ? .94 : 1);
      if (sq > .02) {
        /* squeezed “> <” eye */
        const s = k ? -1 : 1;
        c.save(); c.globalAlpha = sq; ln(c, .1);
        c.beginPath(); c.moveTo(ex - s * .2, ey - .2 * sq); c.lineTo(ex + s * .16, ey); c.lineTo(ex - s * .2, ey + .2 * sq); c.stroke();
        c.restore();
      }
      if (sq < .98) {
        c.save(); c.globalAlpha = 1 - sq;
        c.beginPath(); c.arc(ex, ey, re, 0, TAU); c.fillStyle = C.white; c.fill(); ln(c, .06); c.stroke();
        const rp = lerp(.15, .07, fear);
        const mx = Math.cos(Math.atan2(ly, lx)) * Math.min(1, Math.hypot(lx, ly)) * (re - rp - .03);
        const my = Math.sin(Math.atan2(ly, lx)) * Math.min(1, Math.hypot(lx, ly)) * (re - rp - .03);
        c.fillStyle = INK; c.beginPath(); c.arc(ex + mx, ey + my, rp, 0, TAU); c.fill();
        c.fillStyle = C.white; c.beginPath(); c.arc(ex + mx - rp * .35, ey + my - rp * .35, rp * .32, 0, TAU); c.fill();
        if (blink > .02) {           /* eyelid */
          c.save(); c.beginPath(); c.arc(ex, ey, re + .03, 0, TAU); c.clip();
          c.fillStyle = r.skin; c.fillRect(ex - re - 1, ey - re - 1, re * 2 + 2, (re * 2 + 2) * blink);
          ln(c, .06); c.beginPath(); c.moveTo(ex - re, ey - re + (re * 2) * blink); c.lineTo(ex + re, ey - re + (re * 2) * blink); c.stroke();
          c.restore();
        }
        c.restore();
      }
      /* brow */
      const raise = (fear * .5 + (o.scream || 0) * .6) * .2;
      const worry = fear * .55 * (1 - sq * .6);
      const bx = ex, by = ey - re - .16 - raise;
      ln(c, .095);
      c.beginPath();
      const sgn_ = k ? -1 : 1, wv = worry * .12;              // worried: the ends nearest the nose lift
      c.moveTo(bx - .22, by + sgn_ * wv);
      c.lineTo(bx + .22, by - sgn_ * wv);
      c.stroke();
    });
  }

  function mouth(c, r, o) {
    const open = o.scream || 0, fear = o.fear || 0, joy = o.joy || 0;
    const mx = .4, my = .46;
    const wob = Math.sin((o.flutter || 0) * 9) * (o.wob || 0);
    if (open > .06) {
      const mw = lerp(.4, .82, open), mh = lerp(.1, .86, open);
      c.save();
      c.translate(mx, my + mh * .1 + wob * .03);
      c.beginPath(); c.ellipse(0, 0, mw / 2, mh / 2, 0, 0, TAU);
      c.fillStyle = '#3a0a2e'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#ff5c8a'; c.beginPath(); c.ellipse(0, mh * .42, mw * .38, mh * .3, 0, 0, TAU); c.fill();
      if (open > .3) { c.fillStyle = C.white; c.fillRect(-mw / 2, -mh / 2, mw, mh * .2); }
      c.restore();
      ln(c, .075); c.beginPath(); c.ellipse(0, 0, mw / 2, mh / 2, 0, 0, TAU); c.stroke();
      c.restore();
    } else {
      /* smile ↔ nervous wobble */
      const sm = (joy * .9 - fear * .55);
      ln(c, .085);
      c.beginPath();
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = mx - .28 + u * .56;
        const y = my + (Math.sin(u * PI) * sm * .3) + wob * Math.sin(u * PI * 3) * .05 + fear * .04 * Math.sin(u * PI * 5 + (o.flutter || 0) * 12);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      if (o.teeth) {
        c.fillStyle = C.white; c.beginPath(); c.roundRect(mx - .2, my - .04, .4, .14, .05); c.fill(); ln(c, .05); c.stroke();
      }
    }
  }

  /* draw one rider.  Origin = head centre, +x is the direction of travel. */
  function rider(c, r, o = {}) {
    const armUp = o.armUp || 0, fl = o.flutter || 0;
    c.save();
    c.scale(o.sx || 1, o.sy || 1);
    if (o.tilt) c.rotate(o.tilt);
    /* body */
    const sh = [[-.34, 1.05], [.44, 1.05]];
    const armEnd = (k) => {
      const up = E.outBack(clamp(armUp));
      const wave = Math.sin(fl * 6 + k * 2) * .25 * armUp * (o.armWave ?? 1);
      const hx = lerp(k ? 1.25 : .85, k ? 1.55 : -.55, up) + wave * .2;
      const hy = lerp(1.7, -1.95, up) + wave * .35;
      return [hx, hy];
    };
    c.fillStyle = r.shirt;
    c.beginPath(); c.roundRect(-.75, .82, 1.6, 1.3, .35); c.fill(); ln(c, .08); c.stroke();
    /* arms (behind head for raised, in front for gripping) */
    const arms = () => {
      sh.forEach(([sx, sy], k) => {
        const [hx, hy] = armEnd(k);
        ln(c, .58); c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + hx) / 2 + (armUp < .5 ? .25 : -.15), (sy + hy) / 2, hx, hy); c.stroke();
        c.strokeStyle = r.shirt; c.lineWidth = .42; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + hx) / 2 + (armUp < .5 ? .25 : -.15), (sy + hy) / 2, hx, hy); c.stroke();
        c.fillStyle = C.cream; c.beginPath(); c.arc(hx, hy, .3, 0, TAU); c.fill(); ln(c, .08); c.stroke();
        if (armUp > .5) { for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(hx + i * .16, hy - .22, .1, 0, TAU); c.fillStyle = C.cream; c.fill(); ln(c, .05); c.stroke(); } }
      });
    };
    if (armUp > .5) arms();
    /* head */
    c.save();
    if (o.headTilt) c.rotate(o.headTilt);
    hair(c, r, o, 'back');
    c.beginPath(); c.ellipse(0, 0, 1, .96, 0, 0, TAU);
    const g = c.createRadialGradient(-.3, -.4, .1, 0, 0, 1.15);
    g.addColorStop(0, mixc(r.skin, '#ffffff', .35)); g.addColorStop(.7, r.skin); g.addColorStop(1, mixc(r.skin, '#7a2a8a', .32));
    c.fillStyle = g; c.fill(); ln(c, .085); c.stroke();
    /* nose in profile */
    c.beginPath(); c.arc(.98, .1, .13, 0, TAU); c.fillStyle = r.skin; c.fill(); ln(c, .07); c.stroke();
    /* cheeks */
    c.fillStyle = 'rgba(255,60,120,.34)';
    c.beginPath(); c.arc(-.2, .42, .2, 0, TAU); c.fill(); c.beginPath(); c.arc(.78, .42, .17, 0, TAU); c.fill();
    hair(c, r, o, 'front');
    eyes(c, r, o); mouth(c, r, o);
    /* sweat */
    if (o.sweat > 0) {
      const p = (o.sweat * 3) % 1;
      c.save(); c.translate(-.62 - p * .12, -.62 + p * 1.0); c.globalAlpha = 1 - p * .7;
      c.fillStyle = '#7ad7ff'; c.beginPath(); c.moveTo(0, -.2); c.quadraticCurveTo(.16, .04, 0, .14); c.quadraticCurveTo(-.16, .04, 0, -.2); c.fill(); ln(c, .045); c.stroke();
      c.restore();
    }
    c.restore();
    if (armUp <= .5) arms();
    c.restore();
  }

  return { rider, hair, eyes, mouth };
})();
