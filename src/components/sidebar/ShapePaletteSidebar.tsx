/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SHAPE_TEMPLATES } from '../../data/shapeDefinitions';
import { DiagramType, UserRole, AppTheme, getNodeChildDiagrams } from '../../types/diagram';
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
  ChevronRight,
  ChevronsUpDown,
  CornerDownRight,
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
  ArrowLeft,
  ArrowRight,
  FolderTree,
  FileCode,
  Check,
  Upload,
  ImageIcon,
  FolderOpen,
  X,
  Square,
  Diamond,
  FileText,
  Files,
  Hexagon,
  Clock,
  GitMerge,
  CornerRightDown,
  Keyboard,
  CircleStop,
  HelpCircle,
  Columns3,
  UserCheck,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { WorkspaceDropdown } from './WorkspaceDropdown';
import { DiagramDocument } from '../../types/diagram';
import { workspaceService } from '../../services/workspaceService';

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
  onLoadDiagram?: (doc: DiagramDocument, filename?: string, workspaceId?: string) => void;
  onAddImageFile?: (file: File) => void;
  onAddExistingImage?: (img: { filename: string; url: string; size: number }) => void;
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
  onAddImageFile,
  onAddExistingImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiagramsListExpanded, setIsDiagramsListExpanded] = useState(false);
  const [collapsedDiagramNodes, setCollapsedDiagramNodes] = useState<Set<string>>(new Set());
  const [showImagesDrawer, setShowImagesDrawer] = useState(false);
  const [workspaceImagesList, setWorkspaceImagesList] = useState<Array<{ filename: string; url: string; size: number }>>([]);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const toggleDiagramNodeCollapse = (filename: string) => {
    setCollapsedDiagramNodes(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const categories = [
    { id: 'generic', label: '★ Universal Freeform (No Rules - All Shapes)' },
    { id: 'bpmn', label: 'BPMN 2.0 Process' },
    { id: 'c4', label: 'C4 Architecture' },
    { id: 'ceqa', label: 'CEQA Environmental' },
    { id: 'containers', label: 'Containers & Groups' },
    { id: 'dfd', label: 'DFD & Yourdon' },
    { id: 'erd', label: 'ERD Database' },
    { id: 'fishbone', label: 'Fishbone (Ishikawa)' },
    { id: 'flowchart', label: 'Flowchart (Standard ANSI/ISO)' },
    { id: 'gantt', label: 'Gantt Timelines' },
    { id: 'idef0', label: 'IDEF0 (ICOM)' },
    { id: 'mindmap', label: 'Mind Mapping' },
    { id: 'pert', label: 'PERT Network' },
    { id: 'sipoc', label: 'SIPOC Matrix' },
    { id: 'notes', label: 'Sticky Notes' },
    { id: 'swimlane', label: 'Swimlanes & Pools' },
    { id: 'uml', label: 'UML Class Diagrams' },
    { id: 'uml-sequence', label: 'UML Sequence' },
    { id: 'uml-state', label: 'UML State Machine' },
    { id: 'uml-usecase', label: 'UML Use Case' },
    { id: 'vsm', label: 'Value Stream (VSM)' },
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
      case 'CircleStop': return <CircleStop className="w-4 h-4 text-rose-400" />;
      case 'Square': return <Square className="w-4 h-4 text-blue-400" />;
      case 'Diamond': return <Diamond className="w-4 h-4 text-amber-400" />;
      case 'HelpCircle': return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'ArrowRight': return <ArrowRight className="w-4 h-4 text-sky-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-slate-300" />;
      case 'Files': return <Files className="w-4 h-4 text-slate-300" />;
      case 'CornerRightDown': return <CornerRightDown className="w-4 h-4 text-indigo-400" />;
      case 'Hexagon': return <Hexagon className="w-4 h-4 text-purple-400" />;
      case 'Keyboard': return <Keyboard className="w-4 h-4 text-teal-400" />;
      case 'Clock': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'GitMerge': return <GitMerge className="w-4 h-4 text-violet-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-purple-400" />;
      case 'Component': return <Component className="w-4 h-4 text-cyan-400" />;
      case 'ArrowDownUp': return <ArrowDownUp className="w-4 h-4 text-teal-400" />;
      case 'Users': return <Users className="w-4 h-4 text-blue-400" />;
      case 'UserCheck': return <UserCheck className="w-4 h-4 text-slate-300" />;
      case 'CircleDot': return <CircleDot className="w-4 h-4 text-violet-400" />;
      case 'Database': return <Database className="w-4 h-4 text-amber-400" />;
      case 'SquareStack': return <SquareStack className="w-4 h-4 text-blue-400" />;
      case 'FileCheck2': return <FileCheck2 className="w-4 h-4 text-emerald-400" />;
      case 'ListOrdered': return <ListOrdered className="w-4 h-4 text-yellow-400" />;
      case 'Network': return <Network className="w-4 h-4 text-rose-400" />;
      case 'CalendarCheck': return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case 'StickyNote': return <StickyNote className="w-4 h-4 text-amber-300" />;
      case 'Image': return <ImageIcon className="w-4 h-4 text-sky-400" />;
      case 'BoxSelect': return <BoxSelect className="w-4 h-4 text-indigo-400" />;
      case 'Columns3': return <Columns3 className="w-4 h-4 text-indigo-400" />;
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

        {/* Workspace Diagrams Files Tree Switcher Accordion (Change 1) */}
        {(() => {
          const ws = workspaceService.getActiveWorkspace();
          const allDiagrams = ws.diagrams || {};
          const filenames = Object.keys(allDiagrams);
          if (filenames.length <= 1 && !isDiagramsListExpanded) return null;

          // Build parent-child relationships map
          const parentOfMap = new Map<string, { parentFilename: string; parentNodeLabel: string }>();
          const childrenMap = new Map<string, Array<{ filename: string; parentNodeLabel: string }>>();

          filenames.forEach(f => {
            const diag = allDiagrams[f];
            const pages = diag?.document?.pages || [];
            pages.forEach(p => {
              (p.nodes || []).forEach(n => {
                const childRefs = getNodeChildDiagrams(n);
                childRefs.forEach(ref => {
                  if (ref.filename && allDiagrams[ref.filename] && ref.filename !== f) {
                    if (!parentOfMap.has(ref.filename)) {
                      parentOfMap.set(ref.filename, {
                        parentFilename: f,
                        parentNodeLabel: n.label || 'Node',
                      });
                    }
                    const list = childrenMap.get(f) || [];
                    if (!list.some(item => item.filename === ref.filename)) {
                      list.push({ filename: ref.filename, parentNodeLabel: n.label || 'Node' });
                      childrenMap.set(f, list);
                    }
                  }
                });
              });
            });
          });

          // Identify root diagrams (unparented or root.json)
          const rootFilenames: string[] = [];
          if (allDiagrams['root.json']) {
            rootFilenames.push('root.json');
          }
          filenames.forEach(f => {
            if (!parentOfMap.has(f) && f !== 'root.json') {
              rootFilenames.push(f);
            }
          });
          if (rootFilenames.length === 0 && filenames.length > 0) {
            rootFilenames.push(filenames[0]);
          }

          interface DiagramTreeNode {
            filename: string;
            name: string;
            diagramType?: string;
            parentFilename?: string;
            parentNodeLabel?: string;
            children: DiagramTreeNode[];
            depth: number;
          }

          const visited = new Set<string>();
          function buildTree(fname: string, depth: number): DiagramTreeNode {
            visited.add(fname);
            const diag = allDiagrams[fname];
            const firstType = diag?.document?.pages?.[0]?.diagramType;
            const parentInfo = parentOfMap.get(fname);
            const childList = childrenMap.get(fname) || [];
            const children: DiagramTreeNode[] = [];
            childList.forEach(c => {
              if (!visited.has(c.filename) && allDiagrams[c.filename]) {
                children.push(buildTree(c.filename, depth + 1));
              }
            });
            return {
              filename: fname,
              name: diag?.name || fname,
              diagramType: firstType,
              parentFilename: parentInfo?.parentFilename,
              parentNodeLabel: parentInfo?.parentNodeLabel,
              children,
              depth,
            };
          }

          const treeRoots: DiagramTreeNode[] = rootFilenames.map(f => buildTree(f, 0));
          filenames.forEach(f => {
            if (!visited.has(f)) {
              treeRoots.push(buildTree(f, 0));
            }
          });

          const currentFilename = activeDiagramFilename || ws.activeDiagramFilename || 'root.json';

          const renderNode = (item: DiagramTreeNode): React.ReactNode => {
            const isCurrent = item.filename === currentFilename;
            const hasChildren = item.children.length > 0;
            const isCollapsed = collapsedDiagramNodes.has(item.filename);

            return (
              <div key={item.filename} className="space-y-0.5">
                <div
                  className={`w-full text-left rounded-lg flex items-center justify-between gap-1 transition-colors cursor-pointer text-xs group ${
                    isCurrent
                      ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/40 shadow-xs'
                      : themeDef.isDark
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-200 text-slate-700'
                  }`}
                  style={{
                    paddingLeft: `${item.depth * 14 + 6}px`,
                    paddingRight: '6px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 min-w-0 flex-1"
                    onClick={() => onSwitchDiagram?.(item.filename)}
                    title={`Switch to diagram: ${item.name || item.filename}`}
                  >
                    {item.depth > 0 && (
                      <CornerDownRight className="w-3 h-3 text-purple-400 shrink-0 opacity-80" />
                    )}

                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleDiagramNodeCollapse(item.filename);
                        }}
                        className="p-0.5 -ml-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white cursor-pointer shrink-0"
                        title={isCollapsed ? 'Expand sub-diagrams' : 'Collapse sub-diagrams'}
                      >
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${
                            isCollapsed ? '-rotate-90 text-purple-400' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="w-2 shrink-0" />
                    )}

                    <FileCode
                      className={`w-3 h-3 shrink-0 ${
                        isCurrent
                          ? 'text-sky-400'
                          : item.depth > 0
                          ? 'text-purple-400'
                          : 'text-slate-400'
                      }`}
                    />

                    <div className="min-w-0 flex flex-col flex-1">
                      <span className="truncate leading-tight">{item.name || item.filename}</span>
                      {item.parentNodeLabel && (
                        <span className="text-[8.5px] font-mono text-purple-300/80 truncate leading-none mt-0.5">
                          ↳ from {item.parentNodeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {item.diagramType && (
                      <span className="text-[7.5px] font-mono uppercase px-1 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">
                        {item.diagramType}
                      </span>
                    )}
                    {isCurrent && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                  </div>
                </div>

                {/* Sub-diagrams / Child Branches */}
                {hasChildren && !isCollapsed && (
                  <div className="space-y-0.5 border-l border-purple-500/25 ml-2 pl-0.5">
                    {item.children.map(child => renderNode(child))}
                  </div>
                )}
              </div>
            );
          };

          return (
            <div
              className={`rounded-xl border p-2 text-xs space-y-1.5 ${
                themeDef.isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsDiagramsListExpanded(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 cursor-pointer flex-1"
                  title="Click to view diagram hierarchy and switch between files"
                >
                  <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                  <span>Workspace Hierarchy ({filenames.length})</span>
                </button>
                <div className="flex items-center gap-1">
                  {isDiagramsListExpanded && filenames.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (collapsedDiagramNodes.size > 0) {
                          setCollapsedDiagramNodes(new Set());
                        } else {
                          setCollapsedDiagramNodes(new Set(filenames));
                        }
                      }}
                      className="text-[9px] font-mono text-slate-400 hover:text-sky-300 px-1 py-0.5 rounded cursor-pointer"
                      title="Toggle expand/collapse all"
                    >
                      {collapsedDiagramNodes.size > 0 ? 'Expand' : 'Collapse'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDiagramsListExpanded(v => !v)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform ${
                        isDiagramsListExpanded ? 'rotate-180 text-sky-400' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {isDiagramsListExpanded && (
                <div className="space-y-1 max-h-56 overflow-y-auto pt-1.5 border-t border-slate-800/60 pr-0.5">
                  {treeRoots.map(root => renderNode(root))}
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
          {selectedCategory !== 'generic' && (
            <button
              onClick={() => onSelectCategory('generic')}
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

      {/* Bottom Images Drawer (when user clicks Browse images/) */}
      {showImagesDrawer && (
        <div className={`p-2.5 border-t ${themeDef.borderClass} ${themeDef.isDark ? 'bg-slate-900' : 'bg-slate-100'} max-h-48 overflow-y-auto space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Workspace images/</span>
            </span>
            <button
              type="button"
              onClick={() => setShowImagesDrawer(false)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {workspaceImagesList.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic py-1 text-center">
              No images in images/ folder yet. Use + Add Image to upload.
            </p>
          ) : (
            workspaceImagesList.map(img => (
              <div
                key={img.filename}
                onClick={() => {
                  onAddExistingImage?.(img);
                  setShowImagesDrawer(false);
                }}
                className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                  themeDef.isDark
                    ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
                title="Click to add this image to canvas or selected node"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img src={img.url} alt={img.filename} className="w-7 h-7 rounded object-cover shrink-0" />
                  <div className="truncate min-w-0">
                    <div className="text-[11px] font-mono truncate font-semibold">{img.filename}</div>
                    <div className="text-[9px] text-slate-400">{(img.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                  + Add
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Sticky Note & Add Image Quick Actions */}
      <div className={`p-2.5 border-t space-y-1.5 ${themeDef.borderClass} ${themeDef.isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
        <div className="grid grid-cols-2 gap-1.5">
          {/* Add Sticky Note */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => onSelectTemplate('sticky-note')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 shadow-xs group ${
              themeDef.isDark
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            }`}
            title="Add a new sticky note to canvas"
          >
            <StickyNote className="w-3.5 h-3.5 shrink-0 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="truncate">+ Sticky Note</span>
          </button>

          {/* Add Image Button */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => imageFileInputRef.current?.click()}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs group ${
              themeDef.isDark
                ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
            } ${
              isReadOnly ? 'opacity-50 pointer-events-none' : ''
            }`}
            title="Import an image into workspace images/ folder and attach to selected node or add to canvas"
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0 text-sky-500 group-hover:scale-110 transition-transform" />
            <span className="truncate">+ Add Image</span>
          </button>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.gif"
            disabled={isReadOnly}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onAddImageFile?.(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </div>

        {/* Small Browse images/ shortcut */}
        <button
          type="button"
          disabled={isReadOnly}
          onClick={async () => {
            if (!showImagesDrawer) {
              const activeWs = workspaceService.getActiveWorkspace();
              const images = await workspaceService.listWorkspaceImages(activeWs.id);
              setWorkspaceImagesList(images);
            }
            setShowImagesDrawer(v => !v);
          }}
          className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[10px] font-mono transition-colors border cursor-pointer ${
            themeDef.isDark
              ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border-slate-800'
              : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-sky-600 border-slate-200'
          }`}
          title="Browse or pick images stored in workspace images/ folder"
        >
          <FolderOpen className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="truncate">Browse images/ folder</span>
        </button>
      </div>
    </div>
  );
};
