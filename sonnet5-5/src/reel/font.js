'use strict';
/* ==========================================================================
   font.js — a display typeface drawn from scratch.
   Every glyph is a skeleton of strokes on a unit grid (cap height = 1, y down),
   rendered with fat round caps so type feels like coaster track.  Because
   glyphs are geometry, letters can be drawn-on, thrown, stretched, extruded…
   ========================================================================== */
const FONT = (() => {
  const A = (cx, cy, rx, ry, a0, a1, n) => {
    n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / 7));
    const p = [];
    for (let i = 0; i <= n; i++) { const a = rad(lerp(a0, a1, i / n)); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return p;
  };
  const cat = (...parts) => parts.flat();
  const bowl = (x0, y0, y1, xr) => {
    const ry = (y1 - y0) / 2, rx = Math.min(ry, xr - x0);
    return cat([[x0, y0], [xr - rx, y0]], A(xr - rx, y0 + ry, rx, ry, -90, 90), [[x0, y1]]);
  };
  const flip = (st, w) => st.map(s => s.map(([x, y]) => [w - x, 1 - y]));
  const DOT = (x, y) => [[x, y], [x, y]];

  const G = {};
  const def = (ch, w, strokes) => { G[ch] = { w, s: strokes }; };

  /* ---- capitals ---- */
  def('A', .74, [[[0, 1], [.37, 0], [.74, 1]], [[.15, .68], [.59, .68]]]);
  def('B', .6, [[[0, 0], [0, 1]], bowl(0, 0, .52, .58), bowl(0, .5, 1, .6)]);
  def('C', .66, [A(.33, .5, .33, .5, -42, -318)]);
  def('D', .66, [cat([[0, 0], [.2, 0]], A(.2, .5, .46, .5, -90, 90), [[0, 1], [0, 0]])]);
  def('E', .56, [[[.56, 0], [0, 0], [0, 1], [.56, 1]], [[0, .5], [.46, .5]]]);
  def('F', .54, [[[.54, 0], [0, 0], [0, 1]], [[0, .5], [.44, .5]]]);
  def('G', .68, [cat(A(.34, .5, .34, .5, -42, -360), [[.36, .5]])]);
  def('H', .64, [[[0, 0], [0, 1]], [[.64, 0], [.64, 1]], [[0, .5], [.64, .5]]]);
  def('I', 0, [[[0, 0], [0, 1]]]);
  def('J', .5, [cat([[.5, 0], [.5, .66]], A(.25, .66, .25, .34, 0, 180))]);
  def('K', .62, [[[0, 0], [0, 1]], [[.62, 0], [.02, .62]], [[.22, .46], [.64, 1]]]);
  def('L', .5, [[[0, 0], [0, 1], [.5, 1]]]);
  def('M', .86, [[[0, 1], [0, 0], [.43, .66], [.86, 0], [.86, 1]]]);
  def('N', .66, [[[0, 1], [0, 0], [.66, 1], [.66, 0]]]);
  def('O', .7, [A(.35, .5, .35, .5, -90, 270)]);
  def('P', .58, [[[0, 1], [0, 0]], bowl(0, 0, .58, .56)]);
  def('Q', .7, [A(.35, .5, .35, .5, -90, 270), [[.44, .7], [.72, 1.04]]]);
  def('R', .6, [[[0, 1], [0, 0]], bowl(0, 0, .58, .58), [[.3, .58], [.62, 1]]]);
  def('S', .6, [cat(A(.3, .25, .3, .25, -28, -270), A(.3, .75, .3, .25, -90, 152))]);
  def('T', .68, [[[0, 0], [.68, 0]], [[.34, 0], [.34, 1]]]);
  def('U', .64, [cat([[0, 0], [0, .66]], A(.32, .66, .32, .34, 180, 0), [[.64, 0]])]);
  def('V', .74, [[[0, 0], [.37, 1], [.74, 0]]]);
  def('W', 1.06, [[[0, 0], [.27, 1], [.53, .3], [.79, 1], [1.06, 0]]]);
  def('X', .68, [[[0, 0], [.68, 1]], [[.68, 0], [0, 1]]]);
  def('Y', .7, [[[0, 0], [.35, .52], [.7, 0]], [[.35, .52], [.35, 1]]]);
  def('Z', .62, [[[0, 0], [.62, 0], [0, 1], [.62, 1]]]);

  /* ---- digits ---- */
  def('0', .58, [A(.29, .5, .29, .5, -90, 270)]);
  def('1', .42, [[[0, .24], [.32, 0], [.32, 1]]]);
  def('2', .58, [cat(A(.29, .29, .29, .29, -172, 38), [[0, 1], [.58, 1]])]);
  def('3', .58, [cat(A(.28, .26, .26, .26, -160, 90), A(.29, .75, .29, .25, -90, 160))]);
  def('4', .62, [[[.44, 1], [.44, 0], [0, .68], [.62, .68]]]);
  def('5', .58, [cat([[.54, 0], [.08, 0], [.03, .47]], A(.29, .72, .29, .28, -122, 150))]);
  def('6', .58, [A(.29, .68, .29, .32, 0, 360), A(.6, .66, .6, .66, 180, 258)]);
  def('7', .58, [[[0, 0], [.58, 0], [.2, 1]]]);
  def('8', .58, [A(.29, .26, .26, .26, 0, 360), A(.29, .75, .29, .25, 0, 360)]);
  def('9', .58, flip([A(.29, .68, .29, .32, 0, 360), A(.6, .66, .6, .66, 180, 258)], .58));

  /* ---- punctuation ---- */
  def('!', 0, [[[0, 0], [0, .64]], DOT(0, 1)]);
  def('?', .54, [cat(A(.27, .27, .27, .27, 180, 425), [[.27, .72]]), DOT(.27, 1)]);
  def('.', 0, [DOT(0, 1)]);
  def(',', 0, [[[0, .98], [-.06, 1.2]]]);
  def(':', 0, [DOT(0, .3), DOT(0, .98)]);
  def('-', .4, [[[0, .55], [.4, .55]]]);
  def('+', .5, [[[.25, .25], [.25, .85]], [[0, .55], [.5, .55]]]);
  def('=', .5, [[[0, .38], [.5, .38]], [[0, .72], [.5, .72]]]);
  def('/', .5, [[[0, 1], [.5, 0]]]);
  def('x', .42, [[[0, .3], [.42, .9]], [[.42, .3], [0, .9]]]);
  def('·', 0, [DOT(0, .55)]);
  def("'", 0, [[[0, 0], [0, .3]]]);
  def('>', .46, [[[0, .1], [.46, .5], [0, .9]]]);
  def('<', .46, [[[.46, .1], [0, .5], [.46, .9]]]);
  def('%', .74, [A(.13, .17, .13, .17, 0, 360), A(.61, .83, .13, .17, 0, 360), [[.7, 0], [.04, 1]]]);
  def('°', .2, [A(.1, .12, .1, .12, 0, 360)]);
  def('●', .3, [DOT(.15, .5)]);
  def(' ', .38, []);

  /* ---- geometry: cache Path2D + stroke lengths ---- */
  for (const ch in G) {
    const g = G[ch];
    g.lens = g.s.map(st => { let l = 0; for (let i = 1; i < st.length; i++) l += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); return l; });
    g.total = g.lens.reduce((a, b) => a + b, 0);
    g.paths = g.s.map(st => { const p = new Path2D(); st.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; });
  }

  const glyph = ch => G[ch] || G[ch.toUpperCase()] || G['?'];

  /* Lay text out: returns [{ch, g, x (left ink edge), w}] and the total width, all in units of `size`. */
  function layout(text, wt = .2, track = .06) {
    const out = []; let x = 0;
    for (const ch of text) {
      const g = glyph(ch);
      out.push({ ch, g, x, w: g.w });
      x += g.w + wt + track + (ch === ' ' ? 0 : 0);
    }
    const total = out.length ? x - wt - track : 0;
    return { items: out, width: total };
  }
  const measure = (text, size, wt = .2, track = .06) => layout(text, wt, track).width * size;

  /* Draw one glyph (already translated so its ink-left edge is at x,y=top). `draw` in 0..1 is a draw-on amount. */
  function drawGlyph(ctx, g, draw) {
    if (draw >= .999) { for (const p of g.paths) ctx.stroke(p); return; }
    if (draw <= 0) return;
    let need = draw * g.total, done = 0;
    for (let i = 0; i < g.paths.length; i++) {
      const L = g.lens[i];
      if (L === 0) { if (need > done) ctx.stroke(g.paths[i]); continue; }
      const take = clamp(need - done, 0, L);
      if (take > 0) { ctx.setLineDash([take, L * 3]); ctx.lineDashOffset = 0; ctx.stroke(g.paths[i]); }
      done += L;
    }
    ctx.setLineDash([]);
  }

  /*  drawText(ctx, text, x, y, size, opts)
      opts: wt, track, align 'l'|'c'|'r', color, outline:{w,color}, shadow:{dx,dy,color,steps}, inline:color,
            fn(i, ch, n) -> {dx,dy,rot,sx,sy,alpha,color,draw,wt,skip}  (per-letter animation)
      y is the vertical MIDDLE of the cap height. */
  function drawText(ctx, text, x, y, size, o = {}) {
    const wt = o.wt ?? .2, track = o.track ?? .06;
    const L = layout(text, wt, track);
    const W_ = L.width * size;
    let ox = x - (o.align === 'c' || o.align == null ? W_ / 2 : o.align === 'r' ? W_ : 0);
    if (o.align == null) ox = x - W_ / 2;
    const top = y - size / 2;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const n = L.items.length;
    for (let pass = 0; pass < 4; pass++) {
      /* pass 0 shadow/extrude, pass 1 outline, pass 2 fill, pass 3 inline */
      if (pass === 0 && !o.shadow) continue;
      if (pass === 1 && !o.outline) continue;
      if (pass === 3 && !o.inline) continue;
      for (let i = 0; i < n; i++) {
        const it = L.items[i];
        if (it.ch === ' ') continue;
        const m = o.fn ? o.fn(i, it.ch, n) || {} : {};
        if (m.skip) continue;
        const gw = it.w * size;
        const cx = ox + it.x * size + gw / 2 + (m.dx || 0);
        const cy = top + size / 2 + (m.dy || 0);
        ctx.save();
        ctx.globalAlpha *= m.alpha ?? 1;
        ctx.translate(cx, cy);
        if (m.rot) ctx.rotate(m.rot);
        ctx.scale((m.sx ?? 1) * size, (m.sy ?? 1) * size);
        ctx.translate(-it.w / 2, -.5);
        const w_ = m.wt ?? wt;
        const draw = m.draw ?? 1;
        if (pass === 0) {
          const sh = o.shadow, steps = sh.steps || 1;
          ctx.strokeStyle = sh.color;
          ctx.lineWidth = w_;
          for (let k = steps; k >= 1; k--) {
            ctx.save();
            ctx.translate((sh.dx * k / steps) / (size * (m.sx ?? 1)), (sh.dy * k / steps) / (size * (m.sy ?? 1)));
            drawGlyph(ctx, it.g, draw);
            ctx.restore();
          }
        } else if (pass === 1) {
          ctx.strokeStyle = m.outlineColor || o.outline.color;
          ctx.lineWidth = w_ + (o.outline.w / size) * 2;
          drawGlyph(ctx, it.g, draw);
        } else if (pass === 2) {
          ctx.strokeStyle = m.color || o.color || C.white;
          ctx.lineWidth = w_;
          drawGlyph(ctx, it.g, draw);
        } else {
          ctx.strokeStyle = o.inline;
          ctx.lineWidth = w_ * .22;
          drawGlyph(ctx, it.g, draw);
        }
        ctx.restore();
      }
    }
    ctx.restore();
    return { width: W_, left: ox };
  }

  return { G, glyph, layout, measure, drawText, drawGlyph };
})();
