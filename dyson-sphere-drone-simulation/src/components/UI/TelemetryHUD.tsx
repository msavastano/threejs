import React from 'react';
import { Zap, Cpu, Activity } from 'lucide-react';
import { SimulationStats, SimulationSettings, CONSTRUCTION_PHASES } from '../../types/simulation';

interface TelemetryHUDProps {
  stats: SimulationStats;
  settings: SimulationSettings;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ stats, settings }) => {
  const completionPct = (settings.constructionProgress * 100).toFixed(1);

  // Determine current phase info
  const activePhaseIndex = Math.min(
    CONSTRUCTION_PHASES.length - 1,
    Math.floor(settings.constructionProgress * 4.99)
  );
  const phaseInfo = CONSTRUCTION_PHASES[activePhaseIndex];

  return (
    <div className="absolute top-16 left-4 z-10 flex flex-col gap-3 max-w-xs sm:max-w-sm pointer-events-none font-mono text-cyan-100 select-none">
      {/* 1. Main Energy & Megastructure Meter */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 pointer-events-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            DYSON ENCLOSURE
          </span>
          <span className="text-xs text-slate-400">Kardashev {stats.kardashevRating}</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-extrabold text-cyan-200 tracking-tight">{completionPct}%</span>
          <span className="text-xs text-amber-300 font-semibold">{stats.powerOutputTW.toLocaleString()} TW Yield</span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-900 border border-cyan-500/20 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 transition-all duration-300 relative"
            style={{ width: `${completionPct}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-cyan-500/10 flex justify-between text-[11px] text-slate-400">
          <span>Hex Panels: <span className="text-cyan-300 font-semibold">{stats.totalPanelsBuilt} / 360</span></span>
          <span>FPS: <span className="text-emerald-400 font-semibold">{stats.fps}</span></span>
        </div>
      </div>

      {/* 2. Swarm Operational Breakdown */}
      <div className="p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 pointer-events-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            SWARM STATUS ({stats.activeDrones.toLocaleString()} DRONES)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-cyan-500/10">
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Transit
            </span>
            <span className="font-bold text-cyan-200">{stats.transitingDrones}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-amber-500/10">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Laser Firing
            </span>
            <span className="font-bold text-amber-200">{stats.beamingDrones}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-purple-500/10">
            <span className="text-fuchsia-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400" /> Ore Mining
            </span>
            <span className="font-bold text-fuchsia-200">{stats.miningDrones}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-emerald-500/10">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Dock / Charge
            </span>
            <span className="font-bold text-emerald-200">{stats.chargingDrones}</span>
          </div>
        </div>
      </div>

      {/* 3. Current Phase Milestone Banner */}
      <div className="p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 pointer-events-auto">
        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          ACTIVE PHASE
        </div>
        <div className="text-xs font-bold text-cyan-200">{phaseInfo.title}</div>
        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{phaseInfo.description}</p>
      </div>
    </div>
  );
};
