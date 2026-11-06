/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for color gradients and diagram palette presets.
 */

// Helper to darken a hex color by a percentage (0 to 1)
export function darkenHex(hex: string, amount: number = 0.28): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) return hex;

  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Convert rgba(...) or rgb(...) or hex to darkened color
export function getDarkerShade(colorStr: string, amount: number = 0.28): string {
  if (!colorStr) return '#0f172a';
  if (colorStr.startsWith('#')) {
    return darkenHex(colorStr, amount);
  }

  // Handle rgb / rgba
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const r = Math.max(0, Math.floor(parseInt(rgbaMatch[1], 10) * (1 - amount)));
    const g = Math.max(0, Math.floor(parseInt(rgbaMatch[2], 10) * (1 - amount)));
    const b = Math.max(0, Math.floor(parseInt(rgbaMatch[3], 10) * (1 - amount)));
    const a = rgbaMatch[4] !== undefined ? rgbaMatch[4] : '1';
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return colorStr;
}

/**
 * Compute CSS background value respecting gradual darkening gradient
 */
export function getNodeBackgroundStyle(
  fillColor: string | undefined,
  gradientEnabled: boolean | undefined,
  fallback: string = 'rgba(30, 41, 59, 0.95)'
): { background: string } {
  const base = fillColor || fallback;
  if (!gradientEnabled) {
    return { background: base };
  }

  const darker = getDarkerShade(base, 0.32);
  return {
    background: `linear-gradient(180deg, ${base} 0%, ${darker} 100%)`,
  };
}

/**
 * Node Color Palettes: Vibrant Dark Themes & Soft Pastel Tones
 */
export interface ColorPaletteItem {
  id: string;
  name: string;
  fill: string;
  stroke: string;
  textColor: string;
  isPastel?: boolean;
}

export const VIBRANT_COLOR_PALETTES: ColorPaletteItem[] = [
  { id: 'slate', name: 'Midnight Slate', fill: 'rgba(15, 23, 42, 0.95)', stroke: '#0284c7', textColor: '#f8fafc' },
  { id: 'azure', name: 'Azure Blue', fill: 'rgba(30, 58, 138, 0.9)', stroke: '#3b82f6', textColor: '#ffffff' },
  { id: 'indigo', name: 'Royal Indigo', fill: 'rgba(49, 46, 129, 0.9)', stroke: '#6366f1', textColor: '#ffffff' },
  { id: 'purple', name: 'Electric Purple', fill: 'rgba(88, 28, 135, 0.9)', stroke: '#a855f7', textColor: '#ffffff' },
  { id: 'emerald', name: 'Emerald Forest', fill: 'rgba(6, 78, 59, 0.9)', stroke: '#10b981', textColor: '#ffffff' },
  { id: 'teal', name: 'Ocean Teal', fill: 'rgba(19, 78, 74, 0.9)', stroke: '#14b8a6', textColor: '#ffffff' },
  { id: 'amber', name: 'Amber Gold', fill: 'rgba(120, 53, 15, 0.9)', stroke: '#f59e0b', textColor: '#ffffff' },
  { id: 'orange', name: 'Solar Orange', fill: 'rgba(124, 45, 18, 0.9)', stroke: '#f97316', textColor: '#ffffff' },
  { id: 'rose', name: 'Crimson Rose', fill: 'rgba(136, 19, 55, 0.9)', stroke: '#f43f5e', textColor: '#ffffff' },
  { id: 'cyan', name: 'Deep Cyan', fill: 'rgba(14, 116, 144, 0.9)', stroke: '#06b6d4', textColor: '#ffffff' },
  { id: 'steel', name: 'Cobalt Steel', fill: 'rgba(30, 41, 59, 0.95)', stroke: '#64748b', textColor: '#f1f5f9' },
  { id: 'carbon', name: 'Obsidian Carbon', fill: 'rgba(9, 9, 11, 0.98)', stroke: '#71717a', textColor: '#fafafa' },
];

export const PASTEL_COLOR_PALETTES: ColorPaletteItem[] = [
  { id: 'p-mint', name: 'Pastel Mint', fill: '#e6f4ea', stroke: '#34a853', textColor: '#0f5132', isPastel: true },
  { id: 'p-sky', name: 'Pastel Sky', fill: '#e8f0fe', stroke: '#4285f4', textColor: '#084298', isPastel: true },
  { id: 'p-lavender', name: 'Pastel Lavender', fill: '#f3e8fd', stroke: '#a142f4', textColor: '#491279', isPastel: true },
  { id: 'p-peach', name: 'Pastel Peach', fill: '#fce8e6', stroke: '#ea4335', textColor: '#842029', isPastel: true },
  { id: 'p-lemon', name: 'Pastel Lemon', fill: '#fef7e0', stroke: '#fbbc04', textColor: '#664d03', isPastel: true },
  { id: 'p-rose', name: 'Pastel Rose', fill: '#fce4ec', stroke: '#f06292', textColor: '#880e4f', isPastel: true },
  { id: 'p-sage', name: 'Pastel Sage', fill: '#e2ece9', stroke: '#5b9279', textColor: '#1b4332', isPastel: true },
  { id: 'p-periwinkle', name: 'Pastel Periwinkle', fill: '#e1e7fe', stroke: '#6366f1', textColor: '#1e1b4b', isPastel: true },
  { id: 'p-lilac', name: 'Pastel Lilac', fill: '#ede9fe', stroke: '#8b5cf6', textColor: '#2e1065', isPastel: true },
  { id: 'p-apricot', name: 'Pastel Apricot', fill: '#ffedd5', stroke: '#f97316', textColor: '#7c2d12', isPastel: true },
  { id: 'p-seafoam', name: 'Pastel Seafoam', fill: '#ccfbf1', stroke: '#14b8a6', textColor: '#134e4a', isPastel: true },
  { id: 'p-warmcream', name: 'Pastel Cream', fill: '#fafaf9', stroke: '#a8a29e', textColor: '#292524', isPastel: true },
];
