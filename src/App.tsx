/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { scriptEvaluationService } from './services/scriptEvaluationService';
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
import { GenerateFlowchartModal } from './components/modals/GenerateFlowchartModal';
import { UnsavedChangesModal } from './components/modals/UnsavedChangesModal';
import { ImageLightboxModal } from './components/modals/ImageLightboxModal';
import { NodeImageAttachment } from './types/diagram';
import { workspaceService } from './services/workspaceService';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import { THEMES } from './utils/themeConfig';
import { AggregationsPanel } from './components/aggregations/AggregationsPanel';
import { collectAggregationsFromPageAndChildren } from './utils/descriptionAggregation';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  // Document state
  const [document, setDocument] = useState<DiagramDocument>(() => {
    const activeWsDiag = workspaceService.getActiveDiagram()?.document;
    return activeWsDiag || offlineSyncService.getCachedDocument() || initialDiagramDocument;
  });

  const activeWorkspaceIdRef = useRef<string>(
    workspaceService.getActiveWorkspace().id || 'workspace1'
  );
  const activeDiagramFilenameRef = useRef<string>(
    workspaceService.getActiveWorkspace().activeDiagramFilename || 'root.json'
  );
  const saveStatusRef = useRef<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const isSwitchingDiagramRef = useRef<boolean>(false);
  const documentRef = useRef<DiagramDocument>(document);
  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const [scriptEvalVersion, setScriptEvalVersion] = useState(0);
  useEffect(() => {
    const unsub = scriptEvaluationService.subscribe(() => {
      setScriptEvalVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const [activePageId, setActivePageId] = useState<string>(() => {
    const activeWsDiag = workspaceService.getActiveDiagram()?.document;
    return (
      activeWsDiag?.activePageId ||
      activeWsDiag?.pages?.[0]?.id ||
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
  const [selectedCategory, setSelectedCategory] = useState<string>('generic');
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
  const [isGenerateFlowchartModalOpen, setIsGenerateFlowchartModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  // Aggregations Down Right Side State (Change 2)
  const [isAggregationsOpen, setIsAggregationsOpen] = useState(false);
  const [selectedAggregationField, setSelectedAggregationField] = useState<string | null>(null);
  const [showAggregationBadges, setShowAggregationBadges] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<{
    action: () => void | Promise<void>;
    targetName?: string;
  } | null>(null);
  const [activeWs, setActiveWs] = useState(() => workspaceService.getActiveWorkspace());
  const [childModalNode, setChildModalNode] = useState<DiagramNode | null>(null);
  const [lightboxData, setLightboxData] = useState<{
    image: NodeImageAttachment;
    allImages?: NodeImageAttachment[];
  } | null>(null);
  const [imageNotice, setImageNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (imageNotice) {
      const t = setTimeout(() => setImageNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [imageNotice]);

  const handleOpenImageLightbox = useCallback((image: NodeImageAttachment, allImages?: NodeImageAttachment[]) => {
    setLightboxData({ image, allImages });
  }, []);
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

  // Hydrate settings from persistent server config (outside git repo, in user profile)
  useEffect(() => {
    let isMounted = true;
    workspaceService.fetchPersistentSettings().then(data => {
      if (!isMounted || !data?.settings) return;
      const s = data.settings;
      setSettings(prev => {
        const merged: StudioSettings = {
          ...prev,
          theme: s.theme || prev.theme,
          gridStyle: s.gridStyle || prev.gridStyle,
          gridSize: s.gridSize || prev.gridSize,
          snapToGrid: typeof s.snapToGrid === 'boolean' ? s.snapToGrid : prev.snapToGrid,
          showHoverTooltips: typeof s.showHoverTooltips === 'boolean' ? s.showHoverTooltips : prev.showHoverTooltips,
          showCollaborators: typeof s.showCollaborators === 'boolean' ? s.showCollaborators : prev.showCollaborators,
          autoSaveInterval: s.autoSaveInterval || prev.autoSaveInterval,
          defaultConnectorType: s.defaultConnectorType || prev.defaultConnectorType,
          rootDir: s.rootDir || prev.rootDir,
        };
        try {
          localStorage.setItem('omnimind_settings_v1', JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Aggregation results from current page & all child pages (Change 2)
  const aggregationResult = React.useMemo(() => {
    if (!currentPage) return { groups: [], totalSearchedPages: 1, totalItemsFound: 0 };
    return collectAggregationsFromPageAndChildren(currentPage, document, activeWs);
  }, [currentPage, document, activeWs, scriptEvalVersion]);

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
          const wsId = ws.id;
          const targetFilename = ws.activeDiagramFilename || 'root.json';
          // Try loading from workspace server disk first
          const fileRes = await fetch(`/api/workspaces/${wsId}/files/${targetFilename}`);
          if (fileRes.ok) {
            const data: DiagramDocument = await fileRes.json();
            if (
              activeWorkspaceIdRef.current !== wsId ||
              activeDiagramFilenameRef.current !== targetFilename ||
              saveStatusRef.current === 'unsaved'
            ) {
              return;
            }
            const freshData: DiagramDocument = JSON.parse(JSON.stringify(data));
            documentRef.current = freshData;
            setDocument(freshData);
            if (freshData.pages?.length > 0) {
              setActivePageId(freshData.activePageId || freshData.pages[0].id);
            }
            offlineSyncService.cacheDocument(freshData);
            workspaceService.updateLocalDiagramCache(targetFilename, freshData, wsId);
            return;
          }

          if (targetFilename === 'root.json') {
            const res = await fetch(`/api/diagrams/${initialDiagramDocument.id}`);
            if (res.ok) {
              const data: DiagramDocument = await res.json();
              if (
                activeWorkspaceIdRef.current !== wsId ||
                activeDiagramFilenameRef.current !== targetFilename ||
                saveStatusRef.current === 'unsaved'
              ) {
                return;
              }
              const freshData: DiagramDocument = JSON.parse(JSON.stringify(data));
              documentRef.current = freshData;
              setDocument(freshData);
              if (freshData.pages?.length > 0) {
                setActivePageId(freshData.activePageId || freshData.pages[0].id);
              }
              offlineSyncService.cacheDocument(freshData);
              workspaceService.updateLocalDiagramCache('root.json', freshData, wsId);
            }
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
    documentRef.current = updatedDoc;
    setDocument(updatedDoc);
    saveStatusRef.current = 'unsaved';
    setSaveStatus('unsaved');
    offlineSyncService.cacheDocument(updatedDoc);
    const wsId = activeWorkspaceIdRef.current || workspaceService.getActiveWorkspace().id;
    const filename =
      activeDiagramFilenameRef.current ||
      workspaceService.getActiveWorkspace().activeDiagramFilename ||
      'root.json';
    workspaceService.saveCurrentDiagram(updatedDoc, filename, wsId);
  }, []);

  const handleManualSave = useCallback(async (customTargetFilename?: unknown, customWorkspaceId?: string) => {
    saveStatusRef.current = 'saving';
    setSaveStatus('saving');
    const wsId = customWorkspaceId || activeWorkspaceIdRef.current || workspaceService.getActiveWorkspace().id;
    const ws = workspaceService.getStore().workspaces[wsId] || workspaceService.getActiveWorkspace();
    const explicitFilename =
      typeof customTargetFilename === 'string' &&
      customTargetFilename.trim() &&
      !customTargetFilename.includes('[object') &&
      !customTargetFilename.includes('object_Object')
        ? customTargetFilename.trim()
        : null;
    const filename = explicitFilename || activeDiagramFilenameRef.current || ws.activeDiagramFilename || 'root.json';
    const docToSave = JSON.parse(JSON.stringify(documentRef.current));
    workspaceService.saveCurrentDiagram(docToSave, filename, wsId);
    workspaceService.updateLocalDiagramCache(filename, docToSave, wsId);
    // Persist synchronously to server disk
    const result = await workspaceService.saveCurrentDiagramToServer(docToSave, filename, wsId);
    if (!result.success) {
      console.error('[OmniMind App] Save diagram failed:', result.error, result.details);
      saveStatusRef.current = 'unsaved';
      setSaveStatus('unsaved');
      return;
    }
    collaborationService.addActivity(
      'You',
      '#10b981',
      `Saved diagram to ${ws.name}/${filename}`
    );
    saveStatusRef.current = 'saved';
    setSaveStatus('saved');
    setTimeout(() => {
      if (saveStatusRef.current === 'saved') {
        saveStatusRef.current = 'idle';
        setSaveStatus('idle');
      }
    }, 2500);
  }, []);

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
    saveStatusRef.current = 'idle';
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

  // Add image file from bottom-left "+ Add Image" button
  const handleAddImageFile = useCallback(
    async (file: File) => {
      // First, read locally as Data URL so node can appear IMMEDIATELY regardless of server state
      const readAsDataUrl = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      let localDataUrl = '';
      try {
        localDataUrl = await readAsDataUrl(file);
      } catch {
        localDataUrl = URL.createObjectURL(file);
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const tempId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const currentAttachment: NodeImageAttachment = {
        id: tempId,
        filename: file.name,
        title: cleanName,
        url: localDataUrl,
        size: file.size,
        mimeType: file.type || 'image/png',
        uploadedAt: new Date().toISOString(),
      };

      // Create or attach node on canvas FIRST so the user sees their image node immediately
      if (selectedNode) {
        const updatedImages = [...(selectedNode.images || []), currentAttachment];
        handleUpdateSingleNode({
          ...selectedNode,
          images: updatedImages,
        });
        setIsInspectorOpen(true);
      } else {
        const newNodeId = `node-img-${Date.now()}`;
        const newNode: DiagramNode = {
          id: newNodeId,
          type: 'image',
          label: cleanName,
          x: 240,
          y: 200,
          width: 160,
          height: 125,
          style: {
            fill: '#0f172a',
            stroke: '#38bdf8',
            strokeWidth: 2,
            textColor: '#f8fafc',
            rounded: 10,
          },
          data: {
            isImageNode: true,
            displayAsImagePreview: true,
          },
          images: [currentAttachment],
          documentation: {
            description: `Image: ${file.name}\nStored in workspace images/ folder. Displays as a compact image card; click expand to view full size.`,
            tags: ['Image'],
            status: 'approved',
          },
        };

        handleUpdateNodes([...currentPage.nodes, newNode]);
        setSelectedNodeIds([newNodeId]);
        setIsInspectorOpen(true);
      }

      setSaveStatus('saving');

      // Now sync with server storage in background
      try {
        const uploaded = await workspaceService.uploadWorkspaceImage(activeWs.id, file);
        // If node was updated, refresh with the server-persisted URL
        if (selectedNode) {
          const updatedImages = (selectedNode.images || []).map(img => (img.id === tempId ? uploaded : img));
          if (!updatedImages.some(img => img.id === uploaded.id)) {
            updatedImages.push(uploaded);
          }
          handleUpdateSingleNode({
            ...selectedNode,
            images: updatedImages,
          });
        }
        setSaveStatus('saved');
        setImageNotice({
          type: 'success',
          message: `Image "${uploaded.filename}" saved to workspace images/ folder!`,
        });
      } catch (err: any) {
        console.warn('Server image upload had an issue, kept local image on canvas:', err);
        setSaveStatus('idle');
        setImageNotice({
          type: 'info',
          message: `Image added to canvas using local data (Server: ${err?.message || 'saved locally'}).`,
        });
      }
    },
    [activeWs.id, selectedNode, handleUpdateSingleNode, handleUpdateNodes, currentPage.nodes]
  );

  const handleAddExistingImage = useCallback(
    (img: { filename: string; url: string; size: number }) => {
      const newAttachment: NodeImageAttachment = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filename: img.filename,
        title: img.filename.replace(/\.[^/.]+$/, ''),
        url: img.url,
        size: img.size,
        uploadedAt: new Date().toISOString(),
      };

      if (selectedNode) {
        const updatedImages = [...(selectedNode.images || []), newAttachment];
        handleUpdateSingleNode({
          ...selectedNode,
          images: updatedImages,
        });
        setIsInspectorOpen(true);
      } else {
        const cleanName = img.filename.replace(/\.[^/.]+$/, '');
        const newNodeId = `node-img-${Date.now()}`;
        const newNode: DiagramNode = {
          id: newNodeId,
          type: 'image',
          label: cleanName,
          x: 240,
          y: 200,
          width: 160,
          height: 125,
          style: {
            fill: '#0f172a',
            stroke: '#38bdf8',
            strokeWidth: 2,
            textColor: '#f8fafc',
            rounded: 10,
          },
          data: {
            isImageNode: true,
            displayAsImagePreview: true,
          },
          images: [newAttachment],
          documentation: {
            description: `Image: ${img.filename}\nStored in workspace images/ folder. Displays as a compact image card; click expand to view full size.`,
            tags: ['Image'],
            status: 'approved',
          },
        };

        handleUpdateNodes([...currentPage.nodes, newNode]);
        setSelectedNodeIds([newNodeId]);
        setIsInspectorOpen(true);
      }
    },
    [selectedNode, handleUpdateSingleNode, handleUpdateNodes, currentPage.nodes]
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

        // 3. Otherwise, create a clean empty diagram page for this type
        const emptyPage: DiagramPage = {
          id: `page-${type}-${Date.now()}`,
          title: `${type.toUpperCase()} Diagram`,
          diagramType: type,
          description: '',
          nodes: [],
          edges: [],
          viewport: { x: 50, y: 50, zoom: 1 },
        };
        const updatedPages = [...document.pages, emptyPage];
        const updatedDoc = {
          ...document,
          pages: updatedPages,
          activePageId: emptyPage.id,
        };
        persistDocument(updatedDoc);
        setActivePageId(emptyPage.id);
        setSelectedCategory(type);
        setLastPageByType(prev => ({ ...prev, [type]: emptyPage.id }));
        collaborationService.addActivity(
          'You',
          '#10b981',
          `Created empty ${type.toUpperCase()} diagram`
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
      if (isSwitchingDiagramRef.current) return;
      isSwitchingDiagramRef.current = true;

      try {
        const currentWs = workspaceService.getActiveWorkspace();
        const parentWsId = activeWorkspaceIdRef.current || currentWs.id;
        const parentFilename = activeDiagramFilenameRef.current || currentWs.activeDiagramFilename || 'root.json';
        const parentNode = currentPage.nodes.find(n => n.id === nodeId);

        const safeFilename = workspaceService.filenameExists(filename, parentWsId)
          ? workspaceService.getUniqueFilename(filename, parentWsId)
          : workspaceService.normalizeFilename(filename);

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
        const updatedParentDoc: DiagramDocument = JSON.parse(
          JSON.stringify({
            ...document,
            pages: updatedParentPages,
          })
        );

        // 2. Persist the updated parent diagram explicitly to (parentWsId, parentFilename)
        workspaceService.saveCurrentDiagram(updatedParentDoc, parentFilename, parentWsId);
        workspaceService.updateLocalDiagramCache(parentFilename, updatedParentDoc, parentWsId);
        await workspaceService.saveCurrentDiagramToServer(updatedParentDoc, parentFilename, parentWsId);

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
        await workspaceService.saveCurrentDiagramToServer(childDoc, safeFilename, parentWsId);

        // 5. Activate the child diagram and update refs/state atomically
        activeWorkspaceIdRef.current = parentWsId;
        activeDiagramFilenameRef.current = safeFilename;
        documentRef.current = childDoc;
        saveStatusRef.current = 'idle';
        workspaceService.setActiveDiagram(safeFilename);
        setActiveWs({ ...workspaceService.getActiveWorkspace(), activeDiagramFilename: safeFilename });
        setDocument(childDoc);
        offlineSyncService.cacheDocument(childDoc);
        setSaveStatus('idle');
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
      } finally {
        isSwitchingDiagramRef.current = false;
      }
    },
    [currentPage, document, activePageId]
  );

  // Navigate into a child diagram JSON file (pushing current parent to history stack)
  const handleNavigateToChildDiagram = useCallback(
    async (filename: string, nodeLabel?: string) => {
      if (isSwitchingDiagramRef.current) return;
      isSwitchingDiagramRef.current = true;

      try {
        const wsId = activeWorkspaceIdRef.current || workspaceService.getActiveWorkspace().id;
        const outgoingFilename = activeDiagramFilenameRef.current || 'root.json';
        const outgoingDoc = JSON.parse(JSON.stringify(documentRef.current));

        // Only persist outgoing diagram if it has unsaved changes
        if (saveStatusRef.current === 'unsaved') {
          workspaceService.saveCurrentDiagram(outgoingDoc, outgoingFilename, wsId);
          workspaceService.updateLocalDiagramCache(outgoingFilename, outgoingDoc, wsId);
          await workspaceService.saveCurrentDiagramToServer(outgoingDoc, outgoingFilename, wsId);
        }

        // Load child diagram before mutating navigation history or active refs
        const childDoc = await workspaceService.loadAndSetActiveDiagram(filename, wsId);
        const freshChildDoc: DiagramDocument = JSON.parse(JSON.stringify(childDoc));
        const resolvedFilename = workspaceService.getActiveWorkspace().activeDiagramFilename || filename;

        setNavigationHistory(prev => [
          ...prev,
          {
            filename: outgoingFilename,
            diagramName: outgoingDoc.name || outgoingFilename,
            pageId: activePageId,
            nodeLabel: nodeLabel || selectedNode?.label,
          },
        ]);

        activeWorkspaceIdRef.current = wsId;
        activeDiagramFilenameRef.current = resolvedFilename;
        documentRef.current = freshChildDoc;
        saveStatusRef.current = 'idle';
        setActiveWs({ ...workspaceService.getActiveWorkspace(), activeDiagramFilename: resolvedFilename });
        setDocument(freshChildDoc);
        offlineSyncService.cacheDocument(freshChildDoc);
        setSaveStatus('idle');
        if (freshChildDoc.pages && freshChildDoc.pages.length > 0) {
          setActivePageId(freshChildDoc.activePageId || freshChildDoc.pages[0].id);
        }
        if (freshChildDoc.pages?.[0]?.diagramType) {
          setSelectedCategory(freshChildDoc.pages[0].diagramType);
        }
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        collaborationService.addActivity(
          'You',
          '#8b5cf6',
          `Navigated into child diagram '${resolvedFilename}'`
        );
      } catch (err: any) {
        console.error('[App] Failed to navigate to child diagram:', err);
        setImageNotice({
          type: 'error',
          message: err?.message || `Could not open child diagram "${filename}".`,
        });
      } finally {
        isSwitchingDiagramRef.current = false;
      }
    },
    [activePageId, selectedNode]
  );

  // Return to the parent diagram in the breadcrumb history
  const handleNavigateBackParent = useCallback(async () => {
    if (navigationHistory.length === 0 || isSwitchingDiagramRef.current) return;
    isSwitchingDiagramRef.current = true;

    try {
      const wsId = activeWorkspaceIdRef.current || workspaceService.getActiveWorkspace().id;
      const childFilename = activeDiagramFilenameRef.current || 'root.json';
      const childDocToSave = JSON.parse(JSON.stringify(documentRef.current));

      // Only persist outgoing child diagram if it has unsaved edits
      if (saveStatusRef.current === 'unsaved') {
        workspaceService.saveCurrentDiagram(childDocToSave, childFilename, wsId);
        workspaceService.updateLocalDiagramCache(childFilename, childDocToSave, wsId);
        await workspaceService.saveCurrentDiagramToServer(childDocToSave, childFilename, wsId);
      }

      const prevHistory = [...navigationHistory];
      const parentEntry = prevHistory.pop()!;

      const parentDoc = await workspaceService.loadAndSetActiveDiagram(parentEntry.filename, wsId);
      const freshParentDoc: DiagramDocument = JSON.parse(JSON.stringify(parentDoc));
      const resolvedFilename = workspaceService.getActiveWorkspace().activeDiagramFilename || parentEntry.filename;

      setNavigationHistory(prevHistory);
      activeWorkspaceIdRef.current = wsId;
      activeDiagramFilenameRef.current = resolvedFilename;
      documentRef.current = freshParentDoc;
      saveStatusRef.current = 'idle';
      setActiveWs({ ...workspaceService.getActiveWorkspace(), activeDiagramFilename: resolvedFilename });
      setDocument(freshParentDoc);
      offlineSyncService.cacheDocument(freshParentDoc);
      setSaveStatus('idle'); // Crucial: Reset to idle so unprompted save doesn't trigger!

      if (parentEntry.pageId && freshParentDoc.pages?.some((p: DiagramPage) => p.id === parentEntry.pageId)) {
        setActivePageId(parentEntry.pageId);
      } else if (freshParentDoc.pages && freshParentDoc.pages.length > 0) {
        setActivePageId(freshParentDoc.activePageId || freshParentDoc.pages[0].id);
      }
      if (freshParentDoc.pages?.[0]?.diagramType) {
        setSelectedCategory(freshParentDoc.pages[0].diagramType);
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      collaborationService.addActivity(
        'You',
        '#3b82f6',
        `Returned to parent diagram '${resolvedFilename}'`
      );
    } catch (err: any) {
      console.error('[App] Failed to return to parent diagram:', err);
      setImageNotice({
        type: 'error',
        message: err?.message || 'Could not return to parent diagram.',
      });
    } finally {
      isSwitchingDiagramRef.current = false;
    }
  }, [navigationHistory]);

  // Switch directly to any diagram in the workspace
  const handleSwitchDiagram = useCallback(
    async (filename: string) => {
      if (isSwitchingDiagramRef.current) return;
      const wsId = activeWorkspaceIdRef.current || workspaceService.getActiveWorkspace().id;
      const currentFilename = activeDiagramFilenameRef.current || 'root.json';
      if (filename.toLowerCase() === currentFilename.toLowerCase()) return;

      isSwitchingDiagramRef.current = true;
      try {
        // Only persist current document if it has unsaved changes
        if (saveStatusRef.current === 'unsaved') {
          const currentDoc = JSON.parse(JSON.stringify(documentRef.current));
          workspaceService.saveCurrentDiagram(currentDoc, currentFilename, wsId);
          workspaceService.updateLocalDiagramCache(currentFilename, currentDoc, wsId);
          await workspaceService.saveCurrentDiagramToServer(currentDoc, currentFilename, wsId);
        }

        const targetDoc = await workspaceService.loadAndSetActiveDiagram(filename, wsId);
        const freshTargetDoc: DiagramDocument = JSON.parse(JSON.stringify(targetDoc));
        const resolvedFilename = workspaceService.getActiveWorkspace().activeDiagramFilename || filename;

        activeWorkspaceIdRef.current = wsId;
        activeDiagramFilenameRef.current = resolvedFilename;
        documentRef.current = freshTargetDoc;
        saveStatusRef.current = 'idle';
        setActiveWs({ ...workspaceService.getActiveWorkspace(), activeDiagramFilename: resolvedFilename });
        setDocument(freshTargetDoc);
        offlineSyncService.cacheDocument(freshTargetDoc);
        setSaveStatus('idle');
        if (freshTargetDoc.pages && freshTargetDoc.pages.length > 0) {
          setActivePageId(freshTargetDoc.activePageId || freshTargetDoc.pages[0].id);
        }
        if (freshTargetDoc.pages?.[0]?.diagramType) {
          setSelectedCategory(freshTargetDoc.pages[0].diagramType);
        }
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      } catch (err: any) {
        console.error('[App] Failed to switch diagram:', err);
        setImageNotice({
          type: 'error',
          message: err?.message || `Could not open diagram "${filename}".`,
        });
      } finally {
        isSwitchingDiagramRef.current = false;
      }
    },
    []
  );

  const handleLoadWorkspaceDiagram = useCallback(
    (doc: DiagramDocument, filename?: string, workspaceId?: string) => {
      // Flush any unsaved edits from the outgoing diagram to its own workspace/file BEFORE switching refs
      const outgoingWsId = activeWorkspaceIdRef.current;
      const outgoingFilename = activeDiagramFilenameRef.current;
      const targetWs = workspaceId
        ? workspaceService.setActiveWorkspace(workspaceId)
        : workspaceService.getActiveWorkspace();
      const targetFilename = filename || targetWs.activeDiagramFilename || 'root.json';

      if (
        saveStatusRef.current === 'unsaved' &&
        outgoingWsId &&
        outgoingFilename &&
        (outgoingWsId !== targetWs.id || outgoingFilename.toLowerCase() !== targetFilename.toLowerCase())
      ) {
        const outgoingDoc = JSON.parse(JSON.stringify(documentRef.current));
        workspaceService.saveCurrentDiagram(outgoingDoc, outgoingFilename, outgoingWsId);
        workspaceService.updateLocalDiagramCache(outgoingFilename, outgoingDoc, outgoingWsId);
        workspaceService.saveCurrentDiagramToServer(outgoingDoc, outgoingFilename, outgoingWsId).catch(() => {});
      }

      const freshDoc: DiagramDocument = JSON.parse(JSON.stringify(doc));
      workspaceService.updateLocalDiagramCache(targetFilename, freshDoc, targetWs.id);
      workspaceService.setActiveDiagram(targetFilename);

      activeWorkspaceIdRef.current = targetWs.id;
      activeDiagramFilenameRef.current = targetFilename;
      documentRef.current = freshDoc;
      saveStatusRef.current = 'idle';

      setActiveWs({ ...workspaceService.getActiveWorkspace(), activeDiagramFilename: targetFilename });
      setDocument(freshDoc);
      offlineSyncService.cacheDocument(freshDoc);
      setNavigationHistory([]);
      setSaveStatus('idle');
      if (freshDoc.pages && freshDoc.pages.length > 0) {
        setActivePageId(freshDoc.activePageId || freshDoc.pages[0].id);
        if (freshDoc.pages[0].diagramType) {
          setSelectedCategory(freshDoc.pages[0].diagramType);
        }
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
    // Also persist to server user profile (git-protected outside repository)
    workspaceService.savePersistentSettings({
      theme: newSettings.theme,
      gridStyle: newSettings.gridStyle,
      gridSize: newSettings.gridSize,
      snapToGrid: newSettings.snapToGrid,
      showHoverTooltips: newSettings.showHoverTooltips,
      showCollaborators: newSettings.showCollaborators,
      autoSaveInterval: newSettings.autoSaveInterval,
      defaultConnectorType: newSettings.defaultConnectorType,
      rootDir: newSettings.rootDir,
    }).catch(err => {
      console.warn('Could not persist settings to server:', err);
    });
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
        onManualSave={() => handleManualSave()}
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
        onOpenGenerateFlowchartModal={() => setIsGenerateFlowchartModalOpen(true)}
        onChangeRole={setUserRole}
        onToggleTheme={handleToggleTheme}
        onSwitchDiagram={handleSwitchDiagram}
        aggregationGroups={aggregationResult.groups}
        selectedAggregationField={selectedAggregationField}
        isAggregationsOpen={isAggregationsOpen}
        onToggleAggregations={() => setIsAggregationsOpen(prev => !prev)}
        onSelectAggregationField={name => {
          setSelectedAggregationField(name);
          setIsAggregationsOpen(true);
        }}
        showValuesOnCanvas={showAggregationBadges}
        onToggleShowValuesOnCanvas={() => setShowAggregationBadges(prev => !prev)}
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
          onAddImageFile={handleAddImageFile}
          onAddExistingImage={handleAddExistingImage}
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
          showAggregationBadges={showAggregationBadges}
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
          onOpenGenerateFlowchartModal={() => setIsGenerateFlowchartModalOpen(true)}
          onOpenImageLightbox={handleOpenImageLightbox}
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
            onOpenImageLightbox={handleOpenImageLightbox}
          />
        )}

        {/* Right Sidebar: Aggregations Breakdown & 3D Chart Down Right Side (Change 2) */}
        {isAggregationsOpen && (
          <ErrorBoundary fallbackTitle="Aggregations Panel Error">
            <AggregationsPanel
              isOpen={isAggregationsOpen}
              onClose={() => setIsAggregationsOpen(false)}
              groups={aggregationResult.groups}
              selectedFieldName={selectedAggregationField}
              onSelectFieldName={setSelectedAggregationField}
              totalSearchedPages={aggregationResult.totalSearchedPages}
              totalItemsFound={aggregationResult.totalItemsFound}
              theme={settings.theme}
              showValuesOnCanvas={showAggregationBadges}
              onToggleShowValuesOnCanvas={() => setShowAggregationBadges(prev => !prev)}
              onFocusNode={nodeId => {
                // Find if node exists on current page
                const existsOnCurrent = currentPage.nodes.some(n => n.id === nodeId);
                if (existsOnCurrent) {
                  setSelectedNodeIds([nodeId]);
                  setSelectedEdgeId(null);
                  setIsInspectorOpen(true);
                } else {
                  // Search document pages
                  const targetPage = document.pages.find(p => p.nodes.some(n => n.id === nodeId));
                  if (targetPage) {
                    setActivePageId(targetPage.id);
                    setSelectedNodeIds([nodeId]);
                    setSelectedEdgeId(null);
                    setIsInspectorOpen(true);
                  }
                }
              }}
            />
          </ErrorBoundary>
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
        onManualSave={() => handleManualSave()}
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
        existingNodes={currentPage.nodes}
        existingEdges={currentPage.edges}
        onMindmapGenerated={(title: string, description: string, genNodes: DiagramNode[], genEdges: DiagramEdge[], isExtended?: boolean, addedNodeIds?: string[]) => {
          const updatedPages = document.pages.map(page => {
            if (page.id !== activePageId) return page;
            return {
              ...page,
              title: (!isExtended && (page.title === 'Mind Map' || page.title.startsWith('Page ') || page.title === 'Untitled Diagram')) ? title : page.title,
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

          if (isExtended && addedNodeIds && addedNodeIds.length > 0) {
            setSelectedNodeIds(addedNodeIds);
            setImageNotice({
              type: 'success',
              message: `Added ${addedNodeIds.length} new node(s) connected to your mind map!`,
            });
          } else {
            setSelectedNodeIds(genNodes.map(n => n.id));
            setImageNotice({
              type: 'success',
              message: `Generated new mind map with ${genNodes.length} nodes!`,
            });
          }
        }}
      />

      <GenerateFlowchartModal
        isOpen={isGenerateFlowchartModalOpen}
        onClose={() => setIsGenerateFlowchartModalOpen(false)}
        currentPageName={currentPage.title}
        theme={settings.theme}
        existingNodes={currentPage.nodes}
        existingEdges={currentPage.edges}
        onFlowchartGenerated={(title: string, _description: string, genNodes: DiagramNode[], genEdges: DiagramEdge[], isExtended?: boolean, addedNodeIds?: string[]) => {
          const updatedPages = document.pages.map(page => {
            if (page.id !== activePageId) return page;
            const isDefaultTitle =
              page.title === 'Flowchart' ||
              page.title === 'Business Process Flowchart' ||
              page.title.startsWith('Page ') ||
              page.title === 'Untitled Diagram';
            return {
              ...page,
              title: !isExtended && isDefaultTitle ? title : page.title,
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

          if (isExtended && addedNodeIds && addedNodeIds.length > 0) {
            setSelectedNodeIds(addedNodeIds);
            setImageNotice({
              type: 'success',
              message: `Added ${addedNodeIds.length} new flowchart step(s) with Gemini AI!`,
            });
          } else {
            setSelectedNodeIds(genNodes.map(n => n.id));
            setImageNotice({
              type: 'success',
              message: `Generated flowchart with ${genNodes.length} symbol steps and ${genEdges.length} connectors!`,
            });
          }
        }}
      />

      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        targetDestinationName={pendingNavigation?.targetName}
        onSaveAndContinue={handleSaveAndContinue}
        onDiscardAndContinue={handleDiscardAndContinue}
        onCancel={handleCancelNavigation}
      />

      {/* Change 2: Image Lightbox Modal to expand attached images to full size */}
      <ImageLightboxModal
        isOpen={!!lightboxData}
        image={lightboxData?.image || null}
        allImages={lightboxData?.allImages}
        onClose={() => setLightboxData(null)}
        onSelectImage={img => setLightboxData(prev => prev ? { ...prev, image: img } : null)}
        theme={settings.theme}
      />

      {/* Toast Notice for Image Upload */}
      {imageNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-top-4 duration-150 backdrop-blur-md bg-slate-900/95 border-slate-700 text-slate-100">
          {imageNotice.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : imageNotice.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{imageNotice.message}</span>
          <button
            type="button"
            onClick={() => setImageNotice(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
