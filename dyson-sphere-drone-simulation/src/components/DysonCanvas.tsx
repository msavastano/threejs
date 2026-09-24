import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { SimulationSettings, SimulationStats } from '../types/simulation';
import { StarSystem } from '../sim/StarSystem';
import { StarfieldBackground } from '../sim/StarfieldBackground';
import { MiningPlanet } from '../sim/MiningPlanet';
import { DysonStructureManager } from '../sim/DysonStructureManager';
import { DroneSwarmManager } from '../sim/DroneSwarmManager';
import { spaceAudio } from '../audio/spaceAudio';

interface DysonCanvasProps {
  settings: SimulationSettings;
  onUpdateSettings: (updater: (prev: SimulationSettings) => SimulationSettings) => void;
  onUpdateStats: (stats: SimulationStats) => void;
}

export const DysonCanvas: React.FC<DysonCanvasProps> = ({
  settings,
  onUpdateSettings,
  onUpdateStats
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // References to keep state intact across re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // Simulation Entities
  const starSystemRef = useRef<StarSystem | null>(null);
  const starfieldRef = useRef<StarfieldBackground | null>(null);
  const miningPlanetRef = useRef<MiningPlanet | null>(null);
  const dysonManagerRef = useRef<DysonStructureManager | null>(null);
  const droneManagerRef = useRef<DroneSwarmManager | null>(null);

  // Performance tracking
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);

  // Store settings in ref so animation loop can access latest without re-subscribing
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initial Setup of WebGL Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.0008);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(120, 80, 200);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 600;
    controls.minDistance = 20;
    controlsRef.current = controls;

    // 5. Post Processing (Bloom & Tone Mapping)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      settings.bloomStrength,
      settings.bloomRadius,
      settings.bloomThreshold
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    composerRef.current = composer;

    // 6. Initialize Entities
    const starfield = new StarfieldBackground();
    scene.add(starfield.group);
    starfieldRef.current = starfield;

    const starSystem = new StarSystem();
    scene.add(starSystem.group);
    starSystemRef.current = starSystem;

    const miningPlanet = new MiningPlanet();
    scene.add(miningPlanet.group);
    scene.add(miningPlanet.getCargoStreamPoints());
    miningPlanetRef.current = miningPlanet;

    const dysonManager = new DysonStructureManager();
    scene.add(dysonManager.group);
    dysonManagerRef.current = dysonManager;

    const droneManager = new DroneSwarmManager(settings.droneCount);
    scene.add(droneManager.group);
    droneManagerRef.current = droneManager;

    // 7. Window Resize Listener
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera || !composer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Main Render & Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const currentSettings = settingsRef.current;

      // FPS Calculation
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // Time Scale & Auto Construction Progress Update
      const effTimeScale = currentSettings.timeScale;

      if (currentSettings.autoProgress && effTimeScale > 0) {
        onUpdateSettings((prev) => {
          const nextVal = Math.min(1.0, prev.constructionProgress + delta * 0.012 * prev.timeScale);
          return { ...prev, constructionProgress: nextVal };
        });
      }

      // Entity Updates
      starfield.update(delta);
      starSystem.update(delta, effTimeScale);
      miningPlanet.update(delta, effTimeScale);
      dysonManager.update(delta, effTimeScale);
      dysonManager.updateProgress(currentSettings.constructionProgress);

      const planetPos = miningPlanet.getPosition();

      // Update Swarm & gather statistics
      const swarmCounts = droneManager.update(
        delta,
        effTimeScale,
        currentSettings.droneSpeed,
        planetPos,
        () => dysonManager.getRandomConstructionNode(),
        currentSettings.solarFlareTrigger
      );

      // Camera Modes
      if (controls) {
        if (currentSettings.cameraMode === 'free') {
          controls.enabled = true;
          controls.update();
        } else if (currentSettings.cameraMode === 'chase_drone') {
          controls.enabled = false;
          // Follow an active orbit node around Dyson structure
          const time = Date.now() * 0.0008;
          const chaseX = Math.cos(time) * 62;
          const chaseZ = Math.sin(time) * 62;
          const chaseY = Math.sin(time * 1.5) * 20;
          camera.position.set(chaseX + 5, chaseY + 3, chaseZ + 5);
          camera.lookAt(chaseX - 10, chaseY - 2, chaseZ - 10);
        } else if (currentSettings.cameraMode === 'star_surface') {
          controls.enabled = false;
          const time = Date.now() * 0.0003;
          camera.position.set(Math.cos(time) * 28, 12, Math.sin(time) * 28);
          camera.lookAt(0, 0, 0);
        } else if (currentSettings.cameraMode === 'mining_planet') {
          controls.enabled = false;
          const p = planetPos;
          camera.position.set(p.x + 25, p.y + 15, p.z + 30);
          camera.lookAt(p);
        } else if (currentSettings.cameraMode === 'cinematic_tour') {
          controls.enabled = false;
          const time = Date.now() * 0.0002;
          const tourRadius = 160 + Math.sin(time * 2) * 50;
          camera.position.set(Math.cos(time) * tourRadius, Math.sin(time * 1.2) * 60, Math.sin(time) * tourRadius);
          camera.lookAt(0, 0, 0);
        }
      }

      // Render Scene with Bloom or standard
      if (currentSettings.bloomEnabled && composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }

      // Publish Statistics Update
      const powerGW = Math.round(currentSettings.constructionProgress * 380000);
      const kardashev = Number((0.75 + currentSettings.constructionProgress * 1.25).toFixed(2));

      onUpdateStats({
        fps: fpsRef.current,
        activeDrones: currentSettings.droneCount,
        powerOutputTW: powerGW,
        kardashevRating: kardashev,
        totalPanelsBuilt: Math.floor(currentSettings.constructionProgress * 360),
        transitingDrones: swarmCounts.transitingCount,
        beamingDrones: swarmCounts.beamingCount,
        miningDrones: swarmCounts.miningCount,
        chargingDrones: swarmCounts.chargingCount,
        orbitRadiusAvg: 55,
        stellarTemperature: 5778
      });
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Update Reactive Properties when settings change
  useEffect(() => {
    if (starSystemRef.current) {
      starSystemRef.current.setStarType(settings.starType);
    }
  }, [settings.starType]);

  useEffect(() => {
    if (droneManagerRef.current) {
      droneManagerRef.current.setDroneCount(settings.droneCount);
    }
  }, [settings.droneCount]);

  useEffect(() => {
    if (droneManagerRef.current) {
      droneManagerRef.current.setFormation(settings.swarmFormation);
    }
  }, [settings.swarmFormation]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = settings.bloomStrength;
      bloomPassRef.current.radius = settings.bloomRadius;
      bloomPassRef.current.threshold = settings.bloomThreshold;
    }
  }, [settings.bloomStrength, settings.bloomRadius, settings.bloomThreshold]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = settings.shadowsEnabled;
    }
  }, [settings.shadowsEnabled]);

  useEffect(() => {
    if (settings.solarFlareTrigger && starSystemRef.current) {
      starSystemRef.current.triggerSolarFlare();
      spaceAudio.playSolarFlareSiren();
      // Reset trigger after activation
      setTimeout(() => {
        onUpdateSettings((prev) => ({ ...prev, solarFlareTrigger: false }));
      }, 500);
    }
  }, [settings.solarFlareTrigger]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing"
    />
  );
};
