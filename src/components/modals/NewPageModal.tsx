/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramPage, DiagramType, AppTheme } from '../../types/diagram';
import { Plus, X, Layers } from 'lucide-react';
import { THEMES } from '../../utils/themeConfig';

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: DiagramPage[];
  theme?: AppTheme;
  onCreatePage: (title: string, diagramType: DiagramType, parentId?: string, description?: string) => void;
}

export const NewPageModal: React.FC<NewPageModalProps> = ({
  isOpen,
  onClose,
  pages,
  theme = 'dark',
  onCreatePage,
}) => {
  const [title, setTitle] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('bpmn');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreatePage(
      title.trim(),
      diagramType,
      parentId ? parentId : undefined,
      description.trim()
    );
    setTitle('');
    setDescription('');
    setParentId('');
    onClose();
  };

  const types: { id: DiagramType; label: string; category: string }[] = [
    { id: 'bpmn', label: 'BPMN 2.0 Business Process', category: 'Business Process' },
    { id: 'erd', label: 'Entity Relationship Diagram (ERD)', category: 'Software & Data' },
    { id: 'swimlane', label: 'Swimlanes & Cross-Functional', category: 'Business Process' },
    { id: 'uml', label: 'UML Class Diagram & Interfaces', category: 'Software & Data' },
    { id: 'uml-sequence', label: 'UML Sequence Diagram', category: 'Software & Data' },
    { id: 'uml-usecase', label: 'UML Use Case Diagram', category: 'Software & Data' },
    { id: 'uml-state', label: 'UML State Machine Diagram', category: 'Software & Data' },
    { id: 'dfd', label: 'Data Flow Diagram (DFD - Gane & Sarson)', category: 'Software & Data' },
    { id: 'yourdon', label: 'Yourdon / DeMarco Structured Flow', category: 'Software & Data' },
    { id: 'idef0', label: 'IDEF0 Function Architecture (ICOM)', category: 'Industrial & Engineering' },
    { id: 'ceqa', label: 'CEQA Environmental Clearance Flow', category: 'Regulatory & Quality' },
    { id: 'sipoc', label: 'SIPOC High-Level Value Matrix', category: 'Regulatory & Quality' },
    { id: 'pert', label: 'PERT Network (Critical Path)', category: 'Project Management' },
    { id: 'gantt', label: 'Gantt Timeline Schedule', category: 'Project Management' },
    { id: 'flowchart', label: 'Standard ANSI/ISO Flowchart', category: 'Business Process' },
    { id: 'c4', label: 'C4 Software Architecture Model', category: 'Software & Data' },
    { id: 'mindmap', label: 'Mind Map & Concept Map', category: 'Business Process' },
    { id: 'vsm', label: 'Value Stream Mapping (VSM)', category: 'Industrial & Engineering' },
    { id: 'fishbone', label: 'Cause & Effect (Fishbone / Ishikawa)', category: 'Regulatory & Quality' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-sm font-bold uppercase tracking-wide ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Create Diagram Page
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Theme: {themeDef.name}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Add a top-level diagram or nested sub-process
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label
              className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Page Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Payment Gateway Orchestration"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full rounded-lg p-2.5 text-xs focus:outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            />
          </div>

          <div>
            <label
              className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Diagram Model Type
            </label>
            <select
              value={diagramType}
              onChange={e => setDiagramType(e.target.value as DiagramType)}
              className={`w-full rounded-lg p-2.5 text-xs focus:outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Parent Page (Hierarchy &amp; Breadcrumbs)
            </label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className={`w-full rounded-lg p-2.5 text-xs focus:outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="">None (Top-Level Root Page)</option>
              {pages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.diagramType.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={`text-[10px] uppercase font-mono block mb-1 font-bold ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Description
            </label>
            <textarea
              rows={2}
              placeholder="High-level purpose of this diagram page..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full rounded-lg p-2.5 text-xs focus:outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            />
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-blue-600/30"
            >
              Create Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
