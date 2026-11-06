/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DiagramNode, Collaborator, getNodeChildDiagrams } from '../../types/diagram';
import {
  Table,
  CheckCircle2,
  GitFork,
  Layers,
  ArrowUpRight,
  FileText,
  StickyNote as StickyIcon,
  Clock,
  Sparkles,
  Database,
  Cpu,
  UserCheck,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Plus,
  ExternalLink,
  Milestone,
  Users,
  FolderTree,
  ChevronDown,
} from 'lucide-react';
import { getNodeBackgroundStyle, getDarkerShade } from '../../utils/colorUtils';
import { NodeAnchor, NODE_ANCHOR_DEFINITIONS } from '../../utils/diagramAnchors';

interface NodeRendererProps {
  node: DiagramNode;
  isSelected: boolean;
  isDragging: boolean;
  collaborators: Collaborator[];
  isDeemphasized?: boolean;
  isConnectingActive?: boolean;
  connectingSourceNodeId?: string | null;
  onMouseEnterNode?: (nodeId: string) => void;
  onMouseLeaveNode?: (nodeId: string) => void;
  onNodeMouseDown?: (nodeId: string, e: React.MouseEvent) => void;
  onStartResize?: (
    nodeId: string,
    direction: 'se' | 'e' | 's' | 'sw' | 'ne' | 'nw' | 'n' | 'w',
    e: React.MouseEvent
  ) => void;
  onDrillDown?: (pageId: string) => void;
  onStartConnection?: (nodeId: string, anchor: NodeAnchor, e: React.MouseEvent) => void;
  onCompleteConnection?: (targetNodeId: string, targetAnchor: NodeAnchor, e: React.MouseEvent) => void;
  onOpenDoc?: (node: DiagramNode) => void;
  onUpdateLabel?: (nodeId: string, newLabel: string) => void;
  onNodeContextMenu?: (nodeId: string, e: React.MouseEvent) => void;
  onOpenChildDiagramModal?: (node: DiagramNode) => void;
  onNavigateChildDiagram?: (filename: string) => void;
  isReadOnly?: boolean;
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  isSelected,
  isDragging,
  collaborators,
  isDeemphasized = false,
  isConnectingActive = false,
  connectingSourceNodeId = null,
  onMouseEnterNode,
  onMouseLeaveNode,
  onNodeMouseDown,
  onStartResize,
  onDrillDown,
  onStartConnection,
  onCompleteConnection,
  onOpenDoc,
  onUpdateLabel,
  onNodeContextMenu,
  onOpenChildDiagramModal,
  onNavigateChildDiagram,
  isReadOnly,
}) => {
  const [isEditingLabel, setIsEditingLabel] = React.useState(false);
  const [editedLabel, setEditedLabel] = React.useState(node.label);
  const [isHovered, setIsHovered] = React.useState(false);
  const [mouseEntryPos, setMouseEntryPos] = React.useState<{ x: number; y: number } | null>(null);
  const [showChildQuickMenu, setShowChildQuickMenu] = React.useState(false);
  const activeCollaborator = collaborators.find(c => c.selectedNodeId === node.id);

  // Render 12 perimeter anchor handles on hover or while connecting
  const renderAnchors = () => {
    if (isReadOnly) return null;
    const isSourceNode = isConnectingActive && connectingSourceNodeId === node.id;
    const isTargetCandidate = isConnectingActive && connectingSourceNodeId !== node.id;

    return (
      <>
        {NODE_ANCHOR_DEFINITIONS.map(def => {
          return (
            <div
              key={def.id}
              data-anchor-id={def.id}
              data-node-id={node.id}
              style={def.positionStyle}
              className="absolute w-7 h-7 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-30 cursor-crosshair pointer-events-auto group/anchor"
              onMouseDown={e => {
                e.stopPropagation();
                onStartConnection?.(node.id, def.id, e);
              }}
              onMouseUp={e => {
                if (isConnectingActive && isTargetCandidate) {
                  e.stopPropagation();
                  onCompleteConnection?.(node.id, def.id, e);
                }
              }}
              onClick={e => {
                if (isConnectingActive && isTargetCandidate) {
                  e.stopPropagation();
                  onCompleteConnection?.(node.id, def.id, e);
                }
              }}
              title={
                isTargetCandidate
                  ? `Stick connection to ${def.label}`
                  : `Connect from ${def.label}`
              }
            >
              {/* Visible anchor point circle with enlarged hover effect */}
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  isTargetCandidate
                    ? 'opacity-100 bg-emerald-400 border-white dark:border-slate-900 scale-140 ring-4 ring-emerald-400/40 animate-pulse'
                    : isSourceNode
                    ? 'opacity-90 bg-blue-600 border-white scale-110'
                    : 'opacity-0 group-hover:opacity-100 group-hover/anchor:opacity-100 bg-sky-500 hover:bg-emerald-400 border-white dark:border-slate-900 shadow-md group-hover/anchor:scale-130'
                }`}
              />
            </div>
          );
        })}
      </>
    );
  };

  // Node Content based on type
  const renderNodeBody = () => {
    switch (node.type) {
      // 1. ERD Entity Table
      case 'erd-entity': {
        const fields = node.data?.fields || [];
        const fill = node.style?.fill || 'rgba(15, 23, 42, 0.95)';
        const stroke = node.style?.stroke || '#0284c7';
        return (
          <div
            className="flex flex-col h-full border-2 rounded-md shadow-xl overflow-hidden text-xs"
            style={{ backgroundColor: fill, borderColor: stroke }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-sky-950/80 border-b border-sky-500/40 text-sky-300 font-semibold tracking-wide">
              <div className="flex items-center gap-1.5 truncate">
                <Table className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{node.data?.tableName || node.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-sky-400/80 font-mono">TABLE</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-900/60 text-sky-300 font-mono">
                  {fields.length} cols
                </span>
              </div>
            </div>
            {/* Fields list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
              {fields.length === 0 ? (
                <div className="p-2 text-center text-[10px] text-slate-500 italic">
                  No columns defined. Select node to add schema in Inspector.
                </div>
              ) : (
                fields.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 hover:bg-slate-800/60 font-mono text-[11px] rounded transition-colors group/col"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {f.isPk && (
                        <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded">
                          PK
                        </span>
                      )}
                      {f.isFk && (
                        <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold rounded">
                          FK
                        </span>
                      )}
                      {f.isUnique && (
                        <span className="px-1 py-0.2 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-bold rounded">
                          UQ
                        </span>
                      )}
                      <span className="text-slate-200 truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 ml-2">
                      <span>{f.type}</span>
                      {f.isNullable && <span className="text-slate-500 text-[8px] italic">null</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      // 2. BPMN Event (Start, Intermediate, End)
      case 'bpmn-event': {
        const eventType = node.data?.eventType || 'start';
        const isEnd = eventType === 'end';
        const defaultFill = isEnd ? '#ef4444' : '#10b981';
        const defaultStroke = isEnd ? '#b91c1c' : '#059669';
        const fill = node.style?.fill || defaultFill;
        const stroke = node.style?.stroke || defaultStroke;

        return (
          <div
            className="flex flex-col items-center justify-center h-full rounded-full shadow-lg text-white font-medium p-2 text-center transition-all"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: isEnd ? '4px' : '2px',
            }}
          >
            <span className="text-[11px] leading-tight px-1 font-semibold truncate max-w-[90%]">
              {node.label}
            </span>
          </div>
        );
      }

      // 3. BPMN Task / Sub-Process
      case 'bpmn-task': {
        const isSubprocess = node.data?.taskType === 'subprocess' || !!node.drilldownPageId;
        const defaultFill = isSubprocess ? 'rgba(88, 28, 135, 0.85)' : 'rgba(15, 23, 42, 0.95)';
        const defaultStroke = isSubprocess ? '#a855f7' : '#3b82f6';
        const fill = node.style?.fill || defaultFill;
        const stroke = node.style?.stroke || defaultStroke;

        return (
          <div
            className="flex flex-col justify-between h-full p-2.5 rounded-lg shadow-xl text-left border-2 transition-all"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderStyle: isSubprocess ? 'dashed' : 'solid',
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                {isSubprocess ? <Layers className="w-3 h-3 text-purple-400" /> : <Cpu className="w-3 h-3 text-blue-400" />}
                {node.data?.taskType || 'Task'}
              </span>
              {node.drilldownPageId && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (node.drilldownPageId) onDrillDown?.(node.drilldownPageId);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/30 hover:bg-purple-500 text-purple-200 hover:text-white rounded text-[10px] font-semibold transition-all cursor-pointer shadow-sm"
                  title="Drill down into sub-process diagram"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Drill-down
                </button>
              )}
            </div>

            <div className="font-medium text-xs text-slate-100 leading-snug line-clamp-2 my-1">
              {node.label}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
              <span>{node.data?.duration || 'Standard SLA'}</span>
              {isSubprocess && <span className="font-mono text-purple-300 font-bold">[ + ]</span>}
            </div>
          </div>
        );
      }

      // 4. True Geometric Diamond Rhombus (ERD Relationship, Flow Decision, BPMN Gateway)
      case 'bpmn-gateway':
      case 'flow-decision':
      case 'erd-relation': {
        const isBPMN = node.type === 'bpmn-gateway';
        const fill = node.style?.fill || (isBPMN ? '#f59e0b' : 'rgba(30, 41, 59, 0.95)');
        const stroke = node.style?.stroke || (isBPMN ? '#d97706' : '#0ea5e9');
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';

        // Half-dimensions for geometric rhombus:
        // Top: (w/2, pad)
        // Right: (w - pad, h/2)
        // Bottom: (w/2, h - pad)
        // Left: (pad, h/2)
        const w = node.width;
        const h = node.height;
        const pad = Math.max(strokeWidth, 2);
        const points = `${w / 2},${pad} ${w - pad},${h / 2} ${w / 2},${h - pad} ${pad},${h / 2}`;

        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-md"
              viewBox={`0 0 ${w} ${h}`}
            >
              <polygon
                points={points}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={node.style?.strokeDasharray}
                strokeLinejoin="round"
              />
            </svg>
            <div className="relative z-10 text-center px-4 max-w-[80%] flex flex-col items-center justify-center pointer-events-none select-none">
              <span
                className="font-semibold text-xs leading-tight line-clamp-2"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
              {node.data?.relationshipType && (
                <span className="text-[9px] font-mono opacity-80 mt-0.5 px-1.5 py-0.2 bg-black/40 rounded text-cyan-200">
                  {node.data.relationshipType}
                </span>
              )}
            </div>
          </div>
        );
      }

      // Cloud Storage Bucket Shape (AWS S3, Google Cloud Storage, Azure Blob)
      case 'cloud-bucket': {
        const fill = node.style?.fill || 'rgba(15, 23, 42, 0.95)';
        const stroke = node.style?.stroke || '#0284c7';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#38bdf8';
        const w = node.width;
        const h = node.height;

        return (
          <div className="relative w-full h-full flex flex-col items-center justify-between p-2 overflow-visible">
            {/* SVG Bucket graphic */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-lg"
              viewBox={`0 0 ${w} ${h}`}
            >
              {/* Arched bucket handle */}
              <path
                d={`M ${w * 0.25} ${h * 0.28} C ${w * 0.25} ${h * 0.04}, ${w * 0.75} ${h * 0.04}, ${w * 0.75} ${h * 0.28}`}
                fill="none"
                stroke={stroke}
                strokeWidth={Math.max(strokeWidth - 0.5, 1.5)}
                strokeDasharray="3 2"
              />
              {/* Bucket Body (tapered cylinder) */}
              <path
                d={`M ${w * 0.12} ${h * 0.3} 
                   C ${w * 0.12} ${h * 0.4}, ${w * 0.18} ${h * 0.85}, ${w * 0.22} ${h * 0.92}
                   C ${w * 0.35} ${h * 0.98}, ${w * 0.65} ${h * 0.98}, ${w * 0.78} ${h * 0.92}
                   C ${w * 0.82} ${h * 0.85}, ${w * 0.88} ${h * 0.4}, ${w * 0.88} ${h * 0.3} Z`}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
              />
              {/* Bucket Rim (Top Ellipse) */}
              <ellipse
                cx={w / 2}
                cy={h * 0.3}
                rx={w * 0.38}
                ry={h * 0.11}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              {/* Inner Rim depth */}
              <ellipse
                cx={w / 2}
                cy={h * 0.3}
                rx={w * 0.32}
                ry={h * 0.07}
                fill="rgba(0, 0, 0, 0.3)"
              />
              {/* Horizontal decorative bucket ring */}
              <path
                d={`M ${w * 0.16} ${h * 0.58} C ${w * 0.32} ${h * 0.66}, ${w * 0.68} ${h * 0.66}, ${w * 0.84} ${h * 0.58}`}
                fill="none"
                stroke={stroke}
                strokeWidth={1}
                opacity={0.6}
              />
            </svg>

            {/* Bucket Content & Label */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pt-5 px-2 text-center pointer-events-none select-none">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-black/40 px-1.5 py-0.5 rounded border border-sky-500/30 mb-1">
                <Database className="w-3 h-3" />
                <span>{node.data?.storageClass || 'BUCKET'}</span>
              </div>
              <span
                className="text-xs font-bold leading-tight line-clamp-2 max-w-[90%]"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
              {node.data?.region && (
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 truncate max-w-[85%]">
                  {node.data.region}
                </span>
              )}
            </div>
          </div>
        );
      }

      // 5. Swimlane Pool / Container
      case 'swimlane-pool': {
        const lanes: string[] = node.data?.lanes || ['Default Lane'];
        return (
          <div className="flex flex-col h-full border-2 border-blue-500/60 bg-slate-900/40 rounded-lg shadow-sm overflow-hidden pointer-events-auto">
            {/* Pool Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-blue-950/70 border-b border-blue-500/40 text-blue-300 font-semibold text-xs tracking-wider">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                {node.label}
              </span>
              <span className="text-[10px] text-blue-400/80 font-mono">POOL CONTAINER</span>
            </div>
            {/* Lanes Visual Breakdown */}
            <div className="flex-1 flex flex-col divide-y divide-blue-500/20">
              {lanes.map((lane, i) => (
                <div key={i} className="flex-1 p-2 bg-slate-950/20 relative">
                  <span className="text-[11px] font-mono uppercase text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                    {lane}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 6. Generic Nested Group Container
      case 'group-container': {
        return (
          <div className="flex flex-col h-full border-2 border-dashed border-slate-500/70 bg-slate-900/30 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1 border-b border-slate-700/40">
              <span>{node.label}</span>
              <span className="text-[10px] font-mono text-slate-400">NESTED GROUP</span>
            </div>
          </div>
        );
      }

      // 7. UML Class
      case 'uml-class': {
        const attrs = node.data?.attributes || [];
        const methods = node.data?.methods || [];
        const defaultFill = 'rgba(15, 23, 42, 0.95)';
        const defaultStroke = '#06b6d4';
        const fill = node.style?.fill || defaultFill;
        const stroke = node.style?.stroke || defaultStroke;

        return (
          <div
            className="flex flex-col h-full rounded-md shadow-xl overflow-hidden text-xs transition-colors"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: `${node.style?.strokeWidth ?? 2}px`,
              borderStyle: 'solid',
            }}
          >
            <div className="px-3 py-1.5 bg-black/40 border-b border-white/10 text-center">
              {node.data?.stereotype && (
                <div className="text-[10px] text-cyan-400 font-mono">«{node.data.stereotype}»</div>
              )}
              <div className="font-bold text-white truncate">{node.label}</div>
            </div>
            {/* Attributes */}
            <div className="px-2.5 py-1.5 border-b border-white/10 font-mono text-[11px] text-slate-300 divide-y divide-white/5 max-h-[80px] overflow-y-auto">
              {attrs.map((a: string, i: number) => (
                <div key={i} className="py-0.5 truncate">{a}</div>
              ))}
            </div>
            {/* Methods */}
            <div className="flex-1 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 divide-y divide-white/5 overflow-y-auto">
              {methods.map((m: string, i: number) => (
                <div key={i} className="py-0.5 text-cyan-200 truncate">{m}</div>
              ))}
            </div>
          </div>
        );
      }

      // 8. DFD Process (Round bubble)
      case 'dfd-process': {
        const fill = node.style?.fill || 'rgba(3, 105, 161, 0.85)';
        const stroke = node.style?.stroke || '#38bdf8';
        return (
          <div
            className="flex flex-col items-center justify-center h-full rounded-full text-sky-100 p-3 shadow-xl text-center transition-colors"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: `${node.style?.strokeWidth ?? 2}px`,
            }}
          >
            <span className="text-[10px] font-mono text-sky-300 font-bold">{node.data?.processNumber || '1.0'}</span>
            <span className="text-xs font-semibold leading-tight mt-1 line-clamp-3">{node.label}</span>
          </div>
        );
      }

      // 9. DFD Store (Yourdon Open Box)
      case 'dfd-store': {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.9)';
        const stroke = node.style?.stroke || '#fbbf24';
        return (
          <div
            className="flex items-center justify-start h-full px-3 shadow-lg transition-colors"
            style={{
              backgroundColor: fill,
              borderTopColor: stroke,
              borderBottomColor: stroke,
              borderTopWidth: '2px',
              borderBottomWidth: '2px',
            }}
          >
            <span className="font-mono text-xs font-bold text-amber-400 mr-2 border-r border-amber-500/40 pr-2">
              {node.data?.storeId || 'D1'}
            </span>
            <span className="text-xs font-medium text-slate-200 truncate">{node.label}</span>
          </div>
        );
      }

      // 10. DFD External Entity
      case 'dfd-entity': {
        const fill = node.style?.fill || 'rgba(51, 65, 85, 0.9)';
        const stroke = node.style?.stroke || '#94a3b8';
        return (
          <div
            className="flex items-center justify-center h-full rounded p-2 text-center shadow-lg transition-colors"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: '2px',
            }}
          >
            <span className="text-xs font-semibold text-slate-200">{node.label}</span>
          </div>
        );
      }

      // 11. IDEF0 Box
      case 'idef0-box': {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.95)';
        const stroke = node.style?.stroke || '#3b82f6';
        return (
          <div
            className="flex flex-col justify-between h-full rounded p-3 text-left shadow-xl transition-colors"
            style={{
              backgroundColor: fill,
              borderColor: stroke,
              borderWidth: '2px',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 font-mono">{node.data?.boxNumber || 'A0'}</span>
              <span className="text-[9px] font-mono text-slate-400">IDEF0 FUNCTION</span>
            </div>
            <div className="text-xs font-semibold text-slate-100 my-auto text-center px-1">
              {node.label}
            </div>
            <div className="text-[9px] text-slate-400 flex justify-between border-t border-slate-800 pt-1">
              <span>I/C</span>
              <span>O/M</span>
            </div>
          </div>
        );
      }

      // 12. CEQA Phase Box
      case 'ceqa-phase':
      case 'ceqa-review':
      case 'ceqa-eir': {
        return (
          <div className="flex flex-col justify-between h-full bg-slate-900/95 border-2 border-emerald-500/90 rounded-lg p-2.5 shadow-xl text-left">
            <div className="flex items-center justify-between text-[10px]">
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded font-mono">
                {node.data?.phaseNumber || 'CEQA'}
              </span>
              <span className="text-slate-400 font-mono text-[9px] truncate max-w-[100px]">
                {node.data?.statute || 'CEQA § 15000'}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 my-1 line-clamp-2">
              {node.label}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono pt-1 border-t border-slate-800">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="truncate">{node.data?.deadline || 'Statutory review'}</span>
            </div>
          </div>
        );
      }

      // 13. SIPOC Card
      case 'sipoc-card': {
        const items = node.data?.items || [];
        return (
          <div className="flex flex-col h-full bg-slate-900/95 border-2 border-amber-500/80 rounded-lg shadow-xl overflow-hidden text-xs">
            <div className="px-2.5 py-1.5 bg-amber-950/80 border-b border-amber-500/40 font-bold text-amber-300 text-center tracking-wider">
              {node.label}
            </div>
            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
              {items.map((item: string, idx: number) => (
                <div key={idx} className="p-1.5 bg-slate-800/80 rounded border border-slate-700/60 text-[11px] text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 14. PERT Activity Node (6-Quadrant)
      case 'pert-activity': {
        const isCritical = node.data?.isCritical;
        return (
          <div
            className={`flex flex-col h-full bg-slate-900 border-2 rounded-md shadow-2xl overflow-hidden text-xs ${
              isCritical ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-blue-500'
            }`}
          >
            {/* Top row: ES | Duration | EF */}
            <div className="grid grid-cols-3 text-center border-b border-slate-800 bg-slate-950 text-[10px] font-mono py-0.5">
              <div className="border-r border-slate-800 text-sky-400" title="Early Start (ES)">ES: {node.data?.es ?? 0}</div>
              <div className="border-r border-slate-800 font-bold text-slate-200" title="Duration (D)">D: {node.data?.duration ?? 0}d</div>
              <div className="text-emerald-400" title="Early Finish (EF)">EF: {node.data?.ef ?? 0}</div>
            </div>
            {/* Center label */}
            <div className="flex-1 flex flex-col justify-center px-2 py-1 text-center">
              <span className="text-[11px] font-semibold text-slate-100 leading-tight line-clamp-2">
                {node.label}
              </span>
              {isCritical && (
                <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider mt-0.5">
                  ★ Critical Path
                </span>
              )}
            </div>
            {/* Bottom row: LS | Slack | LF */}
            <div className="grid grid-cols-3 text-center border-t border-slate-800 bg-slate-950 text-[10px] font-mono py-0.5">
              <div className="border-r border-slate-800 text-sky-400" title="Late Start (LS)">LS: {node.data?.ls ?? 0}</div>
              <div className={`border-r border-slate-800 font-bold ${node.data?.slack === 0 ? 'text-rose-400' : 'text-amber-400'}`} title="Slack Buffer">
                S: {node.data?.slack ?? 0}
              </div>
              <div className="text-emerald-400" title="Late Finish (LF)">LF: {node.data?.lf ?? 0}</div>
            </div>
          </div>
        );
      }

      // 15. Gantt Task / Milestone Node
      case 'gantt-task': {
        const progress = Math.min(100, Math.max(0, Number(node.data?.progress ?? 0)));
        const isMilestone = !!node.data?.isMilestone;
        const status = node.data?.status || (progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started');
        const fill = node.style?.fill || 'rgba(15, 23, 42, 0.95)';
        const stroke = node.style?.stroke || (isMilestone ? '#f59e0b' : '#10b981');
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, 'rgba(15, 23, 42, 0.95)');

        const statusColors: Record<string, { bg: string; text: string; border: string }> = {
          completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
          'in-progress': { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/30' },
          blocked: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
          'on-hold': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
          'not-started': { bg: 'bg-slate-700/30', text: 'text-slate-400', border: 'border-slate-600/30' },
        };
        const sColor = statusColors[status] || statusColors['in-progress'];

        return (
          <div
            className="flex flex-col justify-between h-full p-2.5 rounded-lg shadow-xl text-left border-2 transition-all relative overflow-hidden"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
            }}
          >
            {/* Header: Title and Milestone / Status */}
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {isMilestone ? (
                  <Milestone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="font-bold text-xs truncate text-slate-100">
                  {node.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold uppercase ${sColor.bg} ${sColor.text} ${sColor.border}`}>
                  {status}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Progress Track & Bar */}
            <div className="my-1.5">
              <div className="w-full bg-slate-950/80 border border-slate-700/60 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-700/40">
              <span className="truncate max-w-[110px]">
                {node.data?.startDate ? `${node.data.startDate}` : 'Start'}
                {node.data?.endDate ? ` → ${node.data.endDate}` : ''}
              </span>
              <span className="text-slate-300 font-medium truncate max-w-[90px] text-right">
                {node.data?.assignee || 'Unassigned'}
              </span>
            </div>
          </div>
        );
      }

      // 16. Sticky Note (Excel-style dog-eared annotation note with customizable colors)
      case 'sticky-note': {
        const defaultColorMap: Record<string, { fill: string; stroke: string; text: string }> = {
          yellow: { fill: '#fef08a', stroke: '#eab308', text: '#713f12' },
          pink: { fill: '#fce7f3', stroke: '#f472b6', text: '#831843' },
          green: { fill: '#dcfce7', stroke: '#4ade80', text: '#14532d' },
          blue: { fill: '#e0f2fe', stroke: '#38bdf8', text: '#0c4a6e' },
          purple: { fill: '#f3e8ff', stroke: '#c084fc', text: '#581c87' },
          orange: { fill: '#ffedd5', stroke: '#fb923c', text: '#7c2d12' },
        };
        const colorKey = (node.data?.color || 'yellow').toLowerCase();
        const fallback = defaultColorMap[colorKey] || defaultColorMap.yellow;
        const fill = node.style?.fill || fallback.fill;
        const stroke = node.style?.stroke || fallback.stroke;
        const textColor = node.style?.textColor || fallback.text;
        const darkerFold = getDarkerShade(fill, 0.22);

        const docsText = node.documentation?.description?.trim() || '';
        const dataNotes = (node.data?.notes || node.data?.description || '').trim();
        const attachedNotes = node.stickyNotes && node.stickyNotes.length > 0
          ? node.stickyNotes.map(n => n.text).filter(Boolean).join('\n')
          : '';
        const combinedDocsNotes = [docsText, dataNotes, attachedNotes].filter(Boolean).join('\n\n');

        return (
          <div
            className="relative flex flex-col justify-between h-full p-2.5 font-sans text-xs shadow-md select-none group/sticky overflow-hidden"
            style={{
              backgroundColor: fill,
              color: textColor,
              border: `1px solid ${stroke}`,
              borderRadius: '2px',
              clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
            }}
          >
            {/* Excel-style folded dog-ear flap in top-right corner */}
            <div
              className="absolute top-0 right-0 w-4 h-4 pointer-events-none"
              style={{
                clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
                backgroundColor: darkerFold,
                borderBottom: `1px solid ${stroke}`,
                borderLeft: `1px solid ${stroke}`,
                boxShadow: '-1px 1px 3px rgba(0,0,0,0.18)',
              }}
            />

            <div
              className="flex items-center justify-between pb-1 border-b text-[10px] pr-4 opacity-80 font-medium"
              style={{ borderColor: `${stroke}50` }}
            >
              <div className="flex items-center gap-1 truncate max-w-[140px]">
                <StickyIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{node.data?.author || 'Note'}</span>
              </div>
              {node.documentation?.status && (
                <span className="text-[9px] uppercase font-mono opacity-70">
                  {node.documentation.status}
                </span>
              )}
            </div>

            {/* Note Content: Title + Docs & Notes (Change 4) */}
            <div className="flex-1 py-1 font-normal leading-relaxed overflow-y-auto space-y-1">
              {node.label && (
                <div
                  className="font-bold text-[11px] leading-snug pb-0.5 border-b"
                  style={{ borderColor: `${stroke}35` }}
                >
                  {node.label}
                </div>
              )}
              {combinedDocsNotes ? (
                <div className="text-[10px] sm:text-[10.5px] leading-relaxed whitespace-pre-wrap opacity-90 font-normal">
                  {combinedDocsNotes}
                </div>
              ) : !node.label ? (
                <div className="text-[10px] italic opacity-60">
                  Empty note. Use Inspector or double-click to add text.
                </div>
              ) : null}
            </div>
          </div>
        );
      }

      // 17. Cloud Storage Bucket Shape (AWS S3, Google Cloud Storage, Azure Blob)
      case 'cloud-bucket': {
        const w = node.width;
        const h = node.height;
        const stroke = node.style?.stroke || '#06b6d4';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#e0f2fe';

        const topY = Math.max(16, h * 0.25);
        const rx = w * 0.38;
        const ry = Math.min(14, h * 0.10);
        const leftX = w * 0.5 - rx;
        const rightX = w * 0.5 + rx;
        const bottomY = h * 0.88;
        const botRx = rx * 0.72;
        const botLeftX = w * 0.5 - botRx;
        const botRightX = w * 0.5 + botRx;
        const botRy = ry * 0.8;

        const bodyPath = `M ${leftX} ${topY} L ${botLeftX} ${bottomY} A ${botRx} ${botRy} 0 0 0 ${botRightX} ${bottomY} L ${rightX} ${topY} Z`;
        const handlePath = `M ${leftX + 4} ${topY} C ${leftX} ${topY * 0.15}, ${rightX} ${topY * 0.15}, ${rightX - 4} ${topY}`;

        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-lg"
              viewBox={`0 0 ${w} ${h}`}
            >
              <defs>
                <linearGradient id={`bucket-grad-${node.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0e7490" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Bucket Handle */}
              <path
                d={handlePath}
                fill="none"
                stroke={stroke}
                strokeWidth={Math.max(1.5, strokeWidth)}
                strokeLinecap="round"
                className="opacity-75"
              />

              {/* Bucket Body */}
              <path
                d={bodyPath}
                fill={node.style?.fill || `url(#bucket-grad-${node.id})`}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
              />

              {/* Top Rim Ellipse */}
              <ellipse
                cx={w * 0.5}
                cy={topY}
                rx={rx}
                ry={ry}
                fill="#164e63"
                stroke={stroke}
                strokeWidth={strokeWidth}
              />

              {/* Handle Rivets */}
              <circle cx={leftX + 3} cy={topY} r={3} fill={stroke} />
              <circle cx={rightX - 3} cy={topY} r={3} fill={stroke} />
            </svg>

            {/* Bucket Info Overlay */}
            <div
              className="relative z-10 flex flex-col items-center justify-center text-center px-3 pointer-events-none select-none max-w-[85%]"
              style={{ marginTop: `${topY * 0.45}px` }}
            >
              <span
                className="font-bold text-xs leading-tight line-clamp-1 tracking-tight"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
              <span className="text-[10px] text-cyan-200/90 font-mono mt-0.5 truncate max-w-full">
                {node.data?.bucketName || 'gs://cloud-bucket'}
              </span>
              <span className="text-[9px] text-cyan-300/70 font-sans uppercase tracking-wider mt-0.5">
                {node.data?.storageClass || 'Cloud Storage'}
              </span>
            </div>
          </div>
        );
      }

      // 18. UML Actor (Standard Stick Man figure)
      case 'uml-actor':
      case 'actor': {
        const fill = node.style?.fill || '#0284c7';
        const stroke = node.style?.stroke || '#38bdf8';
        const strokeWidth = node.style?.strokeWidth ?? 2.5;
        const textColor = node.style?.textColor || '#ffffff';
        const w = node.width;
        const h = node.height;

        // Stick figure geometry calculations
        const headRadius = Math.max(12, Math.min(w * 0.16, h * 0.13, 18));
        const headCx = w / 2;
        const headCy = Math.max(headRadius + 5, h * 0.15);

        const torsoTop = headCy + headRadius;
        const torsoBottom = headCy + headRadius + Math.max(18, h * 0.28);
        const armY = torsoTop + (torsoBottom - torsoTop) * 0.35;
        const armSpan = Math.max(18, Math.min(w * 0.34, 34));

        const legBottom = Math.min(h - 26, torsoBottom + Math.max(20, h * 0.28));
        const legSpan = Math.max(16, Math.min(w * 0.28, 30));
        const darkerShade = getDarkerShade(fill, 0.4);

        return (
          <div className="relative w-full h-full flex flex-col items-center justify-between p-1 overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-md"
              viewBox={`0 0 ${w} ${h}`}
            >
              <defs>
                <linearGradient id={`actor-grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fill} />
                  <stop offset="100%" stopColor={darkerShade} />
                </linearGradient>
              </defs>
              {/* Head Circle */}
              <circle
                cx={headCx}
                cy={headCy}
                r={headRadius}
                fill={node.style?.gradient ? `url(#actor-grad-${node.id})` : fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              {/* Torso */}
              <line
                x1={headCx}
                y1={torsoTop}
                x2={headCx}
                y2={torsoBottom}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Arms */}
              <line
                x1={headCx - armSpan}
                y1={armY}
                x2={headCx + armSpan}
                y2={armY}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Left Leg */}
              <line
                x1={headCx}
                y1={torsoBottom}
                x2={headCx - legSpan}
                y2={legBottom}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Right Leg */}
              <line
                x1={headCx}
                y1={torsoBottom}
                x2={headCx + legSpan}
                y2={legBottom}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </svg>

            {/* Actor Label & Stereotype */}
            <div className="mt-auto w-full text-center px-1 z-10 pointer-events-none select-none pb-0.5">
              {node.data?.actorType && (
                <div className="text-[9px] font-mono text-cyan-300 opacity-90 truncate">
                  «{node.data.actorType}»
                </div>
              )}
              <span
                className="font-bold text-xs leading-tight line-clamp-2"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
            </div>
          </div>
        );
      }

      // 19. UML Use Case (Standard Oval / Ellipse)
      case 'uml-usecase': {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.95)';
        const stroke = node.style?.stroke || '#06b6d4';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const w = node.width;
        const h = node.height;
        const darkerShade = getDarkerShade(fill, 0.35);

        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-md"
              viewBox={`0 0 ${w} ${h}`}
            >
              <defs>
                <linearGradient id={`usecase-grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fill} />
                  <stop offset="100%" stopColor={darkerShade} />
                </linearGradient>
              </defs>
              <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={(w - strokeWidth * 2) / 2}
                ry={(h - strokeWidth * 2) / 2}
                fill={node.style?.gradient ? `url(#usecase-grad-${node.id})` : fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={node.style?.strokeDasharray}
              />
            </svg>
            <div className="relative z-10 text-center px-4 max-w-[85%] flex flex-col items-center justify-center pointer-events-none select-none">
              {node.data?.extensionPoint && (
                <span className="text-[9px] font-mono text-cyan-300 opacity-80 mb-0.5">
                  «extension: {node.data.extensionPoint}»
                </span>
              )}
              <span
                className="font-semibold text-xs leading-tight line-clamp-3"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
            </div>
          </div>
        );
      }

      // 20. Flowchart Terminator (Stadium / Capsule shape for Start & End)
      case 'flow-terminator': {
        const isStart = (node.label || '').toLowerCase().includes('start');
        const defaultFill = isStart ? 'rgba(5, 150, 105, 0.9)' : 'rgba(225, 29, 72, 0.9)';
        const defaultStroke = isStart ? '#34d399' : '#fb7185';
        const fill = node.style?.fill || defaultFill;
        const stroke = node.style?.stroke || defaultStroke;
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, defaultFill);

        return (
          <div
            className="flex flex-col items-center justify-center h-full px-4 rounded-full shadow-xl text-center transition-all border-2"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
              color: textColor,
            }}
          >
            <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[90%]">
              {node.label}
            </span>
          </div>
        );
      }

      // 21. Flowchart Data / I-O (Standard Parallelogram)
      case 'flow-data': {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.95)';
        const stroke = node.style?.stroke || '#0ea5e9';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const w = node.width;
        const h = node.height;
        const pad = Math.max(strokeWidth, 2);
        const skew = Math.min(w * 0.18, 28);
        const points = `${skew + pad},${pad} ${w - pad},${pad} ${w - skew - pad},${h - pad} ${pad},${h - pad}`;
        const darkerShade = getDarkerShade(fill, 0.35);

        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-md"
              viewBox={`0 0 ${w} ${h}`}
            >
              <defs>
                <linearGradient id={`data-grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fill} />
                  <stop offset="100%" stopColor={darkerShade} />
                </linearGradient>
              </defs>
              <polygon
                points={points}
                fill={node.style?.gradient ? `url(#data-grad-${node.id})` : fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={node.style?.strokeDasharray}
                strokeLinejoin="round"
              />
            </svg>
            <div className="relative z-10 text-center px-6 max-w-[80%] flex flex-col items-center justify-center pointer-events-none select-none">
              {node.data?.ioType && (
                <span className="text-[9px] font-mono text-cyan-300 uppercase opacity-80 mb-0.5">
                  [{node.data.ioType}]
                </span>
              )}
              <span
                className="font-semibold text-xs leading-tight line-clamp-2"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
            </div>
          </div>
        );
      }

      // 22. Flowchart Document (Standard Wavy Bottom Edge)
      case 'flow-document': {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.95)';
        const stroke = node.style?.stroke || '#f59e0b';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const w = node.width;
        const h = node.height;
        const pad = Math.max(strokeWidth, 2);
        const waveH = Math.min(16, h * 0.18);
        const darkerShade = getDarkerShade(fill, 0.35);

        // Path: Top flat, right down, wavy bottom curve, left up
        const d = `M ${pad} ${pad} 
                   L ${w - pad} ${pad} 
                   L ${w - pad} ${h - waveH} 
                   C ${w * 0.75} ${h + waveH * 0.5}, ${w * 0.5} ${h - waveH * 1.5}, ${pad} ${h - waveH} 
                   Z`;

        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none drop-shadow-md"
              viewBox={`0 0 ${w} ${h}`}
            >
              <defs>
                <linearGradient id={`doc-grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fill} />
                  <stop offset="100%" stopColor={darkerShade} />
                </linearGradient>
              </defs>
              <path
                d={d}
                fill={node.style?.gradient ? `url(#doc-grad-${node.id})` : fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
              />
            </svg>
            <div className="relative z-10 text-center px-4 max-w-[85%] pb-2 flex flex-col items-center justify-center pointer-events-none select-none">
              <span
                className="font-semibold text-xs leading-tight line-clamp-2"
                style={{ color: textColor }}
              >
                {node.label}
              </span>
            </div>
          </div>
        );
      }

      // 23. C4 Architecture Person
      case 'c4-person': {
        const fill = node.style?.fill || '#08427b';
        const stroke = node.style?.stroke || '#5599ff';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, '#08427b');

        return (
          <div
            className="flex flex-col justify-between h-full p-2.5 rounded-2xl shadow-xl text-center border-2 transition-all overflow-hidden"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
              color: textColor,
            }}
          >
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center border border-blue-400/50">
                <Users className="w-3 h-3 text-blue-200" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-200 font-semibold">
                [Person]
              </span>
            </div>
            <div className="font-bold text-xs leading-snug px-1 my-1">
              {node.label}
            </div>
            <div className="text-[10px] text-blue-200/80 font-sans border-t border-blue-400/30 pt-1 line-clamp-2">
              {node.data?.description || node.data?.role || 'User / Actor'}
            </div>
          </div>
        );
      }

      // 24. Mindmap Oval Node (Geometric Ellipse / Oval for Mind Maps, default 80x45)
      case 'mindmap-oval': {
        const fill = node.style?.fill || 'rgba(217, 70, 239, 0.85)';
        const stroke = node.style?.stroke || '#f0abfc';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, 'rgba(217, 70, 239, 0.85)');

        return (
          <div
            className="flex flex-col items-center justify-center h-full p-1 px-1.5 shadow-xl text-center transition-all border select-none overflow-hidden"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
              borderStyle: node.style?.strokeDasharray ? 'dashed' : 'solid',
              borderRadius: '50%',
              color: textColor,
            }}
          >
            <span className="text-[10px] font-semibold leading-tight line-clamp-2 select-none px-0.5 break-words max-w-full">
              {node.label}
            </span>
            {node.data?.level !== undefined && node.height >= 55 && (
              <span className="text-[8px] font-mono opacity-80 mt-0.5">
                Lvl {node.data.level}
              </span>
            )}
          </div>
        );
      }

      // 25. Mindmap Node & Standard Flowchart Process Box
      case 'mindmap-node':
      case 'flow-process':
      case 'vsm-step':
      case 'fishbone-category': {
        const isMindmap = node.type === 'mindmap-node' || node.style?.rounded === 9999;
        const defaultFill = isMindmap ? 'rgba(139, 92, 246, 0.85)' : 'rgba(30, 41, 59, 0.95)';
        const defaultStroke = isMindmap ? '#c084fc' : '#3b82f6';
        const fill = node.style?.fill || defaultFill;
        const stroke = node.style?.stroke || defaultStroke;
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const rounded = node.style?.rounded !== undefined ? `${node.style.rounded}px` : (isMindmap ? '9999px' : '8px');
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, defaultFill);

        return (
          <div
            className="flex flex-col items-center justify-center h-full p-2.5 shadow-xl text-center transition-all border-2"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
              borderStyle: node.style?.strokeDasharray ? 'dashed' : 'solid',
              borderRadius: rounded,
              color: textColor,
            }}
          >
            <span className="text-xs font-semibold leading-snug line-clamp-3 select-none">
              {node.label}
            </span>
            {node.data?.cycleTime && (
              <span className="text-[9px] font-mono opacity-80 mt-1">
                C/T: {node.data.cycleTime} | Uptime: {node.data.uptime || '98%'}
              </span>
            )}
          </div>
        );
      }

      // Default Node Renderer (Honors all custom colors, fill, stroke, gradient, and rounded attributes)
      default: {
        const fill = node.style?.fill || 'rgba(30, 41, 59, 0.95)';
        const stroke = node.style?.stroke || '#3b82f6';
        const strokeWidth = node.style?.strokeWidth ?? 2;
        const textColor = node.style?.textColor || '#ffffff';
        const rounded = node.style?.rounded !== undefined ? `${node.style.rounded}px` : '8px';
        const bgStyle = getNodeBackgroundStyle(fill, node.style?.gradient, 'rgba(30, 41, 59, 0.95)');

        return (
          <div
            className="flex items-center justify-center h-full p-2.5 shadow-xl text-center transition-all border-2"
            style={{
              ...bgStyle,
              borderColor: stroke,
              borderWidth: `${strokeWidth}px`,
              borderStyle: node.style?.strokeDasharray ? 'dashed' : 'solid',
              borderRadius: rounded,
              color: textColor,
            }}
          >
            <span className="text-xs font-semibold leading-snug line-clamp-3 select-none">
              {node.label}
            </span>
          </div>
        );
      }
    }
  };

  const handleSaveLabel = () => {
    if (editedLabel.trim() && editedLabel !== node.label) {
      onUpdateLabel?.(node.id, editedLabel.trim());
    }
    setIsEditingLabel(false);
  };

  return (
    <div
      id={`node-${node.id}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        touchAction: 'none',
        opacity: isDeemphasized ? 0.22 : 1,
        filter: isDeemphasized ? 'grayscale(45%)' : 'none',
        transition: 'opacity 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
      }}
      className={`absolute group select-none pointer-events-auto ${
        isSelected
          ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 z-20 shadow-xl'
          : isDeemphasized
          ? 'z-0'
          : 'z-10'
      } ${isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab'}`}
      onMouseEnter={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseEntryPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setIsHovered(true);
        onMouseEnterNode?.(node.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setMouseEntryPos(null);
        onMouseLeaveNode?.(node.id);
      }}
      onMouseDown={e => {
        if (
          (e.target as HTMLElement).closest('button') ||
          (e.target as HTMLElement).closest('.cursor-crosshair') ||
          (e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.stopPropagation();
        onNodeMouseDown?.(node.id, e);
      }}
      onDoubleClick={e => {
        e.stopPropagation();
        if (!isReadOnly) {
          setIsEditingLabel(true);
          setEditedLabel(node.label);
        }
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onNodeContextMenu?.(node.id, e);
      }}
    >
      {/* 12 Perimeter Connection Anchor Handles */}
      {renderAnchors()}

      {/* Render Node Body */}
      {renderNodeBody()}

      {/* Child Diagram / Sub-Diagram Navigation Badge (Supports Multiple Children per Node) */}
      {(() => {
        const childDiagrams = getNodeChildDiagrams(node);
        if (childDiagrams.length === 1) {
          const single = childDiagrams[0];
          return (
            <div className="absolute -bottom-3.5 right-1 z-30 flex items-center gap-1">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onMouseLeaveNode?.(node.id);
                  setIsHovered(false);
                  setMouseEntryPos(null);
                  onNavigateChildDiagram?.(single.filename);
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold shadow-lg shadow-purple-900/50 border border-purple-300/40 cursor-pointer transition-all hover:scale-105 pointer-events-auto group"
                title={`Click to open child diagram: ${single.title || single.filename} (${(single.diagramType || 'diagram').toUpperCase()})`}
              >
                <ExternalLink className="w-2.5 h-2.5 text-purple-200" />
                <span className="truncate max-w-[130px]">
                  {single.title || single.filename.replace('.json', '')}
                </span>
                {single.diagramType && (
                  <span className="text-[8px] opacity-80 uppercase font-mono px-1 py-0.2 rounded bg-purple-800/60">
                    {single.diagramType}
                  </span>
                )}
                <span className="text-purple-200 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
              {isSelected && !isReadOnly && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenChildDiagramModal?.(node);
                  }}
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold shadow border border-purple-400/50 cursor-pointer transition-all hover:scale-110 pointer-events-auto"
                  title="Attach another child diagram to this node"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        } else if (childDiagrams.length > 1) {
          return (
            <div className="absolute -bottom-3.5 right-1 z-30 flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowChildQuickMenu(prev => !prev);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-700 hover:bg-purple-600 text-white text-[9px] font-bold shadow-lg shadow-purple-950/60 border border-purple-300/50 cursor-pointer transition-all hover:scale-105 pointer-events-auto"
                  title="Click to view all child diagrams attached to this node"
                >
                  <FolderTree className="w-2.5 h-2.5 text-purple-200" />
                  <span>{childDiagrams.length} Child Diagrams</span>
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showChildQuickMenu ? 'rotate-180' : ''}`} />
                </button>

                {showChildQuickMenu && (
                  <div
                    className="absolute right-0 bottom-full mb-1 w-60 rounded-xl bg-slate-900/95 border border-purple-500/40 shadow-2xl p-1.5 text-xs z-50 backdrop-blur-md animate-in fade-in"
                    onClick={e => e.stopPropagation()}
                    onMouseLeave={() => setShowChildQuickMenu(false)}
                  >
                    <div className="px-2 py-1 text-[10px] font-mono uppercase text-purple-300 border-b border-slate-800 flex items-center justify-between">
                      <span>Navigate to Child Diagram</span>
                      <span className="font-bold">{childDiagrams.length}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                      {childDiagrams.map((child, idx) => (
                        <button
                          key={child.id || child.filename || idx}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setShowChildQuickMenu(false);
                            onMouseLeaveNode?.(node.id);
                            setIsHovered(false);
                            setMouseEntryPos(null);
                            onNavigateChildDiagram?.(child.filename);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-purple-900/40 text-slate-200 hover:text-white flex items-center justify-between gap-1 transition-colors cursor-pointer"
                        >
                          <div className="truncate min-w-0 font-medium">
                            {child.title || child.filename}
                          </div>
                          {child.diagramType && (
                            <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                              {child.diagramType}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    {!isReadOnly && (
                      <div className="pt-1 mt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setShowChildQuickMenu(false);
                            onOpenChildDiagramModal?.(node);
                          }}
                          className="w-full text-left px-2 py-1 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 flex items-center gap-1.5 text-[10px] font-semibold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add Another Child Diagram</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isSelected && !isReadOnly && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenChildDiagramModal?.(node);
                  }}
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold shadow border border-purple-400/50 cursor-pointer transition-all hover:scale-110 pointer-events-auto"
                  title="Attach another child diagram to this node"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        } else if (isSelected && !isReadOnly) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onOpenChildDiagramModal?.(node);
              }}
              className="absolute -bottom-3 right-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 hover:bg-purple-600 text-purple-300 hover:text-white text-[9px] font-semibold shadow-md border border-purple-500/40 cursor-pointer transition-all hover:scale-105 pointer-events-auto"
              title="Create or link a dedicated child diagram JSON for this node"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+ Child Diagram</span>
            </button>
          );
        }
        return null;
      })()}

      {/* External URL Link Badges on Node (Change 4) */}
      {node.links && node.links.length > 0 && (
        <div
          className={`absolute ${node.type === 'sticky-note' ? '-top-3 left-2' : '-top-3 right-2'} flex items-center gap-1 z-30 pointer-events-auto`}
        >
          {node.links.map(link => (
            <a
              key={link.id}
              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={`Open link: "${link.label}" (${link.url}) in new tab`}
              className="px-1.5 py-0.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-sans font-medium flex items-center gap-1 shadow-md border border-blue-400/40 cursor-pointer transition-transform hover:scale-105"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span className="max-w-[70px] truncate">{link.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Human-Friendly Hover Description Tooltip (Change 5 & Change 8: Positioned further from center & accommodates all text) */}
      {isHovered && (node.documentation?.description || (node.stickyNotes && node.stickyNotes.length > 0) || (node.links && node.links.length > 0)) && (
        <div
          className="absolute z-50 flex flex-col max-w-md w-max min-w-[260px] p-3 bg-slate-900/98 border border-slate-700/90 rounded-xl shadow-2xl text-[11px] text-slate-200 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${node.width / 2}px`,
            top: `-16px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between font-mono text-[9px] text-sky-400 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold truncate max-w-[180px]">{node.label}</span>
            <span className="uppercase px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-semibold">{node.type}</span>
          </div>

          {/* Full description without line-clamp truncation so all text is visible */}
          {node.documentation?.description && (
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-72 overflow-y-auto pr-1">
              {node.documentation.description}
            </div>
          )}

          {/* Tags */}
          {node.documentation?.tags && node.documentation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {node.documentation.tags.map((t, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded text-[9px] font-mono">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* External Links inside tooltip */}
          {node.links && node.links.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
              <span className="text-[9px] uppercase font-mono text-slate-400 block font-semibold">
                External Links ({node.links.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {node.links.map(link => (
                  <a
                    key={link.id}
                    href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 text-[10px] font-sans flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sticky Notes */}
          {node.stickyNotes && node.stickyNotes.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-amber-300 font-mono flex items-center gap-1">
              <span>★ {node.stickyNotes.length} sticky note{node.stickyNotes.length === 1 ? '' : 's'}</span>
            </div>
          )}

          {/* Pointer tip pointing towards top of node */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
        </div>
      )}

      {/* Interactive Resize Handles (Corner & Edge handles rendered when node is selected) */}
      {isSelected && !isReadOnly && (
        <>
          {/* Corner Handles */}
          <div
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nwse-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'nw', e);
            }}
            title="Drag corner to resize"
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nesw-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'ne', e);
            }}
            title="Drag corner to resize"
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nesw-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'sw', e);
            }}
            title="Drag corner to resize"
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nwse-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'se', e);
            }}
            title="Drag corner to resize"
          />

          {/* Edge Handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded-full shadow-md cursor-ns-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'n', e);
            }}
            title="Resize height"
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded-full shadow-md cursor-ns-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 's', e);
            }}
            title="Resize height"
          />
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded-full shadow-md cursor-ew-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'w', e);
            }}
            title="Resize width"
          />
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded-full shadow-md cursor-ew-resize z-40 pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={e => {
              e.stopPropagation();
              onStartResize?.(node.id, 'e', e);
            }}
            title="Resize width"
          />
        </>
      )}

      {/* Inline Label Editor (on Double Click) */}
      {isEditingLabel && (
        <div
          className="absolute inset-0 bg-slate-900/90 rounded border-2 border-blue-400 flex items-center justify-center p-2 z-50 shadow-2xl"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            type="text"
            value={editedLabel}
            onChange={e => setEditedLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') setIsEditingLabel(false);
            }}
            onBlur={handleSaveLabel}
            autoFocus
            className="w-full bg-slate-950 text-white text-xs px-2 py-1 rounded border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400 text-center"
          />
        </div>
      )}
    </div>
  );
};
