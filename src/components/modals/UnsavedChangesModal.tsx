/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Save, ArrowRight, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  targetDestinationName?: string;
  onSaveAndContinue: () => void | Promise<void>;
  onDiscardAndContinue: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  targetDestinationName,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
        {/* Header with warning icon */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-200">Unsaved Changes</h3>
              <p className="text-[11px] text-amber-300/80">You have edits that have not been saved to disk</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            Leaving this page {targetDestinationName ? <span className="font-semibold text-slate-100">to navigate to &ldquo;{targetDestinationName}&rdquo;</span> : null} without saving may cause your recent modifications to be lost.
          </p>
          <p className="text-slate-400 text-[11px]">
            Would you like to save your changes to the workspace disk now before proceeding?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors font-medium"
          >
            Stay on Page
          </button>
          <button
            type="button"
            onClick={onDiscardAndContinue}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 cursor-pointer transition-colors font-medium"
          >
            Discard &amp; Leave
          </button>
          <button
            type="button"
            onClick={onSaveAndContinue}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save &amp; Continue</span>
            <ArrowRight className="w-3 h-3 ml-0.5 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
