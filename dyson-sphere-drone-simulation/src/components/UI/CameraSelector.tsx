import React from 'react';
import { Eye, Orbit, Plane, Sparkles, Globe } from 'lucide-react';
import { CameraMode, SimulationSettings } from '../../types/simulation';
import { spaceAudio } from '../../audio/spaceAudio';

interface CameraSelectorProps {
  cameraMode: CameraMode;
  onUpdateSettings: (updater: (prev: SimulationSettings) => SimulationSettings) => void;
}

export const CameraSelector: React.FC<CameraSelectorProps> = ({
  cameraMode,
  onUpdateSettings
}) => {
  const setCamera = (mode: CameraMode) => {
    spaceAudio.playUIClick();
    onUpdateSettings((prev) => ({ ...prev, cameraMode: mode }));
  };

  const modes: { mode: CameraMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'free', label: 'Tactical Orbit', icon: <Orbit className="w-3.5 h-3.5" /> },
    { mode: 'chase_drone', label: 'Drone View', icon: <Plane className="w-3.5 h-3.5" /> },
    { mode: 'star_surface', label: 'Star Surface', icon: <Eye className="w-3.5 h-3.5" /> },
    { mode: 'mining_planet', label: 'Mining World', icon: <Globe className="w-3.5 h-3.5" /> },
    { mode: 'cinematic_tour', label: 'Cinematic Tour', icon: <Sparkles className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 font-mono text-xs select-none shadow-xl">
      {modes.map((m) => (
        <button
          key={m.mode}
          onClick={() => setCamera(m.mode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            cameraMode === m.mode
              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm shadow-cyan-500/20 font-bold'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
          }`}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
};
