import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  Camera,
  Play,
  Pause,
  Layers,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { AnimationControls, CameraPreset } from '../butterfly/types';

interface ControlPanelProps {
  controls: AnimationControls;
  onChangeControls: (newControls: Partial<AnimationControls>) => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  onResetControls: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  controls,
  onChangeControls,
  onSetCameraPreset,
  onResetControls,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'kinematics' | 'cameras' | 'render'>('kinematics');

  const cameraPresets: { id: CameraPreset; label: string; desc: string }[] = [
    { id: 'specimen', label: 'Specimen Orbit', desc: 'Standard isometric view' },
    { id: 'wing_macro', label: 'Wing Macro', desc: 'Close-up filigree & crystal' },
    { id: 'core_macro', label: 'Chrono Heart', desc: 'Escapement & balance wheel' },
    { id: 'head_macro', label: 'Optic Array', desc: 'Sapphire ocular facets' },
    { id: 'top_down', label: 'Dorsal Plan', desc: 'Top-down horology blueprint' },
    { id: 'chase', label: 'Rear Tail', desc: 'Swallowtail stabilizer fins' },
  ];

  return (
    <div className="bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden transition-all duration-300 pointer-events-auto">
      {/* Drawer Header Toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/60 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-tech font-bold uppercase tracking-wider text-neutral-200">
            Mechanism Diagnostics & Control
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tabs */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px] font-tech">
            <button
              onClick={() => setActiveTab('kinematics')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'kinematics'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Kinematics
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'cameras'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cameras
            </button>
            <button
              onClick={() => setActiveTab('render')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'render'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Display
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Drawer Body */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* TAB 1: KINEMATICS */}
          {activeTab === 'kinematics' && (
            <div className="space-y-3.5">
              {/* Exploded View Slider (Highlighted feature) */}
              <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900 p-3 rounded-xl border border-amber-500/30">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-tech font-bold text-amber-300 tracking-wider uppercase">
                    <Layers className="w-3.5 h-3.5" />
                    Exploded Architecture View
                  </span>
                  <span className="text-xs font-mono-clean text-amber-400 font-semibold">
                    {Math.round(controls.explodedRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={controls.explodedRatio}
                  onChange={(e) => onChangeControls({ explodedRatio: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono-clean mt-1">
                  <span>Assembled Horology</span>
                  <span>Component Deconstruction</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Flap Speed */}
                <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-tech text-neutral-300">Flap Frequency</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onChangeControls({ flapSpeed: controls.flapSpeed === 0 ? 1.0 : 0 })}
                        className="text-[10px] text-amber-400 hover:text-amber-300 p-0.5"
                      >
                        {controls.flapSpeed === 0 ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>
                      <span className="text-[11px] font-mono-clean text-neutral-400">
                        {controls.flapSpeed.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={controls.flapSpeed}
                    onChange={(e) => onChangeControls({ flapSpeed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Flap Amplitude */}
                <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-tech text-neutral-300">Stroke Amplitude</span>
                    <span className="text-[11px] font-mono-clean text-neutral-400">
                      {Math.round(controls.flapAmplitude * 57.3)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.1"
                    step="0.05"
                    value={controls.flapAmplitude}
                    onChange={(e) => onChangeControls({ flapAmplitude: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Luminescence Glow */}
                <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-tech text-neutral-300">Aether Luminescence</span>
                    <span className="text-[11px] font-mono-clean text-neutral-400">
                      {Math.round(controls.glowIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={controls.glowIntensity}
                    onChange={(e) => onChangeControls({ glowIntensity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Wing Rest Angle */}
                <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-tech text-neutral-300">Wing Spread Angle</span>
                    <span className="text-[11px] font-mono-clean text-neutral-400">
                      {Math.round(controls.wingSpread * 57.3)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.4"
                    max="0.8"
                    step="0.05"
                    value={controls.wingSpread}
                    onChange={(e) => onChangeControls({ wingSpread: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick speed presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-neutral-500 font-tech">Quick Presets:</span>
                <button
                  onClick={() => onChangeControls({ flapSpeed: 0, explodedRatio: 0 })}
                  className="px-2 py-0.5 rounded text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-tech"
                >
                  Frozen Rest
                </button>
                <button
                  onClick={() => onChangeControls({ flapSpeed: 0.4, explodedRatio: 0 })}
                  className="px-2 py-0.5 rounded text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-tech"
                >
                  Slow Flutter
                </button>
                <button
                  onClick={() => onChangeControls({ flapSpeed: 1.0, explodedRatio: 0 })}
                  className="px-2 py-0.5 rounded text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-tech"
                >
                  Normal Cruise
                </button>
                <button
                  onClick={() => onChangeControls({ flapSpeed: 1.8, explodedRatio: 0 })}
                  className="px-2 py-0.5 rounded text-[11px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-tech"
                >
                  High Torque
                </button>
                <button
                  onClick={() => onChangeControls({ explodedRatio: 0.85, flapSpeed: 0.2 })}
                  className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-tech ml-auto"
                >
                  Exploded Anatomy
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CAMERAS */}
          {activeTab === 'cameras' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cameraPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onSetCameraPreset(preset.id)}
                    className="p-2.5 rounded-xl bg-neutral-900/70 hover:bg-amber-500/15 border border-neutral-800 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-tech font-semibold text-neutral-200 group-hover:text-amber-300">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{preset.label}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-tech mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Auto Rotate Specimen Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
                <span className="text-xs font-tech text-neutral-300">Auto-Rotate Specimen</span>
                <button
                  onClick={() => onChangeControls({ autoRotate: !controls.autoRotate })}
                  className={`px-3 py-1 rounded-lg text-xs font-tech font-semibold transition-all ${
                    controls.autoRotate
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {controls.autoRotate ? 'Active' : 'Off'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY TOGGLES */}
          {activeTab === 'render' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs font-tech">
                <button
                  onClick={() => onChangeControls({ showPedestal: !controls.showPedestal })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    controls.showPedestal
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    Astrolabe Pedestal
                  </span>
                  <span>{controls.showPedestal ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => onChangeControls({ showHotspots: !controls.showHotspots })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    controls.showHotspots
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Hotspot Pins
                  </span>
                  <span>{controls.showHotspots ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => onChangeControls({ showAetherParticles: !controls.showAetherParticles })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    controls.showAetherParticles
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Floating Ether Motes
                  </span>
                  <span>{controls.showAetherParticles ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => onChangeControls({ showWingTrails: !controls.showWingTrails })}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    controls.showWingTrails
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Wingtip Sparkle Trails
                  </span>
                  <span>{controls.showWingTrails ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => onChangeControls({ wireframe: !controls.wireframe })}
                  className={`col-span-2 p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    controls.wireframe
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Wireframe Diagnostic Mode
                  </span>
                  <span>{controls.wireframe ? 'WIREFRAME' : 'SOLID'}</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onResetControls}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white font-tech transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Diagnostics</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
