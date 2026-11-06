/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { DiagramNode, DiagramEdge, DiagramType, AppTheme, getNodeChildDiagrams } from '../../types/diagram';
import {
  Trash2,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus,
  Palette,
  Maximize2,
  Grid,
  Magnet,
  FileText,
  FilePlus,
  Link2,
  ChevronRight,
  MousePointerClick,
  CornerDownRight,
  Spline,
  Minus,
  Check,
  RotateCcw,
  ExternalLink,
  FolderTree,
  Database,
  Sparkles,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { getDefaultConnectorStyleForDiagram } from '../../utils/diagramConnectorConfig';

export interface ContextMenuPosition {
  x: number;
  y: number;
  nodeId?: string | null;
  edgeId?: string | null;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  selectedNode: DiagramNode | null;
  selectedEdge?: DiagramEdge | null;
  diagramType?: DiagramType;
  otherNodes?: DiagramNode[];
  theme?: AppTheme;
  onClose: () => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onUpdateEdge?: (edge: DiagramEdge) => void;
  onDuplicateNode: (nodeId: string) => void;
  onBringToFront: (nodeId: string) => void;
  onSendToBack: (nodeId: string) => void;
  onOpenEditModal: (node: DiagramNode) => void;
  onQuickAddColumn?: (nodeId: string) => void;
  onQuickAddMethod?: (nodeId: string) => void;
  onChangeColor: (nodeId: string, fill: string, stroke: string) => void;
  onOpenDoc: (node: DiagramNode) => void;
  onResetZoom: () => void;
  onToggleGridSnap: () => void;
  onToggleGrid: () => void;
  onOpenNewPageModal: () => void;
  onStartConnectFromNode?: (nodeId: string) => void;
  onConnectNodes?: (sourceId: string, targetId: string) => void;
  onNavigateChildDiagram?: (filename: string) => void;
  onOpenChildDiagramModal?: (node: DiagramNode) => void;
  onOpenImportSqlModal?: () => void;
  onOpenGenerateMindmapModal?: () => void;
  isReadOnly?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  selectedNode,
  selectedEdge,
  diagramType = 'generic',
  otherNodes = [],
  theme = 'dark',
  onClose,
  onDeleteNode,
  onDeleteEdge,
  onUpdateEdge,
  onDuplicateNode,
  onBringToFront,
  onSendToBack,
  onOpenEditModal,
  onQuickAddColumn,
  onQuickAddMethod,
  onChangeColor,
  onOpenDoc,
  onResetZoom,
  onToggleGridSnap,
  onToggleGrid,
  onOpenNewPageModal,
  onStartConnectFromNode,
  onConnectNodes,
  onNavigateChildDiagram,
  onOpenChildDiagramModal,
  onOpenImportSqlModal,
  onOpenGenerateMindmapModal,
  isReadOnly,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showConnectSubmenu, setShowConnectSubmenu] = useState(false);
  const [showEdgeStyleSubmenu, setShowEdgeStyleSubmenu] = useState(false);
  const [showChildSubmenu, setShowChildSubmenu] = useState(false);
  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  // Close on outside click or Escape key
  useEffect(() => {
    if (!position) return;
    setShowConnectSubmenu(false);
    setShowEdgeStyleSubmenu(false);
    setShowChildSubmenu(false);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Keep menu inside viewport boundaries
  const menuWidth = 260;
  const menuHeight = selectedNode ? 420 : selectedEdge || position.edgeId ? 300 : 220;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 20);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 20);

  const colorSwatches = [
    { label: 'Slate', fill: 'rgba(15, 23, 42, 0.95)', stroke: '#0284c7' },
    { label: 'Blue', fill: 'rgba(30, 58, 138, 0.9)', stroke: '#3b82f6' },
    { label: 'Emerald', fill: 'rgba(6, 78, 59, 0.9)', stroke: '#10b981' },
    { label: 'Amber', fill: 'rgba(120, 53, 15, 0.9)', stroke: '#f59e0b' },
    { label: 'Purple', fill: 'rgba(88, 28, 135, 0.9)', stroke: '#a855f7' },
    { label: 'Rose', fill: 'rgba(136, 19, 55, 0.9)', stroke: '#f43f5e' },
    { label: 'Teal', fill: 'rgba(19, 78, 74, 0.9)', stroke: '#14b8a6' },
    { label: 'Light Clean', fill: '#f8fafc', stroke: '#64748b' },
  ];

  const candidateNodes = otherNodes.filter(n => n.id !== selectedNode?.id);
  const childDiagrams = selectedNode ? getNodeChildDiagrams(selectedNode) : [];
  const defaultRouting = getDefaultConnectorStyleForDiagram(diagramType);

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, x)}px`, top: `${Math.max(10, y)}px` }}
      className={`fixed z-50 w-64 rounded-xl shadow-2xl p-1.5 text-xs select-none animate-in fade-in-50 zoom-in-95 backdrop-blur-md border ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-200'
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'
      }`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {selectedNode ? (
        // NODE CONTEXT MENU
        <div className="space-y-0.5">
          {/* Header */}
          <div
            className={`px-2.5 py-1.5 border-b mb-1 flex items-center justify-between text-[11px] font-mono ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`truncate max-w-[150px] font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {selectedNode.label}
            </span>
            <span
              className={`text-[9px] uppercase px-1 py-0.5 rounded font-mono ${
                isDark ? 'bg-slate-800 text-sky-400' : 'bg-slate-100 text-sky-600'
              }`}
            >
              {selectedNode.type}
            </span>
          </div>

          {/* Quick Color Swatches Bar */}
          <div className="px-2 py-1">
            <div
              className={`text-[10px] uppercase font-mono mb-1 flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <Palette className="w-3 h-3 text-blue-500" />
              <span>Color Theme</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {colorSwatches.map(swatch => (
                <button
                  key={swatch.label}
                  type="button"
                  onClick={() => {
                    onChangeColor(selectedNode.id, swatch.fill, swatch.stroke);
                    onClose();
                  }}
                  className="w-5 h-5 rounded-full border border-slate-400/50 hover:scale-125 transition-transform cursor-pointer relative shadow-xs"
                  style={{ backgroundColor: swatch.stroke }}
                  title={`Set ${swatch.label} theme`}
                />
              ))}
            </div>
          </div>

          <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800/80' : 'bg-slate-200'}`} />

          {/* CONNECT TO NODE */}
          {!isReadOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConnectSubmenu(prev => !prev)}
                onMouseEnter={() => setShowConnectSubmenu(true)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  showConnectSubmenu
                    ? 'bg-blue-600/20 text-blue-400 font-semibold'
                    : isDark
                    ? 'hover:bg-slate-800 text-blue-400 hover:text-blue-300'
                    : 'hover:bg-blue-50 text-blue-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold">Connect to Node...</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Submenu for Connection Targets */}
              {showConnectSubmenu && (
                <div
                  className={`absolute left-full top-0 ml-1.5 w-60 rounded-xl shadow-2xl p-1.5 text-xs border backdrop-blur-md z-50 animate-in fade-in slide-in-from-left-2 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/80'
                  }`}
                  onMouseLeave={() => setShowConnectSubmenu(false)}
                >
                  <div
                    className={`px-2 py-1 text-[10px] font-mono uppercase border-b mb-1 ${
                      isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                    }`}
                  >
                    Select Target Node
                  </div>

                  {/* Option 1: Interactive canvas wire */}
                  <button
                    onClick={() => {
                      onStartConnectFromNode?.(selectedNode.id);
                      onClose();
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mb-1 ${
                      isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">Click target on canvas...</span>
                  </button>

                  <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                  {/* Option 2: Direct List of candidate nodes */}
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {candidateNodes.length === 0 ? (
                      <div
                        className={`px-2 py-1.5 text-[11px] italic ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        No other nodes on page
                      </div>
                    ) : (
                      candidateNodes.map(targetNode => (
                        <button
                          key={targetNode.id}
                          onClick={() => {
                            onConnectNodes?.(selectedNode.id, targetNode.id);
                            onClose();
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isDark
                              ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="truncate max-w-[140px] font-medium">{targetNode.label}</span>
                          <span className="text-[9px] font-mono text-slate-500 uppercase ml-1 shrink-0">
                            {targetNode.type}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHILD DIAGRAMS NAVIGATION & CREATION */}
          {childDiagrams.length === 1 ? (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateChildDiagram) {
                    onNavigateChildDiagram(childDiagrams[0].filename);
                  }
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-purple-950/40 border border-purple-500/40 text-purple-200 hover:bg-purple-600 hover:text-white'
                    : 'bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-600 hover:text-white'
                }`}
                title={`Open child diagram: ${childDiagrams[0].title || childDiagrams[0].filename}`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-bold truncate">Open Child: {childDiagrams[0].title || childDiagrams[0].filename}</span>
                </div>
                {childDiagrams[0].diagramType && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {childDiagrams[0].diagramType}
                  </span>
                )}
              </button>
              {!isReadOnly && onOpenChildDiagramModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChildDiagramModal(selectedNode);
                    onClose();
                  }}
                  className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 text-[11px] transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-purple-400 hover:text-purple-300' : 'hover:bg-purple-50 text-purple-600'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Another Child Diagram</span>
                </button>
              )}
            </div>
          ) : childDiagrams.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowChildSubmenu(prev => !prev)}
                onMouseEnter={() => setShowChildSubmenu(true)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  showChildSubmenu
                    ? 'bg-purple-600/20 text-purple-400 font-semibold'
                    : isDark
                    ? 'hover:bg-slate-800 text-purple-400 hover:text-purple-300'
                    : 'hover:bg-purple-50 text-purple-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-semibold">
                    Child Diagrams ({childDiagrams.length})
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Submenu for Child Diagrams */}
              {showChildSubmenu && (
                <div
                  className={`absolute left-full top-0 ml-1.5 w-64 rounded-xl shadow-2xl p-1.5 text-xs border backdrop-blur-md z-50 animate-in fade-in slide-in-from-left-2 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/80'
                  }`}
                  onMouseLeave={() => setShowChildSubmenu(false)}
                >
                  <div
                    className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between border-b ${
                      isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                    }`}
                  >
                    <span>Attached Child Diagrams</span>
                    <span className="text-[9px] text-purple-400 font-bold">{childDiagrams.length}</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                    {childDiagrams.map((child, idx) => (
                      <button
                        key={child.id || child.filename || idx}
                        type="button"
                        onClick={() => {
                          if (onNavigateChildDiagram) {
                            onNavigateChildDiagram(child.filename);
                          }
                          onClose();
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                          isDark
                            ? 'hover:bg-purple-950/60 hover:text-purple-200 text-slate-200'
                            : 'hover:bg-purple-50 hover:text-purple-900 text-slate-700'
                        }`}
                        title={`Navigate to ${child.title || child.filename}`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                          <div className="truncate font-medium">{child.title || child.filename}</div>
                        </div>
                        {child.diagramType && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {child.diagramType}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {!isReadOnly && onOpenChildDiagramModal && (
                    <div className={`pt-1 mt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChildDiagramModal(selectedNode);
                          onClose();
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 font-medium transition-colors cursor-pointer ${
                          isDark
                            ? 'hover:bg-purple-900/40 text-purple-400 hover:text-purple-300'
                            : 'hover:bg-purple-50 text-purple-600'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add Another Child Diagram</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            !isReadOnly && onOpenChildDiagramModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenChildDiagramModal(selectedNode);
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                  isDark
                    ? 'hover:bg-slate-800 text-purple-400 hover:text-purple-300'
                    : 'hover:bg-purple-50 text-purple-600'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Create Child Diagram...</span>
              </button>
            )
          )}

          {/* EDIT NODE PROPERTIES / COLUMNS / METHODS */}
          <button
            onClick={() => {
              onOpenEditModal(selectedNode);
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Name &amp; Properties...</span>
          </button>

          {/* ERD Quick Column */}
          {selectedNode.type === 'entity' && onQuickAddColumn && !isReadOnly && (
            <button
              onClick={() => {
                onQuickAddColumn(selectedNode.id);
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white text-sky-400'
                  : 'hover:bg-sky-50 text-sky-600'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add Column</span>
            </button>
          )}

          {/* UML Quick Method */}
          {selectedNode.type === 'class' && onQuickAddMethod && !isReadOnly && (
            <button
              onClick={() => {
                onQuickAddMethod(selectedNode.id);
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white text-indigo-400'
                  : 'hover:bg-indigo-50 text-indigo-600'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add Method</span>
            </button>
          )}

          {/* DUPLICATE NODE */}
          {!isReadOnly && (
            <button
              onClick={() => {
                onDuplicateNode(selectedNode.id);
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                  : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate Node</span>
            </button>
          )}

          {/* BRING TO FRONT */}
          <button
            onClick={() => {
              onBringToFront(selectedNode.id);
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
            <span>Bring to Front</span>
          </button>

          {/* SEND TO BACK */}
          <button
            onClick={() => {
              onSendToBack(selectedNode.id);
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Send to Back</span>
          </button>

          {/* Open Docs in Inspector */}
          <button
            onClick={() => {
              onOpenDoc(selectedNode);
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>View Documentation &amp; Notes</span>
          </button>

          {/* DELETE OBJECT */}
          {!isReadOnly && (
            <>
              <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800/80' : 'bg-slate-200'}`} />
              <button
                onClick={() => {
                  onDeleteNode(selectedNode.id);
                  onClose();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-500 hover:bg-rose-500/20 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Object</span>
              </button>
            </>
          )}
        </div>
      ) : selectedEdge || position.edgeId ? (
        // EDGE CONTEXT MENU (Change 1: Flip Connector Styles)
        <div className="space-y-1">
          <div
            className={`px-2.5 py-1.5 border-b text-[10px] uppercase font-mono flex items-center justify-between ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="font-bold">Connector Style</span>
            <span className="text-sky-400 font-mono capitalize">
              {selectedEdge?.type || 'orthogonal'}
            </span>
          </div>

          {/* Routing Styles (Orthogonal Corners, Curved Bezier, Straight) */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                if (selectedEdge && onUpdateEdge) {
                  onUpdateEdge({ ...selectedEdge, type: 'orthogonal' });
                }
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                (selectedEdge?.type || 'orthogonal') === 'orthogonal'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CornerDownRight className="w-3.5 h-3.5 text-sky-400" />
                <span>Corners (Orthogonal)</span>
              </div>
              {(selectedEdge?.type || 'orthogonal') === 'orthogonal' && (
                <Check className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>

            <button
              onClick={() => {
                if (selectedEdge && onUpdateEdge) {
                  onUpdateEdge({ ...selectedEdge, type: 'curved' });
                }
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                selectedEdge?.type === 'curved'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Spline className="w-3.5 h-3.5 text-purple-400" />
                <span>Curved (Bezier)</span>
              </div>
              {selectedEdge?.type === 'curved' && (
                <Check className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>

            <button
              onClick={() => {
                if (selectedEdge && onUpdateEdge) {
                  onUpdateEdge({ ...selectedEdge, type: 'straight' });
                }
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                selectedEdge?.type === 'straight'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Minus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Straight Line</span>
              </div>
              {selectedEdge?.type === 'straight' && (
                <Check className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>
          </div>

          <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Reset to Diagram Default Button */}
          {selectedEdge && onUpdateEdge && selectedEdge.type !== defaultRouting && (
            <button
              onClick={() => {
                onUpdateEdge({ ...selectedEdge, type: defaultRouting });
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-[11px] ${
                isDark ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-50 text-amber-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to {diagramType.toUpperCase()} default ({defaultRouting})</span>
            </button>
          )}

          {/* Line Style Toggle: Solid vs Dashed */}
          {selectedEdge && onUpdateEdge && (
            <button
              onClick={() => {
                const nextStyle = selectedEdge.lineStyle === 'dashed' ? 'solid' : 'dashed';
                onUpdateEdge({ ...selectedEdge, lineStyle: nextStyle });
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>Line Pattern</span>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                {selectedEdge.lineStyle || 'solid'}
              </span>
            </button>
          )}

          {/* Delete Connector */}
          {!isReadOnly && (
            <>
              <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <button
                onClick={() => {
                  const targetEdgeId = selectedEdge?.id || position.edgeId;
                  if (targetEdgeId && onDeleteEdge) {
                    onDeleteEdge(targetEdgeId);
                  }
                  onClose();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-500 hover:bg-rose-500/20 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Connector</span>
              </button>
            </>
          )}
        </div>
      ) : (
        // CANVAS BACKGROUND CONTEXT MENU
        <div className="space-y-0.5">
          <div
            className={`px-2.5 py-1 border-b text-[10px] uppercase font-mono mb-1 ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            Canvas Options
          </div>
          <button
            onClick={() => {
              onResetZoom();
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset View (100%)</span>
          </button>

          <button
            onClick={() => {
              onToggleGridSnap();
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <Magnet className="w-3.5 h-3.5 text-slate-400" />
            <span>Toggle Grid Snap</span>
          </button>

          <button
            onClick={() => {
              onToggleGrid();
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-slate-300'
                : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-slate-400" />
            <span>Toggle Grid Pattern</span>
          </button>

          <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800/80' : 'bg-slate-200'}`} />

          <button
            onClick={() => {
              onOpenNewPageModal();
              onClose();
            }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 hover:text-white text-blue-400'
                : 'hover:bg-blue-50 text-blue-600'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Add Diagram Page...</span>
          </button>

          {onOpenImportSqlModal && (diagramType === 'erd' || diagramType === 'generic') && (
            <button
              onClick={() => {
                onOpenImportSqlModal();
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-semibold ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white text-sky-400'
                  : 'hover:bg-sky-50 text-sky-600'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Import SQL (ERwin/Postgres)...</span>
            </button>
          )}

          {onOpenGenerateMindmapModal && (diagramType === 'mindmap' || diagramType === 'generic') && (
            <button
              onClick={() => {
                onOpenGenerateMindmapModal();
                onClose();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-semibold ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white text-purple-400'
                  : 'hover:bg-purple-50 text-purple-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Mind Map with Gemini AI...</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
