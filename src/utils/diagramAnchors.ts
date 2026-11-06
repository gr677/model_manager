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
    positionStyle: { top: '-5px', left: '25%', transform: 'translate(-50%, 0)' },
  },
  {
    id: 'top',
    label: 'Top Center (50%)',
    side: 'top',
    fraction: 0.5,
    positionStyle: { top: '-5px', left: '50%', transform: 'translate(-50%, 0)' },
  },
  {
    id: 'top-right',
    label: 'Top Right (75%)',
    side: 'top',
    fraction: 0.75,
    positionStyle: { top: '-5px', left: '75%', transform: 'translate(-50%, 0)' },
  },

  // Right face (3 points)
  {
    id: 'right-top',
    label: 'Right Top (25%)',
    side: 'right',
    fraction: 0.25,
    positionStyle: { right: '-5px', top: '25%', transform: 'translate(0, -50%)' },
  },
  {
    id: 'right',
    label: 'Right Center (50%)',
    side: 'right',
    fraction: 0.5,
    positionStyle: { right: '-5px', top: '50%', transform: 'translate(0, -50%)' },
  },
  {
    id: 'right-bottom',
    label: 'Right Bottom (75%)',
    side: 'right',
    fraction: 0.75,
    positionStyle: { right: '-5px', top: '75%', transform: 'translate(0, -50%)' },
  },

  // Bottom face (3 points)
  {
    id: 'bottom-right',
    label: 'Bottom Right (75%)',
    side: 'bottom',
    fraction: 0.75,
    positionStyle: { bottom: '-5px', left: '75%', transform: 'translate(-50%, 0)' },
  },
  {
    id: 'bottom',
    label: 'Bottom Center (50%)',
    side: 'bottom',
    fraction: 0.5,
    positionStyle: { bottom: '-5px', left: '50%', transform: 'translate(-50%, 0)' },
  },
  {
    id: 'bottom-left',
    label: 'Bottom Left (25%)',
    side: 'bottom',
    fraction: 0.25,
    positionStyle: { bottom: '-5px', left: '25%', transform: 'translate(-50%, 0)' },
  },

  // Left face (3 points)
  {
    id: 'left-bottom',
    label: 'Left Bottom (75%)',
    side: 'left',
    fraction: 0.75,
    positionStyle: { left: '-5px', top: '75%', transform: 'translate(0, -50%)' },
  },
  {
    id: 'left',
    label: 'Left Center (50%)',
    side: 'left',
    fraction: 0.5,
    positionStyle: { left: '-5px', top: '50%', transform: 'translate(0, -50%)' },
  },
  {
    id: 'left-top',
    label: 'Left Top (25%)',
    side: 'left',
    fraction: 0.25,
    positionStyle: { left: '-5px', top: '25%', transform: 'translate(0, -50%)' },
  },
];

/**
 * Returns exact canvas coordinates for a given anchor point on a node.
 */
export function getNodeAnchorCoords(node: DiagramNode, anchor?: string): { x: number; y: number } {
  const w = node.width;
  const h = node.height;
  const x = node.x;
  const y = node.y;

  switch (anchor) {
    // Top side
    case 'top-left':
      return { x: x + w * 0.25, y };
    case 'top':
      return { x: x + w * 0.5, y };
    case 'top-right':
      return { x: x + w * 0.75, y };

    // Right side
    case 'right-top':
      return { x: x + w, y: y + h * 0.25 };
    case 'right':
      return { x: x + w, y: y + h * 0.5 };
    case 'right-bottom':
      return { x: x + w, y: y + h * 0.75 };

    // Bottom side
    case 'bottom-right':
      return { x: x + w * 0.75, y: y + h };
    case 'bottom':
      return { x: x + w * 0.5, y: y + h };
    case 'bottom-left':
      return { x: x + w * 0.25, y: y + h };

    // Left side
    case 'left-bottom':
      return { x, y: y + h * 0.75 };
    case 'left':
      return { x, y: y + h * 0.5 };
    case 'left-top':
      return { x, y: y + h * 0.25 };

    default:
      return { x: x + w * 0.5, y: y + h * 0.5 };
  }
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
