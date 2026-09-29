'use strict';
/* ==========================================================================
   main.js — the frame pipeline.

   renderFrame(t):
     1. draw the timeline N times inside the camera shutter → averaged in `acc`
        (true motion blur: fast things smear, still things stay sharp)
     2. push `acc` through the WebGL post pass (bloom / CA / glitch / grain)

   Everything is a pure function of `t`, so frames can be rendered in any
   order, on any machine, in parallel.
   ========================================================================== */
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const accCv = document.createElement('canvas'); accCv.width = W; accCv.height = H;
const acc = accCv.getContext('2d');
const glCv = document.getElementById('gl');
let post = null;

function initPost() { if (!post) post = new Post(glCv, W, H); return post; }

/* the timeline draws one instant of the reel into `ctx` */
function drawInstant(c, t) { TIMELINE.draw(c, t); }

function renderFrame(t, opts = {}) {
  initPost();
  const N = opts.sub ?? (shotAt(t).sub || 4);   // sub-frames per output frame (heavier motion → more)
  const shutter = opts.shutter ?? .5;    // 180° shutter
  const dt = 1 / FPS;
  acc.globalCompositeOperation = 'source-over';
  acc.globalAlpha = 1;
  for (let i = 0; i < N; i++) {
    const ts = N === 1 ? t : t + ((i + .5) / N - .5) * shutter * dt;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawInstant(ctx, ts);
    acc.globalAlpha = 1 / (i + 1);
    acc.drawImage(cv, 0, 0);
  }
  acc.globalAlpha = 1;
  const P = TIMELINE.postParams(t);
  P.seed = Math.round(t * FPS);
  P.time = t;
  post.render(accCv, P);
  return true;
}

function frameDataURL(fmt = 'image/png', q = .95) { return glCv.toDataURL(fmt, q); }

/* ---- live preview (open index.html in a browser) ------------------------ */
function startPreview() {
  initPost();
  const audio = document.getElementById('aud');
  const btn = document.getElementById('play');
  let t0 = null, playing = false;
  const bar = document.getElementById('bar');
  function loop(now) {
    if (!playing) return;
    const t = audio && !audio.paused ? audio.currentTime : ((now - t0) / 1000) % DUR;
    renderFrame(Math.min(t, DUR - 1e-3), { sub: 1 });
    if (bar) bar.style.width = (t / DUR * 100) + '%';
    if (t >= DUR - .02) { playing = false; btn.textContent = '▶ replay'; btn.style.display = ''; return; }
    requestAnimationFrame(loop);
  }
  btn.onclick = () => {
    btn.style.display = 'none'; playing = true;
    t0 = performance.now();
    if (audio) { audio.currentTime = 0; audio.play().catch(() => { }); }
    requestAnimationFrame(loop);
  };
  renderFrame(0, { sub: 1 });
}
window.renderFrame = renderFrame;
window.frameDataURL = frameDataURL;
