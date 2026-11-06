/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DiagramEdge, DiagramNode } from '../../types/diagram';
import { getNodeAnchorCoords, isAnchorHorizontal } from '../../utils/diagramAnchors';

interface EdgeRendererProps {
  edge: DiagramEdge;
  sourceNode?: DiagramNode;
  targetNode?: DiagramNode;
  isSelected?: boolean;
  isDeemphasized?: boolean;
  onSelect?: (edgeId: string) => void;
  onContextMenu?: (edgeId: string, e: React.MouseEvent) => void;
  onStartReconnectEdge?: (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => void;
  onStartMoveSegment?: (edgeId: string, axis: 'x' | 'y', initialCoord: number, e: React.MouseEvent) => void;
  onResetSegmentOffset?: (edgeId: string) => void;
  temporaryStart?: { x: number; y: number } | null;
  temporaryEnd?: { x: number; y: number } | null;
  temporaryMidOffset?: number | null;
}

export const EdgeRenderer: React.FC<EdgeRendererProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  isDeemphasized = false,
  onSelect,
  onContextMenu,
  onStartReconnectEdge,
  onStartMoveSegment,
  onResetSegmentOffset,
  temporaryStart,
  temporaryEnd,
  temporaryMidOffset,
}) => {
  if (!sourceNode || !targetNode) return null;

  const defaultStart = getNodeAnchorCoords(sourceNode, edge.sourceAnchor);
  const defaultEnd = getNodeAnchorCoords(targetNode, edge.targetAnchor);

  const start = temporaryStart || defaultStart;
  const end = temporaryEnd || defaultEnd;

  // Generate SVG path string based on edge type
  let pathD = '';
  let midX = (start.x + end.x) / 2;
  let midY = (start.y + end.y) / 2;
  let isSegmentVertical = false;

  const edgeType = edge.type || 'orthogonal';

  if (edgeType === 'straight') {
    pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  } else if (edgeType === 'curved') {
    // Organic bezier curve (standard for Mind Map, Fishbone)
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const isHorizontal =
      isAnchorHorizontal(edge.sourceAnchor) ||
      Math.abs(dx) > Math.abs(dy);

    if (isHorizontal) {
      const cx1 = start.x + dx * 0.5;
      const cy1 = start.y;
      const cx2 = start.x + dx * 0.5;
      const cy2 = end.y;
      pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
    } else {
      const cx1 = start.x;
      const cy1 = start.y + dy * 0.5;
      const cx2 = end.x;
      const cy2 = start.y + dy * 0.5;
      pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
    }
  } else {
    // Orthogonal / Stepped path with 90° corners (standard for ERD, BPMN, Architecture)
    // Allows moving the orthogonal line segments (horizontal or vertical middle step)
    const effectiveOffset = temporaryMidOffset !== undefined && temporaryMidOffset !== null
      ? temporaryMidOffset
      : edge.midOffset;

    if (isAnchorHorizontal(edge.sourceAnchor)) {
      isSegmentVertical = true;
      const defaultMidX = start.x + (end.x - start.x) / 2;
      midX = effectiveOffset !== undefined ? effectiveOffset : defaultMidX;
      midY = (start.y + end.y) / 2;
      pathD = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    } else {
      isSegmentVertical = false;
      const defaultMidY = start.y + (end.y - start.y) / 2;
      midY = effectiveOffset !== undefined ? effectiveOffset : defaultMidY;
      midX = (start.x + end.x) / 2;
      pathD = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
    }
  }

  // Helper to map edge marker type to SVG marker ID in DiagramCanvas (Change 2)
  const getMarkerId = (marker?: string): string => {
    switch (marker) {
      case 'crow-zero-many': return 'marker-crow-zero-many'; // 0..*
      case 'crow-one-many': return 'marker-crow-one-many';   // 1..*
      case 'crow-one-only': return 'marker-crow-one-only';   // 1..1
      case 'crow-zero-one': return 'marker-crow-zero-one';   // 0..1
      case 'crow-foot-many': return 'marker-crow-many';      // *
      case 'crow-foot': return 'marker-crow-many';
      case 'crow-foot-one': return 'marker-crow-one';        // 1
      case 'diamond': return 'marker-diamond';
      case 'diamond-filled': return 'marker-diamond-filled';
      case 'circle': return 'marker-circle';
      case 'arrow': return 'marker-arrow';
      case 'none': return '';
      default: return '';
    }
  };

  const markerStartId = getMarkerId(edge.markerStart);
  const markerEndId = edge.markerEnd ? getMarkerId(edge.markerEnd) : (edge.markerStart ? '' : 'marker-arrow');

  const strokeColor = edge.color || (isSelected ? '#38bdf8' : '#94a3b8');
  const strokeDash =
    edge.lineStyle === 'dashed'
      ? '6 4'
      : edge.lineStyle === 'dotted'
      ? '2 3'
      : undefined;

  const styleLabel =
    edgeType === 'curved'
      ? 'Curved (Bezier)'
      : edgeType === 'straight'
      ? 'Straight'
      : 'Corners (Orthogonal)';

  return (
    <g
      className="cursor-pointer group"
      style={{
        opacity: isDeemphasized ? 0.15 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onClick={e => {
        e.stopPropagation();
        onSelect?.(edge.id);
      }}
      onContextMenu={e => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(edge.id, e);
        }
      }}
    >
      <title>{`Connector: ${sourceNode.label} → ${targetNode.label} (${styleLabel}) - Click to select, drag endpoint handles to move connector, or drag line handle to reposition orthogonal corners`}</title>

      {/* Invisible wider path for easier clicking/hover */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="pointer-events-auto"
      />

      {/* Selection Glow Indicator */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={(edge.strokeWidth || 2) + 6}
          strokeOpacity={0.25}
          strokeLinecap="round"
          className="pointer-events-none animate-pulse"
        />
      )}

      {/* Visible Path with Start and End Markers (Change 2) */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={edge.strokeWidth || (isSelected ? 2.5 : 1.75)}
        strokeDasharray={strokeDash}
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        className="transition-colors group-hover:stroke-sky-400"
      />

      {/* Edge Label (e.g. 1..*, has_many, etc.) */}
      {edge.label && (
        <g transform={`translate(${midX}, ${midY})`} className="pointer-events-auto">
          <rect
            x={-edge.label.length * 3.5 - 6}
            y={-10}
            width={edge.label.length * 7 + 12}
            height={20}
            rx={4}
            fill="#0f172a"
            stroke={isSelected ? '#38bdf8' : '#334155'}
            strokeWidth={1}
            className="shadow-sm"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={isSelected ? '#38bdf8' : '#cbd5e1'}
            fontSize={11}
            fontWeight="500"
            fontFamily="monospace"
          >
            {edge.label}
          </text>
        </g>
      )}

      {/* Movable Orthogonal Middle Segment Line Handle
          Allows users to drag and reposition the cornered orthogonal line! */}
      {isSelected && edgeType === 'orthogonal' && (
        <g className="pointer-events-auto">
          {isSegmentVertical ? (
            // Vertical line segment handle (drags horizontally)
            <g
              className="cursor-ew-resize group/segment"
              transform={`translate(${midX}, ${midY})`}
              onMouseDown={e => {
                e.stopPropagation();
                onStartMoveSegment?.(edge.id, 'x', midX, e);
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                onResetSegmentOffset?.(edge.id);
              }}
            >
              <title>Drag to move connector line horizontally (Double-click to reset)</title>
              {/* Invisible wider grab hit area */}
              <rect x={-10} y={-16} width={20} height={32} fill="transparent" />
              {/* Segment grip pill */}
              <rect
                x={-4}
                y={-12}
                width={8}
                height={24}
                rx={4}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={1.5}
                className="shadow-md transition-transform group-hover/segment:scale-125"
              />
              {/* Grip lines */}
              <line x1={0} y1={-6} x2={0} y2={6} stroke="#ffffff" strokeWidth={1.5} />
            </g>
          ) : (
            // Horizontal line segment handle (drags vertically)
            <g
              className="cursor-ns-resize group/segment"
              transform={`translate(${midX}, ${midY})`}
              onMouseDown={e => {
                e.stopPropagation();
                onStartMoveSegment?.(edge.id, 'y', midY, e);
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                onResetSegmentOffset?.(edge.id);
              }}
            >
              <title>Drag to move connector line vertically (Double-click to reset)</title>
              {/* Invisible wider grab hit area */}
              <rect x={-16} y={-10} width={32} height={20} fill="transparent" />
              {/* Segment grip pill */}
              <rect
                x={-12}
                y={-4}
                width={24}
                height={8}
                rx={4}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={1.5}
                className="shadow-md transition-transform group-hover/segment:scale-125"
              />
              {/* Grip lines */}
              <line x1={-6} y1={0} x2={6} y2={0} stroke="#ffffff" strokeWidth={1.5} />
            </g>
          )}
        </g>
      )}

      {/* Selected Edge Endpoint Drag Handles
          Allows dragging this specific connector endpoint from one anchor point to another,
          leaving any other connections at the same anchor point untouched! */}
      {isSelected && (
        <g className="pointer-events-auto">
          {/* Source Endpoint Drag Handle (Start - Enormous 44px hit area - Change 3) */}
          <g
            className="cursor-grab active:cursor-grabbing group/handle"
            transform={`translate(${start.x}, ${start.y})`}
            onMouseDown={e => {
              e.stopPropagation();
              onStartReconnectEdge?.(edge.id, 'source', e);
            }}
          >
            <title>{`Drag start point from "${sourceNode.label}" to another anchor point`}</title>
            {/* Invisible large hit area (44px diameter) for easy grabbing */}
            <circle r={22} fill="transparent" className="cursor-grab" />
            {/* Pulsing ring */}
            <circle
              r={13}
              fill="rgba(56, 189, 248, 0.25)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              className="animate-ping origin-center pointer-events-none"
            />
            {/* Outer handle ring */}
            <circle
              r={8.5}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={2.5}
              className="shadow-lg transition-transform group-hover/handle:scale-130 pointer-events-none"
            />
            {/* Inner dot */}
            <circle r={3} fill="#ffffff" className="pointer-events-none" />
          </g>

          {/* Target Endpoint Drag Handle (End - Enormous 44px hit area - Change 3) */}
          <g
            className="cursor-grab active:cursor-grabbing group/handle"
            transform={`translate(${end.x}, ${end.y})`}
            onMouseDown={e => {
              e.stopPropagation();
              onStartReconnectEdge?.(edge.id, 'target', e);
            }}
          >
            <title>{`Drag end point from "${targetNode.label}" to another anchor point`}</title>
            {/* Invisible large hit area (44px diameter) for easy grabbing */}
            <circle r={22} fill="transparent" className="cursor-grab" />
            {/* Pulsing ring */}
            <circle
              r={13}
              fill="rgba(52, 211, 153, 0.25)"
              stroke="#34d399"
              strokeWidth={1.5}
              className="animate-ping origin-center pointer-events-none"
            />
            {/* Outer handle ring */}
            <circle
              r={8.5}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={2.5}
              className="shadow-lg transition-transform group-hover/handle:scale-130 pointer-events-none"
            />
            {/* Inner dot */}
            <circle r={3} fill="#ffffff" className="pointer-events-none" />
          </g>
        </g>
      )}
    </g>
  );
};
