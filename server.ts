/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import { initialDiagramDocument } from './src/data/seedDiagrams';
import { getExampleDiagramForType } from './src/data/diagramExamples';
import { DiagramDocument, DiagramPage, DiagramVersion, DiagramNode, DiagramEdge, DiagramType } from './src/types/diagram';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// In-memory debug log buffer for inspection and UI display
export interface ServerDebugLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  details?: any;
}

const serverDebugLogs: ServerDebugLogEntry[] = [];

export function logDebug(
  level: 'info' | 'warn' | 'error' | 'success',
  category: string,
  message: string,
  details?: any
) {
  const timestamp = new Date().toISOString();
  const entry: ServerDebugLogEntry = { timestamp, level, category, message, details };
  serverDebugLogs.push(entry);
  if (serverDebugLogs.length > 250) serverDebugLogs.shift();

  const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
  if (level === 'error') {
    console.error(`\x1b[31m${prefix} ERROR: ${message}\x1b[0m`, details ? JSON.stringify(details) : '');
  } else if (level === 'warn') {
    console.warn(`\x1b[33m${prefix} WARN: ${message}\x1b[0m`, details ? JSON.stringify(details) : '');
  } else if (level === 'success') {
    console.log(`\x1b[32m${prefix} SUCCESS: ${message}\x1b[0m`, details ? JSON.stringify(details) : '');
  } else {
    console.log(`\x1b[36m${prefix}\x1b[0m ${message}`, details ? JSON.stringify(details) : '');
  }
}

// Global API Request logger middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.includes('/api/debug/logs')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      logDebug(level, 'HTTP', `${req.method} ${req.originalUrl} -> ${status} (${duration}ms)`);
    });
  }
  next();
});

// Server-side physical disk storage configurations
const FALLBACK_STORAGE_DIR = path.join(__dirname, 'storage_data');
const DEFAULT_CONFIGURED_ROOT = 'c:/omnimind';

export interface PersistentSettings {
  rootDir: string;
  theme?: string;
  gridStyle?: string;
  gridSize?: number;
  snapToGrid?: boolean;
  showHoverTooltips?: boolean;
  showCollaborators?: boolean;
  autoSaveInterval?: string;
  defaultConnectorType?: string;
  activeWorkspaceId?: string;
  activeDiagramFilename?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Location 1: User Home profile (~/.mind_suite/config.json or %USERPROFILE%\.mind_suite\config.json)
// CRITICAL: Lives outside the Git repository so git pull/checkout/updates NEVER overwrite it!
function getUserConfigFilePath(): string {
  return path.join(os.homedir(), '.mind_suite', 'config.json');
}

// Location 2: Windows %APPDATA%\mind_suite\config.json (if on Windows)
function getAppDataConfigFilePath(): string | null {
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'mind_suite', 'config.json');
  }
  return null;
}

// Location 3: Local project untracked fallback (settings.local.json, in .gitignore)
function getLocalConfigFilePath(): string {
  return path.join(__dirname, 'settings.local.json');
}

// Location 4: Legacy text fallback (.storage_root.txt, in .gitignore)
function getLegacyConfigFilePath(): string {
  return path.join(__dirname, '.storage_root.txt');
}

function getPersistentSettings(): PersistentSettings {
  // 1. Environment variable override has highest precedence
  const envRoot = (
    process.env.MIND_SUITE_ROOT_DIR ||
    process.env.STORAGE_ROOT_DIR ||
    process.env.OMNIMIND_ROOT_DIR ||
    ''
  ).trim();

  let loaded: Partial<PersistentSettings> = {};

  // 2. Primary External: User Home profile (~/.mind_suite/config.json) - OUTSIDE GIT REPO
  const userFile = getUserConfigFilePath();
  if (fs.existsSync(userFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        loaded = { ...loaded, ...parsed };
      }
    } catch (err) {
      console.warn('[PersistentSettings] Error reading user home config:', err);
    }
  }

  // 3. Windows %APPDATA%
  const appDataFile = getAppDataConfigFilePath();
  if (appDataFile && fs.existsSync(appDataFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        loaded = { ...loaded, ...parsed };
      }
    } catch (err) {}
  }

  // 4. Local untracked project config (settings.local.json & .storage_root.txt)
  const localFile = getLocalConfigFilePath();
  if (fs.existsSync(localFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        loaded = { ...loaded, ...parsed };
      }
    } catch (err) {}
  }

  const legacyFile = getLegacyConfigFilePath();
  if (!loaded.rootDir && fs.existsSync(legacyFile)) {
    try {
      const txt = fs.readFileSync(legacyFile, 'utf-8').trim();
      if (txt) loaded.rootDir = txt;
    } catch (err) {}
  }

  // 5. Data Directory itself (<rootDir>/.mind_suite_settings.json)
  const candidateRoot = envRoot || loaded.rootDir || DEFAULT_CONFIGURED_ROOT;
  try {
    const rootSettingsFile = path.join(candidateRoot, '.mind_suite_settings.json');
    if (fs.existsSync(rootSettingsFile)) {
      const parsed = JSON.parse(fs.readFileSync(rootSettingsFile, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        loaded = { ...loaded, ...parsed };
      }
    }
  } catch (err) {}

  // Apply environment override if provided
  if (envRoot) {
    loaded.rootDir = envRoot;
  } else if (!loaded.rootDir) {
    loaded.rootDir = DEFAULT_CONFIGURED_ROOT;
  }

  return {
    rootDir: loaded.rootDir || DEFAULT_CONFIGURED_ROOT,
    theme: loaded.theme || 'dark',
    gridStyle: (loaded.gridStyle as any) || 'dots',
    gridSize: loaded.gridSize || 48,
    snapToGrid: loaded.snapToGrid !== false,
    showHoverTooltips: loaded.showHoverTooltips !== false,
    showCollaborators: loaded.showCollaborators === true,
    autoSaveInterval: (loaded.autoSaveInterval as any) || 'instant',
    defaultConnectorType: (loaded.defaultConnectorType as any) || 'orthogonal',
    ...loaded,
  };
}

function savePersistentSettings(updates: Partial<PersistentSettings>): {
  settings: PersistentSettings;
  savedLocations: string[];
} {
  const current = getPersistentSettings();
  const merged: PersistentSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (merged.rootDir) {
    merged.rootDir = merged.rootDir.trim();
  }

  const savedLocations: string[] = [];

  // 1. Primary: Save to User Home directory (~/.mind_suite/config.json)
  // This is completely OUTSIDE the git repository - SURVIVES GIT PULLS & APP UPDATES!
  try {
    const userDir = path.dirname(getUserConfigFilePath());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    const userFile = getUserConfigFilePath();
    fs.writeFileSync(userFile, JSON.stringify(merged, null, 2), 'utf-8');
    savedLocations.push(userFile);
    logDebug('info', 'PERSISTENCE', `Settings permanently saved outside git in: ${userFile}`);
  } catch (err: any) {
    console.warn('[PersistentSettings] Failed to write user home config:', err.message);
  }

  // 2. Secondary: Windows %APPDATA%
  const appDataFile = getAppDataConfigFilePath();
  if (appDataFile) {
    try {
      const appDataDir = path.dirname(appDataFile);
      if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
      }
      fs.writeFileSync(appDataFile, JSON.stringify(merged, null, 2), 'utf-8');
      savedLocations.push(appDataFile);
    } catch (err: any) {}
  }

  // 3. Tertiary: Save directly inside the configured data storage directory (e.g. C:\omnimind\.mind_suite_settings.json)
  try {
    const dataRoot = getPhysicalStorageDir();
    if (fs.existsSync(dataRoot)) {
      const dataFile = path.join(dataRoot, '.mind_suite_settings.json');
      fs.writeFileSync(dataFile, JSON.stringify(merged, null, 2), 'utf-8');
      savedLocations.push(dataFile);
    }
  } catch (err: any) {}

  // 4. Quaternary: Local project untracked fallbacks (in .gitignore)
  try {
    const localFile = getLocalConfigFilePath();
    fs.writeFileSync(localFile, JSON.stringify(merged, null, 2), 'utf-8');
    savedLocations.push(localFile);
  } catch (err: any) {}

  try {
    const legacyFile = getLegacyConfigFilePath();
    fs.writeFileSync(legacyFile, merged.rootDir, 'utf-8');
    savedLocations.push(legacyFile);
  } catch (err: any) {}

  // Invalidate cached effective directory so next call picks up any changed rootDir
  effectiveStorageDir = null;

  return {
    settings: merged,
    savedLocations,
  };
}

function getConfiguredRootDir(): string {
  try {
    const settings = getPersistentSettings();
    if (settings.rootDir) return settings.rootDir;
  } catch (err) {
    console.warn('[Storage] Error reading persistent config:', err);
  }
  return DEFAULT_CONFIGURED_ROOT;
}

function setConfiguredRootDir(newPath: string): string {
  try {
    const trimmed = (newPath || DEFAULT_CONFIGURED_ROOT).trim();
    savePersistentSettings({ rootDir: trimmed });
    return trimmed;
  } catch (err) {
    console.error('[Storage] Error saving rootDir:', err);
    return DEFAULT_CONFIGURED_ROOT;
  }
}

function normalizeToWindowsPath(inputPath: string): string {
  let p = (inputPath || DEFAULT_CONFIGURED_ROOT).trim().replace(/\/+/g, '\\').replace(/\\+$/, '');
  if (/^[a-z]:\\/i.test(p)) {
    p = p.charAt(0).toUpperCase() + p.slice(1);
  }
  return p;
}

// When running on Windows (e.g. C:\GIT\mind_suite), save DIRECTLY to C:\omnimind!
// When running in a Linux/cloud container, or if Windows non-admin permissions deny C:\, fallback to local storage_data directory
let effectiveStorageDir: string | null = null;

function getPhysicalStorageDir(): string {
  if (effectiveStorageDir) return effectiveStorageDir;
  const configured = getConfiguredRootDir();
  if (process.platform === 'win32') {
    return normalizeToWindowsPath(configured);
  }
  // If configured is a Windows drive letter on non-Windows host:
  if (/^[a-zA-Z]:/i.test(configured)) {
    return FALLBACK_STORAGE_DIR;
  }
  return configured;
}

function sanitizeName(name: string): string {
  return (name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function toWindowsPath(base: string, workspace: string, filename: string): string {
  const normBase = normalizeToWindowsPath(base || DEFAULT_CONFIGURED_ROOT);
  return `${normBase}\\${workspace}\\data\\${filename}`;
}

// Ensure storage directories and default workspace with data/root.json exist on disk
async function initStorageOnDisk() {
  let storageDir = getPhysicalStorageDir();
  try {
    await fsp.mkdir(storageDir, { recursive: true });
    // Verify write permissions with a temporary probe
    const probeFile = path.join(storageDir, '.write_probe');
    await fsp.writeFile(probeFile, 'ok', 'utf-8');
    await fsp.unlink(probeFile).catch(() => {});
  } catch (err: any) {
    if (storageDir !== FALLBACK_STORAGE_DIR) {
      logDebug(
        'warn',
        'STORAGE',
        `Permission or path issue writing to configured root "${storageDir}" (${err.code || err.message}). Gracefully falling back to local "${FALLBACK_STORAGE_DIR}"`
      );
      effectiveStorageDir = FALLBACK_STORAGE_DIR;
      storageDir = FALLBACK_STORAGE_DIR;
      await fsp.mkdir(storageDir, { recursive: true });
    }
  }

  try {
    const entries = await fsp.readdir(storageDir, { withFileTypes: true });
    const existingDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('$'));

    // Only initialize default workspace1 if the storage root is completely empty
    if (existingDirs.length === 0) {
      const ws1Dir = path.join(storageDir, 'workspace1');
      const ws1DataDir = path.join(ws1Dir, 'data');
      const ws1ImagesDir = path.join(ws1Dir, 'images');
      await fsp.mkdir(ws1DataDir, { recursive: true });
      await fsp.mkdir(ws1ImagesDir, { recursive: true });
      const rootFileInData = path.join(ws1DataDir, 'root.json');
      await fsp.writeFile(rootFileInData, JSON.stringify(initialDiagramDocument, null, 2), 'utf-8');
      logDebug('success', 'STORAGE', `Initialized default workspace1/data/root.json and workspace1/images in empty root: ${storageDir}`);
    } else {
      // Ensure existing workspaces have their data/ and images/ directory and root.json
      for (const dir of existingDirs) {
        const wsPath = path.join(storageDir, dir.name);
        const dataPath = path.join(wsPath, 'data');
        const imagesPath = path.join(wsPath, 'images');
        await fsp.mkdir(dataPath, { recursive: true });
        await fsp.mkdir(imagesPath, { recursive: true });
        const rootInParent = path.join(wsPath, 'root.json');
        const rootInData = path.join(dataPath, 'root.json');
        if (fs.existsSync(rootInParent) && !fs.existsSync(rootInData)) {
          await fsp.copyFile(rootInParent, rootInData);
        }
      }
    }
  } catch (err: any) {
    logDebug('error', 'STORAGE', `Error initializing disk storage at ${storageDir}: ${err.message}`, err.stack);
  }
}

// In-memory document storage initialized with multi-page diagrams
const documents: Map<string, DiagramDocument> = new Map();
documents.set(initialDiagramDocument.id, JSON.parse(JSON.stringify(initialDiagramDocument)));

// REST API Endpoints

// OpenAPI specification document
app.get('/api/openapi.json', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'OmniModel Studio REST API',
      version: '1.0.0',
      description: 'Programmatic REST API for querying, updating, and synchronizing multi-page diagrams (ERD, BPMN, UML, DFD, IDEF0, CEQA, Gantt, PERT).',
    },
    paths: {
      '/api/diagrams': {
        get: { summary: 'List all diagrams' },
        post: { summary: 'Create new diagram' },
      },
      '/api/diagrams/{id}': {
        get: { summary: 'Get complete diagram JSON document' },
        put: { summary: 'Update diagram document' },
      },
      '/api/diagrams/{id}/pages': {
        get: { summary: 'List all pages in diagram' },
        post: { summary: 'Add a new page or sub-process' },
      },
      '/api/diagrams/{id}/pages/{pageId}': {
        get: { summary: 'Get specific page nodes & edges' },
        put: { summary: 'Update specific page nodes & edges' },
        delete: { summary: 'Delete page' },
      },
      '/api/diagrams/{id}/versions': {
        get: { summary: 'Get version history commits' },
        post: { summary: 'Create a named version snapshot' },
      },
      '/api/diagrams/{id}/versions/{versionId}/restore': {
        post: { summary: 'Restore a previous version snapshot' },
      },
      '/api/sync': {
        post: { summary: 'Batch offline synchronization with conflict resolution' },
      },
    },
  });
});

// List all diagrams
app.get('/api/diagrams', (req: Request, res: Response) => {
  const list = Array.from(documents.values()).map(doc => ({
    id: doc.id,
    name: doc.name,
    pageCount: doc.pages.length,
    versionCount: doc.versions.length,
    updatedAt: doc.updatedAt,
    activePageId: doc.activePageId,
  }));
  res.json(list);
});

// Get a single diagram
app.get('/api/diagrams/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Diagram not found' });
  }
  res.json(doc);
});

// Create new diagram
app.post('/api/diagrams', (req: Request, res: Response) => {
  const newDoc: DiagramDocument = {
    id: `doc-${Date.now()}`,
    name: req.body.name || 'Untitled Diagram Suite',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activePageId: 'page-1',
    settings: {
      gridSnap: true,
      showGrid: true,
      theme: 'dark',
      showMinimap: true,
    },
    versions: [],
    pages: [
      {
        id: 'page-1',
        title: 'Main Flow',
        diagramType: 'generic',
        nodes: [],
        edges: [],
        viewport: { x: 50, y: 50, zoom: 1 },
      },
    ],
    ...req.body,
  };
  documents.set(newDoc.id, newDoc);
  res.status(201).json(newDoc);
});

// Update an entire diagram
app.put('/api/diagrams/:id', (req: Request, res: Response) => {
  const existing = documents.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Diagram not found' });
  }

  const updated: DiagramDocument = {
    ...existing,
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString(),
  };
  documents.set(req.params.id, updated);
  res.json(updated);
});

// Get pages of a diagram
app.get('/api/diagrams/:id/pages', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });
  res.json(doc.pages);
});

// Get a specific page
app.get('/api/diagrams/:id/pages/:pageId', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });
  const page = doc.pages.find(p => p.id === req.params.pageId);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
});

// Create a page
app.post('/api/diagrams/:id/pages', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  const newPage: DiagramPage = {
    id: req.body.id || `page-${Date.now()}`,
    title: req.body.title || 'New Page',
    diagramType: req.body.diagramType || 'flowchart',
    parentId: req.body.parentId,
    description: req.body.description || '',
    nodes: req.body.nodes || [],
    edges: req.body.edges || [],
    viewport: { x: 50, y: 50, zoom: 1 },
  };

  doc.pages.push(newPage);
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.status(201).json(newPage);
});

// Update a specific page
app.put('/api/diagrams/:id/pages/:pageId', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  const pageIndex = doc.pages.findIndex(p => p.id === req.params.pageId);
  if (pageIndex === -1) return res.status(404).json({ error: 'Page not found' });

  doc.pages[pageIndex] = {
    ...doc.pages[pageIndex],
    ...req.body,
    id: req.params.pageId,
  };
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.json(doc.pages[pageIndex]);
});

// Delete a page
app.delete('/api/diagrams/:id/pages/:pageId', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  if (doc.pages.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only page in a diagram' });
  }

  doc.pages = doc.pages.filter(p => p.id !== req.params.pageId);
  if (doc.activePageId === req.params.pageId) {
    doc.activePageId = doc.pages[0].id;
  }
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.json({ success: true, activePageId: doc.activePageId });
});

// Get version history
app.get('/api/diagrams/:id/versions', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });
  res.json(doc.versions);
});

// Commit a new version snapshot
app.post('/api/diagrams/:id/versions', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  const nextVer = (doc.versions.length ? Math.max(...doc.versions.map(v => v.versionNumber)) : 0) + 1;
  const newVersion: DiagramVersion = {
    id: `ver-${Date.now()}`,
    versionNumber: nextVer,
    name: req.body.name || `v${nextVer}.0 Release`,
    description: req.body.description || 'Snapshot commit',
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'Admin User',
    changesSummary: req.body.changesSummary || 'Model update committed',
    snapshot: {
      pages: JSON.parse(JSON.stringify(doc.pages)),
      activePageId: doc.activePageId,
    },
  };

  doc.versions.unshift(newVersion);
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.status(201).json(newVersion);
});

// Restore version
app.post('/api/diagrams/:id/versions/:versionId/restore', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  const version = doc.versions.find(v => v.id === req.params.versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  doc.pages = JSON.parse(JSON.stringify(version.snapshot.pages));
  doc.activePageId = version.snapshot.activePageId;
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.json({ success: true, restoredVersion: version.name, doc });
});

// Batch offline sync endpoint
app.post('/api/sync', (req: Request, res: Response) => {
  const { documentId, mutations, clientTimestamp } = req.body;
  const doc = documents.get(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found for sync' });
  }

  // Apply mutations in order
  let appliedCount = 0;
  if (Array.isArray(mutations)) {
    for (const item of mutations) {
      if (item.action === 'UPDATE_PAGE' && item.payload?.pageId) {
        const pageIdx = doc.pages.findIndex(p => p.id === item.payload.pageId);
        if (pageIdx !== -1) {
          doc.pages[pageIdx] = { ...doc.pages[pageIdx], ...item.payload.data };
          appliedCount++;
        }
      } else if (item.action === 'CREATE_PAGE' && item.payload) {
        doc.pages.push(item.payload);
        appliedCount++;
      }
    }
  }

  doc.updatedAt = new Date().toISOString();
  documents.set(documentId, doc);

  res.json({
    synced: true,
    appliedMutations: appliedCount,
    serverTimestamp: new Date().toISOString(),
    latestDocument: doc,
  });
});

// Export diagram
app.get('/api/export/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Diagram not found' });

  const format = req.query.format || 'json';
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json"`);
    return res.json(doc);
  }

  // Fallback json
  res.json(doc);
});

// GitHub Integration Endpoints

// Check git status & commits
app.get('/api/github/status', async (req: Request, res: Response) => {
  try {
    const { stdout: status } = await execAsync('git status -s');
    const { stdout: branch } = await execAsync('git branch --show-current || echo main');
    const { stdout: commits } = await execAsync('git log -n 5 --oneline || echo "Initial commit"');
    const { stdout: remote } = await execAsync('git remote -v || echo ""');

    res.json({
      initialized: true,
      branch: branch.trim(),
      changes: status.trim() ? status.trim().split('\n') : [],
      recentCommits: commits.trim().split('\n'),
      remote: remote.trim(),
      targetRepo: 'https://github.com/gr677/mind_suite.git',
    });
  } catch (err: any) {
    res.json({
      initialized: false,
      error: err.message,
      targetRepo: 'https://github.com/gr677/mind_suite.git',
    });
  }
});

// Push to GitHub using Personal Access Token
app.post('/api/github/push', async (req: Request, res: Response) => {
  const { token, repoUrl = 'https://github.com/gr677/mind_suite.git' } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'GitHub Personal Access Token is required to authenticate push.' });
  }

  try {
    const cleanUrl = repoUrl.replace(/^https:\/\//, '');
    const authUrl = `https://${encodeURIComponent(token.trim())}@${cleanUrl}`;

    // Ensure all changes are staged and committed
    await execAsync('git config user.name "gr677" && git config user.email "gordon.robb@gmail.com"');
    await execAsync('git add .');
    await execAsync('git commit -m "feat: complete Mind Suite enterprise diagramming suite" || true');
    await execAsync('git branch -M main');

    // Run push
    const { stdout, stderr } = await execAsync(`git push -u "${authUrl}" main --force`);

    res.json({
      success: true,
      message: 'Successfully pushed codebase to https://github.com/gr677/mind_suite.git!',
      output: (stdout || stderr || 'Pushed successfully.').replace(new RegExp(token, 'g'), '***'),
    });
  } catch (err: any) {
    const safeError = err.message ? err.message.replace(new RegExp(token, 'g'), '***') : 'Git push error';
    res.status(500).json({
      error: safeError,
      hint: 'Verify that your GitHub token has the "repo" (or Contents: Read and write) scope enabled.',
    });
  }
});

// Pull from public GitHub repository (public repos allow unauthenticated pulls)
app.post('/api/github/pull', async (req: Request, res: Response) => {
  const { repoUrl = 'https://github.com/gr677/mind_suite.git' } = req.body;
  try {
    const { stdout, stderr } = await execAsync(`git pull "${repoUrl}" main --no-rebase || git pull "${repoUrl}" main`);
    res.json({
      success: true,
      message: 'Successfully pulled latest changes from GitHub repository!',
      output: stdout || stderr || 'Already up to date.',
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to pull from GitHub repository.',
    });
  }
});

// Download full repository archive as zip file
app.get('/api/github/archive', async (req: Request, res: Response) => {
  try {
    const archivePath = '/tmp/mind_suite_codebase.zip';
    await execAsync(`git archive --format=zip --prefix=mind_suite/ HEAD -o ${archivePath}`);
    res.download(archivePath, 'mind_suite_full_project.zip');
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create zip archive: ' + err.message });
  }
});

// ==========================================
// WORKSPACE & PHYSICAL DISK STORAGE API
// ==========================================
// PERSISTENT SETTINGS & DISK STORAGE API
// ==========================================

// 0. Persistent Settings & Preferences API (Survives Git Pulls & App Updates)
app.get('/api/settings', (req: Request, res: Response) => {
  const settings = getPersistentSettings();
  res.json({
    success: true,
    settings,
    locations: {
      userHomeConfig: getUserConfigFilePath(),
      appDataConfig: getAppDataConfigFilePath(),
      localConfig: getLocalConfigFilePath(),
      rootDataConfig: path.join(getPhysicalStorageDir(), '.mind_suite_settings.json'),
    },
    isExternalPersisted: true,
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const updates = req.body || {};
  const { settings, savedLocations } = savePersistentSettings(updates);
  res.json({
    success: true,
    settings,
    savedLocations,
    message: `Settings saved across ${savedLocations.length} locations (user home profile protected from git pull)`,
  });
});

// 1. Get Root Directory Configuration
app.get('/api/storage/config', (req: Request, res: Response) => {
  const settings = getPersistentSettings();
  const configuredRootDir = settings.rootDir || DEFAULT_CONFIGURED_ROOT;
  res.json({
    configuredRootDir,
    serverDataDir: getPhysicalStorageDir(),
    defaultEntrypoint: 'root.json',
    settings,
    locations: {
      userHomeConfig: getUserConfigFilePath(),
      appDataConfig: getAppDataConfigFilePath(),
      localConfig: getLocalConfigFilePath(),
      rootDataConfig: path.join(getPhysicalStorageDir(), '.mind_suite_settings.json'),
    },
    isExternalPersisted: true,
  });
});

// 0. Server Debug Logs Endpoint for In-App and Diagnostics View
app.get('/api/debug/logs', (req: Request, res: Response) => {
  const storageDir = getPhysicalStorageDir();
  res.json({
    total: serverDebugLogs.length,
    platform: process.platform,
    nodeVersion: process.version,
    serverDataDir: storageDir,
    configuredRootDir: getConfiguredRootDir(),
    logs: serverDebugLogs,
  });
});

// 2. Update Root Directory Configuration
app.post('/api/storage/config', (req: Request, res: Response) => {
  const { rootDir, ...otherSettings } = req.body || {};
  if (!rootDir || typeof rootDir !== 'string') {
    logDebug('warn', 'STORAGE CONFIG', 'Rejected rootDir update: rootDir string is required');
    return res.status(400).json({ error: 'rootDir string is required' });
  }
  const updated = setConfiguredRootDir(rootDir);
  if (Object.keys(otherSettings).length > 0) {
    savePersistentSettings(otherSettings);
  }
  const settings = getPersistentSettings();
  logDebug('info', 'STORAGE CONFIG', `Configured root directory updated to: "${updated}" and persisted outside git`);
  res.json({
    success: true,
    configuredRootDir: updated,
    settings,
    locations: {
      userHomeConfig: getUserConfigFilePath(),
      appDataConfig: getAppDataConfigFilePath(),
    },
    message: `Root directory configured to ${updated} (persisted in user home profile outside git repository)`,
  });
});

// 3. List all workspaces and their files on server disk (in <workspace>/data/)
app.get('/api/workspaces', async (req: Request, res: Response) => {
  try {
    await initStorageOnDisk();
    const storageDir = getPhysicalStorageDir();
    await fsp.mkdir(storageDir, { recursive: true });
    const entries = await fsp.readdir(storageDir, { withFileTypes: true });
    const workspaceFolders = entries.filter(
      e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('$')
    );

    const result = await Promise.all(
      workspaceFolders.map(async folder => {
        const wsId = folder.name;
        const wsPath = path.join(storageDir, wsId);
        const dataPath = path.join(wsPath, 'data');
        const imagesPath = path.join(wsPath, 'images');
        const scriptsPath = path.join(wsPath, 'scripts');
        await fsp.mkdir(dataPath, { recursive: true });
        await fsp.mkdir(imagesPath, { recursive: true });
        await fsp.mkdir(scriptsPath, { recursive: true });

        // Seed default scripts if not present
        const assetScript = path.join(scriptsPath, 'asset.py');
        const cryptoScript = path.join(scriptsPath, 'crypto_gbp.py');
        const templateAsset = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'asset_9f86d022.py');
        const templateCrypto = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'crypto_gbp_d8ff28cf.py');
        if (!fs.existsSync(assetScript) && fs.existsSync(templateAsset)) {
          try { await fsp.copyFile(templateAsset, assetScript); } catch {}
        }
        if (!fs.existsSync(cryptoScript) && fs.existsSync(templateCrypto)) {
          try { await fsp.copyFile(templateCrypto, cryptoScript); } catch {}
        }

        // Migrate root.json from parent if it was placed there previously
        const rootInParent = path.join(wsPath, 'root.json');
        const rootInData = path.join(dataPath, 'root.json');
        if (fs.existsSync(rootInParent) && !fs.existsSync(rootInData)) {
          await fsp.copyFile(rootInParent, rootInData);
        }

        const fileEntries = await fsp.readdir(dataPath, { withFileTypes: true });
        const jsonFiles = fileEntries.filter(f => f.isFile() && f.name.endsWith('.json'));

        const files = await Promise.all(
          jsonFiles.map(async file => {
            const filePath = path.join(dataPath, file.name);
            const stats = await fsp.stat(filePath);
            let name = file.name.replace('.json', '');
            try {
              const content = await fsp.readFile(filePath, 'utf-8');
              const parsed = JSON.parse(content);
              if (parsed?.name) name = parsed.name;
            } catch {
              // ignore parse errors for preview
            }

            return {
              filename: file.name,
              name,
              isRoot: file.name === 'root.json',
              sizeBytes: stats.size,
              lastModified: stats.mtime.toISOString(),
              physicalPath: filePath,
              configuredPath: toWindowsPath(getConfiguredRootDir(), wsId, file.name),
            };
          })
        );

        return {
          id: wsId,
          name: wsId,
          basePath: normalizeToWindowsPath(getConfiguredRootDir()),
          defaultEntrypoint: 'root.json',
          files,
        };
      })
    );

    logDebug('info', 'STORAGE', `Listed ${result.length} workspaces from disk (${storageDir})`);
    res.json(result);
  } catch (err: any) {
    logDebug('error', 'STORAGE', `Failed to list workspaces on disk: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to list workspaces on server disk' });
  }
});

// 4. Create new workspace on server disk with data/root.json
app.post('/api/workspaces', async (req: Request, res: Response) => {
  try {
    const rawName = req.body.name || `workspace_${Date.now()}`;
    const safeId = sanitizeName(rawName.trim().toLowerCase()) || `workspace_${Date.now()}`;
    const storageDir = getPhysicalStorageDir();
    const wsDir = path.join(storageDir, safeId);
    const dataDir = path.join(wsDir, 'data');
    const imagesDir = path.join(wsDir, 'images');
    await fsp.mkdir(dataDir, { recursive: true });
    await fsp.mkdir(imagesDir, { recursive: true });

    const rootPath = path.join(dataDir, 'root.json');
    const winPath = toWindowsPath(getConfiguredRootDir(), safeId, 'root.json');

    logDebug('info', 'STORAGE WORKSPACE', `Creating workspace "${safeId}" at ${dataDir}`);

    // Create data/root.json starting point with requested diagramType template (default: mindmap)
    if (!fs.existsSync(rootPath)) {
      const requestedType: DiagramType = (req.body.diagramType || 'mindmap') as DiagramType;
      let templateDoc = req.body.templateDoc;
      if (!templateDoc) {
        const starterPage = getExampleDiagramForType(requestedType);
        templateDoc = {
          id: `doc-${safeId}-root`,
          name: `${req.body.name || safeId} Architecture`,
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
      }
      await fsp.writeFile(rootPath, JSON.stringify(templateDoc, null, 2), 'utf-8');
      logDebug('success', 'STORAGE WORKSPACE', `Initialized root.json template (${requestedType}) in workspace "${safeId}"`);
    }

    res.status(201).json({
      success: true,
      id: safeId,
      name: req.body.name || safeId,
      basePath: getConfiguredRootDir(),
      entrypoint: 'root.json',
      physicalPath: rootPath,
      configuredPath: winPath,
    });
  } catch (err: any) {
    logDebug('error', 'STORAGE WORKSPACE', `Failed to create workspace "${req.body?.name}": ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to create workspace on server disk' });
  }
});

// 5. Delete an entire workspace directory from server disk
app.delete('/api/workspaces/:workspaceId', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    const storageDir = getPhysicalStorageDir();
    const wsDir = path.join(storageDir, safeWs);

    logDebug('warn', 'STORAGE WORKSPACE', `Deleting workspace directory: "${safeWs}" at ${wsDir}`);

    if (fs.existsSync(wsDir)) {
      await fsp.rm(wsDir, { recursive: true, force: true });
      logDebug('success', 'STORAGE WORKSPACE', `Successfully removed workspace directory: "${safeWs}"`);
      return res.json({
        success: true,
        workspaceId: safeWs,
        message: `Deleted workspace directory ${safeWs} from server disk.`,
      });
    }

    logDebug('warn', 'STORAGE WORKSPACE', `Workspace directory not found for deletion: "${safeWs}"`);
    res.status(404).json({ error: `Workspace directory not found: ${safeWs}` });
  } catch (err: any) {
    logDebug('error', 'STORAGE WORKSPACE', `Failed to delete workspace "${req.params.workspaceId}": ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to delete workspace directory from server disk' });
  }
});

// 6. Get a specific JSON diagram file from server disk (checking <workspace>/data/<filename>)
app.get('/api/workspaces/:workspaceId/files/:filename', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    let safeFile = sanitizeName(req.params.filename);
    if (!safeFile.endsWith('.json')) safeFile += '.json';

    const storageDir = getPhysicalStorageDir();
    let filePath = path.join(storageDir, safeWs, 'data', safeFile);
    const winPath = toWindowsPath(getConfiguredRootDir(), safeWs, safeFile);

    logDebug('info', 'STORAGE READ', `Request to read diagram file "${safeFile}" from workspace "${safeWs}" (path: ${filePath})`);

    if (!fs.existsSync(filePath)) {
      // Check legacy path without data/
      const legacyPath = path.join(storageDir, safeWs, safeFile);
      if (fs.existsSync(legacyPath)) {
        filePath = legacyPath;
      } else {
        logDebug('warn', 'STORAGE READ', `File not found on server disk: ${filePath} (Windows: ${winPath})`);
        return res.status(404).json({
          error: `File not found on server disk: ${safeFile}`,
          workspaceId: safeWs,
          physicalPath: filePath,
          configuredPath: winPath,
        });
      }
    }

    const content = await fsp.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const bytes = Buffer.byteLength(content, 'utf-8');

    logDebug('success', 'STORAGE READ', `Read ${bytes} bytes from ${filePath} for file "${safeFile}"`);
    res.json(parsed);
  } catch (err: any) {
    logDebug('error', 'STORAGE READ', `Failed to read file ${req.params.filename}: ${err.message}`, err.stack);
    res.status(500).json({
      error: err.message || 'Failed to read file from server disk',
      details: String(err?.stack || err),
    });
  }
});

// 7. Save a specific JSON diagram file directly to <workspace>/data/<filename>
app.post('/api/workspaces/:workspaceId/files/:filename', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    let safeFile = sanitizeName(req.params.filename);
    if (!safeFile.endsWith('.json')) safeFile += '.json';

    // Prevent saving files named "_object_Object_.json" from event serialization errors
    if (safeFile.toLowerCase().includes('object_object') || safeFile === '_.json' || safeFile === '_object_.json') {
      logDebug('warn', 'STORAGE SAVE', `Blocked invalid filename "${safeFile}", defaulting to "root.json"`);
      safeFile = 'root.json';
    }

    const configuredRoot = getConfiguredRootDir();
    const winPath = toWindowsPath(configuredRoot, safeWs, safeFile);
    const storageDir = getPhysicalStorageDir();

    logDebug('info', 'STORAGE SAVE', `>>> Incoming SAVE for workspace="${safeWs}", file="${safeFile}"`);
    logDebug('info', 'STORAGE SAVE', `Target Windows Path: "${winPath}"`);

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      logDebug('error', 'STORAGE SAVE', `Rejecting save: Request body is empty or not a JSON object`);
      return res.status(400).json({
        success: false,
        error: 'Invalid diagram payload: Request body must be a valid JSON object',
      });
    }

    const pagesCount = Array.isArray(req.body.pages) ? req.body.pages.length : 0;
    let totalNodes = 0;
    let totalEdges = 0;
    if (Array.isArray(req.body.pages)) {
      req.body.pages.forEach((p: any) => {
        if (Array.isArray(p.nodes)) totalNodes += p.nodes.length;
        if (Array.isArray(p.edges)) totalEdges += p.edges.length;
      });
    }

    logDebug(
      'info',
      'STORAGE SAVE',
      `Payload stats: Name="${req.body.name || safeFile}", Pages=${pagesCount}, Nodes=${totalNodes}, Edges=${totalEdges}`
    );

    const dataDir = path.join(storageDir, safeWs, 'data');
    await fsp.mkdir(dataDir, { recursive: true });

    const filePath = path.join(dataDir, safeFile);
    const jsonStr = JSON.stringify(req.body, null, 2);
    const bytes = Buffer.byteLength(jsonStr, 'utf-8');

    await fsp.writeFile(filePath, jsonStr, 'utf-8');

    // Also update in-memory cache if it matches an active doc
    if (req.body?.id) {
      documents.set(req.body.id, req.body);
    }

    const duration = Date.now() - startTime;
    logDebug(
      'success',
      'STORAGE SAVE',
      `Written ${bytes} bytes directly to ${filePath} (${duration}ms). Windows Path: ${winPath}`
    );

    res.json({
      success: true,
      workspaceId: safeWs,
      filename: safeFile,
      isRoot: safeFile === 'root.json',
      bytes,
      physicalPath: filePath,
      configuredPath: winPath,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      stats: { pages: pagesCount, nodes: totalNodes, edges: totalEdges },
      message: `Successfully written ${safeFile} to disk at ${filePath}`,
    });
  } catch (err: any) {
    logDebug('error', 'STORAGE SAVE', `FAILED to save diagram: ${err.message}`, err.stack);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to write file to server disk',
      details: String(err?.stack || err),
    });
  }
});

// 8. Delete a diagram file from <workspace>/data/
app.delete('/api/workspaces/:workspaceId/files/:filename', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    let safeFile = sanitizeName(req.params.filename);
    if (!safeFile.endsWith('.json')) safeFile += '.json';

    if (safeFile === 'root.json') {
      logDebug('warn', 'STORAGE DELETE', `Attempted to delete root.json in workspace "${safeWs}" - blocked`);
      return res.status(400).json({
        error: 'Cannot delete root.json: every workspace requires a root.json file in its data directory as its starting entrypoint.',
      });
    }

    const storageDir = getPhysicalStorageDir();
    const filePath = path.join(storageDir, safeWs, 'data', safeFile);
    logDebug('warn', 'STORAGE DELETE', `Deleting diagram file "${safeFile}" from workspace "${safeWs}" (path: ${filePath})`);

    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
      logDebug('success', 'STORAGE DELETE', `Deleted ${safeFile} from disk`);
      return res.json({ success: true, message: `Deleted ${safeFile} from server disk` });
    }

    logDebug('warn', 'STORAGE DELETE', `File does not exist on disk for deletion: ${filePath}`);
    res.status(404).json({ error: 'File does not exist on server disk' });
  } catch (err: any) {
    logDebug('error', 'STORAGE DELETE', `Failed to delete file ${req.params.filename}: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to delete file from server disk' });
  }
});

// 8b. Upload / Import image into <workspace>/images/ (sibling of data/)
app.post('/api/workspaces/:workspaceId/images', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId) || 'workspace1';
    let storageDir = getPhysicalStorageDir();
    let imagesDir = path.join(storageDir, safeWs, 'images');
    try {
      await fsp.mkdir(imagesDir, { recursive: true });
    } catch (mkdirErr: any) {
      if (storageDir !== FALLBACK_STORAGE_DIR) {
        logDebug(
          'warn',
          'STORAGE IMAGE',
          `Cannot create images directory in "${storageDir}" (${mkdirErr.code || mkdirErr.message}). Falling back to "${FALLBACK_STORAGE_DIR}"`
        );
        effectiveStorageDir = FALLBACK_STORAGE_DIR;
        storageDir = FALLBACK_STORAGE_DIR;
        imagesDir = path.join(storageDir, safeWs, 'images');
        await fsp.mkdir(imagesDir, { recursive: true });
      } else {
        throw mkdirErr;
      }
    }

    // Accept dataUrl, data, base64, or image field names
    const rawData = req.body?.dataUrl || req.body?.data || req.body?.base64 || req.body?.image;
    if (!rawData || typeof rawData !== 'string') {
      const keys = Object.keys(req.body || {}).join(', ');
      logDebug('warn', 'STORAGE IMAGE', `Rejected image upload: Missing image data string. Body keys: [${keys}]`);
      return res.status(400).json({
        error: 'Missing image data (expected dataUrl, data, or base64) in request body',
        receivedKeys: Object.keys(req.body || {})
      });
    }

    const origFilename = (req.body.filename || req.body.name || req.body.title || 'image.png').trim();
    let ext = path.extname(origFilename).toLowerCase();
    if (!ext) {
      if (rawData.startsWith('data:image/jpeg') || rawData.startsWith('data:image/jpg')) ext = '.jpg';
      else if (rawData.startsWith('data:image/svg')) ext = '.svg';
      else if (rawData.startsWith('data:image/webp')) ext = '.webp';
      else if (rawData.startsWith('data:image/gif')) ext = '.gif';
      else ext = '.png';
    }

    const baseName = sanitizeName(path.basename(origFilename, ext)) || `img_${Date.now()}`;
    let safeFilename = `${baseName}${ext}`;
    let filePath = path.join(imagesDir, safeFilename);

    // If file already exists with same name, add timestamp suffix to avoid overwriting unless intended
    if (fs.existsSync(filePath)) {
      safeFilename = `${baseName}_${Date.now().toString().slice(-4)}${ext}`;
      filePath = path.join(imagesDir, safeFilename);
    }

    // Convert dataUrl (base64) to Buffer and save
    const base64Data = rawData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await fsp.writeFile(filePath, buffer);

    logDebug('success', 'STORAGE IMAGE', `Saved image "${safeFilename}" to ${filePath} (${buffer.length} bytes)`);

    const imageUrl = `/api/workspaces/${safeWs}/images/${safeFilename}`;
    const imgId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/png';

    res.status(201).json({
      id: imgId,
      success: true,
      filename: safeFilename,
      url: imageUrl,
      size: buffer.length,
      mimeType: mime,
      uploadedAt: new Date().toISOString(),
      title: req.body.title || baseName,
      physicalPath: filePath,
    });
  } catch (err: any) {
    logDebug('error', 'STORAGE IMAGE', `Failed to upload image: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to upload image to workspace images directory' });
  }
});

// 8c. List all images in <workspace>/images/
app.get('/api/workspaces/:workspaceId/images', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    const storageDir = getPhysicalStorageDir();
    const imagesDir = path.join(storageDir, safeWs, 'images');
    await fsp.mkdir(imagesDir, { recursive: true });

    const entries = await fsp.readdir(imagesDir, { withFileTypes: true });
    const imageFiles = [];
    const validExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.ico']);

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (validExtensions.has(ext)) {
          const fullPath = path.join(imagesDir, entry.name);
          const stat = await fsp.stat(fullPath);
          imageFiles.push({
            filename: entry.name,
            title: entry.name.replace(/\.[^/.]+$/, ''),
            url: `/api/workspaces/${safeWs}/images/${entry.name}`,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          });
        }
      }
    }

    res.json(imageFiles);
  } catch (err: any) {
    logDebug('error', 'STORAGE IMAGE', `Failed to list images: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message || 'Failed to list images' });
  }
});

// 8d. Serve an image from <workspace>/images/:filename
app.get('/api/workspaces/:workspaceId/images/:filename', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    const safeFilename = sanitizeName(req.params.filename);
    const storageDir = getPhysicalStorageDir();
    const filePath = path.join(storageDir, safeWs, 'images', safeFilename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(filePath);
    }
    res.status(404).json({ error: 'Image not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to serve image' });
  }
});

// 8e. Delete an image from <workspace>/images/:filename
app.delete('/api/workspaces/:workspaceId/images/:filename', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    const safeFilename = sanitizeName(req.params.filename);
    const storageDir = getPhysicalStorageDir();
    const filePath = path.join(storageDir, safeWs, 'images', safeFilename);

    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
      logDebug('success', 'STORAGE IMAGE', `Deleted image "${safeFilename}" from ${filePath}`);
      return res.json({ success: true, message: `Deleted ${safeFilename}` });
    }
    res.status(404).json({ error: 'Image not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete image' });
  }
});

// 8f. List scripts in <workspace>/scripts
app.get('/api/workspaces/:workspaceId/scripts', async (req: Request, res: Response) => {
  try {
    const safeWs = sanitizeName(req.params.workspaceId);
    const storageDir = getPhysicalStorageDir();
    const scriptsDir = path.join(storageDir, safeWs, 'scripts');
    await fsp.mkdir(scriptsDir, { recursive: true });

    // Seed default scripts if not present
    const assetScript = path.join(scriptsDir, 'asset.py');
    const cryptoScript = path.join(scriptsDir, 'crypto_gbp.py');
    const templateAsset = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'asset_9f86d022.py');
    const templateCrypto = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'crypto_gbp_d8ff28cf.py');
    if (!fs.existsSync(assetScript) && fs.existsSync(templateAsset)) {
      try { await fsp.copyFile(templateAsset, assetScript); } catch {}
    }
    if (!fs.existsSync(cryptoScript) && fs.existsSync(templateCrypto)) {
      try { await fsp.copyFile(templateCrypto, cryptoScript); } catch {}
    }

    const files = await fsp.readdir(scriptsDir);
    const pyFiles = files.filter(f => f.endsWith('.py'));
    res.json({ success: true, workspaceId: safeWs, scripts: pyFiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list workspace scripts' });
  }
});

// Helper to evaluate a script call expression via Python3 (with Node.js fallback)
async function evaluateScriptExpression(workspaceId: string, rawExpression: string): Promise<{ success: boolean; result?: number; formatted?: string; error?: string }> {
  const trimmed = rawExpression.trim();
  const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*\(([\s\S]*)\)$/);
  if (!match) {
    return { success: false, error: `Invalid script expression: ${rawExpression}` };
  }

  const fnName = match[1];
  const argsRaw = match[2];

  // Parse arguments carefully: support single/double quotes and numbers
  let parsedArgs: any[] = [];
  try {
    // Try wrapping in brackets and parsing with relaxed quotes
    const jsonReady = argsRaw
      .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"')
      .trim();
    parsedArgs = JSON.parse(`[${jsonReady}]`);
  } catch {
    // Regex tokenize fallback
    const tokens = argsRaw.split(',').map(s => {
      const t = s.trim().replace(/^['"]|['"]$/g, '');
      const num = Number(t);
      return !isNaN(num) && t !== '' ? num : t;
    });
    parsedArgs = tokens;
  }

  const storageDir = getPhysicalStorageDir();
  const scriptPath = path.join(storageDir, sanitizeName(workspaceId), 'scripts', `${fnName}.py`);
  
  // Also check fallback in public assets
  let targetScriptPath = scriptPath;
  if (!fs.existsSync(targetScriptPath)) {
    if (fnName === 'asset') {
      targetScriptPath = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'asset_9f86d022.py');
    } else if (fnName === 'crypto_gbp') {
      targetScriptPath = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'crypto_gbp_d8ff28cf.py');
    }
  }

  // 1. Try executing via Python 3 with urllib/requests fallback
  if (fs.existsSync(targetScriptPath)) {
    const pythonCode = `
import sys, json, os, urllib.request, urllib.parse

# Inject requests fallback shim if not installed
if 'requests' not in sys.modules:
    try:
        import requests
    except ImportError:
        class RequestsResponse:
            def __init__(self, data, status_code=200):
                self._data = data
                self.status_code = status_code
            def json(self):
                return json.loads(self._data.decode('utf-8'))
            def raise_for_status(self):
                if self.status_code >= 400:
                    raise Exception(f'HTTP {self.status_code}')
        class RequestsShim:
            @staticmethod
            def get(url, params=None, headers=None, timeout=15):
                if params:
                    url += '?' + urllib.parse.urlencode(params)
                req = urllib.request.Request(url, headers=headers or {'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return RequestsResponse(resp.read(), resp.status)
        sys.modules['requests'] = RequestsShim()

import importlib.util
script_path = sys.argv[1]
args_json = sys.argv[2]
args = json.loads(args_json)

spec = importlib.util.spec_from_file_location('custom_script', script_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

if not hasattr(mod, 'evaluate'):
    raise Exception("Script does not define an evaluate(...) function")

result = mod.evaluate(*args)
print(json.dumps({"success": True, "result": result}))
`;

    try {
      const argsJson = JSON.stringify(parsedArgs);
      // Run Python script safely via execFileAsync (no shell escaping issues)
      const { stdout } = await execFileAsync('python3', ['-c', pythonCode, targetScriptPath, argsJson], {
        timeout: 15000,
      });

      const parsed = JSON.parse(stdout.trim());
      if (parsed.success && (typeof parsed.result === 'number' || !isNaN(parseFloat(parsed.result)))) {
        const num = parseFloat(parsed.result);
        return { success: true, result: Math.round(num * 100) / 100, formatted: `£${(Math.round(num * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
      }
    } catch (pyErr: any) {
      logDebug('warn', 'PYTHON SCRIPT', `Python exec failed, trying Node fallback for ${fnName}: ${pyErr.message}`);
    }
  }

  // 2. High-availability Node.js fallback for asset and crypto_gbp
  try {
    if (fnName === 'asset' && parsedArgs.length >= 3) {
      const [ticker, shares, fromCurrency] = parsedArgs;
      const cleanTicker = String(ticker).toUpperCase().trim();
      const numShares = parseFloat(shares);
      const cleanFromCurr = String(fromCurrency).toUpperCase().trim();

      const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1m&range=1d`;
      const yfRes = await fetch(yfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!yfRes.ok) throw new Error(`Yahoo Finance HTTP ${yfRes.status}`);
      const yfData: any = await yfRes.json();
      const meta = yfData?.chart?.result?.[0]?.meta;
      const priceNative = parseFloat(meta?.regularMarketPrice || meta?.previousClose || meta?.chartPreviousClose || 0);

      let fx = 1.0;
      if (cleanFromCurr === 'GBX') {
        const resVal = Math.round(((priceNative / 100) * numShares) * 100) / 100;
        return { success: true, result: resVal, formatted: `£${resVal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
      }
      if (cleanFromCurr !== 'GBP') {
        const fxRes = await fetch(`https://api.frankfurter.app/latest?from=${cleanFromCurr}&to=GBP`);
        if (fxRes.ok) {
          const fxData: any = await fxRes.json();
          fx = parseFloat(fxData?.rates?.GBP || 1.0);
        }
      }
      const totalGbp = Math.round((priceNative * fx * numShares) * 100) / 100;
      return { success: true, result: totalGbp, formatted: `£${totalGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
    }

    if (fnName === 'crypto_gbp' && parsedArgs.length >= 2) {
      const [amount, cryptoSymbol] = parsedArgs;
      const numAmount = parseFloat(amount);
      const cleanSymbol = String(cryptoSymbol).toUpperCase().trim();

      const cbRes = await fetch(`https://api.coinbase.com/v2/exchange-rates?currency=${cleanSymbol}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Cortex-Engine)' },
      });
      if (!cbRes.ok) throw new Error(`Coinbase HTTP ${cbRes.status}`);
      const cbData: any = await cbRes.json();
      const gbpRate = parseFloat(cbData?.data?.rates?.GBP);
      if (!isNaN(gbpRate)) {
        const total = Math.round((numAmount * gbpRate) * 100) / 100;
        return { success: true, result: total, formatted: `£${total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
      }
    }
  } catch (nodeErr: any) {
    logDebug('error', 'SCRIPT EVAL', `Node fallback failed: ${nodeErr.message}`);
  }

  return { success: false, error: `Could not evaluate script expression '${rawExpression}'` };
}

// 8g. Evaluate a single python script expression e.g. asset('TSLA', 1392, 'USD')
app.post('/api/workspaces/:workspaceId/scripts/evaluate', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { expression } = req.body;
    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ success: false, error: 'expression string is required' });
    }

    const evalResult = await evaluateScriptExpression(workspaceId, expression);
    res.json(evalResult);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Evaluation failed' });
  }
});

// 8h. Evaluate batch of script expressions in parallel
app.post('/api/workspaces/:workspaceId/scripts/evaluate-batch', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { expressions } = req.body;
    if (!Array.isArray(expressions)) {
      return res.status(400).json({ success: false, error: 'expressions array is required' });
    }

    const results: Record<string, { result: number; formatted: string }> = {};
    await Promise.all(
      expressions.map(async (expr: string) => {
        try {
          const evalRes = await evaluateScriptExpression(workspaceId, expr);
          if (evalRes.success && typeof evalRes.result === 'number') {
            results[expr] = { result: evalRes.result, formatted: evalRes.formatted || `£${evalRes.result.toFixed(2)}` };
          }
        } catch {
          // ignore individual expression errors
        }
      })
    );

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Batch evaluation failed' });
  }
});

// 9. AI Mind Map Generator using Gemini API (Change 1)
app.post('/api/ai/generate-mindmap', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { topic, extendMode, existingNodes, existingEdges, currentTitle } = req.body;
    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid topic or description for the mind map.',
      });
    }

    let apiKey = (process.env.GEMINI_API_KEY || '').trim();
    // Strip surrounding quotes that often come from Windows set "KEY=..." or set KEY="value"
    apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

    // Secondary fallback: inspect local .env file directly if process.env wasn't hydrated
    if (!apiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
          if (match && match[1]) {
            apiKey = match[1].trim().replace(/^["']|["']$/g, '').trim();
          }
        }
      } catch (err) {
        logDebug('warn', 'GEMINI_AI', 'Could not read .env fallback', err);
      }
    }

    if (!apiKey) {
      logDebug('warn', 'GEMINI_AI', 'GEMINI_API_KEY is not defined in server environment');
      return res.status(400).json({
        success: false,
        error:
          'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY=your_key to your .env file or set it in your server startup environment.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

    // Helper to format NodeUrlLink objects
    const formatLinks = (linksArray?: any[]) => {
      if (!Array.isArray(linksArray)) return undefined;
      const valid = linksArray
        .filter(l => l && l.url && typeof l.url === 'string')
        .map((l, idx) => ({
          id: `link-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          label: (l.label || l.title || 'Reference').slice(0, 32),
          url: l.url.trim(),
        }));
      return valid.length > 0 ? valid : undefined;
    };

    // =========================================================================
    // BRANCH A: EXTEND EXISTING MIND MAP (User already has nodes on the canvas)
    // =========================================================================
    if (extendMode === true && Array.isArray(existingNodes) && existingNodes.length > 0) {
      logDebug('info', 'GEMINI_AI', `Extending existing mind map (${existingNodes.length} nodes) for prompt: "${topic.slice(0, 80)}..."`);

      const nodeSummary = existingNodes.slice(0, 40).map((n: any) => ({
        id: String(n.id),
        label: String(n.label || 'Untitled'),
        level: n.data?.level ?? 1,
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
        description: (n.documentation?.description || '').slice(0, 140),
      }));

      const extendPromptText = `You are an expert system architect and knowledge mapper extending an existing mind map.
The current mind map already contains the following existing nodes on the canvas:
${JSON.stringify(nodeSummary, null, 2)}

The user has given this request to expand and add to this mind map:
"${topic.trim()}"

INSTRUCTIONS FOR EXTENDING:
1. Examine the existing nodes and the user prompt.
2. Determine which existing node(s) the new concept(s) should attach to.
   - For each new branch, you MUST provide "parentNodeId" which EXACTLY matches one of the existing node IDs from the list above.
3. Generate 1 to 4 new branch concept(s) that directly build upon and expand the existing mind map according to the user's prompt.
4. For every new node, provide in-depth technical explanations. If the prompt requests a specific description length (e.g. 10 sentences per node, or comprehensive paragraphs), faithfully fulfill that requirement with thorough, informative technical explanations, architectural context, best practices, and trade-offs. If no specific length is specified, provide rich, detailed explanations (3-8 sentences per node) rather than brief snippets.
5. For every node where appropriate, include authoritative, high-quality external reference URL links.
6. Each new branch can also have 1 to 3 subbranches.

Return a JSON object conforming to the schema with:
- newBranches: An array of 1 to 4 new branches to connect to the existing mind map. Each branch must have:
  - parentNodeId: The exact ID of the existing node it connects to.
  - title: Concept name (under 5 words).
  - description: Thorough, deep technical explanation (matching any requested length, e.g. up to 10 sentences if requested).
  - color: Hex color code (e.g. #3b82f6, #10b981, #f59e0b, #ec4899, #8b5cf6, #06b6d4).
  - links: Array of 1 to 2 authoritative external URL links where appropriate.
  - subbranches: An array of 1 to 3 sub-topics under this branch, each with:
    - title: Sub-topic name (under 4 words).
    - description: In-depth technical explanation (matching requested sentence count).
    - links: Array of 1 to 2 authoritative external URL links where appropriate.`;

      let extendResponse: any = null;
      let lastExtendError: any = null;

      for (const modelName of modelsToTry) {
        try {
          logDebug('info', 'GEMINI_AI', `Attempting model ${modelName} to extend mind map...`);
          extendResponse = await ai.models.generateContent({
            model: modelName,
            contents: extendPromptText,
            config: {
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  newBranches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        parentNodeId: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        color: { type: Type.STRING },
                        links: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              url: { type: Type.STRING },
                            },
                            required: ['label', 'url'],
                          },
                        },
                        subbranches: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              title: { type: Type.STRING },
                              description: { type: Type.STRING },
                              links: {
                                type: Type.ARRAY,
                                items: {
                                  type: Type.OBJECT,
                                  properties: {
                                    label: { type: Type.STRING },
                                    url: { type: Type.STRING },
                                  },
                                  required: ['label', 'url'],
                                },
                              },
                            },
                            required: ['title', 'description'],
                          },
                        },
                      },
                      required: ['parentNodeId', 'title', 'description'],
                    },
                  },
                },
                required: ['newBranches'],
              },
            },
          });
          if (extendResponse && extendResponse.text) {
            break;
          }
        } catch (err: any) {
          lastExtendError = err;
          logDebug('warn', 'GEMINI_AI', `Model ${modelName} failed during extension: ${err?.message || err}`);
        }
      }

      if (!extendResponse || !extendResponse.text) {
        throw lastExtendError || new Error('No response from Gemini API models during mind map extension.');
      }

      const parsed = JSON.parse(extendResponse.text.trim());
      const newBranches = Array.isArray(parsed.newBranches) ? parsed.newBranches : [];

      // Calculate center of existing mind map
      const avgX = existingNodes.reduce((acc: number, n: any) => acc + (n.x || 0), 0) / existingNodes.length || 600;
      const avgY = existingNodes.reduce((acc: number, n: any) => acc + (n.y || 0), 0) / existingNodes.length || 350;

      const occupiedPositions: Array<{ x: number; y: number }> = existingNodes.map((n: any) => ({
        x: n.x || 0,
        y: n.y || 0,
      }));

      const isPositionOccupied = (x: number, y: number, tolerance = 60) => {
        return occupiedPositions.some(p => Math.abs(p.x - x) < tolerance * 1.5 && Math.abs(p.y - y) < tolerance);
      };

      const newGeneratedNodes: DiagramNode[] = [];
      const newGeneratedEdges: DiagramEdge[] = [];
      const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

      newBranches.forEach((b: any, bIdx: number) => {
        const parent =
          existingNodes.find((n: any) => n.id === b.parentNodeId) ||
          existingNodes.find((n: any) => n.data?.level === 0) ||
          existingNodes[0];

        const parentX = parent?.x ?? avgX;
        const parentY = parent?.y ?? avgY;
        const parentLevel = parent?.data?.level ?? 1;

        // Side relative to parent or center
        const side: 'left' | 'right' =
          parentX < avgX ? 'left' : parentX > avgX ? 'right' : bIdx % 2 === 0 ? 'right' : 'left';
        const color = b.color || defaultColors[(existingNodes.length + bIdx) % defaultColors.length];

        const branchX = side === 'left' ? parentX - 280 : parentX + 280;
        let branchY = parentY + (bIdx - (newBranches.length - 1) / 2) * 85;

        // Avoid overlap with existing nodes
        let attempts = 0;
        while (isPositionOccupied(branchX, branchY) && attempts < 12) {
          branchY += attempts % 2 === 0 ? 75 * (attempts + 1) : -75 * (attempts + 1);
          attempts++;
        }
        occupiedPositions.push({ x: branchX, y: branchY });

        const branchId = `mm-ext-${Date.now()}-${bIdx}`;
        newGeneratedNodes.push({
          id: branchId,
          type: 'mindmap-oval',
          label: b.title,
          x: branchX,
          y: branchY,
          width: 115,
          height: 55,
          style: {
            fill: `${color}E6`,
            stroke: color,
            strokeWidth: 2,
            textColor: '#ffffff',
            gradient: true,
          },
          data: { level: parentLevel + 1 },
          documentation: {
            description: b.description,
            status: 'approved',
            tags: ['MindMap', 'Extended'],
          },
          links: formatLinks(b.links),
        });

        // Edge from existing parent to new branch
        newGeneratedEdges.push({
          id: `edge-${parent.id}-${branchId}`,
          sourceNodeId: parent.id,
          targetNodeId: branchId,
          sourceAnchor: side === 'left' ? 'left' : 'right',
          targetAnchor: side === 'left' ? 'right' : 'left',
          type: 'curved',
          lineStyle: 'solid',
          markerStart: 'none',
          markerEnd: 'none',
          color: color,
          strokeWidth: 2.5,
        });

        // Subbranches
        const subbranches = Array.isArray(b.subbranches) ? b.subbranches : [];
        const subCount = subbranches.length;
        if (subCount > 0) {
          const subSpacingY = 70;
          const subStartY = branchY - ((subCount - 1) * subSpacingY) / 2;
          const subX = side === 'left' ? branchX - 250 : branchX + 250;

          subbranches.forEach((sub: any, sIdx: number) => {
            const subId = `mm-ext-sub-${Date.now()}-${bIdx}-${sIdx}`;
            let subY = subStartY + sIdx * subSpacingY;

            let sAttempts = 0;
            while (isPositionOccupied(subX, subY) && sAttempts < 12) {
              subY += sAttempts % 2 === 0 ? 60 * (sAttempts + 1) : -60 * (sAttempts + 1);
              sAttempts++;
            }
            occupiedPositions.push({ x: subX, y: subY });

            newGeneratedNodes.push({
              id: subId,
              type: 'mindmap-oval',
              label: sub.title,
              x: subX,
              y: subY,
              width: 115,
              height: 55,
              style: {
                fill: `${color}B3`,
                stroke: color,
                strokeWidth: 1.5,
                textColor: '#ffffff',
                gradient: true,
              },
              data: { level: parentLevel + 2 },
              documentation: {
                description: sub.description,
                status: 'approved',
                tags: ['MindMap', 'ExtendedSubtopic'],
              },
              links: formatLinks(sub.links),
            });

            newGeneratedEdges.push({
              id: `edge-${branchId}-${subId}`,
              sourceNodeId: branchId,
              targetNodeId: subId,
              sourceAnchor: side === 'left' ? 'left' : 'right',
              targetAnchor: side === 'left' ? 'right' : 'left',
              type: 'curved',
              lineStyle: 'solid',
              markerStart: 'none',
              markerEnd: 'none',
              color: color,
              strokeWidth: 2,
            });
          });
        }
      });

      const durationMs = Date.now() - startTime;
      logDebug(
        'success',
        'GEMINI_AI',
        `Extended mind map with ${newGeneratedNodes.length} new nodes and ${newGeneratedEdges.length} new edges in ${durationMs}ms`
      );

      return res.json({
        success: true,
        extended: true,
        title: currentTitle || 'Extended Mind Map',
        nodes: [...existingNodes, ...newGeneratedNodes],
        edges: [...(existingEdges || []), ...newGeneratedEdges],
        addedNodes: newGeneratedNodes,
        addedEdges: newGeneratedEdges,
        addedNodeCount: newGeneratedNodes.length,
        addedNodeIds: newGeneratedNodes.map(n => n.id),
        durationMs,
      });
    }

    // =========================================================================
    // BRANCH B: GENERATE FRESH MIND MAP FROM SCRATCH
    // =========================================================================
    logDebug('info', 'GEMINI_AI', `Generating fresh mind map for topic: "${topic.slice(0, 80)}..." using gemini-3.8-flash`);

    const promptText = `You are an expert system architect, researcher, and knowledge mapper.
Create a comprehensive, richly structured mind map for the following topic:
"${topic.trim()}"

INSTRUCTIONS FOR DEPTH, DESCRIPTIONS & URL LINKS:
- Provide comprehensive, in-depth descriptions for the central topic, every branch, and every subbranch.
- If the prompt requests a specific description length (such as 10 sentences per node, or comprehensive paragraphs), faithfully fulfill that requirement with thorough, informative technical explanations, architectural context, best practices, and trade-offs. If no specific length is specified, provide rich, detailed explanations (3-8 sentences per node) rather than brief snippets.
- For every node where appropriate, include authoritative, high-quality external reference URL links (e.g. official documentation, Wikipedia, W3C/IETF/ISO standards, GitHub projects, cloud provider docs, or developer guides).

Return a JSON object conforming to the schema with:
- title: A concise, professional title for this mind map (under 6 words).
- centralTopic: The core theme or main subject (under 5 words).
- centralDescription: Thorough summary of this theme (expand to the requested sentence count, e.g. up to 10 sentences if requested).
- links: Array of 1 to 3 authoritative external URL links for this central topic.
- branches: An array of 4 to 6 main high-level concept branches. Each branch must have:
  - title: Concept name (under 5 words).
  - description: Thorough, deep technical explanation (expand to the requested sentence count, e.g. up to 10 sentences if requested).
  - color: Hex color code for this branch family (e.g. #3b82f6, #10b981, #f59e0b, #ec4899, #8b5cf6, #06b6d4).
  - links: Array of 1 to 3 authoritative external URL links for this concept where appropriate.
  - subbranches: An array of 2 to 3 specific sub-topics/tactics/components under this branch. Each must have:
    - title: Sub-topic name (under 4 words).
    - description: In-depth technical explanation (expand to the requested sentence count, e.g. up to 10 sentences if requested).
    - links: Array of 1 to 2 authoritative external URL links where appropriate.`;

    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        logDebug('info', 'GEMINI_AI', `Attempting model ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                centralTopic: { type: Type.STRING },
                centralDescription: { type: Type.STRING },
                links: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      url: { type: Type.STRING },
                    },
                    required: ['label', 'url'],
                  },
                },
                branches: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      color: { type: Type.STRING },
                      links: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            url: { type: Type.STRING },
                          },
                          required: ['label', 'url'],
                        },
                      },
                      subbranches: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            links: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  label: { type: Type.STRING },
                                  url: { type: Type.STRING },
                                },
                                required: ['label', 'url'],
                              },
                            },
                          },
                          required: ['title', 'description'],
                        },
                      },
                    },
                    required: ['title', 'description', 'subbranches'],
                  },
                },
              },
              required: ['title', 'centralTopic', 'centralDescription', 'branches'],
            },
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        logDebug('warn', 'GEMINI_AI', `Model ${modelName} unavailable: ${err?.message || err}`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('No response from Gemini API models.');
    }

    const rawJson = (response.text || '{}').trim();
    const data = JSON.parse(rawJson);

    const title = data.title || 'Mind Map';
    const centralTopic = data.centralTopic || topic.trim();
    const centralDescription = data.centralDescription || `Mind map exploration of ${topic.trim()}`;
    const branches = Array.isArray(data.branches) ? data.branches : [];

    // Using formatLinks defined above for Branch A and B

    // Construct diagram nodes & edges with radial coordinate distribution
    const generatedNodes: DiagramNode[] = [];
    const generatedEdges: DiagramEdge[] = [];

    // Central Root Node (Standard mind map oval dimensions: width 115, height 55)
    const coreId = `mm-core-${Date.now()}`;
    const coreX = 600;
    const coreY = 350;
    const coreWidth = 115;
    const coreHeight = 55;

    generatedNodes.push({
      id: coreId,
      type: 'mindmap-oval',
      label: centralTopic,
      x: coreX,
      y: coreY,
      width: coreWidth,
      height: coreHeight,
      style: {
        fill: 'rgba(124, 58, 237, 0.95)',
        stroke: '#c084fc',
        strokeWidth: 3,
        textColor: '#ffffff',
        gradient: true,
      },
      data: { level: 0 },
      documentation: {
        description: centralDescription,
        status: 'approved',
        tags: ['MindMap', 'CentralTopic'],
      },
      links: formatLinks(data.links),
    });

    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

    // Split branches evenly between left and right sides
    const leftBranches: any[] = [];
    const rightBranches: any[] = [];
    branches.forEach((b: any, index: number) => {
      if (index % 2 === 0) {
        leftBranches.push({ ...b, originalIndex: index });
      } else {
        rightBranches.push({ ...b, originalIndex: index });
      }
    });

    // Helper to position branches
    const layoutBranchGroup = (
      group: any[],
      side: 'left' | 'right'
    ) => {
      const count = group.length;
      if (count === 0) return;

      const spacingY = 190;
      const startY = coreY - ((count - 1) * spacingY) / 2;
      const branchX = side === 'left' ? coreX - 300 : coreX + 300;
      const subX = side === 'left' ? branchX - 270 : branchX + 270;

      group.forEach((b: any, bIdx: number) => {
        const branchId = `mm-branch-${b.originalIndex}-${Date.now()}`;
        const branchY = startY + bIdx * spacingY;
        const color = b.color || defaultColors[b.originalIndex % defaultColors.length];

        // Level 1 Branch Node (Standard mind map oval dimensions: width 115, height 55)
        generatedNodes.push({
          id: branchId,
          type: 'mindmap-oval',
          label: b.title,
          x: branchX,
          y: branchY,
          width: 115,
          height: 55,
          style: {
            fill: `${color}E6`,
            stroke: color,
            strokeWidth: 2,
            textColor: '#ffffff',
            gradient: true,
          },
          data: { level: 1 },
          documentation: {
            description: b.description,
            status: 'approved',
            tags: ['MindMap', 'Concept'],
          },
          links: formatLinks(b.links),
        });

        // Edge from Central Node to Branch
        generatedEdges.push({
          id: `edge-${coreId}-${branchId}`,
          sourceNodeId: coreId,
          targetNodeId: branchId,
          sourceAnchor: side === 'left' ? 'left' : 'right',
          targetAnchor: side === 'left' ? 'right' : 'left',
          type: 'curved',
          lineStyle: 'solid',
          markerStart: 'none',
          markerEnd: 'none',
          color: color,
          strokeWidth: 2.5,
        });

        // Level 2 Sub-branches (Standard mind map oval dimensions: width 115, height 55)
        const subbranches = Array.isArray(b.subbranches) ? b.subbranches : [];
        const subCount = subbranches.length;
        if (subCount > 0) {
          const subSpacingY = 70;
          const subStartY = branchY - ((subCount - 1) * subSpacingY) / 2;

          subbranches.forEach((sub: any, sIdx: number) => {
            const subId = `mm-sub-${b.originalIndex}-${sIdx}-${Date.now()}`;
            const subY = subStartY + sIdx * subSpacingY;

            generatedNodes.push({
              id: subId,
              type: 'mindmap-oval',
              label: sub.title,
              x: subX,
              y: subY,
              width: 115,
              height: 55,
              style: {
                fill: `${color}B3`,
                stroke: color,
                strokeWidth: 1.5,
                textColor: '#ffffff',
                gradient: true,
              },
              data: { level: 2 },
              documentation: {
                description: sub.description,
                status: 'approved',
                tags: ['MindMap', 'Subtopic'],
              },
              links: formatLinks(sub.links),
            });

            // Edge from Branch to Sub-branch
            generatedEdges.push({
              id: `edge-${branchId}-${subId}`,
              sourceNodeId: branchId,
              targetNodeId: subId,
              sourceAnchor: side === 'left' ? 'left' : 'right',
              targetAnchor: side === 'left' ? 'right' : 'left',
              type: 'curved',
              lineStyle: 'solid',
              markerStart: 'none',
              markerEnd: 'none',
              color: color,
              strokeWidth: 2,
            });
          });
        }
      });
    };

    layoutBranchGroup(leftBranches, 'left');
    layoutBranchGroup(rightBranches, 'right');

    const durationMs = Date.now() - startTime;
    logDebug(
      'success',
      'GEMINI_AI',
      `Generated mind map "${title}" with ${generatedNodes.length} nodes and ${generatedEdges.length} edges in ${durationMs}ms`
    );

    res.json({
      success: true,
      title,
      description: centralDescription,
      nodes: generatedNodes,
      edges: generatedEdges,
      durationMs,
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logDebug('error', 'GEMINI_AI', `Failed to generate mind map: ${err.message}`, err.stack);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate mind map with Gemini AI',
      details: String(err?.stack || err),
    });
  }
});

// 10. AI Flowchart Generator using Gemini API
app.post('/api/ai/generate-flowchart', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      topic,
      layout = 'vertical',
      extendMode,
      existingNodes,
      existingEdges,
      currentTitle,
    } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid process description for the flowchart.',
      });
    }

    let apiKey = (process.env.GEMINI_API_KEY || '').trim();
    apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

    if (!apiKey) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
          if (match && match[1]) {
            apiKey = match[1].trim().replace(/^["']|["']$/g, '').trim();
          }
        }
      } catch (err) {
        logDebug('warn', 'GEMINI_AI', 'Could not read .env fallback for flowchart', err);
      }
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error:
          'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your server environment or Secrets.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 60000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelsToTry: Array<{ name: string; useLowThinking: boolean }> = [
      { name: 'gemini-4-hydrogen', useLowThinking: true },
      { name: 'gemini-3.1-flash-lite', useLowThinking: false },
    ];
    const isHorizontal = layout === 'horizontal';

    const FLOWCHART_SYMBOL_SPEC: Record<
      string,
      {
        width: number;
        height: number;
        fill: string;
        stroke: string;
        textColor: string;
        rounded?: number;
      }
    > = {
      'flow-terminator': {
        width: 165,
        height: 60,
        fill: 'rgba(16, 185, 129, 0.25)',
        stroke: '#10b981',
        textColor: '#ecfdf5',
        rounded: 9999,
      },
      'flow-process': {
        width: 185,
        height: 76,
        fill: 'rgba(30, 58, 138, 0.78)',
        stroke: '#3b82f6',
        textColor: '#f8fafc',
        rounded: 8,
      },
      'flow-decision': {
        width: 155,
        height: 102,
        fill: 'rgba(180, 83, 9, 0.78)',
        stroke: '#f59e0b',
        textColor: '#fef3c7',
      },
      'flow-data': {
        width: 185,
        height: 74,
        fill: 'rgba(14, 116, 144, 0.78)',
        stroke: '#06b6d4',
        textColor: '#e0f2fe',
      },
      'flow-document': {
        width: 170,
        height: 82,
        fill: 'rgba(51, 65, 85, 0.85)',
        stroke: '#94a3b8',
        textColor: '#f1f5f9',
      },
      'flow-multi-document': {
        width: 175,
        height: 92,
        fill: 'rgba(51, 65, 85, 0.88)',
        stroke: '#94a3b8',
        textColor: '#f1f5f9',
      },
      'flow-preparation': {
        width: 175,
        height: 76,
        fill: 'rgba(88, 28, 135, 0.78)',
        stroke: '#c084fc',
        textColor: '#faf5ff',
      },
      'flow-manual-input': {
        width: 175,
        height: 76,
        fill: 'rgba(15, 118, 110, 0.78)',
        stroke: '#2dd4bf',
        textColor: '#f0fdfa',
      },
      'flow-database': {
        width: 138,
        height: 102,
        fill: 'rgba(15, 23, 42, 0.92)',
        stroke: '#38bdf8',
        textColor: '#e0f2fe',
      },
      'flow-delay': {
        width: 160,
        height: 74,
        fill: 'rgba(146, 64, 14, 0.78)',
        stroke: '#fbbf24',
        textColor: '#fef3c7',
      },
      'flow-merge': {
        width: 118,
        height: 86,
        fill: 'rgba(49, 46, 129, 0.85)',
        stroke: '#a78bfa',
        textColor: '#f5f3ff',
      },
      'flow-connector': {
        width: 64,
        height: 64,
        fill: 'rgba(15, 23, 42, 0.95)',
        stroke: '#38bdf8',
        textColor: '#e0f2fe',
        rounded: 9999,
      },
      'flow-offpage-connector': {
        width: 105,
        height: 84,
        fill: 'rgba(49, 46, 129, 0.85)',
        stroke: '#818cf8',
        textColor: '#eef2ff',
      },
    };

    const VALID_SYMBOL_TYPES = Object.keys(FLOWCHART_SYMBOL_SPEC);

    const buildFlowchartNode = (
      nodeId: string,
      step: any,
      x: number,
      y: number,
      extraTag?: string
    ): DiagramNode => {
      const symbolType = VALID_SYMBOL_TYPES.includes(step.symbolType)
        ? step.symbolType
        : 'flow-process';
      const spec = FLOWCHART_SYMBOL_SPEC[symbolType];

      let fill = spec.fill;
      let stroke = spec.stroke;
      let textColor = spec.textColor;
      const nodeData: Record<string, any> = {};

      if (symbolType === 'flow-terminator') {
        const isEnd =
          step.terminalKind === 'end' ||
          /\b(end|stop|finish|complete|terminate|done|exit|reject|cancel|fail)\b/i.test(
            step.label || ''
          );
        nodeData.terminalType = isEnd ? 'end' : 'start';
        if (isEnd) {
          fill = 'rgba(190, 18, 60, 0.28)';
          stroke = '#f43f5e';
          textColor = '#ffe4e6';
        }
      } else if (symbolType === 'flow-data') {
        nodeData.ioType = step.ioKind === 'output' ? 'output' : 'input';
      } else if (symbolType === 'flow-connector') {
        nodeData.connectorRef = (step.label || 'A').slice(0, 4);
      } else if (symbolType === 'flow-offpage-connector') {
        nodeData.targetPage = step.label || 'Next Page';
      }

      const validLinks = Array.isArray(step.links)
        ? step.links
            .filter((l: any) => l && l.url && typeof l.url === 'string')
            .map((l: any, idx: number) => ({
              id: `link-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              label: (l.label || l.title || 'Reference').slice(0, 32),
              url: l.url.trim(),
            }))
        : undefined;

      return {
        id: nodeId,
        type: symbolType,
        label: String(step.label || 'Step').trim().slice(0, 64),
        x: Math.round(x),
        y: Math.round(y),
        width: spec.width,
        height: spec.height,
        style: {
          fill,
          stroke,
          strokeWidth: 2,
          textColor,
          ...(spec.rounded !== undefined ? { rounded: spec.rounded } : {}),
        },
        data: nodeData,
        documentation: {
          description: String(step.description || step.label || '').trim(),
          status: 'approved',
          tags: extraTag ? ['Flowchart', 'GeminiAI', extraTag] : ['Flowchart', 'GeminiAI'],
        },
        links: validLinks && validLinks.length > 0 ? validLinks : undefined,
      };
    };

    const formatLinksInstruction = `Symbol selection rules (choose the exact ANSI/ISO symbolType that best fits each step's role):
- "flow-terminator": Process Start or End/Stop/Complete/Reject states (terminalKind: "start" or "end").
- "flow-preparation": Initialization, setup, authentication check setup, or configuration steps.
- "flow-manual-input": Steps where a human/user manually types, selects, or submits form/order data.
- "flow-data": System Input / Output data payloads, API requests/responses, messages, or file I/O (ioKind: "input" or "output").
- "flow-process": Automated processing, calculation, validation logic, API calls, or transformation actions.
- "flow-decision": Conditional branching point (Yes/No, True/False, Valid/Invalid, Approved/Rejected). Outgoing edges from decisions MUST have short labels like "Yes" and "No" (or "Valid" / "Invalid").
- "flow-database": Reading from or writing/persisting records into a database, store, or ledger.
- "flow-document": Generating or printing a single document, invoice, receipt, PDF, or report.
- "flow-multi-document": Generating multiple documents, batch reports, or multi-file outputs.
- "flow-delay": Waiting period, cooldown, timer, scheduled delay, or async queue wait.
- "flow-merge": Junction where two or more parallel or conditional branches rejoin into one flow.
- "flow-offpage-connector": Continuation to/from another page or external workflow.
- "flow-connector": On-page jump connector (use short label like "A" or "B").`;

    const flowchartResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              symbolType: {
                type: Type.STRING,
                enum: VALID_SYMBOL_TYPES,
              },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              terminalKind: { type: Type.STRING, enum: ['start', 'end'] },
              ioKind: { type: Type.STRING, enum: ['input', 'output'] },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ['label', 'url'],
                },
              },
            },
            required: ['id', 'symbolType', 'label', 'description'],
          },
        },
        connections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromStepId: { type: Type.STRING },
              toStepId: { type: Type.STRING },
              label: { type: Type.STRING },
            },
            required: ['fromStepId', 'toStepId'],
          },
        },
      },
      required: ['title', 'description', 'steps', 'connections'],
    };

    const isExtending =
      extendMode === true && Array.isArray(existingNodes) && existingNodes.length > 0;

    let promptText = '';
    if (isExtending) {
      const existingSummary = existingNodes.slice(0, 50).map((n: any) => ({
        id: String(n.id),
        type: String(n.type || 'flow-process'),
        label: String(n.label || 'Untitled'),
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
      }));

      promptText = `You are a process architect extending an existing ANSI/ISO flowchart.
Existing nodes already on the canvas:
${JSON.stringify(existingSummary, null, 2)}

User request to extend this flowchart:
"${topic.trim()}"

${formatLinksInstruction}

INSTRUCTIONS FOR EXTENDING:
1. Suggest 2 to 8 new process steps that expand or continue the existing flowchart according to the user's request.
2. Give each new step a unique short id like "new_1", "new_2", etc. (do not reuse existing node IDs).
3. In "connections", connect at least one existing node ID (from the list above) to your new steps, and connect new steps to each other (and back to existing nodes if rejoining/looping).
4. Include clear labels ("Yes", "No", etc.) on edges coming out of any "flow-decision" node.
5. Keep step labels concise (2-6 words) and provide informative descriptions (2-4 sentences per step, or matching any requested depth).`;
    } else {
      promptText = `You are an expert business analyst and systems architect designing an ANSI/ISO 5807 standard process flowchart.
Design a complete, realistic, well-structured end-to-end flowchart for the following process:
"${topic.trim()}"

${formatLinksInstruction}

INSTRUCTIONS:
1. Suggest 7 to 14 clear, logical steps covering the full process from Start ("flow-terminator", terminalKind: "start") through inputs/setup, decisions with branching paths, data/database/document operations, delays/merges where relevant, and End ("flow-terminator", terminalKind: "end").
2. Use a diverse, accurate mix of flowchart symbols matching what each step genuinely represents—avoid making everything a plain rectangle when a decision diamond, manual input, data I/O, database cylinder, document, preparation hexagon, delay, or merge junction is appropriate.
3. Give every step a short unique id ("s1", "s2", ...), a crisp label (2-6 words; short question for decisions), and a helpful technical/operational description (2-4 sentences per step, or matching any length requested by the user).
4. In "connections", define all directed flow arrows between step IDs so the graph is fully connected from start to end(s), with branch labels ("Yes", "No", etc.) on every decision branch.`;
    }

    const describeGeminiError = (err: any): string => {
      const msg = String(err?.message || err || 'Unknown Gemini error');
      const causeCode = err?.cause?.code ? String(err.cause.code) : '';
      const causeMsg = err?.cause?.message ? String(err.cause.message) : '';
      if (/fetch failed/i.test(msg)) {
        const causeDetail = [causeCode, causeMsg].filter(Boolean).join(': ');
        return causeDetail
          ? `Network request to Gemini API failed (${causeDetail}). Please check internet/proxy connectivity or try again.`
          : 'Network request to Gemini API failed (connection reset or timed out). Please try again.';
      }
      return causeMsg && !msg.includes(causeMsg) ? `${msg} (${causeMsg})` : msg;
    };

    const isRetryableError = (err: any): boolean => {
      const status = Number(err?.status || err?.code || 0);
      if (status === 429 || status >= 500) return true;
      const msg = String(err?.message || '').toLowerCase();
      const causeCode = String(err?.cause?.code || '').toUpperCase();
      return (
        msg.includes('fetch failed') ||
        msg.includes('timeout') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(causeCode)
      );
    };

    let response: any = null;
    let lastError: any = null;

    for (const modelSpec of modelsToTry) {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          logDebug(
            'info',
            'GEMINI_AI',
            `Attempting model ${modelSpec.name} (attempt ${attempt}/${maxAttempts}) to generate flowchart...`
          );
          response = await ai.models.generateContent({
            model: modelSpec.name,
            contents: promptText,
            config: {
              systemInstruction:
                'You design accurate ANSI/ISO 5807 flowcharts as structured JSON graphs. Keep labels concise and ensure all connection IDs match declared step IDs.',
              responseMimeType: 'application/json',
              responseSchema: flowchartResponseSchema,
              ...(modelSpec.useLowThinking
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                : {}),
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const detail = describeGeminiError(err);
          logDebug(
            'warn',
            'GEMINI_AI',
            `Model ${modelSpec.name} (attempt ${attempt}/${maxAttempts}) failed during flowchart generation: ${detail}`
          );
          if (attempt < maxAttempts && isRetryableError(err)) {
            await new Promise(resolve => setTimeout(resolve, 800 * attempt));
            continue;
          }
          break;
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      if (lastError) {
        throw new Error(describeGeminiError(lastError));
      }
      throw new Error('No response from Gemini API models for flowchart generation.');
    }

    const parsed = JSON.parse(response.text.trim());
    const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
    const rawConnections = Array.isArray(parsed.connections) ? parsed.connections : [];

    if (rawSteps.length === 0) {
      throw new Error('Gemini returned no flowchart steps. Please try rephrasing your process prompt.');
    }

    const stamp = Date.now();

    if (isExtending) {
      const existingIdSet = new Set(existingNodes.map((n: any) => String(n.id)));
      const stepIdToNodeId = new Map<string, string>();
      rawSteps.forEach((s: any, idx: number) => {
        const sid = String(s.id || `new_${idx}`);
        stepIdToNodeId.set(sid, `fc-ext-${stamp}-${idx}`);
      });

      // Anchor new steps cleanly below or right of the existing bounding box / connected parent
      const maxX = Math.max(...existingNodes.map((n: any) => (n.x || 0) + (n.width || 180)));
      const maxY = Math.max(...existingNodes.map((n: any) => (n.y || 0) + (n.height || 80)));
      const avgX = existingNodes.reduce((sum: number, n: any) => sum + (n.x || 0), 0) / existingNodes.length;
      const avgY = existingNodes.reduce((sum: number, n: any) => sum + (n.y || 0), 0) / existingNodes.length;

      // Compute rank among new steps from existing anchor connections
      const rankMap = new Map<string, number>();
      const newIds: string[] = rawSteps.map((s: any, idx: number) => String(s.id || `new_${idx}`));
      const newIdSet = new Set<string>(newIds);
      const childrenOf = new Map<string, string[]>();
      const anchorParents = new Map<string, string[]>();

      rawConnections.forEach((c: any) => {
        const fromId = String(c.fromStepId || '');
        const toId = String(c.toStepId || '');
        if (existingIdSet.has(fromId) && newIdSet.has(toId)) {
          const list = anchorParents.get(toId) || [];
          list.push(fromId);
          anchorParents.set(toId, list);
          rankMap.set(toId, 0);
        } else if (newIdSet.has(fromId) && newIdSet.has(toId) && fromId !== toId) {
          const list = childrenOf.get(fromId) || [];
          list.push(toId);
          childrenOf.set(fromId, list);
        }
      });

      const queue: string[] = Array.from(rankMap.keys());
      if (queue.length === 0 && newIds.length > 0) {
        rankMap.set(newIds[0], 0);
        queue.push(newIds[0]);
      }
      const visitedExt = new Set<string>();
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (visitedExt.has(cur)) continue;
        visitedExt.add(cur);
        const r = rankMap.get(cur) ?? 0;
        for (const nxt of childrenOf.get(cur) || []) {
          if (!rankMap.has(nxt) || (rankMap.get(nxt)! < r + 1 && !visitedExt.has(nxt))) {
            rankMap.set(nxt, r + 1);
            queue.push(nxt);
          }
        }
      }
      newIds.forEach((id: string, i: number) => {
        if (!rankMap.has(id)) rankMap.set(id, i);
      });

      const layers = new Map<number, any[]>();
      rawSteps.forEach((s: any, idx: number) => {
        const sid = String(s.id || `new_${idx}`);
        const r = rankMap.get(sid) ?? 0;
        const arr = layers.get(r) || [];
        arr.push({ ...s, _sid: sid });
        layers.set(r, arr);
      });

      const occupied = existingNodes.map((n: any) => ({
        x: n.x || 0,
        y: n.y || 0,
        w: n.width || 180,
        h: n.height || 80,
      }));

      const overlaps = (x: number, y: number, w: number, h: number) =>
        occupied.some(
          o =>
            x < o.x + o.w + 30 &&
            x + w + 30 > o.x &&
            y < o.y + o.h + 30 &&
            y + h + 30 > o.y
        );

      const addedNodes: DiagramNode[] = [];
      const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);

      sortedRanks.forEach(r => {
        const group = layers.get(r) || [];
        group.forEach((step, idxInLayer) => {
          const sid = step._sid;
          const symbolType = VALID_SYMBOL_TYPES.includes(step.symbolType)
            ? step.symbolType
            : 'flow-process';
          const spec = FLOWCHART_SYMBOL_SPEC[symbolType];

          let posX = isHorizontal
            ? maxX + 90 + r * 250
            : avgX + (idxInLayer - (group.length - 1) / 2) * 240;
          let posY = isHorizontal
            ? avgY + (idxInLayer - (group.length - 1) / 2) * 140
            : maxY + 90 + r * 150;

          let guard = 0;
          while (overlaps(posX, posY, spec.width, spec.height) && guard < 15) {
            if (isHorizontal) posY += 130;
            else posX += 220;
            guard++;
          }

          occupied.push({ x: posX, y: posY, w: spec.width, h: spec.height });
          const nodeId = stepIdToNodeId.get(sid)!;
          addedNodes.push(buildFlowchartNode(nodeId, step, posX, posY, 'Extended'));
        });
      });

      const nodeLookup = new Map<string, any>();
      existingNodes.forEach((n: any) => nodeLookup.set(String(n.id), n));
      addedNodes.forEach(n => nodeLookup.set(n.id, n));

      const addedEdges: DiagramEdge[] = [];
      rawConnections.forEach((conn: any, idx: number) => {
        const rawFrom = String(conn.fromStepId || '');
        const rawTo = String(conn.toStepId || '');
        const sourceId = existingIdSet.has(rawFrom) ? rawFrom : stepIdToNodeId.get(rawFrom);
        const targetId = existingIdSet.has(rawTo) ? rawTo : stepIdToNodeId.get(rawTo);
        if (!sourceId || !targetId || sourceId === targetId) return;

        const srcNode = nodeLookup.get(sourceId);
        const tgtNode = nodeLookup.get(targetId);
        let sourceAnchor: any = isHorizontal ? 'right' : 'bottom';
        let targetAnchor: any = isHorizontal ? 'left' : 'top';
        if (srcNode && tgtNode) {
          const dx = tgtNode.x - srcNode.x;
          const dy = tgtNode.y - srcNode.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            sourceAnchor = dx >= 0 ? 'right' : 'left';
            targetAnchor = dx >= 0 ? 'left' : 'right';
          } else {
            sourceAnchor = dy >= 0 ? 'bottom' : 'top';
            targetAnchor = dy >= 0 ? 'top' : 'bottom';
          }
        }

        addedEdges.push({
          id: `fc-ext-e-${stamp}-${idx}`,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          sourceAnchor,
          targetAnchor,
          type: 'orthogonal',
          lineStyle: 'solid',
          markerStart: 'none',
          markerEnd: 'arrow',
          label: conn.label ? String(conn.label).trim().slice(0, 28) : undefined,
        });
      });

      const durationMs = Date.now() - startTime;
      logDebug(
        'success',
        'GEMINI_AI',
        `Extended flowchart with ${addedNodes.length} steps and ${addedEdges.length} edges in ${durationMs}ms`
      );

      return res.json({
        success: true,
        extended: true,
        title: currentTitle || parsed.title || 'Extended Flowchart',
        description: parsed.description || topic.trim(),
        nodes: [...existingNodes, ...addedNodes],
        edges: [...(existingEdges || []), ...addedEdges],
        addedNodeIds: addedNodes.map(n => n.id),
        durationMs,
      });
    }

    // =========================================================================
    // FRESH FLOWCHART: LAYERED DAG AUTO-LAYOUT
    // =========================================================================
    const stepMap = new Map<string, any>();
    const stepOrder: string[] = [];
    rawSteps.forEach((s: any, idx: number) => {
      const sid = String(s.id || `s${idx + 1}`).trim();
      if (!stepMap.has(sid)) {
        stepMap.set(sid, { ...s, id: sid });
        stepOrder.push(sid);
      }
    });

    const outConns = new Map<string, Array<{ to: string; label?: string }>>();
    const inDegree = new Map<string, number>();
    stepOrder.forEach(id => {
      outConns.set(id, []);
      inDegree.set(id, 0);
    });

    const validConnections: Array<{ fromStepId: string; toStepId: string; label?: string }> = [];
    rawConnections.forEach((c: any) => {
      const fromId = String(c.fromStepId || '').trim();
      const toId = String(c.toStepId || '').trim();
      if (!stepMap.has(fromId) || !stepMap.has(toId) || fromId === toId) return;
      const edgeLabel = c.label ? String(c.label).trim().slice(0, 28) : undefined;
      outConns.get(fromId)!.push({ to: toId, label: edgeLabel });
      inDegree.set(toId, (inDegree.get(toId) || 0) + 1);
      validConnections.push({ fromStepId: fromId, toStepId: toId, label: edgeLabel });
    });

    // Identify start step
    const startId =
      stepOrder.find(id => {
        const s = stepMap.get(id);
        return s.symbolType === 'flow-terminator' && s.terminalKind !== 'end' && (inDegree.get(id) || 0) === 0;
      }) ||
      stepOrder.find(id => (inDegree.get(id) || 0) === 0) ||
      stepOrder[0];

    // BFS spanning tree + DAG rank calculation (back-edges ignored during rank push to handle retry loops)
    const rank = new Map<string, number>();
    const dfsState = new Map<string, number>(); // 0=unvisited, 1=visiting, 2=visited
    const dagOut = new Map<string, string[]>();
    stepOrder.forEach(id => dagOut.set(id, []));

    const markDagEdges = (u: string) => {
      dfsState.set(u, 1);
      for (const edge of outConns.get(u) || []) {
        const state = dfsState.get(edge.to) || 0;
        if (state === 0) {
          dagOut.get(u)!.push(edge.to);
          markDagEdges(edge.to);
        } else if (state === 2) {
          dagOut.get(u)!.push(edge.to);
        }
        // state === 1 is a cycle back-edge -> skip in DAG ranking
      }
      dfsState.set(u, 2);
    };

    markDagEdges(startId);
    stepOrder.forEach(id => {
      if ((dfsState.get(id) || 0) === 0) {
        markDagEdges(id);
      }
    });

    // Longest path rank on DAG
    const dagInDeg = new Map<string, number>();
    stepOrder.forEach(id => dagInDeg.set(id, 0));
    dagOut.forEach(targets => {
      targets.forEach(t => dagInDeg.set(t, (dagInDeg.get(t) || 0) + 1));
    });

    const topoQueue: string[] = stepOrder.filter(id => (dagInDeg.get(id) || 0) === 0);
    topoQueue.forEach(id => rank.set(id, 0));
    while (topoQueue.length > 0) {
      const u = topoQueue.shift()!;
      const rU = rank.get(u) ?? 0;
      for (const v of dagOut.get(u) || []) {
        rank.set(v, Math.max(rank.get(v) ?? 0, rU + 1));
        const rem = (dagInDeg.get(v) || 1) - 1;
        dagInDeg.set(v, rem);
        if (rem === 0) topoQueue.push(v);
      }
    }
    stepOrder.forEach((id, idx) => {
      if (!rank.has(id)) rank.set(id, idx);
    });

    // Group steps by rank and order within each rank
    const layersMap = new Map<number, string[]>();
    stepOrder.forEach(id => {
      const r = rank.get(id) ?? 0;
      const list = layersMap.get(r) || [];
      list.push(id);
      layersMap.set(r, list);
    });

    const maxRank = Math.max(...Array.from(layersMap.keys()), 0);
    const orderedColIndex = new Map<string, number>();

    // Simple barycenter ordering pass
    const dagParents = new Map<string, string[]>();
    stepOrder.forEach(id => dagParents.set(id, []));
    dagOut.forEach((targets, u) => {
      targets.forEach(v => dagParents.get(v)!.push(u));
    });

    for (let r = 0; r <= maxRank; r++) {
      const layer = layersMap.get(r) || [];
      if (r > 0) {
        layer.sort((a, b) => {
          const pa = dagParents.get(a) || [];
          const pb = dagParents.get(b) || [];
          const avgA =
            pa.length > 0
              ? pa.reduce((s, p) => s + (orderedColIndex.get(p) ?? 0), 0) / pa.length
              : 0;
          const avgB =
            pb.length > 0
              ? pb.reduce((s, p) => s + (orderedColIndex.get(p) ?? 0), 0) / pb.length
              : 0;
          return avgA - avgB;
        });
      }
      layer.forEach((id, idx) => orderedColIndex.set(id, idx));
    }

    const generatedNodes: DiagramNode[] = [];
    const stepIdToNodeId = new Map<string, string>();
    const nodeByStepId = new Map<string, DiagramNode>();

    const centerAxis = isHorizontal ? 340 : 620;
    const rankStep = isHorizontal ? 255 : 155;
    const laneStep = isHorizontal ? 145 : 245;
    const startAxis = isHorizontal ? 80 : 70;

    for (let r = 0; r <= maxRank; r++) {
      const layer = layersMap.get(r) || [];
      const count = layer.length;
      layer.forEach((sid, idx) => {
        const step = stepMap.get(sid);
        const symbolType = VALID_SYMBOL_TYPES.includes(step.symbolType)
          ? step.symbolType
          : 'flow-process';
        const spec = FLOWCHART_SYMBOL_SPEC[symbolType];

        const laneOffset = (idx - (count - 1) / 2) * laneStep;
        const centerX = isHorizontal
          ? startAxis + r * rankStep + spec.width / 2
          : centerAxis + laneOffset;
        const centerY = isHorizontal
          ? centerAxis + laneOffset
          : startAxis + r * rankStep + spec.height / 2;

        const x = centerX - spec.width / 2;
        const y = centerY - spec.height / 2;

        const nodeId = `fc-ai-${stamp}-${generatedNodes.length}`;
        const node = buildFlowchartNode(nodeId, step, x, y);
        stepIdToNodeId.set(sid, nodeId);
        nodeByStepId.set(sid, node);
        generatedNodes.push(node);
      });
    }

    const generatedEdges: DiagramEdge[] = validConnections.map((conn, idx) => {
      const srcNode = nodeByStepId.get(conn.fromStepId)!;
      const tgtNode = nodeByStepId.get(conn.toStepId)!;
      const srcRank = rank.get(conn.fromStepId) ?? 0;
      const tgtRank = rank.get(conn.toStepId) ?? 0;

      const isLoopBack = tgtRank <= srcRank;
      let sourceAnchor: any;
      let targetAnchor: any;

      if (isLoopBack) {
        if (isHorizontal) {
          sourceAnchor = 'top';
          targetAnchor = 'top';
        } else {
          sourceAnchor = 'left';
          targetAnchor = 'left';
        }
      } else if (isHorizontal) {
        const dy = tgtNode.y + tgtNode.height / 2 - (srcNode.y + srcNode.height / 2);
        if (Math.abs(dy) > 90 && srcNode.type === 'flow-decision') {
          sourceAnchor = dy > 0 ? 'bottom' : 'top';
        } else {
          sourceAnchor = 'right';
        }
        targetAnchor = 'left';
      } else {
        const dx = tgtNode.x + tgtNode.width / 2 - (srcNode.x + srcNode.width / 2);
        if (Math.abs(dx) > 100 && srcNode.type === 'flow-decision') {
          sourceAnchor = dx > 0 ? 'right' : 'left';
        } else {
          sourceAnchor = 'bottom';
        }
        targetAnchor = 'top';
      }

      return {
        id: `fc-ai-edge-${stamp}-${idx}`,
        sourceNodeId: srcNode.id,
        targetNodeId: tgtNode.id,
        sourceAnchor,
        targetAnchor,
        type: 'orthogonal',
        lineStyle: isLoopBack ? 'dashed' : 'solid',
        markerStart: 'none',
        markerEnd: 'arrow',
        label: conn.label,
        color: isLoopBack ? '#f59e0b' : undefined,
      };
    });

    const title = String(parsed.title || 'AI Process Flowchart').trim();
    const description = String(parsed.description || topic.trim()).trim();
    const durationMs = Date.now() - startTime;

    logDebug(
      'success',
      'GEMINI_AI',
      `Generated flowchart "${title}" with ${generatedNodes.length} steps and ${generatedEdges.length} edges in ${durationMs}ms`
    );

    res.json({
      success: true,
      title,
      description,
      nodes: generatedNodes,
      edges: generatedEdges,
      durationMs,
    });
  } catch (err: any) {
    const rawMsg = String(err?.message || 'Failed to generate flowchart with Gemini AI');
    const causeCode = err?.cause?.code ? String(err.cause.code) : '';
    const causeMsg = err?.cause?.message ? String(err.cause.message) : '';
    const friendlyError = /fetch failed/i.test(rawMsg)
      ? `Network request to Gemini API failed${causeCode || causeMsg ? ` (${[causeCode, causeMsg].filter(Boolean).join(': ')})` : ''}. Please verify server connectivity and try again.`
      : rawMsg;
    logDebug('error', 'GEMINI_AI', `Failed to generate flowchart: ${friendlyError}`, err?.stack);
    res.status(500).json({
      success: false,
      error: friendlyError,
      details: String(err?.stack || err),
    });
  }
});

// Dev vs Production Vite Setup
async function startServer() {
  await initStorageOnDisk();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/storage_data/**', '**/.storage_root.txt**', '**/node_modules/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[OmniModel Studio] Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
