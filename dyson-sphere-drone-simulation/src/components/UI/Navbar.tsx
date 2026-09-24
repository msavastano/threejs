import React from 'react';
import { Pause, FastForward, Volume2, VolumeX, Sun, ShieldAlert } from 'lucide-react';
import { SimulationSettings, StarType, STAR_CONFIGS } from '../../types/simulation';
import { spaceAudio } from '../../audio/spaceAudio';

interface NavbarProps {
  settings: SimulationSettings;
  onUpdateSettings: (updater: (prev: SimulationSettings) => SimulationSettings) => void;
  onOpenPhaseGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onUpdateSettings,
  onOpenPhaseGuide
}) => {
  const handleStarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    spaceAudio.playUIClick();
    const type = e.target.value as StarType;
    onUpdateSettings((prev) => ({ ...prev, starType: type }));
  };

  const handleTimeScaleChange = (scale: number) => {
    spaceAudio.playUIClick();
    onUpdateSettings((prev) => ({ ...prev, timeScale: scale }));
  };

  const toggleSound = () => {
    const nextSound = !settings.soundEnabled;
    spaceAudio.setMuted(!nextSound);
    onUpdateSettings((prev) => ({ ...prev, soundEnabled: nextSound }));
    if (nextSound) spaceAudio.init();
  };

  const triggerSolarEvent = () => {
    onUpdateSettings((prev) => ({ ...prev, solarFlareTrigger: true }));
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/20 text-cyan-100 font-mono select-none">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Sun className="w-5 h-5 text-cyan-400 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm md:text-base font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
            Dyson Sphere Swarm Engine
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              v2.5
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">Autonomous Drone Megastructure Simulator</p>
        </div>
      </div>

      {/* Center Controls: Star Switcher & Time Engine */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Star Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 rounded-lg px-2.5 py-1">
          <span className="text-xs text-slate-400">STAR:</span>
          <select
            value={settings.starType}
            onChange={handleStarChange}
            className="bg-transparent text-xs text-cyan-200 focus:outline-none cursor-pointer"
          >
            {Object.entries(STAR_CONFIGS).map(([key, config]) => (
              <option key={key} value={key} className="bg-slate-900 text-cyan-100">
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Scale Buttons */}
        <div className="flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-lg p-0.5">
          <button
            onClick={() => handleTimeScaleChange(0)}
            className={`px-2 py-1 rounded text-xs transition ${
              settings.timeScale === 0 ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-200'
            }`}
            title="Pause Simulation"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleTimeScaleChange(1)}
            className={`px-2 py-1 rounded text-xs font-semibold transition ${
              settings.timeScale === 1 ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            1x
          </button>
          <button
            onClick={() => handleTimeScaleChange(2)}
            className={`px-2 py-1 rounded text-xs font-semibold transition ${
              settings.timeScale === 2 ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            2x
          </button>
          <button
            onClick={() => handleTimeScaleChange(5)}
            className={`px-2 py-1 rounded text-xs font-semibold transition ${
              settings.timeScale === 5 ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            5x
          </button>
          <button
            onClick={() => handleTimeScaleChange(20)}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              settings.timeScale === 20 ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            <FastForward className="w-3 h-3" /> 20x
          </button>
        </div>
      </div>

      {/* Right Side Tools & Audio */}
      <div className="flex items-center gap-2">
        <button
          onClick={triggerSolarEvent}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition shadow-sm"
          title="Simulate Solar Flare Disruption"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">Solar Flare</span>
        </button>

        <button
          onClick={onOpenPhaseGuide}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition"
        >
          Phase Specs
        </button>

        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 transition"
          title={settings.soundEnabled ? 'Mute Audio' : 'Unmute Ambient Space Audio'}
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>
    </header>
  );
};
