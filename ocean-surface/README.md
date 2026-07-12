# Ocean Surface — React Three Fiber

Professional-grade ocean built on three.js `Water` (planar-reflection mirror shader), wrapped in a declarative R3F component.

## Run

```bash
npm install
npm run dev
```

## What's inside

**`src/components/Ocean.tsx`** — the core component:

- Wraps `three/examples/jsm/objects/Water.js` via `<primitive>`, with proper disposal on unmount.
- **Soft rolling normals** — `public/textures/waternormals.png` is a custom tileable normal map built from low-frequency sinusoids with steep amplitude falloff (mean normal-Z ≈ 0.997), so the surface reads as long swell. The Water shader's 4-octave sampling layers fine shimmer on top.
- **Wave direction** — the stock shader scrolls noise along hardcoded axes, so a `waveAngle` uniform is injected into the fragment shader (UV rotation in `getNoise()`). No shader fork needed.
- **Wave speed** — time is accumulated as `phase += delta * speed`, so moving the speed slider changes flow rate without phase-jumping the surface.
- **Status-driven fade** — `status: 'active' | 'thinking' | 'idle'` maps to a target opacity; the `alpha` uniform is driven by a framerate-independent exponential damp. When fully faded, `visible = false` skips Water's reflection pass (a full extra scene render per frame).
- **Leva panel** — wave direction, speed, distortion scale, water color, sun color.

**`src/App.tsx`** — demo scene: drei `<Sky>` + directional light sharing one sun vector with the water's `sunDirection` uniform (so the specular sun streak, sky, and lighting stay in sync), a bobbing buoy to anchor the reflections, OrbitControls, ACES tone mapping.

## Wiring up real AI status

Replace the Leva status select with your agent state:

```tsx
<Ocean status={agentIsRunning ? 'active' : 'idle'} sunDirection={sunDirection} />
```

Add states or tune fade response via `STATUS_OPACITY` and the `fadeLambda` prop in `Ocean.tsx`.

## Notes

- Reflection resolution is `textureWidth/Height: 512` — bump to 1024 for hero shots, drop to 256 for perf.
- The Water mirror pass renders the whole scene; keep heavy objects out of the reflection by toggling their `layers` if needed.
