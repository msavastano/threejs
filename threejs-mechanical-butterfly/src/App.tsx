import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './butterfly/SceneManager';
import { BUTTERFLY_THEMES } from './butterfly/themes';
import { ButterflyThemeId, FlightMode, CameraPreset, AnimationControls } from './butterfly/types';
import { soundManager } from './butterfly/SoundManager';
import { HeaderBar } from './components/HeaderBar';
import { ControlPanel } from './components/ControlPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { HotspotDrawer } from './components/HotspotDrawer';
import { HelpModal } from './components/HelpModal';
import { Camera, Check } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // States
  const [themeId, setThemeId] = useState<ButterflyThemeId>('brass-obsidian');
  const [flightMode, setFlightMode] = useState<FlightMode>('specimen');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [screenshotNotification, setScreenshotNotification] = useState<string | null>(null);

  // Animation & Rendering Controls
  const [controls, setControls] = useState<AnimationControls>({
    flapSpeed: 1.0,
    flapAmplitude: 0.72,
    explodedRatio: 0.0,
    glowIntensity: 1.0,
    wingSpread: 0.15,
    glideRatio: 0.0,
    gearRotationSpeed: 1.0,
    autoRotate: false,
    wireframe: false,
    showPedestal: true,
    showHotspots: true,
    showAetherParticles: true,
    showWingTrails: true,
  });

  const currentTheme = BUTTERFLY_THEMES[themeId];

  // Initialize SceneManager
  useEffect(() => {
    if (!containerRef.current) return;

    const sm = new SceneManager(containerRef.current, BUTTERFLY_THEMES[themeId]);
    sceneManagerRef.current = sm;

    sm.onSelectHotspot = (id) => {
      setSelectedHotspotId(id);
    };

    sm.onFpsUpdate = (currFps) => {
      setFps(currFps);
    };

    sm.startAnimationLoop(controls);

    return () => {
      sm.destroy();
      sceneManagerRef.current = null;
    };
  }, []);

  // Update controls inside animation loop
  const handleUpdateControls = useCallback((patch: Partial<AnimationControls>) => {
    setControls((prev) => {
      const updated = { ...prev, ...patch };

      if (patch.wireframe !== undefined && sceneManagerRef.current) {
        sceneManagerRef.current.butterfly.setWireframe(patch.wireframe);
      }
      if (patch.autoRotate !== undefined && sceneManagerRef.current) {
        sceneManagerRef.current.controls.autoRotate = patch.autoRotate;
      }
      return updated;
    });
  }, []);

  // Sync controls with running scene manager
  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.setAnimationControls(controls);
  }, [controls]);

  // Handle Theme Change
  const handleSelectTheme = (id: ButterflyThemeId) => {
    setThemeId(id);
    const theme = BUTTERFLY_THEMES[id];
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setTheme(theme);
    }
  };

  // Handle Flight Mode Change
  const handleSetMode = (mode: FlightMode) => {
    setFlightMode(mode);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setFlightMode(mode);
      if (mode === 'flight') {
        setSelectedHotspotId(null);
      }
    }
  };

  // Handle Camera Presets
  const handleSetCameraPreset = (preset: CameraPreset) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraPreset(preset);
    }
  };

  // Trigger Wind Gust
  const handleTriggerGust = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.triggerWindGust();
    }
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    soundManager.setEnabled(nextVal);
  };

  // Reset Controls
  const handleResetControls = () => {
    const defaultControls: AnimationControls = {
      flapSpeed: 1.0,
      flapAmplitude: 0.72,
      explodedRatio: 0.0,
      glowIntensity: 1.0,
      wingSpread: 0.15,
      glideRatio: 0.0,
      gearRotationSpeed: 1.0,
      autoRotate: false,
      wireframe: false,
      showPedestal: true,
      showHotspots: true,
      showAetherParticles: true,
      showWingTrails: true,
    };
    setControls(defaultControls);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.butterfly.setWireframe(false);
      sceneManagerRef.current.setCameraPreset('specimen');
    }
  };

  // Take Screenshot
  const handleTakeScreenshot = () => {
    if (!sceneManagerRef.current) return;
    try {
      const dataUrl = sceneManagerRef.current.takeScreenshot();
      const link = document.createElement('a');
      link.download = `Aurum-Papilio-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setScreenshotNotification('High-resolution screenshot saved to downloads!');
      setTimeout(() => setScreenshotNotification(null), 3000);
      soundManager.playChime(880, 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  // Hotspot selection
  const handleSelectHotspot = (id: string | null) => {
    setSelectedHotspotId(id);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.selectHotspot(id);
    }
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleSetMode(flightMode === 'flight' ? 'specimen' : 'flight');
      } else if (e.code === 'KeyG') {
        handleTriggerGust();
      } else if (e.code === 'KeyM') {
        handleToggleSound();
      } else if (e.code === 'KeyE') {
        handleUpdateControls({
          explodedRatio: controls.explodedRatio > 0.4 ? 0.0 : 0.85,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flightMode, soundEnabled, controls.explodedRatio]);

  const glowHex = '#' + currentTheme.accentGlow.toString(16).padStart(6, '0');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-tech">
      {/* 3D Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Header Bar */}
      <HeaderBar
        currentMode={flightMode}
        onSetMode={handleSetMode}
        onTriggerGust={handleTriggerGust}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onTakeScreenshot={handleTakeScreenshot}
        fps={fps}
        currentTheme={currentTheme}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Hotspot Drawer */}
      <HotspotDrawer
        hotspotId={selectedHotspotId}
        onClose={() => handleSelectHotspot(null)}
        onSelectHotspot={handleSelectHotspot}
        accentGlowHex={glowHex}
      />

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-20 pointer-events-none flex flex-col gap-3 max-w-5xl mx-auto">
        {/* Theme Selector */}
        <div className="pointer-events-auto">
          <ThemeSelector
            currentThemeId={themeId}
            onSelectTheme={handleSelectTheme}
          />
        </div>

        {/* Mechanism Kinematic Controls */}
        <ControlPanel
          controls={controls}
          onChangeControls={handleUpdateControls}
          onSetCameraPreset={handleSetCameraPreset}
          onResetControls={handleResetControls}
        />
      </div>

      {/* Screenshot Notification Toast */}
      {screenshotNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/40 text-amber-300 text-xs font-tech flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <span>{screenshotNotification}</span>
          <Check className="w-4 h-4 text-emerald-400 ml-1" />
        </div>
      )}

      {/* Subtle Bottom Ambient Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10" />

      {/* User Guide & Lore Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        accentGlowHex={glowHex}
      />
    </div>
  );
}
