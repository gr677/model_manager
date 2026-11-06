/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DiagramNode,
  DiagramEdge,
  DiagramPage,
  StickyNote,
  Comment,
  UserRole,
  AppTheme,
  getNodeChildDiagrams,
  ChildDiagramRef,
  NodeUrlLink,
} from '../../types/diagram';
import {
  FileText,
  Sliders,
  MessageSquare,
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  FolderTree,
  StickyNote as StickyIcon,
  Tag,
  CheckCircle,
  Clock,
  Send,
  X,
  Code,
  ArrowUp,
  ArrowDown,
  Database,
  Cpu,
  FolderOpen,
  Palette,
  CornerDownRight,
  Spline,
  Minus,
  RotateCcw,
  Link2,
  Check,
  Calendar,
  Milestone,
  UserCheck,
} from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';
import { getDefaultConnectorStyleForDiagram, CONNECTOR_STYLE_OPTIONS } from '../../utils/diagramConnectorConfig';
import {
  VIBRANT_COLOR_PALETTES,
  PASTEL_COLOR_PALETTES,
  ColorPaletteItem,
} from '../../utils/colorUtils';
import {
  NODE_ANCHOR_DEFINITIONS,
  NodeAnchor,
} from '../../utils/diagramAnchors';

interface NodeInspectorProps {
  selectedNode: DiagramNode | null;
  selectedNodes?: DiagramNode[];
  selectedEdge?: DiagramEdge | null;
  currentPage: DiagramPage;
  allPages: DiagramPage[];
  userRole: UserRole;
  theme?: AppTheme;
  onUpdateNode: (updatedNode: DiagramNode) => void;
  onUpdateNodes?: (updatedNodes: DiagramNode[]) => void;
  onUpdateEdge?: (updatedEdge: DiagramEdge) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onClose: () => void;
  onDrillDown?: (pageId: string) => void;
  onOpenChildDiagramModal?: (node: DiagramNode) => void;
  onNavigateChildDiagram?: (filename: string) => void;
  onUnlinkChildDiagram?: (nodeId: string, filename?: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedNode,
  selectedNodes,
  selectedEdge,
  currentPage,
  allPages,
  userRole,
  theme = 'dark',
  onUpdateNode,
  onUpdateNodes,
  onUpdateEdge,
  onDeleteNode,
  onDeleteNodes,
  onDeleteEdge,
  onClose,
  onDrillDown,
  onOpenChildDiagramModal,
  onNavigateChildDiagram,
  onUnlinkChildDiagram,
}) => {
  const [activeTab, setActiveTab] = useState<'props' | 'docs' | 'comments' | 'group'>('props');
  const [newTagInput, setNewTagInput] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newStickyText, setNewStickyText] = useState('');
  const [stickyColor, setStickyColor] = useState<StickyNote['color']>('yellow');
  const [paletteCategory, setPaletteCategory] = useState<'pastel' | 'vibrant'>('pastel');
  const [newUrlInput, setNewUrlInput] = useState('');
  const [newUrlLabel, setNewUrlLabel] = useState('');

  const themeDef = THEMES[theme] || THEMES.dark;

  if (selectedEdge && !selectedNode) {
    const sourceNode = currentPage.nodes.find(n => n.id === selectedEdge.sourceNodeId);
    const targetNode = currentPage.nodes.find(n => n.id === selectedEdge.targetNodeId);
    const defaultRouting = getDefaultConnectorStyleForDiagram(currentPage.diagramType);
    const isReadOnly = userRole === 'viewer';

    const edgeColors = [
      { label: 'Slate', color: '#94a3b8' },
      { label: 'Blue', color: '#38bdf8' },
      { label: 'Emerald', color: '#34d399' },
      { label: 'Amber', color: '#fbbf24' },
      { label: 'Purple', color: '#c084fc' },
      { label: 'Rose', color: '#fb7185' },
    ];

    return (
      <div className={`w-80 h-full border-l flex flex-col select-none transition-colors duration-150 ${themeDef.sidebarClass}`}>
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${themeDef.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-sky-400" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${themeDef.isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Connector Style
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded cursor-pointer transition-colors ${
              themeDef.isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          {/* Connection Target Overview */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
            themeDef.isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="font-semibold truncate max-w-[100px] text-sky-400">
              {sourceNode?.label || 'Source'}
            </span>
            <span className="text-[10px] font-mono opacity-60">→</span>
            <span className="font-semibold truncate max-w-[100px] text-emerald-400">
              {targetNode?.label || 'Target'}
            </span>
          </div>

          {/* Change 1: Routing Style Selection (Orthogonal corners vs Bezier curves vs Straight) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[10px] uppercase font-mono font-bold ${themeDef.textMutedClass}`}>
                Connection Routing Style
              </label>
              <span className="text-[9px] font-mono text-sky-400 capitalize">
                {selectedEdge.type || 'orthogonal'}
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Corners (Orthogonal) */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'orthogonal' })}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  (selectedEdge.type || 'orthogonal') === 'orthogonal'
                    ? 'border-blue-500 bg-blue-600/15 text-blue-400 ring-1 ring-blue-500/50 font-semibold'
                    : themeDef.isDark
                    ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-sky-500/10 text-sky-400">
                    <CornerDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Corners (Orthogonal)</div>
                    <div className="text-[10px] opacity-70">90° corners • Standard for ERD & BPMN</div>
                  </div>
                </div>
                {(selectedEdge.type || 'orthogonal') === 'orthogonal' && (
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>

              {/* Curves (Bezier) */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'curved' })}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedEdge.type === 'curved'
                    ? 'border-purple-500 bg-purple-600/15 text-purple-400 ring-1 ring-purple-500/50 font-semibold'
                    : themeDef.isDark
                    ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-purple-500/10 text-purple-400">
                    <Spline className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Curved (Bezier)</div>
                    <div className="text-[10px] opacity-70">Smooth curves • Standard for Mind Maps</div>
                  </div>
                </div>
                {selectedEdge.type === 'curved' && (
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                )}
              </button>

              {/* Straight */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'straight' })}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedEdge.type === 'straight'
                    ? 'border-emerald-500 bg-emerald-600/15 text-emerald-400 ring-1 ring-emerald-500/50 font-semibold'
                    : themeDef.isDark
                    ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Straight</div>
                    <div className="text-[10px] opacity-70">Direct line • Standard for PERT & Sequence</div>
                  </div>
                </div>
                {selectedEdge.type === 'straight' && (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </button>
            </div>

            {/* Diagram Default Reset pill */}
            <div className={`mt-2 p-2 rounded-lg border flex items-center justify-between text-[11px] ${
              themeDef.isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400">
                  {currentPage.diagramType.toUpperCase()} Standard:
                </span>
                <span className="font-bold font-mono text-sky-400 capitalize">
                  {defaultRouting}
                </span>
              </div>
              {selectedEdge.type !== defaultRouting && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => onUpdateEdge?.({ ...selectedEdge, type: defaultRouting })}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Line Pattern (Solid, Dashed, Dotted) */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              Line Pattern
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['solid', 'dashed', 'dotted'] as const).map(pattern => (
                <button
                  key={pattern}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onUpdateEdge?.({ ...selectedEdge, lineStyle: pattern })}
                  className={`py-1.5 rounded-lg border text-xs font-mono uppercase transition-colors cursor-pointer ${
                    (selectedEdge.lineStyle || 'solid') === pattern
                      ? 'bg-blue-600 text-white font-bold border-blue-500'
                      : themeDef.isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {pattern}
                </button>
              ))}
            </div>
          </div>

          {/* ERD Cardinality Quick Presets (Change 2) */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              ERD Cardinality Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({
                  ...selectedEdge,
                  markerStart: 'crow-one-only',
                  markerEnd: 'crow-zero-many',
                  label: '1:0..*',
                })}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-colors text-left ${
                  selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-zero-many'
                    ? 'bg-sky-600 text-white font-bold border-sky-500'
                    : themeDef.isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title="One and only one to Zero through many (1:0..*)"
              >
                1 ➔ 0..* (Zero or Many)
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({
                  ...selectedEdge,
                  markerStart: 'crow-one-only',
                  markerEnd: 'crow-one-many',
                  label: '1:1..*',
                })}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-colors text-left ${
                  selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-one-many'
                    ? 'bg-sky-600 text-white font-bold border-sky-500'
                    : themeDef.isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title="One and only one to One through many (1:1..*)"
              >
                1 ➔ 1..* (One or Many)
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({
                  ...selectedEdge,
                  markerStart: 'crow-one-only',
                  markerEnd: 'crow-one-only',
                  label: '1:1',
                })}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-colors text-left ${
                  selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-one-only'
                    ? 'bg-sky-600 text-white font-bold border-sky-500'
                    : themeDef.isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title="One and only one to One and only one (1:1)"
              >
                1 ➔ 1 (One & Only One)
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdateEdge?.({
                  ...selectedEdge,
                  markerStart: 'crow-one-only',
                  markerEnd: 'crow-zero-one',
                  label: '1:0..1',
                })}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-colors text-left ${
                  selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-zero-one'
                    ? 'bg-sky-600 text-white font-bold border-sky-500'
                    : themeDef.isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title="One and only one to Zero or one (1:0..1)"
              >
                1 ➔ 0..1 (Zero or One)
              </button>
            </div>
          </div>

          {/* Line Start Marker (Source End / Cardinality) */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              Line Start Marker (Source Cardinality)
            </label>
            <select
              disabled={isReadOnly}
              value={selectedEdge.markerStart || 'none'}
              onChange={e => onUpdateEdge?.({ ...selectedEdge, markerStart: e.target.value as any })}
              className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                themeDef.isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="none">None (Plain Line)</option>
              <option value="crow-one-only">One and Only One (1..1 - || double bars)</option>
              <option value="crow-zero-many">Zero through Many (0..* - O&gt;-- circle + crow's foot)</option>
              <option value="crow-one-many">One through Many (1..* - |&gt;-- bar + crow's foot)</option>
              <option value="crow-zero-one">Zero or One (0..1 - O| circle + bar)</option>
              <option value="crow-foot-many">Many (* - &gt;-- crow's foot)</option>
              <option value="crow-foot-one">Exactly One (1 - | single bar)</option>
              <option value="arrow">Arrow (Flow)</option>
              <option value="diamond">Diamond (Composition)</option>
              <option value="diamond-filled">Filled Diamond (Aggregation)</option>
              <option value="circle">Circle Marker</option>
            </select>
          </div>

          {/* Line End Marker (Target End / Cardinality) */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              Line End Marker (Target Cardinality)
            </label>
            <select
              disabled={isReadOnly}
              value={selectedEdge.markerEnd || 'arrow'}
              onChange={e => onUpdateEdge?.({ ...selectedEdge, markerEnd: e.target.value as any })}
              className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                themeDef.isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="arrow">Arrow (Flow)</option>
              <option value="crow-zero-many">Zero through Many (0..* - O&gt;-- circle + crow's foot)</option>
              <option value="crow-one-many">One through Many (1..* - |&gt;-- bar + crow's foot)</option>
              <option value="crow-one-only">One and Only One (1..1 - || double bars)</option>
              <option value="crow-zero-one">Zero or One (0..1 - O| circle + bar)</option>
              <option value="crow-foot-many">Many (* - &gt;-- crow's foot)</option>
              <option value="crow-foot-one">Exactly One (1 - | single bar)</option>
              <option value="diamond">Diamond (Composition)</option>
              <option value="diamond-filled">Filled Diamond (Aggregation)</option>
              <option value="circle">Circle Marker</option>
              <option value="none">None (Plain Line)</option>
            </select>
          </div>

          {/* Connection Attachment Points (Multi-point sticking) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
                Source Point
              </label>
              <select
                disabled={isReadOnly}
                value={selectedEdge.sourceAnchor || 'bottom'}
                onChange={e => onUpdateEdge?.({ ...selectedEdge, sourceAnchor: e.target.value as NodeAnchor })}
                className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 font-mono ${
                  themeDef.isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {NODE_ANCHOR_DEFINITIONS.map(def => (
                  <option key={def.id} value={def.id}>
                    {def.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
                Target Point
              </label>
              <select
                disabled={isReadOnly}
                value={selectedEdge.targetAnchor || 'top'}
                onChange={e => onUpdateEdge?.({ ...selectedEdge, targetAnchor: e.target.value as NodeAnchor })}
                className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 font-mono ${
                  themeDef.isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {NODE_ANCHOR_DEFINITIONS.map(def => (
                  <option key={def.id} value={def.id}>
                    {def.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stroke Color */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              Line Color
            </label>
            <div className="flex items-center gap-2">
              {edgeColors.map(swatch => (
                <button
                  key={swatch.label}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onUpdateEdge?.({ ...selectedEdge, color: swatch.color })}
                  className="w-6 h-6 rounded-full border border-slate-500/40 hover:scale-125 transition-transform cursor-pointer relative shadow-xs"
                  style={{ backgroundColor: swatch.color }}
                  title={swatch.label}
                >
                  {(selectedEdge.color || '#94a3b8') === swatch.color && (
                    <Check className="w-3.5 h-3.5 text-black absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className={`text-[10px] uppercase font-mono font-bold block mb-1.5 ${themeDef.textMutedClass}`}>
              Connector Label (Cardinality / Action)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              placeholder="e.g. 1..*, has_many, transitions to"
              value={selectedEdge.label || ''}
              onChange={e => onUpdateEdge?.({ ...selectedEdge, label: e.target.value })}
              className={`w-full p-2 rounded-lg border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                themeDef.isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {/* Delete Button */}
          {!isReadOnly && (
            <div className={`pt-3 border-t ${themeDef.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  onDeleteEdge?.(selectedEdge.id);
                  onClose();
                }}
                className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Connector</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Multi-Node Selection Inspector View (Change 3)
  if (selectedNodes && selectedNodes.length > 1) {
    const isReadOnly = userRole === 'viewer';

    const batchUpdateSelectedNodes = (updater: (node: DiagramNode) => DiagramNode) => {
      const updated = currentPage.nodes.map(n => {
        if (selectedNodes.some(sn => sn.id === n.id)) {
          return updater(n);
        }
        return n;
      });
      if (onUpdateNodes) {
        onUpdateNodes(updated);
      } else {
        selectedNodes.forEach(sn => onUpdateNode(updater(sn)));
      }
    };

    const anyGradient = selectedNodes.some(n => n.style?.gradient);

    return (
      <div className={`w-80 h-full border-l flex flex-col select-none transition-colors duration-150 ${themeDef.sidebarClass}`}>
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${themeDef.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${themeDef.isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Multi-Selection
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {selectedNodes.length} nodes selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded cursor-pointer transition-colors ${
              themeDef.isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected Nodes Tag List */}
          <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-indigo-950/20 space-y-1.5">
            <div className="text-[10px] font-mono text-indigo-300 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Selected Entities</span>
              <span className="px-1.5 py-0.2 bg-indigo-500/30 rounded text-[9px]">{selectedNodes.length}</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {selectedNodes.map(n => (
                <span
                  key={n.id}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-200 truncate max-w-[120px]"
                  title={n.label}
                >
                  {n.label}
                </span>
              ))}
            </div>
          </div>

          {/* Color Palettes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Batch Color Palette</span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setPaletteCategory('pastel')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    paletteCategory === 'pastel'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pastels (12)
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteCategory('vibrant')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    paletteCategory === 'vibrant'
                      ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Vibrant (12)
                </button>
              </div>
            </div>

            {/* Swatch Grid */}
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {(paletteCategory === 'pastel' ? PASTEL_COLOR_PALETTES : VIBRANT_COLOR_PALETTES).map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    batchUpdateSelectedNodes(n => ({
                      ...n,
                      style: {
                        ...n.style,
                        fill: p.fill,
                        stroke: p.stroke,
                        textColor: p.textColor,
                      },
                    }));
                  }}
                  className="p-1 rounded-md border border-slate-700/80 hover:scale-105 transition-all flex items-center gap-1 text-left cursor-pointer shadow-xs group"
                  style={{ backgroundColor: p.fill }}
                  title={`Apply ${p.name} to all ${selectedNodes.length} selected nodes`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: p.stroke }}
                  />
                  <span
                    className="text-[9px] font-semibold truncate leading-none"
                    style={{ color: p.textColor }}
                  >
                    {p.name.replace('Pastel ', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Gradual Darkening Fill */}
          <div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => {
                batchUpdateSelectedNodes(n => ({
                  ...n,
                  style: {
                    ...n.style,
                    gradient: !anyGradient,
                  },
                }));
              }}
              className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                anyGradient
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
              }`}
              title="Apply gradual darkening gradient to all selected nodes"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded border border-white/20 shadow-sm shrink-0"
                  style={{ background: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)' }}
                />
                <div>
                  <div className="font-semibold text-xs text-slate-100">Gradual Darkening Fill</div>
                  <div className="text-[10px] text-slate-400">Darken all selected nodes toward bottom</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                anyGradient ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {anyGradient ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Fill Color</label>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded p-1">
                <input
                  type="color"
                  disabled={isReadOnly}
                  value={selectedNodes[0].style?.fill?.startsWith('#') ? selectedNodes[0].style.fill : '#1e293b'}
                  onChange={e => {
                    const newFill = e.target.value;
                    batchUpdateSelectedNodes(n => ({
                      ...n,
                      style: { ...n.style, fill: newFill },
                    }));
                  }}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder="#1e293b"
                  value={selectedNodes[0].style?.fill || ''}
                  onChange={e => {
                    const newFill = e.target.value;
                    batchUpdateSelectedNodes(n => ({
                      ...n,
                      style: { ...n.style, fill: newFill },
                    }));
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Border Color</label>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded p-1">
                <input
                  type="color"
                  disabled={isReadOnly}
                  value={selectedNodes[0].style?.stroke?.startsWith('#') ? selectedNodes[0].style.stroke : '#0284c7'}
                  onChange={e => {
                    const newStroke = e.target.value;
                    batchUpdateSelectedNodes(n => ({
                      ...n,
                      style: { ...n.style, stroke: newStroke },
                    }));
                  }}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder="#0284c7"
                  value={selectedNodes[0].style?.stroke || ''}
                  onChange={e => {
                    const newStroke = e.target.value;
                    batchUpdateSelectedNodes(n => ({
                      ...n,
                      style: { ...n.style, stroke: newStroke },
                    }));
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Border Width & Style */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Border Width</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 4].map(w => (
                  <button
                    key={w}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      batchUpdateSelectedNodes(n => ({
                        ...n,
                        style: { ...n.style, strokeWidth: w },
                      }));
                    }}
                    className={`py-1 text-xs font-mono rounded border cursor-pointer transition-colors ${
                      (selectedNodes[0].style?.strokeWidth || 2) === w
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Border Style</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'solid', label: 'Solid', dash: undefined },
                  { id: 'dashed', label: 'Dashed', dash: '5 5' },
                  { id: 'dotted', label: 'Dotted', dash: '2 2' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      batchUpdateSelectedNodes(n => ({
                        ...n,
                        style: { ...n.style, strokeDasharray: s.dash },
                      }));
                    }}
                    className={`py-1 text-xs rounded border cursor-pointer transition-colors ${
                      (selectedNodes[0].style?.strokeDasharray || undefined) === s.dash
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Style Button */}
          <div>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => {
                batchUpdateSelectedNodes(n => ({
                  ...n,
                  style: {
                    ...n.style,
                    fill: undefined,
                    stroke: undefined,
                    textColor: undefined,
                    gradient: undefined,
                    strokeWidth: undefined,
                    strokeDasharray: undefined,
                  },
                }));
              }}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Colors ({selectedNodes.length} Nodes)</span>
            </button>
          </div>

          {/* Alignment Tools */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase block">
              Align Selected Nodes
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const minX = Math.min(...selectedNodes.map(n => n.x));
                  batchUpdateSelectedNodes(n => ({ ...n, x: minX }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to left edge"
              >
                Align Left
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const avgX = selectedNodes.reduce((acc, n) => acc + n.x + n.width / 2, 0) / selectedNodes.length;
                  batchUpdateSelectedNodes(n => ({ ...n, x: Math.round(avgX - n.width / 2) }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to center horizontally"
              >
                Center X
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const maxRight = Math.max(...selectedNodes.map(n => n.x + n.width));
                  batchUpdateSelectedNodes(n => ({ ...n, x: maxRight - n.width }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to right edge"
              >
                Align Right
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const minY = Math.min(...selectedNodes.map(n => n.y));
                  batchUpdateSelectedNodes(n => ({ ...n, y: minY }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to top edge"
              >
                Align Top
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const avgY = selectedNodes.reduce((acc, n) => acc + n.y + n.height / 2, 0) / selectedNodes.length;
                  batchUpdateSelectedNodes(n => ({ ...n, y: Math.round(avgY - n.height / 2) }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to center vertically"
              >
                Center Y
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  const maxBottom = Math.max(...selectedNodes.map(n => n.y + n.height));
                  batchUpdateSelectedNodes(n => ({ ...n, y: maxBottom - n.height }));
                }}
                className="py-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer transition-colors"
                title="Align all selected nodes to bottom edge"
              >
                Align Bottom
              </button>
            </div>
          </div>

          {/* Delete Batch Button */}
          {!isReadOnly && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteNodes) {
                    onDeleteNodes(selectedNodes.map(n => n.id));
                  } else {
                    selectedNodes.forEach(n => onDeleteNode(n.id));
                  }
                }}
                className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedNodes.length} Nodes)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    // Do not display properties for page architecture when no node is selected
    return null;
  }

  const isReadOnly = userRole === 'viewer';
  const isReviewer = userRole === 'reviewer';

  // Documentation updater helper
  const updateDocs = (partial: Partial<NonNullable<DiagramNode['documentation']>>) => {
    const currentDocs = selectedNode.documentation || {
      description: '',
      tags: [],
      status: 'draft',
    };
    onUpdateNode({
      ...selectedNode,
      documentation: {
        ...currentDocs,
        ...partial,
        lastEditedBy: 'Current User',
        lastEditedAt: new Date().toISOString(),
      },
    });
  };

  // Add Sticky note
  const handleAddSticky = () => {
    if (!newStickyText.trim()) return;
    const notes = selectedNode.stickyNotes || [];
    const newNote: StickyNote = {
      id: `sn-${Date.now()}`,
      text: newStickyText.trim(),
      color: stickyColor,
      author: 'You',
      updatedAt: 'Just now',
    };
    onUpdateNode({
      ...selectedNode,
      stickyNotes: [...notes, newNote],
    });
    setNewStickyText('');
  };

  // Remove Sticky Note
  const handleRemoveSticky = (id: string) => {
    const notes = selectedNode.stickyNotes || [];
    onUpdateNode({
      ...selectedNode,
      stickyNotes: notes.filter(n => n.id !== id),
    });
  };

  // Add Comment
  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const comments = selectedNode.comments || [];
    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      author: userRole === 'admin' ? 'Sarah Chen (Admin)' : 'You',
      authorColor: userRole === 'admin' ? '#3b82f6' : '#10b981',
      text: newCommentText.trim(),
      createdAt: 'Just now',
    };
    onUpdateNode({
      ...selectedNode,
      comments: [...comments, newComment],
    });
    setNewCommentText('');
  };

  // Add External URL Link (Change 4)
  const handleAddLink = () => {
    if (!newUrlInput.trim()) return;
    const currentLinks = selectedNode.links || [];
    const newLink: NodeUrlLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: newUrlInput.trim(),
      label: newUrlLabel.trim() || newUrlInput.trim().replace(/^https?:\/\//, '').split('/')[0] || 'Link',
    };
    onUpdateNode({
      ...selectedNode,
      links: [...currentLinks, newLink],
    });
    setNewUrlInput('');
    setNewUrlLabel('');
  };

  // Remove External URL Link
  const handleRemoveLink = (linkId: string) => {
    const currentLinks = selectedNode.links || [];
    onUpdateNode({
      ...selectedNode,
      links: currentLinks.filter(l => l.id !== linkId),
    });
  };

  return (
    <div className={`w-80 h-full border-l flex flex-col select-none transition-colors duration-150 ${themeDef.sidebarClass}`}>
      {/* Inspector Header */}
      <div className={`p-3 border-b flex items-center justify-between ${themeDef.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 truncate">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className={`text-xs font-bold truncate ${themeDef.isDark ? 'text-slate-100' : 'text-slate-900'}`}>{selectedNode.label}</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded cursor-pointer transition-colors ${
            themeDef.isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
          title="Close Inspector"
          aria-label="Close properties panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('props')}
          className={`flex-1 py-2 text-center border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'props'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-2 text-center border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'docs'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Docs &amp; Notes
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-2 text-center border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'comments'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Comments
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-2 text-center border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'group'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Hierarchy
        </button>
      </div>

      {/* Tab 1: Properties */}
      {activeTab === 'props' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Node Title / Label</label>
            <input
              type="text"
              disabled={isReadOnly}
              value={selectedNode.label}
              onChange={e => onUpdateNode({ ...selectedNode, label: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Sticky Note Color Switcher (Change 2: Customizable Note Colors) */}
          {selectedNode.type === 'sticky-note' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <label className="text-[10px] uppercase font-mono text-amber-300 font-bold block">
                Sticky Note Color Preset
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { name: 'Yellow', fill: '#fef08a', stroke: '#eab308', text: '#713f12' },
                  { name: 'Pink', fill: '#fce7f3', stroke: '#f472b6', text: '#831843' },
                  { name: 'Green', fill: '#dcfce7', stroke: '#4ade80', text: '#14532d' },
                  { name: 'Blue', fill: '#e0f2fe', stroke: '#38bdf8', text: '#0c4a6e' },
                  { name: 'Purple', fill: '#f3e8ff', stroke: '#c084fc', text: '#581c87' },
                  { name: 'Orange', fill: '#ffedd5', stroke: '#fb923c', text: '#7c2d12' },
                ].map(col => (
                  <button
                    key={col.name}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          fill: col.fill,
                          stroke: col.stroke,
                          textColor: col.text,
                        },
                        data: {
                          ...selectedNode.data,
                          color: col.name.toLowerCase(),
                        },
                      });
                    }}
                    className="h-7 rounded border border-black/20 hover:scale-105 transition-all cursor-pointer shadow-xs"
                    style={{ backgroundColor: col.fill, borderColor: col.stroke }}
                    title={`${col.name} Note`}
                  />
                ))}
              </div>

              {/* Direct Docs & Notes Content for Sticky Note (Change 4) */}
              <div className="pt-2 border-t border-amber-500/20">
                <label className="text-[10px] uppercase font-mono text-amber-300 font-bold block mb-1">
                  Docs & Notes Text
                </label>
                <textarea
                  rows={4}
                  disabled={isReadOnly}
                  value={selectedNode.documentation?.description || ''}
                  onChange={e => {
                    const desc = e.target.value;
                    const currentDocs = selectedNode.documentation || {
                      description: '',
                      tags: ['Notes'],
                      status: 'draft',
                    };
                    onUpdateNode({
                      ...selectedNode,
                      documentation: { ...currentDocs, description: desc },
                    });
                  }}
                  placeholder="Enter docs, commentary, and notes to show on this sticky note..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50 font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* External URL Links Management Section (Change 4: Labeled URLs opening in new tab) */}
          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs">
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>External URL Links ({(selectedNode.links || []).length})</span>
              </div>
            </div>

            {/* List of current links */}
            {(selectedNode.links || []).length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedNode.links!.map(link => (
                  <div
                    key={link.id}
                    className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="truncate min-w-0 flex-1">
                      <div className="font-semibold text-sky-200 text-xs truncate flex items-center gap-1">
                        <span>{link.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {link.url}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-sky-600/30 hover:bg-sky-500 text-sky-200 hover:text-white cursor-pointer transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(link.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Remove link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Attach labeled links to this node. Clicking a link opens it in a new browser tab.
              </p>
            )}

            {/* Add new link form */}
            {!isReadOnly && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Add URL Link</span>
                <input
                  type="text"
                  placeholder="URL (e.g. https://example.com/docs)"
                  value={newUrlInput}
                  onChange={e => setNewUrlInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddLink();
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Label (e.g. Architecture RFC)"
                    value={newUrlLabel}
                    onChange={e => setNewUrlLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddLink();
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newUrlInput.trim()}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-medium rounded text-xs cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Child Diagrams Card in Properties Tab (1-Click Navigate) */}
          {(() => {
            const childDiagrams = getNodeChildDiagrams(selectedNode);
            return (
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                    <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                    <span>Child Diagrams ({childDiagrams.length})</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onOpenChildDiagramModal?.(selectedNode)}
                      className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Child</span>
                    </button>
                  )}
                </div>

                {childDiagrams.length === 0 ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 py-1">
                    <span>Break down this node into a sub-diagram.</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => onOpenChildDiagramModal?.(selectedNode)}
                        className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                      >
                        Create
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {childDiagrams.map((child, idx) => (
                      <div
                        key={child.id || child.filename || idx}
                        className="p-2 rounded-lg bg-slate-950/90 border border-purple-500/30 flex items-center justify-between gap-1.5"
                      >
                        <div className="truncate min-w-0 flex-1">
                          <div className="font-bold text-purple-200 text-xs truncate flex items-center gap-1">
                            <span>{child.title || child.filename}</span>
                            {child.diagramType && (
                              <span className="text-[8px] uppercase font-mono px-1 py-0.2 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 shrink-0">
                                {child.diagramType}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{child.filename}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavigateChildDiagram?.(child.filename)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-md shadow-purple-600/30"
                            title={`Navigate to ${child.title || child.filename}`}
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onUnlinkChildDiagram) {
                                  onUnlinkChildDiagram(selectedNode.id, child.filename);
                                } else {
                                  const nextChildren = childDiagrams.filter(c => c.filename !== child.filename);
                                  const primary = nextChildren[0];
                                  onUpdateNode({
                                    ...selectedNode,
                                    childDiagrams: nextChildren,
                                    childDiagramFilename: primary ? primary.filename : undefined,
                                    childDiagramTitle: primary ? primary.title : undefined,
                                    childDiagramType: primary ? primary.diagramType : undefined,
                                  });
                                }
                              }}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 cursor-pointer"
                              title="Unlink this child diagram"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Node Appearance & Color Palette (Universal for Mindmap, Flowchart, and all nodes) */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                <span>Appearance &amp; Colors</span>
              </label>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  onUpdateNode({
                    ...selectedNode,
                    style: {
                      ...selectedNode.style,
                      fill: undefined,
                      stroke: undefined,
                      textColor: undefined,
                      rounded: undefined,
                    },
                  });
                }}
                className="text-[9px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer"
                title="Reset to default node colors"
              >
                Reset Default
              </button>
            </div>

            {/* Extended Color Palettes (Pastel & Vibrant Collections - 24 Options) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-semibold">Color Palettes</span>
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => setPaletteCategory('pastel')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      paletteCategory === 'pastel'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pastels (12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteCategory('vibrant')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      paletteCategory === 'vibrant'
                        ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Vibrant (12)
                  </button>
                </div>
              </div>

              {/* Swatch Grid */}
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                {(paletteCategory === 'pastel' ? PASTEL_COLOR_PALETTES : VIBRANT_COLOR_PALETTES).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          fill: p.fill,
                          stroke: p.stroke,
                          textColor: p.textColor,
                        },
                      });
                    }}
                    className="p-1 rounded-md border border-slate-700/80 hover:scale-105 transition-all flex items-center gap-1 text-left cursor-pointer shadow-xs group"
                    style={{ backgroundColor: p.fill }}
                    title={`${p.name} (Fill: ${p.fill}, Border: ${p.stroke})`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                      style={{ backgroundColor: p.stroke }}
                    />
                    <span
                      className="text-[9px] font-semibold truncate leading-none"
                      style={{ color: p.textColor }}
                    >
                      {p.name.replace('Pastel ', '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gradual Darkening Gradient Toggle Option */}
            <div className="pt-1">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  onUpdateNode({
                    ...selectedNode,
                    style: {
                      ...selectedNode.style,
                      gradient: !selectedNode.style?.gradient,
                    },
                  });
                }}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedNode.style?.gradient
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                }`}
                title="When enabled, the node background gradually darkens from top to bottom"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border border-white/20 shadow-sm shrink-0"
                    style={{
                      background: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)',
                    }}
                  />
                  <div>
                    <div className="font-semibold text-xs text-slate-100">Gradual Darkening Fill</div>
                    <div className="text-[10px] text-slate-400">Darkens smoothly toward the bottom of the node</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedNode.style?.gradient ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {selectedNode.style?.gradient ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fill Background</label>
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded p-1">
                  <input
                    type="color"
                    disabled={isReadOnly}
                    value={
                      selectedNode.style?.fill?.startsWith('#')
                        ? selectedNode.style.fill
                        : '#1e293b'
                    }
                    onChange={e => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          fill: e.target.value,
                        },
                      });
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={selectedNode.style?.fill || ''}
                    placeholder="#1e293b"
                    onChange={e => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          fill: e.target.value,
                        },
                      });
                    }}
                    className="w-full bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Border / Stroke</label>
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded p-1">
                  <input
                    type="color"
                    disabled={isReadOnly}
                    value={
                      selectedNode.style?.stroke?.startsWith('#')
                        ? selectedNode.style.stroke
                        : '#3b82f6'
                    }
                    onChange={e => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          stroke: e.target.value,
                        },
                      });
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={selectedNode.style?.stroke || ''}
                    placeholder="#3b82f6"
                    onChange={e => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          stroke: e.target.value,
                        },
                      });
                    }}
                    className="w-full bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Corner Radius (Rounded Pill for Mindmaps vs Square) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Corner Rounding</span>
                <span className="font-mono text-sky-400">
                  {selectedNode.style?.rounded !== undefined
                    ? `${selectedNode.style.rounded}px`
                    : selectedNode.type === 'mindmap-node'
                    ? 'Pill (Mindmap)'
                    : '8px (Default)'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Square (0)', val: 0 },
                  { label: 'Slight (6px)', val: 6 },
                  { label: 'Medium (12px)', val: 12 },
                  { label: 'Pill / Oval', val: 9999 },
                ].map(r => (
                  <button
                    key={r.label}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      onUpdateNode({
                        ...selectedNode,
                        style: {
                          ...selectedNode.style,
                          rounded: r.val,
                        },
                      });
                    }}
                    className={`flex-1 py-1 text-[9px] rounded border transition-colors cursor-pointer ${
                      selectedNode.style?.rounded === r.val
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {r.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Specialized ERD Attributes & Columns Schema Editor */}
          {selectedNode.type === 'erd-entity' && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] uppercase font-mono text-sky-400 font-bold flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" />
                    ERD Columns Schema
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {(selectedNode.data?.fields || []).length} columns defined
                  </span>
                </div>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const fields = selectedNode.data?.fields || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        fields: [
                          ...fields,
                          { name: `col_${fields.length + 1}`, type: 'VARCHAR(255)', isPk: false, isFk: false, isNullable: true },
                        ],
                      },
                    });
                  }}
                  className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-semibold cursor-pointer transition-colors shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Column
                </button>
              </div>

              {/* Quick Schema Helpers */}
              <div className="flex flex-wrap gap-1 p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
                <span className="text-[9px] text-slate-400 font-mono w-full">Quick Schema Helpers:</span>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const fields = selectedNode.data?.fields || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        fields: [{ name: 'id', type: 'UUID', isPk: true, isFk: false, unique: true }, ...fields],
                      },
                    });
                  }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-[9px] text-amber-300 font-mono cursor-pointer"
                  title="Add Primary Key id UUID column"
                >
                  + PK id
                </button>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const fields = selectedNode.data?.fields || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        fields: [
                          ...fields,
                          { name: 'created_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false },
                          { name: 'updated_at', type: 'TIMESTAMPTZ', isPk: false, isFk: false },
                        ],
                      },
                    });
                  }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-[9px] text-sky-300 font-mono cursor-pointer"
                  title="Add created_at and updated_at timestamps"
                >
                  + Timestamps
                </button>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const fields = selectedNode.data?.fields || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        fields: [
                          ...fields,
                          { name: 'status', type: 'VARCHAR(50)', isPk: false, isFk: false },
                        ],
                      },
                    });
                  }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-[9px] text-emerald-300 font-mono cursor-pointer"
                >
                  + Status
                </button>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const fields = selectedNode.data?.fields || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        fields: [
                          ...fields,
                          { name: 'user_id', type: 'UUID', isPk: false, isFk: true },
                        ],
                      },
                    });
                  }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded text-[9px] text-purple-300 font-mono cursor-pointer"
                  title="Add user_id foreign key"
                >
                  + FK User
                </button>
              </div>

              {/* Columns List with In-Depth Controls */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(selectedNode.data?.fields || []).map((col: any, idx: number) => (
                  <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 group">
                    <div className="flex items-center gap-1.5">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={isReadOnly || idx === 0}
                          onClick={() => {
                            const fields = [...(selectedNode.data?.fields || [])];
                            const temp = fields[idx];
                            fields[idx] = fields[idx - 1];
                            fields[idx - 1] = temp;
                            onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                          }}
                          className="text-slate-500 hover:text-slate-200 disabled:opacity-20 p-0.2 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          disabled={isReadOnly || idx === (selectedNode.data?.fields?.length || 1) - 1}
                          onClick={() => {
                            const fields = [...(selectedNode.data?.fields || [])];
                            const temp = fields[idx];
                            fields[idx] = fields[idx + 1];
                            fields[idx + 1] = temp;
                            onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                          }}
                          className="text-slate-500 hover:text-slate-200 disabled:opacity-20 p-0.2 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Column Name */}
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={col.name}
                        onChange={e => {
                          const fields = [...(selectedNode.data?.fields || [])];
                          fields[idx] = { ...fields[idx], name: e.target.value };
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        placeholder="column_name"
                        className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                      />

                      {/* Delete Button */}
                      <button
                        disabled={isReadOnly}
                        onClick={() => {
                          const fields = (selectedNode.data?.fields || []).filter((_: any, i: number) => i !== idx);
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer rounded hover:bg-slate-900"
                        title="Delete Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Type & Constraint Badges Row */}
                    <div className="flex items-center gap-1.5">
                      {/* Data Type input */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={col.type}
                          onChange={e => {
                            const fields = [...(selectedNode.data?.fields || [])];
                            fields[idx] = { ...fields[idx], type: e.target.value };
                            onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                          }}
                          placeholder="DATA_TYPE"
                          className="w-full bg-slate-900 border border-slate-700/60 rounded px-1.5 py-0.5 text-sky-300 font-mono text-[10px] uppercase focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Constraints Toggles */}
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const fields = [...(selectedNode.data?.fields || [])];
                          fields[idx] = { ...fields[idx], isPk: !fields[idx].isPk };
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors border cursor-pointer ${
                          col.isPk
                            ? 'bg-amber-500/30 text-amber-300 border-amber-500/70 shadow-sm'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                        title="Toggle Primary Key"
                      >
                        PK
                      </button>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const fields = [...(selectedNode.data?.fields || [])];
                          fields[idx] = { ...fields[idx], isFk: !fields[idx].isFk };
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors border cursor-pointer ${
                          col.isFk
                            ? 'bg-purple-500/30 text-purple-300 border-purple-500/70 shadow-sm'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                        title="Toggle Foreign Key"
                      >
                        FK
                      </button>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const fields = [...(selectedNode.data?.fields || [])];
                          fields[idx] = { ...fields[idx], isUnique: !fields[idx].isUnique };
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors border cursor-pointer ${
                          col.isUnique
                            ? 'bg-teal-500/30 text-teal-300 border-teal-500/70 shadow-sm'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                        title="Toggle Unique Constraint"
                      >
                        UQ
                      </button>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const fields = [...(selectedNode.data?.fields || [])];
                          fields[idx] = { ...fields[idx], isNullable: !fields[idx].isNullable };
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors border cursor-pointer ${
                          col.isNullable
                            ? 'bg-slate-700 text-slate-200 border-slate-600'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                        title="Toggle Nullable"
                      >
                        NULL
                      </button>
                    </div>

                    {/* Quick Types Row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-[8px] font-mono text-slate-500 pt-0.5">
                      {['UUID', 'INT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'TIMESTAMPTZ', 'DECIMAL', 'JSONB'].map(qt => (
                        <button
                          key={qt}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            const fields = [...(selectedNode.data?.fields || [])];
                            fields[idx] = { ...fields[idx], type: qt === 'VARCHAR' ? 'VARCHAR(255)' : qt };
                            onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, fields } });
                          }}
                          className="hover:text-sky-300 hover:underline cursor-pointer"
                        >
                          {qt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specialized UML Class Attributes & Methods */}
          {selectedNode.type === 'uml-class' && (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              {/* Stereotype */}
              <div>
                <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold block mb-1">
                  Stereotype
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={selectedNode.data?.stereotype || ''}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, stereotype: e.target.value } })}
                  placeholder="e.g. interface, entity, service"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono text-xs"
                />
              </div>

              {/* Attributes Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold">
                    Class Attributes
                  </label>
                  <button
                    disabled={isReadOnly}
                    onClick={() => {
                      const attrs = selectedNode.data?.attributes || [];
                      onUpdateNode({
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                          attributes: [...attrs, '- newField: string'],
                        },
                      });
                    }}
                    className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-mono cursor-pointer"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {(selectedNode.data?.attributes || []).map((attr: string, i: number) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={attr}
                        onChange={e => {
                          const attrs = [...(selectedNode.data?.attributes || [])];
                          attrs[i] = e.target.value;
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, attributes: attrs } });
                        }}
                        className="flex-1 bg-transparent text-cyan-200 font-mono text-xs focus:outline-none"
                      />
                      <button
                        disabled={isReadOnly}
                        onClick={() => {
                          const attrs = (selectedNode.data?.attributes || []).filter((_: any, idx: number) => idx !== i);
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, attributes: attrs } });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Methods Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold">
                    Class Methods
                  </label>
                  <button
                    disabled={isReadOnly}
                    onClick={() => {
                      const methods = selectedNode.data?.methods || [];
                      onUpdateNode({
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                          methods: [...methods, '+ execute(): void'],
                        },
                      });
                    }}
                    className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-mono cursor-pointer"
                  >
                    + Add Method
                  </button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {(selectedNode.data?.methods || []).map((m: string, i: number) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={m}
                        onChange={e => {
                          const methods = [...(selectedNode.data?.methods || [])];
                          methods[i] = e.target.value;
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, methods } });
                        }}
                        className="flex-1 bg-transparent text-cyan-200 font-mono text-xs focus:outline-none"
                      />
                      <button
                        disabled={isReadOnly}
                        onClick={() => {
                          const methods = (selectedNode.data?.methods || []).filter((_: any, idx: number) => idx !== i);
                          onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, methods } });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Specialized Swimlane Pool / Lanes Editor */}
          {selectedNode.type === 'swimlane-pool' && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-mono text-blue-400 font-bold flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Swimlanes (Partitions)
                </label>
                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    const lanes = selectedNode.data?.lanes || [];
                    onUpdateNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        lanes: [...lanes, `Lane ${lanes.length + 1}`],
                      },
                    });
                  }}
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-mono cursor-pointer"
                >
                  + Add Lane
                </button>
              </div>
              <div className="space-y-1.5">
                {(selectedNode.data?.lanes || []).map((lane: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={lane}
                      onChange={e => {
                        const next = [...(selectedNode.data?.lanes || [])];
                        next[idx] = e.target.value;
                        onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, lanes: next } });
                      }}
                      className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none"
                    />
                    <button
                      disabled={isReadOnly}
                      onClick={() => {
                        const next = (selectedNode.data?.lanes || []).filter((_: any, i: number) => i !== idx);
                        onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, lanes: next } });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specialized BPMN Task Configuration */}
          {selectedNode.type === 'bpmn-task' && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[10px] uppercase font-mono text-blue-400 font-bold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                BPMN Task Specifications
              </label>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Task Sub-Type</span>
                <select
                  disabled={isReadOnly}
                  value={selectedNode.data?.taskType || 'user'}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, taskType: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono text-xs"
                >
                  <option value="user">User Task (Manual)</option>
                  <option value="service">Service Task (Automated / API)</option>
                  <option value="send">Send Message Task</option>
                  <option value="receive">Receive Message Task</option>
                  <option value="script">Script Task</option>
                  <option value="subprocess">Sub-Process Container</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Expected SLA / Duration</span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={selectedNode.data?.duration || ''}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, duration: e.target.value } })}
                  placeholder="e.g. 2 hours, 24h SLA"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Universal Custom Key-Value Attributes for ALL Node Types */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                Custom Data &amp; Attributes
              </label>
              <button
                disabled={isReadOnly}
                onClick={() => {
                  const attrs = selectedNode.data?.customAttributes || [];
                  onUpdateNode({
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      customAttributes: [...attrs, { key: 'attribute', value: 'value' }],
                    },
                  });
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-mono cursor-pointer"
              >
                + Add Prop
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(selectedNode.data?.customAttributes || []).length === 0 ? (
                <div className="text-[10px] text-slate-500 italic p-1">
                  No custom attributes added. Click "+ Add Prop" to store metadata like owner, port, cost, SLA, etc.
                </div>
              ) : (
                (selectedNode.data?.customAttributes || []).map((attr: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={attr.key}
                      onChange={e => {
                        const attrs = [...(selectedNode.data?.customAttributes || [])];
                        attrs[idx] = { ...attrs[idx], key: e.target.value };
                        onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, customAttributes: attrs } });
                      }}
                      placeholder="key"
                      className="w-24 bg-transparent text-slate-400 font-mono text-[11px] focus:outline-none"
                    />
                    <span className="text-slate-600">:</span>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={attr.value}
                      onChange={e => {
                        const attrs = [...(selectedNode.data?.customAttributes || [])];
                        attrs[idx] = { ...attrs[idx], value: e.target.value };
                        onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, customAttributes: attrs } });
                      }}
                      placeholder="value"
                      className="flex-1 bg-transparent text-slate-100 font-mono text-[11px] focus:outline-none"
                    />
                    <button
                      disabled={isReadOnly}
                      onClick={() => {
                        const attrs = (selectedNode.data?.customAttributes || []).filter((_: any, i: number) => i !== idx);
                        onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, customAttributes: attrs } });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Specialized PERT Analysis */}
          {selectedNode.type === 'pert-activity' && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[10px] uppercase font-mono text-rose-400 font-bold block">PERT Metrics</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Duration (Days)</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={selectedNode.data?.duration ?? 5}
                    onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, duration: parseInt(e.target.value) || 0 } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Slack Time</span>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={selectedNode.data?.slack ?? 0}
                    onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, slack: parseInt(e.target.value) || 0 } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={!!selectedNode.data?.isCritical}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, isCritical: e.target.checked } })}
                  className="rounded text-rose-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-rose-300">Highlight as Critical Path</span>
              </label>
            </div>
          )}

          {/* Specialized CEQA Settings */}
          {(selectedNode.type === 'ceqa-phase' || selectedNode.type === 'ceqa-review' || selectedNode.type === 'ceqa-eir') && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">CEQA Compliance Mandates</label>
              <div>
                <span className="text-[10px] text-slate-400">Statutory Deadline</span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={selectedNode.data?.deadline || ''}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, deadline: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">CEQA Legal Statute</span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={selectedNode.data?.statute || ''}
                  onChange={e => onUpdateNode({ ...selectedNode, data: { ...selectedNode.data, statute: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Specialized Gantt Task / Milestone Attributes Editor */}
          {selectedNode.type === 'gantt-task' && (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Gantt Task &amp; Progress
                </label>
                <span className="text-[9px] font-mono text-emerald-300 font-semibold">
                  {selectedNode.data?.progress ?? 0}% done
                </span>
              </div>

              {/* Progress Slider & Input */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Progress So Far</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={isReadOnly}
                      value={selectedNode.data?.progress ?? 0}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        onUpdateNode({
                          ...selectedNode,
                          data: { ...selectedNode.data, progress: val },
                        });
                      }}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 font-mono font-bold text-xs text-right"
                    />
                    <span className="text-slate-400 font-mono text-xs">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={isReadOnly}
                  value={selectedNode.data?.progress ?? 0}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, progress: val },
                    });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${selectedNode.data?.progress ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Dates & Duration Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={selectedNode.data?.startDate || ''}
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, startDate: e.target.value },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={selectedNode.data?.endDate || ''}
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, endDate: e.target.value },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Duration & Assignee */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={selectedNode.data?.duration ?? 5}
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, duration: parseInt(e.target.value) || 0 },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Assignee</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={selectedNode.data?.assignee || ''}
                    placeholder="e.g. Alex Chen"
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, assignee: e.target.value },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Task Status</label>
                  <select
                    disabled={isReadOnly}
                    value={selectedNode.data?.status || 'in-progress'}
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, status: e.target.value },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed (100%)</option>
                    <option value="blocked">Blocked</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Priority</label>
                  <select
                    disabled={isReadOnly}
                    value={selectedNode.data?.priority || 'medium'}
                    onChange={e => onUpdateNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, priority: e.target.value },
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Milestone Checkbox */}
              <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={!!selectedNode.data?.isMilestone}
                  onChange={e => onUpdateNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, isMilestone: e.target.checked },
                  })}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <Milestone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-amber-300">Mark as Key Project Milestone</span>
              </label>
            </div>
          )}

          {/* Specialized UML Actor Editor */}
          {(selectedNode.type === 'uml-actor' || selectedNode.type === 'actor') && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">
                UML Actor Notation
              </label>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Actor Stereotype / Role</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={selectedNode.data?.actorType || ''}
                  placeholder="e.g. Primary User, Customer, External System"
                  onChange={e => onUpdateNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, actorType: e.target.value },
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Specialized Flowchart Data Editor */}
          {selectedNode.type === 'flow-data' && (
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <label className="text-[10px] uppercase font-mono text-sky-400 font-bold block">
                Flowchart Data (I/O) Notation
              </label>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">I/O Operation Type</label>
                <select
                  disabled={isReadOnly}
                  value={selectedNode.data?.ioType || 'INPUT'}
                  onChange={e => onUpdateNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, ioType: e.target.value },
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-100 font-mono text-xs"
                >
                  <option value="INPUT">Input (Read)</option>
                  <option value="OUTPUT">Output (Write)</option>
                  <option value="PAYLOAD">Payload / Message</option>
                  <option value="STREAM">Event Stream</option>
                </select>
              </div>
            </div>
          )}

          {/* Delete Node Button */}
          {!isReadOnly && (
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="w-full py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Documentation & Sticky Notes */}
      {activeTab === 'docs' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {/* Documentation Status */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Architecture Status</label>
            <div className="flex items-center gap-1">
              {(['approved', 'in-review', 'draft', 'deprecated'] as const).map(st => (
                <button
                  key={st}
                  disabled={isReadOnly}
                  onClick={() => updateDocs({ status: st })}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-all ${
                    (selectedNode.documentation?.status || 'draft') === st
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Description & Specs */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Documentation &amp; Specifications</label>
            <textarea
              rows={4}
              disabled={isReadOnly}
              value={selectedNode.documentation?.description || ''}
              onChange={e => updateDocs({ description: e.target.value })}
              placeholder="Enter comprehensive node architecture notes, business logic, constraints..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* API Endpoint mapping */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Linked REST API Endpoint</label>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]">
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <input
                type="text"
                disabled={isReadOnly}
                value={selectedNode.documentation?.apiEndpoint || ''}
                onChange={e => updateDocs({ apiEndpoint: e.target.value })}
                placeholder="e.g. POST /api/v1/orders"
                className="w-full bg-transparent focus:outline-none text-slate-100"
              />
            </div>
          </div>

          {/* Sticky Notes section */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono text-amber-300 font-bold flex items-center gap-1">
                <StickyIcon className="w-3.5 h-3.5" />
                Attached Sticky Notes ({selectedNode.stickyNotes?.length || 0})
              </label>
            </div>

            {/* Sticky Notes List */}
            <div className="space-y-2">
              {(selectedNode.stickyNotes || []).map(note => {
                const colorBg =
                  note.color === 'yellow' ? 'bg-amber-100 text-amber-950 border-amber-300' :
                  note.color === 'pink' ? 'bg-rose-100 text-rose-950 border-rose-300' :
                  note.color === 'green' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' :
                  note.color === 'blue' ? 'bg-sky-100 text-sky-950 border-sky-300' :
                  'bg-purple-100 text-purple-950 border-purple-300';
                return (
                  <div key={note.id} className={`p-2.5 rounded border shadow-sm ${colorBg}`}>
                    <div className="flex items-center justify-between text-[10px] font-semibold opacity-75 border-b border-black/10 pb-1 mb-1">
                      <span>{note.author}</span>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemoveSticky(note.id)}
                          className="hover:text-rose-600 cursor-pointer p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-medium leading-relaxed">{note.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Add Sticky Note Form */}
            {!isReadOnly && (
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newStickyText}
                  onChange={e => setNewStickyText(e.target.value)}
                  placeholder="New sticky annotation note..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  {/* Color pickers */}
                  <div className="flex items-center gap-1">
                    {(['yellow', 'pink', 'green', 'blue', 'purple'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setStickyColor(c)}
                        className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                          stickyColor === c ? 'scale-125 ring-2 ring-white' : ''
                        } ${
                          c === 'yellow' ? 'bg-amber-300 border-amber-400' :
                          c === 'pink' ? 'bg-rose-300 border-rose-400' :
                          c === 'green' ? 'bg-emerald-300 border-emerald-400' :
                          c === 'blue' ? 'bg-sky-300 border-sky-400' :
                          'bg-purple-300 border-purple-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddSticky}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-amber-950 rounded text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Attach Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Comments & Team Collaboration */}
      {activeTab === 'comments' && (
        <div className="flex-1 flex flex-col p-3.5 text-xs">
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {(selectedNode.comments || []).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No comments yet. Start a team discussion on this node!
              </div>
            ) : (
              (selectedNode.comments || []).map(comm => (
                <div key={comm.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold" style={{ color: comm.authorColor }}>
                      {comm.author}
                    </span>
                    <span className="text-slate-500 font-mono">{comm.createdAt}</span>
                  </div>
                  <p className="text-slate-200 leading-snug">{comm.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Add comment input */}
          {userRole !== 'viewer' && (
            <div className="pt-2 border-t border-slate-800 mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddComment();
                }}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddComment}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Hierarchy & Nested Grouping */}
      {activeTab === 'group' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {/* Change 4 & User Request 9: Dedicated Child Diagrams (Multi-Child Support) */}
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-mono text-purple-300 font-bold flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                <span>Child Diagrams ({getNodeChildDiagrams(selectedNode).length})</span>
              </label>
              <span className="text-[9px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                Multi-Child Enabled
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every node can link multiple child diagrams of any type. Right-click the node on the canvas to quickly navigate between them.
            </p>

            {(() => {
              const children = getNodeChildDiagrams(selectedNode);
              return (
                <div className="space-y-2 pt-1">
                  {children.length > 0 && (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {children.map((child, idx) => (
                        <div
                          key={child.id || child.filename || idx}
                          className="p-2 bg-slate-950 rounded-lg border border-purple-500/30 flex items-center justify-between gap-2"
                        >
                          <div className="truncate min-w-0 flex-1">
                            <div className="font-bold text-xs text-purple-200 truncate flex items-center gap-1.5">
                              <span>{child.title || child.filename}</span>
                              {child.diagramType && (
                                <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                  {child.diagramType}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {child.filename}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateChildDiagram?.(child.filename);
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-md shadow-purple-600/30"
                              title={`Open child diagram ${child.title || child.filename}`}
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUnlinkChildDiagram) {
                                    onUnlinkChildDiagram(selectedNode.id, child.filename);
                                  } else {
                                    const nextChildren = children.filter(c => c.filename !== child.filename);
                                    const primary = nextChildren[0];
                                    onUpdateNode({
                                      ...selectedNode,
                                      childDiagrams: nextChildren,
                                      childDiagramFilename: primary ? primary.filename : undefined,
                                      childDiagramTitle: primary ? primary.title : undefined,
                                      childDiagramType: primary ? primary.diagramType : undefined,
                                    });
                                  }
                                }}
                                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 cursor-pointer"
                                title="Unlink this child diagram from node"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onOpenChildDiagramModal?.(selectedNode)}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{children.length > 0 ? '+ Add Another Child Diagram' : 'Create / Link Child Diagram'}</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sub-process In-Document Page Drill-down link */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
              Internal Page Drill-Down Link
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Link this node to another page inside this same document file.
            </p>
            <select
              disabled={isReadOnly}
              value={selectedNode.drilldownPageId || ''}
              onChange={e => onUpdateNode({ ...selectedNode, drilldownPageId: e.target.value || undefined })}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none"
            >
              <option value="">None (Standard Node)</option>
              {allPages
                .filter(p => p.id !== currentPage.id)
                .map(page => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.diagramType.toUpperCase()})
                  </option>
                ))}
            </select>

            {selectedNode.drilldownPageId && (
              <button
                onClick={() => {
                  if (selectedNode.drilldownPageId) onDrillDown?.(selectedNode.drilldownPageId);
                }}
                className="mt-2 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Drill-down into Linked Page</span>
              </button>
            )}
          </div>

          {/* Group Parent Container Selection */}
          <div className="pt-3 border-t border-slate-800">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
              Parent Container Enclosure
            </label>
            <select
              disabled={isReadOnly}
              value={selectedNode.parentId || ''}
              onChange={e => onUpdateNode({ ...selectedNode, parentId: e.target.value || undefined })}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none"
            >
              <option value="">No Parent (Root Canvas)</option>
              {currentPage.nodes
                .filter(n => n.isGroup && n.id !== selectedNode.id)
                .map(group => (
                  <option key={group.id} value={group.id}>
                    {group.label} (Container)
                  </option>
                ))}
            </select>
          </div>

          {/* If node is itself a group container */}
          {selectedNode.isGroup && (
            <div className="pt-3 border-t border-slate-800">
              <label className="text-[10px] uppercase font-mono text-blue-400 font-bold block mb-1">
                Child Nodes Inside Container
              </label>
              <div className="space-y-1">
                {currentPage.nodes
                  .filter(n => n.parentId === selectedNode.id)
                  .map(child => (
                    <div key={child.id} className="p-1.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-300">
                      • {child.label} ({child.type})
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
