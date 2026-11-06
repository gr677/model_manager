/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramNode, DiagramType, AppTheme, getNodeChildDiagrams } from '../../types/diagram';
import { DIAGRAM_TYPES_CATALOG } from '../../data/diagramTypesCatalog';
import { THEMES } from '../../utils/themeConfig';
import { workspaceService } from '../../services/workspaceService';
import {
  FileCode,
  FolderOpen,
  Plus,
  X,
  ExternalLink,
  FolderTree,
  Layers,
  Sparkles,
  Check,
  ArrowRight,
} from 'lucide-react';

interface CreateChildDiagramModalProps {
  isOpen: boolean;
  parentNode: DiagramNode | null;
  parentDiagramType: DiagramType;
  theme?: AppTheme;
  onClose: () => void;
  onNavigateToChildDiagram: (filename: string) => void;
  onLinkChildDiagram: (nodeId: string, filename: string, title: string, diagramType: DiagramType) => void;
  onCreateAndNavigateChildDiagram?: (nodeId: string, filename: string, title: string, diagramType: DiagramType) => void | Promise<void>;
}

export const CreateChildDiagramModal: React.FC<CreateChildDiagramModalProps> = ({
  isOpen,
  parentNode,
  parentDiagramType,
  theme = 'dark',
  onClose,
  onNavigateToChildDiagram,
  onLinkChildDiagram,
  onCreateAndNavigateChildDiagram,
}) => {
  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('');
  const [selectedType, setSelectedType] = useState<DiagramType>('mindmap');
  const [selectedExistingFile, setSelectedExistingFile] = useState<string>('');

  const existingChildren = parentNode ? getNodeChildDiagrams(parentNode) : [];

  // Prepopulate title and filename when modal opens or parentNode changes
  React.useEffect(() => {
    if (parentNode) {
      const sanitizedName = parentNode.label.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 20);
      const currentChildren = getNodeChildDiagrams(parentNode);
      const suffix = currentChildren.length > 0 ? `_${currentChildren.length + 1}` : '';
      const defaultFilename = `child_${sanitizedName || 'sub'}${suffix}.json`;
      setTitle(`${parentNode.label} ${currentChildren.length > 0 ? `Sub-Diagram ${currentChildren.length + 1}` : 'Breakdown'}`);
      setFilename(defaultFilename);
      // Pick a distinct default child type if possible (e.g. if parent is erd, default to flowchart or mindmap)
      if (parentDiagramType === 'erd') {
        setSelectedType('mindmap');
      } else if (parentDiagramType === 'mindmap') {
        setSelectedType('flowchart');
      } else {
        setSelectedType('bpmn');
      }
    }
  }, [parentNode, parentDiagramType, isOpen]);

  if (!isOpen || !parentNode) return null;

  const activeWs = workspaceService.getActiveWorkspace();
  const existingDiagrams = Object.values(activeWs.diagrams);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !filename.trim()) return;

    let safeFilename = filename.trim().toLowerCase();
    if (!safeFilename.endsWith('.json')) safeFilename += '.json';
    safeFilename = safeFilename.replace(/[^a-z0-9._-]/g, '_');

    if (onCreateAndNavigateChildDiagram) {
      await onCreateAndNavigateChildDiagram(parentNode.id, safeFilename, title.trim(), selectedType);
      onClose();
      return;
    }

    // Fallback if not provided:
    workspaceService.createDiagram(safeFilename, title.trim(), undefined, selectedType, true);
    onLinkChildDiagram(parentNode.id, safeFilename, title.trim(), selectedType);
    onNavigateToChildDiagram(safeFilename);
    onClose();
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingFile) return;

    const existingDiag = activeWs.diagrams[selectedExistingFile];
    const diagTitle = existingDiag?.name || selectedExistingFile.replace('.json', '');
    const firstPageType = existingDiag?.document?.pages?.[0]?.diagramType || 'generic';

    onLinkChildDiagram(parentNode.id, selectedExistingFile, diagTitle, firstPageType);
    onNavigateToChildDiagram(selectedExistingFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-sm font-bold uppercase tracking-wide ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Child Diagram for &ldquo;{parentNode.label}&rdquo;
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Per-Node Sub-Diagram
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Each child diagram has its own JSON file and can be any diagram type.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Attached Children (if any) */}
        {existingChildren.length > 0 && (
          <div
            className={`px-6 py-2.5 border-b text-xs ${
              isDark ? 'bg-purple-950/20 border-slate-800' : 'bg-purple-50/60 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-mono font-bold text-purple-400 flex items-center gap-1">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Attached Child Diagrams ({existingChildren.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 italic">Click to jump into child diagram</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {existingChildren.map((child, idx) => (
                <button
                  key={child.id || child.filename || idx}
                  type="button"
                  onClick={() => {
                    onNavigateToChildDiagram(child.filename);
                    onClose();
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-left cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-slate-900 border-purple-500/30 hover:bg-purple-900/40 text-purple-200'
                      : 'bg-white border-purple-200 hover:bg-purple-100 text-purple-900 shadow-xs'
                  }`}
                  title={`Open ${child.title || child.filename}`}
                >
                  <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="font-semibold text-[11px] truncate max-w-[140px]">
                    {child.title || child.filename}
                  </span>
                  {child.diagramType && (
                    <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      {child.diagramType}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab switch: Create New vs Link Existing */}
        <div
          className={`flex border-b text-xs font-semibold ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/60'
          }`}
        >
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2.5 text-center cursor-pointer transition-colors border-b-2 flex items-center justify-center gap-2 ${
              mode === 'create'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Diagram JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 py-2.5 text-center cursor-pointer transition-colors border-b-2 flex items-center justify-center gap-2 ${
              mode === 'link'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Link Existing Diagram ({existingDiagrams.length})</span>
          </button>
        </div>

        {/* Body Form */}
        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
            {/* Title */}
            <div>
              <label
                className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Child Diagram Name / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Order Processing Flow"
                className={`w-full rounded-lg p-2.5 text-xs focus:outline-none border transition-colors ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-purple-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Separate JSON Filename */}
            <div>
              <label
                className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Dedicated JSON Storage Filename
              </label>
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="diagram_sub.json"
                  className={`w-full bg-transparent text-xs font-mono focus:outline-none ${
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}
                />
              </div>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Stored in workspace as <code className="font-mono text-purple-400">{activeWs.name}/{filename || 'sub.json'}</code>
              </p>
            </div>

            {/* Diagram Type Grid */}
            <div>
              <label
                className={`text-[10px] uppercase font-mono block mb-1.5 font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Child Diagram Type (Can differ from parent &quot;{parentDiagramType.toUpperCase()}&quot;)
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {DIAGRAM_TYPES_CATALOG.map(t => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id as DiagramType)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/50'
                          : isDark
                          ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[11px] truncate">{t.name}</div>
                      <div className="text-[9px] opacity-70 font-mono uppercase truncate">{t.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-purple-600/30"
              >
                <span>Create &amp; Navigate to Child Diagram</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkExisting} className="p-6 space-y-4 text-xs">
            <div>
              <label
                className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Select an Existing Workspace Diagram JSON
              </label>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {existingDiagrams.map(diag => {
                  const isSelected = selectedExistingFile === diag.filename;
                  const docPages = diag.document?.pages || [];
                  const diagType = docPages[0]?.diagramType || 'flowchart';
                  return (
                    <button
                      key={diag.filename}
                      type="button"
                      onClick={() => setSelectedExistingFile(diag.filename)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/50'
                          : isDark
                          ? 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">{diag.name}</div>
                          <div className="text-[10px] font-mono opacity-70">
                            {diag.filename} • {diagType.toUpperCase()} • {docPages.length} page(s)
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedExistingFile}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-purple-600/30"
              >
                <span>Link &amp; Navigate to Child Diagram</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
