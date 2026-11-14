/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Link2,
  FolderTree,
  RotateCcw,
  FileText,
  Sparkles,
  ExternalLink,
  Hash,
} from 'lucide-react';
import { AppTheme, DiagramDocument, DiagramEdge, DiagramNode, DiagramType } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import {
  convertLegacyJsonToPageEntities,
  formatLegacyTargetTitle,
  inspectLegacyDiagramJson,
  LegacyTargetPageRef,
} from '../../utils/legacyJsonImporter';

export type LegacyImportMode = 'new_page' | 'replace' | 'append' | 'new_diagram';

export interface LegacyImportPayload {
  mode: LegacyImportMode;
  diagramType: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  targetPages: LegacyTargetPageRef[];
  createMissingChildDiagrams: boolean;
  newPageTitle?: string;
  newDiagramFilename?: string;
  modernDocument?: DiagramDocument;
}

interface ImportLegacyJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageName?: string;
  currentPageNodeCount?: number;
  activeDiagramFilename?: string;
  theme?: AppTheme;
  onImportLegacyPage: (payload: LegacyImportPayload) => void;
}

export const ImportLegacyJsonModal: React.FC<ImportLegacyJsonModalProps> = ({
  isOpen,
  onClose,
  currentPageName = 'Current Page',
  currentPageNodeCount = 0,
  activeDiagramFilename = 'root.json',
  theme = 'dark',
  onImportLegacyPage,
}) => {
  const [jsonContent, setJsonContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<LegacyImportMode>(
    currentPageNodeCount === 0 ? 'replace' : 'new_page'
  );
  const [diagramType, setDiagramType] = useState<DiagramType>('mindmap');
  const [newPageTitle, setNewPageTitle] = useState('Imported Legacy Page');
  const [newDiagramFilename, setNewDiagramFilename] = useState('imported_page.json');
  const [createMissingChildDiagrams, setCreateMissingChildDiagrams] = useState(true);
  const [includeArrows, setIncludeArrows] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !jsonContent.trim()) {
      setImportMode(currentPageNodeCount === 0 ? 'replace' : 'new_page');
    }
  }, [isOpen, currentPageNodeCount, jsonContent]);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const inspection = useMemo(() => {
    if (!jsonContent.trim()) return null;
    return inspectLegacyDiagramJson(jsonContent);
  }, [jsonContent]);

  const loadJsonText = (text: string, fileName?: string) => {
    setJsonContent(text);
    if (fileName) {
      setUploadedFileName(fileName);
      const cleanTitle = formatLegacyTargetTitle(fileName) || 'Imported Page';
      setNewPageTitle(cleanTitle);
      const safeFile = fileName.toLowerCase().endsWith('.json') ? fileName : `${fileName}.json`;
      setNewDiagramFilename(safeFile.replace(/[^a-z0-9._-]/gi, '_').toLowerCase());
    }
    const check = inspectLegacyDiagramJson(text);
    if (check.isValid) {
      if (check.rawLegacyData?.title) {
        setNewPageTitle(check.rawLegacyData.title);
      }
      setActiveTab('preview');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (typeof text === 'string') {
        loadJsonText(text, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (typeof text === 'string') {
        loadJsonText(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setJsonContent('');
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTab('upload');
  };

  const handleConfirmImport = () => {
    if (!inspection || !inspection.isValid) return;

    if (inspection.format === 'modern' && inspection.modernDocument) {
      const firstPage = inspection.modernDocument.pages[0];
      onImportLegacyPage({
        mode: importMode,
        diagramType: firstPage?.diagramType || diagramType,
        nodes: firstPage?.nodes || [],
        edges: firstPage?.edges || [],
        targetPages: [],
        createMissingChildDiagrams: false,
        newPageTitle: newPageTitle.trim() || firstPage?.title || 'Imported Page',
        newDiagramFilename: newDiagramFilename.trim() || uploadedFileName || 'imported_page.json',
        modernDocument: inspection.modernDocument,
      });
      onClose();
      return;
    }

    if (!inspection.rawLegacyData) return;

    const idPrefix = importMode === 'append' ? `imp_${Date.now()}_` : '';
    const converted = convertLegacyJsonToPageEntities(
      inspection.rawLegacyData.nodes,
      inspection.rawLegacyData.links,
      {
        diagramType,
        includeArrows,
        linkTargetPagesAsChildDiagrams: true,
        idPrefix,
      }
    );

    onImportLegacyPage({
      mode: importMode,
      diagramType,
      nodes: converted.nodes,
      edges: converted.edges,
      targetPages: converted.targetPages,
      createMissingChildDiagrams,
      newPageTitle: newPageTitle.trim() || 'Imported Legacy Page',
      newDiagramFilename: newDiagramFilename.trim() || uploadedFileName || 'imported_page.json',
    });
    onClose();
  };

  if (!isOpen) return null;

  const canImport = Boolean(inspection && inspection.isValid && inspection.nodeCount > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-purple-950/40'
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Import Earlier Version JSON Page</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  Legacy {'{ nodes, links }'} → Modern
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Convert legacy diagram JSON files (shapes, colors, notes, @tags, URLs, links &amp; targetPage links) into an equivalent page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className={`px-6 py-2 border-b flex items-center justify-between gap-3 text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload or Paste JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Converted Preview</span>
              {inspection?.isValid && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                  {inspection.nodeCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {jsonContent && (
              <button
                type="button"
                onClick={handleClear}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors flex items-center gap-1 ${
                  isDark
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-rose-400'
                    : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
                title="Clear JSON"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {/* Drag & Drop File Upload */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
                    : uploadedFileName
                    ? isDark
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-emerald-400 bg-emerald-50/50'
                    : isDark
                    ? 'border-slate-700 hover:border-purple-500/50 bg-slate-950/40 hover:bg-slate-950/70'
                    : 'border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  {uploadedFileName ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Loaded file: {uploadedFileName}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold">
                        Click to choose or drag &amp; drop a legacy .json page file
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Supports earlier-version exports with {'"nodes"'} and {'"links"'} arrays (e.g. root.json, child pages)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Paste JSON Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Legacy Page JSON</span>
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {jsonContent ? `${jsonContent.length.toLocaleString()} chars` : 'Paste JSON object here'}
                  </span>
                </div>
                <textarea
                  value={jsonContent}
                  onChange={e => setJsonContent(e.target.value)}
                  placeholder={'{\n  "nodes": [\n    { "id": "Family", "label": "Family", "shape": "bar", "color": "#35edd8", "x": 355, "y": 174 }\n  ],\n  "links": [\n    { "source": "Gordon", "target": "Family" }\n  ]\n}'}
                  rows={10}
                  className={`w-full p-3 font-mono text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {inspection && !inspection.isValid && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inspection.error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!inspection || !inspection.isValid ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold">
                    {inspection?.error || 'No valid legacy JSON loaded yet'}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upload or paste a JSON file in the Upload tab to preview the converted nodes and links.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[11px] text-purple-400 font-medium mb-0.5">Nodes</div>
                      <div className="text-xl font-bold font-mono">{inspection.nodeCount}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[11px] text-sky-400 font-medium mb-0.5 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        <span>Links</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{inspection.linkCount}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[11px] text-indigo-400 font-medium mb-0.5 flex items-center gap-1">
                        <FolderTree className="w-3 h-3" />
                        <span>Child Pages</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{inspection.targetPages.length}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[11px] text-emerald-400 font-medium mb-0.5 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>URLs</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{inspection.urlCount}</div>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[11px] text-amber-400 font-medium mb-0.5 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        <span>@Tags</span>
                      </div>
                      <div className="text-xl font-bold font-mono">{inspection.aggregationTagCount}</div>
                    </div>
                  </div>

                  {/* Discovered Nodes Preview */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase font-mono tracking-wider text-slate-400">
                      Nodes to Import ({inspection.previewNodes.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {inspection.previewNodes.map(node => (
                        <div
                          key={node.id}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-white/30"
                            style={{ backgroundColor: node.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs truncate">{node.label}</div>
                            <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] font-mono">
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
                                {node.shape}
                              </span>
                              {node.targetPage && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 truncate max-w-[120px]">
                                  → {node.targetPage}
                                </span>
                              )}
                              {node.urlCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                  {node.urlCount} link
                                </span>
                              )}
                              {node.hasNotes && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                  notes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Target Page Child Links Option */}
                  {inspection.targetPages.length > 0 && (
                    <div
                      className={`p-3 rounded-xl border space-y-2 ${
                        isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
                      }`}
                    >
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={createMissingChildDiagrams}
                          onChange={e => setCreateMissingChildDiagrams(e.target.checked)}
                          className="mt-0.5 accent-purple-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-semibold">
                            Create placeholder child diagram files for linked targetPage entries ({inspection.targetPages.length})
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Links each node&apos;s <code className="font-mono">targetPage</code> as a clickable child diagram badge and creates empty files (if they don&apos;t exist yet):{' '}
                            <span className="font-mono text-purple-300">
                              {inspection.targetPages.map(tp => tp.filename).join(', ')}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Placement & Style Configuration */}
          {canImport && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Destination &amp; Diagram Format</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Page Type:</span>
                    <select
                      value={diagramType}
                      onChange={e => {
                        const next = e.target.value as DiagramType;
                        setDiagramType(next);
                        setIncludeArrows(next !== 'mindmap');
                      }}
                      className={`px-2 py-1 rounded-lg border text-xs font-medium focus:outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="mindmap">Mind Map (Curved Connectors)</option>
                      <option value="generic">Universal Freeform</option>
                      <option value="flowchart">Flowchart (Orthogonal)</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeArrows}
                      onChange={e => setIncludeArrows(e.target.checked)}
                      className="accent-purple-500 cursor-pointer"
                    />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Show link arrows</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                    importMode === 'new_page'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="legacyImportMode"
                    value="new_page"
                    checked={importMode === 'new_page'}
                    onChange={() => setImportMode('new_page')}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div>
                    <div className="font-semibold">Create New Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Add as a new page in {activeDiagramFilename}.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="legacyImportMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div>
                    <div className="font-semibold">Replace Current Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Populate &quot;{currentPageName}&quot; with imported nodes.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                    importMode === 'append'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="legacyImportMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div>
                    <div className="font-semibold">Append to Page</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Merge onto &quot;{currentPageName}&quot; without clearing.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                    importMode === 'new_diagram'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/40'
                      : isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="legacyImportMode"
                    value="new_diagram"
                    checked={importMode === 'new_diagram'}
                    onChange={() => setImportMode('new_diagram')}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div>
                    <div className="font-semibold">New Diagram File</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Save as its own .json file in workspace.
                    </div>
                  </div>
                </label>
              </div>

              {importMode === 'new_page' && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0 font-medium">New Page Title:</span>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={e => setNewPageTitle(e.target.value)}
                    placeholder="e.g. Family Overview"
                    className={`flex-1 px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              )}

              {importMode === 'new_diagram' && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0 font-medium">Diagram Filename (.json):</span>
                  <input
                    type="text"
                    value={newDiagramFilename}
                    onChange={e => setNewDiagramFilename(e.target.value)}
                    placeholder="e.g. louise_details.json"
                    className={`flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-500 ${
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
            {canImport && inspection ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to import {inspection.nodeCount} nodes and {inspection.linkCount} links
              </span>
            ) : (
              <span>Upload or paste an earlier-version JSON file to begin</span>
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
              disabled={!canImport}
              onClick={handleConfirmImport}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                !canImport
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 cursor-pointer'
              }`}
            >
              <span>
                {importMode === 'new_page'
                  ? 'Create Equivalent Page'
                  : importMode === 'new_diagram'
                  ? 'Create Diagram File'
                  : importMode === 'append'
                  ? 'Append to Page'
                  : 'Import onto Page'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
