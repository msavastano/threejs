// Drawing helpers for the code film. Every function is a pure function of its inputs and t;
// nothing carries between frames, so seek(t) can jump anywhere.
import { clamp, spring, track, mulberry32, SPRINGS } from '../../../lib/motion.js';
export { clamp, spring, track, mulberry32, SPRINGS };

export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => (u = clamp(u), u * u * (3 - 2 * u));
export const easeInOut = u => (u = clamp(u), u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const easeOut = u => 1 - (1 - clamp(u)) ** 3;
export const win = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));   // 0 before a, 1 after b
export const pad = (n, w = 4) => String(n).padStart(w, '0');

// Piecewise keys [[t, v], ...] with an ease between neighbours
export function keyed(t, keys, ease = easeInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    if (t <= t1) return v0 + (v1 - v0) * ease((t - t0) / Math.max(1e-6, t1 - t0));
  }
  return keys[keys.length - 1][1];
}

export const getJSON = url => fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });
export const loadImage = src => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image failed: ' + src)); i.src = src;
});

// An image sequence on the film clock: Blender renders, clip frames.
//   const seq = sequence({ url: i => `prep/frames_1080/f${pad(i + 1)}.png`, count: 192, fps: 24, start: 4.0 });
//   if (seq.active(t)) ctx.drawImage(await seq.at(t), 0, 0, W, H);
// `first` offsets the index (start a clip part-way in); `keep` bounds the cache.
export function sequence({ url, count, fps, start = 0, first = 0, keep = 24 }) {
  const cache = new Map();
  const get = i => {
    const u = url(i);
    if (!cache.has(u)) {
      const img = new Image(); img.src = u;
      cache.set(u, img.decode().then(() => img));
      if (cache.size > keep) cache.delete(cache.keys().next().value);
    }
    return cache.get(u);
  };
  const index = t => first + clamp(Math.floor((t - start) * fps + 1e-6), 0, count - 1 - first);
  return {
    count, fps, start, index,
    end: start + (count - first) / fps,
    active: t => t >= start && t < start + (count - first) / fps,
    async at(t) {
      const i = index(t);
      if (!navigator.webdriver) for (let k = 1; k <= 6 && i + k < count; k++) get(i + k);   // live preview only
      return get(i);
    },
  };
}

// Draw like CSS object-fit: cover, zoomed by `zoom` about the focus point (fx, fy) in 0..1
export function cover(ctx, img, x, y, w, h, { zoom = 1, fx = 0.5, fy = 0.5 } = {}) {
  const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height;
  const s = Math.max(w / iw, h / ih) * zoom, sw = w / s, sh = h / s;
  const sx = clamp(fx * iw - sw / 2, 0, iw - sw), sy = clamp(fy * ih - sh / 2, 0, ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// A slow camera move on a still: zoom z0 -> z1 and drift the focus from -> to between t0 and t1
export function kenBurns(ctx, img, t, t0, t1, [x, y, w, h], { z0 = 1, z1 = 1.08, from = [0.5, 0.5], to = [0.5, 0.5], ease = smooth } = {}) {
  const u = ease(win(t, t0, t1));
  cover(ctx, img, x, y, w, h, { zoom: lerp(z0, z1, u), fx: lerp(from[0], to[0], u), fy: lerp(from[1], to[1], u) });
}

// Black overlay for fades: a = 0 clear, 1 black
export function dip(ctx, W, H, a) {
  if (a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a); ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H); ctx.restore();
}

const vigCache = new Map();
export function vignette(ctx, W, H, strength = 0.35) {
  const k = `${W}x${H}x${strength}`;
  if (!vigCache.has(k)) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), r = Math.hypot(W, H) / 2;
    const grad = g.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = grad; g.fillRect(0, 0, W, H); vigCache.set(k, c);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vigCache.get(k), 0, 0); ctx.restore();
}

// Film grain, seeded by the frame number so the same t always gets the same grain
const grainTiles = [];
export function grain(ctx, W, H, t, fps = 24, amount = 0.05) {
  if (!grainTiles.length) for (let s = 0; s < 8; s++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), d = g.createImageData(256, 256), rnd = mulberry32(1000 + s);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); grainTiles.push(c);
  }
  const f = Math.floor(t * fps + 1e-6), tile = grainTiles[f % 8], rnd = mulberry32(f);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-Math.floor(rnd() * 256), -Math.floor(rnd() * 256));
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
