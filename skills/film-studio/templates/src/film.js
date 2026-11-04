// {{TITLE}}. window.seek(t) paints frame t from scratch; nothing carries between frames.
// Shot times come from plan.json. Draw in design pixels ({{W}} x {{H}}); K scales to the render size.
import {
  getJSON, loadImage, sequence, cover, kenBurns, keyed, win, smooth, easeOut, lerp, clamp,
  spring, track, SPRINGS, dip, vignette, grain, pad, mulberry32,
} from './layers.js';

const DESIGN_W = {{W}}, DESIGN_H = {{H}};
const INK = '#f2ede4', GROUND = '#0d0d0f', ACCENT = '#e0a040';   // replace with the brief's palette
const DRAFT = new URLSearchParams(location.search).has('draft');   // build.py draft adds ?draft=1

export async function boot(canvas) {
  const W = innerWidth, H = innerHeight, K = W / DESIGN_W;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  await Promise.all([document.fonts.load('600 120px Display'), document.fonts.load('500 32px UI')]);
  const plan = await getJSON('plan.json');
  const S = Object.fromEntries(plan.shots.map(s => [s.id, s]));
  const DUR = plan.duration;

  // ---- sources: uncomment and adapt what the plan uses ----
  // Blender frames (render_frames.py writes f0001.png ...); drafts read the 480p set
  // const room = sequence({ url: i => `prep/frames_${DRAFT ? 480 : 1080}/f${pad(i + 1)}.png`, count: 192, fps: plan.fps, start: S.s02.start });
  // A generated clip, extracted to JPEG frames by prep.py
  // const c01 = sequence({ url: i => `prep/clip/c01/f${pad(i, 3)}.jpg`, count: 192, fps: 24, start: S.s03.start });
  // A generated still
  // const plate = await loadImage('assets/gen/images/plate.jpg');
  // Voice and music timing
  // const vo = await getJSON('vo.json'), beats = await getJSON('beats.json');

  const T = { title: [Math.max(0, DUR - 4), DUR] };   // resolved times, exposed for cue scripts
  window.TIMING = T;

  function title(t) {
    const [a, b] = T.title;
    if (t < a) return;
    const u = spring(t - a - 0.2, ...SPRINGS.heavy);
    ctx.save();
    ctx.globalAlpha = Math.min(win(t, a + 0.2, a + 0.5), 1 - win(t, b - 0.6, b - 0.1));
    ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 120px Display';
    ctx.fillText(plan.title, 140, DESIGN_H * 0.62 + (1 - u) * 40);
    ctx.fillStyle = ACCENT; ctx.fillRect(140, DESIGN_H * 0.62 + 36, 220 * u, 6);
    ctx.restore();
  }

  async function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(K, 0, 0, K, 0, 0);

    // ---- one block per shot, in plan order ----
    // if (room.active(t)) ctx.drawImage(await room.at(t), 0, 0, DESIGN_W, DESIGN_H);
    // if (c01.active(t)) { ctx.filter = 'saturate(0.9) contrast(1.05)'; cover(ctx, await c01.at(t), 0, 0, DESIGN_W, DESIGN_H); ctx.filter = 'none'; }
    // if (t >= S.s04.start && t < S.s04.end) kenBurns(ctx, plate, t, S.s04.start, S.s04.end, [0, 0, DESIGN_W, DESIGN_H], { z1: 1.1 });
    title(t);

    // ---- the shared grade, over every maker ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    vignette(ctx, W, H, 0.35);
    grain(ctx, W, H, t, plan.fps, 0.05);
    dip(ctx, W, H, Math.max(1 - win(t, 0, 0.5), win(t, DUR - 0.75, DUR)));   // fade up, fade out
  }

  window.seek = async t => { await draw(t); return true; };
  await draw(0);
  window.__ready = true;

  if (!navigator.webdriver) {   // live preview in a normal browser only
    const t0 = performance.now();
    const loop = async () => { await draw(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
