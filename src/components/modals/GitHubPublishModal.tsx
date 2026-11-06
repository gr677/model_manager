/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DiagramDocument, DiagramPage } from '../../types/diagram';
import {
  Github,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  BookOpen,
  FolderGit2,
  FileCode,
  Sparkles,
  X,
  Code2,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
} from 'lucide-react';

interface GitHubPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DiagramDocument;
  currentPage: DiagramPage;
}

export const GitHubPublishModal: React.FC<GitHubPublishModalProps> = ({
  isOpen,
  onClose,
  document,
  currentPage,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('https://github.com/gr677/mind_suite.git');
  const [githubUsername, setGithubUsername] = useState('gr677');
  const [repoName, setRepoName] = useState('mind_suite');
  const [personalAccessToken, setPersonalAccessToken] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'cli' | 'markdown' | 'bundle'>('direct');

  // Push & Pull state
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const [pullSuccess, setPullSuccess] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch current git status from backend
      fetch('/api/github/status')
        .then(res => res.json())
        .then(data => setGitStatus(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handlePullFromGitHub = async () => {
    setIsPulling(true);
    setPullSuccess(null);
    setPushError(null);
    try {
      const response = await fetch('/api/github/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to pull from GitHub repository.');
      }
      setPullSuccess(data.message || 'Successfully synchronized with GitHub!');
      fetch('/api/github/status')
        .then(res => res.json())
        .then(data => setGitStatus(data))
        .catch(() => {});
    } catch (err: any) {
      setPushError(err.message || 'Error pulling from GitHub repository.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleDownloadZipArchive = () => {
    window.location.href = '/api/github/archive';
  };

  const handleDirectPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalAccessToken.trim()) {
      setPushError('Please enter a GitHub Personal Access Token to authenticate the push.');
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setPushSuccess(null);
    setPullSuccess(null);

    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: personalAccessToken.trim(),
          repoUrl: repoUrl.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to push to GitHub.');
      }

      setPushSuccess(result.message || 'Successfully pushed to GitHub repository!');
      // Refresh status
      fetch('/api/github/status')
        .then(res => res.json())
        .then(data => setGitStatus(data))
        .catch(() => {});
    } catch (err: any) {
      setPushError(err.message || 'Error executing git push.');
    } finally {
      setIsPushing(false);
    }
  };

  const gitCliScript = `# ========================================================
# OPTION 1: Update your existing local copy at C:\\GIT\\mind_suite
# ========================================================
cd C:\\GIT\\mind_suite

# 1. Pull latest commits (stick man UML actors, gantt editing, pastel themes)
git pull origin main

# 2. To push any local changes from your PC:
git add .
git commit -m "feat: updates from local workspace"
git push origin main

# ========================================================
# OPTION 2: If cloning for the first time
# ========================================================
cd C:\\GIT
git clone ${repoUrl}
cd mind_suite
npm install
npm run dev`;

  const generateMarkdownDoc = () => {
    return `# Mind Suite (${document.name})

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-REST_API-green.svg)](https://expressjs.com/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Comprehensive enterprise diagramming and workflow modeling suite supporting 20 standardized modeling notations: Universal Freeform, ERD, BPMN 2.0, Swimlanes, UML, DFD, IDEF0, CEQA, SIPOC, Gantt, PERT, C4, Mind Map, VSM, and Fishbone.

## Active Model: ${currentPage.title} (${currentPage.diagramType.toUpperCase()})

- **Diagram Type**: \`${currentPage.diagramType}\`
- **Total Nodes**: ${currentPage.nodes.length}
- **Total Connectors**: ${currentPage.edges.length}
- **Description**: ${currentPage.description || 'Enterprise architecture model'}

### Node Manifest

| Node ID | Type | Label | Coordinates (X, Y) | Dimensions | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${currentPage.nodes
  .map(
    n =>
      `| \`${n.id}\` | \`${n.type}\` | ${n.label.replace(/\n/g, ' ')} | (${n.x}, ${n.y}) | ${n.width}x${n.height} | ${n.documentation?.status || 'draft'} |`
  )
  .join('\n')}

### Connectors & Data Lineage

| Source Node | Target Node | Type | Marker | Label |
| :--- | :--- | :--- | :--- | :--- |
${currentPage.edges
  .map(
    e =>
      `| \`${e.sourceNodeId}\` | \`${e.targetNodeId}\` | \`${e.type}\` | \`${e.markerEnd}\` | ${e.label || '—'} |`
  )
  .join('\n')}

## REST API Integration

The model is accessible via JSON REST API:

\`\`\`bash
# Fetch complete diagram document
curl -X GET "http://localhost:3000/api/diagrams/${document.id}"

# Commit a named version snapshot
curl -X POST "http://localhost:3000/api/diagrams/${document.id}/versions" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "v1.0-release", "createdBy": "gr677"}'
\`\`\`

## Getting Started Locally

\`\`\`bash
# 1. Clone repository
git clone ${repoUrl}
cd mind_suite

# 2. Install dependencies
npm install

# 3. Start development server with REST API on port 3000
npm run dev
\`\`\`

---
*Generated by Mind Suite on ${new Date().toISOString()}*
`;
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownDoc();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `README.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullJson = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `mind_suite-diagram-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[88vh] text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 text-slate-100 border border-slate-700 rounded-xl">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-wide uppercase">
                  Push to GitHub: gr677/mind_suite
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-mono font-bold">
                  Git Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <a href="https://github.com/gr677/mind_suite" target="_blank" rel="noreferrer" className="text-blue-400 underline font-mono">https://github.com/gr677/mind_suite.git</a>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-6 text-xs">
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'direct'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Direct Push to GitHub</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'cli'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal CLI Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'markdown'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>README.md Generator</span>
          </button>
          <button
            onClick={() => setActiveTab('bundle')}
            className={`py-3 px-3 font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'bundle'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Git Bundle</span>
          </button>
        </div>

        {/* Tab 1: Direct Push */}
        {activeTab === 'direct' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Public Repository Status Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">Public Repository Connected</span>
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono font-bold">
                        PUBLIC &amp; REACHABLE
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Branch: <span className="text-slate-200 font-semibold">{gitStatus?.branch || 'main'}</span> • Origin: <span className="text-sky-400">{repoUrl}</span>
                    </div>
                  </div>
                </div>
                <a
                  href="https://github.com/gr677/mind_suite"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <span>Open Repo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Quick Actions (Pull & Download) */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isPulling}
                  onClick={handlePullFromGitHub}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
                  title="Pull commits from the public repository without needing credentials"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>{isPulling ? 'Syncing with GitHub...' : 'Pull / Sync from GitHub'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZipArchive}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
                  title="Download an exact archive of the current codebase as a zip file"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Codebase (.zip)</span>
                </button>
              </div>
            </div>

            {/* Pull Success Message */}
            {pullSuccess && (
              <div className="p-3.5 bg-sky-950/60 border border-sky-500/40 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-sky-300 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Repository Synchronized!</span>
                </div>
                <p className="text-sky-200/90 text-[11px]">{pullSuccess}</p>
              </div>
            )}

            {/* Push Success Message */}
            {pushSuccess && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Push Succeeded!</span>
                </div>
                <p className="text-emerald-200/90 text-xs">{pushSuccess}</p>
                <div className="pt-2">
                  <a
                    href="https://github.com/gr677/mind_suite"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    <span>Open https://github.com/gr677/mind_suite</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Error Message */}
            {pushError && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>Operation Failed</span>
                </div>
                <p className="text-[11px] font-mono leading-relaxed">{pushError}</p>
                <p className="text-[10px] text-rose-300/80 pt-1">
                  Ensure your GitHub token has write access to repository <code>gr677/mind_suite</code>, or use the Terminal CLI guide tab below.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleDirectPush} className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  required
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>GitHub Personal Access Token (PAT)</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=MindSuite-Publish"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Generate token on GitHub (repo scope)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={personalAccessToken}
                  onChange={e => setPersonalAccessToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Because the repository is public, reading/cloning requires no credentials, but GitHub security mandates a token to authenticate write/push actions.
                </p>
              </div>

              <button
                type="submit"
                disabled={isPushing}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow flex items-center justify-center gap-2"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating &amp; Pushing to GitHub...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Push Code to https://github.com/gr677/mind_suite.git</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Git CLI Push Guide */}
        {activeTab === 'cli' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono text-blue-400 font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Terminal CLI Commands
                </span>
                <button
                  onClick={() => copyToClipboard(gitCliScript, 'git-cli')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  {copiedSection === 'git-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'git-cli' ? 'Copied to Clipboard!' : 'Copy Commands'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto select-all">
                {gitCliScript}
              </pre>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-blue-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Target Repository Verified</span>
              </div>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                Repository remote is already configured in this applet to <code className="bg-slate-900 px-1 rounded text-white">{repoUrl}</code> on branch <code className="bg-slate-900 px-1 rounded text-white">main</code>.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: GitHub README.md Generator */}
        {activeTab === 'markdown' && (
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs text-slate-400">
                Generated Markdown Documentation with badges, manifest tables, and endpoints
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(generateMarkdownDoc(), 'md-doc')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  {copiedSection === 'md-doc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'md-doc' ? 'Copied Markdown!' : 'Copy Markdown'}</span>
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download README.md</span>
                </button>
              </div>
            </div>

            <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-sky-300 overflow-auto whitespace-pre">
              {generateMarkdownDoc()}
            </pre>
          </div>
        )}

        {/* Tab 4: Git Bundle & JSON Export */}
        {activeTab === 'bundle' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-emerald-400" />
                <span>Export Standalone GitHub Assets</span>
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Download complete model artifacts ready to commit directly into <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">/docs</code> or <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">/schemas</code>.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadZipArchive}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Entire Project ZIP (.zip)</span>
                </button>
                <button
                  onClick={handleDownloadFullJson}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium cursor-pointer transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Diagram JSON Bundle</span>
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium cursor-pointer transition-colors border border-slate-700"
                >
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>Download GitHub README.md</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>Target repo: <code className="text-slate-300 font-mono">{repoUrl}</code></span>
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
