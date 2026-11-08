/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Hash,
  FileText,
  X,
  ChevronDown,
  Layers,
  Search,
  Sigma,
  TrendingUp,
  Clock,
  Info,
  CheckSquare,
  Square,
  Check,
  Eye,
} from 'lucide-react';
import { AggregationGroup, AggregatedItem, AggregationDataType } from '../../utils/descriptionAggregation';
import { ThreeDChart, ChartDatum } from './ThreeDChart';
import { AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface AggregationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AggregationGroup[];
  selectedFieldName: string | null;
  onSelectFieldName: (name: string) => void;
  totalSearchedPages: number;
  totalItemsFound: number;
  onFocusNode?: (nodeId: string) => void;
  theme?: AppTheme;
  showValuesOnCanvas?: boolean;
  onToggleShowValuesOnCanvas?: () => void;
}

export const AggregationsPanel: React.FC<AggregationsPanelProps> = ({
  isOpen,
  onClose,
  groups,
  selectedFieldName,
  onSelectFieldName,
  totalSearchedPages,
  totalItemsFound,
  onFocusNode,
  theme = 'dark',
  showValuesOnCanvas = true,
  onToggleShowValuesOnCanvas,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  // Active group to display
  const activeGroup = groups.find(g => g.name === selectedFieldName?.toLowerCase()) || groups[0];

  // Initialize selectedItemIds whenever activeGroup changes
  useEffect(() => {
    if (activeGroup && activeGroup.items) {
      setSelectedItemIds(new Set(activeGroup.items.map(i => i.id)));
    }
  }, [activeGroup?.name]);

  if (!isOpen) return null;

  // Items filtered by search and selected items
  const filteredItems = (activeGroup?.items || []).filter(item => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.value.toLowerCase().includes(q) ||
      item.nodeLabel.toLowerCase().includes(q) ||
      item.pageTitle.toLowerCase().includes(q)
    );
  });

  const activeTickedItems = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.items.filter(item => selectedItemIds.has(item.id));
  }, [activeGroup, selectedItemIds]);

  // Recalculated metrics based on ticked items
  const effectiveTotal = useMemo(() => {
    if (!activeGroup || activeGroup.type !== 'number') return 0;
    return activeTickedItems.reduce((acc, curr) => acc + (curr.numericValue ?? 0), 0);
  }, [activeGroup, activeTickedItems]);

  const effectiveAvg = useMemo(() => {
    if (activeTickedItems.length === 0) return 0;
    return effectiveTotal / activeTickedItems.length;
  }, [activeTickedItems, effectiveTotal]);

  // Prepare chart data for numbers
  const chartData: ChartDatum[] = useMemo(() => {
    if (!activeGroup || activeGroup.type !== 'number') return [];
    return activeTickedItems.map(item => ({
      id: item.id,
      label: item.nodeLabel,
      value: item.numericValue ?? 0,
      nodeId: item.nodeId,
      pageTitle: item.pageTitle,
    }));
  }, [activeGroup, activeTickedItems]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (activeGroup) {
      setSelectedItemIds(new Set(activeGroup.items.map(i => i.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const getTypeIcon = (type: AggregationDataType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-emerald-400" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case 'text':
      default:
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <aside
      className={`fixed top-14 right-0 bottom-0 w-80 md:w-96 border-l z-40 flex flex-col shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-right ${
        isDark
          ? 'bg-slate-900/98 border-slate-800 text-slate-100 shadow-slate-950/80'
          : 'bg-white/98 border-slate-200 text-slate-800 shadow-slate-300'
      }`}
    >
      {/* Panel Header */}
      <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider">Aggregations</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {groups.length} Fields
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Searched: current &amp; child pages ({totalSearchedPages} page{totalSearchedPages === 1 ? '' : 's'})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title="Close aggregations panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Value Badges Tickbox Control */}
      <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 text-xs ${
        isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-100/70'
      }`}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showValuesOnCanvas}
            onChange={onToggleShowValuesOnCanvas}
            className="w-3.5 h-3.5 rounded border-slate-600 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-[11px] font-medium text-slate-300">
            Display value badges on diagram nodes
          </span>
        </label>
        <Eye className={`w-3.5 h-3.5 ${showValuesOnCanvas ? 'text-blue-400' : 'text-slate-500'}`} />
      </div>

      {/* Field Switcher Selector Dropdown */}
      <div className={`p-3 border-b flex flex-col gap-1.5 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Active Aggregated Field:</span>
          {activeGroup && (
            <span className="text-[9px] uppercase font-bold text-sky-400">
              @{activeGroup.type}
            </span>
          )}
        </label>
        <div className="relative">
          <select
            value={activeGroup ? activeGroup.name : ''}
            onChange={e => onSelectFieldName(e.target.value)}
            className={`w-full appearance-none pl-8 pr-8 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-100 hover:border-slate-600'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
          >
            {groups.length === 0 && (
              <option value="">No special @type tags found</option>
            )}
            {groups.map(group => (
              <option key={group.name} value={group.name}>
                @{group.type} {group.displayName} ({group.items.length} item{group.items.length === 1 ? '' : 's'})
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {activeGroup ? getTypeIcon(activeGroup.type) : <Layers className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {groups.length === 0 ? (
          <div className="p-4 text-center space-y-3 mt-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200">No Aggregation Tags Found</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Add special instructions to any node description using the format on its own line:
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-left font-mono text-[10px] space-y-1 text-slate-300">
              <div className="text-sky-300">@text todo: wash the car</div>
              <div className="text-emerald-300">@number share: 345</div>
              <div className="text-amber-300">@date due: 2027-10-25</div>
            </div>
          </div>
        ) : !activeGroup ? null : (
          <>
            {/* 1. NUMBER FIELD: Normal Bar/Pie Chart & Breakdown with Tickbox Filtering */}
            {activeGroup.type === 'number' && (
              <div className="space-y-3 animate-in fade-in">
                {/* Summary Metrics Cards (Recalculates with ticked items) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <Sigma className="w-3 h-3 text-emerald-400" /> Total Sum
                    </span>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 truncate">
                      {effectiveTotal.toLocaleString()}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-sky-400" /> Average
                    </span>
                    <div className="text-lg font-bold font-mono text-sky-400 mt-0.5 truncate">
                      {Math.round(effectiveAvg).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Normal Bar / Circular Pie Chart matching page theme color */}
                <ThreeDChart
                  data={chartData}
                  chartType={chartType}
                  onChangeChartType={setChartType}
                  isDark={isDark}
                  totalSum={effectiveTotal}
                  fieldName={activeGroup.displayName}
                  backgroundColor={themeDef.canvasBg}
                />

                {/* Values Breakdown List with Tickboxes */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span>Values ({activeTickedItems.length}/{activeGroup.items.length})</span>
                    </div>
                    {/* Tickbox controls: Select All / None */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-300 cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {activeGroup.items.map((item, idx) => {
                      const isTicked = selectedItemIds.has(item.id);
                      const total = effectiveTotal || 1;
                      const percent = isTicked ? Math.round(((item.numericValue ?? 0) / total) * 100) : 0;

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-2 rounded-lg border transition-all flex items-start gap-2 ${
                            isDark
                              ? isTicked
                                ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                                : 'bg-slate-950/30 border-slate-900 opacity-60'
                              : isTicked
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-50 border-slate-200 opacity-50'
                          }`}
                        >
                          {/* Tickbox checkbox */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleItem(item.id);
                            }}
                            className="mt-0.5 text-blue-400 hover:text-blue-300 cursor-pointer shrink-0"
                            title={isTicked ? 'Exclude from chart' : 'Include in chart'}
                          >
                            {isTicked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>

                          <div
                            onClick={() => onFocusNode?.(item.nodeId)}
                            className="flex-1 min-w-0 cursor-pointer"
                            title={`Click to focus node "${item.nodeLabel}" on canvas`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-100 truncate max-w-[170px]">
                                {item.nodeLabel}
                              </span>
                              <span className="font-mono font-bold text-emerald-400 shrink-0 ml-1">
                                {(item.numericValue ?? 0).toLocaleString()}
                              </span>
                            </div>
                            {/* Percentage progress bar */}
                            {isTicked && (
                              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mt-1">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                              <span className="truncate max-w-[160px]">{item.pageTitle}</span>
                              {isTicked && <span>{percent}%</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATE FIELD: Ordered by Date Ascending (date asc) with Tickbox controls */}
            {activeGroup.type === 'date' && (
              <div className="space-y-3 animate-in fade-in">
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Ordered By Date Ascending</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {activeGroup.items.length} Milestone Date{activeGroup.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    date asc
                  </span>
                </div>

                {/* Timeline Cards in Date Ascending Order */}
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {activeGroup.items.map((item, idx) => {
                    const d = item.dateValue;
                    const dateFormatted = item.formattedDate || (d ? d.toLocaleDateString() : item.value);

                    const now = new Date();
                    const isPast = d && d.getTime() > 0 && d.getTime() < now.getTime();

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => onFocusNode?.(item.nodeId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isDark
                            ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'
                            : 'bg-white border-slate-200 hover:border-amber-500/50 hover:bg-amber-50/20'
                        }`}
                        title={`Click to focus node "${item.nodeLabel}" on canvas`}
                      >
                        {/* Timeline Accent Bar */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${isPast ? 'bg-slate-600' : 'bg-amber-500'}`} />

                        <div className="flex items-start justify-between gap-2 pl-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100 truncate">
                              <span>{item.nodeLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                              <span className="truncate max-w-[150px]">{item.pageTitle}</span>
                              <span>•</span>
                              <span className="truncate max-w-[100px]">{item.diagramTitle}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>{dateFormatted}</span>
                            </div>
                            {isPast && (
                              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                Past Date
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TEXT FIELD: List of text entries with search filter */}
            {activeGroup.type === 'text' && (
              <div className="space-y-3 animate-in fade-in">
                {/* Search in Text entries */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder={`Filter ${activeGroup.displayName} items...`}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => onFocusNode?.(item.nodeId)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isDark
                          ? 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850'
                          : 'bg-white border-slate-200 hover:border-sky-500/50 hover:bg-sky-50/20'
                      }`}
                      title={`Click to focus node "${item.nodeLabel}" on canvas`}
                    >
                      <div className="text-xs font-semibold text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                        {item.value}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                        <span className="font-medium text-sky-400 truncate max-w-[150px]">
                          {item.nodeLabel}
                        </span>
                        <span className="truncate max-w-[130px]">{item.pageTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info / Syntax Hint */}
      <div className={`p-2.5 border-t text-[10px] flex items-center justify-between text-slate-400 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
        <span className="flex items-center gap-1 font-mono">
          <Info className="w-3 h-3 text-sky-400" />
          <span>Pattern: @type name: value</span>
        </span>
        <span className="font-mono text-[9px] text-slate-500">
          {totalItemsFound} tag{totalItemsFound === 1 ? '' : 's'} across {totalSearchedPages} page{totalSearchedPages === 1 ? '' : 's'}
        </span>
      </div>
    </aside>
  );
};
