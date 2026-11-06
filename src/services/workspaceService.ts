/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramDocument, DiagramPage, DiagramType } from '../types/diagram';
import { initialDiagramDocument } from '../data/seedDiagrams';
import { getExampleDiagramForType } from '../data/diagramExamples';

export interface WorkspaceDiagram {
  filename: string; // e.g. "root.json", "child_payment.json"
  name: string; // Display name
  lastModified: string;
  document: DiagramDocument;
}

export interface Workspace {
  id: string; // e.g. "workspace1"
  name: string; // e.g. "workspace1"
  basePath: string; // e.g. "c:/omnimind/data" or "C:\omnimind\data"
  diagrams: Record<string, WorkspaceDiagram>;
  activeDiagramFilename: string; // Starting entrypoint is "root.json"
}

export interface WorkspaceStore {
  activeWorkspaceId: string;
  workspaces: Record<string, Workspace>;
}

export interface ServerSaveResult {
  success: boolean;
  workspaceId?: string;
  filename?: string;
  isRoot?: boolean;
  bytes?: number;
  physicalPath?: string;
  configuredPath?: string;
  timestamp?: string;
  error?: string;
  details?: string;
}

const STORAGE_KEY = 'omnimind_workspaces_v1';
const DEFAULT_BASE_PATH = 'c:/omnimind';

class WorkspaceService {
  private store: WorkspaceStore;
  private listeners: Array<() => void> = [];
  private lastSaveError: { message: string; timestamp: string; details?: string } | null = null;
  private lastServerSaveResult: ServerSaveResult | null = null;
  private serverSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.store = this.loadStore();
    this.initFromServer();
  }

  private loadStore(): WorkspaceStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.workspaces && parsed?.activeWorkspaceId) {
          // Migration: Ensure root.json is the entrypoint for each workspace
          Object.values(parsed.workspaces).forEach((ws: any) => {
            if (ws.diagrams) {
              if (ws.diagrams['diagram1.json'] && !ws.diagrams['root.json']) {
                ws.diagrams['root.json'] = {
                  ...ws.diagrams['diagram1.json'],
                  filename: 'root.json',
                  name: ws.diagrams['diagram1.json'].name || 'Root Architecture',
                };
                delete ws.diagrams['diagram1.json'];
                if (ws.activeDiagramFilename === 'diagram1.json') {
                  ws.activeDiagramFilename = 'root.json';
                }
              }
              if (!ws.diagrams['root.json']) {
                ws.diagrams['root.json'] = {
                  filename: 'root.json',
                  name: 'Root Architecture & Workflows',
                  lastModified: new Date().toISOString(),
                  document: initialDiagramDocument,
                };
              }
              if (!ws.activeDiagramFilename || !ws.diagrams[ws.activeDiagramFilename]) {
                ws.activeDiagramFilename = 'root.json';
              }
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved workspaces from localStorage:', e);
    }

    // Default Seed Workspace starting with root.json
    const defaultWorkspace: Workspace = {
      id: 'workspace1',
      name: 'workspace1',
      basePath: DEFAULT_BASE_PATH,
      activeDiagramFilename: 'root.json',
      diagrams: {
        'root.json': {
          filename: 'root.json',
          name: initialDiagramDocument.name || 'Enterprise Architecture & Workflows',
          lastModified: new Date().toISOString(),
          document: initialDiagramDocument,
        },
      },
    };

    return {
      activeWorkspaceId: 'workspace1',
      workspaces: {
        workspace1: defaultWorkspace,
      },
    };
  }

  public syncWithServerWorkspaces(serverWorkspaces: any[]): void {
    if (!Array.isArray(serverWorkspaces)) return;

    const updatedWorkspaces: Record<string, Workspace> = {};

    for (const sw of serverWorkspaces) {
      const existing = this.store.workspaces[sw.id];
      const mergedDiagrams: Record<string, WorkspaceDiagram> = existing?.diagrams ? { ...existing.diagrams } : {};

      // If server returned files list for this workspace, ensure every file is registered
      if (Array.isArray(sw.files)) {
        for (const file of sw.files) {
          if (!mergedDiagrams[file.filename]) {
            mergedDiagrams[file.filename] = {
              filename: file.filename,
              name: file.name || file.filename.replace('.json', ''),
              lastModified: file.lastModified || new Date().toISOString(),
              document: (file.filename === 'root.json' ? (existing?.diagrams?.['root.json']?.document || initialDiagramDocument) : (undefined as any)),
            };
          } else if (file.name && (!mergedDiagrams[file.filename].name || mergedDiagrams[file.filename].name === file.filename)) {
            mergedDiagrams[file.filename].name = file.name;
          }
        }
      }

      if (!mergedDiagrams['root.json']) {
        mergedDiagrams['root.json'] = {
          filename: 'root.json',
          name: `${sw.name || sw.id} Root Architecture`,
          lastModified: new Date().toISOString(),
          document: initialDiagramDocument,
        };
      }

      const activeDiag = existing?.activeDiagramFilename && mergedDiagrams[existing.activeDiagramFilename]
        ? existing.activeDiagramFilename
        : 'root.json';

      updatedWorkspaces[sw.id] = {
        id: sw.id,
        name: sw.name || existing?.name || sw.id,
        basePath: sw.basePath || existing?.basePath || DEFAULT_BASE_PATH,
        activeDiagramFilename: activeDiag,
        diagrams: mergedDiagrams,
      };
    }

    // Only update if server returned valid workspaces (at least 1)
    if (Object.keys(updatedWorkspaces).length > 0) {
      this.store.workspaces = updatedWorkspaces;
      if (!this.store.workspaces[this.store.activeWorkspaceId]) {
        this.store.activeWorkspaceId = Object.keys(updatedWorkspaces)[0];
      }
      this.saveStore();
    }
  }

  public async fetchServerWorkspaces(): Promise<any[]> {
    try {
      const resp = await fetch('/api/workspaces');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          this.syncWithServerWorkspaces(data);
          return data;
        }
      }
    } catch (err) {
      console.warn('[WorkspaceService] Failed to fetch server workspaces:', err);
    }
    return [];
  }

  private async initFromServer(): Promise<void> {
    try {
      // 1. Fetch configured root directory from server
      const configResp = await fetch('/api/storage/config');
      if (configResp.ok) {
        const configData = await configResp.json();
        if (configData.configuredRootDir) {
          Object.values(this.store.workspaces).forEach(ws => {
            if (!ws.basePath || ws.basePath === DEFAULT_BASE_PATH) {
              ws.basePath = configData.configuredRootDir;
            }
          });
          this.saveStore();
        }
      }

      // 2. Fetch server workspaces and strictly sync with physical server disk
      await this.fetchServerWorkspaces();
    } catch (err) {
      console.warn('[WorkspaceService] Note: Running without server sync or server not ready:', err);
    }
  }

  private saveStore(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
      this.lastSaveError = null;
    } catch (e: any) {
      console.error('Failed to write workspaces to localStorage:', e);
      this.lastSaveError = {
        message: e?.message || 'QuotaExceededError: Local browser storage limit reached or access denied',
        timestamp: new Date().toISOString(),
        details: String(e?.stack || e),
      };
    }
    this.notify();
  }

  public getLastSaveError(): { message: string; timestamp: string; details?: string } | null {
    return this.lastSaveError;
  }

  public getLastServerSaveResult(): ServerSaveResult | null {
    return this.lastServerSaveResult;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  public getStore(): WorkspaceStore {
    return this.store;
  }

  public getActiveWorkspace(): Workspace {
    const ws = this.store.workspaces[this.store.activeWorkspaceId];
    if (!ws) {
      const firstId = Object.keys(this.store.workspaces)[0];
      if (firstId) {
        this.store.activeWorkspaceId = firstId;
        return this.store.workspaces[firstId];
      }
      // Re-create default
      const defaultWs: Workspace = {
        id: 'workspace1',
        name: 'workspace1',
        basePath: DEFAULT_BASE_PATH,
        activeDiagramFilename: 'root.json',
        diagrams: {
          'root.json': {
            filename: 'root.json',
            name: 'Default Architecture',
            lastModified: new Date().toISOString(),
            document: initialDiagramDocument,
          },
        },
      };
      this.store.workspaces = { workspace1: defaultWs };
      this.store.activeWorkspaceId = 'workspace1';
      this.saveStore();
      return defaultWs;
    }
    return ws;
  }

  public getActiveWorkspacePath(): string {
    const ws = this.getActiveWorkspace();
    return `${ws.basePath}/${ws.name}/data/${ws.activeDiagramFilename}`;
  }

  public getActiveDiagram(): WorkspaceDiagram {
    const ws = this.getActiveWorkspace();
    let diag = ws.diagrams[ws.activeDiagramFilename];
    if (!diag) {
      if (ws.diagrams['root.json']) {
        ws.activeDiagramFilename = 'root.json';
        diag = ws.diagrams['root.json'];
      } else {
        const firstKey = Object.keys(ws.diagrams)[0];
        if (firstKey) {
          ws.activeDiagramFilename = firstKey;
          diag = ws.diagrams[firstKey];
        } else {
          const newDiag: WorkspaceDiagram = {
            filename: 'root.json',
            name: 'Root Architecture Model',
            lastModified: new Date().toISOString(),
            document: initialDiagramDocument,
          };
          ws.diagrams['root.json'] = newDiag;
          ws.activeDiagramFilename = 'root.json';
          this.saveStore();
          return newDiag;
        }
      }
    }
    return diag;
  }

  public getFullPath(workspaceId?: string, filename?: string): string {
    const ws = workspaceId ? this.store.workspaces[workspaceId] : this.getActiveWorkspace();
    if (!ws) return `${DEFAULT_BASE_PATH}/workspace1/data/root.json`;
    const fn = filename || ws.activeDiagramFilename || 'root.json';
    const basePath = (ws.basePath || DEFAULT_BASE_PATH).replace(/\/$/, '');
    return `${basePath}/${ws.name}/data/${fn}`;
  }

  public getWindowsFullPath(workspaceId?: string, filename?: string): string {
    const raw = this.getFullPath(workspaceId, filename);
    let winPath = raw.replace(/\//g, '\\');
    if (/^[a-z]:\\/i.test(winPath)) {
      winPath = winPath.charAt(0).toUpperCase() + winPath.slice(1);
    }
    return winPath;
  }

  public async saveToPhysicalDisk(doc: DiagramDocument, defaultFilename?: string): Promise<{
    success: boolean;
    method: 'filePicker' | 'download';
    savedPath?: string;
    error?: string;
    errorDetails?: string;
  }> {
    const filename = defaultFilename || this.getActiveWorkspace().activeDiagramFilename || 'root.json';
    const jsonStr = JSON.stringify(doc, null, 2);

    // Try modern File System Access API (showSaveFilePicker)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'JSON Diagram File (*.json)',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        return {
          success: true,
          method: 'filePicker',
          savedPath: handle.name || filename,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return {
            success: false,
            method: 'filePicker',
            error: 'Save file dialog was dismissed.',
            errorDetails: 'The user cancelled the file picker without saving.',
          };
        }
        console.warn('showSaveFilePicker unavailable or blocked in iframe, falling back to direct download:', err);
        // Fall back to direct download
        try {
          this.downloadDiagramJson(filename);
          return {
            success: true,
            method: 'download',
            savedPath: filename,
          };
        } catch (downloadErr: any) {
          return {
            success: false,
            method: 'download',
            error: downloadErr?.message || 'Failed to download file to disk',
            errorDetails: String(downloadErr?.stack || downloadErr),
          };
        }
      }
    }

    // Direct download fallback
    try {
      this.downloadDiagramJson(filename);
      return {
        success: true,
        method: 'download',
        savedPath: filename,
      };
    } catch (err: any) {
      return {
        success: false,
        method: 'download',
        error: err?.message || 'Failed to save file to local disk',
        errorDetails: String(err?.stack || err),
      };
    }
  }

  public setActiveWorkspace(workspaceId: string): Workspace {
    if (this.store.workspaces[workspaceId]) {
      this.store.activeWorkspaceId = workspaceId;
      this.saveStore();
      return this.store.workspaces[workspaceId];
    }
    return this.getActiveWorkspace();
  }

  public async createWorkspace(name: string, diagramType: DiagramType = 'generic', basePath?: string): Promise<Workspace> {
    const safeId = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `workspace_${Date.now()}`;
    const id = this.store.workspaces[safeId] ? `${safeId}_${Date.now().toString().slice(-4)}` : safeId;
    const cleanBasePath = (basePath || this.getActiveWorkspace()?.basePath || DEFAULT_BASE_PATH).trim();

    let starterDoc: DiagramDocument;
    if (diagramType && diagramType !== 'generic') {
      const starterPage = getExampleDiagramForType(diagramType);
      starterDoc = {
        id: `doc-${id}-root`,
        name: `${name.trim()} Architecture`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePageId: starterPage.id,
        settings: {
          gridSnap: true,
          showGrid: true,
          theme: 'dark',
          showMinimap: true,
        },
        versions: [],
        pages: [starterPage],
      };
    } else {
      starterDoc = {
        ...initialDiagramDocument,
        id: `doc-${id}-root`,
        name: `${name.trim()} Architecture`,
      };
    }

    const newWorkspace: Workspace = {
      id,
      name: name.trim() || id,
      basePath: cleanBasePath,
      activeDiagramFilename: 'root.json',
      diagrams: {
        'root.json': {
          filename: 'root.json',
          name: `${name.trim()} Root Architecture`,
          lastModified: new Date().toISOString(),
          document: starterDoc,
        },
      },
    };

    this.store.workspaces[id] = newWorkspace;
    this.store.activeWorkspaceId = id;
    this.saveStore();

    // Also register on server disk in <workspace>/data/root.json
    try {
      await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), id, diagramType, templateDoc: starterDoc }),
      });
      await this.fetchServerWorkspaces();
    } catch (err) {
      console.warn('[WorkspaceService] Note: Failed to create workspace on server disk:', err);
    }

    return newWorkspace;
  }

  public renameWorkspace(id: string, newName: string): void {
    const ws = this.store.workspaces[id];
    if (ws) {
      ws.name = newName.trim();
      this.saveStore();
    }
  }

  public updateBasePath(id: string, newBasePath: string): void {
    const ws = this.store.workspaces[id];
    if (ws) {
      ws.basePath = newBasePath.trim();
      this.saveStore();
    }
    this.updateServerRootDir(newBasePath.trim()).catch(() => {});
  }

  public async updateServerRootDir(newRootDir: string): Promise<string> {
    const trimmed = (newRootDir || DEFAULT_BASE_PATH).trim();
    try {
      const resp = await fetch('/api/storage/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootDir: trimmed }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const updated = data.configuredRootDir || trimmed;
        Object.values(this.store.workspaces).forEach(ws => {
          ws.basePath = updated;
        });
        this.saveStore();
        return updated;
      }
    } catch (e) {
      console.warn('Failed to update server rootDir:', e);
    }
    Object.values(this.store.workspaces).forEach(ws => {
      ws.basePath = trimmed;
    });
    this.saveStore();
    return trimmed;
  }

  public async deleteWorkspace(id: string): Promise<boolean> {
    const keys = Object.keys(this.store.workspaces);
    if (keys.length <= 1) {
      console.warn('Cannot delete the only remaining workspace.');
      return false;
    }
    delete this.store.workspaces[id];
    if (this.store.activeWorkspaceId === id) {
      this.store.activeWorkspaceId = Object.keys(this.store.workspaces)[0];
    }
    this.saveStore();

    // Also remove entire workspace folder from server disk
    try {
      await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE',
      });
      await this.fetchServerWorkspaces();
    } catch (err) {
      console.warn('[WorkspaceService] Failed to delete workspace directory on server:', err);
    }

    return true;
  }

  public setActiveDiagram(filename: string): DiagramDocument {
    const ws = this.getActiveWorkspace();
    if (ws.diagrams[filename] && ws.diagrams[filename].document) {
      ws.activeDiagramFilename = filename;
      this.saveStore();
      return ws.diagrams[filename].document;
    }
    ws.activeDiagramFilename = filename;
    this.saveStore();
    return this.getActiveDiagram().document;
  }

  public async loadAndSetActiveDiagram(filename: string): Promise<DiagramDocument> {
    const ws = this.getActiveWorkspace();
    let safeFilename = filename.trim().toLowerCase();
    if (!safeFilename.endsWith('.json')) safeFilename += '.json';

    ws.activeDiagramFilename = safeFilename;

    if (ws.diagrams[safeFilename]?.document) {
      this.saveStore();
      return ws.diagrams[safeFilename].document;
    }

    try {
      const doc = await this.fetchDiagramFromServer(ws.id, safeFilename);
      ws.diagrams[safeFilename] = {
        filename: safeFilename,
        name: doc.name || safeFilename.replace('.json', ''),
        lastModified: new Date().toISOString(),
        document: doc,
      };
      this.saveStore();
      return doc;
    } catch (err) {
      console.warn(`[WorkspaceService] Could not fetch ${safeFilename} from server:`, err);
    }

    this.saveStore();
    return this.getActiveDiagram().document;
  }

  public saveCurrentDiagram(doc: DiagramDocument, customFilename?: string): void {
    const ws = this.getActiveWorkspace();
    const filename = customFilename || ws.activeDiagramFilename || 'root.json';
    ws.diagrams[filename] = {
      filename,
      name: doc.name || filename.replace('.json', ''),
      lastModified: new Date().toISOString(),
      document: doc,
    };
    this.saveStore();
  }

  public updateLocalDiagramCache(filename: string, doc: DiagramDocument): void {
    const ws = this.getActiveWorkspace();
    const safeFilename = filename || ws.activeDiagramFilename || 'root.json';
    ws.diagrams[safeFilename] = {
      filename: safeFilename,
      name: doc.name || safeFilename.replace('.json', ''),
      lastModified: new Date().toISOString(),
      document: doc,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch {
      // ignore
    }
  }

  public async saveCurrentDiagramToServer(
    doc: DiagramDocument,
    customFilename?: string
  ): Promise<ServerSaveResult> {
    const ws = this.getActiveWorkspace();
    const filename = customFilename || ws.activeDiagramFilename || 'root.json';

    const targetPath = this.getWindowsFullPath(ws.id, filename);
    console.log(`[Storage Save] 💾 Sending save to server: workspace="${ws.id}", file="${filename}" (Target: ${targetPath})`);

    try {
      const resp = await fetch(`/api/workspaces/${ws.id}/files/${filename}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const failure: ServerSaveResult = {
          success: false,
          workspaceId: ws.id,
          filename,
          error: errData.error || `Server HTTP ${resp.status}`,
          details: errData.details,
        };
        console.error(`[Storage Save] ❌ Save FAILED (HTTP ${resp.status}):`, failure.error, failure.details);
        this.lastServerSaveResult = failure;
        this.notify();
        return failure;
      }

      const data = await resp.json();
      const successResult: ServerSaveResult = {
        success: true,
        workspaceId: data.workspaceId || ws.id,
        filename: data.filename || filename,
        isRoot: data.isRoot ?? (filename === 'root.json'),
        bytes: data.bytes,
        physicalPath: data.physicalPath,
        configuredPath: data.configuredPath,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      console.log(`[Storage Save] ✅ Save SUCCESS: ${data.configuredPath} -> Server Path: ${data.physicalPath} (${data.bytes} bytes)`);
      this.lastServerSaveResult = successResult;
      this.notify();
      return successResult;
    } catch (err: any) {
      const failure: ServerSaveResult = {
        success: false,
        workspaceId: ws.id,
        filename,
        error: err?.message || 'Could not connect to server storage API',
        details: String(err?.stack || err),
      };
      console.error(`[Storage Save] ❌ Network/Connection error during save:`, failure.error, failure.details);
      this.lastServerSaveResult = failure;
      this.notify();
      return failure;
    }
  }

  public async fetchDiagramFromServer(workspaceId: string, filename: string): Promise<DiagramDocument> {
    const resp = await fetch(`/api/workspaces/${workspaceId}/files/${filename}`);
    if (!resp.ok) {
      throw new Error(`Failed to load ${filename} from server (HTTP ${resp.status})`);
    }
    const data = await resp.json();
    const ws = this.store.workspaces[workspaceId];
    if (ws) {
      ws.diagrams[filename] = {
        filename,
        name: data.name || filename.replace('.json', ''),
        lastModified: new Date().toISOString(),
        document: data,
      };
      this.saveStore();
    }
    return data;
  }

  public createDiagram(
    filename: string,
    name: string,
    doc?: DiagramDocument,
    initialType?: DiagramType,
    isEmpty: boolean = false
  ): DiagramDocument {
    const ws = this.getActiveWorkspace();
    let safeFilename = filename.trim().toLowerCase();
    if (!safeFilename.endsWith('.json')) safeFilename += '.json';
    safeFilename = safeFilename.replace(/[^a-z0-9._-]/g, '_');

    let newDoc: DiagramDocument;
    if (doc) {
      newDoc = doc;
    } else if (initialType && isEmpty) {
      const cleanPage: DiagramPage = {
        id: `page-${initialType}-${Date.now()}`,
        title: name || `${initialType.toUpperCase()} Diagram`,
        diagramType: initialType,
        description: `New ${initialType.toUpperCase()} child diagram.`,
        viewport: { x: 50, y: 50, zoom: 1 },
        nodes: [],
        edges: [],
      };
      newDoc = {
        id: `doc-${ws.id}-${Date.now()}`,
        name: name || safeFilename.replace('.json', ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePageId: cleanPage.id,
        settings: {
          gridSnap: true,
          showGrid: true,
          theme: 'dark',
          showMinimap: true,
        },
        versions: [],
        pages: [cleanPage],
      };
    } else if (initialType) {
      const starterPage = getExampleDiagramForType(initialType);
      newDoc = {
        id: `doc-${ws.id}-${Date.now()}`,
        name: name || safeFilename.replace('.json', ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePageId: starterPage.id,
        settings: {
          gridSnap: true,
          showGrid: true,
          theme: 'dark',
          showMinimap: true,
        },
        versions: [],
        pages: [starterPage],
      };
    } else {
      newDoc = {
        ...initialDiagramDocument,
        id: `doc-${ws.id}-${Date.now()}`,
        name: name || safeFilename.replace('.json', ''),
      };
    }

    ws.diagrams[safeFilename] = {
      filename: safeFilename,
      name: name || safeFilename.replace('.json', ''),
      lastModified: new Date().toISOString(),
      document: newDoc,
    };
    this.saveStore();

    return newDoc;
  }

  public renameDiagram(oldFilename: string, newFilename: string, newName?: string): void {
    const ws = this.getActiveWorkspace();
    if (!ws.diagrams[oldFilename]) return;

    if (oldFilename === 'root.json') {
      console.warn('Cannot rename root.json: it is the required starting entrypoint for this workspace.');
      return;
    }

    let safeNewFilename = newFilename.trim().toLowerCase();
    if (!safeNewFilename.endsWith('.json')) safeNewFilename += '.json';
    safeNewFilename = safeNewFilename.replace(/[^a-z0-9._-]/g, '_');

    const diag = ws.diagrams[oldFilename];
    delete ws.diagrams[oldFilename];

    diag.filename = safeNewFilename;
    if (newName) diag.name = newName.trim();
    ws.diagrams[safeNewFilename] = diag;

    if (ws.activeDiagramFilename === oldFilename) {
      ws.activeDiagramFilename = safeNewFilename;
    }
    this.saveStore();

    // Write to server disk
    this.saveCurrentDiagramToServer(diag.document, safeNewFilename).catch(() => {});
  }

  public deleteDiagram(filename: string): boolean {
    const ws = this.getActiveWorkspace();
    if (filename === 'root.json') {
      console.warn('Cannot delete root.json: every workspace requires root.json as its starting entrypoint.');
      return false;
    }

    const keys = Object.keys(ws.diagrams);
    if (keys.length <= 1) {
      console.warn('Cannot delete the last diagram in this workspace. Create another diagram first.');
      return false;
    }
    delete ws.diagrams[filename];
    if (ws.activeDiagramFilename === filename) {
      ws.activeDiagramFilename = ws.diagrams['root.json'] ? 'root.json' : Object.keys(ws.diagrams)[0];
    }
    this.saveStore();

    // Delete on server disk
    fetch(`/api/workspaces/${ws.id}/files/${filename}`, {
      method: 'DELETE',
    }).catch(err => {
      console.warn('[WorkspaceService] Failed to delete file on server:', err);
    });

    return true;
  }

  public downloadDiagramJson(filename?: string): void {
    const ws = this.getActiveWorkspace();
    const targetFilename = filename || ws.activeDiagramFilename || 'diagram1.json';
    const diag = ws.diagrams[targetFilename];
    if (!diag) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(diag.document, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', targetFilename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public exportWorkspaceBundle(workspaceId?: string): void {
    const ws = workspaceId ? this.store.workspaces[workspaceId] : this.getActiveWorkspace();
    if (!ws) return;

    const bundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workspace: ws,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${ws.name}_workspace_bundle.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public importDiagramJson(filename: string, jsonContent: string): DiagramDocument {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || !parsed.pages) {
      throw new Error('Invalid diagram JSON format. Missing pages array.');
    }
    this.createDiagram(filename, parsed.name || filename.replace('.json', ''), parsed);
    return parsed;
  }

  public importWorkspaceBundle(jsonContent: string): Workspace {
    const parsed = JSON.parse(jsonContent);
    const wsData: Workspace = parsed.workspace || parsed;
    if (!wsData || !wsData.name || !wsData.diagrams) {
      throw new Error('Invalid workspace bundle format.');
    }

    const newId = `imported_${Date.now()}`;
    const importedWs: Workspace = {
      ...wsData,
      id: newId,
      name: `${wsData.name} (Imported)`,
    };

    this.store.workspaces[newId] = importedWs;
    this.store.activeWorkspaceId = newId;
    this.saveStore();
    return importedWs;
  }
}

export const workspaceService = new WorkspaceService();
