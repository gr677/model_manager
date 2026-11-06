/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramDocument, SyncQueueItem } from '../types/diagram';

const STORAGE_KEY_DOC = 'omnimodel_active_doc';
const STORAGE_KEY_QUEUE = 'omnimodel_sync_queue';
const STORAGE_KEY_OFFLINE_SIM = 'omnimodel_offline_simulated';

export class OfflineSyncService {
  private isOnlineStatus: boolean = navigator.onLine;
  private isSimulatedOffline: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.isSimulatedOffline = localStorage.getItem(STORAGE_KEY_OFFLINE_SIM) === 'true';

    window.addEventListener('online', () => {
      this.isOnlineStatus = true;
      this.notify();
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnlineStatus = false;
      this.notify();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return this.isOnlineStatus;
  }

  public toggleSimulatedOffline(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    localStorage.setItem(STORAGE_KEY_OFFLINE_SIM, String(this.isSimulatedOffline));
    this.notify();
    if (!this.isSimulatedOffline && this.isOnlineStatus) {
      this.flushQueue();
    }
    return this.isSimulatedOffline;
  }

  public getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public getCachedDocument(): DiagramDocument | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_DOC);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public cacheDocument(doc: DiagramDocument): void {
    try {
      localStorage.setItem(STORAGE_KEY_DOC, JSON.stringify(doc));
    } catch (e) {
      console.warn('LocalStorage cache write error:', e);
    }
  }

  public getQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public enqueueMutation(action: SyncQueueItem['action'], payload: any): void {
    const queue = this.getQueue();
    const item: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      payload,
      status: 'pending',
    };
    queue.push(item);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
    this.notify();

    if (this.isOnline()) {
      this.flushQueue();
    }
  }

  public clearQueue(): void {
    localStorage.removeItem(STORAGE_KEY_QUEUE);
    this.notify();
  }

  public async flushQueue(): Promise<{ syncedCount: number; success: boolean }> {
    if (!this.isOnline()) {
      return { syncedCount: 0, success: false };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, success: true };
    }

    const cachedDoc = this.getCachedDocument();
    const documentId = cachedDoc ? cachedDoc.id : 'doc-enterprise-architecture-2026';

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          mutations: queue,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        this.clearQueue();
        if (result.latestDocument) {
          this.cacheDocument(result.latestDocument);
        }
        return { syncedCount: queue.length, success: true };
      }
    } catch (err) {
      console.warn('Sync attempt failed, mutations retained in queue:', err);
    }

    return { syncedCount: 0, success: false };
  }
}

export const offlineSyncService = new OfflineSyncService();
