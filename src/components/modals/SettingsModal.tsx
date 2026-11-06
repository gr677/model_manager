/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppTheme, StudioSettings, DiagramDocument } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import { workspaceService } from '../../services/workspaceService';
import {
  Settings,
  X,
  Palette,
  HardDrive,
  Grid,
  Sliders,
  Keyboard,
  Check,
  Save,
  Download,
  FolderOpen,
  Info,
  Layers,
  Sparkles,
  MousePointer,
  HelpCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onUpdateSettings: (newSettings: StudioSettings) => void;
  document: DiagramDocument;
  activeWorkspacePath: string;
  onManualSave: () => void;
  onOpenWorkspaceModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  document,
  activeWorkspacePath,
  onManualSave,
  onOpenWorkspaceModal,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'saving' | 'canvas' | 'shortcuts'>('themes');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [rootDirInput, setRootDirInput] = useState(() => settings.rootDir || 'C:\\omnimind');
  const [rootDirSavedMsg, setRootDirSavedMsg] = useState(false);

  if (!isOpen) return null;

  const currentThemeDef = THEMES[settings.theme] || THEMES.dark;

  const handleSelectTheme = (themeId: AppTheme) => {
    onUpdateSettings({ ...settings, theme: themeId });
  };

  const handleTriggerSave = () => {
    onManualSave();
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleSaveRootDir = async () => {
    const trimmed = (rootDirInput || 'C:\\omnimind').trim();
    onUpdateSettings({ ...settings, rootDir: trimmed });
    await workspaceService.updateServerRootDir(trimmed);
    setRootDirSavedMsg(true);
    setTimeout(() => setRootDirSavedMsg(false), 2500);
  };

  const handleDownloadJson = () => {
    workspaceService.downloadDiagramJson();
  };

  const handleExportSvg = () => {
    const svgElem = window.document.getElementById('canvas-background');
    if (!svgElem) {
      alert('Unable to capture canvas SVG.');
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_diagram.svg`;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col border overflow-hidden ${
          currentThemeDef.isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                Studio Settings &amp; Preferences
              </h2>
              <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Customize themes, canvas grid, saving workflows, and editor behavior
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              currentThemeDef.isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center gap-1 px-6 border-b shrink-0 overflow-x-auto ${
            currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/60'
          }`}
        >
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'themes'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            Themes &amp; Visual Styles
          </button>

          <button
            onClick={() => setActiveTab('saving')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'saving'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Saving &amp; File Storage
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'canvas'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            Canvas &amp; Grid
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: THEMES */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Color Themes</h3>
                  <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose from 11 visual themes including high-contrast dark modes, clean light styles, and soft pastel shades (Mint, Rose, Lavender, Peach, Sky).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  Active: {currentThemeDef.name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(Object.keys(THEMES) as AppTheme[]).map(themeKey => {
                  const t = THEMES[themeKey];
                  const isSelected = settings.theme === themeKey;
                  return (
                    <div
                      key={themeKey}
                      onClick={() => handleSelectTheme(themeKey)}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left group ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                          : currentThemeDef.isDark
                          ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {/* Swatch Preview Bar */}
                      <div className="h-14 rounded-lg overflow-hidden border border-black/20 flex shadow-inner">
                        {/* Sidebar Swatch */}
                        <div
                          className="w-1/3 flex items-center justify-center p-1"
                          style={{ backgroundColor: t.preview.sidebarBg }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.preview.accent }}
                          />
                        </div>
                        {/* Canvas Swatch */}
                        <div
                          className="flex-1 flex flex-col items-center justify-center p-2 relative"
                          style={{ backgroundColor: t.preview.canvasBg }}
                        >
                          <div
                            className="px-2 py-0.5 rounded text-[10px] font-bold shadow-xs truncate max-w-[90%]"
                            style={{
                              backgroundColor: t.preview.accent,
                              color: t.id === 'monochrome' ? '#000000' : '#ffffff',
                            }}
                          >
                            Shape
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                            {t.name}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/20 text-slate-400">
                            {t.badge}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {t.description}
                        </p>
                      </div>

                      {/* Selection Indicator */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/30 text-xs">
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-blue-400' : 'opacity-60'}`}>
                          {isSelected ? '✓ Currently Applied' : 'Click to Apply'}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SAVING & FILE STORAGE */}
          {activeTab === 'saving' && (
            <div className="space-y-6">
              {/* How diagrams are saved explanation card */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>How Diagram Saving Works in Model Manager</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-lg bg-black/25 border border-emerald-500/20 space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      1. Automatic Server Disk Save
                    </span>
                    <p className="text-slate-300">
                      Changes are sent directly to the server and written to real disk files (<code className="text-sky-300 font-mono text-[10px]">root.json</code> and child JSONs).
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/25 border border-emerald-500/20 space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      2. Workspace File System
                    </span>
                    <p className="text-slate-300">
                      Diagrams are mapped directly to your workspace structure:
                      <code className="block mt-1 font-mono text-[10px] text-sky-300 bg-black/40 px-1 py-0.5 rounded truncate">
                        {activeWorkspacePath}
                      </code>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/25 border border-emerald-500/20 space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      3. Direct Disk Download
                    </span>
                    <p className="text-slate-300">
                      Download the raw JSON file anytime to your computer or export standard SVG vector graphics for reports and presentations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Root Directory Setting Card */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-sm">Root Directory Configuration</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Workspace Entrypoint: root.json
                  </span>
                </div>

                <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Configure the root filesystem path for all workspaces and diagrams. The browser sends and receives JSON diagrams directly to the server, and every workspace starts with a <strong className="text-sky-400 font-mono">root.json</strong> file as its designated starting point.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rootDirInput}
                    onChange={e => setRootDirInput(e.target.value)}
                    placeholder="e.g. C:\omnimind or c:/omnimind"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      currentThemeDef.isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveRootDir}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    {rootDirSavedMsg ? '✓ Root Directory Saved' : 'Save Root Directory'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400 border-t border-slate-800/40">
                  <span>Workspace Starting Point Example:</span>
                  <span className="text-sky-400 font-semibold truncate max-w-[65%]">
                    {(rootDirInput || 'C:\\omnimind').replace(/[\/\\]+$/, '')}\workspace1\data\root.json
                  </span>
                </div>
              </div>

              {/* Direct Save & Download Actions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  Active Diagram Storage Controls
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Save to Workspace Button */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Save to Workspace</span>
                        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/30 border border-slate-700 text-slate-300">
                          Ctrl + S
                        </kbd>
                      </div>
                      <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Commit current diagram state immediately to:
                        <code className="block mt-0.5 font-mono text-[11px] text-sky-400 truncate">
                          {activeWorkspacePath}
                        </code>
                      </p>
                    </div>

                    <button
                      onClick={handleTriggerSave}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      {saveSuccessMsg ? '✓ Diagram Saved Successfully!' : 'Save Diagram Now'}
                    </button>
                  </div>

                  {/* Download JSON to Disk */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Download JSON File</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          Local Disk
                        </span>
                      </div>
                      <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Download the active diagram as a standalone JSON file to your computer's Downloads directory.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadJson}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download JSON (.json)
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Options & Workspace Manager Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/30">
                <div>
                  <h4 className="font-semibold text-xs">Advanced Storage &amp; Workspaces</h4>
                  <p className="text-xs text-slate-400">
                    Switch between workspaces, create new diagram files, or export vector graphics.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportSvg}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    Export SVG
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenWorkspaceModal();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open Workspace Manager
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CANVAS & GRID */}
          {activeTab === 'canvas' && (
            <div className="space-y-5">
              {/* Grid Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Canvas Grid Pattern
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['dots', 'lines', 'crosshairs', 'none'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => onUpdateSettings({ ...settings, gridStyle: style })}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize cursor-pointer transition-all ${
                        settings.gridStyle === style
                          ? 'border-blue-500 bg-blue-600/20 text-blue-300 ring-2 ring-blue-500/30'
                          : currentThemeDef.isDark
                          ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Spacing */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Grid Cell Size
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[24, 48, 64].map(size => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ ...settings, gridSize: size })}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                        settings.gridSize === size
                          ? 'border-blue-500 bg-blue-600/20 text-blue-300 ring-2 ring-blue-500/30'
                          : currentThemeDef.isDark
                          ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {size}px Spacing {size === 48 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {/* Snap to Grid */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-slate-800">
                  <div>
                    <span className="font-semibold text-xs block">Snap Nodes to Grid</span>
                    <span className="text-[11px] text-slate-400">
                      Automatically aligns dragged nodes to the nearest grid coordinates
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.snapToGrid}
                    onChange={e => onUpdateSettings({ ...settings, snapToGrid: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Hover Descriptions */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-slate-800">
                  <div>
                    <span className="font-semibold text-xs block">Show Hover Description Tooltips</span>
                    <span className="text-[11px] text-slate-400">
                      Displays documentation summaries and metadata tooltips when hovering over nodes
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showHoverTooltips}
                    onChange={e => onUpdateSettings({ ...settings, showHoverTooltips: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Collaborator Presence */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-slate-800">
                  <div>
                    <span className="font-semibold text-xs block">Show Real-Time Collaborator Cursors</span>
                    <span className="text-[11px] text-slate-400">
                      Display other team members' live mouse positions and activity tags on canvas
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showCollaborators}
                    onChange={e => onUpdateSettings({ ...settings, showCollaborators: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Productivity Keyboard Shortcuts</h3>
              <p className={`text-xs ${currentThemeDef.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Streamline your architectural drafting speed with keyboard shortcuts.
              </p>

              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 text-xs">
                {[
                  { shortcut: 'Ctrl + S / Cmd + S', desc: 'Save active diagram to workspace & local storage' },
                  { shortcut: 'Delete / Backspace', desc: 'Delete currently selected node or line connection' },
                  { shortcut: 'Right-Click on Shape', desc: 'Open Context Menu (Duplicate, Delete, Edit Schema, Color Picker)' },
                  { shortcut: 'Right-Click on Canvas', desc: 'Canvas Quick Actions (Add Page, Reset View, Toggle Grid)' },
                  { shortcut: 'Double-Click Shape', desc: 'Instant inline node label renaming' },
                  { shortcut: 'Space + Drag / Wheel', desc: 'Pan across infinite canvas or zoom in/out' },
                  { shortcut: 'Drag Corner Handles', desc: 'Resize node freely from any of 8 handles' },
                  { shortcut: 'Drag White Anchor Dots', desc: 'Draw connector lines between nodes' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 ${
                      idx % 2 === 0 ? 'bg-black/10' : 'bg-transparent'
                    }`}
                  >
                    <span className="text-slate-300">{item.desc}</span>
                    <kbd className="px-2 py-1 rounded font-mono text-[11px] bg-slate-800 text-sky-300 border border-slate-700 shadow-xs">
                      {item.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-t shrink-0 ${
            currentThemeDef.isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Preferences saved locally to browser session</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
