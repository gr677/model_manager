/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramDocument, DiagramPage, DiagramNode, getNodeChildDiagrams } from '../types/diagram';
import { Workspace } from '../services/workspaceService';
import { scriptEvaluationService } from '../services/scriptEvaluationService';

export type AggregationDataType = 'text' | 'number' | 'date';

export interface AggregatedItem {
  id: string;
  type: AggregationDataType;
  name: string; // Normalized lowercase field name (e.g. "todo", "share", "due")
  displayName: string; // Preserved casing as authored
  value: string; // Raw text value
  numericValue?: number; // Parsed numeric value if type is 'number'
  dateValue?: Date; // Parsed Date object if type is 'date'
  formattedDate?: string;
  isScriptEvaluated?: boolean;
  scriptFormatted?: string;
  nodeId: string;
  nodeLabel: string;
  nodeType?: string;
  pageId: string;
  pageTitle: string;
  diagramFilename: string;
  diagramTitle: string;
  rawLine: string;
}

export interface AggregationGroup {
  name: string; // Normalized name
  displayName: string;
  type: AggregationDataType;
  items: AggregatedItem[];
  total?: number; // For number: sum of values
  avg?: number; // For number: average value
  min?: number;
  max?: number;
  earliestDate?: Date; // For date
  latestDate?: Date; // For date
}

// Regex matching: @type name: value on its own line
// e.g. @text todo: wash the car
// e.g. @number share: 345
// e.g. @date due: 2027-10-25
const AGGREGATION_LINE_REGEX = /^@(text|number|date)\s+([^:\r\n]+?)\s*:\s*(.+)$/i;

/**
 * Extracts all @type name: value occurrences from a text block
 */
export function parseAggregationLines(
  rawText: string,
  meta: {
    nodeId: string;
    nodeLabel: string;
    nodeType?: string;
    pageId: string;
    pageTitle: string;
    diagramFilename: string;
    diagramTitle: string;
  },
  workspaceId?: string
): AggregatedItem[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const items: AggregatedItem[] = [];
  const lines = rawText.split(/\r?\n/);
  const activeWsId = workspaceId || 'workspace1';

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@')) return;

    const match = trimmed.match(AGGREGATION_LINE_REGEX);
    if (!match) return;

    const type = match[1].toLowerCase() as AggregationDataType;
    const displayName = match[2].trim();
    const name = displayName.toLowerCase();
    const rawValue = match[3].trim();

    let numericValue: number | undefined = undefined;
    let dateValue: Date | undefined = undefined;
    let formattedDate: string | undefined = undefined;
    let isScriptEvaluated = false;
    let scriptFormatted: string | undefined = undefined;

    if (type === 'number') {
      if (scriptEvaluationService.isScriptExpression(rawValue)) {
        isScriptEvaluated = true;
        const evalNum = scriptEvaluationService.getEvaluatedNumber(activeWsId, rawValue);
        if (evalNum !== null && typeof evalNum === 'number') {
          numericValue = evalNum;
          scriptFormatted = scriptEvaluationService.getFormattedResult(activeWsId, rawValue) || `£${evalNum.toFixed(2)}`;
        } else {
          numericValue = 0;
          scriptEvaluationService.evaluateAsync(activeWsId, rawValue).catch(() => {});
        }
      } else {
        const cleaned = rawValue.replace(/[^0-9.-]/g, '');
        const parsedNum = parseFloat(cleaned);
        numericValue = !isNaN(parsedNum) ? parsedNum : 0;
      }
    } else if (type === 'date') {
      const parsed = new Date(rawValue);
      if (!isNaN(parsed.getTime())) {
        dateValue = parsed;
        formattedDate = parsed.toISOString().split('T')[0];
      } else {
        // Fallback for YYYY-MM-DD or standard formats
        const matchIso = rawValue.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (matchIso) {
          const yr = parseInt(matchIso[1], 10);
          const mo = parseInt(matchIso[2], 10) - 1;
          const da = parseInt(matchIso[3], 10);
          dateValue = new Date(yr, mo, da);
          formattedDate = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
        } else {
          dateValue = new Date(0);
          formattedDate = rawValue;
        }
      }
    }

    items.push({
      id: `${meta.diagramFilename}::${meta.pageId}::${meta.nodeId}-${name}-${lineIndex}`,
      type,
      name,
      displayName,
      value: rawValue,
      numericValue,
      dateValue,
      formattedDate,
      isScriptEvaluated,
      scriptFormatted,
      nodeId: meta.nodeId,
      nodeLabel: meta.nodeLabel || 'Untitled Node',
      nodeType: meta.nodeType,
      pageId: meta.pageId,
      pageTitle: meta.pageTitle || 'Main Page',
      diagramFilename: meta.diagramFilename,
      diagramTitle: meta.diagramTitle,
      rawLine: trimmed,
    });
  });

  return items;
}

function findWorkspaceDiagramEntry(
  workspace: Workspace | null | undefined,
  rawFilename?: string | null
): { filename: string; doc: DiagramDocument; title: string } | null {
  if (!workspace?.diagrams || !rawFilename || typeof rawFilename !== 'string') return null;
  const trimmed = rawFilename.trim();
  if (!trimmed) return null;

  const withJson = trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`;
  const normalized = withJson.toLowerCase().replace(/[^a-z0-9._-]/g, '_');

  const direct =
    workspace.diagrams[trimmed] ||
    workspace.diagrams[withJson] ||
    workspace.diagrams[normalized];

  if (direct?.document && Array.isArray(direct.document.pages)) {
    return {
      filename: direct.filename || withJson,
      doc: direct.document,
      title: direct.name || direct.document.name || direct.filename || withJson,
    };
  }

  const targetLower = withJson.toLowerCase();
  const targetNormLower = normalized.toLowerCase();
  for (const [key, entry] of Object.entries(workspace.diagrams)) {
    const keyLower = key.toLowerCase();
    if (
      (keyLower === targetLower || keyLower === targetNormLower) &&
      entry?.document &&
      Array.isArray(entry.document.pages)
    ) {
      return {
        filename: entry.filename || key,
        doc: entry.document,
        title: entry.name || entry.document.name || key,
      };
    }
  }

  return null;
}

/**
 * Searches the current page as the root of a tree and recursively chases all children,
 * grandchildren, and deeper descendants (both intra-document `parentId` / `drilldownPageId`
 * sub-pages and cross-file `childDiagrams` `.json` files) to aggregate `@type name: value` tags.
 */
export function collectAggregationsFromPageAndChildren(
  currentPage: DiagramPage,
  activeDocument: DiagramDocument,
  workspace?: Workspace | null
): {
  groups: AggregationGroup[];
  totalSearchedPages: number;
  totalItemsFound: number;
} {
  const allItems: AggregatedItem[] = [];
  const visitedPageKeys = new Set<string>();
  const visitedDiagramFilenames = new Set<string>();

  // Queue of pages to process: { page, diagramFilename, diagramTitle, doc }
  const queue: Array<{
    page: DiagramPage;
    diagramFilename: string;
    diagramTitle: string;
    doc: DiagramDocument;
  }> = [];

  const currentDocTitle = activeDocument.name || 'Current Diagram';
  const currentFilename = workspace?.activeDiagramFilename || 'root.json';

  // Seed with current page as the root of the tree; prevent circular jumps back into unrelated sibling pages of current file
  visitedDiagramFilenames.add(currentFilename.toLowerCase());
  queue.push({
    page: currentPage,
    diagramFilename: currentFilename,
    diagramTitle: currentDocTitle,
    doc: activeDocument,
  });

  const enqueuePage = (
    page: DiagramPage,
    diagramFilename: string,
    diagramTitle: string,
    doc: DiagramDocument
  ) => {
    const pageKey = `${diagramFilename.toLowerCase()}::${page.id}`;
    if (!visitedPageKeys.has(pageKey)) {
      queue.push({ page, diagramFilename, diagramTitle, doc });
    }
  };

  while (queue.length > 0) {
    const { page, diagramFilename, diagramTitle, doc } = queue.shift()!;
    const pageKey = `${diagramFilename.toLowerCase()}::${page.id}`;
    if (visitedPageKeys.has(pageKey)) continue;
    visitedPageKeys.add(pageKey);

    // 1. Traverse intra-document child pages whose parentId points to this page
    if (Array.isArray(doc.pages)) {
      for (const candidatePage of doc.pages) {
        if (candidatePage.parentId && candidatePage.parentId === page.id) {
          enqueuePage(candidatePage, diagramFilename, diagramTitle, doc);
        }
      }
    }

    // 2. Scan all nodes in this page
    const nodes = page.nodes || [];
    for (const node of nodes) {
      // 2a. Gather all description & notes text on this node
      const descTexts: string[] = [];
      if (node.documentation?.description) descTexts.push(node.documentation.description);
      if (node.data?.description && node.data.description !== node.documentation?.description) {
        descTexts.push(node.data.description);
      }
      if (node.data?.notes) descTexts.push(node.data.notes);
      if (node.stickyNotes && Array.isArray(node.stickyNotes)) {
        node.stickyNotes.forEach(sn => {
          if (sn.text) descTexts.push(sn.text);
        });
      }

      const combinedText = descTexts.join('\n');
      if (combinedText.includes('@')) {
        const parsed = parseAggregationLines(combinedText, {
          nodeId: node.id,
          nodeLabel: node.label,
          nodeType: node.type,
          pageId: page.id,
          pageTitle: page.title || 'Page',
          diagramFilename,
          diagramTitle,
        }, workspace?.id);
        allItems.push(...parsed);
      }

      // 2b. Traverse child pages linked via drilldownPageId in the same document
      if (node.drilldownPageId && Array.isArray(doc.pages)) {
        const linkedPage = doc.pages.find(p => p.id === node.drilldownPageId);
        if (linkedPage) {
          enqueuePage(linkedPage, diagramFilename, diagramTitle, doc);
        }
      }

      // 2c. Traverse linked child diagrams in the workspace (and chase their children/grandchildren)
      const childRefs = getNodeChildDiagrams(node);
      const candidateFilenames: string[] = childRefs.map(c => c.filename).filter(Boolean);
      if (typeof node.data?.legacyTargetPage === 'string' && node.data.legacyTargetPage.trim()) {
        candidateFilenames.push(node.data.legacyTargetPage.trim());
      }

      for (const rawChildFilename of candidateFilenames) {
        const resolved = findWorkspaceDiagramEntry(workspace, rawChildFilename);
        if (!resolved) continue;

        const lowerResolved = resolved.filename.toLowerCase();
        if (visitedDiagramFilenames.has(lowerResolved)) continue;
        visitedDiagramFilenames.add(lowerResolved);

        const childDoc = resolved.doc;
        if (childDoc && Array.isArray(childDoc.pages) && childDoc.pages.length > 0) {
          // Order entry/active page first, followed by remaining pages in the child diagram
          const orderedPages = [...childDoc.pages].sort((a, b) => {
            if (a.id === childDoc.activePageId) return -1;
            if (b.id === childDoc.activePageId) return 1;
            return 0;
          });
          for (const childPage of orderedPages) {
            enqueuePage(childPage, resolved.filename, resolved.title, childDoc);
          }
        }
      }
    }
  }

  // Group items by name (case-insensitive)
  const groupMap = new Map<string, AggregationGroup>();

  for (const item of allItems) {
    let group = groupMap.get(item.name);
    if (!group) {
      group = {
        name: item.name,
        displayName: item.displayName,
        type: item.type,
        items: [],
      };
      groupMap.set(item.name, group);
    }
    group.items.push(item);
  }

  // Post-process each group
  const groups: AggregationGroup[] = Array.from(groupMap.values()).map(group => {
    // If date type: sort by date ascending (date asc)
    if (group.type === 'date') {
      group.items.sort((a, b) => {
        const timeA = a.dateValue ? a.dateValue.getTime() : 0;
        const timeB = b.dateValue ? b.dateValue.getTime() : 0;
        return timeA - timeB;
      });
      if (group.items.length > 0) {
        group.earliestDate = group.items[0].dateValue;
        group.latestDate = group.items[group.items.length - 1].dateValue;
      }
    } else if (group.type === 'number') {
      const numbers = group.items.map(it => it.numericValue ?? 0);
      const total = numbers.reduce((acc, curr) => acc + curr, 0);
      group.total = total;
      group.avg = numbers.length > 0 ? total / numbers.length : 0;
      group.min = numbers.length > 0 ? Math.min(...numbers) : 0;
      group.max = numbers.length > 0 ? Math.max(...numbers) : 0;
    }
    return group;
  });

  // Sort groups: numbers first, then dates, then text, then alphabetical
  groups.sort((a, b) => {
    const typeOrder = { number: 0, date: 1, text: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.displayName.localeCompare(b.displayName);
  });

  // Trigger batch evaluation for any script expressions that are pending
  const scriptExprs = allItems
    .filter(it => it.isScriptEvaluated && it.value)
    .map(it => it.value);
  if (scriptExprs.length > 0) {
    scriptEvaluationService.evaluateBatch(workspace?.id || 'workspace1', scriptExprs).catch(() => {});
  }

  return {
    groups,
    totalSearchedPages: visitedPageKeys.size,
    totalItemsFound: allItems.length,
  };
}
