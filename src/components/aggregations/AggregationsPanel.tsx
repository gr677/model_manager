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
  RotateCw,
} from 'lucide-react';
import { AggregationGroup, AggregatedItem, AggregationDataType } from '../../utils/descriptionAggregation';
import { ThreeDChart, ChartDatum, CHART_PALETTE } from './ThreeDChart';
import { AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { workspaceService } from '../../services/workspaceService';
import { scriptEvaluationService } from '../../services/scriptEvaluationService';

interface AggregationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AggregationGroup[];
  selectedFieldNames: string[];
  onToggleFieldName: (name: string) => void;
  onSelectAllOfType?: (type: AggregationDataType) => void;
  onClearFieldNames?: () => void;
  totalSearchedPages: number;
  totalItemsFound: number;
  onFocusNode?: (nodeId: string, item?: AggregatedItem) => void;
  theme?: AppTheme;
  showValuesOnCanvas?: boolean;
  onToggleShowValuesOnCanvas?: () => void;
}

export const AggregationsPanel: React.FC<AggregationsPanelProps> = ({
  isOpen,
  onClose,
  groups,
  selectedFieldNames,
  onToggleFieldName,
  onSelectAllOfType,
  onClearFieldNames,
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
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const fieldDropdownRef = React.useRef<HTMLDivElement>(null);
  const lastSelectionKeyRef = React.useRef<string>('');
  const knownItemIdsRef = React.useRef<Set<string>>(new Set());

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    try {
      const ws = workspaceService.getActiveWorkspace();
      await scriptEvaluationService.refreshAllRates(ws.id);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  // Keep field dropdown open until clicking away or pressing Escape
  useEffect(() => {
    if (!isFieldDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target as Node)) {
        setIsFieldDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFieldDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFieldDropdownOpen]);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const selectedNameSet = useMemo(
    () => new Set(selectedFieldNames.map(n => n.toLowerCase())),
    [selectedFieldNames]
  );

  // Resolve all selected groups (guaranteed same type)
  const selectedGroups = useMemo(() => {
    const matched = groups.filter(g => selectedNameSet.has(g.name.toLowerCase()));
    if (matched.length === 0) return [];
    const primaryType = matched[0].type;
    return matched.filter(g => g.type === primaryType);
  }, [groups, selectedNameSet]);

  const activeType: AggregationDataType | null = selectedGroups[0]?.type || null;
  const isMultiField = selectedGroups.length > 1;
  const selectionKey = selectedGroups.map(g => g.name).sort().join('|');

  const combinedTitle = useMemo(() => {
    if (selectedGroups.length === 0) return '';
    if (selectedGroups.length === 1) return selectedGroups[0].displayName;
    if (selectedGroups.length <= 3) return selectedGroups.map(g => g.displayName).join(' + ');
    return `${selectedGroups[0].displayName} + ${selectedGroups.length - 1} more`;
  }, [selectedGroups]);

  // Combined items across all selected groups of the same type
  const mergedItems = useMemo(() => {
    if (selectedGroups.length === 0) return [];
    const combined = selectedGroups.flatMap(g => g.items);
    if (activeType === 'date') {
      return [...combined].sort((a, b) => {
        const timeA = a.dateValue ? a.dateValue.getTime() : 0;
        const timeB = b.dateValue ? b.dateValue.getTime() : 0;
        return timeA - timeB;
      });
    }
    return combined;
  }, [selectedGroups, activeType]);

  // Keep selectedItemIds synced when switching fields OR when child/grandchild items load asynchronously
  useEffect(() => {
    if (!selectionKey || mergedItems.length === 0) {
      if (!selectionKey) {
        lastSelectionKeyRef.current = '';
        knownItemIdsRef.current = new Set();
        setSelectedItemIds(new Set());
      }
      return;
    }

    const currentIds = mergedItems.map(i => i.id);
    if (lastSelectionKeyRef.current !== selectionKey) {
      lastSelectionKeyRef.current = selectionKey;
      knownItemIdsRef.current = new Set(currentIds);
      setSelectedItemIds(new Set(currentIds));
      return;
    }

    const prevKnown = knownItemIdsRef.current;
    const currentSet = new Set(currentIds);
    setSelectedItemIds(prevSelected => {
      const next = new Set<string>();
      for (const id of prevSelected) {
        if (currentSet.has(id)) next.add(id);
      }
      for (const id of currentIds) {
        if (!prevKnown.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
    knownItemIdsRef.current = currentSet;
  }, [selectionKey, mergedItems]);

  // Items filtered by search
  const filteredItems = mergedItems.filter(item => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.value.toLowerCase().includes(q) ||
      item.nodeLabel.toLowerCase().includes(q) ||
      item.pageTitle.toLowerCase().includes(q) ||
      item.displayName.toLowerCase().includes(q)
    );
  });

  const activeTickedItems = useMemo(() => {
    if (selectedGroups.length === 0) return [];
    return mergedItems.filter(item => selectedItemIds.has(item.id));
  }, [selectedGroups.length, mergedItems, selectedItemIds]);

  // Recalculated metrics based on ticked items
  const effectiveTotal = useMemo(() => {
    if (activeType !== 'number') return 0;
    return activeTickedItems.reduce((acc, curr) => acc + (curr.numericValue ?? 0), 0);
  }, [activeType, activeTickedItems]);

  const effectiveAvg = useMemo(() => {
    if (activeTickedItems.length === 0) return 0;
    return effectiveTotal / activeTickedItems.length;
  }, [activeTickedItems, effectiveTotal]);

  // Map each item ID in the merged selection to a consistent chart color
  const itemColorMap = useMemo(() => {
    const map = new Map<string, string>();
    mergedItems.forEach((item, idx) => {
      map.set(item.id, CHART_PALETTE[idx % CHART_PALETTE.length]);
    });
    return map;
  }, [mergedItems]);

  // Prepare chart data for numbers
  const chartData: ChartDatum[] = useMemo(() => {
    if (activeType !== 'number') return [];
    return activeTickedItems.map((item, idx) => ({
      id: item.id,
      label: isMultiField ? `${item.nodeLabel} (${item.displayName})` : item.nodeLabel,
      value: item.numericValue ?? 0,
      nodeId: item.nodeId,
      pageTitle: item.pageTitle,
      color: itemColorMap.get(item.id) || CHART_PALETTE[idx % CHART_PALETTE.length],
    }));
  }, [activeType, activeTickedItems, itemColorMap, isMultiField]);

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
    setSelectedItemIds(new Set(mergedItems.map(i => i.id)));
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

  if (!isOpen) return null;

  const isPieView = activeType === 'number' && chartType === 'pie';

  return (
    <aside
      className={`fixed top-14 right-0 bottom-0 ${
        isPieView ? 'w-96 md:w-[490px]' : 'w-80 md:w-96'
      } border-l z-40 flex flex-col shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-right ${
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
              Tree from current page &amp; all descendants ({totalSearchedPages} page{totalSearchedPages === 1 ? '' : 's'})
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
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Display value badges on diagram nodes
          </span>
        </label>
        <Eye className={`w-3.5 h-3.5 ${showValuesOnCanvas ? 'text-blue-400' : 'text-slate-500'}`} />
      </div>

      {/* Multi-Select Same-Type Field Selector Dropdown (Stays open until click-away) */}
      <div className={`p-3 border-b flex flex-col gap-1.5 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Selected Aggregated Fields:</span>
          {activeType ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold text-sky-400">
                @{activeType} ({selectedGroups.length})
              </span>
              {onClearFieldNames && (
                <button
                  type="button"
                  onClick={onClearFieldNames}
                  className="text-[9px] text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="Clear selected fields"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            <span className="text-[9px] text-slate-500">Same type only</span>
          )}
        </div>

        <div ref={fieldDropdownRef} className="relative">
          <button
            type="button"
            disabled={groups.length === 0}
            onClick={() => setIsFieldDropdownOpen(v => !v)}
            className={`w-full pl-8 pr-8 py-2 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-100 hover:border-slate-600'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-slate-400'
            } ${groups.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {activeType ? getTypeIcon(activeType) : <Layers className="w-3.5 h-3.5 text-slate-400" />}
            </div>
            <span className="truncate">
              {groups.length === 0
                ? 'No special @type tags found'
                : selectedGroups.length === 0
                ? 'Select one or more fields...'
                : selectedGroups.length === 1
                ? `@${selectedGroups[0].type} ${selectedGroups[0].displayName} (${selectedGroups[0].items.length})`
                : `${selectedGroups.length} @${activeType} fields (${mergedItems.length} items)`}
            </span>
            <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${isFieldDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFieldDropdownOpen && groups.length > 0 && (
            <div
              className={`absolute left-0 right-0 mt-1.5 border rounded-xl shadow-2xl p-2 z-50 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-1 ${
                isDark ? 'bg-slate-900/98 border-slate-700 text-slate-200' : 'bg-white/98 border-slate-200 text-slate-800'
              }`}
            >
              <div className={`px-2 py-1 text-[9.5px] font-mono uppercase border-b mb-1.5 flex items-center justify-between ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <span>
                  {activeType ? `Multi-select @${activeType}:` : 'Pick fields (same @type):'}
                </span>
                <div className="flex items-center gap-1.5">
                  {activeType && onSelectAllOfType && (
                    <button
                      type="button"
                      onClick={() => onSelectAllOfType(activeType)}
                      className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
                    >
                      All @{activeType}
                    </button>
                  )}
                  {selectedGroups.length > 0 && onClearFieldNames && (
                    <>
                      <span className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={onClearFieldNames}
                        className="text-slate-400 hover:text-rose-400 font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                {groups.map(group => {
                  const isChecked = selectedNameSet.has(group.name.toLowerCase());
                  const isDifferentType = Boolean(activeType && activeType !== group.type);
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => onToggleFieldName(group.name)}
                      title={
                        isDifferentType
                          ? `Different type from @${activeType} — click to switch to @${group.type}`
                          : isChecked
                          ? `Uncheck ${group.displayName}`
                          : `Check ${group.displayName}`
                      }
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer group ${
                        isChecked
                          ? 'bg-blue-600/25 border border-blue-500/50 text-blue-300 font-bold'
                          : isDifferentType
                          ? isDark
                            ? 'hover:bg-slate-800/80 text-slate-400 opacity-65 hover:opacity-100 border border-transparent'
                            : 'hover:bg-slate-100 text-slate-500 opacity-70 hover:opacity-100 border border-transparent'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-200 border border-transparent'
                          : 'hover:bg-slate-100 text-slate-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        {getTypeIcon(group.type)}
                        <span className="truncate">{group.displayName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isDifferentType && (
                          <span className="hidden group-hover:inline text-[8px] font-mono text-amber-400">
                            switch
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-400">@{group.type}</span>
                        <span className="text-[10px] font-mono text-slate-400">({group.items.length})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Removable chips when 2+ fields are combined */}
        {selectedGroups.length > 1 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {selectedGroups.map(g => (
              <span
                key={g.name}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border ${
                  isDark
                    ? 'bg-blue-950/60 border-blue-800/70 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                <span>{g.displayName}</span>
                <button
                  type="button"
                  onClick={() => onToggleFieldName(g.name)}
                  className="hover:text-rose-400 cursor-pointer"
                  title={`Remove ${g.displayName}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
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
        ) : selectedGroups.length === 0 ? (
          <div className="p-4 text-center space-y-3 mt-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                No Fields Selected
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Check one or more fields of the same type (<span className="font-mono">@number</span>, <span className="font-mono">@date</span>, or <span className="font-mono">@text</span>) above to combine them here.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {groups.map(g => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => onToggleFieldName(g.name)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 text-slate-200'
                      : 'bg-white border-slate-200 hover:border-blue-500/50 text-slate-700'
                  }`}
                >
                  {getTypeIcon(g.type)}
                  <span>{g.displayName}</span>
                  <span className="text-[9px] font-mono text-slate-400">({g.items.length})</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 1. NUMBER FIELD(S): Normal Bar/Pie Chart & Breakdown with Tickbox Filtering */}
            {activeType === 'number' && (
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
                <ErrorBoundary fallbackTitle="Chart Display Error">
                  <ThreeDChart
                    data={chartData}
                    chartType={chartType}
                    onChangeChartType={setChartType}
                    isDark={isDark}
                    totalSum={effectiveTotal}
                    fieldName={combinedTitle}
                    backgroundColor={themeDef.canvasBg}
                  />
                </ErrorBoundary>

                {/* Values Breakdown List with Tickboxes */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span>Values ({activeTickedItems.length}/{mergedItems.length})</span>
                    </div>
                    {/* Live rates refresh & Tickbox controls: Select All / None */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <button
                        type="button"
                        disabled={isRefreshingRates}
                        onClick={handleRefreshRates}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono border transition-all cursor-pointer ${
                          isDark
                            ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-medium'
                        }`}
                        title="Re-run Python stock & crypto evaluation scripts to fetch live market rates"
                      >
                        <RotateCw className={`w-2.5 h-2.5 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingRates ? 'Updating...' : 'Live Rates'}</span>
                      </button>
                      <span className="text-slate-600">|</span>
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
                    {mergedItems.map((item, idx) => {
                      const isTicked = selectedItemIds.has(item.id);
                      const total = effectiveTotal || 1;
                      const percent = isTicked ? Math.round(((item.numericValue ?? 0) / total) * 100) : 0;
                      const itemColor = itemColorMap.get(item.id) || CHART_PALETTE[idx % CHART_PALETTE.length];

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
                            onClick={() => onFocusNode?.(item.nodeId, item)}
                            className="flex-1 min-w-0 cursor-pointer"
                            title={`Click to navigate to "${item.nodeLabel}" (${item.diagramFilename} / ${item.pageTitle})`}
                          >
                            <div className="flex items-center justify-between text-xs gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: itemColor }}
                                />
                                <span className={`font-semibold truncate max-w-[140px] ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                  {item.nodeLabel}
                                </span>
                                {isMultiField && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    @{item.displayName}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-emerald-400 shrink-0 ml-1">
                                {(item.numericValue ?? 0).toLocaleString()}
                              </span>
                            </div>
                            {/* Script Expression Indicator (e.g. asset(...) or crypto_gbp(...)) */}
                            {scriptEvaluationService.isScriptExpression(item.value) && (
                              <div className="text-[9.5px] font-mono text-emerald-400/90 truncate flex items-center gap-1 mt-0.5">
                                <TrendingUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{item.value}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5 gap-1">
                              <span className="truncate max-w-[170px]" title={`${item.diagramFilename} → ${item.pageTitle}`}>
                                {item.diagramFilename ? `${item.diagramFilename.replace(/\.json$/i, '')} / ${item.pageTitle}` : item.pageTitle}
                              </span>
                              {isTicked && <span className="shrink-0">{percent}%</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATE FIELD(S): Ordered by Date Ascending (date asc) */}
            {activeType === 'date' && (
              <div className="space-y-3 animate-in fade-in">
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Ordered By Date Ascending</span>
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {mergedItems.length} Milestone Date{mergedItems.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    date asc
                  </span>
                </div>

                {/* Timeline Cards in Date Ascending Order */}
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {mergedItems.map((item, idx) => {
                    const d = item.dateValue;
                    const dateFormatted = item.formattedDate || (d ? d.toLocaleDateString() : item.value);

                    const now = new Date();
                    const isPast = d && d.getTime() > 0 && d.getTime() < now.getTime();

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => onFocusNode?.(item.nodeId, item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isDark
                            ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'
                            : 'bg-white border-slate-200 hover:border-amber-500/50 hover:bg-amber-50/20'
                        }`}
                        title={`Click to navigate to "${item.nodeLabel}" (${item.diagramFilename} / ${item.pageTitle})`}
                      >
                        {/* Timeline Accent Bar */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${isPast ? 'bg-slate-600' : 'bg-amber-500'}`} />

                        <div className="flex items-start justify-between gap-2 pl-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                              <span className={isDark ? 'text-slate-100' : 'text-slate-800'}>{item.nodeLabel}</span>
                              {isMultiField && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                  @{item.displayName}
                                </span>
                              )}
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

            {/* 3. TEXT FIELD(S): List of text entries with search filter */}
            {activeType === 'text' && (
              <div className="space-y-3 animate-in fade-in">
                {/* Search in Text entries */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder={`Filter ${combinedTitle} items...`}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => onFocusNode?.(item.nodeId, item)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isDark
                          ? 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850'
                          : 'bg-white border-slate-200 hover:border-sky-500/50 hover:bg-sky-50/20'
                      }`}
                      title={`Click to navigate to "${item.nodeLabel}" (${item.diagramFilename} / ${item.pageTitle})`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                          {item.value}
                        </div>
                        {isMultiField && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                            @{item.displayName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                        <span className="font-medium text-sky-400 truncate max-w-[140px]">
                          {item.nodeLabel}
                        </span>
                        <span className="truncate max-w-[140px]" title={`${item.diagramFilename} → ${item.pageTitle}`}>
                          {item.diagramFilename ? `${item.diagramFilename.replace(/\.json$/i, '')} / ${item.pageTitle}` : item.pageTitle}
                        </span>
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
