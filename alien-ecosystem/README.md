# Bioluminescent Alien Ecosystem

A procedurally generated alien ecosystem of bioluminescent flora, built with
**React Three Fiber**, custom **GLSL** shaders, and an intense **Bloom** post pass.

12,000 stalks are drawn in a **single `InstancedMesh`** (one draw call). A custom
vertex shader sways them on a simplex-noise current as if suspended in a dense,
fluid-like atmosphere, while a fragment shader pulses cyans, deep purples, and
toxic greens on a per-instance "breathing" rhythm. An auto-rotating
`OrbitControls` drifts the camera through the colony.

## Run it

```bash
npm install
npm run dev      # start the dev server (Vite prints a local URL)
npm run build    # type-check (tsc --noEmit) + production build
npm run preview  # preview the production build
```

## How it satisfies the brief

| Requirement | Where |
|---|---|
| 10k+ stalks via `InstancedMesh` | `src/components/BioluminescentField.tsx` (`CONFIG.count = 12000`, one mesh) |
| Vertex shader sway from time + simplex noise | `src/shaders/stalk.vert.glsl` + `src/shaders/lib/simplexNoise3D.glsl` |
| Fragment shader bioluminescent pulse by instance id | `src/shaders/stalk.frag.glsl` |
| `@react-three/postprocessing` Bloom | `src/components/Effects.tsx` |
| Auto-rotating `OrbitControls` | `src/components/Scene.tsx` |
| Strict TS, modular, shaders separated from components | `tsconfig.json` (`strict`), `src/shaders/*`, `src/materials/StalkMaterial.ts` |

## Architecture

```
src/
  main.tsx                     # React root
  App.tsx                      # <Canvas>, camera, Suspense
  config.ts                    # all tunables (count, palette, sway, pulse)
  components/
    Scene.tsx                  # background, fog, field, controls, effects
    BioluminescentField.tsx    # the single InstancedMesh + instance transforms
    Effects.tsx                # EffectComposer: Bloom + ACES tone-map
  materials/
    StalkMaterial.ts           # typed drei shaderMaterial + JSX augmentation
  shaders/
    stalk.vert.glsl            # noise-driven sway
    stalk.frag.glsl            # per-instance breathing bioluminescence
    lib/simplexNoise3D.glsl    # shared 3D simplex noise (#include)
  types/glsl.d.ts              # string typings for shader imports
```

### Key design choices

- **One draw call.** Every stalk is an instance in a single `InstancedMesh`.
  Per-stalk transform variety lives in the instance matrices; per-stalk colour
  identity is carried by an `aId` `InstancedBufferAttribute` (GLSL1-safe, so it
  works without relying on `gl_InstanceID`).
- **GPU-side animation.** Only one uniform (`uTime`) updates per frame. The sway
  and pulse are entirely computed on the GPU, keeping the CPU idle and the frame
  rate high even at 12k instances.
- **Shaders live in real `.glsl` files**, wired in via `vite-plugin-glsl`, which
  also resolves the `#include` of the shared simplex-noise chunk — keeping shader
  logic cleanly separated from component structure.
- **Emissive > 1.0.** The fragment shader pushes tip brightness above 1.0 so the
  low-threshold Bloom blooms the brightest flora hot against the dark void.

## Tuning

Edit `src/config.ts`: `count`, `areaRadius`, height range, `swayStrength`,
`noiseScale`, `pulseSpeed`, and the `palette`. Bloom intensity/threshold live in
`src/components/Effects.tsx`.
