import React from 'react';
import { X, Check, Sparkles, Palette } from 'lucide-react';
import { BRAIN_ICONS, BrainIconStyle } from '../../data/brainIcons';
import { AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface BrainIconSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIconId: BrainIconStyle;
  onSelectIcon: (id: BrainIconStyle) => void;
  theme?: AppTheme;
}

export const BrainIconSelectorModal: React.FC<BrainIconSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedIconId,
  onSelectIcon,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
              {(() => {
                const current = BRAIN_ICONS.find(b => b.id === selectedIconId) || BRAIN_ICONS[0];
                return current.render({ className: 'w-6 h-6 text-white' });
              })()}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Select Brain Icon</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {BRAIN_ICONS.length} Styles Available
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Choose the brand icon for the top-left studio header and browser tab favicon.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 6 Brain Icon Cards */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BRAIN_ICONS.map((icon, idx) => {
            const isSelected = selectedIconId === icon.id;
            return (
              <div
                key={icon.id}
                onClick={() => onSelectIcon(icon.id)}
                className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.02] ${
                  isSelected
                    ? isDark
                      ? 'border-blue-500 bg-blue-950/30 shadow-xl shadow-blue-900/30 ring-2 ring-blue-500'
                      : 'border-blue-600 bg-blue-50/70 shadow-xl shadow-blue-500/10 ring-2 ring-blue-600'
                    : isDark
                    ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-850'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {/* Active Checkmark Pill */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-md animate-in zoom-in-75">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  {/* Icon Showcase Stage */}
                  <div className="flex items-center justify-center py-6 mb-3 rounded-xl bg-gradient-to-b from-transparent to-slate-500/5 border border-slate-500/10 group-hover:scale-105 transition-transform">
                    {/* Glowing circular backdrop */}
                    <div className="relative">
                      <div className="absolute -inset-3 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 border border-white/20">
                        {icon.render({ className: 'w-10 h-10 text-white' })}
                      </div>
                    </div>
                  </div>

                  {/* Icon Metadata */}
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-bold text-sky-400">
                      Option {idx + 1}
                    </div>
                    <h3 className="text-sm font-bold truncate">
                      {icon.name.replace(/^\d+\.\s*/, '')}
                    </h3>
                    <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {icon.subtitle}
                    </p>
                    <p className={`text-[11px] leading-relaxed pt-1 line-clamp-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {icon.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Tags & Apply Button */}
                <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {icon.tags.slice(0, 2).map((t, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onSelectIcon(icon.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300'
                        : 'bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-700'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Choose'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Clicking any icon immediately updates the header brand and browser tab favicon.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
