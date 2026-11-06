/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  HardDrive,
  Copy,
  Edit2,
  FolderPlus,
  Clock,
} from 'lucide-react';
import { workspaceService, Workspace } from '../../services/workspaceService';
import { DiagramDocument, AppTheme, DiagramType } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDiagram: (doc: DiagramDocument) => void;
  theme?: AppTheme;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onLoadDiagram,
  theme = 'dark',
}) => {
  const [store, setStore] = useState(() => workspaceService.getStore());
  const [activeWs, setActiveWs] = useState<Workspace>(() => workspaceService.getActiveWorkspace());
  const [newWsName, setNewWsName] = useState('');
  const [newDiagramName, setNewDiagramName] = useState('');
  const [newDiagramFilename, setNewDiagramFilename] = useState('');
  const [newWsDiagramType, setNewWsDiagramType] = useState<DiagramType>('bpmn');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [isCreatingDiagram, setIsCreatingDiagram] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [editingBasePath, setEditingBasePath] = useState(false);
  const [customBasePath, setCustomBasePath] = useState(activeWs.basePath);
  const [importError, setImportError] = useState<string | null>(null);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  useEffect(() => {
    const unsub = workspaceService.subscribe(() => {
      setStore({ ...workspaceService.getStore() });
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      workspaceService.fetchServerWorkspaces().then(() => {
        setStore({ ...workspaceService.getStore() });
        setActiveWs({ ...workspaceService.getActiveWorkspace() });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPath = workspaceService.getFullPath();

  const handleCopyPath = () => {
    navigator.clipboard.writeText(currentPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleSwitchWorkspace = (wsId: string) => {
    const switched = workspaceService.setActiveWorkspace(wsId);
    setActiveWs(switched);
    const diag = workspaceService.getActiveDiagram();
    onLoadDiagram(diag.document);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    const ws = await workspaceService.createWorkspace(newWsName.trim(), newWsDiagramType);
    setActiveWs(ws);
    setNewWsName('');
    setIsCreatingWs(false);
    const diag = workspaceService.getActiveDiagram();
    onLoadDiagram(diag.document);
  };

  const handleSwitchDiagram = (filename: string) => {
    const doc = workspaceService.setActiveDiagram(filename);
    onLoadDiagram(doc);
    onClose();
  };

  const handleCreateDiagram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramFilename.trim()) return;
    workspaceService.createDiagram(
      newDiagramFilename.trim(),
      newDiagramName.trim() || newDiagramFilename.trim()
    );
    const diag = workspaceService.getActiveDiagram();
    onLoadDiagram(diag.document);
    setNewDiagramFilename('');
    setNewDiagramName('');
    setIsCreatingDiagram(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        if (file.name.includes('workspace_bundle')) {
          const imported = workspaceService.importWorkspaceBundle(content);
          setActiveWs(imported);
          const diag = workspaceService.getActiveDiagram();
          onLoadDiagram(diag.document);
        } else {
          const doc = workspaceService.importDiagramJson(file.name, content);
          onLoadDiagram(doc);
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveBasePath = () => {
    workspaceService.updateBasePath(activeWs.id, customBasePath);
    setEditingBasePath(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2
                className={`text-sm font-bold tracking-wide flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Workspace &amp; Diagram Manager
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-mono">
                  {Object.keys(store.workspaces).length} Workspaces
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Organize diagrams across file hierarchies on disk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Path Bar (Prominently showing active target path) */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
            <span
              className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              Active Target Path:
            </span>
            <div
              className={`flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg truncate border ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {activeWs.basePath}/
              </span>
              <span className="text-amber-500 font-bold">{activeWs.name}/</span>
              <span className="text-emerald-400 font-bold">data/</span>
              <span className="text-sky-500 font-bold">{activeWs.activeDiagramFilename}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
              }`}
              title="Copy path to clipboard"
            >
              {copiedPath ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
            </button>
            <button
              onClick={() => workspaceService.downloadDiagramJson()}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              title="Download diagram JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeWs.activeDiagramFilename}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area (Workspaces list on left, Diagrams in workspace on right) */}
        <div className="flex-1 flex overflow-hidden min-h-[380px]">
          {/* Workspaces Sidebar */}
          <div
            className={`w-1/3 border-r p-4 flex flex-col ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-[11px] font-mono uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Workspaces ({Object.keys(store.workspaces).length})
              </span>
              <button
                onClick={() => setIsCreatingWs(c => !c)}
                className="flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-600 font-medium cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ New</span>
              </button>
            </div>

            {/* Create Workspace Inline Form */}
            {isCreatingWs && (
              <form
                onSubmit={handleCreateWorkspace}
                className={`mb-3 p-2.5 rounded-lg space-y-2 border ${
                  isDark
                    ? 'bg-slate-900 border-amber-500/40'
                    : 'bg-white border-amber-500/60 shadow-sm'
                }`}
              >
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Directory Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. workspace2, cloud_prod..."
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    autoFocus
                    className={`w-full px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-amber-400 font-mono border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Starting Diagram Type (data\root.json)
                  </label>
                  <select
                    value={newWsDiagramType}
                    onChange={e => setNewWsDiagramType(e.target.value as DiagramType)}
                    className={`w-full px-2 py-1.5 rounded text-xs font-mono border focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="generic">Universal Freeform (All Shapes)</option>
                    <option value="bpmn">BPMN 2.0 Business Process</option>
                    <option value="erd">Entity Relationship (ERD)</option>
                    <option value="flowchart">Standard Flowchart</option>
                    <option value="uml">UML Class Diagram</option>
                    <option value="uml-sequence">UML Sequence Diagram</option>
                    <option value="uml-usecase">UML Use Case</option>
                    <option value="uml-state">UML State Machine</option>
                    <option value="dfd">Data Flow Diagram (DFD)</option>
                    <option value="idef0">IDEF0 Functional Model</option>
                    <option value="ceqa">CEQA Environmental</option>
                    <option value="mindmap">Mind Map</option>
                    <option value="gantt">Gantt Timelines</option>
                    <option value="pert">PERT Network</option>
                    <option value="c4">C4 Architecture</option>
                    <option value="vsm">Value Stream Map (VSM)</option>
                    <option value="sipoc">SIPOC Matrix</option>
                    <option value="fishbone">Fishbone Ishikawa</option>
                  </select>
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingWs(false)}
                    className={`px-2 py-1 text-[10px] ${
                      isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            )}

            {/* Workspaces List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {Object.values(store.workspaces).map(ws => {
                const isActive = ws.id === activeWs.id;
                const diagCount = Object.keys(ws.diagrams).length;
                return (
                  <div
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isActive
                        ? isDark
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-100 shadow-sm'
                          : 'bg-amber-50 border-amber-500/60 text-amber-900 shadow-xs'
                        : isDark
                        ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <Folder
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-amber-500 fill-amber-500/20'
                            : isDark
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate font-mono">{ws.name}</div>
                        <div
                          className={`text-[10px] font-mono ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {diagCount} diagram{diagCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    {Object.keys(store.workspaces).length > 1 && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await workspaceService.deleteWorkspace(ws.id);
                          setStore({ ...workspaceService.getStore() });
                          setActiveWs({ ...workspaceService.getActiveWorkspace() });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-rose-500 rounded transition-all cursor-pointer"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Base Path Editor */}
            <div
              className={`pt-3 border-t mt-2 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-between text-[10px] mb-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>Base Folder:</span>
                {!editingBasePath ? (
                  <button
                    onClick={() => setEditingBasePath(true)}
                    className="text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                    <span>Change</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveBasePath}
                    className="text-emerald-500 hover:underline font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                )}
              </div>
              {editingBasePath ? (
                <input
                  type="text"
                  value={customBasePath}
                  onChange={e => setCustomBasePath(e.target.value)}
                  className={`w-full px-2 py-1 rounded text-[11px] font-mono border focus:outline-none ${
                    isDark
                      ? 'bg-slate-900 border-blue-500 text-white'
                      : 'bg-white border-blue-500 text-slate-900'
                  }`}
                />
              ) : (
                <div
                  className={`text-[11px] font-mono truncate px-2 py-1 rounded border ${
                    isDark
                      ? 'bg-slate-900 text-slate-300 border-slate-800/80'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {activeWs.basePath}
                </div>
              )}
            </div>
          </div>

          {/* Diagrams in Selected Workspace */}
          <div className={`flex-1 p-5 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div>
                <h3
                  className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  <span>Diagrams in {activeWs.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {Object.keys(activeWs.diagrams).length} files
                  </span>
                </h3>
                <p
                  className={`text-[11px] font-mono mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Stored at: {activeWs.basePath}/{activeWs.name}/*.json
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingDiagram(c => !c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Diagram</span>
                </button>
                <button
                  onClick={() => workspaceService.exportWorkspaceBundle(activeWs.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title="Export full workspace as JSON bundle"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500" />
                  <span>Export Bundle</span>
                </button>
              </div>
            </div>

            {/* Create Diagram Inline Form */}
            {isCreatingDiagram && (
              <form
                onSubmit={handleCreateDiagram}
                className={`my-3 p-3 rounded-xl space-y-2.5 border ${
                  isDark
                    ? 'bg-slate-950 border-blue-500/40'
                    : 'bg-slate-50 border-blue-500/50 shadow-sm'
                }`}
              >
                <div
                  className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
                >
                  Create New Diagram in {activeWs.name}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className={`text-[10px] uppercase font-mono block mb-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      File Name (.json)
                    </label>
                    <input
                      type="text"
                      placeholder="diagram2.json"
                      value={newDiagramFilename}
                      onChange={e => setNewDiagramFilename(e.target.value)}
                      autoFocus
                      className={`w-full px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-blue-400 font-mono border ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-[10px] uppercase font-mono block mb-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Diagram Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Payments Microservices"
                      value={newDiagramName}
                      onChange={e => setNewDiagramName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-blue-400 border ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingDiagram(false)}
                    className={`px-2.5 py-1 text-xs ${
                      isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs cursor-pointer"
                  >
                    Create Diagram
                  </button>
                </div>
              </form>
            )}

            {/* Diagrams Grid / List */}
            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
              {Object.values(activeWs.diagrams).map(diag => {
                const isCurrent = diag.filename === activeWs.activeDiagramFilename;
                const isRoot = diag.filename === 'root.json';
                const pageCount = diag.document?.pages?.length || 1;
                const nodeCount =
                  diag.document?.pages?.reduce((acc, p) => acc + (p.nodes?.length || 0), 0) || 0;

                return (
                  <div
                    key={diag.filename}
                    onClick={() => handleSwitchDiagram(diag.filename)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? isDark
                          ? 'bg-blue-500/10 border-blue-500/60 shadow-md ring-1 ring-blue-500/20'
                          : 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-400/30'
                        : isDark
                        ? 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          isRoot
                            ? 'bg-amber-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-500">
                            {diag.filename}
                          </span>
                          {isRoot && (
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-mono font-bold">
                              ROOT ENTRYPOINT
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded text-[9px] font-mono font-bold">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-xs font-medium truncate mt-0.5 ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {diag.name}
                        </div>
                        <div
                          className={`flex items-center gap-3 text-[10px] font-mono mt-1 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          <span>
                            {pageCount} page{pageCount === 1 ? '' : 's'}
                          </span>
                          <span>•</span>
                          <span>{nodeCount} nodes</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(diag.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          workspaceService.downloadDiagramJson(diag.filename);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark
                            ? 'hover:bg-slate-800 text-slate-400 hover:text-sky-300'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-sky-600'
                        }`}
                        title={`Download ${diag.filename} to local computer`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!isRoot && Object.keys(activeWs.diagrams).length > 1 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(`Delete diagram "${diag.filename}" from ${activeWs.name}?`)) {
                              workspaceService.deleteDiagram(diag.filename);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete diagram"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom: Import JSON File */}
            <div
              className={`pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}
            >
              <label
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono cursor-pointer transition-colors border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Import Diagram / Bundle JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              {importError && (
                <span className="text-rose-500 text-xs font-mono">{importError}</span>
              )}

              <span
                className={`text-[11px] font-mono ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Supports diagram JSON or workspace bundle JSON
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
