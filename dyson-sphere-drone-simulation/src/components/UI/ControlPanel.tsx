import React, { useState } from 'react';
import { Settings2, Sliders, Layers, Cpu, Sun, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { SimulationSettings, SwarmFormation, CONSTRUCTION_PHASES } from '../../types/simulation';
import { spaceAudio } from '../../audio/spaceAudio';

interface ControlPanelProps {
  settings: SimulationSettings;
  onUpdateSettings: (updater: (prev: SimulationSettings) => SimulationSettings) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ settings, onUpdateSettings }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'phases' | 'swarm' | 'optics'>('phases');

  const setProgress = (val: number) => {
    onUpdateSettings((prev) => ({ ...prev, constructionProgress: val }));
  };

  const setDroneCount = (count: number) => {
    onUpdateSettings((prev) => ({ ...prev, droneCount: count }));
  };

  const setDroneSpeed = (speed: number) => {
    onUpdateSettings((prev) => ({ ...prev, droneSpeed: speed }));
  };

  const setFormation = (fmt: SwarmFormation) => {
    spaceAudio.playUIClick();
    onUpdateSettings((prev) => ({ ...prev, swarmFormation: fmt }));
  };

  return (
    <div className="absolute top-16 right-4 z-10 font-mono text-cyan-100 select-none">
      {/* Toggle Tab Button when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 hover:bg-slate-900 shadow-xl"
        >
          <Settings2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold">CONTROL DECK</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Main Open Panel Drawer */}
      {isOpen && (
        <div className="w-80 max-h-[82vh] overflow-y-auto rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 p-4 shadow-2xl custom-scrollbar flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold tracking-wider text-cyan-200 uppercase">Swarm Control Deck</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-cyan-200 hover:bg-slate-900"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-xs">
            <button
              onClick={() => setActiveTab('phases')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded transition ${
                activeTab === 'phases' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Phase
            </button>
            <button
              onClick={() => setActiveTab('swarm')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded transition ${
                activeTab === 'swarm' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Swarm
            </button>
            <button
              onClick={() => setActiveTab('optics')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded transition ${
                activeTab === 'optics' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Optics
            </button>
          </div>

          {/* TAB 1: PHASES */}
          {activeTab === 'phases' && (
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Progress Slider</span>
                  <span className="text-amber-400 font-bold">{(settings.constructionProgress * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.constructionProgress}
                  onChange={(e) => setProgress(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Auto Progress Toggle */}
              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-cyan-500/20 cursor-pointer">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Auto Construction
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoProgress}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, autoProgress: e.target.checked }))}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Phase Quick Jumps */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quick Phase Jump</span>
                {CONSTRUCTION_PHASES.map((phase) => (
                  <button
                    key={phase.phase}
                    onClick={() => {
                      spaceAudio.playUIClick();
                      setProgress(phase.targetCompletion);
                    }}
                    className={`flex items-center justify-between p-2 rounded text-left transition border ${
                      Math.abs(settings.constructionProgress - phase.targetCompletion) < 0.08
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/40 border-cyan-500/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{phase.title}</div>
                      <div className="text-[10px] text-slate-400">{phase.subtitle}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      {(phase.targetCompletion * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SWARM */}
          {activeTab === 'swarm' && (
            <div className="flex flex-col gap-3.5 text-xs">
              {/* Drone Count */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Drone Count</span>
                  <span className="text-cyan-300 font-bold">{settings.droneCount.toLocaleString()} Units</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="500"
                  value={settings.droneCount}
                  onChange={(e) => setDroneCount(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1,000</span>
                  <span>10,000</span>
                  <span>20,000</span>
                </div>
              </div>

              {/* Drone Velocity */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Orbital Speed Factor</span>
                  <span className="text-amber-300 font-bold">{settings.droneSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.droneSpeed}
                  onChange={(e) => setDroneSpeed(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Formations */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Swarm Formation Topology</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setFormation('orbital_rings')}
                    className={`p-2 rounded border text-left transition ${
                      settings.swarmFormation === 'orbital_rings'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-cyan-500/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    Orbital Bands
                  </button>

                  <button
                    onClick={() => setFormation('dyson_grid')}
                    className={`p-2 rounded border text-left transition ${
                      settings.swarmFormation === 'dyson_grid'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-cyan-500/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    Sphere Grid
                  </button>

                  <button
                    onClick={() => setFormation('polar_orbit')}
                    className={`p-2 rounded border text-left transition ${
                      settings.swarmFormation === 'polar_orbit'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-cyan-500/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    Polar Jets
                  </button>

                  <button
                    onClick={() => setFormation('defensive_shell')}
                    className={`p-2 rounded border text-left transition ${
                      settings.swarmFormation === 'defensive_shell'
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-cyan-500/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    Outer Orbit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPTICS */}
          {activeTab === 'optics' && (
            <div className="flex flex-col gap-3 text-xs">
              {/* Bloom Toggle */}
              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-cyan-500/20 cursor-pointer">
                <span className="text-slate-300">Bloom Post-Processing</span>
                <input
                  type="checkbox"
                  checked={settings.bloomEnabled}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, bloomEnabled: e.target.checked }))}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Bloom Strength */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Bloom Strength</span>
                  <span className="text-cyan-300 font-bold">{settings.bloomStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.bloomStrength}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, bloomStrength: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Bloom Radius */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Bloom Radius</span>
                  <span className="text-cyan-300 font-bold">{settings.bloomRadius.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={settings.bloomRadius}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, bloomRadius: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Dynamic Shadows */}
              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-cyan-500/20 cursor-pointer">
                <span className="text-slate-300">Dynamic Shadows</span>
                <input
                  type="checkbox"
                  checked={settings.shadowsEnabled}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, shadowsEnabled: e.target.checked }))}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
