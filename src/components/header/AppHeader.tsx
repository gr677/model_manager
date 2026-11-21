/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  BarChart3,
  Hash,
  Calendar,
  FileText,
  CheckSquare,
  Square,
  Workflow,
  Trash2,
  FileJson,
  Upload,
  Fish,
  RotateCw,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { workspaceService } from '../../services/workspaceService';
import { AggregationGroup } from '../../utils/descriptionAggregation';

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
  onDeleteDiagramFile?: (filename: string) => void;
  onOpenWorkspaceModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImportSqlModal?: () => void;
  onOpenImportLegacyJsonModal?: () => void;
  onOpenGenerateMindmapModal?: () => void;
  onOpenGenerateFlowchartModal?: () => void;
  onOpenGenerateC4Modal?: () => void;
  onInsertFishboneTemplate?: () => void;
  onManualSave: () => void;
  onSelectPage: (pageId: string) => void;
  onOpenNewPageModal: () => void;
  onDeletePage?: (pageId: string) => void;
  onOpenGallery: () => void;
  onOpenGitHubModal: () => void;
  onOpenVersionsModal: () => void;
  onOpenRestApiModal: () => void;
  onOpenOfflineModal: () => void;
  onChangeRole: (newRole: UserRole) => void;
  onToggleTheme: () => void;
  aggregationGroups?: AggregationGroup[];
  selectedAggregationFields?: string[];
  isAggregationsOpen?: boolean;
  onToggleAggregations?: () => void;
  onToggleAggregationField?: (name: string) => void;
  onSelectAllAggregationType?: (type: AggregationGroup['type']) => void;
  onClearAggregationFields?: () => void;
  showValuesOnCanvas?: boolean;
  onToggleShowValuesOnCanvas?: () => void;
  onRecalculateAggregations?: () => Promise<void> | void;
  isRecalculatingAggregations?: boolean;
  hasEvaluatedAggregations?: boolean;
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
  onOpenImportLegacyJsonModal,
  onOpenGenerateMindmapModal,
  onOpenGenerateFlowchartModal,
  onOpenGenerateC4Modal,
  onInsertFishboneTemplate,
  onManualSave,
  onSelectPage,
  onOpenNewPageModal,
  onDeletePage,
  onOpenGallery,
  onOpenGitHubModal,
  onOpenVersionsModal,
  onOpenRestApiModal,
  onOpenOfflineModal,
  onChangeRole,
  onToggleTheme,
  onSwitchDiagram,
  onDeleteDiagramFile,
  aggregationGroups = [],
  selectedAggregationFields = [],
  isAggregationsOpen = false,
  onToggleAggregations,
  onToggleAggregationField,
  onSelectAllAggregationType,
  onClearAggregationFields,
  showValuesOnCanvas = true,
  onToggleShowValuesOnCanvas,
  onRecalculateAggregations,
  isRecalculatingAggregations = false,
  hasEvaluatedAggregations = true,
}) => {
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isRoleSubmenuOpen, setIsRoleSubmenuOpen] = useState(false);
  const [isDiagramDropdownOpen, setIsDiagramDropdownOpen] = useState(false);
  const [confirmDeleteDiagramFilename, setConfirmDeleteDiagramFilename] = useState<string | null>(null);
  const [isPagesDropdownOpen, setIsPagesDropdownOpen] = useState(false);
  const [confirmDeletePageId, setConfirmDeletePageId] = useState<string | null>(null);
  const [isAggregationsDropdownOpen, setIsAggregationsDropdownOpen] = useState(false);
  const diagramDropdownRef = useRef<HTMLDivElement>(null);
  const pagesDropdownRef = useRef<HTMLDivElement>(null);
  const aggregationsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDiagramDropdownOpen) {
      setConfirmDeleteDiagramFilename(null);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (diagramDropdownRef.current && !diagramDropdownRef.current.contains(e.target as Node)) {
        setIsDiagramDropdownOpen(false);
        setConfirmDeleteDiagramFilename(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isDiagramDropdownOpen]);

  useEffect(() => {
    if (!isPagesDropdownOpen) {
      setConfirmDeletePageId(null);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (pagesDropdownRef.current && !pagesDropdownRef.current.contains(e.target as Node)) {
        setIsPagesDropdownOpen(false);
        setConfirmDeletePageId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isPagesDropdownOpen]);

  useEffect(() => {
    if (!isAggregationsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (aggregationsDropdownRef.current && !aggregationsDropdownRef.current.contains(e.target as Node)) {
        setIsAggregationsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAggregationsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAggregationsDropdownOpen]);

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
            className="w-6 h-6 object-contain drop-shadow-md hover:scale-105 transition-transform"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 cursor-pointer transition-all shrink-0 max-w-[180px] animate-in fade-in"
            title={`Return to parent diagram: ${navigationHistory[navigationHistory.length - 1].diagramName || navigationHistory[navigationHistory.length - 1].filename}`}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Back to {navigationHistory[navigationHistory.length - 1].nodeLabel ? `Node "${navigationHistory[navigationHistory.length - 1].nodeLabel}"` : 'Parent'}</span>
          </button>
        )}

        {/* Diagram Files Switcher Dropdown (Click to switch or delete child diagram files) */}
        <div ref={diagramDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsPagesDropdownOpen(false);
              setIsDiagramDropdownOpen(v => !v);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              isDiagramDropdownOpen
                ? 'ring-2 ring-sky-500/40 border-sky-500 bg-sky-950/40'
                : isDark
                ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:border-sky-500/50 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title={`Active Diagram: ${activeDiagramFilename || 'root.json'}. Click to switch or delete child diagram files in this workspace.`}
          >
            <FolderTree className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden md:inline">Diagram:</span>
            <span className="font-bold text-sky-400 max-w-[120px] truncate">{activeDiagramFilename || 'root.json'}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDiagramDropdownOpen ? 'rotate-180 text-sky-400' : ''}`} />
          </button>

          {isDiagramDropdownOpen && (() => {
            const diagramList = Object.values(workspaceService.getActiveWorkspace().diagrams);
            return (
              <div
                className={`absolute left-0 top-full mt-1.5 w-80 rounded-xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                  isDark
                    ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                    : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
                }`}
              >
                <div className={`px-2 py-1 text-[10px] font-mono uppercase border-b flex items-center justify-between mb-1 ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                }`}>
                  <span className="truncate">Diagram Files in {activeWorkspaceName || 'Workspace'}</span>
                  <span className="font-bold text-sky-400 shrink-0 ml-2">{diagramList.length} file{diagramList.length === 1 ? '' : 's'}</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {diagramList.map(diag => {
                    const isActive = diag.filename === (activeDiagramFilename || 'root.json');
                    const isRoot = diag.filename === 'root.json';
                    const isConfirming = confirmDeleteDiagramFilename === diag.filename;
                    const canDeleteDiagram = !isRoot && diagramList.length > 1 && userRole !== 'viewer' && Boolean(onDeleteDiagramFile);
                    const firstPage = diag.document?.pages?.[0];
                    return (
                      <div
                        key={diag.filename}
                        onClick={() => {
                          if (!isConfirming) {
                            onSwitchDiagram?.(diag.filename);
                            setIsDiagramDropdownOpen(false);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/40'
                            : isDark
                            ? 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                            : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="truncate min-w-0 flex-1">
                          <div className="truncate font-semibold flex items-center gap-1.5">
                            <span className="truncate">{diag.name || diag.filename}</span>
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

                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-rose-400 font-bold">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteDiagramFile?.(diag.filename);
                                  setConfirmDeleteDiagramFilename(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold cursor-pointer"
                                title={`Confirm deleting diagram "${diag.filename}"`}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDiagramFilename(null)}
                                className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer ${
                                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              {isActive && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                              {!isRoot && onDeleteDiagramFile && (
                                <button
                                  type="button"
                                  disabled={!canDeleteDiagram}
                                  onClick={() => canDeleteDiagram && setConfirmDeleteDiagramFilename(diag.filename)}
                                  className={`p-1 rounded transition-colors ${
                                    canDeleteDiagram
                                      ? 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer'
                                      : 'opacity-35 text-slate-500 cursor-not-allowed'
                                  }`}
                                  title={
                                    canDeleteDiagram
                                      ? `Delete diagram file "${diag.filename}"`
                                      : 'Viewers cannot delete diagrams'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-1 pt-1 px-2 border-t text-[10px] ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
                }`}>
                  {diagramList.length > 1
                    ? 'Click the trash icon on any child diagram file to delete it (root.json is protected).'
                    : 'Only root.json exists in this workspace.'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Diagram Pages Switcher & Manager Dropdown (Switch, Add, Delete pages in current diagram) */}
        <div ref={pagesDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsDiagramDropdownOpen(false);
              setIsPagesDropdownOpen(v => !v);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              isPagesDropdownOpen
                ? 'ring-2 ring-indigo-500/40 border-indigo-500 bg-indigo-950/40'
                : isDark
                ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 hover:border-indigo-500/50 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title={`Active Page: ${currentPage.title} (${document.pages.length} page${document.pages.length === 1 ? '' : 's'}). Click to switch, add, or delete pages.`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden md:inline">Page:</span>
            <span className="font-bold text-indigo-400 max-w-[130px] truncate">{currentPage.title}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
              isDark
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-indigo-100 border-indigo-200 text-indigo-700'
            }`}>
              {document.pages.length}
            </span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isPagesDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
          </button>

          {isPagesDropdownOpen && (
            <div
              className={`absolute left-0 top-full mt-1.5 w-80 rounded-xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
              }`}
            >
              <div className={`px-2 py-1.5 text-[10px] font-mono uppercase border-b flex items-center justify-between mb-1 ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <span className="truncate">Pages ({document.pages.length})</span>
                {userRole !== 'viewer' && (
                  <div className="flex items-center gap-1">
                    {onOpenImportLegacyJsonModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPagesDropdownOpen(false);
                          onOpenImportLegacyJsonModal();
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/90 hover:bg-purple-500 text-white font-semibold normal-case text-[10px] cursor-pointer transition-colors"
                        title="Import a page from an earlier-version JSON file"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Import</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPagesDropdownOpen(false);
                        onOpenNewPageModal();
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold normal-case text-[10px] cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Page</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {document.pages.map((p, idx) => {
                  const isActive = p.id === currentPage.id;
                  const isConfirming = confirmDeletePageId === p.id;
                  const canDelete = document.pages.length > 1 && userRole !== 'viewer' && Boolean(onDeletePage);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (!isConfirming) {
                          onSelectPage(p.id);
                          setIsPagesDropdownOpen(false);
                        }
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                        isActive
                          ? isDark
                            ? 'bg-indigo-600/20 text-indigo-200 font-semibold border border-indigo-500/40'
                            : 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-300'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                          : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <div className="truncate font-semibold flex items-center gap-1.5">
                          <span className="text-[10px] font-mono opacity-50">{idx + 1}.</span>
                          <span className="truncate">{p.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                          <span className="uppercase px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[9px]">
                            {p.diagramType}
                          </span>
                          <span>{p.nodes.length} node{p.nodes.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-rose-400 font-bold">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePage?.(p.id);
                                setConfirmDeletePageId(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold cursor-pointer"
                              title={`Confirm deleting page "${p.title}"`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePageId(null)}
                              className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer ${
                                isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                              }`}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            {onDeletePage && (
                              <button
                                type="button"
                                disabled={!canDelete}
                                onClick={() => canDelete && setConfirmDeletePageId(p.id)}
                                className={`p-1 rounded transition-colors ${
                                  canDelete
                                    ? 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer'
                                    : 'opacity-35 text-slate-500 cursor-not-allowed'
                                }`}
                                title={
                                  canDelete
                                    ? `Delete page "${p.title}"`
                                    : userRole === 'viewer'
                                    ? 'Viewers cannot delete pages'
                                    : 'Cannot delete the only page in a diagram (add another page first)'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`mt-1 pt-1 px-2 border-t text-[10px] ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
              }`}>
                {document.pages.length > 1
                  ? 'Click the trash icon on any page to delete it.'
                  : 'At least 1 page is required. Add another page to enable page deletion.'}
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

        {/* Dedicated Flowchart Gemini AI Generator Button */}
        {currentPage.diagramType === 'flowchart' && onOpenGenerateFlowchartModal && (
          <button
            onClick={onOpenGenerateFlowchartModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/30 shrink-0 animate-in fade-in"
            title="Generate or expand a Flowchart with Gemini AI using ANSI/ISO symbols"
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-200" />
            <span>AI Flowchart</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25">Gemini</span>
          </button>
        )}

        {/* Dedicated C4 Architecture + Python Gemini AI Generator Button */}
        {currentPage.diagramType === 'c4' && onOpenGenerateC4Modal && (
          <button
            onClick={onOpenGenerateC4Modal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-sky-600/30 whitespace-nowrap shrink-0 animate-in fade-in"
            title="Design C4 layers (L1 Context -> L2 Container -> L3 Component) and generate runnable Python files with Gemini AI"
          >
            <Layers className="w-3.5 h-3.5 text-sky-100" />
            <span>AI C4 + Python</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25">Gemini</span>
          </button>
        )}

        {/* Dedicated Fishbone 6M Skeleton Builder Button */}
        {currentPage.diagramType === 'fishbone' && onInsertFishboneTemplate && userRole !== 'viewer' && (
          <button
            type="button"
            onClick={onInsertFishboneTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-rose-600/30 shrink-0 animate-in fade-in"
            title="Insert a complete 6M Ishikawa Fishbone skeleton (Tail, Spine, 6M Diagonal Ribs, Cause Twigs & Fish Head)"
          >
            <Fish className="w-3.5 h-3.5 text-rose-100" />
            <span>6M Fishbone</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/25">Ishikawa</span>
          </button>
        )}

        {/* Aggregations & Analytics Dropdown Button (Multi-select same-type fields, stays open until click-away) */}
        {(() => {
          const selectedLowerSet = new Set(selectedAggregationFields.map(f => f.toLowerCase()));
          const activeSelectedGroups = aggregationGroups.filter(g => selectedLowerSet.has(g.name.toLowerCase()));
          const activeSelectedType = activeSelectedGroups[0]?.type || null;

          return (
            <div ref={aggregationsDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAggregationsDropdownOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shrink-0 border ${
                  isAggregationsOpen
                    ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30 ring-2 ring-blue-500/40'
                    : isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-blue-500/50'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-blue-500/50'
                }`}
                title="Aggregations & Analytics: Search @text, @number, and @date in current page & child tree"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Aggregations</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {isRecalculatingAggregations
                    ? '...'
                    : !hasEvaluatedAggregations
                    ? 'On-demand'
                    : activeSelectedGroups.length > 0
                    ? `${activeSelectedGroups.length}/${aggregationGroups.length}`
                    : aggregationGroups.length}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isAggregationsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAggregationsDropdownOpen && (
                <div
                  className={`absolute right-0 mt-1.5 w-80 border rounded-xl shadow-2xl p-2 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                    isDark ? 'bg-slate-900/98 border-slate-700 text-slate-200' : 'bg-white/98 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className={`px-2 py-1 text-[10px] font-mono uppercase border-b mb-1 flex items-center justify-between ${
                    isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                  }`}>
                    <span>
                      {hasEvaluatedAggregations
                        ? `Aggregated Fields (${aggregationGroups.length})`
                        : 'Aggregations (On-Demand)'}
                    </span>
                    {activeSelectedType && hasEvaluatedAggregations ? (
                      <div className="flex items-center gap-1.5">
                        {onSelectAllAggregationType && (
                          <button
                            type="button"
                            onClick={() => onSelectAllAggregationType(activeSelectedType)}
                            className="text-[9px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                            title={`Select all @${activeSelectedType} fields`}
                          >
                            All @{activeSelectedType}
                          </button>
                        )}
                        {onClearAggregationFields && (
                          <>
                            <span className="text-slate-600">·</span>
                            <button
                              type="button"
                              onClick={onClearAggregationFields}
                              className="text-[9px] font-bold text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Clear selected fields"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-blue-400 font-bold">@type name</span>
                    )}
                  </div>

                  {!hasEvaluatedAggregations ? (
                    <div className="p-2.5 space-y-2.5">
                      <div className={`p-2 rounded-lg flex items-center justify-between gap-2 border ${
                        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer select-none min-w-0">
                          <input
                            type="checkbox"
                            checked={showValuesOnCanvas}
                            onChange={onToggleShowValuesOnCanvas}
                            className="w-3.5 h-3.5 rounded border-slate-600 text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                          />
                          <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Show badges on canvas nodes
                          </span>
                        </label>
                      </div>

                      <div className={`p-3 rounded-lg border text-center space-y-2 ${
                        isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className={`text-[11px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          Not evaluated yet
                        </p>
                        <p className="text-[10px] leading-relaxed text-slate-400">
                          Aggregations are evaluated only on demand so flipping workspaces stays fast.
                        </p>
                        {onRecalculateAggregations && (
                          <button
                            type="button"
                            disabled={isRecalculatingAggregations}
                            onClick={() => onRecalculateAggregations()}
                            className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait shadow-sm"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isRecalculatingAggregations ? 'animate-spin' : ''}`} />
                            <span>{isRecalculatingAggregations ? 'Evaluating...' : 'Evaluate Aggregations'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : aggregationGroups.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-300">No aggregation tags found</p>
                      <p className="text-[10px] leading-relaxed text-slate-400">
                        Add tags to node descriptions on their own line:
                      </p>
                      <div className="bg-slate-950/80 p-2 rounded text-[10px] font-mono text-left space-y-0.5 border border-slate-800">
                        <div className="text-sky-300">@text todo: wash car</div>
                        <div className="text-emerald-300">@number share: 345</div>
                        <div className="text-amber-300">@date due: 2027-10-25</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto py-1">
                      {/* Canvas Value Badges Tickbox & Recalculate Control */}
                      <div className={`p-2 rounded-lg mb-1.5 flex items-center justify-between gap-2 border ${
                        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer select-none min-w-0">
                          <input
                            type="checkbox"
                            checked={showValuesOnCanvas}
                            onChange={onToggleShowValuesOnCanvas}
                            className="w-3.5 h-3.5 rounded border-slate-600 text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                          />
                          <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Show badges on canvas nodes
                          </span>
                        </label>
                        {onRecalculateAggregations && (
                          <button
                            type="button"
                            disabled={isRecalculatingAggregations}
                            onClick={() => onRecalculateAggregations()}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-wait ${
                              isDark
                                ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}
                            title="Reload descendant diagrams, re-evaluate script expressions/live rates, and recalculate all aggregation totals"
                          >
                            <RotateCw className={`w-2.5 h-2.5 ${isRecalculatingAggregations ? 'animate-spin' : ''}`} />
                            <span>{isRecalculatingAggregations ? 'Updating...' : 'Recalculate'}</span>
                          </button>
                        )}
                      </div>

                      <div className="px-2 py-0.5 text-[9px] font-mono uppercase text-slate-400 flex items-center justify-between">
                        <span>
                          {activeSelectedType
                            ? `Multi-select @${activeSelectedType} fields:`
                            : 'Select fields (same @type):'}
                        </span>
                        {activeSelectedGroups.length > 0 && (
                          <span className="text-blue-400 font-bold">
                            {activeSelectedGroups.length} selected
                          </span>
                        )}
                      </div>
                      {aggregationGroups.map(group => {
                        const isSelected = selectedLowerSet.has(group.name.toLowerCase());
                        const isDifferentType = Boolean(activeSelectedType && activeSelectedType !== group.type);
                        return (
                          <button
                            key={group.name}
                            type="button"
                            onClick={() => onToggleAggregationField?.(group.name)}
                            title={
                              isDifferentType
                                ? `Different type from @${activeSelectedType} — click to switch selection to @${group.type}`
                                : isSelected
                                ? `Uncheck ${group.displayName}`
                                : `Check ${group.displayName} (multi-select with other @${group.type} fields)`
                            }
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer group ${
                              isSelected
                                ? 'bg-blue-600/25 border border-blue-500/50 text-blue-300 font-bold'
                                : isDifferentType
                                ? isDark
                                  ? 'hover:bg-slate-800/80 text-slate-400 opacity-65 hover:opacity-100 border border-transparent'
                                  : 'hover:bg-slate-100 text-slate-500 opacity-70 hover:opacity-100 border border-transparent'
                                : isDark
                                ? 'hover:bg-slate-800 text-slate-200 border border-transparent'
                                : 'hover:bg-slate-100 text-slate-800 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              )}
                              {group.type === 'number' ? (
                                <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : group.type === 'date' ? (
                                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="font-semibold">{group.displayName}</span>
                                {group.type === 'number' && group.total !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                    (sum: {group.total.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isDifferentType && (
                                <span className="hidden group-hover:inline text-[8px] font-mono text-amber-400">
                                  switch
                                </span>
                              )}
                              <span className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded font-bold ${
                                group.type === 'number'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : group.type === 'date'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              }`}>
                                @{group.type}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {group.items.length}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={`pt-1.5 mt-1 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleAggregations?.();
                        setIsAggregationsDropdownOpen(false);
                      }}
                      className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-center text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      {isAggregationsOpen
                        ? 'Close Right Side Panel'
                        : activeSelectedGroups.length > 0
                        ? `Open Aggregations Panel (${activeSelectedGroups.length} selected) →`
                        : 'Open Aggregations Panel →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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

              {/* Import Earlier Version JSON Page */}
              {onOpenImportLegacyJsonModal && userRole !== 'viewer' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenImportLegacyJsonModal();
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5 text-purple-400" />
                    <span>Import Legacy JSON Page</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-purple-500/15 text-purple-400 rounded">JSON</span>
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

              {/* Generate Flowchart with Gemini */}
              {onOpenGenerateFlowchartModal && (currentPage.diagramType === 'flowchart' || currentPage.diagramType === 'generic') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    onOpenGenerateFlowchartModal();
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Workflow className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gemini Flowchart Generator</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 rounded">AI</span>
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
