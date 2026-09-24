import React from 'react';
import { X, Zap, Layers, Sparkles, Orbit } from 'lucide-react';
import { CONSTRUCTION_PHASES } from '../../types/simulation';

interface PhaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhaseGuideModal: React.FC<PhaseGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg font-mono text-cyan-100 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl custom-scrollbar flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-cyan-200 tracking-wider uppercase">
                Dyson Megastructure Construction Blueprints
              </h2>
              <p className="text-xs text-slate-400">Kardashev Type II Engineering Protocol & Orbital Swarm Specs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kardashev Explanation */}
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs leading-relaxed text-slate-300">
          <p className="mb-2">
            A <strong className="text-cyan-300">Dyson Sphere</strong> is a theoretical megastructure first proposed by physicist Freeman Dyson in 1960. It completely encompasses a star to capture its total radiant energy output (approximately 3.84 × 10<sup>26</sup> Watts for Sol).
          </p>
          <p>
            In this simulation, autonomous drone swarms utilize <strong className="text-cyan-300">Keplerian orbital mechanics</strong>, automated planetary strip-mining, and laser-welded photovoltaic geodesic lattice frames to transition humanity into a full <strong className="text-amber-300">Kardashev Type II Civilization</strong>.
          </p>
        </div>

        {/* Phase Breakdown Grid */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            5-Stage Architectural Phasing
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {CONSTRUCTION_PHASES.map((phase) => (
              <div
                key={phase.phase}
                className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-400/40 transition flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-cyan-200">{phase.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    Target: {(phase.targetCompletion * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">{phase.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {phase.structuresUnlocked.map((s, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/15 text-slate-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orbit Mechanics Lore */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 text-xs flex items-start gap-3">
          <Orbit className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-cyan-300 mb-1">Autonomous Swarm Keplerian Physics</div>
            <p className="text-slate-400 leading-relaxed">
              Every drone calculates live orbital velocity <em>v = √(G·M / r)</em> to maintain trajectory stabilization. Drones automatically cycle between mining ore on the outer planetary base, beaming high-energy lasers to construct geodesic struts, and recharging in high-density solar collection zones.
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold text-xs transition"
          >
            Acknowledge Protocols
          </button>
        </div>
      </div>
    </div>
  );
};
