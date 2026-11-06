/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DIAGRAM_TYPES_CATALOG } from '../../data/diagramTypesCatalog';
import { DiagramType, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import {
  Layers,
  Search,
  Check,
  Plus,
  Filter,
  Sparkles,
  Table,
  Cpu,
  Columns3,
  Component,
  ArrowDownUp,
  Users,
  CircleDot,
  Database,
  Circle,
  SquareStack,
  FileCheck2,
  ListOrdered,
  Network,
  CalendarCheck,
  GitFork,
  TrendingUp,
  GitBranch,
  X,
  Lock,
} from 'lucide-react';

interface DiagramTypesGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: DiagramType;
  theme?: AppTheme;
  onSelectDiagramType: (type: DiagramType) => void;
  onCreateNewPageOfType: (type: DiagramType, name: string) => void;
  onFilterToolbox: (type: DiagramType) => void;
}

export const DiagramTypesGalleryModal: React.FC<DiagramTypesGalleryModalProps> = ({
  isOpen,
  onClose,
  currentType,
  theme = 'dark',
  onSelectDiagramType,
  onCreateNewPageOfType,
  onFilterToolbox,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const categories = [
    'All',
    'Software & Data',
    'Business Process',
    'Regulatory & Quality',
    'Project Management',
    'Industrial & Engineering',
  ];

  const filteredTypes = DIAGRAM_TYPES_CATALOG.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.standard.toLowerCase().includes(search.toLowerCase()) ||
      item.keyElements.some(k => k.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCatalogIcon = (iconName: string) => {
    switch (iconName) {
      case 'Table': return <Table className="w-5 h-5 text-sky-400" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'Columns3': return <Columns3 className="w-5 h-5 text-indigo-400" />;
      case 'Component': return <Component className="w-5 h-5 text-cyan-400" />;
      case 'ArrowDownUp': return <ArrowDownUp className="w-5 h-5 text-teal-400" />;
      case 'Users': return <Users className="w-5 h-5 text-blue-400" />;
      case 'CircleDot': return <CircleDot className="w-5 h-5 text-purple-400" />;
      case 'Database': return <Database className="w-5 h-5 text-sky-400" />;
      case 'Circle': return <Circle className="w-5 h-5 text-amber-400" />;
      case 'SquareStack': return <SquareStack className="w-5 h-5 text-blue-400" />;
      case 'FileCheck2': return <FileCheck2 className="w-5 h-5 text-emerald-400" />;
      case 'ListOrdered': return <ListOrdered className="w-5 h-5 text-yellow-400" />;
      case 'Network': return <Network className="w-5 h-5 text-rose-400" />;
      case 'CalendarCheck': return <CalendarCheck className="w-5 h-5 text-emerald-400" />;
      case 'GitFork': return <GitFork className="w-5 h-5 text-blue-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-amber-400" />;
      case 'GitBranch': return <GitBranch className="w-5 h-5 text-rose-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-400" />;
      default: return <Layers className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[88vh] overflow-hidden border transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-base font-bold uppercase tracking-wide ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Enterprise Diagram Types &amp; Standards
                </h2>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-mono font-bold">
                  {DIAGRAM_TYPES_CATALOG.length} Standardized Models
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Theme: {themeDef.name}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Diagram format is locked on creation to preserve structure. Use <strong>Filter Shapes</strong> to create and drop objects from ANY diagram type on your active canvas, or click <strong>New Page</strong> to start a new diagram.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div
          className={`p-4 border-b space-y-3 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/70'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                placeholder="Search by diagram name, standard (e.g. BPMN, ERD, CEQA, IDEF0, UML), or elements..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
                }`}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-300/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div
          className={`flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${
            isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'
          }`}
        >
          {filteredTypes.map(item => {
            const isCurrent = item.id === currentType;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? isDark
                      ? 'bg-slate-950 border-blue-500/80 ring-2 ring-blue-500/30'
                      : 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg shrink-0 border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {getCatalogIcon(item.iconName)}
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-xs leading-snug ${
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        >
                          {item.name}
                        </h3>
                        <span
                          className={`text-[10px] font-mono ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {item.standard}
                        </span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold font-mono shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  <p
                    className={`text-xs leading-relaxed my-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {item.summary}
                  </p>

                  {/* Key Elements tags */}
                  <div className="flex flex-wrap gap-1 my-2.5">
                    {item.keyElements.map((el, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          isDark
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {el}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  className={`pt-3 border-t flex items-center justify-between gap-2 mt-2 ${
                    isDark ? 'border-slate-800/80' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => {
                      onFilterToolbox(item.id);
                      onClose();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                      isDark
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    }`}
                    title="Filter Toolbox to show this diagram's shapes"
                  >
                    <Filter className="w-3 h-3 text-blue-500" />
                    <span>Filter Shapes</span>
                  </button>

                  <button
                    onClick={() => {
                      onCreateNewPageOfType(item.id, `New ${item.name}`);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                    title="Create a new diagram page using this format"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Page</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
            isDark
              ? 'border-slate-800 bg-slate-950/70 text-slate-400'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Diagram Format: <strong className="text-blue-500 uppercase font-mono">{currentType}</strong></span>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">(Locked)</span>
            </span>
            <span className="text-[11px] opacity-60">• Mix and match shapes from any diagram standard freely</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded font-medium cursor-pointer transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
