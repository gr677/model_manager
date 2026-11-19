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
    alterCount: number;
  };
}

export interface EntityChangeSummary {
  tableName: string;
  nodeId: string;
  status: 'modified' | 'created' | 'dropped' | 'unchanged';
  changes: string[];
  table: ParsedTable;
}

export interface ApplySqlChangesResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  entitySummaries: EntityChangeSummary[];
  warnings: string[];
  stats: {
    modifiedCount: number;
    createdCount: number;
    droppedCount: number;
    edgeAddedCount: number;
    edgeRemovedCount: number;
    statementCount: number;
    totalChangeCount: number;
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
 * Cleans identifier by removing quotes/brackets and schema qualifications (e.g. "public"."users" -> "users").
 */
export function cleanIdentifier(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const parts = trimmed.split('.');
  const name = parts[parts.length - 1].trim();
  // Strip outer quotes or brackets if any
  return name.replace(/^["'`\[]+|["'`\]]+$/g, '').trim();
}

/**
 * Extracts schema name if provided (e.g. public.users -> public).
 */
export function extractSchema(raw: string): string | undefined {
  if (!raw) return undefined;
  const parts = raw.trim().split('.');
  if (parts.length > 1) {
    return parts[0].trim().replace(/^["'`\[]+|["'`\]]+$/g, '').trim();
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

function recalculateTableColumnFlags(table: ParsedTable): void {
  const pkSet = new Set(table.primaryKeys.map(k => k.toLowerCase()));
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

/**
 * Unwraps Oracle-style parenthesized ALTER TABLE ADD (col1 INT, col2 TEXT) into individual ADD actions,
 * and passes through comma-separated PostgreSQL/MySQL actions.
 */
function expandAlterActions(actionsBody: string): string[] {
  const rawActions = splitColumnDefinitions(actionsBody);
  const expanded: string[] = [];

  for (const raw of rawActions) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Detect Oracle/generic ADD (col1 TYPE, col2 TYPE) vs ADD CONSTRAINT ... / ADD PRIMARY KEY (...)
    const parenAddMatch = trimmed.match(/^ADD\s*\(([\s\S]+)\)$/i);
    if (parenAddMatch) {
      const inner = parenAddMatch[1].trim();
      const innerUpper = inner.toUpperCase();
      if (
        !innerUpper.startsWith('CONSTRAINT') &&
        !innerUpper.startsWith('PRIMARY KEY') &&
        !innerUpper.startsWith('FOREIGN KEY') &&
        !innerUpper.startsWith('UNIQUE') &&
        !innerUpper.startsWith('CHECK')
      ) {
        const subItems = splitColumnDefinitions(inner);
        for (const sub of subItems) {
          if (sub.trim()) expanded.push(`ADD COLUMN ${sub.trim()}`);
        }
        continue;
      }
    }

    expanded.push(trimmed);
  }

  return expanded;
}

interface AlterExecutionContext {
  getTable: (tableName: string) => ParsedTable | undefined;
  renameTable: (oldTable: ParsedTable, newName: string, newSchema?: string) => void;
  onForeignKeyAdded: (fk: ParsedForeignKey) => void;
  onForeignKeyRemoved?: (tableName: string, constraintName?: string, droppedColumn?: string) => void;
  onColumnRenamed?: (tableName: string, oldCol: string, newCol: string) => void;
  onChange?: (tableName: string, description: string) => void;
  onWarning: (msg: string) => void;
}

/**
 * Applies a single ALTER TABLE statement (single or comma-separated actions) against a mutable table map.
 */
function processAlterTableStatement(stmt: string, ctx: AlterExecutionContext): boolean {
  const alterMatch = stmt.match(
    /^ALTER\s+TABLE(?:\s+IF\s+EXISTS)?(?:\s+ONLY)?\s+([A-Za-z0-9_."`\[\]]+)\s+([\s\S]+)$/i
  );
  if (!alterMatch) return false;

  const rawTableName = alterMatch[1];
  const tableName = cleanIdentifier(rawTableName);
  const actionsBody = alterMatch[2].trim();

  const table = ctx.getTable(tableName);
  if (!table) {
    ctx.onWarning(`Table "${tableName}" not found for statement: ${stmt.slice(0, 72)}${stmt.length > 72 ? '...' : ''}`);
    return true;
  }

  const actions = expandAlterActions(actionsBody);

  for (const action of actions) {
    const trimmedAction = action.trim();
    if (!trimmedAction) continue;

    // 1. RENAME TO new_table_name
    const renameTableMatch = trimmedAction.match(/^RENAME\s+TO\s+([A-Za-z0-9_."`\[\]]+)$/i);
    if (renameTableMatch) {
      const newRaw = renameTableMatch[1];
      const newName = cleanIdentifier(newRaw);
      const newSchema = extractSchema(newRaw);
      const oldName = table.name;
      ctx.renameTable(table, newName, newSchema);
      ctx.onChange?.(newName, `Renamed table ${oldName} → ${newName}`);
      continue;
    }

    // 2. RENAME [COLUMN] old_col TO new_col
    const renameColMatch = trimmedAction.match(
      /^RENAME\s+(?:COLUMN\s+)?([A-Za-z0-9_."`\[\]]+)\s+TO\s+([A-Za-z0-9_."`\[\]]+)$/i
    );
    if (renameColMatch) {
      const oldColName = cleanIdentifier(renameColMatch[1]);
      const newColName = cleanIdentifier(renameColMatch[2]);
      const col = table.columns.find(c => c.name.toLowerCase() === oldColName.toLowerCase());
      if (!col) {
        ctx.onWarning(`Column "${oldColName}" not found on table "${table.name}" for RENAME COLUMN.`);
        continue;
      }
      const prevName = col.name;
      col.name = newColName;
      col.id = `col_${newColName.toLowerCase()}`;
      table.primaryKeys = table.primaryKeys.map(pk =>
        pk.toLowerCase() === oldColName.toLowerCase() ? newColName : pk
      );
      for (const fk of table.foreignKeys) {
        fk.sourceColumns = fk.sourceColumns.map(sc =>
          sc.toLowerCase() === oldColName.toLowerCase() ? newColName : sc
        );
      }
      ctx.onColumnRenamed?.(table.name, prevName, newColName);
      ctx.onChange?.(table.name, `Renamed column ${prevName} → ${newColName}`);
      continue;
    }

    // 3. ADD [CONSTRAINT name] PRIMARY KEY (col1, col2)
    const addPkMatch = trimmedAction.match(
      /^ADD(?:\s+CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+))?\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i
    );
    if (addPkMatch) {
      const cols = addPkMatch[2].split(',').map(c => cleanIdentifier(c)).filter(Boolean);
      for (const pkCol of cols) {
        if (!table.primaryKeys.some(existing => existing.toLowerCase() === pkCol.toLowerCase())) {
          table.primaryKeys.push(pkCol);
        }
        const found = table.columns.find(c => c.name.toLowerCase() === pkCol.toLowerCase());
        if (found) {
          found.isPk = true;
          found.isNullable = false;
        }
      }
      ctx.onChange?.(table.name, `+ PK (${cols.join(', ')})`);
      continue;
    }

    // 4. ADD [CONSTRAINT name] UNIQUE (col1, ...)
    const addUniqueMatch = trimmedAction.match(
      /^ADD(?:\s+CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+))?\s+UNIQUE\s*\(([^)]+)\)/i
    );
    if (addUniqueMatch) {
      const cols = addUniqueMatch[2].split(',').map(c => cleanIdentifier(c)).filter(Boolean);
      for (const uqCol of cols) {
        const found = table.columns.find(c => c.name.toLowerCase() === uqCol.toLowerCase());
        if (found) {
          found.isUnique = true;
        }
      }
      ctx.onChange?.(table.name, `+ UNIQUE (${cols.join(', ')})`);
      continue;
    }

    // 5. ADD [CONSTRAINT name] FOREIGN KEY (src) REFERENCES target [(tcols)]
    const addFkMatch = trimmedAction.match(
      /^ADD(?:\s+CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+))?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z0-9_."`\[\]]+)\s*(?:\(([^)]+)\))?(?:[\s\S]*)/i
    );
    if (addFkMatch) {
      const constraintName = addFkMatch[1] ? cleanIdentifier(addFkMatch[1]) : undefined;
      const srcCols = addFkMatch[2].split(',').map(c => cleanIdentifier(c)).filter(Boolean);
      const targetTable = cleanIdentifier(addFkMatch[3]);
      const targetCols = addFkMatch[4]
        ? addFkMatch[4].split(',').map(c => cleanIdentifier(c)).filter(Boolean)
        : srcCols;

      const fkObj: ParsedForeignKey = {
        constraintName,
        sourceTable: table.name,
        sourceColumns: srcCols,
        targetTable,
        targetColumns: targetCols,
      };
      table.foreignKeys.push(fkObj);
      for (const srcCol of srcCols) {
        const found = table.columns.find(c => c.name.toLowerCase() === srcCol.toLowerCase());
        if (found) found.isFk = true;
      }
      ctx.onForeignKeyAdded(fkObj);
      ctx.onChange?.(table.name, `+ FK (${srcCols.join(', ')}) → ${targetTable}`);
      continue;
    }

    // 6. ADD [CONSTRAINT name] CHECK (...) — recognize cleanly so it isn't parsed as a column
    if (/^ADD(?:\s+CONSTRAINT\s+[A-Za-z0-9_."`\[\]]+)?\s+CHECK\s*\(/i.test(trimmedAction)) {
      ctx.onChange?.(table.name, `+ CHECK constraint`);
      continue;
    }

    // 7. ADD [COLUMN] [IF NOT EXISTS] col_def
    const addColMatch = trimmedAction.match(
      /^ADD(?:\s+COLUMN)?(\s+IF\s+NOT\s+EXISTS)?\s+([\s\S]+)$/i
    );
    if (addColMatch) {
      const ifNotExists = !!addColMatch[1];
      const colDef = addColMatch[2].trim();
      const parsed = parseColumnDef(colDef, table.name);
      if (parsed && parsed.column) {
        const existingIdx = table.columns.findIndex(
          c => c.name.toLowerCase() === parsed.column!.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          if (ifNotExists) {
            continue;
          }
          table.columns[existingIdx] = parsed.column;
          ctx.onChange?.(table.name, `~ ${parsed.column.name} (${parsed.column.type})`);
        } else {
          table.columns.push(parsed.column);
          ctx.onChange?.(table.name, `+ ${parsed.column.name} (${parsed.column.type})`);
        }
        if (parsed.column.isPk && !table.primaryKeys.some(k => k.toLowerCase() === parsed.column!.name.toLowerCase())) {
          table.primaryKeys.push(parsed.column.name);
        }
        if (parsed.inlineFk) {
          table.foreignKeys.push(parsed.inlineFk);
          ctx.onForeignKeyAdded(parsed.inlineFk);
          ctx.onChange?.(table.name, `+ FK (${parsed.column.name}) → ${parsed.inlineFk.targetTable}`);
        }
        continue;
      }
    }

    // 8. DROP CONSTRAINT [IF EXISTS] constraint_name
    const dropConstraintMatch = trimmedAction.match(
      /^DROP\s+CONSTRAINT(?:\s+IF\s+EXISTS)?\s+([A-Za-z0-9_."`\[\]]+)(?:\s+(?:CASCADE|RESTRICT))?$/i
    );
    if (dropConstraintMatch) {
      const cName = cleanIdentifier(dropConstraintMatch[1]);
      table.foreignKeys = table.foreignKeys.filter(
        fk => (fk.constraintName || '').toLowerCase() !== cName.toLowerCase()
      );
      // Re-sync isFk on columns from remaining foreignKeys
      const remainingFkCols = new Set(
        table.foreignKeys.flatMap(fk => fk.sourceColumns.map(c => c.toLowerCase()))
      );
      for (const col of table.columns) {
        if (!remainingFkCols.has(col.name.toLowerCase())) {
          col.isFk = false;
        }
      }
      ctx.onForeignKeyRemoved?.(table.name, cName, undefined);
      ctx.onChange?.(table.name, `- Constraint ${cName}`);
      continue;
    }

    // 9. DROP PRIMARY KEY
    if (/^DROP\s+PRIMARY\s+KEY\b/i.test(trimmedAction)) {
      table.primaryKeys = [];
      for (const col of table.columns) {
        col.isPk = false;
      }
      ctx.onChange?.(table.name, `- PRIMARY KEY`);
      continue;
    }

    // 10. DROP [COLUMN] [IF EXISTS] col_name [CASCADE|RESTRICT]
    const dropColMatch = trimmedAction.match(
      /^DROP(?:\s+COLUMN)?(\s+IF\s+EXISTS)?\s+([A-Za-z0-9_."`\[\]]+)(?:\s+(?:CASCADE|RESTRICT))?$/i
    );
    if (dropColMatch) {
      const ifExists = !!dropColMatch[1];
      const colName = cleanIdentifier(dropColMatch[2]);
      const idx = table.columns.findIndex(c => c.name.toLowerCase() === colName.toLowerCase());
      if (idx === -1) {
        if (!ifExists) {
          ctx.onWarning(`Column "${colName}" not found on table "${table.name}" for DROP COLUMN.`);
        }
        continue;
      }
      const removed = table.columns[idx];
      table.columns.splice(idx, 1);
      table.primaryKeys = table.primaryKeys.filter(pk => pk.toLowerCase() !== colName.toLowerCase());
      table.foreignKeys = table.foreignKeys.filter(
        fk => !fk.sourceColumns.some(sc => sc.toLowerCase() === colName.toLowerCase())
      );
      ctx.onForeignKeyRemoved?.(table.name, undefined, removed.name);
      ctx.onChange?.(table.name, `- ${removed.name}`);
      continue;
    }

    // 11. ALTER [COLUMN] col_name (SET DATA TYPE / TYPE / SET NOT NULL / DROP NOT NULL / SET DEFAULT / DROP DEFAULT)
    const alterColMatch = trimmedAction.match(
      /^ALTER(?:\s+COLUMN)?\s+([A-Za-z0-9_."`\[\]]+)\s+([\s\S]+)$/i
    );
    if (alterColMatch) {
      const colName = cleanIdentifier(alterColMatch[1]);
      const subAction = alterColMatch[2].trim();
      const col = table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
      if (!col) {
        ctx.onWarning(`Column "${colName}" not found on table "${table.name}" for ALTER COLUMN.`);
        continue;
      }

      const typeChangeMatch = subAction.match(
        /^(?:SET\s+DATA\s+)?TYPE\s+([\s\S]+?)(?:\s+(?:USING|COLLATE)\s+[\s\S]+)?$/i
      );
      if (typeChangeMatch) {
        col.type = typeChangeMatch[1].trim().toUpperCase();
        ctx.onChange?.(table.name, `~ ${col.name}: ${col.type}`);
        continue;
      }

      if (/^SET\s+NOT\s+NULL$/i.test(subAction)) {
        col.isNullable = false;
        ctx.onChange?.(table.name, `~ ${col.name}: NOT NULL`);
        continue;
      }

      if (/^DROP\s+NOT\s+NULL$/i.test(subAction)) {
        col.isNullable = true;
        ctx.onChange?.(table.name, `~ ${col.name}: NULLABLE`);
        continue;
      }

      const setDefaultMatch = subAction.match(/^SET\s+DEFAULT\s+([\s\S]+)$/i);
      if (setDefaultMatch) {
        col.defaultValue = setDefaultMatch[1].trim();
        ctx.onChange?.(table.name, `~ ${col.name}: DEFAULT ${col.defaultValue}`);
        continue;
      }

      if (/^DROP\s+DEFAULT$/i.test(subAction)) {
        col.defaultValue = undefined;
        ctx.onChange?.(table.name, `~ ${col.name}: DROP DEFAULT`);
        continue;
      }

      // SQL Server / shorthand: ALTER COLUMN col_name NEW_TYPE [NOT NULL | NULL]
      const shorthandMatch = parseColumnDef(`${colName} ${subAction}`, table.name);
      if (shorthandMatch?.column && shorthandMatch.column.type !== 'TEXT') {
        col.type = shorthandMatch.column.type;
        if (/\bNOT\s+NULL\b/i.test(subAction)) col.isNullable = false;
        else if (/\bNULL\b/i.test(subAction)) col.isNullable = true;
        ctx.onChange?.(table.name, `~ ${col.name}: ${col.type}`);
        continue;
      }

      ctx.onWarning(`Unsupported ALTER COLUMN clause on "${table.name}.${col.name}": ${subAction}`);
      continue;
    }

    // 12. MODIFY [COLUMN] col_def (MySQL / Oracle syntax)
    const modifyColMatch = trimmedAction.match(/^MODIFY(?:\s+COLUMN)?\s+([\s\S]+)$/i);
    if (modifyColMatch) {
      const parsed = parseColumnDef(modifyColMatch[1].trim(), table.name);
      if (parsed && parsed.column) {
        const idx = table.columns.findIndex(
          c => c.name.toLowerCase() === parsed.column!.name.toLowerCase()
        );
        if (idx >= 0) {
          const prev = table.columns[idx];
          table.columns[idx] = {
            ...prev,
            type: parsed.column.type,
            isNullable: parsed.column.isNullable,
            isPk: parsed.column.isPk || prev.isPk,
            isUnique: parsed.column.isUnique ?? prev.isUnique,
          };
          ctx.onChange?.(table.name, `~ ${parsed.column.name} (${parsed.column.type})`);
        } else {
          ctx.onWarning(`Column "${parsed.column.name}" not found on "${table.name}" for MODIFY.`);
        }
        continue;
      }
    }

    // 13. CHANGE [COLUMN] old_col new_col_def (MySQL syntax)
    const changeColMatch = trimmedAction.match(
      /^CHANGE(?:\s+COLUMN)?\s+([A-Za-z0-9_."`\[\]]+)\s+([\s\S]+)$/i
    );
    if (changeColMatch) {
      const oldColName = cleanIdentifier(changeColMatch[1]);
      const parsed = parseColumnDef(changeColMatch[2].trim(), table.name);
      if (parsed && parsed.column) {
        const idx = table.columns.findIndex(c => c.name.toLowerCase() === oldColName.toLowerCase());
        if (idx >= 0) {
          const prev = table.columns[idx];
          table.columns[idx] = {
            ...parsed.column,
            isPk: parsed.column.isPk || prev.isPk,
            isFk: parsed.column.isFk || prev.isFk,
          };
          ctx.onColumnRenamed?.(table.name, prev.name, parsed.column.name);
          ctx.onChange?.(
            table.name,
            `~ ${prev.name} → ${parsed.column.name} (${parsed.column.type})`
          );
        } else {
          ctx.onWarning(`Column "${oldColName}" not found on "${table.name}" for CHANGE COLUMN.`);
        }
        continue;
      }
    }

    ctx.onWarning(`Skipped unrecognized ALTER TABLE action on "${table.name}": ${trimmedAction.slice(0, 60)}`);
  }

  return true;
}

const SQL_QUALIFIED_IDENT =
  '(?:"[^"]+"|`[^`]+`|\\[[^\\]]+\\]|[A-Za-z0-9_$]+)(?:\\.(?:"[^"]+"|`[^`]+`|\\[[^\\]]+\\]|[A-Za-z0-9_$]+))*';

interface ExtractedCreateTable {
  ifNotExists: boolean;
  rawTableName: string;
  body: string;
  trailingClause: string;
}

/**
 * Extracts a CREATE TABLE [IF NOT EXISTS] statement using balanced parenthesis matching
 * so trailing table options (TABLESPACE, WITH (...), PARTITION BY (...), ENGINE=..., etc.)
 * do not break matching or corrupt the column definition body.
 */
function extractCreateTableStatement(stmt: string): ExtractedCreateTable | null {
  const headerRegex = new RegExp(
    `CREATE\\s+(?:(?:GLOBAL\\s+|LOCAL\\s+)?(?:TEMP|TEMPORARY)\\s+|UNLOGGED\\s+)?TABLE(\\s+IF\\s+NOT\\s+EXISTS)?\\s+(${SQL_QUALIFIED_IDENT})\\s*\\(`,
    'i'
  );
  const match = headerRegex.exec(stmt);
  if (!match || match.index === undefined) return null;

  const ifNotExists = !!match[1];
  const rawTableName = match[2];
  const bodyStart = match.index + match[0].length;

  let depth = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let i = bodyStart;

  while (i < stmt.length && depth > 0) {
    const ch = stmt[i];
    const next = stmt[i + 1];

    if (ch === "'" && !inDoubleQuote && !inBacktick) {
      if (inSingleQuote && next === "'") {
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote && !inBacktick) {
      if (inDoubleQuote && next === '"') {
        i += 2;
        continue;
      }
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    } else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    i++;
  }

  if (depth !== 0) return null;

  const body = stmt.slice(bodyStart, i - 1);
  const trailingClause = stmt.slice(i).trim();
  return { ifNotExists, rawTableName, body, trailingClause };
}

/**
 * Core SQL DDL parser for ERwin-generated PostgreSQL SQL (CREATE TABLE + ALTER TABLE).
 */
export function parseErwinPostgresSql(sqlText: string): ParseSqlResult {
  const warnings: string[] = [];
  const tablesMap = new Map<string, ParsedTable>();
  const relationships: ParsedForeignKey[] = [];
  let alterCount = 0;

  const cleanedSql = stripComments(sqlText);
  const statements = splitStatements(cleanedSql);

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // 1. CREATE TABLE statement
    const extractedCreate = extractCreateTableStatement(trimmed);

    if (extractedCreate) {
      const { rawTableName, body } = extractedCreate;
      const tableName = cleanIdentifier(rawTableName);
      const schema = extractSchema(rawTableName);

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

        const pkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i
        );
        if (pkMatch) {
          const pkCols = pkMatch[2]
            .split(',')
            .map(c => cleanIdentifier(c))
            .filter(Boolean);
          table.primaryKeys.push(...pkCols);
          continue;
        }

        const fkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z0-9_."`\[\]]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+([A-Za-z\s]+))?(?:\s+ON\s+UPDATE\s+([A-Za-z\s]+))?/i
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

    // 2. ALTER TABLE statements (ADD/DROP/ALTER/MODIFY/CHANGE/RENAME columns, constraints, table)
    if (/^ALTER\s+TABLE\b/i.test(trimmed)) {
      alterCount++;
      processAlterTableStatement(trimmed, {
        getTable: name => tablesMap.get(name.toLowerCase()),
        renameTable: (tbl, newName, newSchema) => {
          tablesMap.delete(tbl.name.toLowerCase());
          tbl.name = newName;
          tbl.id = `tbl_${newName.toLowerCase()}`;
          if (newSchema) tbl.schema = newSchema;
          tablesMap.set(newName.toLowerCase(), tbl);
        },
        onForeignKeyAdded: fk => relationships.push(fk),
        onWarning: msg => warnings.push(msg),
      });
      continue;
    }

    // 3. DROP TABLE
    const dropTableMatch = trimmed.match(
      /^DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([A-Za-z0-9_."`\[\]]+)/i
    );
    if (dropTableMatch) {
      const tblName = cleanIdentifier(dropTableMatch[1]);
      tablesMap.delete(tblName.toLowerCase());
      continue;
    }

    // 4. COMMENT ON TABLE / COLUMN
    const commentTableMatch = trimmed.match(
      /COMMENT\s+ON\s+TABLE\s+([A-Za-z0-9_."`\[\]]+)\s+IS\s+'([^']*)'/i
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

    const commentColMatch = trimmed.match(
      /COMMENT\s+ON\s+COLUMN\s+([A-Za-z0-9_."`\[\]]+)\s+IS\s+'([^']*)'/i
    );
    if (commentColMatch) {
      const parts = commentColMatch[1].split('.');
      if (parts.length >= 2) {
        const colName = cleanIdentifier(parts[parts.length - 1]);
        const tblName = cleanIdentifier(parts[parts.length - 2]);
        const table = tablesMap.get(tblName.toLowerCase());
        const col = table?.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
        if (col) col.comment = commentColMatch[2];
      }
      continue;
    }
  }

  // Post-process tables: sync isPk and isFk flags on individual columns
  for (const table of tablesMap.values()) {
    recalculateTableColumnFlags(table);
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
      alterCount,
    },
  };
}

/**
 * Applies SQL DDL statements (ALTER TABLE, CREATE TABLE, DROP TABLE, COMMENT ON) incrementally
 * against the existing ERD entities and edges on the current canvas page, preserving node positions.
 */
export function applySqlChangesToErd(
  sqlText: string,
  existingNodes: DiagramNode[],
  existingEdges: DiagramEdge[]
): ApplySqlChangesResult {
  const warnings: string[] = [];
  const cleanedSql = stripComments(sqlText);
  const statements = splitStatements(cleanedSql);

  interface MutableEntity {
    nodeId: string;
    originalNode?: DiagramNode;
    table: ParsedTable;
    changes: string[];
    isNew: boolean;
    isDropped: boolean;
  }

  const entityMap = new Map<string, MutableEntity>();
  const entityByNodeId = new Map<string, MutableEntity>();
  const newForeignKeys: ParsedForeignKey[] = [];
  let workingEdges: DiagramEdge[] = existingEdges.map(e => ({ ...e }));
  let edgeRemovedCount = 0;

  // Seed entityMap with existing erd-entity nodes from current canvas
  for (const node of existingNodes) {
    if (node.type !== 'erd-entity') continue;
    const rawTableName = (node.data?.tableName || node.label || '').trim();
    if (!rawTableName) continue;
    const cleanName = cleanIdentifier(rawTableName);
    const key = cleanName.toLowerCase();

    const rawFields: any[] = Array.isArray(node.data?.fields) ? node.data.fields : [];
    const columns: ParsedColumn[] = rawFields.map((f, idx) => ({
      id: f.id || `col_${(f.name || idx).toString().toLowerCase()}`,
      name: f.name || `col_${idx + 1}`,
      type: f.type || 'TEXT',
      isPk: !!f.isPk,
      isFk: !!f.isFk,
      isUnique: f.isUnique || f.unique || undefined,
      isNullable: f.isNullable !== undefined ? !!f.isNullable : !f.isPk,
      defaultValue: f.defaultValue,
      comment: f.comment,
    }));

    const table: ParsedTable = {
      id: `tbl_${key}`,
      name: cleanName,
      schema: node.data?.schema,
      columns,
      primaryKeys: columns.filter(c => c.isPk).map(c => c.name),
      foreignKeys: [],
      comment: node.data?.comment || node.documentation?.description,
    };

    const ent: MutableEntity = {
      nodeId: node.id,
      originalNode: node,
      table,
      changes: [],
      isNew: false,
      isDropped: false,
    };
    entityMap.set(key, ent);
    entityByNodeId.set(node.id, ent);
  }

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // 1. CREATE TABLE [IF NOT EXISTS]
    const extractedCreate = extractCreateTableStatement(trimmed);
    if (extractedCreate) {
      const { ifNotExists, rawTableName, body } = extractedCreate;
      const tableName = cleanIdentifier(rawTableName);
      const schema = extractSchema(rawTableName);
      const key = tableName.toLowerCase();

      const existingEnt = entityMap.get(key);
      if (existingEnt && ifNotExists) {
        warnings.push(`Table "${tableName}" already exists; skipped (IF NOT EXISTS).`);
        continue;
      }

      const parsedNew: ParsedTable = {
        id: `tbl_${key}`,
        name: tableName,
        schema,
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
      };

      const colDefs = splitColumnDefinitions(body);
      for (const def of colDefs) {
        const trimmedDef = def.trim();
        const pkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i
        );
        if (pkMatch) {
          parsedNew.primaryKeys.push(
            ...pkMatch[2].split(',').map(c => cleanIdentifier(c)).filter(Boolean)
          );
          continue;
        }
        const fkMatch = trimmedDef.match(
          /(?:CONSTRAINT\s+([A-Za-z0-9_."`\[\]]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z0-9_."`\[\]]+)\s*\(([^)]+)\)/i
        );
        if (fkMatch) {
          const fkObj: ParsedForeignKey = {
            constraintName: fkMatch[1] ? cleanIdentifier(fkMatch[1]) : undefined,
            sourceTable: tableName,
            sourceColumns: fkMatch[2].split(',').map(c => cleanIdentifier(c)),
            targetTable: cleanIdentifier(fkMatch[3]),
            targetColumns: fkMatch[4].split(',').map(c => cleanIdentifier(c)),
          };
          parsedNew.foreignKeys.push(fkObj);
          newForeignKeys.push(fkObj);
          continue;
        }
        const colRes = parseColumnDef(trimmedDef, tableName);
        if (colRes?.column) {
          if (colRes.column.isPk) parsedNew.primaryKeys.push(colRes.column.name);
          if (colRes.inlineFk) {
            parsedNew.foreignKeys.push(colRes.inlineFk);
            newForeignKeys.push(colRes.inlineFk);
          }
          parsedNew.columns.push(colRes.column);
        }
      }
      recalculateTableColumnFlags(parsedNew);

      if (existingEnt) {
        existingEnt.table = parsedNew;
        existingEnt.changes.push(`Replaced definition (${parsedNew.columns.length} cols)`);
      } else {
        const newNodeId = `erd_${key}_${Math.random().toString(36).substring(2, 7)}`;
        const newEnt: MutableEntity = {
          nodeId: newNodeId,
          table: parsedNew,
          changes: [`Created table (${parsedNew.columns.length} cols)`],
          isNew: true,
          isDropped: false,
        };
        entityMap.set(key, newEnt);
        entityByNodeId.set(newNodeId, newEnt);
      }
      continue;
    }

    // 2. ALTER TABLE
    if (/^ALTER\s+TABLE\b/i.test(trimmed)) {
      processAlterTableStatement(trimmed, {
        getTable: name => entityMap.get(name.toLowerCase())?.table,
        renameTable: (tbl, newName, newSchema) => {
          const oldKey = tbl.name.toLowerCase();
          const ent = entityMap.get(oldKey);
          if (!ent) return;
          entityMap.delete(oldKey);
          tbl.name = newName;
          tbl.id = `tbl_${newName.toLowerCase()}`;
          if (newSchema) tbl.schema = newSchema;
          entityMap.set(newName.toLowerCase(), ent);
        },
        onForeignKeyAdded: fk => newForeignKeys.push(fk),
        onForeignKeyRemoved: (tblName, constraintName, droppedCol) => {
          const ent = entityMap.get(tblName.toLowerCase());
          if (!ent) return;
          const beforeLen = workingEdges.length;
          workingEdges = workingEdges.filter(edge => {
            if (edge.sourceNodeId !== ent.nodeId && edge.targetNodeId !== ent.nodeId) return true;
            if (constraintName && edge.label?.toLowerCase() === constraintName.toLowerCase()) {
              return false;
            }
            if (
              droppedCol &&
              edge.sourceNodeId === ent.nodeId &&
              edge.label?.toLowerCase().startsWith(`${droppedCol.toLowerCase()} ➔`)
            ) {
              return false;
            }
            return true;
          });
          edgeRemovedCount += beforeLen - workingEdges.length;
        },
        onColumnRenamed: (tblName, oldCol, newCol) => {
          const ent = entityMap.get(tblName.toLowerCase());
          if (!ent) return;
          workingEdges = workingEdges.map(edge => {
            if (
              edge.sourceNodeId === ent.nodeId &&
              edge.label?.toLowerCase().startsWith(`${oldCol.toLowerCase()} ➔`)
            ) {
              return { ...edge, label: edge.label.replace(new RegExp(`^${oldCol}`, 'i'), newCol) };
            }
            return edge;
          });
        },
        onChange: (tblName, description) => {
          const ent = entityMap.get(tblName.toLowerCase());
          if (ent) ent.changes.push(description);
        },
        onWarning: msg => warnings.push(msg),
      });
      continue;
    }

    // 3. DROP TABLE [IF EXISTS]
    const dropTableMatch = trimmed.match(
      /^DROP\s+TABLE(\s+IF\s+EXISTS)?\s+([A-Za-z0-9_."`\[\]]+)(?:\s+(?:CASCADE|RESTRICT))?$/i
    );
    if (dropTableMatch) {
      const ifExists = !!dropTableMatch[1];
      const tblName = cleanIdentifier(dropTableMatch[2]);
      const ent = entityMap.get(tblName.toLowerCase());
      if (!ent) {
        if (!ifExists) warnings.push(`Table "${tblName}" not found for DROP TABLE.`);
        continue;
      }
      ent.isDropped = true;
      ent.changes.push('Dropped table');
      const beforeLen = workingEdges.length;
      workingEdges = workingEdges.filter(
        e => e.sourceNodeId !== ent.nodeId && e.targetNodeId !== ent.nodeId
      );
      edgeRemovedCount += beforeLen - workingEdges.length;
      continue;
    }

    // 4. COMMENT ON TABLE / COLUMN
    const commentTableMatch = trimmed.match(
      /^COMMENT\s+ON\s+TABLE\s+([A-Za-z0-9_."`\[\]]+)\s+IS\s+'([^']*)'$/i
    );
    if (commentTableMatch) {
      const tblName = cleanIdentifier(commentTableMatch[1]);
      const ent = entityMap.get(tblName.toLowerCase());
      if (!ent) {
        warnings.push(`Table "${tblName}" not found for COMMENT ON TABLE.`);
        continue;
      }
      ent.table.comment = commentTableMatch[2];
      ent.changes.push('Updated table comment');
      continue;
    }

    const commentColMatch = trimmed.match(
      /^COMMENT\s+ON\s+COLUMN\s+([A-Za-z0-9_."`\[\]]+)\s+IS\s+'([^']*)'$/i
    );
    if (commentColMatch) {
      const parts = commentColMatch[1].split('.');
      if (parts.length >= 2) {
        const colName = cleanIdentifier(parts[parts.length - 1]);
        const tblName = cleanIdentifier(parts[parts.length - 2]);
        const ent = entityMap.get(tblName.toLowerCase());
        const col = ent?.table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
        if (col && ent) {
          col.comment = commentColMatch[2];
          ent.changes.push(`Updated comment on ${col.name}`);
        } else {
          warnings.push(`Column "${tblName}.${colName}" not found for COMMENT ON COLUMN.`);
        }
      }
      continue;
    }
  }

  // Finalize all entity tables and rebuild nodes list
  const droppedNodeIds = new Set<string>();
  const allEntities = Array.from(entityByNodeId.values());
  for (const ent of allEntities) {
    if (ent.isDropped) {
      droppedNodeIds.add(ent.nodeId);
    } else {
      recalculateTableColumnFlags(ent.table);
    }
  }

  // Preserve non-ERD nodes and update existing ERD nodes in place
  const updatedNodes: DiagramNode[] = [];
  const tablePositions = new Map<
    string,
    { x: number; y: number; width: number; height: number; nodeId: string }
  >();

  let maxBottomY = 0;
  for (const node of existingNodes) {
    if (node.y + node.height > maxBottomY) maxBottomY = node.y + node.height;
    if (node.type !== 'erd-entity') {
      updatedNodes.push(node);
      continue;
    }
    const ent = entityByNodeId.get(node.id);
    if (!ent || ent.isDropped) continue;

    const changed = ent.changes.length > 0;
    const fieldsCount = Math.max(1, ent.table.columns.length);
    const computedHeight = changed ? Math.max(85, 44 + fieldsCount * 25 + 16) : node.height;

    const updatedNode: DiagramNode = changed
      ? {
          ...node,
          label: ent.table.name,
          height: computedHeight,
          data: {
            ...node.data,
            tableName: ent.table.name,
            schema: ent.table.schema ?? node.data?.schema,
            fields: ent.table.columns.map(c => ({
              id: c.id,
              name: c.name,
              type: c.type,
              isPk: c.isPk,
              isFk: c.isFk,
              isUnique: c.isUnique,
              isNullable: c.isNullable,
              defaultValue: c.defaultValue,
              comment: c.comment,
            })),
            comment: ent.table.comment ?? node.data?.comment,
          },
          documentation: ent.table.comment
            ? {
                ...(node.documentation || { tags: ['ERD'], status: 'approved' as const }),
                description: ent.table.comment,
              }
            : node.documentation,
        }
      : node;

    updatedNodes.push(updatedNode);
    tablePositions.set(ent.table.name.toLowerCase(), {
      x: updatedNode.x,
      y: updatedNode.y,
      width: updatedNode.width,
      height: updatedNode.height,
      nodeId: updatedNode.id,
    });
  }

  // Layout any newly created tables below existing nodes
  const newEntities = allEntities.filter(e => e.isNew && !e.isDropped);
  if (newEntities.length > 0) {
    const newTables = newEntities.map(e => e.table);
    const { nodes: laidOutNew, tablePositions: newPosMap } = layoutErdTables(newTables);
    const offsetY = maxBottomY > 0 ? maxBottomY : 0;

    laidOutNew.forEach((n, idx) => {
      const ent = newEntities[idx];
      const finalNode: DiagramNode = {
        ...n,
        id: ent.nodeId,
        y: n.y + offsetY,
      };
      updatedNodes.push(finalNode);
      const pos = newPosMap.get(ent.table.name.toLowerCase());
      if (pos) {
        tablePositions.set(ent.table.name.toLowerCase(), {
          ...pos,
          y: pos.y + offsetY,
          nodeId: ent.nodeId,
        });
      }
    });
  }

  // Create edges for newly added FKs
  const rawNewEdges = createErdEdges(newForeignKeys, tablePositions, new Map());
  let edgeAddedCount = 0;
  for (const ne of rawNewEdges) {
    const duplicate = workingEdges.some(
      existing =>
        existing.sourceNodeId === ne.sourceNodeId &&
        existing.targetNodeId === ne.targetNodeId &&
        (existing.label || '').toLowerCase() === (ne.label || '').toLowerCase()
    );
    if (!duplicate) {
      workingEdges.push(ne);
      edgeAddedCount++;
    }
  }

  const entitySummaries: EntityChangeSummary[] = allEntities
    .filter(e => e.changes.length > 0)
    .map(e => ({
      tableName: e.table.name,
      nodeId: e.nodeId,
      status: e.isDropped ? 'dropped' : e.isNew ? 'created' : 'modified',
      changes: e.changes,
      table: e.table,
    }));

  const modifiedCount = entitySummaries.filter(s => s.status === 'modified').length;
  const createdCount = entitySummaries.filter(s => s.status === 'created').length;
  const droppedCount = entitySummaries.filter(s => s.status === 'dropped').length;
  const totalChangeCount = entitySummaries.reduce((acc, s) => acc + s.changes.length, 0);

  return {
    nodes: updatedNodes,
    edges: workingEdges,
    entitySummaries,
    warnings,
    stats: {
      modifiedCount,
      createdCount,
      droppedCount,
      edgeAddedCount,
      edgeRemovedCount,
      statementCount: statements.length,
      totalChangeCount,
    },
  };
}

/**
 * Inspects SQL text to help UI pick the best default import mode.
 */
export function detectSqlIntent(sqlText: string): {
  hasCreateTable: boolean;
  hasAlterOrMutate: boolean;
} {
  const cleaned = stripComments(sqlText);
  return {
    hasCreateTable: /\bCREATE\s+TABLE\b/i.test(cleaned),
    hasAlterOrMutate: /\b(?:ALTER\s+TABLE|DROP\s+TABLE|COMMENT\s+ON)\b/i.test(cleaned),
  };
}

/**
 * Builds a tailored sample ALTER TABLE script for the current canvas entities.
 */
export function buildSampleAlterSql(existingNodes: DiagramNode[]): string {
  const erdNodes = existingNodes.filter(n => n.type === 'erd-entity');
  const firstNode = erdNodes[0];
  const tableName = cleanIdentifier((firstNode?.data?.tableName || firstNode?.label || 'customers').trim()) || 'customers';
  const secondNode = erdNodes[1];
  const secondName = secondNode
    ? cleanIdentifier((secondNode.data?.tableName || secondNode.label || '').trim())
    : '';
  const fields: any[] = Array.isArray(firstNode?.data?.fields) ? firstNode.data.fields : [];
  const sampleCol = fields.find(f => !f.isPk) || fields[0];
  const colName = sampleCol?.name || 'email';

  const lines: string[] = [
    `-- Sample ALTER TABLE migration for existing "${tableName}" entity`,
    `ALTER TABLE ${tableName}`,
    `    ADD COLUMN loyalty_tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',`,
    `    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE,`,
    `    ALTER COLUMN ${colName} TYPE VARCHAR(255);`,
    ``,
    `COMMENT ON TABLE ${tableName} IS 'Updated via ALTER TABLE migration';`,
  ];

  if (secondName && secondName.toLowerCase() !== tableName.toLowerCase()) {
    const secondPk = (secondNode.data?.fields || []).find((f: any) => f.isPk)?.name || `${secondName}_id`;
    lines.push(
      ``,
      `-- Link "${tableName}" to "${secondName}" with a new Foreign Key`,
      `ALTER TABLE ${tableName}`,
      `    ADD COLUMN ${secondName}_id INTEGER,`,
      `    ADD CONSTRAINT fk_${tableName}_${secondName} FOREIGN KEY (${secondName}_id) REFERENCES ${secondName} (${secondPk});`
    );
  }

  return lines.join('\n');
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
