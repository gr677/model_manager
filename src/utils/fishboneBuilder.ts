/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramEdge, DiagramNode } from '../types/diagram';

export interface FishboneCategorySpec {
  title: string;
  color: string;
  fill: string;
  textColor: string;
  causes: string[];
}

export interface FishboneTemplateOptions {
  problemStatement?: string;
  idPrefix?: string;
  offsetX?: number;
  offsetY?: number;
  topCategories?: FishboneCategorySpec[];
  bottomCategories?: FishboneCategorySpec[];
}

const DEFAULT_TOP_CATEGORIES: FishboneCategorySpec[] = [
  {
    title: 'MANPOWER / PEOPLE',
    color: '#38bdf8',
    fill: 'rgba(14, 116, 144, 0.88)',
    textColor: '#e0f2fe',
    causes: ['Insufficient on-call training', 'Manual deployment errors'],
  },
  {
    title: 'MACHINE / INFRA',
    color: '#fb7185',
    fill: 'rgba(159, 18, 57, 0.88)',
    textColor: '#ffe4e6',
    causes: ['Connection pool exhaustion', 'Pod CPU throttling (k8s)'],
  },
  {
    title: 'METHOD / PROCESS',
    color: '#fbbf24',
    fill: 'rgba(146, 64, 14, 0.88)',
    textColor: '#fef3c7',
    causes: ['N+1 database queries', 'Synchronous external API calls'],
  },
];

const DEFAULT_BOTTOM_CATEGORIES: FishboneCategorySpec[] = [
  {
    title: 'MATERIAL / DATA',
    color: '#34d399',
    fill: 'rgba(6, 95, 70, 0.88)',
    textColor: '#d1fae5',
    causes: ['Unindexed JSON payloads', 'Oversized response > 2MB'],
  },
  {
    title: 'MEASUREMENT',
    color: '#a78bfa',
    fill: 'rgba(91, 33, 182, 0.88)',
    textColor: '#ede9fe',
    causes: ['Missing P99 latency alerts', 'Delayed log aggregation'],
  },
  {
    title: 'MILIEU / ENVIRONMENT',
    color: '#2dd4bf',
    fill: 'rgba(17, 94, 89, 0.88)',
    textColor: '#ccfbf1',
    causes: ['Black Friday traffic spike', 'Cross-AZ network latency'],
  },
];

/**
 * Generates an authentic, geometrically aligned 6M Ishikawa (Fishbone) diagram:
 * - Forked tail fin on the left
 * - Thick horizontal central backbone spine leading to a stylized Fish Head on the right
 * - 6 angled diagonal category ribs (~67°) above and below the spine
 * - Horizontal cause twigs feeding cleanly into each diagonal category rib
 */
export function createFishboneTemplate(
  options: FishboneTemplateOptions = {}
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const prefix = options.idPrefix || `fb-${Date.now()}`;
  const ox = options.offsetX ?? 0;
  const oy = options.offsetY ?? 0;
  const problem =
    options.problemStatement ||
    'EFFECT / PROBLEM:\nAPI P99 Latency > 1200ms';

  const topCats = options.topCategories || DEFAULT_TOP_CATEGORIES;
  const bottomCats = options.bottomCategories || DEFAULT_BOTTOM_CATEGORIES;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  const spineCenterY = 360 + oy;
  const spineColor = '#94a3b8';

  // 1. Tail fin on far left
  const tailId = `${prefix}-tail`;
  nodes.push({
    id: tailId,
    type: 'fishbone-tail',
    label: 'Root Causes',
    x: 40 + ox,
    y: spineCenterY - 50,
    width: 64,
    height: 100,
    style: {
      fill: 'rgba(51, 65, 85, 0.9)',
      stroke: spineColor,
      strokeWidth: 2.5,
      textColor: '#cbd5e1',
    },
    data: { role: 'tail' },
  });

  // 2. Spine junction dots along the horizontal centerline
  const colCount = Math.max(topCats.length, bottomCats.length, 3);
  const firstJunctionCenterX = 400 + ox;
  const colSpacing = 340;
  const spineJunctionIds: string[] = [];

  for (let i = 0; i < colCount; i++) {
    const jxCenter = firstJunctionCenterX + i * colSpacing;
    const jId = `${prefix}-spine-j${i + 1}`;
    spineJunctionIds.push(jId);
    nodes.push({
      id: jId,
      type: 'fishbone-junction',
      label: `Spine Joint ${i + 1}`,
      x: jxCenter - 8,
      y: spineCenterY - 8,
      width: 16,
      height: 16,
      style: {
        fill: '#cbd5e1',
        stroke: '#0f172a',
        strokeWidth: 2,
      },
      data: { role: 'spine-junction' },
    });
  }

  // 3. Fish Head on far right
  const lastJunctionCenterX = firstJunctionCenterX + (colCount - 1) * colSpacing;
  const headId = `${prefix}-head`;
  nodes.push({
    id: headId,
    type: 'fishbone-head',
    label: problem,
    x: lastJunctionCenterX + 85,
    y: spineCenterY - 62,
    width: 230,
    height: 124,
    style: {
      fill: 'rgba(225, 29, 72, 0.92)',
      stroke: '#fb7185',
      strokeWidth: 3,
      textColor: '#fff1f2',
    },
    data: { isHead: true },
  });

  // 4. Connect horizontal central spine (Tail -> Spine Junctions -> Fish Head)
  let prevSpineId = tailId;
  spineJunctionIds.forEach((jId, idx) => {
    edges.push({
      id: `${prefix}-spine-e${idx + 1}`,
      sourceNodeId: prevSpineId,
      targetNodeId: jId,
      sourceAnchor: 'right',
      targetAnchor: 'left',
      type: 'straight',
      lineStyle: 'solid',
      strokeWidth: 3.5,
      markerStart: 'none',
      markerEnd: 'none',
      color: spineColor,
    });
    prevSpineId = jId;
  });

  edges.push({
    id: `${prefix}-spine-e-head`,
    sourceNodeId: prevSpineId,
    targetNodeId: headId,
    sourceAnchor: 'right',
    targetAnchor: 'left',
    type: 'straight',
    lineStyle: 'solid',
    strokeWidth: 3.5,
    markerStart: 'none',
    markerEnd: 'arrow',
    color: '#fb7185',
  });

  // Helper to lay out one diagonal category rib + its horizontal sub-cause twigs
  const addCategoryBranch = (
    cat: FishboneCategorySpec,
    colIndex: number,
    side: 'top' | 'bottom'
  ) => {
    const spineJunctionId = spineJunctionIds[colIndex];
    const spineCenterX = firstJunctionCenterX + colIndex * colSpacing;
    const spineAnchorY = side === 'top' ? spineCenterY - 8 : spineCenterY + 8;

    const catWidth = 186;
    const catHeight = 44;
    // Shift category header left of spine junction to produce ~67° diagonal bone slope
    const catAnchorX = spineCenterX - 115;
    const catX = catAnchorX - catWidth / 2;
    const catY = side === 'top' ? 40 + oy : spineCenterY + 260;
    const catAnchorY = side === 'top' ? catY + catHeight : catY;

    const catId = `${prefix}-${side}-cat-${colIndex + 1}`;
    nodes.push({
      id: catId,
      type: 'fishbone-category',
      label: cat.title,
      x: catX,
      y: catY,
      width: catWidth,
      height: catHeight,
      style: {
        fill: cat.fill,
        stroke: cat.color,
        strokeWidth: 2,
        textColor: cat.textColor,
        rounded: 6,
      },
      data: { side, branch: cat.title.toLowerCase() },
    });

    // Diagonal category rib edge straight into the spine junction
    edges.push({
      id: `${prefix}-${side}-rib-${colIndex + 1}`,
      sourceNodeId: catId,
      targetNodeId: spineJunctionId,
      sourceAnchor: side === 'top' ? 'bottom' : 'top',
      targetAnchor: side === 'top' ? 'top' : 'bottom',
      type: 'straight',
      lineStyle: 'solid',
      strokeWidth: 2.5,
      markerStart: 'none',
      markerEnd: 'arrow',
      color: cat.color,
    });

    // Horizontal cause twigs feeding into collinear rib joints along the diagonal rib
    const causes = cat.causes.slice(0, 3);
    const tPositions =
      causes.length === 1
        ? [0.5]
        : causes.length === 2
        ? [0.36, 0.68]
        : [0.26, 0.52, 0.78];

    causes.forEach((causeLabel, cIdx) => {
      const t = tPositions[cIdx];
      const jointCenterX = catAnchorX + t * (spineCenterX - catAnchorX);
      const jointCenterY = catAnchorY + t * (spineAnchorY - catAnchorY);

      const ribJointId = `${prefix}-${side}-j-${colIndex + 1}-${cIdx + 1}`;
      nodes.push({
        id: ribJointId,
        type: 'fishbone-junction',
        label: `${cat.title} Joint ${cIdx + 1}`,
        x: jointCenterX - 7,
        y: jointCenterY - 7,
        width: 14,
        height: 14,
        style: {
          fill: cat.color,
          stroke: '#0f172a',
          strokeWidth: 1.5,
        },
        data: { role: 'rib-junction', side },
      });

      const twigWidth = 166;
      const twigHeight = 32;
      const twigId = `${prefix}-${side}-cause-${colIndex + 1}-${cIdx + 1}`;
      nodes.push({
        id: twigId,
        type: 'fishbone-cause',
        label: causeLabel,
        x: jointCenterX - 7 - 26 - twigWidth,
        y: jointCenterY - twigHeight / 2,
        width: twigWidth,
        height: twigHeight,
        style: {
          fill: 'rgba(15, 23, 42, 0.65)',
          stroke: cat.color,
          strokeWidth: 2,
          textColor: '#f1f5f9',
        },
        data: { side, category: cat.title },
      });

      edges.push({
        id: `${prefix}-${side}-twig-${colIndex + 1}-${cIdx + 1}`,
        sourceNodeId: twigId,
        targetNodeId: ribJointId,
        sourceAnchor: 'right',
        targetAnchor: 'left',
        type: 'straight',
        lineStyle: 'solid',
        strokeWidth: 1.75,
        markerStart: 'none',
        markerEnd: 'arrow',
        color: cat.color,
      });
    });
  };

  topCats.forEach((cat, idx) => addCategoryBranch(cat, idx, 'top'));
  bottomCats.forEach((cat, idx) => addCategoryBranch(cat, idx, 'bottom'));

  return { nodes, edges };
}
