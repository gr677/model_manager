/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Workflow,
  X,
  Loader2,
  AlertCircle,
  Lightbulb,
  GitBranch,
  PlusCircle,
  RefreshCw,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';
import { DiagramNode, DiagramEdge, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface GenerateFlowchartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlowchartGenerated: (
    title: string,
    description: string,
    nodes: DiagramNode[],
    edges: DiagramEdge[],
    isExtended?: boolean,
    addedNodeIds?: string[]
  ) => void;
  currentPageName?: string;
  theme?: AppTheme;
  existingNodes?: DiagramNode[];
  existingEdges?: DiagramEdge[];
}

export const GenerateFlowchartModal: React.FC<GenerateFlowchartModalProps> = ({
  isOpen,
  onClose,
  onFlowchartGenerated,
  currentPageName,
  theme = 'dark',
  existingNodes = [],
  existingEdges = [],
}) => {
  const hasExistingNodes = existingNodes.length > 0;
  const [mode, setMode] = useState<'extend' | 'new'>(hasExistingNodes ? 'extend' : 'new');
  const [layoutDirection, setLayoutDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(existingNodes.length > 0 ? 'extend' : 'new');
      setErrorMessage(null);
    }
  }, [isOpen, existingNodes.length]);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const freshQuickProcesses = [
    'Customer Online Order Fulfillment: user submits order form, validate payment & inventory, charge card or notify out-of-stock, save order to database, generate PDF invoice, and dispatch shipment',
    'User Login & Multi-Factor Authentication: enter credentials, look up user in database, verify password with retry limit, send SMS OTP with delay/timeout check, and grant session token',
    'CI/CD Pull Request Deployment: initialize build environment, run unit tests & security scan, manual approval gate for production, deploy containers, verify health check or rollback',
    'Insurance Claim Intake & Payout: claimant submits documents, OCR data extraction, fraud risk check decision, adjuster manual review if flagged, approve settlement, and issue payment receipt',
  ];

  const extendQuickProcesses = [
    'Add an error handling and retry loop with a delay wait step and manual support escalation if retries fail',
    'Add audit logging to a database cylinder and generate summary PDF documents after the main approval step',
    'Add a quality assurance review decision diamond with a rework loop back to processing and a merge junction',
    'Add automated email/webhook output data notification and archive confirmation steps at the end of the flow',
  ];

  const activeQuickProcesses = mode === 'extend' ? extendQuickProcesses : freshQuickProcesses;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setErrorMessage(
        mode === 'extend'
          ? 'Please describe the steps or branches you would like to add to this flowchart.'
          : 'Please describe the process you want Gemini to turn into a flowchart.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const isExtending = mode === 'extend' && existingNodes.length > 0;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch('/api/ai/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          topic: cleanTopic,
          layout: layoutDirection,
          extendMode: isExtending,
          existingNodes: isExtending ? existingNodes : undefined,
          existingEdges: isExtending ? existingEdges : undefined,
          currentTitle: currentPageName,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error ||
            (res.ok
              ? 'Received an invalid response from the server.'
              : `Server returned HTTP ${res.status}${rawText && rawText.length < 180 ? `: ${rawText}` : ''}`)
        );
      }

      onFlowchartGenerated(
        data.title || (isExtending ? currentPageName || 'Extended Flowchart' : 'AI Process Flowchart'),
        data.description || cleanTopic,
        data.nodes || [],
        data.edges || [],
        Boolean(data.extended),
        data.addedNodeIds || []
      );
      setTopic('');
      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMessage('Flowchart generation timed out. Please try a shorter process description or try again.');
      } else if (/failed to fetch|fetch failed|networkerror|load failed/i.test(String(err?.message || ''))) {
        setErrorMessage(
          `${err.message} — Could not complete the request to the backend server or Gemini API. Please check your connection and try again.`
        );
      } else {
        setErrorMessage(err?.message || 'An unexpected error occurred while communicating with Gemini AI.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-emerald-500/40 text-slate-100 shadow-emerald-950/40'
            : 'bg-white border-emerald-300 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark
              ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-cyan-950/20 to-transparent'
              : 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-cyan-50/50 to-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                isDark
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
              }`}
            >
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>
                  {mode === 'extend' ? 'Expand Flowchart with Gemini AI' : 'Generate Flowchart with Gemini AI'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                    isDark
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-emerald-100 border-emerald-200 text-emerald-800'
                  }`}
                >
                  gemini-4-hydrogen
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {mode === 'extend'
                  ? `Adding suggested steps & symbols to current flowchart (${existingNodes.length} existing nodes).`
                  : 'Suggests all process steps and renders them using standard ANSI/ISO flowchart symbols.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode & Orientation Bar */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {hasExistingNodes ? (
            <div
              className={`flex items-center p-0.5 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-300 shadow-2xs'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode('extend')}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'extend'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Extend Current ({existingNodes.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'new'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Start Fresh</span>
              </button>
            </div>
          ) : (
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Auto-maps Terminators, Decisions, I/O, DB &amp; Docs
            </span>
          )}

          {/* Layout Direction Toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={`text-[10px] font-mono uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Direction:
            </span>
            <div
              className={`flex items-center p-0.5 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => setLayoutDirection('vertical')}
                disabled={isLoading}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  layoutDirection === 'vertical'
                    ? 'bg-sky-600 text-white'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Top-to-Bottom flowchart layout"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Top-Down</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutDirection('horizontal')}
                disabled={isLoading}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  layoutDirection === 'horizontal'
                    ? 'bg-sky-600 text-white'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Left-to-Right flowchart layout"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Left-Right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">{errorMessage}</div>
                {errorMessage.includes('GEMINI_API_KEY') && (
                  <p className="text-[11px] text-rose-300/80 leading-relaxed font-mono">
                    Ensure GEMINI_API_KEY is configured in your environment or Settings &gt; Secrets.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5 flex items-center justify-between">
              <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                {mode === 'extend'
                  ? 'What steps or branches would you like Gemini to add?'
                  : 'Describe the process you want to turn into a flowchart:'}
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Uses ANSI/ISO 5807 symbols
              </span>
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={isLoading}
              placeholder={
                mode === 'extend'
                  ? 'e.g. Add a fraud verification decision branch, manual reviewer input if flagged, and database audit logging...'
                  : 'e.g. Employee onboarding workflow: HR setup, collect manual employee tax forms, run background check decision, store records in database, wait for IT provisioning, and issue welcome packet...'
              }
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs'
              }`}
              autoFocus
            />
          </div>

          {/* Quick Example Processes */}
          <div>
            <div
              className={`flex items-center gap-1.5 text-[11px] font-mono mb-2 ${
                isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{mode === 'extend' ? 'Click an expansion idea:' : 'Or click an example process:'}</span>
            </div>
            <div className="space-y-1.5">
              {activeQuickProcesses.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setTopic(qp)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] border transition-colors cursor-pointer truncate ${
                    isDark
                      ? 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
                  }`}
                  title={qp}
                >
                  <span
                    className={`font-bold mr-1.5 font-mono ${
                      isDark ? 'text-emerald-400' : 'text-emerald-700'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span className="truncate">{qp}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div
            className={`pt-3 border-t flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div
              className={`text-[11px] flex items-center gap-1.5 font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <GitBranch className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>
                {mode === 'extend'
                  ? 'Links new symbol steps onto existing flowchart'
                  : 'Builds Terminators, Decisions, Processes, DB & I/O'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'extend' ? 'Expanding Flowchart...' : 'Consulting Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{mode === 'extend' ? 'Add Flowchart Steps' : 'Generate Flowchart'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
