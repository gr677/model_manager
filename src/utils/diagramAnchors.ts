/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramNode } from '../types/diagram';

export type NodeAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right-top'
  | 'right'
  | 'right-bottom'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left-bottom'
  | 'left'
  | 'left-top';

export interface NodeAnchorDef {
  id: NodeAnchor;
  label: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  fraction: number; // 0..1 along side
  positionStyle: React.CSSProperties;
}

/**
 * 12 perimeter connection points: 3 on each face (25%, 50%, 75%).
 * Allows fine-grained, accurate connection points that avoid corner resize handles.
 */
export const NODE_ANCHOR_DEFINITIONS: NodeAnchorDef[] = [
  // Top face (3 points)
  {
    id: 'top-left',
    label: 'Top Left (25%)',
    side: 'top',
    fraction: 0.25,
    positionStyle: { top: '0%', left: '25%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'top',
    label: 'Top Center (50%)',
    side: 'top',
    fraction: 0.5,
    positionStyle: { top: '0%', left: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'top-right',
    label: 'Top Right (75%)',
    side: 'top',
    fraction: 0.75,
    positionStyle: { top: '0%', left: '75%', transform: 'translate(-50%, -50%)' },
  },

  // Right face (3 points)
  {
    id: 'right-top',
    label: 'Right Top (25%)',
    side: 'right',
    fraction: 0.25,
    positionStyle: { top: '25%', left: '100%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'right',
    label: 'Right Center (50%)',
    side: 'right',
    fraction: 0.5,
    positionStyle: { top: '50%', left: '100%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'right-bottom',
    label: 'Right Bottom (75%)',
    side: 'right',
    fraction: 0.75,
    positionStyle: { top: '75%', left: '100%', transform: 'translate(-50%, -50%)' },
  },

  // Bottom face (3 points)
  {
    id: 'bottom-right',
    label: 'Bottom Right (75%)',
    side: 'bottom',
    fraction: 0.75,
    positionStyle: { top: '100%', left: '75%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'bottom',
    label: 'Bottom Center (50%)',
    side: 'bottom',
    fraction: 0.5,
    positionStyle: { top: '100%', left: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'bottom-left',
    label: 'Bottom Left (25%)',
    side: 'bottom',
    fraction: 0.25,
    positionStyle: { top: '100%', left: '25%', transform: 'translate(-50%, -50%)' },
  },

  // Left face (3 points)
  {
    id: 'left-bottom',
    label: 'Left Bottom (75%)',
    side: 'left',
    fraction: 0.75,
    positionStyle: { top: '75%', left: '0%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'left',
    label: 'Left Center (50%)',
    side: 'left',
    fraction: 0.5,
    positionStyle: { top: '50%', left: '0%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'left-top',
    label: 'Left Top (25%)',
    side: 'left',
    fraction: 0.25,
    positionStyle: { top: '25%', left: '0%', transform: 'translate(-50%, -50%)' },
  },
];

/**
 * Returns exact coordinates relative to the node's top-left (0,0),
 * adhering to the geometric perimeter of the node's shape (ellipse, diamond, parallelogram, capsule, or rectangle).
 */
export function getNodeAnchorRelativeCoords(node: DiagramNode, anchor?: string): { x: number; y: number } {
  const w = node.width;
  const h = node.height;
  const anchorId = (anchor || 'center') as NodeAnchor | 'center';

  // 1. True Ellipse / Oval / Circle
  // Used by mindmap-oval, uml-usecase, bpmn-event, dfd-process, or nodes explicitly marked oval
  const isOval =
    node.type === 'mindmap-oval' ||
    node.type === 'uml-usecase' ||
    node.type === 'bpmn-event' ||
    node.type === 'dfd-process' ||
    node.type === 'flow-connector' ||
    node.data?.shape === 'oval';

  if (isOval) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rx = w * 0.5;
    const ry = h * 0.5;

    // Standard parametric angles for 12 clock-like points:
    // sin(π/6) = 0.5, cos(π/6) = 0.866025
    // 0.5 - 0.5 * 0.866025 ≈ 0.067
    // 0.5 + 0.5 * 0.866025 ≈ 0.933
    switch (anchorId) {
      case 'top':
        return { x: cx, y: 0 };
      case 'top-right':
        return { x: cx + rx * 0.5, y: cy - ry * 0.866025 };
      case 'right-top':
        return { x: cx + rx * 0.866025, y: cy - ry * 0.5 };
      case 'right':
        return { x: w, y: cy };
      case 'right-bottom':
        return { x: cx + rx * 0.866025, y: cy + ry * 0.5 };
      case 'bottom-right':
        return { x: cx + rx * 0.5, y: cy + ry * 0.866025 };
      case 'bottom':
        return { x: cx, y: h };
      case 'bottom-left':
        return { x: cx - rx * 0.5, y: cy + ry * 0.866025 };
      case 'left-bottom':
        return { x: cx - rx * 0.866025, y: cy + ry * 0.5 };
      case 'left':
        return { x: 0, y: cy };
      case 'left-top':
        return { x: cx - rx * 0.866025, y: cy - ry * 0.5 };
      case 'top-left':
        return { x: cx - rx * 0.5, y: cy - ry * 0.866025 };
      default:
        return { x: cx, y: cy };
    }
  }

  // 1b. Inverted Triangle (Flowchart Merge / Summing Junction)
  if (node.type === 'flow-merge') {
    switch (anchorId) {
      case 'top-left':
        return { x: w * 0.25, y: 0 };
      case 'top':
        return { x: w * 0.5, y: 0 };
      case 'top-right':
        return { x: w * 0.75, y: 0 };
      case 'right-top':
        return { x: w * 0.875, y: h * 0.25 };
      case 'right':
        return { x: w * 0.75, y: h * 0.5 };
      case 'right-bottom':
        return { x: w * 0.625, y: h * 0.75 };
      case 'bottom-right':
      case 'bottom':
      case 'bottom-left':
        return { x: w * 0.5, y: h };
      case 'left-bottom':
        return { x: w * 0.375, y: h * 0.75 };
      case 'left':
        return { x: w * 0.25, y: h * 0.5 };
      case 'left-top':
        return { x: w * 0.125, y: h * 0.25 };
      default:
        return { x: w * 0.5, y: h * 0.5 };
    }
  }

  // 1c. Hexagon (Flowchart Preparation)
  if (node.type === 'flow-preparation') {
    const inset = Math.min(w * 0.16, 26);
    switch (anchorId) {
      case 'top-left':
        return { x: inset + (w - 2 * inset) * 0.25, y: 0 };
      case 'top':
        return { x: w * 0.5, y: 0 };
      case 'top-right':
        return { x: inset + (w - 2 * inset) * 0.75, y: 0 };
      case 'right-top':
        return { x: w - inset * 0.5, y: h * 0.25 };
      case 'right':
        return { x: w, y: h * 0.5 };
      case 'right-bottom':
        return { x: w - inset * 0.5, y: h * 0.75 };
      case 'bottom-right':
        return { x: inset + (w - 2 * inset) * 0.75, y: h };
      case 'bottom':
        return { x: w * 0.5, y: h };
      case 'bottom-left':
        return { x: inset + (w - 2 * inset) * 0.25, y: h };
      case 'left-bottom':
        return { x: inset * 0.5, y: h * 0.75 };
      case 'left':
        return { x: 0, y: h * 0.5 };
      case 'left-top':
        return { x: inset * 0.5, y: h * 0.25 };
      default:
        return { x: w * 0.5, y: h * 0.5 };
    }
  }

  // 2. True Diamond / Rhombus
  // Used by BPMN Gateway, Flowchart Decision, ERD Relationship
  const isDiamond =
    node.type === 'bpmn-gateway' ||
    node.type === 'flow-decision' ||
    node.type === 'erd-relation';

  if (isDiamond) {
    const cx = w * 0.5;
    const cy = h * 0.5;

    switch (anchorId) {
      case 'top':
        return { x: cx, y: 0 };
      case 'top-right':
        return { x: w * 0.675, y: h * 0.175 };
      case 'right-top':
        return { x: w * 0.85, y: h * 0.35 };
      case 'right':
        return { x: w, y: cy };
      case 'right-bottom':
        return { x: w * 0.85, y: h * 0.65 };
      case 'bottom-right':
        return { x: w * 0.675, y: h * 0.825 };
      case 'bottom':
        return { x: cx, y: h };
      case 'bottom-left':
        return { x: w * 0.325, y: h * 0.825 };
      case 'left-bottom':
        return { x: w * 0.15, y: h * 0.65 };
      case 'left':
        return { x: 0, y: cy };
      case 'left-top':
        return { x: w * 0.15, y: h * 0.35 };
      case 'top-left':
        return { x: w * 0.325, y: h * 0.175 };
      default:
        return { x: cx, y: cy };
    }
  }

  // 3. Parallelogram (Flowchart Data I/O)
  const isParallelogram = node.type === 'flow-data';
  if (isParallelogram) {
    const skew = Math.min(w * 0.18, 28);
    const topW = w - skew;
    const botW = w - skew;

    switch (anchorId) {
      case 'top-left':
        return { x: skew + topW * 0.25, y: 0 };
      case 'top':
        return { x: skew + topW * 0.5, y: 0 };
      case 'top-right':
        return { x: skew + topW * 0.75, y: 0 };
      case 'right-top':
        return { x: w - skew * 0.75, y: h * 0.25 };
      case 'right':
        return { x: w - skew * 0.5, y: h * 0.5 };
      case 'right-bottom':
        return { x: w - skew * 0.25, y: h * 0.75 };
      case 'bottom-right':
        return { x: botW * 0.75, y: h };
      case 'bottom':
        return { x: botW * 0.5, y: h };
      case 'bottom-left':
        return { x: botW * 0.25, y: h };
      case 'left-bottom':
        return { x: skew * 0.25, y: h * 0.75 };
      case 'left':
        return { x: skew * 0.5, y: h * 0.5 };
      case 'left-top':
        return { x: skew * 0.75, y: h * 0.25 };
      default:
        return { x: w * 0.5, y: h * 0.5 };
    }
  }

  // 4. Stadium / Capsule (Flowchart Terminator or fully rounded mindmap node)
  const isCapsule = node.type === 'flow-terminator';
  if (isCapsule && w > h) {
    const r = h * 0.5;
    const curveOffset = r * 0.293; // r * (1 - 1/sqrt(2))

    switch (anchorId) {
      case 'top-left':
        return { x: Math.max(r, w * 0.25), y: 0 };
      case 'top':
        return { x: w * 0.5, y: 0 };
      case 'top-right':
        return { x: Math.min(w - r, w * 0.75), y: 0 };
      case 'right-top':
        return { x: w - curveOffset, y: curveOffset };
      case 'right':
        return { x: w, y: h * 0.5 };
      case 'right-bottom':
        return { x: w - curveOffset, y: h - curveOffset };
      case 'bottom-right':
        return { x: Math.min(w - r, w * 0.75), y: h };
      case 'bottom':
        return { x: w * 0.5, y: h };
      case 'bottom-left':
        return { x: Math.max(r, w * 0.25), y: h };
      case 'left-bottom':
        return { x: curveOffset, y: h - curveOffset };
      case 'left':
        return { x: 0, y: h * 0.5 };
      case 'left-top':
        return { x: curveOffset, y: curveOffset };
      default:
        return { x: w * 0.5, y: h * 0.5 };
    }
  }

  // 5. Standard Rectangle Box (ERD Entity, BPMN Task, UML Class, Flow Process, Sticky Note, etc.)
  switch (anchorId) {
    // Top side
    case 'top-left':
      return { x: w * 0.25, y: 0 };
    case 'top':
      return { x: w * 0.5, y: 0 };
    case 'top-right':
      return { x: w * 0.75, y: 0 };

    // Right side
    case 'right-top':
      return { x: w, y: h * 0.25 };
    case 'right':
      return { x: w, y: h * 0.5 };
    case 'right-bottom':
      return { x: w, y: h * 0.75 };

    // Bottom side
    case 'bottom-right':
      return { x: w * 0.75, y: h };
    case 'bottom':
      return { x: w * 0.5, y: h };
    case 'bottom-left':
      return { x: w * 0.25, y: h };

    // Left side
    case 'left-bottom':
      return { x: 0, y: h * 0.75 };
    case 'left':
      return { x: 0, y: h * 0.5 };
    case 'left-top':
      return { x: 0, y: h * 0.25 };

    default:
      return { x: w * 0.5, y: h * 0.5 };
  }
}

/**
 * Returns exact canvas coordinates for a given anchor point on a node.
 */
export function getNodeAnchorCoords(node: DiagramNode, anchor?: string): { x: number; y: number } {
  const rel = getNodeAnchorRelativeCoords(node, anchor);
  return {
    x: node.x + rel.x,
    y: node.y + rel.y,
  };
}

/**
 * Given a point in canvas space (e.g. mouse release position), find the closest
 * connection anchor on the target node.
 */
export function getClosestAnchor(node: DiagramNode, px: number, py: number): NodeAnchor {
  let closest: NodeAnchor = 'top';
  let minDistance = Infinity;

  for (const def of NODE_ANCHOR_DEFINITIONS) {
    const coords = getNodeAnchorCoords(node, def.id);
    const dist = Math.hypot(coords.x - px, coords.y - py);
    if (dist < minDistance) {
      minDistance = dist;
      closest = def.id;
    }
  }

  return closest;
}

/**
 * Checks if an anchor exits/enters horizontally (left/right) or vertically (top/bottom)
 */
export function isAnchorHorizontal(anchor?: string): boolean {
  if (!anchor) return true;
  return anchor.startsWith('right') || anchor.startsWith('left');
}

/**
 * Friendly label for an anchor ID
 */
export function getAnchorLabel(anchor?: string): string {
  const match = NODE_ANCHOR_DEFINITIONS.find(a => a.id === anchor);
  return match ? match.label : (anchor || 'Center');
}

