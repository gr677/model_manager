/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Database,
  Upload,
  FileCode,
  Table,
  Key,
  Link2,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Layers,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { AppTheme, DiagramEdge, DiagramNode } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import {
  applySqlChangesToErd,
  ApplySqlChangesResult,
  buildSampleAlterSql,
  detectSqlIntent,
  parseErwinPostgresSql,
  ParseSqlResult,
  SAMPLE_ERWIN_POSTGRES_SQL,
} from '../../utils/erdSqlParser';

export type ImportErdMode = 'replace' | 'append' | 'new_page' | 'update';

interface ImportSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageName?: string;
  existingNodes?: DiagramNode[];
  existingEdges?: DiagramEdge[];
  theme?: AppTheme;
  onImportErd: (
    nodes: DiagramNode[],
    edges: DiagramEdge[],
    mode: ImportErdMode,
    newPageTitle?: string
  ) => void;
}

export const ImportSqlModal: React.FC<ImportSqlModalProps> = ({
  isOpen,
  onClose,
  currentPageName = 'Current ERD Page',
  existingNodes = [],
  existingEdges = [],
  theme = 'dark',
  onImportErd,
}) => {
  const [sqlContent, setSqlContent] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportErdMode>('replace');
  const [hasManuallyPickedMode, setHasManuallyPickedMode] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState<string>('PostgreSQL ERD');
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const existingErdCount = useMemo(
    () => existingNodes.filter(n => n.type === 'erd-entity').length,
    [existingNodes]
  );

  // Reset manual mode flag whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setHasManuallyPickedMode(false);
    }
  }, [isOpen]);

  // Auto-select 'update' when SQL contains ALTER/DROP/COMMENT without CREATE TABLE and canvas has entities
  useEffect(() => {
    if (!sqlContent.trim() || hasManuallyPickedMode) return;
    const intent = detectSqlIntent(sqlContent);
    if (existingErdCount > 0 && intent.hasAlterOrMutate && !intent.hasCreateTable) {
      setImportMode('update');
    } else if (intent.hasCreateTable && importMode === 'update' && !intent.hasAlterOrMutate) {
      setImportMode(existingErdCount > 0 ? 'append' : 'replace');
    }
  }, [sqlContent, existingErdCount, hasManuallyPickedMode, importMode]);

  // Real-time parsed result (full schema mode)
  const parseResult: ParseSqlResult | null = useMemo(() => {
    if (!sqlContent.trim()) return null;
    try {
      return parseErwinPostgresSql(sqlContent);
    } catch (err) {
      console.error('SQL Parsing error:', err);
      return null;
    }
  }, [sqlContent]);

  // Real-time incremental diff result (Update Existing Entities / ALTER TABLE mode)
  const alterResult: ApplySqlChangesResult | null = useMemo(() => {
    if (!sqlContent.trim() || existingErdCount === 0) return null;
    try {
      return applySqlChangesToErd(sqlContent, existingNodes, existingEdges);
    } catch (err) {
      console.error('SQL ALTER Parsing error:', err);
      return null;
    }
  }, [sqlContent, existingNodes, existingEdges, existingErdCount]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setSqlContent(text);
        // Default new page title based on filename
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewPageTitle(`${baseName.toUpperCase()} (ERD)`);
        setActiveTab('preview');
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = event => {
        const text = event.target?.result as string;
        if (text) {
          setSqlContent(text);
          const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setNewPageTitle(`${baseName.toUpperCase()} (ERD)`);
          setActiveTab('preview');
        }
      };
      reader.readAsText(file);
    }
  };

  // Load sample ERwin PostgreSQL DDL
  const handleLoadSample = () => {
    setSqlContent(SAMPLE_ERWIN_POSTGRES_SQL);
    setUploadedFileName('erwin_ecommerce_postgres.sql');
    setNewPageTitle('E-Commerce ERD');
    setHasManuallyPickedMode(false);
    setImportMode('replace');
    setActiveTab('preview');
  };

  // Load sample ALTER TABLE script tailored to current canvas entities
  const handleLoadSampleAlter = () => {
    setSqlContent(buildSampleAlterSql(existingNodes));
    setUploadedFileName('alter_entities_migration.sql');
    setHasManuallyPickedMode(false);
    setImportMode('update');
    setActiveTab('preview');
  };

  // Clear content
  const handleClear = () => {
    setSqlContent('');
    setUploadedFileName(null);
    setHasManuallyPickedMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTab('editor');
  };

  const canApplyUpdate =
    importMode === 'update' &&
    !!alterResult &&
    (alterResult.stats.totalChangeCount > 0 ||
      alterResult.stats.edgeAddedCount > 0 ||
      alterResult.stats.edgeRemovedCount > 0);

  const canImportSchema =
    importMode !== 'update' && !!parseResult && parseResult.nodes.length > 0;

  const isReady = canApplyUpdate || canImportSchema;

  // Execute import or update
  const handleConfirmImport = () => {
    if (importMode === 'update') {
      if (!canApplyUpdate || !alterResult) return;
      onImportErd(alterResult.nodes, alterResult.edges, 'update');
      onClose();
      return;
    }
    if (!parseResult || parseResult.nodes.length === 0) return;
    onImportErd(
      parseResult.nodes,
      parseResult.edges,
      importMode,
      importMode === 'new_page' ? newPageTitle.trim() || 'PostgreSQL ERD' : undefined
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-sky-950/40'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Import SQL to ERD</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                  CA ERwin • PostgreSQL
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload or paste ERwin DDL export to populate tables, keys, and foreign key relationships.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation & quick action buttons */}
        <div
          className={`px-6 py-2 border-b flex items-center justify-between gap-3 text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SQL Editor &amp; Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Parsed Preview</span>
              {importMode === 'update' && alterResult ? (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  {alterResult.entitySummaries.length}
                </span>
              ) : parseResult ? (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                  {parseResult.stats.tableCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {existingErdCount > 0 && (
              <button
                type="button"
                onClick={handleLoadSampleAlter}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                }`}
                title="Load example ALTER TABLE statements targeting your current entities"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sample ALTER</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadSample}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-sky-300'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-sky-700'
              }`}
              title="Load example ERwin PostgreSQL DDL with 6 related tables"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample ERwin DDL</span>
            </button>
            {sqlContent && (
              <button
                type="button"
                onClick={handleClear}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-rose-400' : 'hover:bg-slate-200 text-slate-500'
                }`}
                title="Clear SQL"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              {/* Drag & Drop File Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-sky-500 bg-sky-500/10 scale-[0.99]'
                    : uploadedFileName
                    ? isDark
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-emerald-400 bg-emerald-50/50'
                    : isDark
                    ? 'border-slate-700 hover:border-sky-500/50 bg-slate-950/40 hover:bg-slate-950/70'
                    : 'border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql,.ddl,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    {uploadedFileName ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Loaded file: {uploadedFileName}</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-semibold">
                          Click to upload or drag &amp; drop your ERwin PostgreSQL SQL file
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Supports .sql, .ddl, or .txt generated by CA ERwin Data Modeler
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Area for Direct Paste */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Raw SQL DDL Script</span>
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {sqlContent ? `${sqlContent.length} chars` : 'Paste CREATE TABLE / ALTER TABLE'}
                  </span>
                </div>
                <textarea
                  value={sqlContent}
                  onChange={e => setSqlContent(e.target.value)}
                  placeholder="-- Paste CREATE TABLE or ALTER TABLE SQL DDL here...
CREATE TABLE customer (
    customer_id INTEGER NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    email VARCHAR(100)
);

-- Or update existing entities on the current ERD page:
ALTER TABLE customer
    ADD COLUMN loyalty_tier VARCHAR(20) DEFAULT 'SILVER',
    ALTER COLUMN email TYPE VARCHAR(255);
"
                  rows={10}
                  className={`w-full p-3 font-mono text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-y ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>
          ) : (
            /* Parsed Preview Tab */
            <div className="space-y-4">
              {importMode === 'update' && alterResult ? (
                alterResult.entitySummaries.length === 0 && alterResult.warnings.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold">No entity changes detected yet</div>
                    <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paste ALTER TABLE, DROP TABLE, CREATE TABLE, or COMMENT ON statements matching entities on &quot;{currentPageName}&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Update Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-1">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Modified</span>
                        </div>
                        <div className="text-xl font-bold font-mono">{alterResult.stats.modifiedCount}</div>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-sky-400 text-xs font-medium mb-1">
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Created</span>
                        </div>
                        <div className="text-xl font-bold font-mono">{alterResult.stats.createdCount}</div>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium mb-1">
                          <Table className="w-3.5 h-3.5" />
                          <span>Dropped</span>
                        </div>
                        <div className="text-xl font-bold font-mono">{alterResult.stats.droppedCount}</div>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium mb-1">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>FK Edges</span>
                        </div>
                        <div className="text-xl font-bold font-mono">
                          +{alterResult.stats.edgeAddedCount} / -{alterResult.stats.edgeRemovedCount}
                        </div>
                      </div>
                    </div>

                    {alterResult.warnings.length > 0 && (
                      <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-amber-950/40 border-amber-700/50 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Warnings ({alterResult.warnings.length})</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-0.5 text-[11px] opacity-90">
                          {alterResult.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Affected Entities List */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400">
                        Affected Entities ({alterResult.entitySummaries.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                        {alterResult.entitySummaries.map(summary => (
                          <div
                            key={summary.nodeId}
                            className={`p-3 rounded-xl border flex flex-col justify-between ${
                              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400 truncate">
                                  <Table className="w-3.5 h-3.5 shrink-0" />
                                  <span>{summary.tableName}</span>
                                </div>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                                    summary.status === 'created'
                                      ? 'bg-sky-500/20 text-sky-300'
                                      : summary.status === 'dropped'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {summary.status}
                                </span>
                              </div>
                              <ul className="space-y-1 text-[11px] font-mono mb-2">
                                {summary.changes.map((chg, idx) => (
                                  <li
                                    key={idx}
                                    className={
                                      chg.startsWith('+')
                                        ? 'text-emerald-400'
                                        : chg.startsWith('-') || chg.startsWith('Drop')
                                        ? 'text-rose-400'
                                        : 'text-amber-300'
                                    }
                                  >
                                    {chg}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {summary.status !== 'dropped' && (
                              <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                                Resulting columns: {summary.table.columns.length}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : !parseResult || parseResult.stats.tableCount === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold">No ERD tables detected yet</div>
                  <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {existingErdCount > 0
                      ? 'Upload an SQL file or paste CREATE TABLE / ALTER TABLE statements. Switch to "Update Existing Entities" to apply ALTER TABLE changes to existing tables.'
                      : 'Upload an SQL file or paste your CREATE TABLE statements in the editor tab to view the live parsed model.'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Load Sample ERwin DDL
                    </button>
                    {existingErdCount > 0 && (
                      <button
                        type="button"
                        onClick={handleLoadSampleAlter}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Load Sample ALTER
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-1.5 text-sky-400 text-xs font-medium mb-1">
                        <Table className="w-3.5 h-3.5" />
                        <span>Tables</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{parseResult.stats.tableCount}</div>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs font-medium mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Columns</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{parseResult.stats.columnCount}</div>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-1">
                        <Key className="w-3.5 h-3.5" />
                        <span>Primary Keys</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{parseResult.stats.pkCount}</div>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium mb-1">
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Foreign Keys</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{parseResult.stats.fkCount}</div>
                    </div>
                  </div>

                  {/* Tables List Preview */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400">
                      Discovered Entity Tables ({parseResult.tables.length})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {parseResult.tables.map(table => (
                        <div
                          key={table.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 mb-2">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400 truncate">
                                <Table className="w-3.5 h-3.5 shrink-0" />
                                <span>{table.name}</span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300">
                                {table.columns.length} cols
                              </span>
                            </div>

                            <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono">
                              {table.columns.map(col => (
                                <div key={col.id} className="flex items-center justify-between py-0.5">
                                  <div className="flex items-center gap-1 truncate">
                                    {col.isPk && (
                                      <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded">
                                        PK
                                      </span>
                                    )}
                                    {col.isFk && (
                                      <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold rounded">
                                        FK
                                      </span>
                                    )}
                                    <span className="truncate">{col.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{col.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {table.foreignKeys.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-purple-300 flex items-center gap-1 truncate">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                References:{' '}
                                {table.foreignKeys
                                  .map(fk => `${fk.targetTable}(${fk.targetColumns.join(',')})`)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Mode Target Options */}
          {sqlContent.trim().length > 0 && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Destination Placement</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {/* Update Existing Entities (ALTER TABLE) */}
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all ${
                    existingErdCount === 0
                      ? 'opacity-45 cursor-not-allowed border-slate-800 bg-slate-900/30'
                      : importMode === 'update'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40 cursor-pointer'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60 cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="update"
                    disabled={existingErdCount === 0}
                    checked={importMode === 'update'}
                    onChange={() => {
                      setHasManuallyPickedMode(true);
                      setImportMode('update');
                    }}
                    className="mt-0.5 text-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-xs">Update Existing Entities</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {existingErdCount > 0
                        ? `Apply ALTER TABLE & DDL edits to ${existingErdCount} existing entities.`
                        : 'Requires existing ERD entities on this page.'}
                    </div>
                  </div>
                </label>

                {/* Replace */}
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => {
                      setHasManuallyPickedMode(true);
                      setImportMode('replace');
                    }}
                    className="mt-0.5 text-sky-500"
                  />
                  <div>
                    <div className="font-semibold text-xs">Replace Current Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Clear existing nodes on &quot;{currentPageName}&quot; and draw the new ERD.
                    </div>
                  </div>
                </label>

                {/* Append */}
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'append'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => {
                      setHasManuallyPickedMode(true);
                      setImportMode('append');
                    }}
                    className="mt-0.5 text-sky-500"
                  />
                  <div>
                    <div className="font-semibold text-xs">Append to Current Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Add new tables alongside current nodes without deleting anything.
                    </div>
                  </div>
                </label>

                {/* New Page */}
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'new_page'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="new_page"
                    checked={importMode === 'new_page'}
                    onChange={() => {
                      setHasManuallyPickedMode(true);
                      setImportMode('new_page');
                    }}
                    className="mt-0.5 text-sky-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs">Create New ERD Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Create a dedicated page in this document for the imported model.
                    </div>
                  </div>
                </label>
              </div>

              {importMode === 'new_page' && (
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0 font-medium">New Page Name:</span>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={e => setNewPageTitle(e.target.value)}
                    placeholder="e.g. PostgreSQL ERD"
                    className={`flex-1 px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-t ${
            isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            {importMode === 'update' && alterResult && canApplyUpdate ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to apply {alterResult.stats.totalChangeCount} change(s) across {alterResult.entitySummaries.length} entities
              </span>
            ) : importMode !== 'update' && parseResult && parseResult.stats.tableCount > 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to generate {parseResult.stats.tableCount} tables and {parseResult.edges.length} relationships
              </span>
            ) : (
              <span>Upload or paste CREATE TABLE / ALTER TABLE SQL to begin</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isReady}
              onClick={handleConfirmImport}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                !isReady
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : importMode === 'update'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
              }`}
            >
              <span>
                {importMode === 'update'
                  ? canApplyUpdate && alterResult
                    ? `Apply Changes (${alterResult.entitySummaries.length} Entities)`
                    : 'Apply ALTER Changes'
                  : parseResult
                  ? `Import ${parseResult.stats.tableCount} Tables to ERD`
                  : 'Import SQL to ERD'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
