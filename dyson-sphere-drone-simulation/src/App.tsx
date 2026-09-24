import { useState } from 'react';
import { SimulationSettings, SimulationStats } from './types/simulation';
import { DysonCanvas } from './components/DysonCanvas';
import { Navbar } from './components/UI/Navbar';
import { TelemetryHUD } from './components/UI/TelemetryHUD';
import { ControlPanel } from './components/UI/ControlPanel';
import { CameraSelector } from './components/UI/CameraSelector';
import { PhaseGuideModal } from './components/UI/PhaseGuideModal';

export function App() {
  const [settings, setSettings] = useState<SimulationSettings>({
    starType: 'sol',
    droneCount: 5000,
    droneSpeed: 1.0,
    constructionProgress: 0.15,
    autoProgress: true,
    timeScale: 1,
    swarmFormation: 'orbital_rings',
    cameraMode: 'free',
    bloomEnabled: true,
    bloomStrength: 1.2,
    bloomRadius: 0.4,
    bloomThreshold: 0.15,
    shadowsEnabled: true,
    shadowQuality: 'high',
    showOrbitLines: true,
    showLaserBeams: true,
    showStarGrid: true,
    soundEnabled: false,
    soundVolume: 0.5,
    solarFlareTrigger: false
  });

  const [stats, setStats] = useState<SimulationStats>({
    fps: 60,
    activeDrones: 5000,
    powerOutputTW: 57000,
    kardashevRating: 0.93,
    totalPanelsBuilt: 54,
    transitingDrones: 2000,
    beamingDrones: 1500,
    miningDrones: 1000,
    chargingDrones: 500,
    orbitRadiusAvg: 55,
    stellarTemperature: 5778
  });

  const [isPhaseGuideOpen, setIsPhaseGuideOpen] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-mono">
      {/* 1. Main WebGL 3D Dyson Canvas */}
      <DysonCanvas
        settings={settings}
        onUpdateSettings={setSettings}
        onUpdateStats={setStats}
      />

      {/* 2. Top Header Navigation */}
      <Navbar
        settings={settings}
        onUpdateSettings={setSettings}
        onOpenPhaseGuide={() => setIsPhaseGuideOpen(true)}
      />

      {/* 3. Realtime Telemetry Overlay */}
      <TelemetryHUD stats={stats} settings={settings} />

      {/* 4. Interactive Right Drawer Control Panel */}
      <ControlPanel settings={settings} onUpdateSettings={setSettings} />

      {/* 5. Bottom Floating Camera Switcher */}
      <CameraSelector
        cameraMode={settings.cameraMode}
        onUpdateSettings={setSettings}
      />

      {/* 6. Technical Phase Guide Modal */}
      <PhaseGuideModal
        isOpen={isPhaseGuideOpen}
        onClose={() => setIsPhaseGuideOpen(false)}
      />
    </div>
  );
}

export default App;
