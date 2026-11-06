/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Brain, X, Loader2, AlertCircle, Lightbulb, Compass } from 'lucide-react';
import { DiagramNode, DiagramEdge, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface GenerateMindmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMindmapGenerated: (title: string, description: string, nodes: DiagramNode[], edges: DiagramEdge[]) => void;
  currentPageName?: string;
  theme?: AppTheme;
}

export const GenerateMindmapModal: React.FC<GenerateMindmapModalProps> = ({
  isOpen,
  onClose,
  onMindmapGenerated,
  currentPageName,
  theme = 'dark',
}) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const themeDef = THEMES[theme] || THEMES.dark;
  const isDark = themeDef.isDark;

  if (!isOpen) return null;

  const quickTopics = [
    'Enterprise Cloud & AI Strategy: model governance, zero-trust security, real-time collaboration, and hybrid cloud orchestration',
    'Microservices Architecture: API gateways, event bus, distributed caching, circuit breakers, and telemetry monitoring',
    'E-Commerce Platform Scalability: product catalog, checkout funnel, payment processing, inventory sync, and global CDN',
    'Cybersecurity Zero Trust Framework: identity verification, micro-segmentation, continuous posture assessment, and audit logging',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setErrorMessage('Please enter a topic or description for your mind map.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cleanTopic }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate mind map from Gemini AI.');
      }

      onMindmapGenerated(
        data.title || 'Generated Mind Map',
        data.description || cleanTopic,
        data.nodes || [],
        data.edges || []
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
            : 'bg-white border-purple-300 text-slate-800 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>Generate Mind Map with Gemini AI</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-medium">
                  gemini-3.8-flash
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter your topic to automatically generate nodes, descriptions, and connected branches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
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
                    Ensure <code>set GEMINI_API_KEY=your_key</code> is present in your server startup environment or Secrets panel.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5 flex items-center justify-between">
              <span>What topic would you like the LLM to give information about?</span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                A few sentences
              </span>
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. Artificial Intelligence Governance & Cloud Strategy: cover compliance, patient privacy, automated data pipelines, continuous evaluation, and infrastructure deployment..."
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              autoFocus
            />
          </div>

          {/* Quick Inspiration Topics */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-purple-400 mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Or click an example topic:</span>
            </div>
            <div className="space-y-1.5">
              {quickTopics.map((qt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setTopic(qt)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] border transition-colors cursor-pointer truncate ${
                    isDark
                      ? 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title={qt}
                >
                  <span className="text-purple-400 font-bold mr-1.5 font-mono">#{i + 1}</span>
                  <span className="truncate">{qt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className={`text-[11px] flex items-center gap-1 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>Populates mind map nodes, descriptions &amp; wires</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
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
                    <span>Consulting Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Mind Map</span>
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
