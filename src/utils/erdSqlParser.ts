/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramEdge, DiagramNode } from '../types/diagram';

export interface ParsedColumn {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface ParsedForeignKey {
  constraintName?: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  onDelete?: string;
  onUpdate?: string;
}

export interface ParsedTable {
  id: string;
  name: string;
  schema?: string;
  columns: ParsedColumn[];
  primaryKeys: string[];
  foreignKeys: ParsedForeignKey[];
  comment?: string;
}

export interface ParseSqlResult {
  tables: ParsedTable[];
  relationships: ParsedForeignKey[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  warnings: string[];
  stats: {
    tableCount: number;
    columnCount: number;
    pkCount: number;
    fkCount: number;
    statementCount: number;
  };
}

/**
 * Strips SQL comments (both single line -- and multiline /* ... *\/) while preserving quoted strings.
 */
function stripComments(sql: string): string {
  let result = '';
  let i = 0;
  const len = sql.length;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  while (i < len) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (!inSingleQuote && !inDoubleQuote) {
      // Single line comment --
      if (ch === '-' && next === '-') {
        i += 2;
        while (i < len && sql[i] !== '\n' && sql[i] !== '\r') {
          i++;
        }
        continue;
      }
      // Multiline comment /* ... */
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
          i++;
        }
        i += 2;
        continue;
      }
    }

    if (ch === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        result += "''";
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Splits SQL into individual statements by semicolon, ignoring semicolons inside quotes or parentheses.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === ';' && parenDepth === 0) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

/**
 * Cleans identifier by removing quotes and schema qualifications (e.g. "public"."users" -> "users").
 */
export function cleanIdentifier(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const parts = trimmed.split('.');
  const name = parts[parts.length - 1].trim();
  // Strip outer quotes if any
  return name.replace(/^["'`]|["'`]$/g, '').trim();
}

/**
 * Extracts schema name if provided (e.g. public.users -> public).
 */
export function extractSchema(raw: string): string | undefined {
  if (!raw) return undefined;
  const parts = raw.trim().split('.');
  if (parts.length > 1) {
    return parts[0].trim().replace(/^["'`]|["'`]$/g, '');
  }
  return undefined;
}

/**
 * Parses comma-separated items inside a parenthesized list (e.g. column definitions in CREATE TABLE).
 */
function splitColumnDefinitions(body: string): string[] {
  const items: string[] = [];
  let current = '';
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === ',' && parenDepth === 0) {
        if (current.trim()) {
          items.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

/**
 * Parses a single column definition string into a ParsedColumn.
 */
function parseColumnDef(def: string, tableKey: string): { column?: ParsedColumn; inlineFk?: ParsedForeignKey } | null {
  const trimmed = def.trim();
  if (!trimmed) return null;

  // Check if this is a table constraint rather than a column definition
  const upper = trimmed.toUpperCase();
  if (
    upper.startsWith('CONSTRAINT') ||
    upper.startsWith('PRIMARY KEY') ||
    upper.startsWith('FOREIGN KEY') ||
    upper.startsWith('UNIQUE') ||
    upper.startsWith('CHECK')
  ) {
    return null;
  }

  // Tokenize column definition
  // Format: column_name DATA_TYPE [CONSTRAINTS...]
  // Column name could be quoted: "user_id" integer NOT NULL
  let colName = '';
  let rest = '';

  if (trimmed.startsWith('"')) {
    const endQuote = trimmed.indexOf('"', 1);
    if (endQuote !== -1) {
      colName = trimmed.slice(1, endQuote);
      rest = trimmed.slice(endQuote + 1).trim();
    }
  }

  if (!colName) {
    const firstSpace = trimmed.search(/\s/);
    if (firstSpace !== -1) {
      colName = cleanIdentifier(trimmed.slice(0, firstSpace));
      rest = trimmed.slice(firstSpace).trim();
    } else {
      colName = cleanIdentifier(trimmed);
      rest = 'TEXT';
    }
  }

  if (!colName) return null;

  // Extract type: can have parentheses e.g. VARCHAR(255), NUMERIC(10,2) or multi-word e.g. TIMESTAMP WITH TIME ZONE
  const typeMatch = rest.match(
    /^([A-Za-z0-9_]+(?:\s*\([^)]*\))?(?:\s+(?:WITH\s+TIME\s+ZONE|WITHOUT\s+TIME\s+ZONE|PRECISION))?(?:\[\])?)/i
  );

  let colType = 'TEXT';
  let constraintsStr = rest;

  if (typeMatch) {
    colType = typeMatch[1].trim().toUpperCase();
    constraintsStr = rest.slice(typeMatch[0].length).trim();
  }

  const upperConstraints = constraintsStr.toUpperCase();
  const isPk = /\bPRIMARY\s+KEY\b/i.test(upperConstraints);
  const isUnique = /\bUNIQUE\b/i.test(upperConstraints);
  const isExplicitNotNull = /\bNOT\s+NULL\b/i.test(upperConstraints);
  const isExplicitNull = /\bNULL\b/i.test(upperConstraints) && !isExplicitNotNull;
  const isNullable = isPk ? false : isExplicitNull ? true : !isExplicitNotNull;

  // Check for inline REFERENCES target_table(col)
  let inlineFk: ParsedForeignKey | undefined;
  const refMatch = constraintsStr.match(/REFERENCES\s+([A-Za-z0-9_."]+)\s*(?:\(([^)]+)\))?/i);
  if (refMatch) {
    const targetTable = cleanIdentifier(refMatch[1]);
    const targetCol = refMatch[2] ? cleanIdentifier(refMatch[2]) : colName;
    inlineFk = {
      sourceTable: tableKey,
      sourceColumns: [colName],
      targetTable,
      targetColumns: [targetCol],
    };
  }

  const column: ParsedColumn = {
    id: `col_${colName.toLowerCase()}`,
    name: colName,
    type: colType,
    isPk,
    isFk: !!inlineFk,
    isUnique: isUnique || undefined,
    isNullable,
  };

  return { column, inlineFk };
}

/**
 * Core SQL DDL parser for ERwin-generated PostgreSQL SQL.
 */
export function parseErwinPostgresSql(sqlText: string): ParseSqlResult {
  const warnings: string[] = [];
  const tablesMap = new Map<string, ParsedTable>();
  const relationships: ParsedForeignKey[] = [];

  const cleanedSql = stripComments(sqlText);
  const statements = splitStatements(cleanedSql);

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // 1. CREATE TABLE statement
    // Pattern: CREATE TABLE [IF NOT EXISTS] [schema.]table_name ( ... )
    const createTableMatch = trimmed.match(
      /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z0-9_."]+)\s*\(([\s\S]+)\)/i
    );

    if (createTableMatch) {
      const rawTableName = createTableMatch[1];
      const tableName = cleanIdentifier(rawTableName);
      const schema = extractSchema(rawTableName);
      const body = createTableMatch[2];

      const tableKey = tableName.toLowerCase();
      let table = tablesMap.get(tableKey);

      if (!table) {
        table = {
          id: `tbl_${tableKey}`,
          name: tableName,
          schema,
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
        };
        tablesMap.set(tableKey, table);
      }

      const colDefs = splitColumnDefinitions(body);

      for (const def of colDefs) {
        const trimmedDef = def.trim();
        const upperDef = trimmedDef.toUpperCase();

        // Check for table-level PRIMARY KEY constraint
        // e.g. CONSTRAINT pk_orders PRIMARY KEY (order_id, customer_id)
        // or PRIMARY KEY (order_id)
        const pkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."]+)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i
        );
        if (pkMatch) {
          const pkCols = pkMatch[2]
            .split(',')
            .map(c => cleanIdentifier(c))
            .filter(Boolean);
          table.primaryKeys.push(...pkCols);
          continue;
        }

        // Check for table-level FOREIGN KEY constraint
        // e.g. CONSTRAINT fk_order_cust FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        // or FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
        const fkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z0-9_."]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+([A-Za-z\s]+))?(?:\s+ON\s+UPDATE\s+([A-Za-z\s]+))?/i
        );
        if (fkMatch) {
          const constraintName = fkMatch[1] ? cleanIdentifier(fkMatch[1]) : undefined;
          const srcCols = fkMatch[2].split(',').map(c => cleanIdentifier(c));
          const targetTable = cleanIdentifier(fkMatch[3]);
          const targetCols = fkMatch[4].split(',').map(c => cleanIdentifier(c));

          const fkObj: ParsedForeignKey = {
            constraintName,
            sourceTable: tableName,
            sourceColumns: srcCols,
            targetTable,
            targetColumns: targetCols,
            onDelete: fkMatch[5]?.trim(),
            onUpdate: fkMatch[6]?.trim(),
          };

          table.foreignKeys.push(fkObj);
          relationships.push(fkObj);
          continue;
        }

        // Otherwise parse column definition
        const parsed = parseColumnDef(trimmedDef, tableName);
        if (parsed && parsed.column) {
          if (parsed.column.isPk) {
            table.primaryKeys.push(parsed.column.name);
          }
          if (parsed.inlineFk) {
            table.foreignKeys.push(parsed.inlineFk);
            relationships.push(parsed.inlineFk);
          }
          table.columns.push(parsed.column);
        }
      }

      continue;
    }

    // 2. ALTER TABLE ... ADD CONSTRAINT ... PRIMARY KEY
    // Common ERwin pattern:
    // ALTER TABLE [schema.]table_name ADD CONSTRAINT pk_name PRIMARY KEY (col1, col2);
    // or ALTER TABLE table_name ADD PRIMARY KEY (col1);
    const alterPkMatch = trimmed.match(
      /ALTER\s+TABLE(?:\s+ONLY)?\s+([A-Za-z0-9_."]+)\s+ADD(?:\s+CONSTRAINT\s+([A-Za-z0-9_."]+))?\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i
    );
    if (alterPkMatch) {
      const tableName = cleanIdentifier(alterPkMatch[1]);
      const tableKey = tableName.toLowerCase();
      const cols = alterPkMatch[3].split(',').map(c => cleanIdentifier(c)).filter(Boolean);

      const table = tablesMap.get(tableKey);
      if (table) {
        table.primaryKeys.push(...cols);
      }
      continue;
    }

    // 3. ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
    // Common ERwin pattern:
    // ALTER TABLE [schema.]child_table ADD CONSTRAINT R_1 FOREIGN KEY (col1) REFERENCES [schema.]parent_table (pcol1) [ON DELETE ...] [ON UPDATE ...];
    const alterFkMatch = trimmed.match(
      /ALTER\s+TABLE(?:\s+ONLY)?\s+([A-Za-z0-9_."]+)\s+ADD(?:\s+CONSTRAINT\s+([A-Za-z0-9_."]+))?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z0-9_."]+)\s*\(([^)]+)\)(?:[\s\S]*)/i
    );
    if (alterFkMatch) {
      const childTableName = cleanIdentifier(alterFkMatch[1]);
      const constraintName = alterFkMatch[2] ? cleanIdentifier(alterFkMatch[2]) : undefined;
      const srcCols = alterFkMatch[3].split(',').map(c => cleanIdentifier(c)).filter(Boolean);
      const parentTableName = cleanIdentifier(alterFkMatch[4]);
      const targetCols = alterFkMatch[5].split(',').map(c => cleanIdentifier(c)).filter(Boolean);

      const fkObj: ParsedForeignKey = {
        constraintName,
        sourceTable: childTableName,
        sourceColumns: srcCols,
        targetTable: parentTableName,
        targetColumns: targetCols,
      };

      const table = tablesMap.get(childTableName.toLowerCase());
      if (table) {
        table.foreignKeys.push(fkObj);
      }
      relationships.push(fkObj);
      continue;
    }

    // 4. COMMENT ON TABLE / COLUMN
    const commentTableMatch = trimmed.match(
      /COMMENT\s+ON\s+TABLE\s+([A-Za-z0-9_."]+)\s+IS\s+'([^']*)'/i
    );
    if (commentTableMatch) {
      const tableName = cleanIdentifier(commentTableMatch[1]);
      const commentText = commentTableMatch[2];
      const table = tablesMap.get(tableName.toLowerCase());
      if (table) {
        table.comment = commentText;
      }
      continue;
    }
  }

  // Post-process tables: sync isPk and isFk flags on individual columns
  for (const table of tablesMap.values()) {
    const pkSet = new Set(table.primaryKeys.map(k => k.toLowerCase()));

    // Create a set of columns involved in foreign keys
    const fkColsSet = new Set<string>();
    for (const fk of table.foreignKeys) {
      for (const col of fk.sourceColumns) {
        fkColsSet.add(col.toLowerCase());
      }
    }

    for (const col of table.columns) {
      if (pkSet.has(col.name.toLowerCase())) {
        col.isPk = true;
        col.isNullable = false;
      }
      if (fkColsSet.has(col.name.toLowerCase())) {
        col.isFk = true;
      }
    }
  }

  // Also check relationships that were added via ALTER TABLE to set isFk on child tables
  for (const rel of relationships) {
    const childTable = tablesMap.get(rel.sourceTable.toLowerCase());
    if (childTable) {
      for (const srcCol of rel.sourceColumns) {
        const found = childTable.columns.find(c => c.name.toLowerCase() === srcCol.toLowerCase());
        if (found) {
          found.isFk = true;
        }
      }
    }
  }

  // Convert tables to DiagramNodes with auto-layout
  const tablesList = Array.from(tablesMap.values());
  const { nodes, tablePositions } = layoutErdTables(tablesList);

  // Convert foreign keys to DiagramEdges
  const edges = createErdEdges(relationships, tablePositions, tablesMap);

  // Stats calculation
  let totalCols = 0;
  let totalPks = 0;
  let totalFks = 0;
  for (const t of tablesList) {
    totalCols += t.columns.length;
    totalPks += t.columns.filter(c => c.isPk).length;
    totalFks += t.columns.filter(c => c.isFk).length;
  }

  return {
    tables: tablesList,
    relationships,
    nodes,
    edges,
    warnings,
    stats: {
      tableCount: tablesList.length,
      columnCount: totalCols,
      pkCount: totalPks,
      fkCount: totalFks,
      statementCount: statements.length,
    },
  };
}

/**
 * Arranges ERD tables in a clean, legible grid layout.
 * Calculates dynamic height based on the number of columns.
 */
function layoutErdTables(tables: ParsedTable[]): {
  nodes: DiagramNode[];
  tablePositions: Map<string, { x: number; y: number; width: number; height: number; nodeId: string }>;
} {
  const nodes: DiagramNode[] = [];
  const tablePositions = new Map<string, { x: number; y: number; width: number; height: number; nodeId: string }>();

  // Determine grid columns based on count (e.g. 1 -> 1, 2-4 -> 2, 5-9 -> 3, 10+ -> 4)
  const total = tables.length;
  const numCols = total <= 1 ? 1 : total <= 4 ? 2 : total <= 9 ? 3 : 4;

  const nodeWidth = 260;
  const colSpacing = 90;
  const rowSpacing = 70;
  const startX = 80;
  const startY = 80;

  // Track max height per row for neat vertical spacing
  const rowMaxHeights: number[] = [];

  // Calculate table dimensions first
  const tableDims = tables.map(t => {
    // Header is ~42px, each field is 24px, plus bottom margin
    const fieldsCount = Math.max(1, t.columns.length);
    const height = 44 + fieldsCount * 25 + 16;
    return { table: t, width: nodeWidth, height };
  });

  // Calculate row heights
  tableDims.forEach((dim, idx) => {
    const row = Math.floor(idx / numCols);
    rowMaxHeights[row] = Math.max(rowMaxHeights[row] || 0, dim.height);
  });

  // Position nodes
  let currentRowY = startY;
  let currentRow = 0;

  tableDims.forEach((dim, idx) => {
    const row = Math.floor(idx / numCols);
    const col = idx % numCols;

    if (row > currentRow) {
      currentRowY += (rowMaxHeights[currentRow] || 200) + rowSpacing;
      currentRow = row;
    }

    const x = startX + col * (nodeWidth + colSpacing);
    const y = currentRowY;
    const nodeId = `erd_${dim.table.name.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`;

    const node: DiagramNode = {
      id: nodeId,
      type: 'erd-entity',
      label: dim.table.name,
      x,
      y,
      width: dim.width,
      height: dim.height,
      style: {
        fill: 'rgba(15, 23, 42, 0.95)',
        stroke: '#0284c7',
        strokeWidth: 2,
        rounded: 6,
      },
      data: {
        tableName: dim.table.name,
        schema: dim.table.schema,
        fields: dim.table.columns.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isPk: c.isPk,
          isFk: c.isFk,
          isUnique: c.isUnique,
          isNullable: c.isNullable,
        })),
        comment: dim.table.comment,
      },
      documentation: dim.table.comment
        ? {
            description: dim.table.comment,
            tags: ['ERD', 'PostgreSQL', 'ERwin'],
            status: 'approved',
          }
        : undefined,
    };

    nodes.push(node);
    tablePositions.set(dim.table.name.toLowerCase(), {
      x,
      y,
      width: dim.width,
      height: dim.height,
      nodeId,
    });
  });

  return { nodes, tablePositions };
}

/**
 * Creates DiagramEdges from parsed foreign key relationships.
 * Automatically chooses optimal anchors (e.g. left-right or top-bottom) based on table coordinates.
 */
function createErdEdges(
  foreignKeys: ParsedForeignKey[],
  tablePositions: Map<string, { x: number; y: number; width: number; height: number; nodeId: string }>,
  tablesMap: Map<string, ParsedTable>
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const edgeKeySet = new Set<string>();

  for (const fk of foreignKeys) {
    const sourcePos = tablePositions.get(fk.sourceTable.toLowerCase());
    const targetPos = tablePositions.get(fk.targetTable.toLowerCase());

    if (!sourcePos || !targetPos) {
      continue;
    }

    // Skip self-referencing duplicates or duplicate lines between same two tables
    const uniqueKey = `${sourcePos.nodeId}->${targetPos.nodeId}:${fk.sourceColumns.join(',')}`;
    if (edgeKeySet.has(uniqueKey)) continue;
    edgeKeySet.add(uniqueKey);

    // Pick best anchors based on relative position
    let sourceAnchor = 'right';
    let targetAnchor = 'left';

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        // Target is to the right
        sourceAnchor = 'right';
        targetAnchor = 'left';
      } else {
        // Target is to the left
        sourceAnchor = 'left';
        targetAnchor = 'right';
      }
    } else {
      if (dy > 0) {
        // Target is below
        sourceAnchor = 'bottom';
        targetAnchor = 'top';
      } else {
        // Target is above
        sourceAnchor = 'top';
        targetAnchor = 'bottom';
      }
    }

    const labelText = fk.constraintName
      ? fk.constraintName
      : fk.sourceColumns.length === 1 && fk.targetColumns.length === 1
      ? `${fk.sourceColumns[0]} ➔ ${fk.targetColumns[0]}`
      : 'FK';

    const edge: DiagramEdge = {
      id: `edge_${sourcePos.nodeId}_${targetPos.nodeId}_${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId: sourcePos.nodeId,
      targetNodeId: targetPos.nodeId,
      sourceAnchor,
      targetAnchor,
      label: labelText,
      type: 'orthogonal',
      lineStyle: 'solid',
      markerStart: 'none',
      markerEnd: 'crow-foot-many', // ERD standard: child table has foreign keys, points to 1 parent
      cardinality: {
        source: '0..*',
        target: '1',
      },
      color: '#0284c7',
      strokeWidth: 2,
    };

    edges.push(edge);
  }

  return edges;
}

/**
 * High-quality sample ERwin-generated PostgreSQL DDL for testing & 1-click preview.
 */
export const SAMPLE_ERWIN_POSTGRES_SQL = `-- ************************************************************
-- * CA ERwin Data Modeler - PostgreSQL Schema Generation    *
-- * Target DBMS: PostgreSQL 14+                              *
-- * Model: E-Commerce Operations & Inventory Management      *
-- ************************************************************

CREATE TABLE public.customers (
    customer_id SERIAL NOT NULL,
    account_number VARCHAR(32) NOT NULL,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(24),
    credit_limit NUMERIC(12, 2) DEFAULT 1000.00,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.customers
    ADD CONSTRAINT pk_customers PRIMARY KEY (customer_id);

CREATE TABLE public.orders (
    order_id SERIAL NOT NULL,
    customer_id INTEGER NOT NULL,
    order_number VARCHAR(40) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    order_status VARCHAR(25) DEFAULT 'PENDING' NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    shipping_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL
);

ALTER TABLE public.orders
    ADD CONSTRAINT pk_orders PRIMARY KEY (order_id);

ALTER TABLE public.orders
    ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
    REFERENCES public.customers (customer_id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.categories (
    category_id SERIAL NOT NULL,
    category_name VARCHAR(80) NOT NULL,
    category_code VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

ALTER TABLE public.categories
    ADD CONSTRAINT pk_categories PRIMARY KEY (category_id);

CREATE TABLE public.products (
    product_id SERIAL NOT NULL,
    category_id INTEGER NOT NULL,
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    is_discontinued BOOLEAN DEFAULT FALSE NOT NULL
);

ALTER TABLE public.products
    ADD CONSTRAINT pk_products PRIMARY KEY (product_id);

ALTER TABLE public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES public.categories (category_id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.order_items (
    order_item_id SERIAL NOT NULL,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    discount_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    total_line_price NUMERIC(12, 2) NOT NULL
);

ALTER TABLE public.order_items
    ADD CONSTRAINT pk_order_items PRIMARY KEY (order_item_id);

ALTER TABLE public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES public.orders (order_id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.order_items
    ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
    REFERENCES public.products (product_id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE public.shipments (
    shipment_id SERIAL NOT NULL,
    order_id INTEGER NOT NULL,
    tracking_number VARCHAR(60),
    carrier_name VARCHAR(60) NOT NULL,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'IN_TRANSIT' NOT NULL
);

ALTER TABLE public.shipments
    ADD CONSTRAINT pk_shipments PRIMARY KEY (shipment_id);

ALTER TABLE public.shipments
    ADD CONSTRAINT fk_shipments_order FOREIGN KEY (order_id)
    REFERENCES public.orders (order_id)
    ON DELETE CASCADE ON UPDATE CASCADE;
`;
