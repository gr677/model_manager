/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, X, Loader2, AlertCircle, Lightbulb, GitBranch, PlusCircle, RefreshCw } from 'lucide-react';
import { DiagramNode, DiagramEdge, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface GenerateMindmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMindmapGenerated: (
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

export const GenerateMindmapModal: React.FC<GenerateMindmapModalProps> = ({
  isOpen,
  onClose,
  onMindmapGenerated,
  currentPageName,
  theme = 'dark',
  existingNodes = [],
  existingEdges = [],
}) => {
  const hasExistingNodes = existingNodes.length > 0;
  const [mode, setMode] = useState<'extend' | 'new'>(hasExistingNodes ? 'extend' : 'new');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize default mode whenever modal opens or existingNodes changes
  useEffect(() => {
    if (isOpen) {
      setMode(existingNodes.length > 0 ? 'extend' : 'new');
      setErrorMessage(null);
    }
  }, [isOpen, existingNodes.length]);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const freshQuickTopics = [
    'Enterprise Cloud & AI Strategy: model governance, zero-trust security, real-time collaboration, and hybrid cloud orchestration',
    'Microservices Architecture: API gateways, event bus, distributed caching, circuit breakers, and telemetry monitoring',
    'E-Commerce Platform Scalability: product catalog, checkout funnel, payment processing, inventory sync, and global CDN',
    'Cybersecurity Zero Trust Framework: identity verification, micro-segmentation, continuous posture assessment, and audit logging',
  ];

  const extendQuickTopics = [
    'Add caching, Redis clustering, and cache invalidation policies connected to the central gateway with 10 sentences per node',
    'Add an automated CI/CD pipeline, staging validation, blue-green deployment, and canary rollouts connected to infrastructure',
    'Add security hardening, IAM roles, OAuth2 tokens, and vulnerability scanning with authoritative documentation URL links',
    'Add observability, Prometheus metrics scraping, Grafana dashboards, and OpenTelemetry tracing connected to services',
  ];

  const activeQuickTopics = mode === 'extend' ? extendQuickTopics : freshQuickTopics;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setErrorMessage(
        mode === 'extend'
          ? 'Please enter what concept or nodes you would like to add to your mind map.'
          : 'Please enter a topic or description for your mind map.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const isExtending = mode === 'extend' && existingNodes.length > 0;

    try {
      const res = await fetch('/api/ai/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cleanTopic,
          extendMode: isExtending,
          existingNodes: isExtending ? existingNodes : undefined,
          existingEdges: isExtending ? existingEdges : undefined,
          currentTitle: currentPageName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate mind map from Gemini AI.');
      }

      onMindmapGenerated(
        data.title || (isExtending ? currentPageName || 'Extended Mind Map' : 'Generated Mind Map'),
        data.description || cleanTopic,
        data.nodes || [],
        data.edges || [],
        Boolean(data.extended),
        data.addedNodeIds || []
      );
      setTopic('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while communicating with Gemini AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-purple-500/40 text-slate-100 shadow-purple-950/40'
            : 'bg-white border-purple-300 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark
              ? 'border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-transparent'
              : 'border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                isDark
                  ? 'bg-purple-600/20 border border-purple-500/40 text-purple-400'
                  : 'bg-purple-100 border border-purple-300 text-purple-700'
              }`}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>{mode === 'extend' ? 'Expand Mind Map with Gemini AI' : 'Generate Mind Map with Gemini AI'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                    isDark
                      ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                      : 'bg-purple-100 border-purple-200 text-purple-800'
                  }`}
                >
                  gemini-3.8-flash
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {mode === 'extend'
                  ? `Expanding current mind map (${existingNodes.length} existing nodes) with connected concept branches.`
                  : 'Generate a complete mind map with central topic, connected branches, and technical documentation.'}
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

        {/* Mode Toggle (Visible when page already has nodes) */}
        {hasExistingNodes && (
          <div
            className={`px-5 py-2.5 border-b flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[11px] font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Current canvas has <strong className={isDark ? 'text-purple-300' : 'text-purple-700'}>{existingNodes.length}</strong> nodes:
            </span>
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
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Add new nodes connected to the current mind map"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Extend Current</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'new'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Replace with a brand new mind map from scratch"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Start Fresh</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">{errorMessage}</div>
                {errorMessage.includes('GEMINI_API_KEY') && (
                  <p className="text-[11px] text-rose-300/80 leading-relaxed font-mono">
                    Ensure <code>GEMINI_API_KEY=your_key</code> is present in your server startup environment or .env file.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5 flex items-center justify-between">
              <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                {mode === 'extend'
                  ? 'What would you like to add or expand on this mind map?'
                  : 'What topic would you like the LLM to give information about?'}
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                Supports &quot;10 sentences per node&quot; &amp; URL links
              </span>
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={isLoading}
              placeholder={
                mode === 'extend'
                  ? 'e.g. Add caching strategies, Redis cluster, and cache invalidation policies connected to the central gateway, with about 10 sentences per node and reference documentation URL links...'
                  : 'e.g. Kubernetes Cluster Architecture: about 10 sentences per node explaining control plane, kube-scheduler, kubelet, and etcd, with authoritative documentation URL links...'
              }
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs'
              }`}
              autoFocus
            />
          </div>

          {/* Quick Inspiration Topics */}
          <div>
            <div
              className={`flex items-center gap-1.5 text-[11px] font-mono mb-2 ${
                isDark ? 'text-purple-400' : 'text-purple-700 font-semibold'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{mode === 'extend' ? 'Click an expansion idea:' : 'Or click an example topic:'}</span>
            </div>
            <div className="space-y-1.5">
              {activeQuickTopics.map((qt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setTopic(qt)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] border transition-colors cursor-pointer truncate ${
                    isDark
                      ? 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
                  }`}
                  title={qt}
                >
                  <span
                    className={`font-bold mr-1.5 font-mono ${
                      isDark ? 'text-purple-400' : 'text-purple-700'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span className="truncate">{qt}</span>
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
              {mode === 'extend' ? (
                <>
                  <GitBranch className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span>Attaches new nodes directly to existing branches</span>
                </>
              ) : (
                <>
                  <Brain className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span>Populates mind map nodes, descriptions &amp; wires</span>
                </>
              )}
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
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'extend' ? 'Expanding Mind Map...' : 'Consulting Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{mode === 'extend' ? 'Add Connected Nodes' : 'Generate Mind Map'}</span>
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
