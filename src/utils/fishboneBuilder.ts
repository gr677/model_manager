/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramEdge, DiagramNode, DiagramPage } from '../types/diagram';

export interface FishboneCauseInput {
  label: string;
  icon?: string;
}

export interface FishboneCategorySpec {
  title: string;
  color: string;
  fill: string;
  textColor: string;
  ribColor?: string;
  badgeFill?: string;
  causeFill?: string;
  icon?: string;
  causes: Array<string | FishboneCauseInput>;
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
    title: 'PRODUCT QUALITY',
    color: '#0369a1',
    ribColor: '#0284c7',
    fill: '#8ecae6',
    badgeFill: '#38bdf8',
    causeFill: '#bae6fd',
    textColor: '#0f172a',
    icon: 'settings',
    causes: [
      { label: 'Technical Bugs & Crashes', icon: 'clock' },
      { label: 'Poor Usability/UI', icon: 'bug' },
      { label: 'Missing Features', icon: 'puzzle' },
      { label: 'Slow Performance', icon: 'gauge' },
    ],
  },
  {
    title: 'CUSTOMER SERVICE',
    color: '#15803d',
    ribColor: '#16a34a',
    fill: '#86efac',
    badgeFill: '#4ade80',
    causeFill: '#bbf7d0',
    textColor: '#0f172a',
    icon: 'headphones',
    causes: [
      { label: 'Long Wait Times', icon: 'clock' },
      { label: 'Unresolved Issues', icon: 'alert-circle' },
      { label: 'Lack of Responsiveness', icon: 'headphones' },
      { label: 'Poor Agent Training', icon: 'user-check' },
    ],
  },
  {
    title: 'ONBOARDING',
    color: '#b45309',
    ribColor: '#ca8a04',
    fill: '#fde047',
    badgeFill: '#facc15',
    causeFill: '#fef08a',
    textColor: '#0f172a',
    icon: 'handshake',
    causes: [
      { label: 'Inadequate Setup Guide', icon: 'clock' },
      { label: 'Steep Learning Curve', icon: 'trending-up' },
      { label: 'Low Early Engagement', icon: 'refresh-cw' },
      { label: 'Confusing Initial Experience', icon: 'help-circle' },
    ],
  },
];

const DEFAULT_BOTTOM_CATEGORIES: FishboneCategorySpec[] = [
  {
    title: 'PRICING & VALUE',
    color: '#c2410c',
    ribColor: '#c2410c',
    fill: '#fdba74',
    badgeFill: '#fb923c',
    causeFill: '#fed7aa',
    textColor: '#0f172a',
    icon: 'tag',
    causes: [
      { label: 'Price Increases', icon: 'trending-up' },
      { label: 'Low Perceived Value', icon: 'coins' },
      { label: 'Competitive Pricing', icon: 'tag' },
      { label: 'Hidden Fees', icon: 'dollar-sign' },
    ],
  },
  {
    title: 'COMPETITION',
    color: '#6d28d9',
    ribColor: '#7c3aed',
    fill: '#d8b4fe',
    badgeFill: '#c084fc',
    causeFill: '#e9d5ff',
    textColor: '#0f172a',
    icon: 'trophy',
    causes: [
      { label: 'Better Competitor Features', icon: 'sparkles' },
      { label: 'Lower Competitor Pricing', icon: 'percent' },
      { label: 'New Competitor Entry', icon: 'smartphone' },
      { label: 'Strong Marketing Campaigns', icon: 'megaphone' },
    ],
  },
  {
    title: 'ENGAGEMENT & RETENTION',
    color: '#b91c1c',
    ribColor: '#991b1b',
    fill: '#fca5a5',
    badgeFill: '#f87171',
    causeFill: '#fecaca',
    textColor: '#0f172a',
    icon: 'heart',
    causes: [
      { label: 'Infrequent Communications', icon: 'message-square' },
      { label: 'Lack of Personalized Offers', icon: 'gift' },
      { label: 'Few Loyalty Rewards', icon: 'mail' },
      { label: 'Poor Content', icon: 'file-text' },
    ],
  },
];

const SPINE_SEGMENT_COLORS = ['#0e7490', '#15803d', '#b45309', '#9a3412'];

function computeTwigPositions(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0.5];
  if (count === 2) return [0.35, 0.68];
  if (count === 3) return [0.25, 0.52, 0.79];
  if (count === 4) return [0.19, 0.41, 0.63, 0.85];
  const positions: number[] = [];
  const start = 0.15;
  const end = 0.87;
  const step = (end - start) / (count - 1);
  for (let i = 0; i < count; i++) {
    positions.push(Number((start + i * step).toFixed(3)));
  }
  return positions;
}

/**
 * Generates an illustrated, geometrically aligned Ishikawa (Fishbone) diagram:
 * - Organic curved teal tail fin on the left
 * - Multi-tone horizontal central backbone spine leading to a coral-orange Fish Head on the right
 * - Color-coded category banners with circular icon emblems above and below the spine
 * - Angled diagonal category ribs (~67 deg) with horizontal pill-shaped cause capsules and arrows
 */
export function createFishboneTemplate(
  options: FishboneTemplateOptions = {}
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const prefix = options.idPrefix || `fb-${Date.now()}`;
  const ox = options.offsetX ?? 0;
  const oy = options.offsetY ?? 0;
  const problem =
    options.problemStatement ||
    'Problem Statement:\nHigh Customer\nChurn Rate';

  const topCats = options.topCategories || DEFAULT_TOP_CATEGORIES;
  const bottomCats = options.bottomCategories || DEFAULT_BOTTOM_CATEGORIES;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  const spineCenterY = 380 + oy;

  // 1. Organic curved Tail Fin on far left
  const tailId = `${prefix}-tail`;
  nodes.push({
    id: tailId,
    type: 'fishbone-tail',
    label: 'Root Causes',
    x: 40 + ox,
    y: spineCenterY - 95,
    width: 115,
    height: 190,
    style: {
      fill: '#4db6c6',
      stroke: '#155e75',
      strokeWidth: 2.5,
      textColor: '#ecfeff',
    },
    data: { role: 'tail', design: 'organic' },
  });

  // 2. Flush Spine Junction points along the horizontal centerline
  const colCount = Math.max(topCats.length, bottomCats.length, 3);
  const firstJunctionCenterX = 510 + ox;
  const colSpacing = 365;
  const spineJunctionIds: string[] = [];

  for (let i = 0; i < colCount; i++) {
    const jxCenter = firstJunctionCenterX + i * colSpacing;
    const jId = `${prefix}-spine-j${i + 1}`;
    const segColor = SPINE_SEGMENT_COLORS[Math.min(i, SPINE_SEGMENT_COLORS.length - 1)];
    spineJunctionIds.push(jId);
    nodes.push({
      id: jId,
      type: 'fishbone-junction',
      label: `Spine Joint ${i + 1}`,
      x: jxCenter - 5,
      y: spineCenterY - 5,
      width: 10,
      height: 10,
      style: {
        fill: segColor,
        stroke: 'transparent',
        strokeWidth: 0,
      },
      data: { role: 'spine-junction' },
    });
  }

  // 3. Coral-Orange Fish Head on far right
  const lastJunctionCenterX = firstJunctionCenterX + (colCount - 1) * colSpacing;
  const headId = `${prefix}-head`;
  nodes.push({
    id: headId,
    type: 'fishbone-head',
    label: problem,
    x: lastJunctionCenterX + 75,
    y: spineCenterY - 95,
    width: 235,
    height: 190,
    style: {
      fill: '#f97316',
      stroke: '#9a3412',
      strokeWidth: 3,
      textColor: '#1c1917',
    },
    data: { isHead: true, design: 'illustrated', icon: 'target' },
  });

  // 4. Connect horizontal central spine (Tail -> Spine Junctions -> Fish Head)
  let prevSpineId = tailId;
  spineJunctionIds.forEach((jId, idx) => {
    const segColor = SPINE_SEGMENT_COLORS[Math.min(idx, SPINE_SEGMENT_COLORS.length - 1)];
    edges.push({
      id: `${prefix}-spine-e${idx + 1}`,
      sourceNodeId: prevSpineId,
      targetNodeId: jId,
      sourceAnchor: 'right',
      targetAnchor: 'left',
      type: 'straight',
      lineStyle: 'solid',
      strokeWidth: 4.5,
      markerStart: 'none',
      markerEnd: 'none',
      color: segColor,
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
    strokeWidth: 5,
    markerStart: 'none',
    markerEnd: 'arrow',
    color: '#9a3412',
  });

  // Helper to lay out one diagonal category rib + its horizontal cause capsules
  const addCategoryBranch = (
    cat: FishboneCategorySpec,
    colIndex: number,
    side: 'top' | 'bottom'
  ) => {
    const spineJunctionId = spineJunctionIds[colIndex];
    const spineCenterX = firstJunctionCenterX + colIndex * colSpacing;
    const spineAnchorY = side === 'top' ? spineCenterY - 5 : spineCenterY + 5;
    const ribColor = cat.ribColor || cat.color;

    const catWidth = 224;
    const catHeight = 48;
    // Shift category header left of spine junction to produce ~67° diagonal bone slope
    const catAnchorX = spineCenterX - 115;
    const catX = catAnchorX - catWidth / 2;
    const catY = side === 'top' ? 35 + oy : spineCenterY + 292;
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
        rounded: 12,
      },
      data: {
        side,
        branch: cat.title.toLowerCase(),
        icon: cat.icon,
        badgeFill: cat.badgeFill || cat.fill,
      },
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
      strokeWidth: 3,
      markerStart: 'none',
      markerEnd: 'none',
      color: ribColor,
    });

    // Horizontal cause capsules feeding into collinear rib joints along the diagonal rib
    const causes = cat.causes.slice(0, 5);
    const tPositions = computeTwigPositions(causes.length);

    causes.forEach((rawCause, cIdx) => {
      const causeObj: FishboneCauseInput =
        typeof rawCause === 'string' ? { label: rawCause } : rawCause;

      const t = tPositions[cIdx];
      const jointCenterX = catAnchorX + t * (spineCenterX - catAnchorX);
      const jointCenterY = catAnchorY + t * (spineAnchorY - catAnchorY);

      const ribJointId = `${prefix}-${side}-j-${colIndex + 1}-${cIdx + 1}`;
      nodes.push({
        id: ribJointId,
        type: 'fishbone-junction',
        label: `${cat.title} Joint ${cIdx + 1}`,
        x: jointCenterX - 4,
        y: jointCenterY - 4,
        width: 8,
        height: 8,
        style: {
          fill: ribColor,
          stroke: 'transparent',
          strokeWidth: 0,
        },
        data: { role: 'rib-junction', side },
      });

      const twigWidth = 196;
      const twigHeight = 30;
      const twigId = `${prefix}-${side}-cause-${colIndex + 1}-${cIdx + 1}`;
      nodes.push({
        id: twigId,
        type: 'fishbone-cause',
        label: causeObj.label,
        x: jointCenterX - 4 - 22 - twigWidth,
        y: jointCenterY - twigHeight / 2,
        width: twigWidth,
        height: twigHeight,
        style: {
          fill: cat.causeFill || cat.fill,
          stroke: cat.color,
          strokeWidth: 1.5,
          textColor: cat.textColor || '#0f172a',
          rounded: 9999,
        },
        data: {
          side,
          category: cat.title,
          icon: causeObj.icon,
          pill: true,
        },
      });

      edges.push({
        id: `${prefix}-${side}-twig-${colIndex + 1}-${cIdx + 1}`,
        sourceNodeId: twigId,
        targetNodeId: ribJointId,
        sourceAnchor: 'right',
        targetAnchor: 'left',
        type: 'straight',
        lineStyle: 'solid',
        strokeWidth: 2,
        markerStart: 'none',
        markerEnd: 'arrow',
        color: ribColor,
      });
    });
  };

  topCats.forEach((cat, idx) => addCategoryBranch(cat, idx, 'top'));
  bottomCats.forEach((cat, idx) => addCategoryBranch(cat, idx, 'bottom'));

  return { nodes, edges };
}

/**
 * Builds a complete, populated Fishbone DiagramPage (High Customer Churn Rate example)
 * so new Fishbone diagrams and pages start with a rich, editable reference model.
 */
export function createFishboneExamplePage(options?: {
  pageId?: string;
  title?: string;
  description?: string;
  parentId?: string;
  idPrefix?: string;
}): DiagramPage {
  const ts = Date.now();
  const fishbone = createFishboneTemplate({
    idPrefix: options?.idPrefix || `fb-ex-${ts}`,
    problemStatement: 'Problem Statement:\nHigh Customer\nChurn Rate',
  });

  return {
    id: options?.pageId || `page-fishbone-${ts}`,
    title: options?.title || 'High Customer Churn Rate (Fishbone)',
    diagramType: 'fishbone',
    parentId: options?.parentId,
    description:
      options?.description ||
      'Ishikawa (Fishbone) root cause analysis example showing Product Quality, Customer Service, Onboarding, Pricing & Value, Competition, and Engagement & Retention.',
    viewport: { x: 30, y: 30, zoom: 0.72 },
    nodes: fishbone.nodes,
    edges: fishbone.edges,
  };
}
