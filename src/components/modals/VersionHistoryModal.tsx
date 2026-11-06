/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramVersion, UserRole } from '../../types/diagram';
import {
  History,
  RotateCcw,
  Plus,
  GitCommit,
  Clock,
  User,
  CheckCircle,
  X,
  FileText,
} from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DiagramVersion[];
  userRole: UserRole;
  onCreateVersion: (name: string, description: string, summary: string) => Promise<void>;
  onRestoreVersion: (versionId: string) => Promise<void>;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  userRole,
  onCreateVersion,
  onRestoreVersion,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDesc, setVersionDesc] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const canManage = userRole === 'admin';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateVersion(
        versionName.trim(),
        versionDesc.trim() || 'Architecture snapshot',
        changesSummary.trim() || 'Updated diagram elements'
      );
      setIsCreating(false);
      setVersionName('');
      setVersionDesc('');
      setChangesSummary('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Version History &amp; Snapshots</h2>
              <p className="text-xs text-slate-400">Track and restore baseline revisions of all diagram pages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Create new snapshot card */}
          {canManage && !isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Version Snapshot</span>
            </button>
          )}

          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-blue-400">Commit Version Snapshot</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Version Name / Tag</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v1.2 - Release Candidate"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Changes Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Added CEQA approval step and optimized ERD indexes"
                  value={changesSummary}
                  onChange={e => setChangesSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Snapshot Commit'}
              </button>
            </form>
          )}

          {/* Timeline of commits */}
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {versions.map((ver, idx) => (
              <div key={ver.id} className="relative flex items-start gap-3 pl-1">
                <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-blue-500 text-blue-400 flex items-center justify-center shrink-0 z-10 text-[10px]">
                  <GitCommit className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{ver.name}</span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono">
                          LATEST
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <button
                        onClick={() => onRestoreVersion(ver.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium cursor-pointer transition-colors"
                        title="Restore this diagram state"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-400" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ver.description || ver.changesSummary}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ver.createdBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ver.createdAt).toLocaleDateString()}
                    </span>
                    <span>{ver.snapshot.pages.length} Pages</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Role: <strong className="text-slate-200 capitalize">{userRole}</strong></span>
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
