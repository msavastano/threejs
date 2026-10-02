import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { ButterflyTheme, AnimationControls, CameraPreset, FlightMode } from './types';
import { BUTTERFLY_THEMES } from './themes';
import { BUTTERFLY_HOTSPOTS } from './hotspots';
import { MechanicalButterfly } from './MechanicalButterfly';
import { SpecimenStand } from './SpecimenStand';
import { ParticleSystems } from './ParticleSystems';
import { FlightController } from './FlightController';
import { soundManager } from './SoundManager';

export class SceneManager {
  private container: HTMLDivElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public composer: EffectComposer | null = null;
  public bloomPass: UnrealBloomPass | null = null;

  // Entities
  public butterfly: MechanicalButterfly;
  public stand: SpecimenStand;
  public particles: ParticleSystems;
  public flightController: FlightController;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight1: THREE.PointLight;
  private rimLight2: THREE.PointLight;

  // Camera animation
  private targetCameraPos = new THREE.Vector3(0, 0.8, 3.8);
  private targetCameraLookAt = new THREE.Vector3(0, 0, 0);
  private isTransitioningCamera = false;
  private cameraTransitionProgress = 1.0;

  // Interactive Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Animation loop
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;

  // Hotspots 3D markers
  public hotspotMeshes: THREE.Group[] = [];
  public selectedHotspotId: string | null = null;

  // Callbacks
  public onSelectHotspot: ((id: string | null) => void) | null = null;
  public onFpsUpdate: ((fps: number) => void) | null = null;

  private frameCount = 0;
  private lastFpsTime = performance.now();

  constructor(
    container: HTMLDivElement,
    initialTheme: ButterflyTheme = BUTTERFLY_THEMES['brass-obsidian']
  ) {
    this.container = container;

    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initialTheme.bgColor);
    this.scene.fog = new THREE.FogExp2(initialTheme.fogColor, 0.045);

    // 2. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0.8, 3.8);

    // 3. Renderer with high color fidelity
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    // 5. Post-Processing: Bloom
    try {
      const renderPass = new RenderPass(this.scene, this.camera);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        initialTheme.bloomStrength,
        0.45,
        0.82
      );
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderPass);
      this.composer.addPass(this.bloomPass);
    } catch (e) {
      console.warn('Post-processing fallback to direct render', e);
      this.composer = null;
    }

    // 6. Lighting Setup
    this.ambientLight = new THREE.AmbientLight(initialTheme.ambientLight, 0.85);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(initialTheme.keyLight, 2.2);
    this.keyLight.position.set(4, 7, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x446688, 0.7);
    this.fillLight.position.set(-4, -2, -3);
    this.scene.add(this.fillLight);

    // Dynamic Rim Lights
    this.rimLight1 = new THREE.PointLight(initialTheme.rimLight, 2.4, 12, 1.5);
    this.rimLight1.position.set(-3.5, 2.5, -2.5);
    this.scene.add(this.rimLight1);

    this.rimLight2 = new THREE.PointLight(initialTheme.accentGlow, 1.8, 10, 1.5);
    this.rimLight2.position.set(3.5, -1.5, 2.5);
    this.scene.add(this.rimLight2);

    // Subtle Ground Reflection Grid / Shadow Plane
    this.createGroundShowcase();

    // 7. Instantiate Main Butterfly
    this.butterfly = new MechanicalButterfly(initialTheme);
    this.scene.add(this.butterfly.group);

    // 8. Instantiate Specimen Stand
    this.stand = new SpecimenStand(initialTheme);
    this.scene.add(this.stand.group);

    // 9. Particle Systems (Aether embers & wing trails)
    this.particles = new ParticleSystems(initialTheme.particleColor);
    this.scene.add(this.particles.aetherGroup);
    this.scene.add(this.particles.trailGroup);

    // 10. Flight Controller
    this.flightController = new FlightController();

    // 11. Hotspot 3D Pins
    this.buildHotspotMarkers(initialTheme);

    // Events
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
  }

  private createGroundShowcase() {
    // Subtle circular mirror grid
    const gridHelper = new THREE.PolarGridHelper(8, 16, 8, 48, 0xd4af37, 0x1f2937);
    gridHelper.position.y = -2.25;
    this.scene.add(gridHelper);
  }

  private buildHotspotMarkers(theme: ButterflyTheme) {
    const pinGeom = new THREE.SphereGeometry(0.05, 12, 12);
    const ringGeom = new THREE.TorusGeometry(0.08, 0.012, 6, 16);

    const pinMat = new THREE.MeshStandardMaterial({
      color: theme.accentGlow,
      emissive: theme.accentGlow,
      emissiveIntensity: 3.0,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: theme.primaryMetal,
      roughness: 0.2,
      metalness: 0.9,
    });

    BUTTERFLY_HOTSPOTS.forEach((spot) => {
      const group = new THREE.Group();
      group.name = `hotspot_${spot.id}`;
      group.position.set(spot.position[0], spot.position[1], spot.position[2]);

      const pin = new THREE.Mesh(pinGeom, pinMat);
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.name = 'ring';

      group.add(pin);
      group.add(ring);
      group.userData = { hotspotId: spot.id };

      // Add to butterfly so they move with butterfly body
      this.butterfly.group.add(group);
      this.hotspotMeshes.push(group);
    });
  }

  public setHotspotsVisible(val: boolean) {
    this.hotspotMeshes.forEach((mesh) => {
      mesh.visible = val;
    });
  }

  public selectHotspot(hotspotId: string | null) {
    this.selectedHotspotId = hotspotId;
    if (!hotspotId) {
      if (this.onSelectHotspot) this.onSelectHotspot(null);
      return;
    }

    const spot = BUTTERFLY_HOTSPOTS.find((h) => h.id === hotspotId);
    if (spot) {
      soundManager.playServo();
      soundManager.playChime(780, 0.3);
      this.transitionCamera(
        new THREE.Vector3(...spot.cameraPos),
        new THREE.Vector3(...spot.cameraTarget)
      );
      if (this.onSelectHotspot) this.onSelectHotspot(spot.id);
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    soundManager.playServo();
    switch (preset) {
      case 'specimen':
        this.transitionCamera(new THREE.Vector3(0, 0.8, 3.8), new THREE.Vector3(0, 0, 0));
        break;
      case 'wing_macro':
        this.transitionCamera(new THREE.Vector3(-1.8, 1.4, 1.5), new THREE.Vector3(-1.0, 0.5, 0));
        break;
      case 'core_macro':
        this.transitionCamera(new THREE.Vector3(0, 0.4, 1.3), new THREE.Vector3(0, 0.15, 0));
        break;
      case 'head_macro':
        this.transitionCamera(new THREE.Vector3(0.5, 0.8, 1.5), new THREE.Vector3(0, 0.4, 0.5));
        break;
      case 'top_down':
        this.transitionCamera(new THREE.Vector3(0, 4.5, 0.01), new THREE.Vector3(0, 0, 0));
        break;
      case 'chase':
        this.transitionCamera(new THREE.Vector3(0, 1.2, -3.2), new THREE.Vector3(0, 0, 1));
        break;
    }
  }

  public transitionCamera(pos: THREE.Vector3, lookAt: THREE.Vector3) {
    this.targetCameraPos.copy(pos);
    this.targetCameraLookAt.copy(lookAt);
    this.cameraTransitionProgress = 0.0;
    this.isTransitioningCamera = true;
  }

  public setTheme(theme: ButterflyTheme) {
    this.scene.background = new THREE.Color(theme.bgColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(theme.fogColor);
    }

    this.ambientLight.color.setHex(theme.ambientLight);
    this.keyLight.color.setHex(theme.keyLight);
    this.rimLight1.color.setHex(theme.rimLight);
    this.rimLight2.color.setHex(theme.accentGlow);

    if (this.bloomPass) {
      this.bloomPass.strength = theme.bloomStrength;
    }

    this.butterfly.setTheme(theme);
    this.stand.setTheme(theme);
    this.particles.setParticleColor(theme.particleColor);

    soundManager.playChime(600, 0.4);
  }

  public setFlightMode(mode: FlightMode) {
    this.flightController.setMode(mode);
    if (mode === 'flight') {
      this.stand.group.visible = false;
      this.setHotspotsVisible(false);
    } else {
      this.stand.group.visible = true;
    }
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  };

  private onPointerDown = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check if clicked a hotspot pin
    const hotspotIntersects = this.raycaster.intersectObjects(this.hotspotMeshes, true);
    if (hotspotIntersects.length > 0) {
      let current: THREE.Object3D | null = hotspotIntersects[0].object;
      while (current && !current.userData.hotspotId) {
        current = current.parent;
      }
      if (current && current.userData.hotspotId) {
        this.selectHotspot(current.userData.hotspotId);
        return;
      }
    }

    // 2. Check if clicked the butterfly body/wings to trigger gust / flutter
    const butterflyIntersects = this.raycaster.intersectObject(this.butterfly.group, true);
    if (butterflyIntersects.length > 0) {
      this.flightController.triggerGust();
      soundManager.playFlutter();
      soundManager.playTick(920);
    }
  };

  private onPointerMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Flight mode target mouse follow
    if (this.flightController.mode === 'flight') {
      const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = 4.0;
      this.flightController.mouseWorldTarget.copy(this.camera.position).add(dir.multiplyScalar(distance));
    }
  };

  public triggerWindGust() {
    this.flightController.triggerGust();
  }

  public animationControls: AnimationControls | null = null;

  public setAnimationControls(c: AnimationControls) {
    this.animationControls = c;
  }

  public startAnimationLoop(initialControls: AnimationControls) {
    this.animationControls = initialControls;

    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      const delta = Math.min(this.clock.getDelta(), 0.1);
      const controls = this.animationControls || initialControls;

      // FPS Calculation
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 500) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
        if (this.onFpsUpdate) this.onFpsUpdate(fps);
        this.frameCount = 0;
        this.lastFpsTime = now;
      }

      // Smooth camera interpolation if transitioning
      if (this.isTransitioningCamera) {
        this.cameraTransitionProgress += delta * 2.5;
        const t = Math.min(1.0, this.cameraTransitionProgress);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.camera.position.lerp(this.targetCameraPos, ease);
        this.controls.target.lerp(this.targetCameraLookAt, ease);

        if (this.cameraTransitionProgress >= 1.0) {
          this.isTransitioningCamera = false;
        }
      }

      // 1. Update Flight Controller
      const flightInfo = this.flightController.update(delta, this.butterfly.group);

      // In flight mode, smoothly track butterfly with camera target
      if (this.flightController.mode === 'flight' && !this.isTransitioningCamera) {
        this.controls.target.lerp(this.butterfly.group.position, delta * 3.5);
      } else if (this.flightController.mode === 'specimen' && !this.isTransitioningCamera && !this.selectedHotspotId) {
        this.controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2.0);
      }

      // 2. Play subtle ticking sound proportional to speed
      if (controls.flapSpeed > 0.1) {
        soundManager.playTick(600 + Math.random() * 200);
      }

      // 3. Update Butterfly
      const mergedControls: AnimationControls = {
        ...controls,
        glideRatio: flightInfo.glideRatio,
        flapSpeed: controls.flapSpeed * flightInfo.speedMultiplier,
      };
      this.butterfly.update(delta, mergedControls, this.flightController.gustIntensity);

      // 4. Update Specimen Stand
      if (controls.showPedestal && this.flightController.mode !== 'flight') {
        this.stand.group.visible = true;
        this.stand.update(delta);
      } else {
        this.stand.group.visible = false;
      }

      // 5. Update Particle Systems & Wing Trails
      if (controls.showAetherParticles) {
        this.particles.aetherGroup.visible = true;
        this.particles.update(delta);
      } else {
        this.particles.aetherGroup.visible = false;
      }

      if (controls.showWingTrails && controls.flapSpeed > 0.1) {
        this.particles.trailGroup.visible = true;
        const tips = this.butterfly.getWingTipPositions();
        this.particles.emitTrail(tips.left, tips.right);
      } else {
        this.particles.trailGroup.visible = false;
      }

      // 6. Animate Hotspot Rings
      if (controls.showHotspots && this.flightController.mode !== 'flight') {
        this.hotspotMeshes.forEach((mesh) => {
          mesh.visible = true;
          const ring = mesh.getObjectByName('ring');
          if (ring) {
            ring.rotation.x += delta * 1.5;
            ring.rotation.y += delta * 1.8;
          }
        });
      } else {
        this.setHotspotsVisible(false);
      }

      // 7. Auto Orbit if enabled
      this.controls.autoRotate = controls.autoRotate;
      this.controls.autoRotateSpeed = 1.2;
      this.controls.update();

      // 8. Render
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  public takeScreenshot(): string {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    return this.renderer.domElement.toDataURL('image/png');
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
