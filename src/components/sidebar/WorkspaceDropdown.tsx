/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  Trash2,
  ChevronDown,
  Check,
  Plus,
  HardDrive,
  Sparkles,
  Layers,
  Table,
  Cpu,
  GitBranch,
  Network,
  Clock,
  ArrowRight,
  FileCode,
} from 'lucide-react';
import { workspaceService, Workspace } from '../../services/workspaceService';
import { DiagramDocument, DiagramType, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import { initialDiagramDocument } from '../../data/seedDiagrams';

interface WorkspaceDropdownProps {
  onLoadDiagram: (doc: DiagramDocument) => void;
  theme?: AppTheme;
}

const AVAILABLE_DIAGRAM_TYPES: Array<{
  id: DiagramType;
  label: string;
  category: string;
  description: string;
}> = [
  { id: 'generic', label: 'Universal Freeform (All Shapes)', category: 'General', description: 'Zero notation rules - mix all shapes freely' },
  { id: 'erd', label: 'Entity Relationship (ERD)', category: 'Software & Data', description: 'Database tables, columns, PK/FK, Crow\'s foot' },
  { id: 'bpmn', label: 'BPMN 2.0 Business Process', category: 'Workflows', description: 'Tasks, gateways, events, sub-processes' },
  { id: 'flowchart', label: 'Standard Flowchart', category: 'Workflows', description: 'Process steps, decisions, inputs, terminals' },
  { id: 'uml', label: 'UML Class Diagram', category: 'Software & Data', description: 'Classes, interfaces, inheritance, associations' },
  { id: 'uml-sequence', label: 'UML Sequence Diagram', category: 'Software & Data', description: 'Lifelines, sync/async messages, activations' },
  { id: 'uml-usecase', label: 'UML Use Case', category: 'Software & Data', description: 'Actors, system boundaries, use case bubbles' },
  { id: 'uml-state', label: 'UML State Machine', category: 'Software & Data', description: 'States, transitions, entry/exit actions' },
  { id: 'dfd', label: 'Data Flow Diagram (DFD)', category: 'Software & Data', description: 'Processes, data stores, external entities' },
  { id: 'idef0', label: 'IDEF0 Functional Model', category: 'Engineering', description: 'Inputs, Controls, Outputs, Mechanisms (ICOM)' },
  { id: 'ceqa', label: 'CEQA Environmental Flow', category: 'Regulatory', description: 'Notice of Intent, EIR phases, compliance review' },
  { id: 'mindmap', label: 'Mind Map', category: 'Ideation', description: 'Central topic, branches, associative concepts' },
  { id: 'gantt', label: 'Gantt Project Timelines', category: 'Project Mgmt', description: 'Phases, milestones, task bars, dependencies' },
  { id: 'pert', label: 'PERT / CPM Network', category: 'Project Mgmt', description: 'Activity nodes, critical paths, float analysis' },
  { id: 'sipoc', label: 'SIPOC Matrix', category: 'Quality', description: 'Suppliers, Inputs, Process, Outputs, Customers' },
  { id: 'c4', label: 'C4 Architecture Model', category: 'Software & Data', description: 'Context, Container, Component layers' },
  { id: 'vsm', label: 'Value Stream Mapping (VSM)', category: 'Engineering', description: 'Cycle times, changeover, Kaizen bursts' },
  { id: 'fishbone', label: 'Fishbone (Ishikawa)', category: 'Quality', description: 'Root cause analysis categories & ribs' },
];

export const WorkspaceDropdown: React.FC<WorkspaceDropdownProps> = ({
  onLoadDiagram,
  theme = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [store, setStore] = useState(() => workspaceService.getStore());
  const [activeWs, setActiveWs] = useState(() => workspaceService.getActiveWorkspace());
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [selectedDiagramType, setSelectedDiagramType] = useState<DiagramType>('bpmn');
  const [confirmDeleteWsId, setConfirmDeleteWsId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  useEffect(() => {
    const unsub = workspaceService.subscribe(() => {
      setStore({ ...workspaceService.getStore() });
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
    });
    return unsub;
  }, []);

  // Fetch updated workspace directory list from server on mount and when dropdown opens
  useEffect(() => {
    const syncWorkspaces = async () => {
      setConfirmDeleteWsId(null);
      setDeleteNotice(null);
      await workspaceService.fetchServerWorkspaces();
      setStore({ ...workspaceService.getStore() });
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
    };
    syncWorkspaces();
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingWorkspace(false);
        setConfirmDeleteWsId(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectWorkspace = async (wsId: string) => {
    const ws = workspaceService.setActiveWorkspace(wsId);
    setActiveWs(ws);

    // Explicitly open data\root.json for this workspace
    try {
      const serverDoc = await workspaceService.fetchDiagramFromServer(wsId, 'root.json');
      onLoadDiagram(serverDoc);
    } catch {
      const rootDoc = workspaceService.setActiveDiagram('root.json');
      onLoadDiagram(rootDoc);
    }

    setIsOpen(false);
    setIsAddingWorkspace(false);
    setConfirmDeleteWsId(null);
  };

  const handleTriggerDelete = (e: React.MouseEvent, wsId: string) => {
    e.stopPropagation();
    const count = Object.keys(store.workspaces).length;
    if (count <= 1) {
      setDeleteNotice('At least one workspace must be kept.');
      setTimeout(() => setDeleteNotice(null), 2500);
      return;
    }
    setConfirmDeleteWsId(wsId);
  };

  const handleExecuteDelete = async (e: React.MouseEvent, wsId: string) => {
    e.stopPropagation();
    await workspaceService.deleteWorkspace(wsId);
    setConfirmDeleteWsId(null);
    const newActive = workspaceService.getActiveWorkspace();
    setActiveWs(newActive);
    const diag = workspaceService.getActiveDiagram();
    onLoadDiagram(diag.document);
    setStore({ ...workspaceService.getStore() });
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    // Create workspace with data\root.json of selected diagram type
    const createdWs = await workspaceService.createWorkspace(newWsName.trim(), selectedDiagramType);
    setActiveWs(createdWs);
    const rootDoc = createdWs.diagrams['root.json']?.document || workspaceService.getActiveDiagram().document;
    onLoadDiagram(rootDoc);
    setStore({ ...workspaceService.getStore() });

    // Reset state & close
    setNewWsName('');
    setIsAddingWorkspace(false);
    setIsOpen(false);
  };

  const configuredRootDisplay = (activeWs.basePath || 'c:/omnimind').replace(/\/+$/, '');
  let windowsRootDisplay = configuredRootDisplay.replace(/\//g, '\\');
  if (/^[a-z]:\\/i.test(windowsRootDisplay)) {
    windowsRootDisplay = windowsRootDisplay.charAt(0).toUpperCase() + windowsRootDisplay.slice(1);
  }

  return (
    <div ref={dropdownRef} className="relative z-30 mb-2">
      {/* Label above dropdown (Change 5: Increased font size and removed path location to the right) */}
      <div className="flex items-center px-1 mb-1.5">
        <span className={`flex items-center gap-1.5 uppercase font-bold text-xs tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <HardDrive className="w-4 h-4 text-amber-500" />
          <span>WORKSPACE</span>
        </span>
      </div>

      {/* Main Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left cursor-pointer transition-all shadow-xs group ${
          isOpen
            ? 'ring-2 ring-amber-500/40 border-amber-500'
            : isDark
            ? 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
        }`}
        title={`Active Workspace: ${activeWs.name} (${windowsRootDisplay}\\${activeWs.name}\\data\\root.json)`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 shrink-0">
            <Folder className="w-3.5 h-3.5 fill-amber-500/30" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate flex items-center gap-1.5">
              <span>{activeWs.name}</span>
            </div>
            <div className="text-[10px] font-mono text-sky-400 truncate">
              data\root.json
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-amber-400' : 'group-hover:text-slate-200'
          }`}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white border-slate-300 text-slate-800'
          }`}
          style={{ minWidth: '260px' }}
        >
          {/* Header with path */}
          <div
            className={`p-2.5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-[10px] font-mono tracking-wider font-semibold">
              <span className="uppercase text-slate-400">Directories in</span>{' '}
              <span className="text-amber-400 font-bold normal-case font-mono">{windowsRootDisplay}</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {Object.keys(store.workspaces).length} Workspaces
            </span>
          </div>

          {/* Notice banner if deleting only workspace */}
          {deleteNotice && (
            <div className="p-2 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-[10px] font-mono text-center">
              {deleteNotice}
            </div>
          )}

          {/* List of Existing Workspaces */}
          {!isAddingWorkspace && (
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/40 p-1 space-y-0.5">
              {Object.values(store.workspaces).map(ws => {
                const isActive = ws.id === activeWs.id;
                const isConfirmingThis = confirmDeleteWsId === ws.id;

                return (
                  <div
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-amber-500/15 text-amber-200 font-semibold'
                          : 'bg-amber-50 text-amber-900 font-semibold'
                        : isDark
                        ? 'hover:bg-slate-800/80 text-slate-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs truncate leading-tight font-mono">{ws.name}</div>
                        <div className="text-[10px] font-mono text-sky-400/90 leading-tight">
                          data\root.json
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      {isActive && !isConfirmingThis && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                          OPEN
                        </span>
                      )}

                      {/* Delete workspace button on EVERY entry with safe inline confirm */}
                      {isConfirmingThis ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-rose-400 font-bold">Delete?</span>
                          <button
                            type="button"
                            onClick={e => handleExecuteDelete(e, ws.id)}
                            className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold cursor-pointer shadow-xs"
                            title="Confirm delete workspace directory"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmDeleteWsId(null);
                            }}
                            className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] cursor-pointer"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={e => handleTriggerDelete(e, ws.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title={`Delete workspace directory "${ws.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Workspace Mode */}
          {isAddingWorkspace ? (
            <form onSubmit={handleCreateWorkspace} className="p-3 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" />
                  <span>Add New Workspace</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {windowsRootDisplay}\[name]\data\root.json
                </span>
              </div>

              {/* Workspace Directory Name */}
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                  Workspace Directory Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. logistics_portal"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  autoFocus
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Diagram Type Selector Dropdown */}
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                  Starting Diagram Type (data\root.json)
                </label>
                <select
                  value={selectedDiagramType}
                  onChange={e => setSelectedDiagramType(e.target.value as DiagramType)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {AVAILABLE_DIAGRAM_TYPES.map(dt => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label} ({dt.category})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  A rich {AVAILABLE_DIAGRAM_TYPES.find(d => d.id === selectedDiagramType)?.label} template will be placed in{' '}
                  <span className="text-sky-400 font-mono">data\root.json</span>.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingWorkspace(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWsName.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create &amp; Open</span>
                </button>
              </div>
            </form>
          ) : (
            /* Bottom Action: Add Workspace Button */
            <div className={`p-2 border-t ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => {
                  setIsAddingWorkspace(true);
                  setNewWsName(`workspace${Object.keys(store.workspaces).length + 1}`);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Add Workspace</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
