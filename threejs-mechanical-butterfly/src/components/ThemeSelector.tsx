import React from 'react';
import { ButterflyThemeId } from '../butterfly/types';
import { BUTTERFLY_THEMES } from '../butterfly/themes';
import { Palette, Check } from 'lucide-react';

interface ThemeSelectorProps {
  currentThemeId: ButterflyThemeId;
  onSelectTheme: (id: ButterflyThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentThemeId,
  onSelectTheme,
}) => {
  return (
    <div className="bg-neutral-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-800 shadow-2xl">
      <div className="flex items-center gap-2 mb-2.5 text-xs font-tech font-bold tracking-wider text-neutral-300 uppercase">
        <Palette className="w-3.5 h-3.5 text-amber-400" />
        <span>Material & Finishes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {Object.values(BUTTERFLY_THEMES).map((theme) => {
          const isSelected = theme.id === currentThemeId;
          const primaryHex = '#' + theme.primaryMetal.toString(16).padStart(6, '0');
          const glowHex = '#' + theme.accentGlow.toString(16).padStart(6, '0');

          return (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`group relative text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-900 border-amber-500/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                  : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: primaryHex }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: glowHex, boxShadow: `0 0 6px ${glowHex}` }}
                  />
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </div>

              <div className="text-xs font-serif-luxury font-semibold text-neutral-200 line-clamp-1">
                {theme.name.split(' ')[0]} {theme.name.split(' ')[1]}
              </div>
              <div className="text-[10px] text-neutral-500 font-tech line-clamp-1">
                {theme.tagline}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
