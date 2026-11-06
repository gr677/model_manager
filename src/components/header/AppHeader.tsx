/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramDocument, DiagramPage, Collaborator, UserRole, AppTheme } from '../../types/diagram';
import {
  ChevronRight,
  Layers,
  Plus,
  History,
  Server,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Shield,
  Users,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Download,
  Github,
  Folder,
  HardDrive,
  Save,
  Check,
  Settings,
  Palette,
  ArrowLeft,
  Lock,
  FolderTree,
  Brain,
  MoreHorizontal,
  Wrench,
  Database,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { workspaceService } from '../../services/workspaceService';

interface AppHeaderProps {
  document: DiagramDocument;
  currentPage: DiagramPage;
  collaborators: Collaborator[];
  userRole: UserRole;
  isOnline: boolean;
  queuedCount: number;
  theme: AppTheme;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'unsaved';
  activeWorkspaceName?: string;
  activeDiagramFilename?: string;
  navigationHistory?: Array<{ filename: string; diagramName: string; pageId?: string; nodeLabel?: string }>;
  onNavigateBack?: () => void;
  onSwitchDiagram?: (filename: string) => void;
  onOpenWorkspaceModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImportSqlModal?: () => void;
  onOpenGenerateMindmapModal?: () => void;
  onManualSave: () => void;
  onSelectPage: (pageId: string) => void;
  onOpenNewPageModal: () => void;
  onOpenGallery: () => void;
  onOpenGitHubModal: () => void;
  onOpenVersionsModal: () => void;
  onOpenRestApiModal: () => void;
  onOpenOfflineModal: () => void;
  onChangeRole: (newRole: UserRole) => void;
  onToggleTheme: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  document,
  currentPage,
  collaborators,
  userRole,
  isOnline,
  queuedCount,
  theme,
  saveStatus = 'idle',
  activeWorkspaceName,
  activeDiagramFilename,
  navigationHistory = [],
  onNavigateBack,
  onOpenWorkspaceModal,
  onOpenSettingsModal,
  onOpenImportSqlModal,
  onOpenGenerateMindmapModal,
  onManualSave,
  onSelectPage,
  onOpenNewPageModal,
  onOpenGallery,
  onOpenGitHubModal,
  onOpenVersionsModal,
  onOpenRestApiModal,
  onOpenOfflineModal,
  onChangeRole,
  onToggleTheme,
  onSwitchDiagram,
}) => {
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isRoleSubmenuOpen, setIsRoleSubmenuOpen] = useState(false);
  const [isDiagramDropdownOpen, setIsDiagramDropdownOpen] = useState(false);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    editor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    reviewer: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    viewer: 'bg-slate-700/50 text-slate-300 border-slate-600',
  };

  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 select-none z-30 shrink-0 transition-colors duration-150 ${themeDef.headerClass}`}>
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        {/* App Logo: Brain Icon & Title */}
        <div className={`flex items-center gap-2.5 pr-3 border-r shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <img
            src="/assets/aistudio/brain_transparent.png"
            alt="MODEL MANAGER"
            className="w-9 h-9 object-contain drop-shadow-md hover:scale-105 transition-transform"
          />
          <div>
            <h1 className={`text-xs font-bold tracking-wide uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>MODEL MANAGER</h1>
            <p className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enterprise Architecture Suite</p>
          </div>
        </div>

        {/* Back to Parent Diagram Button (Shown when in a child diagram) */}
        {navigationHistory.length > 0 && onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 cursor-pointer transition-all shrink-0 animate-in fade-in"
            title={`Return to parent diagram: ${navigationHistory[navigationHistory.length - 1].diagramName || navigationHistory[navigationHistory.length - 1].filename}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {navigationHistory[navigationHistory.length - 1].nodeLabel ? `Node "${navigationHistory[navigationHistory.length - 1].nodeLabel}"` : 'Parent'}</span>
          </button>
        )}

        {/* Diagram Files Switcher Dropdown (Click to switch between root.json and child diagrams) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDiagramDropdownOpen(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              isDiagramDropdownOpen
                ? 'ring-2 ring-sky-500/40 border-sky-500 bg-sky-950/40'
                : isDark
                ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:border-sky-500/50 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title={`Active Diagram: ${activeDiagramFilename || 'root.json'}. Click to navigate to other diagram files in this workspace.`}
          >
            <FolderTree className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden md:inline">Diagram:</span>
            <span className="font-bold text-sky-400 max-w-[130px] truncate">{activeDiagramFilename || 'root.json'}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDiagramDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
          </button>

          {isDiagramDropdownOpen && (
            <div
              className={`absolute left-0 top-full mt-1.5 w-72 rounded-xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
              }`}
              onMouseLeave={() => setIsDiagramDropdownOpen(false)}
            >
              <div className={`px-2 py-1 text-[10px] font-mono uppercase border-b flex items-center justify-between mb-1 ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <span>Diagram Files in {activeWorkspaceName || 'Workspace'}</span>
                <span className="font-bold text-sky-400">{Object.keys(workspaceService.getActiveWorkspace().diagrams).length} files</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {Object.values(workspaceService.getActiveWorkspace().diagrams).map(diag => {
                  const isActive = diag.filename === (activeDiagramFilename || 'root.json');
                  const firstPage = diag.document?.pages?.[0];
                  return (
                    <button
                      key={diag.filename}
                      type="button"
                      onClick={() => {
                        onSwitchDiagram?.(diag.filename);
                        setIsDiagramDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/40'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <div className="truncate font-semibold flex items-center gap-1.5">
                          <span>{diag.name || diag.filename}</span>
                          {firstPage?.diagramType && (
                            <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
                              {firstPage.diagramType}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          data\{diag.filename}
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Gallery, Tools Menu, Settings & Theme */}
      <div className="flex items-center gap-2">
        {/* Dedicated ERD SQL Import Button (Visible when on an ERD diagram) */}
        {currentPage.diagramType === 'erd' && onOpenImportSqlModal && (
          <button
            onClick={onOpenImportSqlModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-sky-600/30 shrink-0 animate-in fade-in"
            title="Upload ERwin PostgreSQL SQL file (.sql) to populate tables & relationships"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Import SQL</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25">ERwin</span>
          </button>
        )}

        {/* Dedicated Mind Map Gemini AI Generator Button */}
        {currentPage.diagramType === 'mindmap' && onOpenGenerateMindmapModal && (
          <button
            onClick={onOpenGenerateMindmapModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-purple-600/30 shrink-0 animate-in fade-in"
            title="Generate Mind Map with Gemini AI from a topic prompt"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span>AI Mind Map</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25">Gemini</span>
          </button>
        )}

        {/* Diagram Types Catalog Launcher */}
        <button
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-blue-600/20 shrink-0"
          title="Open complete catalog of 19 standardized diagram types"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Diagram Types (19)</span>
        </button>

        {/* Consolidated Tools & Extensions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsToolsDropdownOpen(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs ${
              isToolsDropdownOpen
                ? 'bg-slate-800 border-blue-500 text-white'
                : isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Tools, Version History, GitHub, Offline Sync & RBAC"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Tools</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isToolsDropdownOpen && (
            <div
              className={`absolute right-0 mt-1.5 w-64 border rounded-xl shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
              onMouseLeave={() => {
                setIsToolsDropdownOpen(false);
                setIsRoleSubmenuOpen(false);
              }}
            >
              <div className={`px-2.5 py-1 text-[10px] uppercase font-mono border-b mb-1 flex items-center justify-between ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <span>Tools &amp; Integration</span>
                <span className="font-bold text-blue-400">OmniMind</span>
              </div>

              {/* Workspaces & Storage */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsDropdownOpen(false);
                  onOpenWorkspaceModal();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Workspaces &amp; Storage</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{activeWorkspaceName || 'workspace1'}</span>
              </button>

              {/* Version History */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsDropdownOpen(false);
                  onOpenVersionsModal();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  <span>Version Snapshots</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{document.versions.length} commits</span>
              </button>

              {/* REST API & JSON Data Explorer */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsDropdownOpen(false);
                  onOpenRestApiModal();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>REST API &amp; JSON Hub</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded">REST</span>
              </button>

              {/* Import SQL (ERwin / PostgreSQL) */}
              {onOpenImportSqlModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenImportSqlModal();
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>Import SQL (ERwin/Postgres)</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-sky-500/15 text-sky-400 rounded">SQL</span>
                </button>
              )}

              {/* Generate Mind Map with Gemini */}
              {onOpenGenerateMindmapModal && (currentPage.diagramType === 'mindmap' || currentPage.diagramType === 'generic') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenGenerateMindmapModal();
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Gemini Mind Map Generator</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-purple-500/15 text-purple-400 rounded">AI</span>
                </button>
              )}

              {/* GitHub Publish */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsDropdownOpen(false);
                  onOpenGitHubModal();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-slate-300" />
                  <span>GitHub Sync &amp; Push</span>
                </div>
                <span className="text-[9px] font-mono opacity-60">git</span>
              </button>

              {/* Offline Sync Status */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsDropdownOpen(false);
                  onOpenOfflineModal();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
                  <span>Offline Sync Status</span>
                </div>
                <span className={`text-[10px] font-mono ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </button>

              {/* RBAC Role Switcher submenu */}
              <div className={`pt-1 mt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                  <span>User Role (RBAC)</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold capitalize ${roleColors[userRole]}`}>{userRole}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 px-1 py-1">
                  {(['admin', 'editor', 'reviewer', 'viewer'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        onChangeRole(role);
                        setIsToolsDropdownOpen(false);
                      }}
                      className={`px-2 py-1 rounded text-left capitalize transition-colors text-[11px] cursor-pointer ${
                        userRole === role
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Studio Settings */}
        <button
          onClick={onOpenSettingsModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
          }`}
          title="Studio Settings & Themes"
        >
          <Settings className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Manual Save Diagram Button (Placed between Settings and Theme toggle) */}
        <button
          onClick={onManualSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-md shrink-0 ${
            saveStatus === 'unsaved'
              ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/40 shadow-amber-600/30 animate-pulse'
              : saveStatus === 'saved'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : saveStatus === 'saving'
              ? 'bg-blue-600 text-white opacity-80'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
          title={`Save active diagram '${activeDiagramFilename || 'root.json'}' (Ctrl+S)`}
        >
          {saveStatus === 'saved' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>
            {saveStatus === 'saved'
              ? 'Saved!'
              : saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'unsaved'
              ? 'Save Changes *'
              : 'Save'}
          </span>
          <kbd className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded bg-black/25 opacity-80">
            Ctrl+S
          </kbd>
        </button>

        {/* Quick Theme Switcher Button */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
          }`}
          title={`Active Theme: ${themeDef.name} (Click to toggle theme)`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>
    </header>
  );
};
