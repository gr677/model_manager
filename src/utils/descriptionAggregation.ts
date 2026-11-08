/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramDocument, DiagramPage, DiagramNode, getNodeChildDiagrams } from '../types/diagram';
import { Workspace } from '../services/workspaceService';

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
  }
): AggregatedItem[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const items: AggregatedItem[] = [];
  const lines = rawText.split(/\r?\n/);

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

    if (type === 'number') {
      const cleaned = rawValue.replace(/[^0-9.-]/g, '');
      const parsedNum = parseFloat(cleaned);
      numericValue = !isNaN(parsedNum) ? parsedNum : 0;
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
      id: `${meta.nodeId}-${name}-${lineIndex}`,
      type,
      name,
      displayName,
      value: rawValue,
      numericValue,
      dateValue,
      formattedDate,
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

/**
 * Searches the current page and all child pages (drill-down sub-pages & child diagrams in the workspace)
 * and aggregates all `@type name: value` occurrences.
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

  // Queue of pages to process: { page, diagramFilename, diagramTitle }
  const queue: Array<{
    page: DiagramPage;
    diagramFilename: string;
    diagramTitle: string;
    doc: DiagramDocument;
  }> = [];

  const currentDocTitle = activeDocument.name || 'Current Diagram';
  const currentFilename = workspace?.activeDiagramFilename || 'root.json';

  // Seed with current page
  queue.push({
    page: currentPage,
    diagramFilename: currentFilename,
    diagramTitle: currentDocTitle,
    doc: activeDocument,
  });

  while (queue.length > 0) {
    const { page, diagramFilename, diagramTitle, doc } = queue.shift()!;
    const pageKey = `${diagramFilename}::${page.id}`;
    if (visitedPageKeys.has(pageKey)) continue;
    visitedPageKeys.add(pageKey);

    // Scan all nodes in this page
    const nodes = page.nodes || [];
    for (const node of nodes) {
      // 1. Gather all description & notes text on this node
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
        });
        allItems.push(...parsed);
      }

      // 2. Traverse child pages linked via drilldownPageId in the same document
      if (node.drilldownPageId) {
        const linkedPage = doc.pages.find(p => p.id === node.drilldownPageId);
        if (linkedPage && !visitedPageKeys.has(`${diagramFilename}::${linkedPage.id}`)) {
          queue.push({
            page: linkedPage,
            diagramFilename,
            diagramTitle,
            doc,
          });
        }
      }

      // 3. Traverse linked child diagrams in the workspace
      const childRefs = getNodeChildDiagrams(node);
      for (const child of childRefs) {
        const childFilename = child.filename;
        if (childFilename && !visitedDiagramFilenames.has(childFilename) && workspace?.diagrams?.[childFilename]) {
          visitedDiagramFilenames.add(childFilename);
          const childDiag = workspace.diagrams[childFilename];
          const childDoc = childDiag.document;
          if (childDoc && Array.isArray(childDoc.pages)) {
            for (const childPage of childDoc.pages) {
              if (!visitedPageKeys.has(`${childFilename}::${childPage.id}`)) {
                queue.push({
                  page: childPage,
                  diagramFilename: childFilename,
                  diagramTitle: childDiag.name || childDoc.name || childFilename,
                  doc: childDoc,
                });
              }
            }
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

  return {
    groups,
    totalSearchedPages: visitedPageKeys.size,
    totalItemsFound: allItems.length,
  };
}
