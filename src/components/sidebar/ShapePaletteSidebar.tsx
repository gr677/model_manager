/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SHAPE_TEMPLATES } from '../../data/shapeDefinitions';
import { DiagramType, UserRole, AppTheme } from '../../types/diagram';
import {
  Search,
  Table,
  Cpu,
  Layers,
  Component,
  Database,
  SquareStack,
  FileCheck2,
  ListOrdered,
  Network,
  StickyNote,
  BoxSelect,
  Grid,
  ChevronDown,
  Sparkles,
  ArrowDownUp,
  Users,
  CircleDot,
  CalendarCheck,
  TrendingUp,
  GitBranch,
  BookOpen,
  Archive,
  Lock,
  Circle,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { WorkspaceDropdown } from './WorkspaceDropdown';
import { DiagramDocument } from '../../types/diagram';
import { workspaceService } from '../../services/workspaceService';
import { ArrowLeft, FolderTree, FileCode, Check, Upload } from 'lucide-react';

interface ShapePaletteSidebarProps {
  currentDiagramType: DiagramType;
  userRole: UserRole;
  selectedCategory: string;
  theme?: AppTheme;
  activeDiagramFilename?: string;
  navigationHistory?: Array<{ filename: string; diagramName: string; pageId?: string; nodeLabel?: string }>;
  onNavigateBack?: () => void;
  onSwitchDiagram?: (filename: string) => void;
  onSelectCategory: (cat: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onOpenGallery: () => void;
  onOpenImportSqlModal?: () => void;
  onLoadDiagram?: (doc: DiagramDocument) => void;
}

export const ShapePaletteSidebar: React.FC<ShapePaletteSidebarProps> = ({
  currentDiagramType,
  userRole,
  selectedCategory,
  theme = 'dark',
  activeDiagramFilename,
  navigationHistory = [],
  onNavigateBack,
  onSwitchDiagram,
  onSelectCategory,
  onSelectTemplate,
  onOpenGallery,
  onOpenImportSqlModal,
  onLoadDiagram,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiagramsListExpanded, setIsDiagramsListExpanded] = useState(false);

  const categories = [
    { id: 'all', label: 'All Diagram Shapes' },
    { id: 'generic', label: '★ Universal Freeform (No Rules - All Shapes)' },
    { id: 'bpmn', label: 'BPMN 2.0 Process' },
    { id: 'erd', label: 'ERD Database' },
    { id: 'swimlane', label: 'Swimlanes & Pools' },
    { id: 'uml', label: 'UML Class Diagrams' },
    { id: 'uml-sequence', label: 'UML Sequence' },
    { id: 'uml-usecase', label: 'UML Use Case' },
    { id: 'uml-state', label: 'UML State Machine' },
    { id: 'dfd', label: 'DFD & Yourdon' },
    { id: 'idef0', label: 'IDEF0 (ICOM)' },
    { id: 'ceqa', label: 'CEQA Environmental' },
    { id: 'sipoc', label: 'SIPOC Matrix' },
    { id: 'pert', label: 'PERT Network' },
    { id: 'gantt', label: 'Gantt Timelines' },
    { id: 'flowchart', label: 'Standard Flowcharts' },
    { id: 'c4', label: 'C4 Architecture' },
    { id: 'mindmap', label: 'Mind Mapping' },
    { id: 'vsm', label: 'Value Stream (VSM)' },
    { id: 'fishbone', label: 'Fishbone (Ishikawa)' },
    { id: 'notes', label: 'Sticky Notes' },
    { id: 'containers', label: 'Containers & Groups' },
  ];

  const filteredTemplates = SHAPE_TEMPLATES.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      selectedCategory === 'generic' ||
      item.category === selectedCategory ||
      (selectedCategory === 'pert' && (item.category === 'pert' || item.category === 'gantt')) ||
      (selectedCategory === 'uml' && item.category.startsWith('uml')) ||
      (selectedCategory === 'dfd' && (item.category === 'dfd' || item.category === 'yourdon'));

    return matchesSearch && matchesCategory;
  });

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Table': return <Table className="w-4 h-4 text-sky-400" />;
      case 'CirclePlay':
      case 'SquareCheck':
      case 'GitFork': return <Cpu className="w-4 h-4 text-blue-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-purple-400" />;
      case 'Component': return <Component className="w-4 h-4 text-cyan-400" />;
      case 'ArrowDownUp': return <ArrowDownUp className="w-4 h-4 text-teal-400" />;
      case 'Users': return <Users className="w-4 h-4 text-blue-400" />;
      case 'CircleDot': return <CircleDot className="w-4 h-4 text-violet-400" />;
      case 'Database': return <Database className="w-4 h-4 text-amber-400" />;
      case 'SquareStack': return <SquareStack className="w-4 h-4 text-blue-400" />;
      case 'FileCheck2': return <FileCheck2 className="w-4 h-4 text-emerald-400" />;
      case 'ListOrdered': return <ListOrdered className="w-4 h-4 text-yellow-400" />;
      case 'Network': return <Network className="w-4 h-4 text-rose-400" />;
      case 'CalendarCheck': return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case 'StickyNote': return <StickyNote className="w-4 h-4 text-amber-300" />;
      case 'BoxSelect':
      case 'Columns3': return <BoxSelect className="w-4 h-4 text-indigo-400" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case 'GitBranch': return <GitBranch className="w-4 h-4 text-rose-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'Circle': return <Circle className="w-4 h-4 text-fuchsia-400" />;
      case 'Archive': return <Archive className="w-4 h-4 text-cyan-400" />;
      default: return <Grid className="w-4 h-4 text-slate-400" />;
    }
  };

  const isReadOnly = userRole === 'viewer';
  const themeDef = THEMES[theme || 'dark'] || THEMES.dark;

  return (
    <div className={`w-64 h-full border-r flex flex-col shrink-0 select-none transition-colors duration-150 ${themeDef.sidebarClass}`}>
      {/* Sidebar Header with Workspace Dropdown & Shape Library */}
      <div className={`p-3 border-b space-y-2.5 ${themeDef.borderClass}`}>
        {/* Workspace Dropdown directly above Shape Library */}
        {onLoadDiagram && (
          <WorkspaceDropdown onLoadDiagram={onLoadDiagram} theme={theme} />
        )}

        {/* Back to Parent Diagram Button when in a Child Diagram */}
        {navigationHistory.length > 0 && onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 cursor-pointer transition-all animate-in fade-in"
            title={`Return to parent diagram (${navigationHistory[navigationHistory.length - 1].diagramName || 'root.json'})`}
          >
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Back to {navigationHistory[navigationHistory.length - 1].nodeLabel ? `Node "${navigationHistory[navigationHistory.length - 1].nodeLabel}"` : 'Parent'}</span>
            </div>
            <span className="text-[10px] font-mono opacity-80 shrink-0">Parent ➔</span>
          </button>
        )}

        {/* Workspace Diagrams Files Switcher Accordion */}
        {(() => {
          const ws = workspaceService.getActiveWorkspace();
          const diagramList = Object.values(ws.diagrams);
          if (diagramList.length <= 1 && !isDiagramsListExpanded) return null;
          return (
            <div className={`rounded-xl border p-2 text-xs space-y-1.5 ${themeDef.isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsDiagramsListExpanded(v => !v)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-sky-400 cursor-pointer"
                title="Click to view and switch between diagram files in this workspace"
              >
                <div className="flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                  <span>Workspace Diagrams ({diagramList.length})</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDiagramsListExpanded ? 'rotate-180 text-sky-400' : ''}`} />
              </button>
              {isDiagramsListExpanded && (
                <div className="space-y-1 max-h-40 overflow-y-auto pt-1 border-t border-slate-800/60">
                  {diagramList.map(diag => {
                    const isCurrent = diag.filename === (activeDiagramFilename || ws.activeDiagramFilename || 'root.json');
                    const firstType = diag.document?.pages?.[0]?.diagramType;
                    return (
                      <button
                        key={diag.filename}
                        type="button"
                        onClick={() => onSwitchDiagram?.(diag.filename)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 transition-colors cursor-pointer text-xs ${
                          isCurrent
                            ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/40'
                            : themeDef.isDark
                            ? 'hover:bg-slate-800 text-slate-300'
                            : 'hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="truncate min-w-0 flex items-center gap-1.5">
                          <FileCode className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{diag.name || diag.filename}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {firstType && (
                            <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">
                              {firstType}
                            </span>
                          )}
                          {isCurrent && <Check className="w-3 h-3 text-sky-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Locked Active Diagram Type Banner */}
        <div
          className={`px-2 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
            themeDef.isDark
              ? 'bg-slate-950/70 border-slate-800 text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
          title="The active diagram format was set when this diagram was created and is locked to maintain model integrity. You can add elements from any other diagram type below."
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">
              Format: <strong className="text-blue-400 font-mono uppercase">{currentDiagramType}</strong>
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            Locked
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search shapes across all types..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full rounded-md pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 border ${
              themeDef.isDark
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Diagram Category Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-[10px] uppercase font-mono ${themeDef.textMutedClass}`}>
              Filter Shapes
            </label>
            <span className="text-[9px] text-blue-400 font-medium">Mix any type</span>
          </div>
          <select
            value={selectedCategory}
            onChange={e => onSelectCategory(e.target.value)}
            className={`w-full rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-medium border ${
              themeDef.isDark
                ? 'bg-slate-950 border-slate-800 text-slate-100'
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shapes list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* ERD SQL Import Card (When on an ERD diagram or ERD filter) */}
        {(currentDiagramType === 'erd' || selectedCategory === 'erd') && onOpenImportSqlModal && (
          <div
            className={`p-2.5 rounded-xl border mb-1.5 transition-all shadow-xs ${
              themeDef.isDark
                ? 'bg-sky-950/40 border-sky-500/30 text-sky-200'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-sky-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                ERwin SQL Import
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold">
                PostgreSQL
              </span>
            </div>
            <p className="text-[10px] leading-relaxed opacity-75 mb-2">
              Upload ERwin PostgreSQL DDL (.sql) to automatically populate entity tables &amp; foreign keys.
            </p>
            <button
              type="button"
              onClick={onOpenImportSqlModal}
              className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-sky-600/30"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import SQL File</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
          <span>{filteredTemplates.length} SHAPES AVAILABLE</span>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => onSelectCategory('all')}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No shapes found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              draggable={!isReadOnly}
              onDragStart={e => {
                e.dataTransfer.setData('application/x-shape-template', template.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                if (!isReadOnly) onSelectTemplate(template.id);
              }}
              className={`group flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                isReadOnly
                  ? 'opacity-50 cursor-not-allowed'
                  : themeDef.isDark
                  ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className={`p-2 rounded border shrink-0 ${themeDef.isDark ? 'bg-slate-900 border-slate-800 group-hover:border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                {getTemplateIcon(template.iconName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-semibold truncate group-hover:text-blue-400 ${themeDef.textPrimaryClass}`}>
                  {template.name}
                </div>
                <div className={`text-[10px] line-clamp-1 ${themeDef.textMutedClass}`}>
                  {template.description}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[9px] font-mono opacity-60 uppercase">
                  <span>{template.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Sticky Note Quick Action */}
      <div className={`p-2.5 border-t ${themeDef.borderClass} ${themeDef.isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
        <button
          disabled={isReadOnly}
          onClick={() => onSelectTemplate('sticky-note')}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>+ Add Sticky Note</span>
        </button>
      </div>
    </div>
  );
};
