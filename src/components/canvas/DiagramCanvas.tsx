/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DiagramNode,
  DiagramEdge,
  Collaborator,
  UserRole,
  AppTheme,
  StudioSettings,
  DiagramType,
} from '../../types/diagram';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import {
  Trash2,
  Plus,
  Compass,
  CornerDownRight,
  Spline,
  Minus,
  RotateCcw,
  Database,
  Upload,
  Sparkles,
} from 'lucide-react';

import { ContextMenu, ContextMenuPosition } from './ContextMenu';
import { NodeContentEditModal } from '../modals/NodeContentEditModal';
import { THEMES } from '../../utils/themeConfig';
import { getDefaultConnectorStyleForDiagram } from '../../utils/diagramConnectorConfig';
import {
  NodeAnchor,
  getNodeAnchorCoords,
  getClosestAnchor,
  getAnchorLabel,
} from '../../utils/diagramAnchors';

interface DiagramCanvasProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  collaborators: Collaborator[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedEdgeId: string | null;
  userRole: UserRole;
  theme: AppTheme;
  diagramType?: DiagramType;
  settings: StudioSettings;
  pageId?: string;
  activeDiagramFilename?: string;
  onSelectNode: (nodeId: string | null, isMultiSelect?: boolean) => void;
  onSelectMultipleNodes?: (nodeIds: string[]) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onUpdateNodes: (nodes: DiagramNode[]) => void;
  onAddEdge: (edge: DiagramEdge) => void;
  onUpdateEdge?: (edge: DiagramEdge) => void;
  onDeleteSelected: () => void;
  onDrillDown: (pageId: string) => void;
  onOpenDoc: (node: DiagramNode) => void;
  onDropNewShape: (shapeTemplateId: string, canvasX: number, canvasY: number) => void;
  onUpdateNodeLabel?: (nodeId: string, label: string) => void;
  onOpenNewPageModal?: () => void;
  onDeleteEdge?: (edgeId: string) => void;
  onOpenSettingsModal?: () => void;
  onOpenChildDiagramModal?: (node: DiagramNode) => void;
  onNavigateChildDiagram?: (filename: string) => void;
  onOpenImportSqlModal?: () => void;
  onOpenGenerateMindmapModal?: () => void;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  nodes,
  edges,
  collaborators,
  selectedNodeId,
  selectedNodeIds = [],
  selectedEdgeId,
  userRole,
  theme,
  diagramType = 'generic',
  settings,
  pageId,
  activeDiagramFilename,
  onSelectNode,
  onSelectMultipleNodes,
  onSelectEdge,
  onUpdateNodes,
  onAddEdge,
  onUpdateEdge,
  onDeleteSelected,
  onDrillDown,
  onOpenDoc,
  onDropNewShape,
  onUpdateNodeLabel,
  onOpenNewPageModal,
  onDeleteEdge,
  onOpenSettingsModal,
  onOpenChildDiagramModal,
  onNavigateChildDiagram,
  onOpenImportSqlModal,
  onOpenGenerateMindmapModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeDef = THEMES[theme] || THEMES.dark;
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const defaultConnectorStyle = getDefaultConnectorStyleForDiagram(diagramType);

  // Multi-node selection consolidation
  const effectiveSelectedNodeIds = React.useMemo(() => {
    if (selectedNodeIds && selectedNodeIds.length > 0) return selectedNodeIds;
    if (selectedNodeId) return [selectedNodeId];
    return [];
  }, [selectedNodeIds, selectedNodeId]);

  // Viewport transformation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Grid & Snap options
  const [gridSnap, setGridSnap] = useState(settings?.snapToGrid ?? true);
  const [showGrid, setShowGrid] = useState(true);

  // Sync snap with settings
  useEffect(() => {
    if (settings) {
      setGridSnap(settings.snapToGrid);
    }
  }, [settings?.snapToGrid]);

  // Context Menu & Content Edit Modal state
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [editingNodeForModal, setEditingNodeForModal] = useState<DiagramNode | null>(null);

  // Marquee Selection Box State (for dragging a selection box across multiple nodes)
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isShift: boolean;
  } | null>(null);

  // Node Dragging state (supports dragging multiple selected nodes together)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialDragPositions, setInitialDragPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Node Resizing state (supports synchronized resizing of all selected nodes of the same type)
  const [resizing, setResizing] = useState<{
    nodeId: string;
    direction: 'se' | 'e' | 's' | 'sw' | 'ne' | 'nw' | 'n' | 'w';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    coSelectedNodes?: Array<{
      id: string;
      initialX: number;
      initialY: number;
      initialWidth: number;
      initialHeight: number;
    }>;
  } | null>(null);

  // New Edge drawing state
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    anchor: NodeAnchor;
  } | null>(null);

  // Reconnecting existing edge endpoint state (Change 1)
  // When an anchor has multiple connections, only this chosen edge's endpoint moves!
  const [reconnectingEdge, setReconnectingEdge] = useState<{
    edgeId: string;
    endpoint: 'source' | 'target';
  } | null>(null);

  // Movable orthogonal connector lines state (move cornered line segments)
  const [movingEdgeSegment, setMovingEdgeSegment] = useState<{
    edgeId: string;
    axis: 'x' | 'y';
    initialCoord: number;
  } | null>(null);
  const [tempSegmentOffset, setTempSegmentOffset] = useState<number | null>(null);

  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

  // Hover state for highlighting connected/linked nodes
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Clear hovered node when switching page or diagram file to ensure child diagram nodes are always enabled
  useEffect(() => {
    setHoveredNodeId(null);
  }, [pageId, activeDiagramFilename]);

  // If hovered node no longer exists in the current nodes list, reset immediately
  useEffect(() => {
    if (hoveredNodeId && !nodes.some(n => n.id === hoveredNodeId)) {
      setHoveredNodeId(null);
    }
  }, [nodes, hoveredNodeId]);

  // Active focus node for network connectivity highlight
  const activeFocusNodeId = React.useMemo(() => {
    if (hoveredNodeId && nodes.some(n => n.id === hoveredNodeId)) {
      return hoveredNodeId;
    }
    return null;
  }, [hoveredNodeId, nodes]);

  // Set of node IDs that are linked to the active focus node
  const linkedNodeIds = React.useMemo(() => {
    if (!activeFocusNodeId) return null;
    const focusNode = nodes.find(n => n.id === activeFocusNodeId);
    if (!focusNode) return null;

    const set = new Set<string>();
    set.add(activeFocusNodeId);
    for (const e of edges) {
      if (e.sourceNodeId === activeFocusNodeId) {
        set.add(e.targetNodeId);
      }
      if (e.targetNodeId === activeFocusNodeId) {
        set.add(e.sourceNodeId);
      }
    }
    return set;
  }, [activeFocusNodeId, edges, nodes]);

  const isReadOnly = userRole === 'viewer';

  // Context Menu Handlers
  const handleNodeContextMenu = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!effectiveSelectedNodeIds.includes(nodeId)) {
      onSelectNode(nodeId, false);
    }
    onSelectEdge(null);
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null });
  };

  const handleDeleteNode = (nodeId: string) => {
    onUpdateNodes(nodes.filter(n => n.id !== nodeId));
    if (effectiveSelectedNodeIds.includes(nodeId)) {
      onSelectMultipleNodes
        ? onSelectMultipleNodes(effectiveSelectedNodeIds.filter(id => id !== nodeId))
        : onSelectNode(null);
    }
  };

  const handleDuplicateNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const newNode: DiagramNode = {
      ...target,
      id: `node-${Date.now()}`,
      x: target.x + 30,
      y: target.y + 30,
      label: `${target.label} (Copy)`,
    };
    onUpdateNodes([...nodes, newNode]);
    onSelectNode(newNode.id);
  };

  const handleBringToFront = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const rest = nodes.filter(n => n.id !== nodeId);
    onUpdateNodes([...rest, target]);
  };

  const handleSendToBack = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;
    const rest = nodes.filter(n => n.id !== nodeId);
    onUpdateNodes([target, ...rest]);
  };

  const handleQuickAddColumn = (nodeId: string) => {
    const updated = nodes.map(n => {
      if (n.id !== nodeId) return n;
      const currentFields = n.data?.fields || [];
      const newField = {
        name: `column_${currentFields.length + 1}`,
        type: 'VARCHAR(255)',
        isPk: false,
        isFk: false,
      };
      return {
        ...n,
        data: {
          ...n.data,
          fields: [...currentFields, newField],
        },
      };
    });
    onUpdateNodes(updated);
  };

  const handleQuickAddMethod = (nodeId: string) => {
    const updated = nodes.map(n => {
      if (n.id !== nodeId) return n;
      const currentMethods = n.data?.methods || [];
      return {
        ...n,
        data: {
          ...n.data,
          methods: [...currentMethods, `+ method${currentMethods.length + 1}(): void`],
        },
      };
    });
    onUpdateNodes(updated);
  };

  const handleChangeColor = (nodeId: string, fill: string, stroke: string) => {
    const targets = effectiveSelectedNodeIds.includes(nodeId)
      ? effectiveSelectedNodeIds
      : [nodeId];

    const updated = nodes.map(n => {
      if (!targets.includes(n.id)) return n;
      return {
        ...n,
        style: {
          ...n.style,
          fill,
          stroke,
        },
      };
    });
    onUpdateNodes(updated);
  };

  // Direct edge connection helper
  const handleConnectDirect = (sourceNodeId: string, targetNodeId: string) => {
    if (sourceNodeId === targetNodeId) return;
    const defaultRouting = getDefaultConnectorStyleForDiagram(diagramType);
    const newEdge: DiagramEdge = {
      id: `edge-${Date.now()}`,
      sourceNodeId,
      targetNodeId,
      sourceAnchor: 'right',
      targetAnchor: 'left',
      type: defaultRouting,
      lineStyle: 'solid',
      markerStart: 'none',
      markerEnd: diagramType === 'mindmap' ? 'none' : 'arrow',
    };
    onAddEdge(newEdge);
  };

  const handleEdgeContextMenu = (edgeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectEdge(edgeId);
    onSelectNode(null);
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null, edgeId });
  };

  // Start Resizing a node from handles (Change 2: capture all selected nodes of matching node type)
  const handleStartResize = (
    nodeId: string,
    direction: 'se' | 'e' | 's' | 'sw' | 'ne' | 'nw' | 'n' | 'w',
    e: React.MouseEvent
  ) => {
    if (isReadOnly) return;
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);

    // If multiple nodes are selected, find all selected nodes that have the same shape/node type
    const isTargetSelected = effectiveSelectedNodeIds.includes(nodeId);
    const coSelected = isTargetSelected
      ? nodes
          .filter(n => effectiveSelectedNodeIds.includes(n.id) && n.type === targetNode.type)
          .map(n => ({
            id: n.id,
            initialX: n.x,
            initialY: n.y,
            initialWidth: n.width,
            initialHeight: n.height,
          }))
      : [
          {
            id: targetNode.id,
            initialX: targetNode.x,
            initialY: targetNode.y,
            initialWidth: targetNode.width,
            initialHeight: targetNode.height,
          },
        ];

    setResizing({
      nodeId,
      direction,
      startX: canvasCoords.x,
      startY: canvasCoords.y,
      initialX: targetNode.x,
      initialY: targetNode.y,
      initialWidth: targetNode.width,
      initialHeight: targetNode.height,
      coSelectedNodes: coSelected,
    });
  };

  // Handle Canvas Zooming via wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3.0);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / zoom),
      }));
    }
    setZoom(newZoom);
  };

  // Convert Screen pixel coordinates to Canvas coordinates
  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Handle Drag & Drop of new shapes onto Canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const shapeId = e.dataTransfer.getData('application/x-shape-template');
    if (shapeId) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY);
      const snappedX = gridSnap ? Math.round(coords.x / 20) * 20 : coords.x;
      const snappedY = gridSnap ? Math.round(coords.y / 20) * 20 : coords.y;
      onDropNewShape(shapeId, Math.max(20, snappedX), Math.max(20, snappedY));
    }
  };

  // Start reconnecting an existing edge endpoint (Change 1)
  const handleStartReconnectEdge = (
    edgeId: string,
    endpoint: 'source' | 'target',
    e: React.MouseEvent
  ) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onSelectEdge(edgeId);
    setReconnectingEdge({ edgeId, endpoint });
  };

  // Start moving an orthogonal connector line segment (orthogonal corner adjustment)
  const handleStartMoveSegment = (
    edgeId: string,
    axis: 'x' | 'y',
    initialCoord: number,
    e: React.MouseEvent
  ) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onSelectEdge(edgeId);
    setMovingEdgeSegment({ edgeId, axis, initialCoord });
    setTempSegmentOffset(initialCoord);
  };

  // Reset an orthogonal connector line segment offset to auto-centered default
  const handleResetSegmentOffset = (edgeId: string) => {
    if (isReadOnly || !onUpdateEdge) return;
    const targetEdge = edges.find(e => e.id === edgeId);
    if (targetEdge) {
      onUpdateEdge({ ...targetEdge, midOffset: undefined });
    }
    setTempSegmentOffset(null);
  };

  // Direct Node Mouse Down for selection and batch dragging (Change 3)
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // If currently in connecting mode, click target node completes wire
    if (connectingFrom && !isReadOnly) {
      if (connectingFrom.nodeId !== nodeId) {
        handleConnectDirect(connectingFrom.nodeId, nodeId);
      }
      setConnectingFrom(null);
      return;
    }

    // If currently reconnecting an edge endpoint, drop onto this node
    if (reconnectingEdge && !isReadOnly) {
      const targetNode = nodes.find(n => n.id === nodeId);
      if (targetNode) {
        const closestAnchor = getClosestAnchor(targetNode, currentMousePos.x, currentMousePos.y);
        handleCompleteConnection(nodeId, closestAnchor);
      }
      return;
    }

    const isMultiKey = e.shiftKey || e.metaKey || e.ctrlKey;

    if (isMultiKey) {
      onSelectNode(nodeId, true);
      onSelectEdge(null);
      return;
    }

    // Normal click: if node is not already selected, select it as sole node
    const isAlreadySelected = effectiveSelectedNodeIds.includes(nodeId);
    if (!isAlreadySelected) {
      onSelectNode(nodeId, false);
      onSelectEdge(null);
    }

    if (isReadOnly) return;

    // Setup multi-node dragging for all selected nodes
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
    const activeDragIds = isAlreadySelected ? effectiveSelectedNodeIds : [nodeId];

    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => {
      if (activeDragIds.includes(n.id)) {
        positions[n.id] = { x: n.x, y: n.y };
      }
      // If any of the dragged nodes is a group, capture its children too
      if (n.parentId && activeDragIds.includes(n.parentId)) {
        positions[n.id] = { x: n.x, y: n.y };
      }
    });

    setDraggingNodeId(nodeId);
    setDragStartPos(canvasCoords);
    setInitialDragPositions(positions);
  };

  // Mouse Down on Canvas (Pan or background click / Marquee box selection)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isBackground =
      target === containerRef.current ||
      target.id === 'canvas-background' ||
      target.id === 'canvas-background-rect' ||
      target.tagName === 'svg' ||
      target.tagName === 'rect';

    // Middle-click pans or Alt-click pans
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Left click on background:
    if (e.button === 0 && isBackground) {
      if (e.shiftKey) {
        // Shift+drag: start marquee box selection
        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        setMarqueeBox({
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
          isShift: true,
        });
        return;
      }

      // Regular Left Click on Background: Pan the whole diagram around (Change 1)
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
      onSelectEdge(null);
    }
  };

  // Window-level mouse move and mouse up listeners
  useEffect(() => {
    if (
      !isPanning &&
      !draggingNodeId &&
      !resizing &&
      !marqueeBox &&
      !reconnectingEdge &&
      !connectingFrom &&
      !movingEdgeSegment
    ) {
      return;
    }

    const onWindowMouseMove = (e: MouseEvent) => {
      const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
      setCurrentMousePos(canvasCoords);

      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      // Handle Movable Orthogonal Connector Line Segment Dragging
      if (movingEdgeSegment) {
        const coord = movingEdgeSegment.axis === 'x' ? canvasCoords.x : canvasCoords.y;
        const snappedCoord = gridSnap ? Math.round(coord / 20) * 20 : Math.round(coord);
        setTempSegmentOffset(snappedCoord);
        return;
      }

      // Handle Marquee Box Selection
      if (marqueeBox) {
        setMarqueeBox(prev => (prev ? { ...prev, currentX: canvasCoords.x, currentY: canvasCoords.y } : null));

        const minX = Math.min(marqueeBox.startX, canvasCoords.x);
        const maxX = Math.max(marqueeBox.startX, canvasCoords.x);
        const minY = Math.min(marqueeBox.startY, canvasCoords.y);
        const maxY = Math.max(marqueeBox.startY, canvasCoords.y);

        // Find intersecting nodes
        const intersectingIds = nodes
          .filter(n => {
            const nodeRight = n.x + n.width;
            const nodeBottom = n.y + n.height;
            return !(nodeRight < minX || n.x > maxX || nodeBottom < minY || n.y > maxY);
          })
          .map(n => n.id);

        if (onSelectMultipleNodes) {
          const finalIds = marqueeBox.isShift
            ? Array.from(new Set([...effectiveSelectedNodeIds, ...intersectingIds]))
            : intersectingIds;
          onSelectMultipleNodes(finalIds);
        }
        return;
      }

      // Handle Node Resizing (Change 2: applied to all selected items of matching node type)
      if (resizing && !isReadOnly) {
        const deltaX = canvasCoords.x - resizing.startX;
        const deltaY = canvasCoords.y - resizing.startY;
        let newX = resizing.initialX;
        let newY = resizing.initialY;
        let newWidth = resizing.initialWidth;
        let newHeight = resizing.initialHeight;

        const minWidth = 40;
        const minHeight = 35;

        switch (resizing.direction) {
          case 'se':
            newWidth = Math.max(minWidth, resizing.initialWidth + deltaX);
            newHeight = Math.max(minHeight, resizing.initialHeight + deltaY);
            break;
          case 'e':
            newWidth = Math.max(minWidth, resizing.initialWidth + deltaX);
            break;
          case 's':
            newHeight = Math.max(minHeight, resizing.initialHeight + deltaY);
            break;
          case 'sw':
            newWidth = Math.max(minWidth, resizing.initialWidth - deltaX);
            newX = resizing.initialX + (resizing.initialWidth - newWidth);
            newHeight = Math.max(minHeight, resizing.initialHeight + deltaY);
            break;
          case 'ne':
            newWidth = Math.max(minWidth, resizing.initialWidth + deltaX);
            newHeight = Math.max(minHeight, resizing.initialHeight - deltaY);
            newY = resizing.initialY + (resizing.initialHeight - newHeight);
            break;
          case 'nw':
            newWidth = Math.max(minWidth, resizing.initialWidth - deltaX);
            newX = resizing.initialX + (resizing.initialWidth - newWidth);
            newHeight = Math.max(minHeight, resizing.initialHeight - deltaY);
            newY = resizing.initialY + (resizing.initialHeight - newHeight);
            break;
          case 'n':
            newHeight = Math.max(minHeight, resizing.initialHeight - deltaY);
            newY = resizing.initialY + (resizing.initialHeight - newHeight);
            break;
          case 'w':
            newWidth = Math.max(minWidth, resizing.initialWidth - deltaX);
            newX = resizing.initialX + (resizing.initialWidth - newWidth);
            break;
        }

        if (gridSnap) {
          newWidth = Math.round(newWidth / 20) * 20;
          newHeight = Math.round(newHeight / 20) * 20;
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }

        // Apply resize to the dragged node AND all co-selected nodes of the same type
        const coSelectedList = resizing.coSelectedNodes && resizing.coSelectedNodes.length > 0
          ? resizing.coSelectedNodes
          : [{ id: resizing.nodeId, initialX: resizing.initialX, initialY: resizing.initialY, initialWidth: resizing.initialWidth, initialHeight: resizing.initialHeight }];

        const coMap = new Map(coSelectedList.map(c => [c.id, c]));

        const affectsWidth = ['se', 'e', 'sw', 'ne', 'nw', 'w'].includes(resizing.direction);
        const affectsHeight = ['se', 's', 'sw', 'ne', 'nw', 'n'].includes(resizing.direction);

        const updatedNodes = nodes.map(n => {
          const co = coMap.get(n.id);
          if (!co) return n;

          if (n.id === resizing.nodeId) {
            return {
              ...n,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            };
          }

          // For other selected nodes of the exact same type, apply the synchronized dimensions
          let coW = n.width;
          let coH = n.height;
          let coX = co.initialX;
          let coY = co.initialY;

          if (affectsWidth) {
            coW = newWidth;
            if (resizing.direction.includes('w')) {
              coX = co.initialX + (co.initialWidth - newWidth);
              if (gridSnap) coX = Math.round(coX / 20) * 20;
            }
          }

          if (affectsHeight) {
            coH = newHeight;
            if (resizing.direction.includes('n')) {
              coY = co.initialY + (co.initialHeight - newHeight);
              if (gridSnap) coY = Math.round(coY / 20) * 20;
            }
          }

          return {
            ...n,
            x: coX,
            y: coY,
            width: coW,
            height: coH,
          };
        });

        onUpdateNodes(updatedNodes);
        return;
      }

      // Handle Node Dragging (Batch multi-node movement)
      if (draggingNodeId && !isReadOnly) {
        let deltaX = canvasCoords.x - dragStartPos.x;
        let deltaY = canvasCoords.y - dragStartPos.y;

        if (gridSnap) {
          deltaX = Math.round(deltaX / 20) * 20;
          deltaY = Math.round(deltaY / 20) * 20;
        }

        const updatedNodes = nodes.map(n => {
          if (initialDragPositions[n.id]) {
            return {
              ...n,
              x: initialDragPositions[n.id].x + deltaX,
              y: initialDragPositions[n.id].y + deltaY,
            };
          }
          return n;
        });

        onUpdateNodes(updatedNodes);
      }
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
      }

      if (marqueeBox) {
        const dragDist = Math.hypot(
          marqueeBox.currentX - marqueeBox.startX,
          marqueeBox.currentY - marqueeBox.startY
        );
        if (dragDist < 5 && !marqueeBox.isShift) {
          onSelectNode(null);
          onSelectEdge(null);
        }
        setMarqueeBox(null);
      }

      if (resizing) {
        setResizing(null);
      }

      if (draggingNodeId && !isReadOnly) {
        setDraggingNodeId(null);
        setInitialDragPositions({});
      }

      // Handle releasing a reconnecting edge endpoint anywhere on window
      if (reconnectingEdge && !isReadOnly && onUpdateEdge) {
        const anchorElement = (e.target as HTMLElement).closest('[data-anchor-id]');
        if (anchorElement) {
          const targetAnchor = anchorElement.getAttribute('data-anchor-id') as NodeAnchor;
          const targetNodeId = anchorElement.getAttribute('data-node-id');
          if (targetNodeId && targetAnchor) {
            handleCompleteConnection(targetNodeId, targetAnchor);
            return;
          }
        }

        const nodeElement = (e.target as HTMLElement).closest('[id^="node-"]');
        if (nodeElement) {
          const targetNodeId = nodeElement.id.replace('node-', '');
          const targetNode = nodes.find(n => n.id === targetNodeId);
          if (targetNode) {
            const closestAnchor = getClosestAnchor(targetNode, currentMousePos.x, currentMousePos.y);
            handleCompleteConnection(targetNodeId, closestAnchor);
            return;
          }
        }

        setReconnectingEdge(null);
      }

      // Handle releasing a moved orthogonal connector line segment
      if (movingEdgeSegment && !isReadOnly && onUpdateEdge) {
        if (tempSegmentOffset !== null) {
          const targetEdge = edges.find(ed => ed.id === movingEdgeSegment.edgeId);
          if (targetEdge) {
            onUpdateEdge({
              ...targetEdge,
              midOffset: tempSegmentOffset,
            });
          }
        }
        setMovingEdgeSegment(null);
        setTempSegmentOffset(null);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [
    isPanning,
    panStart,
    draggingNodeId,
    dragStartPos,
    initialDragPositions,
    resizing,
    marqueeBox,
    reconnectingEdge,
    connectingFrom,
    movingEdgeSegment,
    tempSegmentOffset,
    edges,
    gridSnap,
    isReadOnly,
    nodes,
    effectiveSelectedNodeIds,
    currentMousePos,
    onUpdateNodes,
    onSelectMultipleNodes,
    onSelectNode,
    onSelectEdge,
    onUpdateEdge,
    screenToCanvasCoords,
  ]);

  // Local canvas mouse move for cursor position
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
    setCurrentMousePos(canvasCoords);
  };

  // Helper to construct a new edge with the chosen source and target anchors
  const createEdge = useCallback(
    (
      sourceNodeId: string,
      sourceAnchor: NodeAnchor,
      targetNodeId: string,
      targetAnchor: NodeAnchor
    ) => {
      const defaultRouting = getDefaultConnectorStyleForDiagram(diagramType);
      const newEdge: DiagramEdge = {
        id: `edge-${Date.now()}`,
        sourceNodeId,
        targetNodeId,
        sourceAnchor,
        targetAnchor,
        type: defaultRouting,
        lineStyle: 'solid',
        markerStart: 'none',
        markerEnd: diagramType === 'mindmap' ? 'none' : 'arrow',
      };
      onAddEdge(newEdge);
    },
    [diagramType, onAddEdge]
  );

  // Directly complete connection or endpoint reconnection to a specific anchor on target node (Change 1)
  const handleCompleteConnection = useCallback(
    (targetNodeId: string, targetAnchor: NodeAnchor) => {
      // 1. Completing endpoint reconnection of an existing edge
      if (reconnectingEdge && onUpdateEdge) {
        const edgeToUpdate = edges.find(e => e.id === reconnectingEdge.edgeId);
        if (edgeToUpdate) {
          if (reconnectingEdge.endpoint === 'source') {
            onUpdateEdge({
              ...edgeToUpdate,
              sourceNodeId: targetNodeId,
              sourceAnchor: targetAnchor,
            });
          } else {
            onUpdateEdge({
              ...edgeToUpdate,
              targetNodeId: targetNodeId,
              targetAnchor: targetAnchor,
            });
          }
        }
        setReconnectingEdge(null);
        return;
      }

      // 2. Completing brand new connection
      if (connectingFrom && targetNodeId !== connectingFrom.nodeId) {
        createEdge(connectingFrom.nodeId, connectingFrom.anchor, targetNodeId, targetAnchor);
        setConnectingFrom(null);
      }
    },
    [reconnectingEdge, connectingFrom, edges, onUpdateEdge, createEdge]
  );

  // Local mouse up on canvas
  const handleMouseUp = (e: React.MouseEvent) => {
    if (connectingFrom && !isReadOnly) {
      const anchorElement = (e.target as HTMLElement).closest('[data-anchor-id]');
      if (anchorElement) {
        const targetAnchor = anchorElement.getAttribute('data-anchor-id') as NodeAnchor;
        const targetNodeId = anchorElement.getAttribute('data-node-id');
        if (targetNodeId && targetNodeId !== connectingFrom.nodeId) {
          createEdge(connectingFrom.nodeId, connectingFrom.anchor, targetNodeId, targetAnchor);
          setConnectingFrom(null);
          return;
        }
      }

      const targetElement = (e.target as HTMLElement).closest('[id^="node-"]');
      if (targetElement) {
        const targetNodeId = targetElement.id.replace('node-', '');
        if (targetNodeId !== connectingFrom.nodeId) {
          const targetNode = nodes.find(n => n.id === targetNodeId);
          if (targetNode) {
            const closestAnchor = getClosestAnchor(targetNode, currentMousePos.x, currentMousePos.y);
            createEdge(connectingFrom.nodeId, connectingFrom.anchor, targetNodeId, closestAnchor);
          }
        }
      }
      setConnectingFrom(null);
    }
  };

  // Keyboard shortcut listener (Delete selected nodes, cancel connecting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectingFrom) setConnectingFrom(null);
        if (reconnectingEdge) setReconnectingEdge(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isReadOnly) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          if (effectiveSelectedNodeIds.length > 0 || selectedEdgeId) {
            e.preventDefault();
            onDeleteSelected();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveSelectedNodeIds, selectedEdgeId, isReadOnly, onDeleteSelected, connectingFrom, reconnectingEdge]);

  // Determine active edge being reconnected for helper banners
  const reconnectingEdgeObj = reconnectingEdge
    ? edges.find(e => e.id === reconnectingEdge.edgeId)
    : null;

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className={`relative flex-1 w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ backgroundColor: themeDef.canvasBg }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* Empty ERD Canvas State with Instant SQL Import CTA */}
      {nodes.length === 0 && diagramType === 'erd' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-6">
          <div
            className={`max-w-md w-full p-6 rounded-2xl border text-center shadow-2xl pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 ${
              themeDef.isDark
                ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-sky-950/30'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200'
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-3">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold tracking-tight mb-1">Entity Relationship Diagram (ERD)</h3>
            <p className={`text-xs mb-4 leading-relaxed ${themeDef.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Populate this ERD with entity tables, primary keys, and foreign key relationships directly from an ERwin PostgreSQL SQL export, or drag shapes from the left palette.
            </p>
            {onOpenImportSqlModal && (
              <button
                type="button"
                onClick={onOpenImportSqlModal}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md shadow-sky-600/30 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload ERwin PostgreSQL SQL (.sql)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Connecting Instructions Banner */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-3">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
          <span>
            Connecting from{' '}
            <strong>{nodes.find(n => n.id === connectingFrom.nodeId)?.label || 'Selected Node'}</strong>
            {' '}({getAnchorLabel(connectingFrom.anchor)}): Click any anchor or target node to connect
          </span>
          <button
            onClick={() => setConnectingFrom(null)}
            className="ml-2 px-2.5 py-0.5 bg-blue-800 hover:bg-blue-900 text-white rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Floating Reconnection Instructions Banner (Change 1) */}
      {reconnectingEdge && reconnectingEdgeObj && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-3">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
          <span>
            Moving connector {reconnectingEdge.endpoint === 'source' ? 'Start' : 'End'} point: Drag and drop onto any anchor point on a node
          </span>
          <button
            onClick={() => setReconnectingEdge(null)}
            className="ml-2 px-2.5 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Floating Multi-Node Selection Banner (Change 3) */}
      {effectiveSelectedNodeIds.length > 1 && !connectingFrom && !reconnectingEdge && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-indigo-500/40 text-indigo-200 px-4 py-1.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          <span>
            <strong>{effectiveSelectedNodeIds.length}</strong> nodes selected — use Inspector to batch edit color & style
          </span>
          <button
            onClick={() => onSelectNode(null)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Floating Connector Style Switcher Quick Toolbar */}
      {selectedEdge && !isReadOnly && !reconnectingEdge && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-2 ${themeDef.panelClass}`}>
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/50">
            <span className={`text-[10px] font-mono font-semibold uppercase ${themeDef.textMutedClass}`}>
              Style:
            </span>
            <span className="text-xs font-bold text-sky-400 capitalize">
              {selectedEdge.type || 'orthogonal'}
            </span>
          </div>

          {/* Quick Style Toggles: Corners, Curves, Straight */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'orthogonal' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                (selectedEdge.type || 'orthogonal') === 'orthogonal'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : themeDef.isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Corners (Orthogonal 90° step) - Default for ERD & BPMN"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Corners</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'curved' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedEdge.type === 'curved'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : themeDef.isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Curved (Bezier smooth curve) - Default for Mind Maps & Fishbone"
            >
              <Spline className="w-3.5 h-3.5" />
              <span>Curves</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateEdge?.({ ...selectedEdge, type: 'straight' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedEdge.type === 'straight'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : themeDef.isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Straight (Direct line) - Default for PERT & UML Sequence"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Straight</span>
            </button>
          </div>

          {/* Reset to Diagram Default if modified */}
          {selectedEdge.type !== defaultConnectorStyle && (
            <button
              type="button"
              onClick={() => onUpdateEdge?.({ ...selectedEdge, type: defaultConnectorStyle })}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title={`Reset to standard default for ${diagramType.toUpperCase()} (${defaultConnectorStyle})`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Default ({defaultConnectorStyle})</span>
            </button>
          )}

          {/* Quick ERD Relationship Presets (Change 2) */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-700/50">
            <span className={`text-[10px] font-mono font-semibold uppercase ${themeDef.textMutedClass}`}>
              ERD:
            </span>
            <button
              type="button"
              onClick={() => onUpdateEdge?.({
                ...selectedEdge,
                markerStart: 'crow-one-only',
                markerEnd: 'crow-zero-many',
                label: '1:0..*',
              })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-zero-many'
                  ? 'bg-sky-600 text-white font-bold'
                  : themeDef.isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="1..1 to 0..* (One and only one ➔ Zero through many)"
            >
              1:0..*
            </button>
            <button
              type="button"
              onClick={() => onUpdateEdge?.({
                ...selectedEdge,
                markerStart: 'crow-one-only',
                markerEnd: 'crow-one-many',
                label: '1:1..*',
              })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-one-many'
                  ? 'bg-sky-600 text-white font-bold'
                  : themeDef.isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="1..1 to 1..* (One and only one ➔ One through many)"
            >
              1:1..*
            </button>
            <button
              type="button"
              onClick={() => onUpdateEdge?.({
                ...selectedEdge,
                markerStart: 'crow-one-only',
                markerEnd: 'crow-one-only',
                label: '1:1',
              })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-one-only'
                  ? 'bg-sky-600 text-white font-bold'
                  : themeDef.isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="1..1 to 1..1 (One and only one ➔ One and only one)"
            >
              1:1
            </button>
            <button
              type="button"
              onClick={() => onUpdateEdge?.({
                ...selectedEdge,
                markerStart: 'crow-one-only',
                markerEnd: 'crow-zero-one',
                label: '1:0..1',
              })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                selectedEdge.markerStart === 'crow-one-only' && selectedEdge.markerEnd === 'crow-zero-one'
                  ? 'bg-sky-600 text-white font-bold'
                  : themeDef.isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="1..1 to 0..1 (One and only one ➔ Zero or one)"
            >
              1:0..1
            </button>
          </div>

          <div className={`w-[1px] h-4 mx-0.5 ${themeDef.isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

          {/* Delete connector */}
          <button
            type="button"
            onClick={() => onDeleteEdge?.(selectedEdge.id)}
            className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer transition-colors"
            title="Delete Connector (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SVG Canvas Root with overflow-visible so connections and dots are never clipped (Change 1) */}
      <svg
        id="canvas-background"
        className="absolute inset-0 w-full h-full pointer-events-auto overflow-visible"
        style={{
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Dynamic Grid Pattern (Doubled width and height to 48px) */}
          <pattern
            id="canvas-dot-grid"
            width={settings?.gridSize || 48}
            height={settings?.gridSize || 48}
            patternUnits="userSpaceOnUse"
          >
            {showGrid && (settings?.gridStyle || 'dots') === 'dots' && (
              <circle cx="2" cy="2" r="1.3" fill={themeDef.canvasDotColor} />
            )}
            {showGrid && settings?.gridStyle === 'lines' && (
              <path
                d={`M ${settings?.gridSize || 48} 0 L 0 0 0 ${settings?.gridSize || 48}`}
                fill="none"
                stroke={themeDef.canvasLineColor}
                strokeWidth="1"
              />
            )}
            {showGrid && settings?.gridStyle === 'crosshairs' && (
              <path
                d={`M 0 4 L 0 -4 M -4 0 L 4 0`}
                fill="none"
                stroke={themeDef.canvasDotColor}
                strokeWidth="1"
              />
            )}
          </pattern>

          {/* Standard Arrow Marker */}
          <marker
            id="marker-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
          </marker>

          {/* Crow's Foot: Zero through Many (0..*) - Circle + Crow's Foot (Change 2) */}
          <marker
            id="marker-crow-zero-many"
            viewBox="0 0 24 16"
            refX="22"
            refY="8"
            markerWidth="13"
            markerHeight="13"
            orient="auto-start-reverse"
          >
            <line x1="0" y1="8" x2="9" y2="8" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="5" cy="8" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <path d="M 9 8 L 22 2 M 9 8 L 22 8 M 9 8 L 22 14" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
          </marker>

          {/* Crow's Foot: One through Many (1..*) - Perpendicular Bar + Crow's Foot (Change 2) */}
          <marker
            id="marker-crow-one-many"
            viewBox="0 0 24 16"
            refX="22"
            refY="8"
            markerWidth="13"
            markerHeight="13"
            orient="auto-start-reverse"
          >
            <line x1="0" y1="8" x2="9" y2="8" stroke="#38bdf8" strokeWidth="2" />
            <line x1="5" y1="2" x2="5" y2="14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 9 8 L 22 2 M 9 8 L 22 8 M 9 8 L 22 14" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
          </marker>

          {/* Crow's Foot: One and Only One (1..1) - Double Perpendicular Bars (Change 2) */}
          <marker
            id="marker-crow-one-only"
            viewBox="0 0 20 16"
            refX="18"
            refY="8"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <line x1="0" y1="8" x2="16" y2="8" stroke="#34d399" strokeWidth="2" />
            <line x1="9" y1="2" x2="9" y2="14" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="16" y1="2" x2="16" y2="14" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          </marker>

          {/* Crow's Foot: Zero or One (0..1) - Circle + Perpendicular Bar (Change 2) */}
          <marker
            id="marker-crow-zero-one"
            viewBox="0 0 22 16"
            refX="19"
            refY="8"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <line x1="0" y1="8" x2="16" y2="8" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="6" cy="8" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          </marker>

          {/* Crow's Foot: Many (*) - Classic Three-Pronged Foot */}
          <marker
            id="marker-crow-many"
            viewBox="0 0 18 16"
            refX="16"
            refY="8"
            markerWidth="11"
            markerHeight="11"
            orient="auto-start-reverse"
          >
            <path d="M 2 8 L 16 2 M 2 8 L 16 8 M 2 8 L 16 14" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
          </marker>

          {/* Crow's Foot: Exactly One (1) - Single Perpendicular Line */}
          <marker
            id="marker-crow-one"
            viewBox="0 0 18 16"
            refX="16"
            refY="8"
            markerWidth="11"
            markerHeight="11"
            orient="auto-start-reverse"
          >
            <line x1="2" y1="8" x2="14" y2="8" stroke="#34d399" strokeWidth="2" />
            <line x1="14" y1="2" x2="14" y2="14" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          </marker>

          {/* Diamond Marker (UML Composition) */}
          <marker
            id="marker-diamond"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <polygon points="1,8 8,2 15,8 8,14" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
          </marker>

          {/* Diamond Filled Marker */}
          <marker
            id="marker-diamond-filled"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <polygon points="1,8 8,2 15,8 8,14" fill="#06b6d4" stroke="#06b6d4" strokeWidth="1" />
          </marker>

          {/* Circle Marker */}
          <marker
            id="marker-circle"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <circle cx="6" cy="6" r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
          </marker>
        </defs>

        {/* Transformed Canvas Plane Group (Change 1: Ensures connections & dots never clip) */}
        <g
          id="canvas-transformed-plane"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Infinite Grid Background Rectangle (Expanded to 1,000,000 x 1,000,000 px - Change 1) */}
          <rect
            id="canvas-background-rect"
            x="-500000"
            y="-500000"
            width="1000000"
            height="1000000"
            fill="url(#canvas-dot-grid)"
          />

          {/* Render Edges */}
          {edges.map(edge => {
            const source = nodes.find(n => n.id === edge.sourceNodeId);
            const target = nodes.find(n => n.id === edge.targetNodeId);
            const isEdgeConnected = activeFocusNodeId
              ? (edge.sourceNodeId === activeFocusNodeId || edge.targetNodeId === activeFocusNodeId)
              : true;

            const isReconnectingThis = reconnectingEdge?.edgeId === edge.id;
            const tempStart = isReconnectingThis && reconnectingEdge.endpoint === 'source' ? currentMousePos : null;
            const tempEnd = isReconnectingThis && reconnectingEdge.endpoint === 'target' ? currentMousePos : null;

            return (
              <EdgeRenderer
                key={edge.id}
                edge={edge}
                sourceNode={source}
                targetNode={target}
                isSelected={selectedEdgeId === edge.id}
                isDeemphasized={activeFocusNodeId ? !isEdgeConnected : false}
                onSelect={onSelectEdge}
                onContextMenu={handleEdgeContextMenu}
                onStartReconnectEdge={handleStartReconnectEdge}
                onStartMoveSegment={handleStartMoveSegment}
                onResetSegmentOffset={handleResetSegmentOffset}
                temporaryStart={tempStart}
                temporaryEnd={tempEnd}
                temporaryMidOffset={movingEdgeSegment?.edgeId === edge.id ? tempSegmentOffset : undefined}
              />
            );
          })}

          {/* Temporary Drawing Line while creating a new connection */}
          {connectingFrom && (
            <line
              x1={(() => {
                const src = nodes.find(n => n.id === connectingFrom.nodeId);
                return src ? getNodeAnchorCoords(src, connectingFrom.anchor).x : currentMousePos.x;
              })()}
              y1={(() => {
                const src = nodes.find(n => n.id === connectingFrom.nodeId);
                return src ? getNodeAnchorCoords(src, connectingFrom.anchor).y : currentMousePos.y;
              })()}
              x2={currentMousePos.x}
              y2={currentMousePos.y}
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              markerEnd="url(#marker-arrow)"
            />
          )}

          {/* Marquee Selection Rectangle (Change 3) */}
          {marqueeBox && (
            <rect
              x={Math.min(marqueeBox.startX, marqueeBox.currentX)}
              y={Math.min(marqueeBox.startY, marqueeBox.currentY)}
              width={Math.abs(marqueeBox.currentX - marqueeBox.startX)}
              height={Math.abs(marqueeBox.currentY - marqueeBox.startY)}
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              rx={2}
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {/* HTML Layer for High-Fidelity Nodes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
          const isNodeLinked = linkedNodeIds ? linkedNodeIds.has(node.id) : true;
          const isNodeSelected = effectiveSelectedNodeIds.includes(node.id);

          // For anchor candidate highlighting: active when creating new connection OR reconnecting existing edge
          const isReconnectingThisEdge = reconnectingEdge !== null;
          const reconnectingPinnedNodeId = reconnectingEdge
            ? (reconnectingEdge.endpoint === 'source' ? reconnectingEdgeObj?.targetNodeId : reconnectingEdgeObj?.sourceNodeId)
            : null;

          return (
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={isNodeSelected}
              isDragging={draggingNodeId === node.id}
              collaborators={collaborators}
              isDeemphasized={linkedNodeIds ? !isNodeLinked : false}
              onMouseEnterNode={setHoveredNodeId}
              onMouseLeaveNode={() => setHoveredNodeId(null)}
              onNodeMouseDown={handleNodeMouseDown}
              onStartResize={handleStartResize}
              onDrillDown={onDrillDown}
              onStartConnection={(nodeId, anchor) => {
                setConnectingFrom({ nodeId, anchor });
              }}
              isConnectingActive={!!connectingFrom || isReconnectingThisEdge}
              connectingSourceNodeId={connectingFrom?.nodeId || reconnectingPinnedNodeId || null}
              onCompleteConnection={handleCompleteConnection}
              onOpenDoc={onOpenDoc}
              onUpdateLabel={onUpdateNodeLabel}
              onNodeContextMenu={handleNodeContextMenu}
              onOpenChildDiagramModal={onOpenChildDiagramModal}
              onNavigateChildDiagram={onNavigateChildDiagram}
              isReadOnly={isReadOnly}
            />
          );
        })}

        {/* Real-Time Live Collaborator Cursors */}
        {settings?.showCollaborators &&
          collaborators.map(c => {
            if (!c.cursorPosition) return null;
            return (
              <div
                key={c.id}
                className="absolute pointer-events-none transition-all duration-300 ease-out z-40"
                style={{
                  left: `${c.cursorPosition.x}px`,
                  top: `${c.cursorPosition.y}px`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={c.color}>
                  <path d="M5.5 3.2L18.4 12.8L12.2 14.1L8.8 20.8L5.5 3.2Z" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
                <div
                  className="mt-1 px-2 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: c.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>{c.name}</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Empty State Overlay for Mind Map & Other Diagrams */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 z-20">
          <div
            className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl backdrop-blur-md pointer-events-auto text-center animate-in fade-in zoom-in-95 duration-200 ${
              themeDef.isDark
                ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            {diagramType === 'mindmap' ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-7 h-7 text-white animate-pulse" />
                </div>
                <h3 className="text-lg font-bold mb-1.5">
                  Empty Mind Map
                </h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Generate a complete mind map with central topic, labeled branch nodes, descriptions, and curved connector lines using Gemini AI.
                </p>
                {onOpenGenerateMindmapModal && (
                  <button
                    type="button"
                    onClick={onOpenGenerateMindmapModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md shadow-purple-600/30 hover:shadow-lg active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>Generate Mind Map with Gemini AI</span>
                  </button>
                )}
                <div className="mt-3 text-[11px] text-slate-500">
                  Or drag a shape from the left toolbox to build manually
                </div>
              </>
            ) : diagramType === 'erd' && onOpenImportSqlModal ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-1.5">
                  Empty ERD Diagram
                </h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Upload an ERwin PostgreSQL SQL file (.sql) to automatically populate entity tables, primary/foreign keys, and crow's foot relationships.
                </p>
                <button
                  type="button"
                  onClick={onOpenImportSqlModal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md shadow-sky-600/30 hover:shadow-lg active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload ERwin / Postgres SQL</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Canvas is Empty</h3>
                <p className="text-xs text-slate-400">
                  Drag and drop shapes from the left palette to start diagramming.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Context Menu for right click */}
      <ContextMenu
        position={contextMenu}
        selectedNode={contextMenu?.nodeId ? (nodes.find(n => n.id === contextMenu.nodeId) || null) : null}
        selectedEdge={contextMenu?.edgeId ? (edges.find(e => e.id === contextMenu.edgeId) || null) : null}
        diagramType={diagramType}
        otherNodes={nodes.filter(n => n.id !== contextMenu?.nodeId)}
        theme={theme}
        onClose={() => setContextMenu(null)}
        onDeleteNode={handleDeleteNode}
        onDuplicateNode={handleDuplicateNode}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onOpenEditModal={node => setEditingNodeForModal(node)}
        onQuickAddColumn={handleQuickAddColumn}
        onQuickAddMethod={handleQuickAddMethod}
        onChangeColor={handleChangeColor}
        onOpenDoc={onOpenDoc}
        onDeleteEdge={edgeId => onDeleteEdge?.(edgeId)}
        onUpdateEdge={edge => onUpdateEdge?.(edge)}
        onResetZoom={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
        onToggleGridSnap={() => setGridSnap(s => !s)}
        onToggleGrid={() => setShowGrid(g => !g)}
        onOpenNewPageModal={() => onOpenNewPageModal?.()}
        onStartConnectFromNode={nodeId => {
          setConnectingFrom({ nodeId, anchor: 'right' });
        }}
        onConnectNodes={handleConnectDirect}
        onNavigateChildDiagram={onNavigateChildDiagram}
        onOpenChildDiagramModal={onOpenChildDiagramModal}
        onOpenImportSqlModal={onOpenImportSqlModal}
        onOpenGenerateMindmapModal={onOpenGenerateMindmapModal}
        isReadOnly={isReadOnly}
      />

      {/* Direct Node Schema & Content Edit Modal */}
      <NodeContentEditModal
        node={editingNodeForModal}
        isOpen={!!editingNodeForModal}
        onClose={() => setEditingNodeForModal(null)}
        onSaveNode={updated => {
          onUpdateNodes(nodes.map(n => (n.id === updated.id ? updated : n)));
        }}
      />
    </div>
  );
};
