/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DiagramDocument,
  DiagramPage,
  DiagramNode,
  DiagramEdge,
  Collaborator,
  UserRole,
  SyncQueueItem,
  DiagramType,
  AppTheme,
  StudioSettings,
  ChildDiagramRef,
  getNodeChildDiagrams,
} from './types/diagram';
import { initialDiagramDocument } from './data/seedDiagrams';
import { SHAPE_TEMPLATES } from './data/shapeDefinitions';
import { offlineSyncService } from './services/offlineSync';
import { collaborationService } from './services/collaboration';
import { AppHeader } from './components/header/AppHeader';
import { ShapePaletteSidebar } from './components/sidebar/ShapePaletteSidebar';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';
import { NodeInspector } from './components/inspector/NodeInspector';
import { VersionHistoryModal } from './components/modals/VersionHistoryModal';
import { RestApiModal } from './components/modals/RestApiModal';
import { OfflineSyncModal } from './components/modals/OfflineSyncModal';
import { NewPageModal } from './components/modals/NewPageModal';
import { DiagramTypesGalleryModal } from './components/modals/DiagramTypesGalleryModal';
import { GitHubPublishModal } from './components/modals/GitHubPublishModal';
import { WorkspaceModal } from './components/modals/WorkspaceModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { CreateChildDiagramModal } from './components/modals/CreateChildDiagramModal';
import { SaveSuccessModal } from './components/modals/SaveSuccessModal';
import { ImportSqlModal } from './components/modals/ImportSqlModal';
import { GenerateMindmapModal } from './components/modals/GenerateMindmapModal';
import { UnsavedChangesModal } from './components/modals/UnsavedChangesModal';
import { workspaceService } from './services/workspaceService';
import { getExampleDiagramForType } from './data/diagramExamples';
import { THEMES } from './utils/themeConfig';

export default function App() {
  // Document state
  const [document, setDocument] = useState<DiagramDocument>(() => {
    return offlineSyncService.getCachedDocument() || initialDiagramDocument;
  });

  const [activePageId, setActivePageId] = useState<string>(() => {
    return (
      offlineSyncService.getCachedDocument()?.activePageId ||
      initialDiagramDocument.activePageId
    );
  });

  // Current User Role (RBAC)
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Canvas Selection (Supports multi-node selection)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const setSelectedNodeId = useCallback((id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  }, []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Inspector visibility
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Modals state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastPageByType, setLastPageByType] = useState<Record<string, string>>({});
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isRestApiModalOpen, setIsRestApiModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [isImportSqlModalOpen, setIsImportSqlModalOpen] = useState(false);
  const [isGenerateMindmapModalOpen, setIsGenerateMindmapModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    action: () => void | Promise<void>;
    targetName?: string;
  } | null>(null);
  const [activeWs, setActiveWs] = useState(() => workspaceService.getActiveWorkspace());
  const [childModalNode, setChildModalNode] = useState<DiagramNode | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<
    Array<{ filename: string; diagramName: string; pageId?: string; nodeLabel?: string }>
  >([]);

  // Real-time Collaboration & Network Status
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() =>
    collaborationService.getCollaborators()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() => offlineSyncService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() =>
    offlineSyncService.getSimulatedOffline()
  );
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() =>
    offlineSyncService.getQueue()
  );

  // Studio Settings (Themes, Grid, Auto-Save, Shortcuts)
  const [settings, setSettings] = useState<StudioSettings>(() => {
    try {
      const saved = localStorage.getItem('omnimind_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          gridSize: parsed.gridSize === 24 || !parsed.gridSize ? 48 : parsed.gridSize,
        };
      }
      const oldTheme = localStorage.getItem('omnimodel_theme');
      if (oldTheme) {
        return {
          theme: oldTheme as AppTheme,
          gridStyle: 'dots',
          gridSize: 48,
          snapToGrid: true,
          showHoverTooltips: true,
          showCollaborators: false,
          autoSaveInterval: 'instant',
          defaultConnectorType: 'orthogonal',
        };
      }
    } catch {
      // ignore
    }
    return {
      theme: 'dark',
      gridStyle: 'dots',
      gridSize: 48, // Doubled width & height of the canvas dot grid from 24 to 48 (Change 2)
      snapToGrid: true,
      showHoverTooltips: true,
      showCollaborators: false,
      autoSaveInterval: 'instant',
      defaultConnectorType: 'orthogonal',
    };
  });

  const currentThemeDef = THEMES[settings.theme] || THEMES.dark;

  useEffect(() => {
    if (currentThemeDef.isDark) {
      window.document.documentElement.classList.add('dark');
      window.document.documentElement.style.colorScheme = 'dark';
    } else {
      window.document.documentElement.classList.remove('dark');
      window.document.documentElement.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('omnimind_settings_v1', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings, currentThemeDef]);

  // Active page accessor
  const currentPage =
    document.pages.find(p => p.id === activePageId) || document.pages[0];

  // Track last opened page by diagram type
  useEffect(() => {
    if (currentPage) {
      setLastPageByType(prev => ({
        ...prev,
        [currentPage.diagramType]: currentPage.id,
      }));
    }
  }, [currentPage]);

  // Set default shape palette category filter to the relevant diagram type when opening workspace/diagram/page (Change 3)
  useEffect(() => {
    if (currentPage?.diagramType) {
      setSelectedCategory(currentPage.diagramType);
    }
  }, [currentPage?.diagramType, activeWs.activeDiagramFilename, activePageId]);

  // Browser-level safety: Prompt if leaving window/tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Selected nodes accessors
  const selectedNodes =
    currentPage?.nodes.filter(n => selectedNodeIds.includes(n.id)) || [];
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedNodeId = selectedNodes.length === 1 ? selectedNodes[0].id : null;

  // Subscribe to offline sync & collaboration services
  useEffect(() => {
    const unsubOffline = offlineSyncService.subscribe(() => {
      setIsOnline(offlineSyncService.isOnline());
      setIsSimulatedOffline(offlineSyncService.getSimulatedOffline());
      setSyncQueue(offlineSyncService.getQueue());
    });

    const unsubCollab = collaborationService.subscribe(() => {
      setCollaborators(collaborationService.getCollaborators());
    });

    const unsubWs = workspaceService.subscribe(() => {
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
    });

    return () => {
      unsubOffline();
      unsubCollab();
      unsubWs();
    };
  }, []);

  // Fetch initial document from REST API on startup if online
  useEffect(() => {
    async function loadRemoteDoc() {
      if (offlineSyncService.isOnline()) {
        try {
          const ws = workspaceService.getActiveWorkspace();
          const targetFilename = ws.activeDiagramFilename || 'root.json';
          // Try loading from workspace server disk first
          const fileRes = await fetch(`/api/workspaces/${ws.id}/files/${targetFilename}`);
          if (fileRes.ok) {
            const data: DiagramDocument = await fileRes.json();
            setDocument(data);
            offlineSyncService.cacheDocument(data);
            workspaceService.updateLocalDiagramCache(targetFilename, data);
            return;
          }

          const res = await fetch(`/api/diagrams/${initialDiagramDocument.id}`);
          if (res.ok) {
            const data: DiagramDocument = await res.json();
            setDocument(data);
            offlineSyncService.cacheDocument(data);
            workspaceService.updateLocalDiagramCache('root.json', data);
          }
        } catch (err) {
          console.warn('Using offline cached document on startup:', err);
        }
      }
    }
    loadRemoteDoc();
  }, []);

  // Save document state in memory and mark unsaved (manual save writes to server disk)
  const persistDocument = useCallback((updatedDoc: DiagramDocument) => {
    setDocument(updatedDoc);
    setSaveStatus('unsaved');
    offlineSyncService.cacheDocument(updatedDoc);
    const ws = workspaceService.getActiveWorkspace();
    workspaceService.saveCurrentDiagram(updatedDoc, ws.activeDiagramFilename);
  }, []);

  const handleManualSave = useCallback(async () => {
    setSaveStatus('saving');
    const ws = workspaceService.getActiveWorkspace();
    const filename = ws.activeDiagramFilename || 'root.json';
    workspaceService.saveCurrentDiagram(document, filename);
    // Persist synchronously to server disk
    const result = await workspaceService.saveCurrentDiagramToServer(document, filename);
    if (!result.success) {
      console.error('[OmniMind App] Save diagram failed:', result.error, result.details);
      setSaveStatus('unsaved');
      return;
    }
    collaborationService.addActivity(
      'You',
      '#10b981',
      `Saved diagram to ${ws.name}/${filename}`
    );
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [document]);

  // Intercept navigation when there are unsaved changes on the current page (Change 6)
  const requestNavigation = useCallback(
    (action: () => void | Promise<void>, targetName?: string) => {
      if (saveStatus === 'unsaved') {
        setPendingNavigation({ action, targetName });
        setIsUnsavedModalOpen(true);
      } else {
        action();
      }
    },
    [saveStatus]
  );

  const handleSaveAndContinue = useCallback(async () => {
    await handleManualSave();
    setIsUnsavedModalOpen(false);
    if (pendingNavigation) {
      const act = pendingNavigation.action;
      setPendingNavigation(null);
      await act();
    }
  }, [handleManualSave, pendingNavigation]);

  const handleDiscardAndContinue = useCallback(async () => {
    setIsUnsavedModalOpen(false);
    setSaveStatus('idle');
    if (pendingNavigation) {
      const act = pendingNavigation.action;
      setPendingNavigation(null);
      await act();
    }
  }, [pendingNavigation]);

  const handleCancelNavigation = useCallback(() => {
    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  }, []);

  // Update nodes for current page
  const handleUpdateNodes = useCallback(
    (newNodes: DiagramNode[]) => {
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, nodes: newNodes } : page
      );
      persistDocument({ ...document, pages: updatedPages });
    },
    [document, currentPage, persistDocument]
  );

  // Update single node
  const handleUpdateSingleNode = useCallback(
    (updatedNode: DiagramNode) => {
      const updatedNodes = currentPage.nodes.map(n =>
        n.id === updatedNode.id ? updatedNode : n
      );
      handleUpdateNodes(updatedNodes);
    },
    [currentPage, handleUpdateNodes]
  );

  // Delete single node & connected edges
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const updatedNodes = currentPage.nodes.filter(n => n.id !== nodeId);
      const updatedEdges = currentPage.edges.filter(
        e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
      );
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id
          ? { ...page, nodes: updatedNodes, edges: updatedEdges }
          : page
      );
      persistDocument({ ...document, pages: updatedPages });
      setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
    },
    [document, currentPage, persistDocument]
  );

  // Batch delete multiple nodes & connected edges (Change 3)
  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      const updatedNodes = currentPage.nodes.filter(n => !nodeIds.includes(n.id));
      const updatedEdges = currentPage.edges.filter(
        e => !nodeIds.includes(e.sourceNodeId) && !nodeIds.includes(e.targetNodeId)
      );
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id
          ? { ...page, nodes: updatedNodes, edges: updatedEdges }
          : page
      );
      persistDocument({ ...document, pages: updatedPages });
      setSelectedNodeIds(prev => prev.filter(id => !nodeIds.includes(id)));
    },
    [document, currentPage, persistDocument]
  );

  // Add edge connector
  const handleAddEdge = useCallback(
    (newEdge: DiagramEdge) => {
      const updatedEdges = [...currentPage.edges, newEdge];
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, edges: updatedEdges } : page
      );
      persistDocument({ ...document, pages: updatedPages });
    },
    [document, currentPage, persistDocument]
  );

  // Update edge connector (Change 1: Flip connector style)
  const handleUpdateEdge = useCallback(
    (updatedEdge: DiagramEdge) => {
      const updatedEdges = currentPage.edges.map(e =>
        e.id === updatedEdge.id ? updatedEdge : e
      );
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, edges: updatedEdges } : page
      );
      persistDocument({ ...document, pages: updatedPages });
    },
    [document, currentPage, persistDocument]
  );

  // Delete single edge
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const updatedEdges = currentPage.edges.filter(e => e.id !== edgeId);
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, edges: updatedEdges } : page
      );
      persistDocument({ ...document, pages: updatedPages });
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [document, currentPage, selectedEdgeId, persistDocument]
  );

  // Delete selected element (nodes or edge)
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      handleDeleteNodes(selectedNodeIds);
    } else if (selectedEdgeId) {
      const updatedEdges = currentPage.edges.filter(e => e.id !== selectedEdgeId);
      const updatedPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, edges: updatedEdges } : page
      );
      persistDocument({ ...document, pages: updatedPages });
      setSelectedEdgeId(null);
    }
  }, [selectedNodeIds, selectedEdgeId, currentPage, handleDeleteNodes, document, persistDocument]);

  // Drop or add new shape from template
  const handleDropNewShape = useCallback(
    (templateId: string, canvasX: number, canvasY: number) => {
      const template = SHAPE_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      const newNode: DiagramNode = {
        ...JSON.parse(JSON.stringify(template.defaultNode)),
        id: `node-${Date.now()}`,
        x: canvasX,
        y: canvasY,
      };

      // Mind map nodes default to Gradual Darkening Fill (Change 7)
      if (currentPage.diagramType === 'mindmap') {
        newNode.style = {
          ...newNode.style,
          gradient: true,
        };
      }

      // Check if dropped inside a container group
      const enclosingGroup = currentPage.nodes.find(
        g =>
          g.isGroup &&
          canvasX >= g.x &&
          canvasY >= g.y &&
          canvasX + newNode.width <= g.x + g.width &&
          canvasY + newNode.height <= g.y + g.height
      );

      if (enclosingGroup) {
        newNode.parentId = enclosingGroup.id;
      }

      const updatedNodes = [...currentPage.nodes, newNode];
      handleUpdateNodes(updatedNodes);
      setSelectedNodeId(newNode.id);
      setIsInspectorOpen(true);
    },
    [currentPage, handleUpdateNodes]
  );

  // Drill-down into a child page (Sub-Process Navigation)
  const handleDrillDown = useCallback(
    (pageId: string) => {
      const targetPage = document.pages.find(p => p.id === pageId);
      if (targetPage) {
        requestNavigation(() => {
          setActivePageId(pageId);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          collaborationService.addActivity(
            'You',
            '#3b82f6',
            `Drilled down into '${targetPage.title}'`
          );
        }, targetPage.title);
      }
    },
    [document, requestNavigation]
  );

  // Create new page
  const handleCreatePage = useCallback(
    (title: string, diagramType: DiagramType, parentId?: string, description?: string) => {
      const newPage: DiagramPage = {
        id: `page-${Date.now()}`,
        title,
        diagramType,
        parentId,
        description: description || '',
        nodes: [],
        edges: [],
        viewport: { x: 50, y: 50, zoom: 1 },
      };

      const updatedPages = [...document.pages, newPage];
      const updatedDoc = {
        ...document,
        pages: updatedPages,
        activePageId: newPage.id,
      };
      setActivePageId(newPage.id);
      persistDocument(updatedDoc);
    },
    [document, persistDocument]
  );

  // Import ERD from SQL file (ERwin / PostgreSQL DDL)
  const handleImportErd = useCallback(
    (
      importedNodes: DiagramNode[],
      importedEdges: DiagramEdge[],
      mode: 'replace' | 'append' | 'new_page',
      newPageTitle?: string
    ) => {
      if (mode === 'new_page') {
        const pageTitle = newPageTitle?.trim() || 'PostgreSQL ERD';
        const newPage: DiagramPage = {
          id: `page-${Date.now()}`,
          title: pageTitle,
          diagramType: 'erd',
          nodes: importedNodes,
          edges: importedEdges,
          viewport: { x: 50, y: 50, zoom: 1 },
        };
        const updatedDoc = {
          ...document,
          pages: [...document.pages, newPage],
          activePageId: newPage.id,
        };
        setActivePageId(newPage.id);
        setSelectedCategory('erd');
        persistDocument(updatedDoc);
        collaborationService.addActivity(
          'You',
          '#0284c7',
          `Created ERD page "${pageTitle}" with ${importedNodes.length} tables from SQL`
        );
        return;
      }

      if (mode === 'replace') {
        const updatedPages = document.pages.map(page =>
          page.id === currentPage.id
            ? {
                ...page,
                diagramType: 'erd' as DiagramType,
                nodes: importedNodes,
                edges: importedEdges,
              }
            : page
        );
        persistDocument({ ...document, pages: updatedPages });
        setSelectedCategory('erd');
        collaborationService.addActivity(
          'You',
          '#0284c7',
          `Replaced ERD with ${importedNodes.length} tables from ERwin PostgreSQL SQL`
        );
        return;
      }

      if (mode === 'append') {
        let maxBottomY = 0;
        for (const n of currentPage.nodes) {
          if (n.y + n.height > maxBottomY) maxBottomY = n.y + n.height;
        }
        const offsetY = maxBottomY > 0 ? maxBottomY + 80 : 0;
        const shiftedNodes = importedNodes.map(n => ({
          ...n,
          y: n.y + offsetY,
        }));
        const updatedPages = document.pages.map(page =>
          page.id === currentPage.id
            ? {
                ...page,
                nodes: [...page.nodes, ...shiftedNodes],
                edges: [...page.edges, ...importedEdges],
              }
            : page
        );
        persistDocument({ ...document, pages: updatedPages });
        collaborationService.addActivity(
          'You',
          '#0284c7',
          `Appended ${importedNodes.length} tables from ERwin PostgreSQL SQL`
        );
      }
    },
    [document, currentPage, persistDocument]
  );

  // Flip between diagram types: Show last one open, or generate starter example!
  const handleFlipDiagramType = useCallback(
    (type: DiagramType) => {
      requestNavigation(() => {
        // 1. If we have a recorded last-opened page of this type that still exists:
        const lastId = lastPageByType[type];
        const existingLast = document.pages.find(p => p.id === lastId);
        if (existingLast) {
          setActivePageId(existingLast.id);
          setSelectedCategory(type);
          collaborationService.addActivity(
            'You',
            '#3b82f6',
            `Flipped to last visited ${type.toUpperCase()} page`
          );
          return;
        }

        // 2. Or check if any page of this type exists in document.pages:
        const existingAny = document.pages.find(p => p.diagramType === type);
        if (existingAny) {
          setActivePageId(existingAny.id);
          setSelectedCategory(type);
          collaborationService.addActivity(
            'You',
            '#3b82f6',
            `Switched to ${existingAny.title}`
          );
          return;
        }

        // 3. Otherwise, automatically instantiate a rich starter example diagram!
        const examplePage = getExampleDiagramForType(type);
        const updatedPages = [...document.pages, examplePage];
        const updatedDoc = {
          ...document,
          pages: updatedPages,
          activePageId: examplePage.id,
        };
        persistDocument(updatedDoc);
        setActivePageId(examplePage.id);
        setSelectedCategory(type);
        setLastPageByType(prev => ({ ...prev, [type]: examplePage.id }));
        collaborationService.addActivity(
          'You',
          '#10b981',
          `Created starter example for ${type.toUpperCase()}`
        );
      }, type.toUpperCase());
    },
    [document, lastPageByType, persistDocument, requestNavigation]
  );

  // Version snapshot commits
  const handleCreateVersion = useCallback(
    async (name: string, description: string, summary: string) => {
      const nextVerNumber =
        (document.versions.length
          ? Math.max(...document.versions.map(v => v.versionNumber))
          : 0) + 1;

      const newVer = {
        id: `ver-${Date.now()}`,
        versionNumber: nextVerNumber,
        name,
        description,
        createdAt: new Date().toISOString(),
        createdBy: userRole === 'admin' ? 'Sarah Chen (Lead Architect)' : 'Current User',
        changesSummary: summary,
        snapshot: {
          pages: JSON.parse(JSON.stringify(document.pages)),
          activePageId: document.activePageId,
        },
      };

      const updatedVersions = [newVer, ...document.versions];
      persistDocument({ ...document, versions: updatedVersions });

      if (offlineSyncService.isOnline()) {
        try {
          await fetch(`/api/diagrams/${document.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVer),
          });
        } catch (e) {
          console.warn('Version sync failed:', e);
        }
      }
    },
    [document, userRole, persistDocument]
  );

  // Restore previous version snapshot
  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      const targetVersion = document.versions.find(v => v.id === versionId);
      if (!targetVersion) return;

      const restoredPages = JSON.parse(
        JSON.stringify(targetVersion.snapshot.pages)
      );
      const restoredDoc: DiagramDocument = {
        ...document,
        pages: restoredPages,
        activePageId: targetVersion.snapshot.activePageId || restoredPages[0].id,
      };

      setActivePageId(restoredDoc.activePageId);
      persistDocument(restoredDoc);
      setIsVersionsModalOpen(false);
    },
    [document, persistDocument]
  );

  // Open Child Diagram creation/linking modal for a node (Change 4)
  const handleOpenChildDiagramModal = useCallback((node: DiagramNode) => {
    setChildModalNode(node);
  }, []);

  // Link child diagram info to a node (supporting multiple child diagrams per node)
  const handleLinkChildDiagram = useCallback(
    (nodeId: string, filename: string, title: string, childType: DiagramType) => {
      const updatedNodes = currentPage.nodes.map(n => {
        if (n.id !== nodeId) return n;
        const currentChildren = getNodeChildDiagrams(n);
        const existingIdx = currentChildren.findIndex(c => c.filename === filename);
        const newRef: ChildDiagramRef = {
          id: existingIdx >= 0
            ? currentChildren[existingIdx].id
            : `child_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          filename,
          title: title || filename,
          diagramType: childType,
          createdAt: new Date().toISOString(),
        };
        const nextChildren = existingIdx >= 0
          ? currentChildren.map((c, i) => (i === existingIdx ? newRef : c))
          : [...currentChildren, newRef];

        return {
          ...n,
          childDiagrams: nextChildren,
          childDiagramFilename: filename,
          childDiagramTitle: title,
          childDiagramType: childType,
        };
      });
      handleUpdateNodes(updatedNodes);
    },
    [currentPage, handleUpdateNodes]
  );

  // Unlink a specific child diagram from a node
  const handleUnlinkChildDiagram = useCallback(
    (nodeId: string, filename?: string) => {
      const updatedNodes = currentPage.nodes.map(n => {
        if (n.id !== nodeId) return n;
        const currentChildren = getNodeChildDiagrams(n);
        const filtered = filename
          ? currentChildren.filter(c => c.filename !== filename)
          : [];
        const primary = filtered[0];
        return {
          ...n,
          childDiagrams: filtered,
          childDiagramFilename: primary ? primary.filename : undefined,
          childDiagramTitle: primary ? primary.title : undefined,
          childDiagramType: primary ? primary.diagramType : undefined,
        };
      });
      handleUpdateNodes(updatedNodes);
    },
    [currentPage, handleUpdateNodes]
  );

  // Atomically create a new empty child diagram, link it to the parent node, and navigate straight to it
  const handleCreateAndNavigateChildDiagram = useCallback(
    async (nodeId: string, filename: string, title: string, childType: DiagramType) => {
      const currentWs = workspaceService.getActiveWorkspace();
      const parentFilename = currentWs.activeDiagramFilename || 'root.json';
      const parentNode = currentPage.nodes.find(n => n.id === nodeId);

      let safeFilename = filename.trim().toLowerCase();
      if (!safeFilename.endsWith('.json')) safeFilename += '.json';
      safeFilename = safeFilename.replace(/[^a-z0-9._-]/g, '_');

      // 1. Create a child reference on the parent node
      const newRef: ChildDiagramRef = {
        id: `child_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filename: safeFilename,
        title: title || safeFilename,
        diagramType: childType,
        createdAt: new Date().toISOString(),
      };

      const updatedNodes = currentPage.nodes.map(n => {
        if (n.id !== nodeId) return n;
        const currentChildren = getNodeChildDiagrams(n);
        const existingIdx = currentChildren.findIndex(c => c.filename === safeFilename);
        const nextChildren = existingIdx >= 0
          ? currentChildren.map((c, i) => (i === existingIdx ? newRef : c))
          : [...currentChildren, newRef];
        return {
          ...n,
          childDiagrams: nextChildren,
          childDiagramFilename: safeFilename,
          childDiagramTitle: title,
          childDiagramType: childType,
        };
      });

      const updatedParentPages = document.pages.map(page =>
        page.id === currentPage.id ? { ...page, nodes: updatedNodes } : page
      );
      const updatedParentDoc: DiagramDocument = {
        ...document,
        pages: updatedParentPages,
      };

      // 2. Persist the updated parent diagram explicitly to parentFilename
      workspaceService.updateLocalDiagramCache(parentFilename, updatedParentDoc);
      await workspaceService.saveCurrentDiagramToServer(updatedParentDoc, parentFilename);

      // 3. Push parent onto navigation history
      setNavigationHistory(prev => [
        ...prev,
        {
          filename: parentFilename,
          diagramName: updatedParentDoc.name || parentFilename,
          pageId: activePageId,
          nodeLabel: parentNode?.label || 'Parent Node',
        },
      ]);

      // 4. Create the new child diagram with an EMPTY canvas as requested
      const childDoc = workspaceService.createDiagram(
        safeFilename,
        title.trim(),
        undefined,
        childType,
        true // isEmpty: true -> clean empty canvas
      );

      // Save child diagram synchronously to server disk
      await workspaceService.saveCurrentDiagramToServer(childDoc, safeFilename);

      // 5. Activate the child diagram and update state to display the empty new child diagram
      workspaceService.setActiveDiagram(safeFilename);
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
      setDocument(childDoc);
      offlineSyncService.cacheDocument(childDoc);
      if (childDoc.pages && childDoc.pages.length > 0) {
        setActivePageId(childDoc.activePageId || childDoc.pages[0].id);
      }
      setSelectedCategory(childType);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setChildModalNode(null);

      collaborationService.addActivity(
        'You',
        '#8b5cf6',
        `Created and navigated to child diagram '${safeFilename}' (${childType.toUpperCase()})`
      );
    },
    [currentPage, document, activePageId]
  );

  // Navigate into a child diagram JSON file (pushing current parent to history stack)
  const handleNavigateToChildDiagram = useCallback(
    async (filename: string, nodeLabel?: string) => {
      const currentWs = workspaceService.getActiveWorkspace();
      const currentFilename = currentWs.activeDiagramFilename || 'root.json';

      // Save current document before navigating explicitly to currentFilename
      workspaceService.saveCurrentDiagram(document, currentFilename);
      workspaceService.updateLocalDiagramCache(currentFilename, document);
      await workspaceService.saveCurrentDiagramToServer(document, currentFilename);

      // Push to history
      setNavigationHistory(prev => [
        ...prev,
        {
          filename: currentFilename,
          diagramName: document.name || currentFilename,
          pageId: activePageId,
          nodeLabel: nodeLabel || selectedNode?.label,
        },
      ]);

      // Load child diagram from workspace storage or server disk
      const childDoc = await workspaceService.loadAndSetActiveDiagram(filename);
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
      setDocument(childDoc);
      offlineSyncService.cacheDocument(childDoc);
      if (childDoc.pages && childDoc.pages.length > 0) {
        setActivePageId(childDoc.activePageId || childDoc.pages[0].id);
      }
      if (childDoc.pages?.[0]?.diagramType) {
        setSelectedCategory(childDoc.pages[0].diagramType);
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      collaborationService.addActivity(
        'You',
        '#8b5cf6',
        `Navigated into child diagram '${filename}'`
      );
    },
    [document, activePageId, selectedNode]
  );

  // Return to the parent diagram in the breadcrumb history
  const handleNavigateBackParent = useCallback(async () => {
    if (navigationHistory.length === 0) return;

    const currentWs = workspaceService.getActiveWorkspace();
    const currentFilename = currentWs.activeDiagramFilename || 'child.json';

    // Save current child diagram
    workspaceService.saveCurrentDiagram(document, currentFilename);
    workspaceService.updateLocalDiagramCache(currentFilename, document);
    await workspaceService.saveCurrentDiagramToServer(document, currentFilename);

    const prevHistory = [...navigationHistory];
    const parentEntry = prevHistory.pop()!;
    setNavigationHistory(prevHistory);

    const parentDoc = await workspaceService.loadAndSetActiveDiagram(parentEntry.filename);
    setActiveWs({ ...workspaceService.getActiveWorkspace() });
    setDocument(parentDoc);
    offlineSyncService.cacheDocument(parentDoc);
    if (parentEntry.pageId && parentDoc.pages.some(p => p.id === parentEntry.pageId)) {
      setActivePageId(parentEntry.pageId);
    } else if (parentDoc.pages && parentDoc.pages.length > 0) {
      setActivePageId(parentDoc.activePageId || parentDoc.pages[0].id);
    }
    if (parentDoc.pages?.[0]?.diagramType) {
      setSelectedCategory(parentDoc.pages[0].diagramType);
    }
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    collaborationService.addActivity(
      'You',
      '#3b82f6',
      `Returned to parent diagram '${parentEntry.filename}'`
    );
  }, [document, navigationHistory]);

  // Switch directly to any diagram in the workspace
  const handleSwitchDiagram = useCallback(
    async (filename: string) => {
      const currentWs = workspaceService.getActiveWorkspace();
      const currentFilename = currentWs.activeDiagramFilename || 'root.json';
      if (filename === currentFilename) return;

      // Save current document before switching
      workspaceService.saveCurrentDiagram(document, currentFilename);
      workspaceService.updateLocalDiagramCache(currentFilename, document);
      await workspaceService.saveCurrentDiagramToServer(document, currentFilename);

      const targetDoc = await workspaceService.loadAndSetActiveDiagram(filename);
      setActiveWs({ ...workspaceService.getActiveWorkspace() });
      setDocument(targetDoc);
      offlineSyncService.cacheDocument(targetDoc);
      setSaveStatus('idle');
      if (targetDoc.pages && targetDoc.pages.length > 0) {
        setActivePageId(targetDoc.activePageId || targetDoc.pages[0].id);
      }
      if (targetDoc.pages?.[0]?.diagramType) {
        setSelectedCategory(targetDoc.pages[0].diagramType);
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [document]
  );

  const handleLoadWorkspaceDiagram = useCallback(
    (doc: DiagramDocument) => {
      setDocument(doc);
      offlineSyncService.cacheDocument(doc);
      setSaveStatus('idle');
      if (doc.pages && doc.pages.length > 0) {
        setActivePageId(doc.activePageId || doc.pages[0].id);
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    []
  );

  const handleUpdateSettings = useCallback((newSettings: StudioSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('omnimind_settings_v1', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    const themeKeys: AppTheme[] = [
      'dark',
      'light',
      'pastel-mint',
      'pastel-rose',
      'pastel-lavender',
      'pastel-peach',
      'pastel-sky',
      'parchment',
      'nord',
      'cyberpunk',
      'monochrome',
    ];
    const nextIdx = (themeKeys.indexOf(settings.theme) + 1) % themeKeys.length;
    handleUpdateSettings({ ...settings, theme: themeKeys[nextIdx] });
  }, [settings, handleUpdateSettings]);

  // Global Ctrl+S keyboard shortcut to save diagram
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden transition-colors duration-200 ${
        currentThemeDef.isDark ? 'dark' : ''
      }`}
      style={{ backgroundColor: currentThemeDef.canvasBg }}
    >
      {/* Top Application Header with Breadcrumbs, RBAC & Status */}
      <AppHeader
        document={document}
        currentPage={currentPage}
        collaborators={collaborators}
        userRole={userRole}
        isOnline={isOnline}
        queuedCount={syncQueue.length}
        theme={settings.theme}
        saveStatus={saveStatus}
        activeWorkspaceName={activeWs.name}
        activeDiagramFilename={activeWs.activeDiagramFilename}
        navigationHistory={navigationHistory}
        onNavigateBack={handleNavigateBackParent}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onManualSave={handleManualSave}
        onSelectPage={pageId => {
          const target = document.pages.find(p => p.id === pageId);
          requestNavigation(() => {
            setActivePageId(pageId);
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }, target?.title);
        }}
        onOpenNewPageModal={() => setIsNewPageModalOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenVersionsModal={() => setIsVersionsModalOpen(true)}
        onOpenRestApiModal={() => setIsRestApiModalOpen(true)}
        onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
        onOpenImportSqlModal={() => setIsImportSqlModalOpen(true)}
        onOpenGenerateMindmapModal={() => setIsGenerateMindmapModalOpen(true)}
        onChangeRole={setUserRole}
        onToggleTheme={handleToggleTheme}
        onSwitchDiagram={handleSwitchDiagram}
      />

      {/* Main Studio Body: Sidebar + Canvas + Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Shape & Tool Palette */}
        <ShapePaletteSidebar
          currentDiagramType={currentPage.diagramType}
          userRole={userRole}
          selectedCategory={selectedCategory}
          theme={settings.theme}
          activeDiagramFilename={activeWs.activeDiagramFilename || 'root.json'}
          navigationHistory={navigationHistory}
          onNavigateBack={handleNavigateBackParent}
          onSwitchDiagram={handleSwitchDiagram}
          onSelectCategory={cat => {
            setSelectedCategory(cat);
          }}
          onSelectTemplate={templateId => {
            handleDropNewShape(templateId, 240, 200);
          }}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenImportSqlModal={() => setIsImportSqlModalOpen(true)}
          onLoadDiagram={handleLoadWorkspaceDiagram}
        />

        {/* Center: Infinite Interactive Diagram Canvas */}
        <DiagramCanvas
          pageId={currentPage.id}
          activeDiagramFilename={activeWs.activeDiagramFilename || 'root.json'}
          nodes={currentPage.nodes}
          edges={currentPage.edges}
          collaborators={collaborators}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeId={selectedEdgeId}
          userRole={userRole}
          theme={settings.theme}
          diagramType={currentPage.diagramType}
          settings={settings}
          onSelectNode={(nodeId, isMultiSelect) => {
            if (nodeId === null) {
              setSelectedNodeIds([]);
              return;
            }
            if (isMultiSelect) {
              setSelectedNodeIds(prev =>
                prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
              );
            } else {
              setSelectedNodeIds([nodeId]);
            }
            setSelectedEdgeId(null);
            setIsInspectorOpen(true);
          }}
          onSelectMultipleNodes={nodeIds => {
            setSelectedNodeIds(nodeIds);
            if (nodeIds.length > 0) {
              setSelectedEdgeId(null);
              setIsInspectorOpen(true);
            }
          }}
          onSelectEdge={edgeId => {
            setSelectedEdgeId(edgeId);
            if (edgeId) {
              setSelectedNodeIds([]);
              setIsInspectorOpen(true);
            }
          }}
          onUpdateNodes={handleUpdateNodes}
          onAddEdge={handleAddEdge}
          onUpdateEdge={handleUpdateEdge}
          onDeleteSelected={handleDeleteSelected}
          onDrillDown={handleDrillDown}
          onOpenDoc={node => {
            setSelectedNodeIds([node.id]);
            setIsInspectorOpen(true);
          }}
          onDropNewShape={handleDropNewShape}
          onOpenNewPageModal={() => setIsNewPageModalOpen(true)}
          onDeleteEdge={handleDeleteEdge}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenChildDiagramModal={handleOpenChildDiagramModal}
          onNavigateChildDiagram={handleNavigateToChildDiagram}
          onOpenImportSqlModal={() => setIsImportSqlModalOpen(true)}
          onOpenGenerateMindmapModal={() => setIsGenerateMindmapModalOpen(true)}
          onUpdateNodeLabel={(nodeId, label) => {
            const targetNode = currentPage.nodes.find(n => n.id === nodeId);
            if (targetNode) {
              handleUpdateSingleNode({ ...targetNode, label });
            }
          }}
        />

        {/* Right Sidebar: Inspector, Documentation, Comments & Groups (Only displayed when a node or connector is selected) */}
        {isInspectorOpen && (selectedNodes.length > 0 || selectedEdgeId) && (
          <NodeInspector
            selectedNode={selectedNode}
            selectedNodes={selectedNodes}
            selectedEdge={currentPage.edges.find(e => e.id === selectedEdgeId) || null}
            currentPage={currentPage}
            allPages={document.pages}
            userRole={userRole}
            theme={settings.theme}
            onUpdateNode={handleUpdateSingleNode}
            onUpdateNodes={handleUpdateNodes}
            onUpdateEdge={handleUpdateEdge}
            onDeleteNode={handleDeleteNode}
            onDeleteNodes={handleDeleteNodes}
            onDeleteEdge={handleDeleteEdge}
            onClose={() => setIsInspectorOpen(false)}
            onDrillDown={handleDrillDown}
            onOpenChildDiagramModal={handleOpenChildDiagramModal}
            onNavigateChildDiagram={handleNavigateToChildDiagram}
            onUnlinkChildDiagram={handleUnlinkChildDiagram}
          />
        )}
      </div>

      {/* Modals */}
      <DiagramTypesGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        currentType={currentPage.diagramType}
        theme={settings.theme}
        onSelectDiagramType={type => setSelectedCategory(type)}
        onCreateNewPageOfType={(type, name) => {
          handleCreatePage(name, type);
          setSelectedCategory(type);
        }}
        onFilterToolbox={type => setSelectedCategory(type)}
      />

      <GitHubPublishModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        document={document}
        currentPage={currentPage}
      />

      <VersionHistoryModal
        isOpen={isVersionsModalOpen}
        onClose={() => setIsVersionsModalOpen(false)}
        versions={document.versions}
        userRole={userRole}
        onCreateVersion={handleCreateVersion}
        onRestoreVersion={handleRestoreVersion}
      />

      <RestApiModal
        isOpen={isRestApiModalOpen}
        onClose={() => setIsRestApiModalOpen(false)}
        document={document}
        onImportJson={imported => {
          persistDocument(imported);
          setActivePageId(imported.pages[0].id);
        }}
      />

      <OfflineSyncModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        queue={syncQueue}
        onTriggerSync={async () => {
          await offlineSyncService.flushQueue();
        }}
        onToggleSimulatedOffline={() => {
          offlineSyncService.toggleSimulatedOffline();
        }}
      />

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        pages={document.pages}
        theme={settings.theme}
        onCreatePage={handleCreatePage}
      />

      <CreateChildDiagramModal
        isOpen={!!childModalNode}
        parentNode={childModalNode}
        parentDiagramType={currentPage.diagramType}
        theme={settings.theme}
        onClose={() => setChildModalNode(null)}
        onNavigateToChildDiagram={handleNavigateToChildDiagram}
        onLinkChildDiagram={handleLinkChildDiagram}
        onCreateAndNavigateChildDiagram={handleCreateAndNavigateChildDiagram}
      />

      <SaveSuccessModal
        isOpen={isSaveSuccessModalOpen}
        onClose={() => setIsSaveSuccessModalOpen(false)}
        fullPath={workspaceService.getFullPath()}
        windowsPath={workspaceService.getWindowsFullPath()}
        filename={activeWs.activeDiagramFilename || 'diagram1.json'}
        diagramName={document.name || 'Diagram'}
        workspaceName={activeWs.name}
        theme={settings.theme}
        document={document}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
      />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onLoadDiagram={handleLoadWorkspaceDiagram}
        theme={settings.theme}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        document={document}
        activeWorkspacePath={workspaceService.getActiveWorkspacePath()}
        onManualSave={handleManualSave}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
      />

      <ImportSqlModal
        isOpen={isImportSqlModalOpen}
        onClose={() => setIsImportSqlModalOpen(false)}
        currentPageName={currentPage.title}
        theme={settings.theme}
        onImportErd={handleImportErd}
      />

      <GenerateMindmapModal
        isOpen={isGenerateMindmapModalOpen}
        onClose={() => setIsGenerateMindmapModalOpen(false)}
        currentPageName={currentPage.title}
        theme={settings.theme}
        onMindmapGenerated={(title: string, description: string, genNodes: DiagramNode[], genEdges: DiagramEdge[]) => {
          const updatedPages = document.pages.map(page => {
            if (page.id !== activePageId) return page;
            return {
              ...page,
              title: page.title === 'Mind Map' || page.title.startsWith('Page ') || page.title === 'Untitled Diagram' ? title : page.title,
              nodes: genNodes,
              edges: genEdges,
            };
          });

          const updatedDoc: DiagramDocument = {
            ...document,
            pages: updatedPages,
            updatedAt: new Date().toISOString(),
          };

          persistDocument(updatedDoc);
          setSaveStatus('unsaved');
          setSelectedNodeIds(genNodes.map(n => n.id));
        }}
      />

      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        targetDestinationName={pendingNavigation?.targetName}
        onSaveAndContinue={handleSaveAndContinue}
        onDiscardAndContinue={handleDiscardAndContinue}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
}
