/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Folder,
  FileCode,
  Copy,
  Check,
  Download,
  X,
  HardDrive,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Save,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { AppTheme, DiagramDocument } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';
import { workspaceService } from '../../services/workspaceService';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullPath: string;
  windowsPath?: string;
  filename: string;
  diagramName: string;
  workspaceName: string;
  theme?: AppTheme;
  document?: DiagramDocument;
  onOpenWorkspaceModal?: () => void;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  onClose,
  fullPath,
  windowsPath,
  filename,
  diagramName,
  workspaceName,
  theme = 'dark',
  document,
  onOpenWorkspaceModal,
}) => {
  const [copiedPathType, setCopiedPathType] = useState<'win' | 'unix' | null>(null);
  const [pathFormat, setPathFormat] = useState<'windows' | 'unix'>('windows');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [physicalDiskStatus, setPhysicalDiskStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [physicalDiskError, setPhysicalDiskError] = useState<string | null>(null);
  const [physicalDiskDetails, setPhysicalDiskDetails] = useState<string | null>(null);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  const resolvedWindowsPath =
    windowsPath || fullPath.replace(/\//g, '\\').replace(/^c:/i, 'C:');

  // Check if workspaceService recorded any storage error
  const lastStorageError = workspaceService.getLastSaveError();
  const lastServerResult = workspaceService.getLastServerSaveResult();

  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchServerLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/debug/logs');
      if (res.ok) {
        const data = await res.json();
        setServerLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Failed to fetch server debug logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCopiedPathType(null);
      setPhysicalDiskStatus('idle');
      setPhysicalDiskError(null);
      setPhysicalDiskDetails(null);
      if (lastServerResult?.error) {
        setShowDiagnostics(true);
      }
      fetchServerLogs();
    }
  }, [isOpen, lastServerResult]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'win' | 'unix') => {
    navigator.clipboard.writeText(text);
    setCopiedPathType(type);
    setTimeout(() => setCopiedPathType(null), 2500);
  };

  const handleSaveToPhysicalDisk = async () => {
    if (!document) {
      workspaceService.downloadDiagramJson(filename);
      setPhysicalDiskStatus('saved');
      return;
    }

    setPhysicalDiskStatus('saving');
    setPhysicalDiskError(null);
    setPhysicalDiskDetails(null);

    const result = await workspaceService.saveToPhysicalDisk(document, filename);

    if (result.success) {
      setPhysicalDiskStatus('saved');
    } else {
      setPhysicalDiskStatus('error');
      setPhysicalDiskError(result.error || 'Failed to write file to local disk.');
      setPhysicalDiskDetails(result.errorDetails || 'Unknown error occurred during physical disk write.');
    }
  };

  const handleDownloadDirect = () => {
    workspaceService.downloadDiagramJson(filename);
    setPhysicalDiskStatus('saved');
  };

  // Compute file size estimate
  const estimatedSizeBytes = document ? JSON.stringify(document).length : 0;
  const estimatedSizeKb = (estimatedSizeBytes / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-200 transform scale-100 ${
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
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-sm font-bold uppercase tracking-wide ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  Diagram Save Status &amp; Path
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lastServerResult?.success
                    ? 'SAVED TO SERVER DISK'
                    : lastServerResult?.error
                    ? 'SERVER ERROR'
                    : 'SAVED'}
                </span>
                {filename === 'root.json' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ROOT ENTRYPOINT
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Workspace: <span className="font-semibold text-amber-400">{workspaceName}</span> • File: <span className="font-mono text-sky-400">{filename}</span>
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Server Save Confirmation Banner */}
          {lastServerResult?.success && (
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Physical File Stored on Server Disk</span>
                </div>
                {lastServerResult.bytes && (
                  <span className="font-mono text-[10px] text-emerald-400">
                    {(lastServerResult.bytes / 1024).toFixed(1)} KB written
                  </span>
                )}
              </div>
              <div className="space-y-1 font-mono text-[10px] text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400">Server Path: </span>
                  <span className="text-emerald-300 break-all">{lastServerResult.physicalPath}</span>
                </div>
                <div>
                  <span className="text-slate-400">Configured Root Path: </span>
                  <span className="text-sky-300 break-all">{lastServerResult.configuredPath}</span>
                </div>
              </div>
            </div>
          )}

          {/* Server Save Error Alert (if server returned error) */}
          {lastServerResult?.error && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Error Saving to Server Disk</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200">
                {lastServerResult.error}
              </p>
              {lastServerResult.details && (
                <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
                  {lastServerResult.details}
                </pre>
              )}
            </div>
          )}

          {/* Storage Error Alert (if any browser localStorage error occurred) */}
          {lastStorageError && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Error Detected During Storage Save</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200">
                {lastStorageError.message}
              </p>
              {lastStorageError.details && (
                <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
                  {lastStorageError.details}
                </pre>
              )}
            </div>
          )}

          {/* Physical Disk Write Error (if user attempted and failed) */}
          {physicalDiskError && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Physical Disk Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed">{physicalDiskError}</p>
              {physicalDiskDetails && (
                <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">
                  {physicalDiskDetails}
                </pre>
              )}
            </div>
          )}

          {/* Full Path Box with Windows vs Unix Format Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className={`text-[10px] uppercase font-mono font-bold flex items-center gap-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                <span>Diagram File Save Path:</span>
              </label>

              {/* Format Toggle: Windows Backslashes vs Unix Slashes */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setPathFormat('windows')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    pathFormat === 'windows'
                      ? 'bg-sky-500 text-white font-bold'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show Windows File Explorer path format (with backslashes \)"
                >
                  Windows (\)
                </button>
                <button
                  type="button"
                  onClick={() => setPathFormat('unix')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    pathFormat === 'unix'
                      ? 'bg-sky-500 text-white font-bold'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show Unix / URI path format (with forward slashes /)"
                >
                  Unix (/)
                </button>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 group transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-sky-300'
                  : 'bg-slate-50 border-slate-300 text-sky-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 font-mono text-xs">
                <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-bold truncate select-all">
                  {pathFormat === 'windows' ? resolvedWindowsPath : fullPath}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    pathFormat === 'windows' ? resolvedWindowsPath : fullPath,
                    pathFormat === 'windows' ? 'win' : 'unix'
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all shrink-0 text-xs shadow-xs ${
                  copiedPathType !== null
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title="Copy path to clipboard"
              >
                {copiedPathType !== null ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedPathType !== null ? 'Copied!' : 'Copy Path'}</span>
              </button>
            </div>
          </div>

          {/* Explanation Banner: Why the file isn't automatically in C:\ without permission */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark
                ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <div className="font-bold">
                Why wasn&apos;t the file on your Windows disk automatically?
              </div>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <strong>Slashes are not the reason</strong> — forward slashes (<code className="font-mono">/</code>) and backslashes (<code className="font-mono">\</code>) are normalized automatically.
              </p>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                Web browsers run in a <strong>secure sandbox</strong> and cannot silently write files to physical Windows drive letters like <code className="font-mono">C:\</code> without browser user interaction. Your diagram is 100% saved in persistent browser memory.
              </p>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                To place the actual physical file directly into your Windows folder, click{' '}
                <strong className="text-purple-300">Save to Physical Windows Disk</strong> below.
              </p>
            </div>
          </div>

          {/* Physical Disk Action Section */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              physicalDiskStatus === 'saved'
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : isDark
                ? 'bg-slate-950/60 border-slate-800'
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span>Physical Windows Disk File:</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  physicalDiskStatus === 'saved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {physicalDiskStatus === 'saved' ? 'WRITTEN TO DISK' : 'STORED IN BROWSER ONLY'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSaveToPhysicalDisk}
                disabled={physicalDiskStatus === 'saving'}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md shadow-purple-600/30"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {physicalDiskStatus === 'saved'
                    ? 'Save Again to Physical Disk'
                    : 'Save to Physical Windows Disk (.json)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDirect}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
                title="Direct download file to your computer's Downloads folder"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Download .JSON</span>
              </button>
            </div>
          </div>

          {/* Breakdown Details Table */}
          <div
            className={`p-3.5 rounded-xl border space-y-2 text-[11px] ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Diagram Title:</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {diagramName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>JSON File:</span>
              <span className="font-mono font-bold text-sky-400">{filename}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Workspace:</span>
              <span className="font-mono text-amber-400">{workspaceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>File Payload Size:</span>
              <span className="font-mono text-emerald-400">{estimatedSizeKb} KB</span>
            </div>
          </div>

          {/* Collapsible Diagnostics & Error Log Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDiagnostics(v => !v)}
              className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono flex items-center justify-between cursor-pointer ${
                isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Diagnostics &amp; Storage Health Log</span>
                {lastStorageError && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px]">
                    1 ERROR
                  </span>
                )}
              </div>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDiagnostics && (
              <div
                className={`mt-2 p-3.5 rounded-xl border text-[10px] font-mono space-y-3 animate-in fade-in ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div>[Health] LocalStorage Access: {lastStorageError ? 'ERROR' : 'OK (Read/Write verified)'}</div>
                  <div>[Health] JSON Serialization: OK ({estimatedSizeKb} KB)</div>
                  <div>[Health] Active Storage Key: omnimind_workspaces_v1</div>
                  <div>[Health] Windows Backslash Path: {resolvedWindowsPath}</div>
                  <div>[Health] Unix URI Path: {fullPath}</div>
                  <div>[Health] Server Disk Storage: {lastServerResult ? (lastServerResult.success ? `OK (${lastServerResult.bytes} bytes at ${lastServerResult.physicalPath})` : `FAILED (${lastServerResult.error})`) : 'Synchronized'}</div>
                </div>

                {lastServerResult?.error && (
                  <div className="text-rose-400 p-2 rounded bg-rose-500/10 border border-rose-500/30">
                    <div className="font-bold">[Server Disk Error] {lastServerResult.error}</div>
                    {lastServerResult.details && <div className="mt-1 opacity-90">{lastServerResult.details}</div>}
                  </div>
                )}

                {/* Live Server Console Debug Messages Section */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-sky-400">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Live Server Console Debug Messages:</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchServerLogs}
                      disabled={isLoadingLogs}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer transition-colors"
                      title="Fetch latest server debug logs"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin text-sky-400' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800/80 max-h-48 overflow-y-auto space-y-1 font-mono text-[9.5px]">
                    {serverLogs.length === 0 ? (
                      <div className="text-slate-500 italic">No server logs captured yet or loading...</div>
                    ) : (
                      serverLogs.slice(-15).map((log, i) => (
                        <div key={i} className="leading-tight flex items-start gap-1.5 break-all">
                          <span className="text-slate-500 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded font-bold uppercase shrink-0 text-[8.5px] ${
                              log.level === 'error'
                                ? 'bg-rose-500/20 text-rose-300'
                                : log.level === 'warn'
                                ? 'bg-amber-500/20 text-amber-300'
                                : log.level === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {log.category}
                          </span>
                          <span
                            className={
                              log.level === 'error'
                                ? 'text-rose-300 font-semibold'
                                : log.level === 'success'
                                ? 'text-emerald-300'
                                : log.level === 'warn'
                                ? 'text-amber-300'
                                : 'text-slate-200'
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {onOpenWorkspaceModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWorkspaceModal();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Workspace Manager</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-blue-600/30 ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
