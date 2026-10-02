import React from 'react';
import { X, ChevronRight, ChevronLeft, ShieldCheck, Cpu } from 'lucide-react';
import { BUTTERFLY_HOTSPOTS } from '../butterfly/hotspots';

interface HotspotDrawerProps {
  hotspotId: string | null;
  onClose: () => void;
  onSelectHotspot: (id: string | null) => void;
  accentGlowHex: string;
}

export const HotspotDrawer: React.FC<HotspotDrawerProps> = ({
  hotspotId,
  onClose,
  onSelectHotspot,
  accentGlowHex,
}) => {
  if (!hotspotId) return null;

  const currentIdx = BUTTERFLY_HOTSPOTS.findIndex((h) => h.id === hotspotId);
  if (currentIdx === -1) return null;

  const hotspot = BUTTERFLY_HOTSPOTS[currentIdx];

  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % BUTTERFLY_HOTSPOTS.length;
    onSelectHotspot(BUTTERFLY_HOTSPOTS[nextIdx].id);
  };

  const handlePrev = () => {
    const prevIdx = (currentIdx - 1 + BUTTERFLY_HOTSPOTS.length) % BUTTERFLY_HOTSPOTS.length;
    onSelectHotspot(BUTTERFLY_HOTSPOTS[prevIdx].id);
  };

  return (
    <div className="absolute top-20 right-4 sm:right-6 w-80 sm:w-96 bg-neutral-950/90 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-5 shadow-2xl z-30 pointer-events-auto transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 border-b border-neutral-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono-clean uppercase px-2 py-0.5 rounded font-bold text-black"
              style={{ backgroundColor: accentGlowHex }}
            >
              {hotspot.category}
            </span>
            <span className="text-[10px] font-mono-clean text-neutral-500">
              {currentIdx + 1} / {BUTTERFLY_HOTSPOTS.length}
            </span>
          </div>
          <h2 className="text-base font-bold font-serif-luxury text-amber-200">
            {hotspot.name}
          </h2>
          <p className="text-xs text-neutral-400 font-tech">{hotspot.subtitle}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-300 font-tech leading-relaxed mb-4">
        {hotspot.description}
      </p>

      {/* Horological Engineering Specifications */}
      <div className="space-y-1.5 mb-4 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/70">
        <div className="text-[11px] font-tech uppercase tracking-wider text-amber-400/90 font-semibold mb-1 flex items-center gap-1.5">
          <Cpu className="w-3 h-3" />
          Technical Specifications
        </div>
        {hotspot.specs.map((spec, i) => (
          <div key={i} className="flex justify-between items-center text-xs py-0.5">
            <span className="text-neutral-400 font-tech">{spec.label}</span>
            <span className="font-mono-clean text-neutral-200 text-[11px] font-medium">
              {spec.value}
            </span>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-tech p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-tech">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Atelier Certified</span>
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-tech p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
