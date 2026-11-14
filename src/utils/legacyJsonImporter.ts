/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChildDiagramRef,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  DiagramPage,
  DiagramType,
  NodeAnchor,
  NodeUrlLink,
} from '../types/diagram';
import { darkenHex } from './colorUtils';
import { getDefaultConnectorStyleForDiagram } from './diagramConnectorConfig';

export interface LegacyUrlEntry {
  label?: string | null;
  link?: string | null;
  url?: string | null;
}

export interface LegacyNode {
  id: string;
  label?: string | null;
  color?: string | null;
  shape?: string | null;
  barWidth?: number | null;
  imageId?: string | null;
  targetPage?: string | null;
  url?: string | null;
  urls?: LegacyUrlEntry[] | null;
  description?: string | null;
  isSensitive?: boolean;
  documents?: any[] | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface LegacyLink {
  source: string;
  target: string;
  label?: string | null;
  color?: string | null;
}

export interface LegacyTargetPageRef {
  rawTargetPage: string;
  filename: string;
  title: string;
  sourceNodeId: string;
  sourceNodeLabel: string;
}

export interface LegacyJsonInspection {
  isValid: boolean;
  format: 'legacy' | 'modern' | 'unknown';
  error?: string;
  nodeCount: number;
  linkCount: number;
  urlCount: number;
  aggregationTagCount: number;
  targetPages: LegacyTargetPageRef[];
  previewNodes: Array<{
    id: string;
    label: string;
    shape: string;
    color: string;
    targetPage?: string;
    urlCount: number;
    hasNotes: boolean;
  }>;
  rawLegacyData?: {
    nodes: LegacyNode[];
    links: LegacyLink[];
    title?: string;
  };
  modernDocument?: DiagramDocument;
}

export interface ConvertLegacyOptions {
  diagramType?: DiagramType;
  includeArrows?: boolean;
  linkTargetPagesAsChildDiagrams?: boolean;
  idPrefix?: string;
}

export interface ConvertedLegacyResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  targetPages: LegacyTargetPageRef[];
  diagramType: DiagramType;
}

const CSS_COLOR_MAP: Record<string, string> = {
  gray: '#64748b',
  grey: '#64748b',
  darkgray: '#475569',
  darkgrey: '#475569',
  lightgray: '#cbd5e1',
  lightgrey: '#cbd5e1',
  slate: '#475569',
  red: '#ef4444',
  crimson: '#dc2626',
  rose: '#f43f5e',
  pink: '#ec4899',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  gold: '#eab308',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  aqua: '#06b6d4',
  turquoise: '#2dd4bf',
  blue: '#3b82f6',
  sky: '#0ea5e9',
  lightblue: '#38bdf8',
  indigo: '#6366f1',
  purple: '#a855f7',
  violet: '#8b5cf6',
  magenta: '#d946ef',
  brown: '#92400e',
  white: '#f8fafc',
  black: '#0f172a',
};

function normalizeColorToHex(rawColor?: string | null, fallback = '#35edd8'): string {
  if (!rawColor || typeof rawColor !== 'string') return fallback;
  const trimmed = rawColor.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('#')) {
    const clean = trimmed.slice(1);
    if (clean.length === 3) {
      return `#${clean
        .split('')
        .map(c => c + c)
        .join('')}`;
    }
    if (clean.length === 6) return trimmed.toLowerCase();
    return fallback;
  }

  const lower = trimmed.toLowerCase();
  if (CSS_COLOR_MAP[lower]) {
    return CSS_COLOR_MAP[lower];
  }

  // Handle rgb(...)
  const rgbMatch = lower.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  return fallback;
}

function getContrastTextColor(hexColor: string): string {
  const clean = hexColor.replace('#', '').trim();
  if (clean.length !== 6) return '#ffffff';
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.42 ? '#0f172a' : '#ffffff';
}

export function normalizeLegacyTargetFilename(targetPage: string): string {
  const base = targetPage
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9._-]/g, '_');
  return `${base || 'child_page'}.json`;
}

export function formatLegacyTargetTitle(targetPage: string): string {
  return targetPage
    .trim()
    .replace(/\.json$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function normalizeUrlString(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function cleanLegacyDescription(desc?: string | null): string {
  if (!desc || typeof desc !== 'string') return '';
  const trimmed = desc.trim();
  if (!trimmed || trimmed.toLowerCase() === 'no notes yet.') return '';
  return trimmed;
}

function computeSmartAnchors(
  source: DiagramNode,
  target: DiagramNode
): { sourceAnchor: NodeAnchor; targetAnchor: NodeAnchor } {
  const srcCx = source.x + source.width / 2;
  const srcCy = source.y + source.height / 2;
  const tgtCx = target.x + target.width / 2;
  const tgtCy = target.y + target.height / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;

  if (Math.abs(dy) >= Math.abs(dx) * 0.75) {
    return dy >= 0
      ? { sourceAnchor: 'bottom', targetAnchor: 'top' }
      : { sourceAnchor: 'top', targetAnchor: 'bottom' };
  }

  return dx >= 0
    ? { sourceAnchor: 'right', targetAnchor: 'left' }
    : { sourceAnchor: 'left', targetAnchor: 'right' };
}

/**
 * Inspects JSON text to detect whether it is an earlier-version `{ nodes, links }` export
 * or a modern `DiagramDocument`, returning preview statistics and validation errors.
 */
export function inspectLegacyDiagramJson(jsonText: string): LegacyJsonInspection {
  if (!jsonText || !jsonText.trim()) {
    return {
      isValid: false,
      format: 'unknown',
      error: 'Paste JSON content or upload a .json file.',
      nodeCount: 0,
      linkCount: 0,
      urlCount: 0,
      aggregationTagCount: 0,
      targetPages: [],
      previewNodes: [],
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: any) {
    return {
      isValid: false,
      format: 'unknown',
      error: `Invalid JSON syntax: ${err?.message || 'Could not parse JSON'}`,
      nodeCount: 0,
      linkCount: 0,
      urlCount: 0,
      aggregationTagCount: 0,
      targetPages: [],
      previewNodes: [],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      format: 'unknown',
      error: 'JSON root must be an object containing "nodes" and "links".',
      nodeCount: 0,
      linkCount: 0,
      urlCount: 0,
      aggregationTagCount: 0,
      targetPages: [],
      previewNodes: [],
    };
  }

  // Modern DiagramDocument format check
  if (Array.isArray(parsed.pages) && parsed.pages.length > 0 && Array.isArray(parsed.pages[0]?.nodes)) {
    const firstPage = parsed.pages[0] as DiagramPage;
    return {
      isValid: true,
      format: 'modern',
      nodeCount: parsed.pages.reduce((sum: number, p: any) => sum + (Array.isArray(p.nodes) ? p.nodes.length : 0), 0),
      linkCount: parsed.pages.reduce((sum: number, p: any) => sum + (Array.isArray(p.edges) ? p.edges.length : 0), 0),
      urlCount: 0,
      aggregationTagCount: 0,
      targetPages: [],
      previewNodes: (firstPage.nodes || []).slice(0, 50).map(n => ({
        id: n.id,
        label: n.label || n.id,
        shape: n.type || 'node',
        color: n.style?.fill || '#3b82f6',
        urlCount: n.links?.length || 0,
        hasNotes: Boolean(n.documentation?.description),
      })),
      modernDocument: parsed as DiagramDocument,
    };
  }

  const rawNodes: LegacyNode[] | null = Array.isArray(parsed.nodes) ? parsed.nodes : null;
  const rawLinks: LegacyLink[] = Array.isArray(parsed.links)
    ? parsed.links
    : Array.isArray(parsed.edges)
    ? parsed.edges
    : [];

  if (!rawNodes) {
    return {
      isValid: false,
      format: 'unknown',
      error: 'JSON must contain a "nodes" array (and optional "links" array).',
      nodeCount: 0,
      linkCount: 0,
      urlCount: 0,
      aggregationTagCount: 0,
      targetPages: [],
      previewNodes: [],
    };
  }

  let urlCount = 0;
  let aggregationTagCount = 0;
  const targetPages: LegacyTargetPageRef[] = [];
  const seenTargets = new Set<string>();

  const previewNodes = rawNodes.map((n, idx) => {
    const id = String(n.id || `node_${idx + 1}`);
    const label = String(n.label || n.id || `Node ${idx + 1}`);
    const nodeUrls = Array.isArray(n.urls) ? n.urls.filter(u => u && (u.link || u.url)) : [];
    const singleUrlCount = n.url && typeof n.url === 'string' && n.url.trim() ? 1 : 0;
    const totalUrlsForNode = nodeUrls.length + singleUrlCount;
    urlCount += totalUrlsForNode;

    const cleanDesc = cleanLegacyDescription(n.description);
    if (cleanDesc) {
      const matches = cleanDesc.match(/^@(text|number|date)\s+[^:\r\n]+?\s*:/gim);
      if (matches) aggregationTagCount += matches.length;
    }

    const rawTarget = typeof n.targetPage === 'string' && n.targetPage.trim() ? n.targetPage.trim() : undefined;
    if (rawTarget) {
      const filename = normalizeLegacyTargetFilename(rawTarget);
      if (!seenTargets.has(filename)) {
        seenTargets.add(filename);
        targetPages.push({
          rawTargetPage: rawTarget,
          filename,
          title: formatLegacyTargetTitle(rawTarget),
          sourceNodeId: id,
          sourceNodeLabel: label,
        });
      }
    }

    return {
      id,
      label,
      shape: String(n.shape || 'ellipse'),
      color: normalizeColorToHex(n.color, '#35edd8'),
      targetPage: rawTarget,
      urlCount: totalUrlsForNode,
      hasNotes: Boolean(cleanDesc),
    };
  });

  return {
    isValid: true,
    format: 'legacy',
    nodeCount: rawNodes.length,
    linkCount: rawLinks.length,
    urlCount,
    aggregationTagCount,
    targetPages,
    previewNodes,
    rawLegacyData: {
      nodes: rawNodes,
      links: rawLinks,
      title: typeof parsed.title === 'string' ? parsed.title : typeof parsed.name === 'string' ? parsed.name : undefined,
    },
  };
}

/**
 * Converts earlier-version `{ nodes, links }` JSON into modern `DiagramNode[]` and `DiagramEdge[]`.
 */
export function convertLegacyJsonToPageEntities(
  rawNodes: LegacyNode[],
  rawLinks: LegacyLink[],
  options: ConvertLegacyOptions = {}
): ConvertedLegacyResult {
  const diagramType: DiagramType = options.diagramType || 'mindmap';
  const includeArrows = options.includeArrows ?? (diagramType !== 'mindmap');
  const linkTargetPages = options.linkTargetPagesAsChildDiagrams ?? true;
  const prefix = options.idPrefix || '';

  // Compute safe shift so no node is placed at negative or off-edge coordinates
  let minX = Infinity;
  let minY = Infinity;
  rawNodes.forEach((n, idx) => {
    const nx = typeof n.x === 'number' && Number.isFinite(n.x) ? n.x : 120 + (idx % 4) * 200;
    const ny = typeof n.y === 'number' && Number.isFinite(n.y) ? n.y : 120 + Math.floor(idx / 4) * 140;
    if (nx < minX) minX = nx;
    if (ny < minY) minY = ny;
  });
  const shiftX = Number.isFinite(minX) && minX < 40 ? 40 - minX : 0;
  const shiftY = Number.isFinite(minY) && minY < 40 ? 40 - minY : 0;

  const idMap = new Map<string, string>();
  const targetPages: LegacyTargetPageRef[] = [];
  const seenTargetFilenames = new Set<string>();
  const timestamp = Date.now();

  const nodes: DiagramNode[] = rawNodes.map((legacy, idx) => {
    const originalId = String(legacy.id || `legacy_node_${idx + 1}`);
    const finalId = prefix ? `${prefix}${originalId}` : originalId;
    idMap.set(originalId, finalId);

    const label = String(legacy.label || legacy.id || `Node ${idx + 1}`);
    const shapeLower = String(legacy.shape || 'ellipse').toLowerCase().trim();
    const fillHex = normalizeColorToHex(legacy.color, '#35edd8');
    const strokeHex = darkenHex(fillHex, 0.35);
    const textColor = getContrastTextColor(fillHex);

    let nodeType = 'mindmap-oval';
    let width = 136;
    let height = 60;
    let rounded: number | undefined = 9999;
    const extraData: Record<string, any> = {
      legacyShape: shapeLower,
    };

    if (shapeLower === 'bar' || shapeLower === 'pill' || shapeLower === 'rounded') {
      nodeType = 'mindmap-node';
      width =
        typeof legacy.barWidth === 'number' && legacy.barWidth > 60
          ? legacy.barWidth
          : typeof legacy.width === 'number' && legacy.width > 60
          ? legacy.width
          : Math.max(200, label.length * 10 + 80);
      height = typeof legacy.height === 'number' && legacy.height > 30 ? legacy.height : 52;
      rounded = 9999;
      extraData.level = 0;
    } else if (shapeLower === 'ellipse' || shapeLower === 'oval' || shapeLower === 'circle') {
      nodeType = 'mindmap-oval';
      width =
        typeof legacy.width === 'number' && legacy.width > 50
          ? legacy.width
          : Math.max(122, Math.min(200, Math.round(label.length * 8.5 + 44)));
      height = typeof legacy.height === 'number' && legacy.height > 34 ? legacy.height : 60;
      rounded = 9999;
      extraData.shape = 'oval';
      extraData.level = 1;
    } else if (shapeLower === 'diamond') {
      nodeType = 'flow-decision';
      width = legacy.width || 140;
      height = legacy.height || 95;
      rounded = undefined;
    } else if (shapeLower === 'note' || shapeLower === 'sticky' || shapeLower === 'sticky-note') {
      nodeType = 'sticky-note';
      width = legacy.width || 190;
      height = legacy.height || 145;
      rounded = 0;
    } else if (shapeLower === 'database' || shapeLower === 'db') {
      nodeType = 'flow-database';
      width = legacy.width || 130;
      height = legacy.height || 100;
      rounded = undefined;
    } else {
      nodeType = 'flow-process';
      width = legacy.width || Math.max(145, Math.min(230, label.length * 9 + 44));
      height = legacy.height || 68;
      rounded = 8;
    }

    const cleanDesc = cleanLegacyDescription(legacy.description);
    const tags: string[] = ['Imported'];
    if (legacy.isSensitive) {
      tags.push('Sensitive');
      extraData.isSensitive = true;
    }
    if (legacy.imageId) {
      extraData.legacyImageId = legacy.imageId;
    }
    if (Array.isArray(legacy.documents) && legacy.documents.length > 0) {
      extraData.legacyDocuments = legacy.documents;
      tags.push('Has Docs');
    }
    if (cleanDesc) {
      extraData.description = cleanDesc;
    }

    // Map URLs (`urls` array + single `url` string)
    const links: NodeUrlLink[] = [];
    if (typeof legacy.url === 'string' && legacy.url.trim()) {
      const normalized = normalizeUrlString(legacy.url);
      if (normalized) {
        links.push({
          id: `url-${finalId}-primary-${timestamp}`,
          label: legacy.url.trim(),
          url: normalized,
        });
      }
    }
    if (Array.isArray(legacy.urls)) {
      legacy.urls.forEach((entry, uIdx) => {
        const rawLink = entry?.link || entry?.url;
        if (typeof rawLink === 'string' && rawLink.trim()) {
          const normalized = normalizeUrlString(rawLink);
          links.push({
            id: `url-${finalId}-${uIdx}-${timestamp}`,
            label: (entry?.label && entry.label.trim()) || rawLink.trim(),
            url: normalized,
          });
        }
      });
    }

    // Map `targetPage` to ChildDiagramRef
    let childDiagrams: ChildDiagramRef[] | undefined;
    let childDiagramFilename: string | undefined;
    let childDiagramTitle: string | undefined;
    let childDiagramType: DiagramType | undefined;

    if (linkTargetPages && typeof legacy.targetPage === 'string' && legacy.targetPage.trim()) {
      const rawTarget = legacy.targetPage.trim();
      const childFilename = normalizeLegacyTargetFilename(rawTarget);
      const childTitle = formatLegacyTargetTitle(rawTarget);
      extraData.legacyTargetPage = rawTarget;

      childDiagramFilename = childFilename;
      childDiagramTitle = childTitle;
      childDiagramType = diagramType;
      childDiagrams = [
        {
          id: `child_${finalId}_${timestamp}_${idx}`,
          filename: childFilename,
          title: childTitle,
          diagramType,
          createdAt: new Date().toISOString(),
        },
      ];

      if (!seenTargetFilenames.has(childFilename)) {
        seenTargetFilenames.add(childFilename);
        targetPages.push({
          rawTargetPage: rawTarget,
          filename: childFilename,
          title: childTitle,
          sourceNodeId: finalId,
          sourceNodeLabel: label,
        });
      }
    }

    const posX =
      (typeof legacy.x === 'number' && Number.isFinite(legacy.x) ? legacy.x : 120 + (idx % 4) * 200) + shiftX;
    const posY =
      (typeof legacy.y === 'number' && Number.isFinite(legacy.y) ? legacy.y : 120 + Math.floor(idx / 4) * 140) + shiftY;

    return {
      id: finalId,
      type: nodeType,
      label,
      x: Math.round(posX * 100) / 100,
      y: Math.round(posY * 100) / 100,
      width,
      height,
      ...(childDiagrams ? { childDiagrams, childDiagramFilename, childDiagramTitle, childDiagramType } : {}),
      style: {
        fill: fillHex,
        stroke: strokeHex,
        strokeWidth: 2,
        textColor,
        rounded,
        gradient: true,
      },
      data: extraData,
      documentation: {
        description: cleanDesc,
        tags,
        status: 'draft',
      },
      ...(links.length > 0 ? { links } : {}),
    };
  });

  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const connectorType = getDefaultConnectorStyleForDiagram(diagramType);

  const edges: DiagramEdge[] = [];
  rawLinks.forEach((link, idx) => {
    const srcId = idMap.get(String(link.source)) || (prefix ? `${prefix}${link.source}` : String(link.source));
    const tgtId = idMap.get(String(link.target)) || (prefix ? `${prefix}${link.target}` : String(link.target));
    const srcNode = nodeById.get(srcId);
    const tgtNode = nodeById.get(tgtId);
    if (!srcNode || !tgtNode) return;

    const { sourceAnchor, targetAnchor } = computeSmartAnchors(srcNode, tgtNode);

    edges.push({
      id: `edge-${prefix}legacy-${idx}-${timestamp}`,
      sourceNodeId: srcId,
      targetNodeId: tgtId,
      sourceAnchor,
      targetAnchor,
      ...(link.label ? { label: String(link.label) } : {}),
      type: connectorType,
      lineStyle: 'solid',
      markerStart: 'none',
      markerEnd: includeArrows ? 'arrow' : 'none',
      color: typeof link.color === 'string' && link.color.trim() ? link.color.trim() : '#64748b',
      strokeWidth: 2,
    });
  });

  return {
    nodes,
    edges,
    targetPages,
    diagramType,
  };
}

/**
 * Convenience helper to convert a raw legacy JSON string directly into a full `DiagramDocument`.
 */
export function convertLegacyJsonToDocument(
  filename: string,
  jsonText: string,
  options: ConvertLegacyOptions = {}
): DiagramDocument {
  const inspection = inspectLegacyDiagramJson(jsonText);
  if (!inspection.isValid) {
    throw new Error(inspection.error || 'Invalid JSON file.');
  }
  if (inspection.format === 'modern' && inspection.modernDocument) {
    return inspection.modernDocument;
  }
  if (!inspection.rawLegacyData) {
    throw new Error('Could not read legacy nodes from JSON.');
  }

  const converted = convertLegacyJsonToPageEntities(
    inspection.rawLegacyData.nodes,
    inspection.rawLegacyData.links,
    options
  );

  const cleanTitle =
    inspection.rawLegacyData.title ||
    formatLegacyTargetTitle(filename.replace(/\.json$/i, '')) ||
    'Imported Page';

  const now = new Date().toISOString();
  const pageId = `page-legacy-${Date.now()}`;

  return {
    id: `doc-legacy-${Date.now()}`,
    name: cleanTitle,
    createdAt: now,
    updatedAt: now,
    activePageId: pageId,
    pages: [
      {
        id: pageId,
        title: cleanTitle,
        diagramType: converted.diagramType,
        description: `Imported from earlier version JSON (${converted.nodes.length} nodes, ${converted.edges.length} connectors).`,
        nodes: converted.nodes,
        edges: converted.edges,
        viewport: { x: 40, y: 40, zoom: 1 },
      },
    ],
    versions: [],
    settings: {
      gridSnap: true,
      showGrid: true,
      theme: 'dark',
      showMinimap: true,
    },
  };
}
