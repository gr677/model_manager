/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  X,
  Loader2,
  AlertCircle,
  Lightbulb,
  Code,
  Copy,
  Check,
  Download,
  FolderOutput,
  FileCode2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { DiagramPage, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

export interface GeneratedPythonFile {
  filePath: string;
  purpose: string;
  content: string;
  componentName?: string;
}

export interface GeneratedC4ProjectResult {
  projectName: string;
  projectSlug: string;
  summary: string;
  entryCommand: string;
  requirements: string[];
  files: GeneratedPythonFile[];
  pages: DiagramPage[];
  contextPageId: string;
  containerPageId: string;
  componentPageId: string;
  codePageId?: string;
  durationMs?: number;
}

interface GenerateC4PythonModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: AppTheme;
  workspaceId: string;
  currentPageName?: string;
  hasExistingNodes?: boolean;
  onC4ProjectGenerated: (result: GeneratedC4ProjectResult) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'FastAPI Orders & Inventory',
    prompt:
      'Build a Python REST service for order intake and inventory reservation with FastAPI endpoints, Pydantic validation, SQLite persistence, and background invoice dispatch webhooks.',
    stack: 'FastAPI Web API',
  },
  {
    title: 'CLI Log & Audit Analyzer',
    prompt:
      'Create a modular Python CLI tool that ingests JSON/CSV application logs, filters anomalies, computes summary metrics, and writes clean Markdown and CSV audit reports.',
    stack: 'CLI (Typer / Argparse)',
  },
  {
    title: 'SQLite Price Watcher',
    prompt:
      'Build an async Python watchlist service that polls ticker prices, stores historical snapshots in SQLite, detects threshold alerts, and logs notification events.',
    stack: 'SQLite + Domain Service',
  },
  {
    title: 'ETL Pipeline & Validator',
    prompt:
      'Design a modular Python data pipeline that extracts customer records from external API feeds, validates schemas, deduplicates rows, and loads curated batches into SQLite.',
    stack: 'Async Worker',
  },
];

const STACK_OPTIONS = [
  'auto',
  'FastAPI Web API',
  'CLI (Typer / Argparse)',
  'SQLite + Domain Service',
  'Async Worker',
];

export const GenerateC4PythonModal: React.FC<GenerateC4PythonModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  workspaceId,
  hasExistingNodes = false,
  onC4ProjectGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [pythonStack, setPythonStack] = useState<string>('auto');
  const [includeLayer4Code, setIncludeLayer4Code] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [generatedResult, setGeneratedResult] = useState<GeneratedC4ProjectResult | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ dir: string; count: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCopiedFile(false);
    } else {
      setGeneratedResult(null);
      setExportStatus(null);
    }
  }, [isOpen]);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setErrorMessage('Please describe the Python application you want Gemini to architect and generate.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setExportStatus(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch('/api/ai/generate-c4-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: cleanPrompt,
          pythonStack,
          includeLayer4Code,
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
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }

      const result: GeneratedC4ProjectResult = {
        projectName: data.projectName,
        projectSlug: data.projectSlug,
        summary: data.summary,
        entryCommand: data.entryCommand,
        requirements: data.requirements || [],
        files: data.files || [],
        pages: data.pages || [],
        contextPageId: data.contextPageId,
        containerPageId: data.containerPageId,
        componentPageId: data.componentPageId,
        codePageId: data.codePageId,
        durationMs: data.durationMs,
      };

      setGeneratedResult(result);
      setSelectedFileIndex(0);
      onC4ProjectGenerated(result);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMessage('Generation timed out. Please simplify your prompt and try again.');
      } else {
        setErrorMessage(err?.message || 'Failed to generate C4 architecture and Python files.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const activeFile = generatedResult?.files?.[selectedFileIndex] || null;

  const handleCopyFile = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedFile(true);
      window.setTimeout(() => setCopiedFile(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filePath.split('/').pop() || 'module.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllToWorkspace = async () => {
    if (!generatedResult || generatedResult.files.length === 0) return;
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/python-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: generatedResult.projectSlug,
          files: generatedResult.files,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not export Python files to workspace.');
      }
      setExportStatus({
        dir: data.outputDir,
        count: Array.isArray(data.savedFiles) ? data.savedFiles.length : generatedResult.files.length,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save Python files to workspace.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full ${
          generatedResult ? 'max-w-4xl' : 'max-w-2xl'
        } max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-sky-500/40 text-slate-100'
            : 'bg-white border-sky-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b shrink-0 ${
            isDark
              ? 'border-sky-500/30 bg-slate-950/60'
              : 'border-sky-200 bg-sky-50/70'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-sky-600/20 border border-sky-500/40 text-sky-400'
                  : 'bg-sky-100 border border-sky-300 text-sky-700'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span className="truncate">
                  {generatedResult
                    ? `${generatedResult.projectName} — C4 & Python Code`
                    : 'Generate Python Project & C4 Layers with Gemini AI'}
                </span>
              </h2>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {generatedResult
                  ? `Created ${generatedResult.pages.length} linked C4 pages and ${generatedResult.files.length} Python project files.`
                  : 'Designs C4 Context (L1), Containers (L2), Components (L3) & generates runnable Python modules.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!generatedResult ? (
          <form onSubmit={handleGenerate} className="p-5 space-y-4 overflow-y-auto">
            {hasExistingNodes && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  isDark
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Your current C4 page already has shapes. Generating will replace this page with the new L1 Context diagram and append linked L2/L3 child pages.
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1.5">
                Describe the Python software system to build
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                disabled={isLoading}
                placeholder="e.g. Build a FastAPI service for tracking customer support tickets with SQLite storage, SLA prioritization, and webhook alerts..."
                className={`w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* Stack & Layer 4 Option */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1.5 opacity-80">
                  Python Runtime / Stack
                </label>
                <select
                  value={pythonStack}
                  onChange={e => setPythonStack(e.target.value)}
                  disabled={isLoading}
                  className={`w-full rounded-lg border px-2.5 py-2 text-xs focus:outline-none focus:border-sky-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {STACK_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt === 'auto' ? 'Auto-select best Python stack' : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={`rounded-xl border p-2.5 flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  id="c4-l4-toggle"
                  type="checkbox"
                  checked={includeLayer4Code}
                  onChange={e => setIncludeLayer4Code(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 rounded border-slate-600 text-sky-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="c4-l4-toggle" className="text-xs cursor-pointer leading-snug">
                  <span className="font-semibold block">
                    Include optional L4 (Code) diagram page
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Off by default (C4 best practice): Python source code is already embedded inside L3 Component nodes.
                  </span>
                </label>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick-start Python system prompts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_PROMPTS.map(preset => (
                  <button
                    key={preset.title}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setPrompt(preset.prompt);
                      setPythonStack(preset.stack);
                    }}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-slate-950/70 border-slate-800 hover:border-sky-500/60 hover:bg-slate-800/60'
                        : 'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-sky-50/50'
                    }`}
                  >
                    <div className="font-semibold text-sky-400">{preset.title}</div>
                    <div className={`text-[10px] line-clamp-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {preset.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md shadow-sky-600/25 whitespace-nowrap shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Architecting C4 &amp; Generating Python...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate C4 Layers &amp; Python Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Summary & Layer Bar */}
            <div
              className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  C4 Diagram Populated
                </span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
                <span className="font-mono text-[11px] opacity-85">
                  {generatedResult.pages.map(p => p.title.split('—')[1]?.trim() || p.title).join(' → ')}
                </span>
              </div>
              <div className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                $ {generatedResult.entryCommand}
              </div>
            </div>

            {/* File Explorer + Code Preview */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[340px] overflow-hidden">
              <div
                className={`md:col-span-4 border-r overflow-y-auto p-2 space-y-1 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60">
                  Generated Project Files ({generatedResult.files.length})
                </div>
                {generatedResult.files.map((file, idx) => {
                  const active = idx === selectedFileIndex;
                  return (
                    <button
                      key={file.filePath}
                      type="button"
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-start gap-2 ${
                        active
                          ? 'bg-sky-600/20 border border-sky-500/40 text-sky-300'
                          : isDark
                          ? 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                          : 'hover:bg-slate-200/70 text-slate-700 border border-transparent'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] font-semibold truncate">{file.filePath}</div>
                        <div className="text-[10px] opacity-70 truncate">{file.purpose}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="md:col-span-8 flex flex-col overflow-hidden">
                {activeFile ? (
                  <>
                    <div
                      className={`px-3 py-2 border-b flex items-center justify-between gap-2 text-xs shrink-0 ${
                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Code className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-mono font-semibold truncate">{activeFile.filePath}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyFile}
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                            isDark
                              ? 'border-slate-700 hover:bg-slate-800 text-slate-200'
                              : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {copiedFile ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedFile ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadFile}
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                            isDark
                              ? 'border-slate-700 hover:bg-slate-800 text-slate-200'
                              : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                    <pre
                      className={`flex-1 p-3.5 overflow-auto font-mono text-[11px] leading-relaxed ${
                        isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-900 text-slate-100'
                      }`}
                    >
                      <code>{activeFile.content}</code>
                    </pre>
                  </>
                ) : null}
              </div>
            </div>

            {errorMessage && (
              <div className="mx-4 my-2 p-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {exportStatus && (
              <div className="mx-4 my-2 p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Saved {exportStatus.count} file(s) to workspace folder:{' '}
                  <code className="font-mono">{exportStatus.dir}</code>
                </span>
              </div>
            )}

            {/* Footer */}
            <div
              className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={handleExportAllToWorkspace}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderOutput className="w-3.5 h-3.5" />
                )}
                <span>Save All to Workspace (scripts/generated_c4/)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>View C4 Diagram</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
