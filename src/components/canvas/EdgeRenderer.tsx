/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DiagramEdge, DiagramNode } from '../../types/diagram';
import { getNodeAnchorCoords, isAnchorHorizontal } from '../../utils/diagramAnchors';
import {
  buildOrthogonalVertices,
  getEditableSegments,
  getPathMidpointLabelPos,
  Point,
  verticesToSvgPath,
} from '../../utils/edgeRouting';

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
  onStartMoveWaypointSegment?: (
    edgeId: string,
    segIndex: number,
    axis: 'x' | 'y',
    initialCoord: number,
    points: Point[],
    e: React.MouseEvent
  ) => void;
  onStartSplitSegment?: (
    edgeId: string,
    segIndex: number,
    axis: 'x' | 'y',
    initialCoord: number,
    points: Point[],
    e: React.MouseEvent
  ) => void;
  onResetSegmentOffset?: (edgeId: string) => void;
  onResetRouting?: (edgeId: string) => void;
  temporaryStart?: { x: number; y: number } | null;
  temporaryEnd?: { x: number; y: number } | null;
  temporaryMidOffset?: number | null;
  temporaryWaypoints?: Point[] | null;
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
  onStartMoveWaypointSegment,
  onStartSplitSegment,
  onResetSegmentOffset,
  onResetRouting,
  temporaryStart,
  temporaryEnd,
  temporaryMidOffset,
  temporaryWaypoints,
}) => {
  if (!sourceNode || !targetNode) return null;

  const defaultStart = getNodeAnchorCoords(sourceNode, edge.sourceAnchor);
  const defaultEnd = getNodeAnchorCoords(targetNode, edge.targetAnchor);

  const start = temporaryStart || defaultStart;
  const end = temporaryEnd || defaultEnd;

  let pathD = '';
  let midX = (start.x + end.x) / 2;
  let midY = (start.y + end.y) / 2;
  let orthogonalPoints: Point[] = [];

  const edgeType = edge.type || 'orthogonal';

  if (edgeType === 'straight') {
    pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  } else if (edgeType === 'curved') {
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
    const effectiveOffset =
      temporaryMidOffset !== undefined && temporaryMidOffset !== null
        ? temporaryMidOffset
        : edge.midOffset;
    const effectiveWaypoints =
      temporaryWaypoints !== undefined && temporaryWaypoints !== null
        ? temporaryWaypoints
        : edge.waypoints;

    orthogonalPoints = buildOrthogonalVertices(
      start,
      end,
      edge.sourceAnchor,
      edge.targetAnchor,
      effectiveOffset,
      effectiveWaypoints
    );
    pathD = verticesToSvgPath(orthogonalPoints);
    const labelPos = getPathMidpointLabelPos(orthogonalPoints);
    midX = labelPos.x;
    midY = labelPos.y;
  }

  const safeEdgeId = (edge.id || 'edge').replace(/[^a-zA-Z0-9_-]/g, '_');
  const customArrowMarkerId = edge.color ? `marker-arrow-${safeEdgeId}` : '';

  const getMarkerId = (marker?: string): string => {
    switch (marker) {
      case 'crow-zero-many': return 'marker-crow-zero-many';
      case 'crow-one-many': return 'marker-crow-one-many';
      case 'crow-one-only': return 'marker-crow-one-only';
      case 'crow-zero-one': return 'marker-crow-zero-one';
      case 'crow-foot-many': return 'marker-crow-many';
      case 'crow-foot': return 'marker-crow-many';
      case 'crow-foot-one': return 'marker-crow-one';
      case 'diamond': return 'marker-diamond';
      case 'diamond-filled': return 'marker-diamond-filled';
      case 'circle': return 'marker-circle';
      case 'arrow': return customArrowMarkerId || 'marker-arrow';
      case 'none': return '';
      default: return '';
    }
  };

  const markerStartId = getMarkerId(edge.markerStart);
  const markerEndId = edge.markerEnd
    ? getMarkerId(edge.markerEnd)
    : edge.markerStart
    ? ''
    : customArrowMarkerId || 'marker-arrow';

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

  const editableSegments =
    isSelected && edgeType === 'orthogonal' ? getEditableSegments(orthogonalPoints) : [];

  return (
    <g
      className="cursor-pointer group pointer-events-auto"
      style={{
        opacity: isDeemphasized ? 0.15 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onClick={e => {
        e.stopPropagation();
        onSelect?.(edge.id);
      }}
      onDoubleClick={e => {
        e.stopPropagation();
        if (onResetRouting) {
          onResetRouting(edge.id);
        } else {
          onResetSegmentOffset?.(edge.id);
        }
      }}
      onContextMenu={e => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(edge.id, e);
        }
      }}
    >
      <title>{`Connector: ${sourceNode.label} → ${targetNode.label} (${styleLabel}) — Click to select, drag segments or + handles to add corners, double-click to reset routing`}</title>

      {customArrowMarkerId &&
        (markerEndId === customArrowMarkerId || markerStartId === customArrowMarkerId) && (
          <defs>
            <marker
              id={customArrowMarkerId}
              viewBox="0 0 10 10"
              refX="8.2"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth={(edge.strokeWidth || 2) >= 4 ? 14 : 10}
              markerHeight={(edge.strokeWidth || 2) >= 4 ? 14 : 10}
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={strokeColor} />
            </marker>
          </defs>
        )}

      {/* Invisible wider path for easier clicking/hover */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(20, (edge.strokeWidth || 2) + 14)}
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
          strokeLinejoin="round"
          className="pointer-events-none animate-pulse"
        />
      )}

      {/* Visible Path with Start and End Markers */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={edge.strokeWidth ?? (isSelected ? 2.5 : 1.75)}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        className="transition-colors group-hover:stroke-sky-400"
      />

      {/* Edge Label */}
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

      {/* Multi-Corner Orthogonal Segment Handles & Corner Split Knobs */}
      {isSelected && edgeType === 'orthogonal' && (
        <g className="pointer-events-auto">
          {editableSegments.map(seg => {
            const isVert = seg.orientation === 'v';
            const moveAxis: 'x' | 'y' = isVert ? 'x' : 'y';
            const moveCoord = isVert ? seg.x1 : seg.y1;
            const splitAxis: 'x' | 'y' = isVert ? 'x' : 'y';
            const splitCoord = isVert ? seg.x1 : seg.y1;

            // Avoid sitting directly underneath the edge label pill
            const labelCollision =
              !!edge.label && Math.hypot(seg.midX - midX, seg.midY - midY) < 28;
            const sliderX = labelCollision ? seg.x1 + (seg.x2 - seg.x1) * 0.78 : seg.midX;
            const sliderY = labelCollision ? seg.y1 + (seg.y2 - seg.y1) * 0.78 : seg.midY;
            const splitX = seg.isMovable
              ? seg.x1 + (seg.x2 - seg.x1) * 0.24
              : seg.midX;
            const splitY = seg.isMovable
              ? seg.y1 + (seg.y2 - seg.y1) * 0.24
              : seg.midY;

            return (
              <React.Fragment key={`seg-${seg.index}`}>
                {/* Segment slide handle on every interior segment */}
                {seg.isMovable && (
                  <g
                    className={`${isVert ? 'cursor-ew-resize' : 'cursor-ns-resize'} group/segment`}
                    transform={`translate(${sliderX}, ${sliderY})`}
                    onMouseDown={e => {
                      e.stopPropagation();
                      if (onStartMoveWaypointSegment) {
                        onStartMoveWaypointSegment(edge.id, seg.index, moveAxis, moveCoord, orthogonalPoints, e);
                      } else {
                        onStartMoveSegment?.(edge.id, moveAxis, moveCoord, e);
                      }
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      if (onResetRouting) {
                        onResetRouting(edge.id);
                      } else {
                        onResetSegmentOffset?.(edge.id);
                      }
                    }}
                  >
                    <title>Drag to slide this corner segment (Double-click to reset routing)</title>
                    <rect
                      x={isVert ? -10 : -16}
                      y={isVert ? -16 : -10}
                      width={isVert ? 20 : 32}
                      height={isVert ? 32 : 20}
                      fill="transparent"
                    />
                    <rect
                      x={isVert ? -4 : -11}
                      y={isVert ? -11 : -4}
                      width={isVert ? 8 : 22}
                      height={isVert ? 22 : 8}
                      rx={4}
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="shadow-md transition-transform [transform-box:fill-box] origin-center group-hover/segment:scale-125"
                    />
                    {isVert ? (
                      <line x1={0} y1={-5} x2={0} y2={5} stroke="#ffffff" strokeWidth={1.4} />
                    ) : (
                      <line x1={-5} y1={0} x2={5} y2={0} stroke="#ffffff" strokeWidth={1.4} />
                    )}
                  </g>
                )}

                {/* "+" Corner Detour Split Handle on sufficiently long segments */}
                {seg.canSplit && onStartSplitSegment && (!labelCollision || !seg.isMovable) && (
                  <g
                    className="cursor-crosshair group/split"
                    transform={`translate(${splitX}, ${splitY})`}
                    onMouseDown={e => {
                      e.stopPropagation();
                      onStartSplitSegment(edge.id, seg.index, splitAxis, splitCoord, orthogonalPoints, e);
                    }}
                  >
                    <title>Click or drag to add 2 extra 90° corners on this segment</title>
                    <circle r={12} fill="transparent" />
                    <circle
                      r={6.5}
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      className="transition-transform [transform-box:fill-box] origin-center group-hover/split:scale-125 group-hover/split:fill-sky-600"
                    />
                    <line x1={-3} y1={0} x2={3} y2={0} stroke="#e0f2fe" strokeWidth={1.4} />
                    <line x1={0} y1={-3} x2={0} y2={3} stroke="#e0f2fe" strokeWidth={1.4} />
                  </g>
                )}
              </React.Fragment>
            );
          })}
        </g>
      )}

      {/* Selected Edge Endpoint Drag Handles */}
      {isSelected && (
        <g className="pointer-events-auto">
          <g
            className={`group/handle ${
              temporaryStart
                ? 'pointer-events-none opacity-80'
                : 'cursor-grab active:cursor-grabbing pointer-events-auto'
            }`}
            transform={`translate(${start.x}, ${start.y})`}
            onMouseDown={e => {
              e.stopPropagation();
              onStartReconnectEdge?.(edge.id, 'source', e);
            }}
          >
            <title>{`Drag start point from "${sourceNode.label}" to another anchor point`}</title>
            <circle r={22} fill="transparent" className={temporaryStart ? 'pointer-events-none' : 'cursor-grab'} />
            <circle
              r={13}
              fill="rgba(56, 189, 248, 0.25)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              className="animate-ping [transform-box:fill-box] origin-center pointer-events-none"
            />
            <circle
              r={8.5}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={2.5}
              className="shadow-lg transition-transform [transform-box:fill-box] origin-center group-hover/handle:scale-130 pointer-events-none"
            />
            <circle r={3} fill="#ffffff" className="pointer-events-none" />
          </g>

          <g
            className={`group/handle ${
              temporaryEnd
                ? 'pointer-events-none opacity-80'
                : 'cursor-grab active:cursor-grabbing pointer-events-auto'
            }`}
            transform={`translate(${end.x}, ${end.y})`}
            onMouseDown={e => {
              e.stopPropagation();
              onStartReconnectEdge?.(edge.id, 'target', e);
            }}
          >
            <title>{`Drag end point from "${targetNode.label}" to another anchor point`}</title>
            <circle r={22} fill="transparent" className="cursor-grab" />
            <circle
              r={13}
              fill="rgba(52, 211, 153, 0.25)"
              stroke="#34d399"
              strokeWidth={1.5}
              className="animate-ping [transform-box:fill-box] origin-center pointer-events-none"
            />
            <circle
              r={8.5}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={2.5}
              className="shadow-lg transition-transform [transform-box:fill-box] origin-center group-hover/handle:scale-130 pointer-events-none"
            />
            <circle r={3} fill="#ffffff" className="pointer-events-none" />
          </g>
        </g>
      )}
    </g>
  );
};
