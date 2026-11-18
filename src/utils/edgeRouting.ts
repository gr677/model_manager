/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramNode, NodeAnchor } from '../types/diagram';
import { isAnchorHorizontal } from './diagramAnchors';

export interface Point {
  x: number;
  y: number;
}

export interface EditableSegment {
  index: number;
  orientation: 'h' | 'v';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  length: number;
  isMovable: boolean;
  canSplit: boolean;
}

export function getAnchorDirection(anchor?: NodeAnchor): 'left' | 'right' | 'top' | 'bottom' {
  if (!anchor) return 'right';
  if (anchor.startsWith('left')) return 'left';
  if (anchor.startsWith('right')) return 'right';
  if (anchor.startsWith('top')) return 'top';
  if (anchor.startsWith('bottom')) return 'bottom';
  return 'right';
}

function sameCoord(a: number, b: number, eps = 0.75): boolean {
  return Math.abs(a - b) <= eps;
}

/**
 * Removes duplicate consecutive points and intermediate collinear points
 * while always preserving the exact first (start) and last (end) endpoints.
 */
export function simplifyOrthogonalPoints(rawPoints: Point[]): Point[] {
  if (rawPoints.length <= 2) return rawPoints.map(p => ({ ...p }));

  // 1. Deduplicate consecutive points
  const deduped: Point[] = [{ ...rawPoints[0] }];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = rawPoints[i];
    if (!sameCoord(prev.x, curr.x) || !sameCoord(prev.y, curr.y)) {
      deduped.push({ x: curr.x, y: curr.y });
    }
  }
  if (deduped.length <= 2) return deduped;

  // 2. Remove intermediate collinear points
  const result: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const collinearX = sameCoord(prev.x, curr.x) && sameCoord(curr.x, next.x);
    const collinearY = sameCoord(prev.y, curr.y) && sameCoord(curr.y, next.y);
    if (!collinearX && !collinearY) {
      result.push(curr);
    }
  }
  result.push(deduped[deduped.length - 1]);
  return result;
}

/**
 * Ensures every consecutive pair (a, b) is strictly horizontal or vertical
 * by inserting an orthogonal L-corner whenever a hop is diagonal (e.g. after node move).
 */
function ensureOrthogonalChain(
  points: Point[],
  sourceAnchor?: NodeAnchor,
  targetAnchor?: NodeAnchor
): Point[] {
  if (points.length < 2) return points;
  const out: Point[] = [{ ...points[0] }];
  const startHoriz = isAnchorHorizontal(sourceAnchor);
  const endHoriz = isAnchorHorizontal(targetAnchor);

  for (let i = 0; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i + 1];
    if (!sameCoord(a.x, b.x) && !sameCoord(a.y, b.y)) {
      let useHorizFirst = i === 0 ? startHoriz : i === points.length - 2 ? !endHoriz : true;
      if (i > 0 && out.length >= 2) {
        const prev = out[out.length - 2];
        // Continue perpendicular to the previous segment when possible
        useHorizFirst = sameCoord(prev.x, a.x);
      }
      if (useHorizFirst) {
        out.push({ x: b.x, y: a.y });
      } else {
        out.push({ x: a.x, y: b.y });
      }
    }
    out.push({ x: b.x, y: b.y });
  }

  return simplifyOrthogonalPoints(out);
}

/**
 * Computes clean orthogonal vertices from start -> end respecting anchor directions,
 * optional legacy midOffset, and optional multi-corner custom waypoints.
 */
export function buildOrthogonalVertices(
  start: Point,
  end: Point,
  sourceAnchor?: NodeAnchor,
  targetAnchor?: NodeAnchor,
  midOffset?: number,
  waypoints?: Point[]
): Point[] {
  if (waypoints && waypoints.length > 0) {
    return ensureOrthogonalChain([start, ...waypoints, end], sourceAnchor, targetAnchor);
  }

  const sDir = getAnchorDirection(sourceAnchor);
  const tDir = getAnchorDirection(targetAnchor);
  const sHoriz = sDir === 'left' || sDir === 'right';
  const tHoriz = tDir === 'left' || tDir === 'right';
  const STUB = 28;

  // Case 1: Both horizontal anchors
  if (sHoriz && tHoriz) {
    if (sDir !== tDir) {
      const forward =
        (sDir === 'right' && end.x >= start.x + STUB) ||
        (sDir === 'left' && end.x <= start.x - STUB);

      if (forward || midOffset !== undefined) {
        const midX = midOffset !== undefined ? midOffset : (start.x + end.x) / 2;
        return simplifyOrthogonalPoints([
          start,
          { x: midX, y: start.y },
          { x: midX, y: end.y },
          end,
        ]);
      }

      // Wrap around cleanly with 4 corners when target lies behind source
      const sx = sDir === 'right' ? start.x + STUB : start.x - STUB;
      const ex = tDir === 'left' ? end.x - STUB : end.x + STUB;
      const wrapY =
        Math.abs(start.y - end.y) >= 72
          ? (start.y + end.y) / 2
          : Math.min(start.y, end.y) - 56;
      return simplifyOrthogonalPoints([
        start,
        { x: sx, y: start.y },
        { x: sx, y: wrapY },
        { x: ex, y: wrapY },
        { x: ex, y: end.y },
        end,
      ]);
    }

    // Same horizontal side (e.g. right -> right or left -> left)
    const outX =
      midOffset !== undefined
        ? midOffset
        : sDir === 'right'
        ? Math.max(start.x, end.x) + 36
        : Math.min(start.x, end.x) - 36;
    return simplifyOrthogonalPoints([
      start,
      { x: outX, y: start.y },
      { x: outX, y: end.y },
      end,
    ]);
  }

  // Case 2: Both vertical anchors
  if (!sHoriz && !tHoriz) {
    if (sDir !== tDir) {
      const forward =
        (sDir === 'bottom' && end.y >= start.y + STUB) ||
        (sDir === 'top' && end.y <= start.y - STUB);

      if (forward || midOffset !== undefined) {
        const midY = midOffset !== undefined ? midOffset : (start.y + end.y) / 2;
        return simplifyOrthogonalPoints([
          start,
          { x: start.x, y: midY },
          { x: end.x, y: midY },
          end,
        ]);
      }

      const sy = sDir === 'bottom' ? start.y + STUB : start.y - STUB;
      const ey = tDir === 'top' ? end.y - STUB : end.y + STUB;
      const wrapX =
        Math.abs(start.x - end.x) >= 72
          ? (start.x + end.x) / 2
          : Math.min(start.x, end.x) - 56;
      return simplifyOrthogonalPoints([
        start,
        { x: start.x, y: sy },
        { x: wrapX, y: sy },
        { x: wrapX, y: ey },
        { x: end.x, y: ey },
        end,
      ]);
    }

    const outY =
      midOffset !== undefined
        ? midOffset
        : sDir === 'bottom'
        ? Math.max(start.y, end.y) + 36
        : Math.min(start.y, end.y) - 36;
    return simplifyOrthogonalPoints([
      start,
      { x: start.x, y: outY },
      { x: end.x, y: outY },
      end,
    ]);
  }

  // Case 3: Mixed horizontal <-> vertical anchors
  if (sHoriz && !tHoriz) {
    if (midOffset !== undefined) {
      return simplifyOrthogonalPoints([
        start,
        { x: midOffset, y: start.y },
        { x: midOffset, y: end.y - (tDir === 'top' ? STUB : -STUB) },
        { x: end.x, y: end.y - (tDir === 'top' ? STUB : -STUB) },
        end,
      ]);
    }
    const cleanHoriz = (sDir === 'right' && end.x >= start.x + 12) || (sDir === 'left' && end.x <= start.x - 12);
    const cleanVert = (tDir === 'top' && end.y >= start.y + 12) || (tDir === 'bottom' && end.y <= start.y - 12);
    if (cleanHoriz && cleanVert) {
      return simplifyOrthogonalPoints([start, { x: end.x, y: start.y }, end]);
    }
    const sx = sDir === 'right' ? start.x + STUB : start.x - STUB;
    const ey = tDir === 'top' ? end.y - STUB : end.y + STUB;
    return simplifyOrthogonalPoints([
      start,
      { x: sx, y: start.y },
      { x: sx, y: ey },
      { x: end.x, y: ey },
      end,
    ]);
  }

  // Vertical start -> horizontal target
  if (midOffset !== undefined) {
    return simplifyOrthogonalPoints([
      start,
      { x: start.x, y: midOffset },
      { x: end.x - (tDir === 'left' ? STUB : -STUB), y: midOffset },
      { x: end.x - (tDir === 'left' ? STUB : -STUB), y: end.y },
      end,
    ]);
  }
  const cleanVert = (sDir === 'bottom' && end.y >= start.y + 12) || (sDir === 'top' && end.y <= start.y - 12);
  const cleanHoriz = (tDir === 'left' && end.x >= start.x + 12) || (tDir === 'right' && end.x <= start.x - 12);
  if (cleanVert && cleanHoriz) {
    return simplifyOrthogonalPoints([start, { x: start.x, y: end.y }, end]);
  }
  const sy = sDir === 'bottom' ? start.y + STUB : start.y - STUB;
  const ex = tDir === 'left' ? end.x - STUB : end.x + STUB;
  return simplifyOrthogonalPoints([
    start,
    { x: start.x, y: sy },
    { x: ex, y: sy },
    { x: ex, y: end.y },
    end,
  ]);
}

export function verticesToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Returns the visual midpoint along the total arc length of an orthogonal polyline
 * for balanced edge label placement.
 */
export function getPathMidpointLabelPos(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen === 0) return points[0];
  let targetDist = totalLen / 2;
  for (let i = 0; i < segLens.length; i++) {
    if (targetDist <= segLens[i] || i === segLens.length - 1) {
      const t = segLens[i] > 0 ? targetDist / segLens[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    targetDist -= segLens[i];
  }
  return points[Math.floor(points.length / 2)];
}

/**
 * Decomposes an orthogonal polyline into draggable and splittable segments.
 */
export function getEditableSegments(points: Point[]): EditableSegment[] {
  const segments: EditableSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;

    const orientation: 'h' | 'v' = dx >= dy ? 'h' : 'v';
    const isInterior = i >= 1 && i <= points.length - 3;

    segments.push({
      index: i,
      orientation,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      length,
      isMovable: isInterior,
      canSplit: length >= 28,
    });
  }
  return segments;
}

/**
 * Slides an interior orthogonal segment perpendicular to its axis,
 * returning the updated interior waypoints array.
 */
export function moveOrthogonalSegment(
  points: Point[],
  segIndex: number,
  newCoord: number,
  simplify = true
): Point[] {
  if (segIndex < 1 || segIndex > points.length - 3) {
    return points.slice(1, -1);
  }
  const cloned = points.map(p => ({ ...p }));
  const a = cloned[segIndex];
  const b = cloned[segIndex + 1];
  const isHorizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);

  if (isHorizontal) {
    a.y = newCoord;
    b.y = newCoord;
  } else {
    a.x = newCoord;
    b.x = newCoord;
  }

  const finalPts = simplify ? simplifyOrthogonalPoints(cloned) : cloned;
  return finalPts.slice(1, -1);
}

/**
 * Splits a segment into 3 segments by inserting 2 new 90-degree corners (a U-detour),
 * returning the updated waypoints and the newly created middle segment index.
 */
export function splitOrthogonalSegment(
  points: Point[],
  segIndex: number,
  detourCoord?: number,
  defaultOffset = 44
): { waypoints: Point[]; newSegmentIndex: number; orientation: 'h' | 'v' } {
  if (segIndex < 0 || segIndex >= points.length - 1) {
    return { waypoints: points.slice(1, -1), newSegmentIndex: 1, orientation: 'h' };
  }

  const a = points[segIndex];
  const b = points[segIndex + 1];
  const isHorizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);

  const inserted: Point[] = [];
  if (isHorizontal) {
    // Split horizontal segment along X into two vertical bends + horizontal middle bar
    const x1 = a.x + (b.x - a.x) * 0.32;
    const x2 = a.x + (b.x - a.x) * 0.68;
    const targetY = detourCoord !== undefined ? detourCoord : a.y + defaultOffset;
    inserted.push(
      { x: x1, y: a.y },
      { x: x1, y: targetY },
      { x: x2, y: targetY },
      { x: x2, y: b.y }
    );
  } else {
    // Split vertical segment along Y into two horizontal bends + vertical middle bar
    const y1 = a.y + (b.y - a.y) * 0.32;
    const y2 = a.y + (b.y - a.y) * 0.68;
    const targetX = detourCoord !== undefined ? detourCoord : a.x + defaultOffset;
    inserted.push(
      { x: a.x, y: y1 },
      { x: targetX, y: y1 },
      { x: targetX, y: y2 },
      { x: b.x, y: y2 }
    );
  }

  const updated = [
    ...points.slice(0, segIndex + 1),
    ...inserted,
    ...points.slice(segIndex + 1),
  ];
  const newSegmentIndex = segIndex + 2;

  return {
    waypoints: updated.slice(1, -1),
    newSegmentIndex,
    orientation: isHorizontal ? 'h' : 'v',
  };
}

/**
 * Computes optimal facing anchors between source and target nodes for 1-click Reset Routing.
 */
export function getOptimalAnchors(
  sourceNode: DiagramNode,
  targetNode: DiagramNode
): { sourceAnchor: NodeAnchor; targetAnchor: NodeAnchor } {
  const sCx = sourceNode.x + sourceNode.width / 2;
  const sCy = sourceNode.y + sourceNode.height / 2;
  const tCx = targetNode.x + targetNode.width / 2;
  const tCy = targetNode.y + targetNode.height / 2;

  const dx = tCx - sCx;
  const dy = tCy - sCy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceAnchor: 'right', targetAnchor: 'left' }
      : { sourceAnchor: 'left', targetAnchor: 'right' };
  }
  return dy >= 0
    ? { sourceAnchor: 'bottom', targetAnchor: 'top' }
    : { sourceAnchor: 'top', targetAnchor: 'bottom' };
}
