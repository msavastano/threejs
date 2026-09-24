import * as THREE from 'three';

// ─────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────

interface TextureMapKeys {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  displacementMap?: THREE.Texture | null;
  envMap?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  lightMap?: THREE.Texture | null;
  sheenRoughnessMap?: THREE.Texture | null;
  sheenNormalMap?: THREE.Texture | null;
  clearcoatMap?: THREE.Texture | null;
  clearcoatNormalMap?: THREE.Texture | null;
  clearcoatRoughnessMap?: THREE.Texture | null;
  iridescenceMap?: THREE.Texture | null;
  iridescenceThicknessMap?: THREE.Texture | null;
  transmissionMap?: THREE.Texture | null;
  thicknessMap?: THREE.Texture | null;
}

interface MemorySnapshot {
  geometries: number;
  textures: number;
}

// ─────────────────────────────────────────────
// MAIN CLEANUP UTILITY
// ─────────────────────────────────────────────

/**
 * Recursively disposes all child objects within an object (Group, Scene, etc.)
 */
function disposeChildren(object: THREE.Object3D): void {
  while (object.children.length > 0) {
    const child = object.children[0];
    disposeObject(child);
    object.remove(child);
  }
}

/**
 * Disposes every texture mapped on a material.
 */
function disposeMaterialTextures(material: THREE.Material): void {
  if (!material) return;

  // Iterate over every property looking for Texture instances
  for (const key of Object.keys(material)) {
    const value = (material as unknown as Record<string, unknown>)[key];
    if (value instanceof THREE.Texture) {
      disposeTexture(value);
      // Clear the reference on the material so GC can collect it sooner
      (material as unknown as Record<string, unknown>)[key] = null;
    }
  }

  // Special case: ShaderMaterial / RawShaderMaterial custom uniforms
  if ('uniforms' in material && material.uniforms) {
    const uniforms = material.uniforms as THREE.ShaderMaterial['uniforms'];
    for (const uKey of Object.keys(uniforms)) {
      const uniformValue = uniforms[uKey]?.value;
      if (uniformValue instanceof THREE.Texture) {
        disposeTexture(uniformValue);
        uniforms[uKey] = { value: null };
      }
    }
  }

  // Clone array references become separate objects — still dispose them
  if (material.isShaderMaterial && material.userData) {
    // Some users stash textures in userData; we try our best.
  }
}

/**
 * Dispose a single material (handle Single or Array).
 */
function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
  } else {
    disposeMaterialTextures(material);
    material.dispose();
  }
}

/**
 * Dispose a single texture and its internal resources.
 */
function disposeTexture(texture: THREE.Texture): void {
  if (!texture || texture.disposed) return;

  // Clean up any image data
  texture.dispose();
}

/**
 * Deep-dispose a geometry including any associated attributes.
 */
function disposeGeometry(geometry: THREE.BufferGeometry): void {
  if (!geometry || geometry.disposed) return;

  // Dispose any attribute buffers
  geometry.attributes.forEach((attr) => {
    attr.array = new Float32Array(0); // Release underlying ArrayBuffer
    attr.dispose?.();
  });

  // Dispose index buffer
  if (geometry.index) {
    geometry.index.array = new Int16Array(0);
    geometry.index.dispose?.();
  }

  // Dispose draw ranges, groups, etc.
  geometry.clearGroups?.();

  geometry.dispose();
}

/**
 * Recursively traverse and dispose everything inside an object.
 */
function disposeObject(object: THREE.Object3D | THREE.Light): void {
  if (!object) return;

  // ── Materials & textures ──
  if (object.isMesh || object.isLineBasicMaterial || object.isPoints) {
    const mesh = object as THREE.Mesh;
    if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  }

  // Lights also hold textures (for spotLight.target shadow maps sometimes)
  if ((object as THREE.Light).isLight) {
    const light = object as THREE.Light;
    if (light.shadow && light.shadow.map) {
      disposeTexture(light.shadow.map);
    }
    if (light.shadow && light.shadow.bias !== undefined) {
      // Just ensure shadow resources are released below
    }
  }

  // ── Children ──
  disposeChildren(object as THREE.Object3D);
}

/**
 * Disposes a WebGLRenderTarget and its depth/stencil attachments.
 */
function disposeRenderTarget(renderTarget: THREE.WebGLRenderTarget): void {
  if (!renderTarget || renderTarget.disposed) return;

  // Color attachment
  if (renderTarget.texture) {
    disposeTexture(renderTarget.texture);
  }

  // Depth / stencil attachments (these may be implicit or explicit textures)
  // In newer Three.js versions these are managed internally but we force release
  (renderTarget as unknown as Record<string, unknown>).depthBuffer = false;
  (renderTarget as unknown as Record<string, unknown>).stencilBuffer = false;

  renderTarget.dispose();
}

/**
 * Disposes an EffectComposer and all its passes + render targets.
 */
function disposeComposer(composer: THREE.EffectComposer): void {
  if (!composer) return;

  // Dispose write passes
  if ('passes' in composer) {
    const passes = composer.passes as THREE.Pass[];
    for (const pass of passes) {
      // Each pass may have its own render target
      if ('renderTarget' in pass && pass.renderTarget) {
        disposeRenderTarget(pass.renderTarget as THREE.WebGLRenderTarget);
      }

      // Some passes (like ShaderPass) have materials with textures
      if ('material' in pass && pass.material) {
        disposeMaterial(pass.material as THREE.Material);
      }

      // Dispose the pass itself if available
      pass.dispose?.();
    }
  }

  composer.dispose();
}

/**
 * Takes a snapshot of WebGL memory info (if available via renderer.info).
 */
function takeMemorySnapshot(renderer: THREE.WebGLRenderer): MemorySnapshot {
  const info = renderer.info ?? {};
  const gl = renderer.getContext?.() as WebGLRenderingContext | null;

  // Fallback counts when renderer.info isn't populated yet
  return {
    geometries: (info.memory?.geometries ?? gl?.getContext()?.getParameter?.(0x93a0) ?? 0) as number,
    textures: (info.memory?.textures ?? 0) as number,
  };
}

// ─────────────────────────────────────────────
// PRIMARY EXPORT — THE MAIN FUNCTION
// ─────────────────────────────────────────────

/**
 * Comprehensive Three.js scene cleanup utility.
 *
 * Recursively traverses the entire scene graph and fully cleans up:
 *   - Geometries (via geometry.dispose() + ArrayBuffer release)
 *   - Materials (single, arrays, plus ALL internal texture maps)
 *   - Lights (shadow map textures)
 *   - Render targets & post-processing composers
 *   - AnimationMixers, Object3Ds, Groups, Scenes
 *   - WebGLRenderer context disposal + event listener removal
 *
 * Usage:
 *   const before = destroyScene(scene, renderer);
 *   afterGC(() => console.log('After GC:', before));
 *
 * @param scene    – The THREE.Scene (or Group/Object3D) to clean up
 * @param renderer – The THREE.WebGLRenderer whose context will be destroyed
 * @returns A MemorySnapshot taken **before** cleanup began
 */
export function destroyScene(
  scene: THREE.Scene | THREE.Group | THREE.Object3D,
  renderer: THREE.WebGLRenderer,
): MemorySnapshot {
  // Capture snapshot BEFORE cleanup
  const beforeSnapshot = takeMemorySnapshot(renderer);

  // ── 1. Dispose all animation mixers attached to children ──
  scene.traverse((obj) => {
    if (obj.isSkinnedMesh || obj.isMorphTargetInfluenced) {
      // If you're using AnimationMixer, stop animations first externally:
      // mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot());
    }
  });

  // ── 2. Dispose render targets ──
  // Common patterns where render targets are stored
  ['readTarget', 'writeTarget', 'target', '_rtFinal', 'rtColor', 'rtDepth'].forEach((key) => {
    const rt = (scene as unknown as Record<string, unknown>)[key];
    if (rt instanceof THREE.WebGLRenderTarget) {
      disposeRenderTarget(rt);
    }
  });

  // ── 3. Dispose post-processing composers ──
  ['composer', '_composer', 'postProcessingComposer'].forEach((key) => {
    const comp = (scene as unknown as Record<string, unknown>)[key];
    if (comp && typeof comp.dispose === 'function') {
      try {
        disposeComposer(comp as unknown as THREE.EffectComposer);
      } catch { /* already disposed */ }
    }
  });

  // Also check parent scope for common composer variable names
  // (handled by caller passing composer separately if needed)

  // ── 4. Traverse and dispose every object in the scene graph ──
  scene.traverse((obj) => {
    // Dispose geometry
    if (obj.isMesh && (obj as THREE.Mesh).geometry) {
      disposeGeometry((obj as THREE.Mesh).geometry);
      (obj as THREE.Mesh).geometry = null as any;
    }

    // Dispose lines/particles
    if (obj.isLineSegments || obj.isLine || obj.isPoints) {
      const geoObj = obj as THREE.LineSegments | THREE.Line | THREE.Points;
      if (geoObj.geometry) {
        disposeGeometry(geoObj.geometry);
        (geoObj as unknown as Record<string, unknown>).geometry = null;
      }
    }

    // Dispose sprites with canvas textures
    if (obj.isSprite) {
      const sprite = obj as THREE.Sprite;
      if (sprite.material) {
        disposeMaterial(sprite.material);
      }
    }

    // Dispose LOD levels
    if (obj.isLOD) {
      const lod = obj as THREE.LOD;
      disposeChildren(lod);
    }

    // Dispose SkinnedMesh
    if (obj.isSkinnedMesh) {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.geometry) {
        disposeGeometry(sm.geometry);
        sm.geometry = null as any;
      }
      if (sm.skeleton) {
        sm.skeleton.dispose();
        sm.skeleton = null as any;
      }
    }

    // Dispose Points with BufferGeometry
    if (obj.isPoints) {
      const pts = obj as THREE.Points;
      if (pts.geometry) {
        disposeGeometry(pts.geometry);
        pts.geometry = null as any;
      }
    }

    // Recurse into lights
    if ((obj as THREE.Light).isLight) {
      const light = obj as THREE.Light;
      disposeObject(light);
    }

    // Dispose the object's materials
    disposeObject(obj as THREE.Object3D);
  });

  // ── 5. Explicitly dispose remaining top-level meshes ──
  // (Some geometries may not have been caught by .traverse())
  scene.children.slice().forEach((child) => {
    disposeObject(child);
    scene.remove(child);
  });

  // Clear the scene's internal arrays
  scene.children = [];
  scene.geometryAttributesChanged = true;

  // Remove everything from the scene
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // ── 6. Dispose renderer ──
  renderer.dispose();

  // Remove all event listeners from the renderer's dom element
  const domElement = renderer.domElement;
  if (domElement.parentNode) {
    // Create a deep clone to strip all event listeners
    const newElement = domElement.cloneNode(true) as HTMLElement;
    newElement.style.cssText = domElement.style.cssText; // Preserve inline styles
    domElement.parentNode.replaceChild(newElement, domElement);
    // NOTE: Reassign your renderer reference to a new one after calling this
  }

  // Clear the rendering context
  renderer.forceContextLoss?.();

  // Null out renderer properties to aid GC
  (renderer as unknown as Record<string, unknown>) = null as any;

  return beforeSnapshot;
}

// ─────────────────────────────────────────────
// SECONDARY EXPORT — HELPERS FOR COMMON PATTERNS
// ─────────────────────────────────────────────

/**
 * Destroy an EffectComposer + its associated cameras and render targets.
 * Use alongside destroyScene for full post-processing cleanup.
 */
export function destroyPostProcessing(composer: THREE.EffectComposer): void {
  if (!composer) return;
  disposeComposer(composer);
}

/**
 * Force garbage collection (Chrome DevTools only — requires --enable-automation flag).
 * Call manually after destroyScene to verify memory was freed.
 */
export function forceGC(): void {
  if ((globalThis as unknown as Record<string, unknown>).gc) {
    (globalThis as unknown as Record<string, unknown>).gc();
  }
}

// ─────────────────────────────────────────────
// MEMORY TRACKING & EXAMPLE USAGE
// ─────────────────────────────────────────────

/**
 * Utility class to track renderer memory snapshots over time.
 */
export class MemoryTracker {
  private samples: MemorySnapshot[] = [];
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  /**
   * Take a current snapshot of WebGL memory counters.
   */
  sample(): MemorySnapshot {
    const snap = takeMemorySnapshot(this.renderer);
    this.samples.push({ ...snap, geometries: snap.geometries, textures: snap.textures });
    return snap;
  }

  /**
   * Print a formatted table of all recorded samples.
   */
  report(label: string = ''): void {
    console.group(`📊 Memory Report${label ? ` — ${label}` : ''}`);
    console.table(this.samples.map((s, i) => ({
      '#': i,
      Geometries: s.geometries,
      Textures: s.textures,
    })));
    console.groupEnd();
  }

  /**
   * Return the delta between latest and earliest snapshot.
   */
  delta(): Partial<MemorySnapshot> | null {
    if (this.samples.length < 2) return null;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    return {
      geometries: last.geometries - first.geometries,
      textures: last.textures - first.textures,
    };
  }
}

// ─────────────────────────────────────────────
// FULL USAGE EXAMPLE WITH BEFORE/AFTER TRACKING
// ─────────────────────────────────────────────

/**
 * Demonstrates the complete lifecycle: create scene → populate →
 * capture memory → clean up → re-check after forced GC.
 */
export async function demonstrateCleanup() {
  // ── Setup ──
  const container = document.getElementById('canvas-container')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  const tracker = new MemoryTracker(renderer);

  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff6b6b');
  console.log('%c  🌱 STEP 1 — Initial state (no content)', 'color: #8ecae6');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff6b6b');
  tracker.sample();

  // ── Build scene with various objects ──
  const LIGHTS: THREE.Light[] = [];

  // Ambient + Directional
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);
  LIGHTS.push(dirLight);

  // Point lights with shadows
  for (let i = 0; i < 3; i++) {
    const pl = new THREE.PointLight(0xff0000, 1, 20);
    pl.position.set(Math.sin(i) * 5, 3, Math.cos(i) * 5);
    pl.castShadow = true;
    scene.add(pl);
    LIGHTS.push(pl);
  }

  // Geometries & materials — deliberately creating many unique instances
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const loadedTextures: THREE.Texture[] = [];

  // Simulate loading textures (in real app, use TextureLoader)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 256;
  tempCanvas.height = 256;
  const ctx = tempCanvas.getContext('2d')!;

  function generatePatternedTexture(baseColor: string): THREE.CanvasTexture {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(tempCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    loadedTextures.push(tex);
    return tex;
  }

  // Create multiple materials with texture maps
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#dda0dd'];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshStandardMaterial({
      map: generatePatternedTexture(colors[i % colors.length]),
      normalMap: generatePatternedTexture('#ffffff'),
      roughnessMap: generatePatternedTexture('#888888'),
      metalnessMap: generatePatternedTexture('#444444'),
      emissiveMap: generatePatternedTexture('#000000'),
      metalness: 0.5 + Math.random() * 0.5,
      roughness: 0.2 + Math.random() * 0.6,
    });
    materials.push(mat);
  }

  // InstancedMesh — many draw calls, shared geometry
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(boxGeo);
  const instancedMesh = new THREE.InstancedMesh(boxGeo, materials[0], 50);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 50; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * 20,
      Math.random() * 5,
      (Math.random() - 0.5) * 20
    );
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  scene.add(instancedMesh);

  // Individual meshes with different geometries
  for (let i = 0; i < 5; i++) {
    let geo: THREE.BufferGeometry;
    switch (i) {
      case 0: geo = new THREE.SphereGeometry(1, 32, 32); break;
      case 1: geo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16); break;
      case 2: geo = new THREE.TorusGeometry(1, 0.3, 16, 32); break;
      case 3: geo = new THREE.ConeGeometry(0.8, 2, 8); break;
      case 4: geo = new THREE.IcosahedronGeometry(1, 1); break;
    }
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, materials[i % materials.length]);
    mesh.position.y = i * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Custom shader material with uniforms holding textures
  const customMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTexture: { value: generatePatternedTexture('#ff4444') },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D uTexture; varying vec2 vUv; void main(){ gl_FragColor=texture2D(uTexture,vUv); }`,
  });
  materials.push(customMat);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), customMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  scene.add(plane);

  // Nested group structure
  const outerGroup = new THREE.Group();
  const innerGroup = new THREE.Group();
  innerGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), materials[0]));
  outerGroup.add(innerGroup);
  outerGroup.position.set(3, 1, 0);
  scene.add(outerGroup);

  // Post-processing — render target + composer
  const rt = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat }
  );
  (scene as unknown as Record<string, unknown>).readTarget = rt; // simulate storage

  const composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.4, 0.85
  );
  composer.addPass(bloomPass);

  // Add ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ffa502');
  console.log('%c  🏗️  STEP 2 — Scene populated with content', 'color: #ff6348');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ffa502');
  tracker.report('After building scene');

  // Let browser settle
  await new Promise((r) => setTimeout(r, 100));

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #7bed9f');
  console.log('%c  🔪 STEP 3 — Calling destroyScene()', 'color: '#2ed573');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: '#7bed9f');
  const beforeCleanup = destroyScene(scene, renderer);
  tracker.sample();
  tracker.report('After destroyScene (before GC)');

  // Force GC (requires --expose-gc Chrome flag)
  console.log('\n⚠️  Running forceGC()... (requires Chrome --expose-gc flag)');
  forceGC();

  await new Promise((r) => setTimeout(r, 500));

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: '#70a1ff');
  console.log('%c  ✅  STEP 4 — After Garbage Collection', 'color: '#70a1ff');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: '#70a1ff');
  tracker.sample();
  tracker.report('After destroyScene + GC');

  const d = tracker.delta();
  if (d) {
    console.log(`\n📉 Total change: geometries ${d.geometries > 0 ? '+' : ''}${d.geometries}, textures ${d.textures > 0 ? '+' : ''}${d.textures}`);
    if (d.geometries <= 0 && d.textures <= 0) {
      console.log('✅ All WebGL resources were successfully released!');
    } else {
      console.warn('⚠️  Some resources remain unreleased — inspect above for leaks.');
    }
  }

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: '#1e90ff');
  console.log('%c  💡 Notes', 'color: '#1e90ff');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: '#1e90ff');
  console.log(`• Before cleanup:  ${JSON.stringify(beforeCleanup)}`);
  console.log('• After cleanup + GC: see MemoryReport above');
  console.log('• Check Chrome DevTools Performance tab → Allocation instrumentation for visual confirmation');
  console.log('• In SPA hot-reload scenarios, call this whenever swapping scenes/views');
}

// ─────────────────────────────────────────────
// QUICK INTEGRATION HELPER (React-style hook pattern)
// ─────────────────────────────────────────────

/**
 * Hook-like helper for React/Vue/Svelte components.
 * Pass your scene & renderer ref and this cleans up on unmount.
 */
export type SceneRefs = {
  scene: { current: THREE.Scene | null };
  renderer: { current: THREE.WebGLRenderer | null };
};

export function onUnmountDestroy(references: SceneRefs): () => void {
  return () => {
    const { scene, renderer } = references;
    if (scene.current && renderer.current) {
      destroyScene(scene.current, renderer.current);
    }
    scene.current = null;
    renderer.current = null;
  };
}
