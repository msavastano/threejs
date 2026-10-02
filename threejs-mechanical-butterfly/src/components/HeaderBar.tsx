import React from 'react';
import { Volume2, VolumeX, Wind, Camera, Maximize2, Compass, Disc, Sparkles } from 'lucide-react';
import { FlightMode, ButterflyTheme } from '../butterfly/types';

interface HeaderBarProps {
  currentMode: FlightMode;
  onSetMode: (mode: FlightMode) => void;
  onTriggerGust: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTakeScreenshot: () => void;
  fps: number;
  currentTheme: ButterflyTheme;
  onOpenHelp: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentMode,
  onSetMode,
  onTriggerGust,
  soundEnabled,
  onToggleSound,
  onTakeScreenshot,
  fps,
  currentTheme,
  onOpenHelp,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const glowColorHex = '#' + currentTheme.accentGlow.toString(16).padStart(6, '0');

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Brand & Chrono Title */}
      <div className="pointer-events-auto flex items-center gap-3.5 bg-neutral-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/20 shadow-2xl">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
          style={{
            background: `radial-gradient(circle, ${glowColorHex}44 0%, #151515 80%)`,
            border: `1px solid ${glowColorHex}88`,
          }}
        >
          <Disc className="w-5 h-5 animate-spin" style={{ color: glowColorHex, animationDuration: '8s' }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold font-serif-luxury tracking-widest text-amber-200 uppercase">
              Aurum Papilio
            </h1>
            <span
              className="text-[10px] font-mono-clean font-semibold uppercase px-1.5 py-0.5 rounded tracking-wider text-black font-bold"
              style={{ backgroundColor: glowColorHex }}
            >
              No. VII
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-tech tracking-wider">
            CHRONO-AERODYNAMIC HOROLOGY AUTOMATON
          </p>
        </div>
      </div>

      {/* Mode Switcher Pill */}
      <div className="pointer-events-auto flex items-center gap-1 bg-neutral-950/85 backdrop-blur-md p-1 rounded-2xl border border-neutral-800 shadow-xl">
        <button
          onClick={() => onSetMode('specimen')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-tech font-semibold transition-all duration-200 ${
            currentMode === 'specimen'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Specimen Stand</span>
        </button>

        <button
          onClick={() => onSetMode('flight')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-tech font-semibold transition-all duration-200 ${
            currentMode === 'flight'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Autonomous Flight</span>
        </button>

        <button
          onClick={() => onSetMode('orbit_cinematic')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-tech font-semibold transition-all duration-200 ${
            currentMode === 'orbit_cinematic'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cinematic Orbit</span>
        </button>
      </div>

      {/* Quick Action Buttons & Telemetry */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* FPS indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-neutral-950/80 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-800/80 text-xs font-mono-clean text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{fps} FPS</span>
        </div>

        {/* Wind Gust Button */}
        <button
          onClick={onTriggerGust}
          title="Trigger Aerodynamic Wind Gust"
          className="flex items-center gap-1.5 bg-neutral-950/80 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-800 hover:border-amber-500/30 text-xs font-tech font-medium transition-all"
        >
          <Wind className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Wind Gust</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Mechanical Audio' : 'Enable Mechanical Audio'}
          className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
            soundEnabled
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-neutral-950/80 text-neutral-400 hover:text-neutral-200 border-neutral-800'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Screenshot */}
        <button
          onClick={onTakeScreenshot}
          title="Capture High-Res Photo"
          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-800/80 text-neutral-300 hover:text-white backdrop-blur-md border border-neutral-800 transition-all"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title="Fullscreen Toggle"
          className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-800/80 text-neutral-300 hover:text-white backdrop-blur-md border border-neutral-800 transition-all hidden sm:flex"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Help */}
        <button
          onClick={onOpenHelp}
          title="Controls Guide & Specimen Lore"
          className="px-2.5 py-1.5 rounded-xl bg-neutral-950/80 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 backdrop-blur-md border border-neutral-800 hover:border-amber-500/30 text-xs font-mono-clean font-bold transition-all"
        >
          ?
        </button>
      </div>
    </header>
  );
};
