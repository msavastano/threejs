import React from 'react';
import { X, MousePointer, Layers, Wind, Sparkles, Compass } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentGlowHex: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  accentGlowHex,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-950 rounded-2xl border border-amber-500/30 p-6 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: accentGlowHex }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold font-serif-luxury text-amber-200">
              Aurum Papilio • User Guide & Lore
            </h2>
            <p className="text-xs text-neutral-400 font-tech">
              Interactive 3D Horology Automaton Simulation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs text-neutral-300 font-tech">
          <div>
            <h3 className="text-amber-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              The Horological Masterpiece
            </h3>
            <p className="leading-relaxed text-neutral-400">
              Inspired by 19th-century Jaquet-Droz automata and contemporary haute horology,
              Aurum Papilio features articulated brass space-frame wings, laser-etched sapphire
              dichroic membranes, a central co-axial tourbillon escapement, and pneumatic micro-pistons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-start gap-2.5">
              <MousePointer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">3D Camera Navigation</span>
                <span className="text-neutral-400">Left-click & drag to orbit, right-click to pan, scroll wheel to zoom into micro-gears.</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-start gap-2.5">
              <Wind className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Interactive Flutter</span>
                <span className="text-neutral-400">Click anywhere on the butterfly body or hit 'Wind Gust' to trigger realistic aerodynamic turbulence.</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Exploded Architecture</span>
                <span className="text-neutral-400">Drag the 'Exploded View' slider to deconstruct the mechanical wings, thorax shell, gears, and aether core.</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Flight Simulation</span>
                <span className="text-neutral-400">Switch to 'Autonomous Flight' to watch the butterfly bank, climb, and glide gracefully through 3D space.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] font-mono-clean text-neutral-500">
            Rendered with Three.js WebGL & Post-Processing Bloom
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-tech transition-colors shadow-lg"
          >
            Enter Experience
          </button>
        </div>
      </div>
    </div>
  );
};
