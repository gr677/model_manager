/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramDocument } from '../../types/diagram';
import {
  Code2,
  Copy,
  Check,
  Download,
  Upload,
  Play,
  Terminal,
  Server,
  Layers,
  FileJson,
  X,
} from 'lucide-react';

interface RestApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DiagramDocument;
  onImportJson: (importedDoc: DiagramDocument) => void;
}

export const RestApiModal: React.FC<RestApiModalProps> = ({
  isOpen,
  onClose,
  document,
  onImportJson,
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'rawJson' | 'curl' | 'import'>('endpoints');
  const [copied, setCopied] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/diagrams/:id');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(document, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const executeLiveApiCall = async (endpoint: string) => {
    setIsLoadingTest(true);
    setTestResult(null);
    try {
      let url = `/api/diagrams/${document.id}`;
      if (endpoint === 'GET /api/diagrams') url = '/api/diagrams';
      if (endpoint === 'GET /api/diagrams/:id/pages') url = `/api/diagrams/${document.id}/pages`;
      if (endpoint === 'GET /api/diagrams/:id/versions') url = `/api/diagrams/${document.id}/versions`;
      if (endpoint === 'GET /api/openapi.json') url = '/api/openapi.json';

      const res = await fetch(url);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error calling endpoint: ${err.message}`);
    } finally {
      setIsLoadingTest(false);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.pages || !Array.isArray(parsed.pages)) {
        throw new Error('Invalid diagram JSON: Missing "pages" array.');
      }
      onImportJson(parsed);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Malformed JSON format.');
    }
  };

  const endpoints = [
    {
      method: 'GET',
      path: `/api/diagrams/${document.id}`,
      desc: 'Retrieve full diagram JSON document including all pages, nodes, and edges.',
    },
    {
      method: 'PUT',
      path: `/api/diagrams/${document.id}`,
      desc: 'Save/Update entire diagram JSON structure via external service.',
    },
    {
      method: 'GET',
      path: `/api/diagrams/${document.id}/pages`,
      desc: 'List all pages and sub-process hierarchies.',
    },
    {
      method: 'GET',
      path: `/api/diagrams/${document.id}/pages/${document.activePageId}`,
      desc: 'Fetch active page nodes, connectors, and documentation.',
    },
    {
      method: 'POST',
      path: `/api/diagrams/${document.id}/versions`,
      desc: 'Commit a named version snapshot programmatically.',
    },
    {
      method: 'POST',
      path: '/api/sync',
      desc: 'Batch synchronization endpoint for mobile/offline synchronization queues.',
    },
    {
      method: 'GET',
      path: '/api/openapi.json',
      desc: 'OpenAPI 3.0 specification definition for external integration tools.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col h-[85vh] text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">REST API &amp; JSON Integration Hub</h2>
              <p className="text-xs text-slate-400">Live RESTful endpoints, raw JSON models, and developer snippets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/30 px-5 text-xs">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'endpoints'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            REST Endpoints &amp; Tester
          </button>
          <button
            onClick={() => setActiveTab('rawJson')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'rawJson'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw JSON Document
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'curl'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            cURL &amp; Code Snippets
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import JSON Model
          </button>
        </div>

        {/* Tab 1: Endpoints & Live Tester */}
        {activeTab === 'endpoints' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Endpoints List */}
            <div className="w-full md:w-1/2 p-4 border-r border-slate-800 overflow-y-auto space-y-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Available REST API Endpoints
              </span>
              {endpoints.map((ep, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedEndpoint(`${ep.method} ${ep.path}`)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedEndpoint.startsWith(`${ep.method} ${ep.path.split('?')[0]}`)
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        ep.method === 'GET'
                          ? 'bg-sky-500/20 text-sky-400'
                          : ep.method === 'PUT'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs text-slate-200 truncate">{ep.path}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{ep.desc}</p>
                </div>
              ))}
            </div>

            {/* Live Interactive Response Tester */}
            <div className="w-full md:w-1/2 p-4 flex flex-col bg-slate-950/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-slate-300">Live API Execution Tester</span>
                <button
                  onClick={() => executeLiveApiCall(selectedEndpoint)}
                  disabled={isLoadingTest}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow"
                >
                  <Play className="w-3 h-3" />
                  <span>{isLoadingTest ? 'Executing...' : 'Send Request'}</span>
                </button>
              </div>

              <div className="font-mono text-xs text-slate-300 p-2 bg-slate-900 rounded border border-slate-800 mb-3 truncate">
                {selectedEndpoint}
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto max-h-[350px]">
                {testResult ? (
                  <pre className="whitespace-pre-wrap">{testResult}</pre>
                ) : (
                  <span className="text-slate-500 italic">Click &ldquo;Send Request&rdquo; to test real live server response.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Raw JSON Document */}
        {activeTab === 'rawJson' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-xs text-slate-400">
                Complete JSON representation ({document.pages.length} pages, {document.versions.length} versions)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .json</span>
                </button>
              </div>
            </div>
            <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-sky-300 overflow-auto whitespace-pre">
              {jsonString}
            </pre>
          </div>
        )}

        {/* Tab 3: cURL & Snippets */}
        {activeTab === 'curl' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                cURL CLI - Fetch Full Diagram Model
              </label>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-200 select-all overflow-x-auto">
{`curl -X GET "https://${window.location.host}/api/diagrams/${document.id}" \\
  -H "Accept: application/json"`}
              </pre>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                cURL CLI - Programmatic Snapshot Commit
              </label>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-200 select-all overflow-x-auto">
{`curl -X POST "https://${window.location.host}/api/diagrams/${document.id}/versions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "v2.0-automated-build",
    "description": "Triggered by CI/CD pipeline",
    "createdBy": "DevOps Bot"
  }'`}
              </pre>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Python (requests)
              </label>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-200 select-all overflow-x-auto">
{`import requests

url = "https://${window.location.host}/api/diagrams/${document.id}"
response = requests.get(url)
diagram = response.json()
print(f"Loaded diagram '{diagram['name']}' with {len(diagram['pages'])} pages.")`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Import JSON */}
        {activeTab === 'import' && (
          <form onSubmit={handleImportSubmit} className="flex-1 flex flex-col p-5 space-y-3">
            <p className="text-xs text-slate-400">
              Paste external diagram JSON below to import and replace current diagrams.
            </p>
            {importError && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded text-xs">
                {importError}
              </div>
            )}
            <textarea
              required
              rows={12}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='Paste JSON here, e.g. { "name": "...", "pages": [...] }'
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Parse &amp; Import Diagram
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>REST API Protocol: HTTP/1.1 JSON with CORS &amp; OpenAPI 3.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
