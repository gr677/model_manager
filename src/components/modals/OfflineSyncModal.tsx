/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SyncQueueItem } from '../../types/diagram';
import { offlineSyncService } from '../../services/offlineSync';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  Database,
} from 'lucide-react';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  queue: SyncQueueItem[];
  onTriggerSync: () => Promise<void>;
  onToggleSimulatedOffline: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSimulatedOffline,
  queue,
  onTriggerSync,
  onToggleSimulatedOffline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isOnline ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-600/20 text-rose-400 border-rose-500/30'
            }`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Offline Synchronization Engine
              </h2>
              <p className="text-xs text-slate-400">Mobile &amp; desktop local caching with automatic queue flushing</p>
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
        <div className="p-5 space-y-4 text-xs">
          {/* Current Status Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <div>
                <div className="font-semibold text-slate-100 text-sm">
                  {isOnline ? 'Connected to Cloud REST API' : 'Operating in Offline Mode'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isOnline ? 'All changes immediately synced with database' : 'Changes locally queued in IndexedDB/Storage'}
                </div>
              </div>
            </div>

            {isOnline ? (
              <button
                onClick={onTriggerSync}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            ) : null}
          </div>

          {/* Simulated Offline Toggle */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Simulate Network Disconnect</div>
              <p className="text-[11px] text-slate-400">
                Test offline queueing and reconnection behavior without unplugging your device.
              </p>
            </div>
            <button
              onClick={onToggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                isSimulatedOffline
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isSimulatedOffline ? 'Simulating Offline' : 'Go Offline'}
            </button>
          </div>

          {/* Pending Sync Queue */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                Local Mutation Queue ({queue.length} pending)
              </span>
              {queue.length > 0 && isOnline && (
                <button
                  onClick={onTriggerSync}
                  className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  Flush {queue.length} items
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 text-center text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All local mutations synchronized with backend REST API.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]"
                  >
                    <span className="text-amber-300 font-bold">{item.action}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Specs Summary */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-[11px]">
            <div className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-semibold text-slate-200">Mobile Touch Enabled</div>
                <div className="text-[10px] text-slate-400">Pinch-zoom &amp; Pan gestures</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-200">Conflict Resolution</div>
                <div className="text-[10px] text-slate-400">Client-timestamp merge</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
