/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { BarChart3, PieChart as PieChartIcon, RotateCw, ZoomIn, ZoomOut, Play, Pause, Sparkles, Box } from 'lucide-react';

export interface ChartDatum {
  id: string;
  label: string;
  value: number;
  nodeId?: string;
  pageTitle?: string;
  color?: string;
}

interface ThreeDChartProps {
  data: ChartDatum[];
  chartType: 'bar' | 'pie';
  onChangeChartType?: (type: 'bar' | 'pie') => void;
  isDark?: boolean;
  totalSum?: number;
  fieldName?: string;
  backgroundColor?: string;
}

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#e11d48', // rose
];

/**
 * Robust 2D SVG Chart Fallback
 * Renders an interactive, crisp Bar or Pie chart directly in vector SVG.
 * Ensures the chart ALWAYS renders without relying on WebGL capabilities.
 */
const SvgFallbackChart: React.FC<{
  data: ChartDatum[];
  chartType: 'bar' | 'pie';
  isDark: boolean;
  effectiveBgColor: string;
  totalSum: number;
  hoveredItem: { label: string; value: number; percent: number; color: string } | null;
  onHoverItem: (item: { label: string; value: number; percent: number; color: string } | null) => void;
}> = ({ data, chartType, isDark, effectiveBgColor, totalSum, hoveredItem, onHoverItem }) => {
  const validData = useMemo(() => data.filter(d => Number.isFinite(d.value) && d.value > 0), [data]);
  const effectiveTotal = totalSum > 0 ? totalSum : validData.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const maxValue = Math.max(...validData.map(d => d.value), 1);

  if (validData.length === 0) {
    return (
      <div className="w-full h-56 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
        <p className="font-semibold">No positive values to chart</p>
        <p className="text-[10px] text-slate-500 mt-1">Select at least one ticked value above</p>
      </div>
    );
  }

  if (chartType === 'bar') {
    const width = 360;
    const height = 210;
    const padX = 24;
    const padTop = 20;
    const padBottom = 30;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const count = validData.length;
    const barWidth = Math.min(38, Math.max(12, (chartW / count) * 0.65));
    const step = chartW / count;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 select-none"
        style={{ backgroundColor: effectiveBgColor }}
      >
        {/* Baseline ground */}
        <line
          x1={padX}
          y1={height - padBottom}
          x2={width - padX}
          y2={height - padBottom}
          stroke={isDark ? '#334155' : '#cbd5e1'}
          strokeWidth="2"
        />

        {validData.map((item, idx) => {
          const color = item.color || PALETTE[idx % PALETTE.length];
          const barHeight = Math.max(4, (item.value / maxValue) * (chartH - 20));
          const x = padX + idx * step + (step - barWidth) / 2;
          const y = height - padBottom - barHeight;
          const percent = Math.round((item.value / effectiveTotal) * 100);
          const isHovered = hoveredItem?.label === item.label;

          return (
            <g
              key={item.id || idx}
              className="cursor-pointer transition-transform"
              onMouseEnter={() =>
                onHoverItem({
                  label: item.label,
                  value: item.value,
                  percent,
                  color,
                })
              }
              onMouseLeave={() => onHoverItem(null)}
            >
              {/* Bar column */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={color}
                opacity={hoveredItem ? (isHovered ? 1 : 0.45) : 0.9}
                className="transition-all duration-150"
              />
              {/* Highlight cap */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height="3"
                rx="1.5"
                fill="#ffffff"
                opacity={isHovered ? 0.9 : 0.5}
              />
              {/* Value label */}
              {count <= 8 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill={isDark ? '#e2e8f0' : '#1e293b'}
                >
                  {item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                </text>
              )}
              {/* Bar Bottom Label */}
              <text
                x={x + barWidth / 2}
                y={height - padBottom + 14}
                textAnchor="middle"
                fontSize="8.5"
                fill={isDark ? '#94a3b8' : '#64748b'}
                className="truncate"
              >
                {item.label.length > 7 ? `${item.label.slice(0, 6)}…` : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // 2. Normal Circular Pie Chart SVG
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;

  let accAngle = 0;
  const slices = validData.map((item, idx) => {
    const fraction = item.value / effectiveTotal;
    const angle = fraction * Math.PI * 2;
    const startAngle = accAngle;
    const endAngle = accAngle + angle;
    accAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path =
      fraction >= 0.999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const color = item.color || PALETTE[idx % PALETTE.length];
    const percent = Math.round(fraction * 100);
    return { item, path, color, percent };
  });

  return (
    <div className="w-full h-56 flex items-center justify-center select-none" style={{ backgroundColor: effectiveBgColor }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 drop-shadow-md">
        {slices.map((slice, idx) => {
          const isHovered = hoveredItem?.label === slice.item.label;
          return (
            <path
              key={slice.item.id || idx}
              d={slice.path}
              fill={slice.color}
              stroke={effectiveBgColor}
              strokeWidth="1.5"
              opacity={hoveredItem ? (isHovered ? 1 : 0.5) : 0.95}
              className="cursor-pointer transition-all duration-150 hover:scale-102 origin-center"
              onMouseEnter={() =>
                onHoverItem({
                  label: slice.item.label,
                  value: slice.item.value,
                  percent: slice.percent,
                  color: slice.color,
                })
              }
              onMouseLeave={() => onHoverItem(null)}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const ThreeDChart: React.FC<ThreeDChartProps> = ({
  data,
  chartType,
  onChangeChartType,
  isDark = true,
  totalSum = 0,
  fieldName = 'Value',
  backgroundColor,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{ label: string; value: number; percent: number; color: string } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);

  // References for scene lifecycle
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const meshesRef = useRef<Array<{ mesh: THREE.Mesh; datum: ChartDatum; percent: number; initialPos: THREE.Vector3 }>>([]);
  const isPointerDownRef = useRef(false);
  const prevPointerPosRef = useRef({ x: 0, y: 0 });

  const effectiveBgColor = backgroundColor || (isDark ? '#020617' : '#f8fafc');

  // Test WebGL support safely on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebGlAvailable(false);
        setViewMode('2d');
      }
    } catch {
      setWebGlAvailable(false);
      setViewMode('2d');
    }
  }, []);

  // Initialize Three.js scene ONCE
  useEffect(() => {
    if (viewMode !== '3d' || !webGlAvailable) return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'default',
      });
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D SVG chart:', err);
      setWebGlAvailable(false);
      setViewMode('2d');
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 224;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bgThreeColor = new THREE.Color(effectiveBgColor);
    scene.background = bgThreeColor;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

    renderer.setSize(width, height);
    renderer.setClearColor(bgThreeColor, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.9 : 1.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.3 : 1.5);
    dirLight.position.set(4, 8, 6);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, isDark ? 0.6 : 0.4);
    fillLight.position.set(-5, -2, -4);
    scene.add(fillLight);

    const chartGroup = new THREE.Group();
    scene.add(chartGroup);
    groupRef.current = chartGroup;

    // Raycasting for interactive hover inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle user drag rotation
      if (isPointerDownRef.current && chartGroup) {
        const deltaX = e.clientX - prevPointerPosRef.current.x;
        const deltaY = e.clientY - prevPointerPosRef.current.y;
        chartGroup.rotation.y += deltaX * 0.01;
        if (chartType === 'pie') {
          chartGroup.rotation.x += deltaY * 0.01;
        }
        prevPointerPosRef.current = { x: e.clientX, y: e.clientY };
      }

      // Check hover hit
      raycaster.setFromCamera(mouse, camera);
      const hitList = raycaster.intersectObjects(meshesRef.current.map(m => m.mesh));

      if (hitList.length > 0) {
        const hitMesh = hitList[0].object as THREE.Mesh;
        const match = meshesRef.current.find(m => m.mesh === hitMesh);
        if (match) {
          const hex = `#${(match.mesh.material as THREE.MeshStandardMaterial).color.getHexString()}`;
          setHoveredItem({
            label: match.datum.label,
            value: match.datum.value,
            percent: match.percent,
            color: hex,
          });

          meshesRef.current.forEach(m => {
            m.mesh.scale.set(m.mesh === hitMesh ? 1.05 : 1, m.mesh === hitMesh ? 1.05 : 1, m.mesh === hitMesh ? 1.05 : 1);
          });
          return;
        }
      }

      meshesRef.current.forEach(m => m.mesh.scale.set(1, 1, 1));
      setHoveredItem(null);
    };

    const onPointerDown = (e: MouseEvent) => {
      isPointerDownRef.current = true;
      prevPointerPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isPointerDownRef.current = false;
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          camera.aspect = cr.width / cr.height;
          camera.updateProjectionMatrix();
          renderer.setSize(cr.width, cr.height);
        }
      }
    });
    resizeObserver.observe(container);

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (isRotating && !isPointerDownRef.current && chartGroup) {
        chartGroup.rotation.y += delta * 0.45;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);

      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, webGlAvailable]);

  // Update chart meshes when data, chartType, or background changes without re-creating WebGL renderer
  useEffect(() => {
    if (viewMode !== '3d' || !webGlAvailable || !sceneRef.current || !groupRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const chartGroup = groupRef.current;
    const camera = cameraRef.current;

    const bgThreeColor = new THREE.Color(effectiveBgColor);
    scene.background = bgThreeColor;
    if (rendererRef.current) {
      rendererRef.current.setClearColor(bgThreeColor, 1);
    }

    // Configure camera for chart type
    if (chartType === 'bar') {
      camera.position.set(0, 1.4, 5.8);
      camera.lookAt(0, 1.1, 0);
      chartGroup.rotation.set(0, 0, 0);
    } else {
      camera.position.set(0, 0.25, 5.4);
      camera.lookAt(0, 0, 0);
      chartGroup.rotation.set(0.15, 0, 0);
    }

    // Clear previous meshes
    while (chartGroup.children.length > 0) {
      const child = chartGroup.children[0];
      chartGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }
    meshesRef.current = [];

    const validData = data.filter(d => Number.isFinite(d.value) && d.value > 0);
    const effectiveTotal = totalSum > 0 ? totalSum : validData.reduce((acc, curr) => acc + curr.value, 0) || 1;
    const maxValue = Math.max(...validData.map(d => d.value), 1);
    const count = validData.length;

    if (count === 0) return;

    if (chartType === 'bar') {
      // 1. NORMAL BAR CHART: Rectangular columns on horizontal baseline
      const availableWidth = 4.6;
      const barWidth = Math.min(0.65, count > 0 ? (availableWidth / count) * 0.72 : 0.65);
      const gap = count > 1 ? (availableWidth - count * barWidth) / (count - 1) : 0.3;
      const totalWidth = count * barWidth + Math.max(0, count - 1) * gap;
      const startX = -totalWidth / 2 + barWidth / 2;

      // Baseline ground bar
      const baseGeo = new THREE.BoxGeometry(totalWidth + 0.6, 0.05, 0.6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x334155 : 0xcbd5e1,
        roughness: 0.5,
      });
      const baseline = new THREE.Mesh(baseGeo, baseMat);
      baseline.position.set(0, -0.03, 0);
      chartGroup.add(baseline);

      validData.forEach((item, idx) => {
        const colorHex = item.color || PALETTE[idx % PALETTE.length];
        const barNormalized = (item.value / maxValue) * 2.4;
        const barHeight = Math.max(0.12, barNormalized);

        const barGeo = new THREE.BoxGeometry(barWidth, barHeight, 0.42);
        const barMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.25,
          metalness: 0.1,
        });

        const mesh = new THREE.Mesh(barGeo, barMat);
        const x = startX + idx * (barWidth + gap);
        const y = barHeight / 2;
        const z = 0;

        mesh.position.set(x, y, z);
        chartGroup.add(mesh);

        // Subtle top beveled edge cap
        const topGeo = new THREE.BoxGeometry(barWidth * 1.02, 0.06, 0.44);
        const topMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.2,
          metalness: 0.2,
        });
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.set(x, barHeight, z);
        chartGroup.add(topMesh);

        const percent = Math.round((item.value / effectiveTotal) * 100);
        meshesRef.current.push({
          mesh,
          datum: item,
          percent,
          initialPos: new THREE.Vector3(x, y, z),
        });
      });
    } else {
      // 2. NORMAL CIRCULAR PIE CHART
      let currentAngle = 0;
      const pieHeight = 0.28;
      const pieRadius = 1.95;

      validData.forEach((item, idx) => {
        const colorHex = item.color || PALETTE[idx % PALETTE.length];
        const fraction = item.value / effectiveTotal;
        const sliceAngle = fraction * Math.PI * 2;

        if (sliceAngle < 0.005) return;

        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.arc(0, 0, pieRadius, currentAngle, currentAngle + sliceAngle, false);
        shape.lineTo(0, 0);

        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: pieHeight,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.02,
          bevelThickness: 0.02,
        };

        const sliceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const sliceMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.3,
          metalness: 0.05,
        });

        const mesh = new THREE.Mesh(sliceGeo, sliceMat);

        const midAngle = currentAngle + sliceAngle / 2;
        const explodeDist = 0.04;
        const exX = Math.cos(midAngle) * explodeDist;
        const exY = Math.sin(midAngle) * explodeDist;

        mesh.position.set(exX, exY, 0);
        chartGroup.add(mesh);

        const percent = Math.round(fraction * 100);
        meshesRef.current.push({
          mesh,
          datum: item,
          percent,
          initialPos: new THREE.Vector3(exX, exY, 0),
        });

        currentAngle += sliceAngle;
      });
    }
  }, [data, chartType, viewMode, webGlAvailable, effectiveBgColor, totalSum, isDark]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? 0.85 : 1.15;
    cameraRef.current.position.multiplyScalar(factor);
  };

  const handleResetRotation = () => {
    if (groupRef.current) {
      if (chartType === 'bar') {
        groupRef.current.rotation.set(0, 0, 0);
      } else {
        groupRef.current.rotation.set(0.15, 0, 0);
      }
    }
  };

  return (
    <div
      className="relative w-full flex flex-col rounded-xl overflow-hidden border border-slate-700/50 shadow-md transition-colors"
      style={{ backgroundColor: effectiveBgColor }}
    >
      {/* Chart Canvas Area */}
      {viewMode === '3d' && webGlAvailable ? (
        <div
          ref={mountRef}
          className="w-full h-56 relative cursor-grab active:cursor-grabbing select-none"
          title="Click and drag to rotate chart"
        />
      ) : (
        <SvgFallbackChart
          data={data}
          chartType={chartType}
          isDark={isDark}
          effectiveBgColor={effectiveBgColor}
          totalSum={totalSum}
          hoveredItem={hoveredItem}
          onHoverItem={setHoveredItem}
        />
      )}

      {/* Floating Hover Info Tooltip */}
      {hoveredItem ? (
        <div className="absolute top-2 left-2 z-20 px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs backdrop-blur-sm pointer-events-none animate-in fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredItem.color }} />
            <span className="truncate max-w-[170px]">{hoveredItem.label}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono mt-0.5">
            <span className="text-sky-300 font-bold">{hoveredItem.value.toLocaleString()}</span>
            <span className="text-slate-400">({hoveredItem.percent}%)</span>
          </div>
        </div>
      ) : (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-[9px] font-mono text-slate-400 pointer-events-none">
          {chartType === 'bar' ? 'Standard Bar Chart' : 'Circular Pie Chart'}
          {viewMode === '3d' && webGlAvailable ? ' (3D)' : ' (2D Vector)'}
        </div>
      )}

      {/* Chart Control Toolbar */}
      <div className={`p-2 border-t flex items-center justify-between text-xs backdrop-blur-sm ${isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-white/40'}`}>
        {/* Toggle Bar / Pie */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeChartType?.('bar')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
            }`}
            title="Display standard rectangular bar chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeChartType?.('pie')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              chartType === 'pie'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
            }`}
            title="Display circular pie chart"
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Pie</span>
          </button>
        </div>

        {/* 2D / 3D & Action Controls */}
        <div className="flex items-center gap-1">
          {webGlAvailable && (
            <button
              type="button"
              onClick={() => setViewMode(prev => (prev === '3d' ? '2d' : '3d'))}
              className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : isDark
                  ? 'bg-slate-800/50 text-slate-400 hover:text-white'
                  : 'bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title={viewMode === '3d' ? 'Switch to 2D vector chart' : 'Switch to 3D chart'}
            >
              <Box className="w-3 h-3" />
              <span>{viewMode.toUpperCase()}</span>
            </button>
          )}

          {viewMode === '3d' && webGlAvailable && (
            <>
              <button
                type="button"
                onClick={() => setIsRotating(prev => !prev)}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isRotating
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={isRotating ? 'Pause auto-spin' : 'Auto-spin chart'}
              >
                {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={handleResetRotation}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Reset chart orientation"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom('in')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom('out')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
