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

export const CHART_PALETTE = [
  '#3b82f6', // cobalt blue
  '#10b981', // emerald
  '#f59e0b', // amber gold
  '#ec4899', // rose pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // coral orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

const PALETTE = CHART_PALETTE;

function lightenHex(hex: string, amount = 0.2): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function darkenHex(hex: string, amount = 0.16): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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

  // 2. Refined Circular Pie Chart SVG (starts at 12 o'clock, subtle slice gradients & callout labels)
  const width = 460;
  const height = 304;
  const cx = width / 2;
  const cy = height / 2 + 4;
  const r = 86;

  let accAngle = -Math.PI / 2;
  const slices = validData
    .map((item, idx) => {
      const fraction = item.value / effectiveTotal;
      const angle = fraction * Math.PI * 2;
      const startAngle = accAngle;
      const endAngle = accAngle + angle;
      const midAngle = startAngle + angle / 2;
      accAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const isFullCircle = fraction >= 0.999;
      const path = isFullCircle
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const color = item.color || PALETTE[idx % PALETTE.length];
      const percent = Math.round(fraction * 100);
      const labelRadius = isFullCircle ? 0 : r * 0.62;
      const innerX = cx + labelRadius * Math.cos(midAngle);
      const innerY = cy + labelRadius * Math.sin(midAngle);

      const cosM = Math.cos(midAngle);
      const sinM = Math.sin(midAngle);
      const edgeX = cx + (r + 2) * cosM;
      const edgeY = cy + (r + 2) * sinM;
      const radialOutX = cx + (r + 18) * cosM;
      const radialOutY = cy + (r + 18) * sinM;

      return {
        item,
        idx,
        path,
        color,
        lightColor: lightenHex(color, 0.24),
        darkColor: darkenHex(color, 0.14),
        labelTint: isDark ? lightenHex(color, 0.35) : darkenHex(color, 0.2),
        percent,
        angle,
        midAngle,
        cosM,
        innerX,
        innerY,
        edgeX,
        edgeY,
        radialOutX,
        radialOutY,
        isRight: isFullCircle ? true : cosM >= 0,
        gradId: `pie-grad-${idx}`,
      };
    })
    .filter(s => s.angle >= 0.005);

  // De-overlap callout labels vertically per side
  const placeSideLabels = (sideSlices: typeof slices, minTop: number, maxBottom: number) => {
    const sorted = [...sideSlices].sort((a, b) => a.radialOutY - b.radialOutY);
    const minGap = 20;
    const ys = sorted.map(s => Math.max(minTop, Math.min(maxBottom, s.radialOutY)));
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] < ys[i - 1] + minGap) {
        ys[i] = ys[i - 1] + minGap;
      }
    }
    if (ys.length > 0 && ys[ys.length - 1] > maxBottom) {
      ys[ys.length - 1] = maxBottom;
      for (let i = ys.length - 2; i >= 0; i--) {
        if (ys[i] > ys[i + 1] - minGap) {
          ys[i] = ys[i + 1] - minGap;
        }
      }
      for (let i = 0; i < ys.length; i++) {
        if (ys[i] < minTop) ys[i] = minTop;
      }
    }
    const yMap = new Map<number, number>();
    sorted.forEach((s, i) => yMap.set(s.idx, ys[i]));
    return yMap;
  };

  const rightYMap = placeSideLabels(slices.filter(s => s.isRight), 24, height - 16);
  const leftYMap = placeSideLabels(slices.filter(s => !s.isRight), 34, height - 16);

  return (
    <div
      className="w-full h-80 flex items-center justify-center select-none relative overflow-hidden"
      style={{ backgroundColor: effectiveBgColor }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <filter id="pie-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="6"
              floodColor={isDark ? '#000000' : '#0f172a'}
              floodOpacity={isDark ? '0.45' : '0.18'}
            />
          </filter>
          <radialGradient id="pie-gloss-overlay" cx="35%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
          </radialGradient>
          {slices.map(slice => (
            <linearGradient key={slice.gradId} id={slice.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={slice.lightColor} />
              <stop offset="55%" stopColor={slice.color} />
              <stop offset="100%" stopColor={slice.darkColor} />
            </linearGradient>
          ))}
        </defs>

        {/* Subtle outer ambient framing ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="none"
          stroke={isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.09)'}
          strokeWidth="1.25"
        />

        <g filter="url(#pie-soft-shadow)">
          {slices.map(slice => {
            const isHovered = hoveredItem?.label === slice.item.label;
            const popOffset = isHovered && slices.length > 1 ? 5.5 : 0;
            const tx = Math.cos(slice.midAngle) * popOffset;
            const ty = Math.sin(slice.midAngle) * popOffset;

            return (
              <g
                key={slice.item.id || slice.idx}
                transform={`translate(${tx}, ${ty})`}
                className="cursor-pointer transition-transform duration-200 ease-out"
                onMouseEnter={() =>
                  onHoverItem({
                    label: slice.item.label,
                    value: slice.item.value,
                    percent: slice.percent,
                    color: slice.color,
                  })
                }
                onMouseLeave={() => onHoverItem(null)}
              >
                <path
                  d={slice.path}
                  fill={`url(#${slice.gradId})`}
                  stroke={effectiveBgColor}
                  strokeWidth={slices.length > 1 ? '2.2' : '0'}
                  strokeLinejoin="round"
                  opacity={hoveredItem ? (isHovered ? 1 : 0.52) : 0.98}
                  className="transition-opacity duration-150"
                />
                {slice.angle >= 0.42 && (
                  <text
                    x={slice.innerX}
                    y={slice.innerY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontWeight="700"
                    fill="#ffffff"
                    className="pointer-events-none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}
                  >
                    {slice.percent}%
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Subtle circular gloss highlight */}
        <circle cx={cx} cy={cy} r={r} fill="url(#pie-gloss-overlay)" className="pointer-events-none" />

        {/* Callout Leader Lines & Slice Labels */}
        {slices.map(slice => {
          const isHovered = hoveredItem?.label === slice.item.label;
          const labelY = slice.isRight
            ? rightYMap.get(slice.idx) ?? slice.radialOutY
            : leftYMap.get(slice.idx) ?? slice.radialOutY;
          const elbowX = slice.isRight
            ? Math.min(width - 114, Math.max(slice.edgeX + 10, slice.radialOutX))
            : Math.max(114, Math.min(slice.edgeX - 10, slice.radialOutX));
          const shelfEndX = slice.isRight ? elbowX + 12 : elbowX - 12;
          const textX = slice.isRight ? shelfEndX + 5 : shelfEndX - 5;
          const shortName =
            slice.item.label.length > 14 ? `${slice.item.label.slice(0, 13)}…` : slice.item.label;

          return (
            <g
              key={`lbl-${slice.item.id || slice.idx}`}
              opacity={hoveredItem ? (isHovered ? 1 : 0.4) : 0.95}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={() =>
                onHoverItem({
                  label: slice.item.label,
                  value: slice.item.value,
                  percent: slice.percent,
                  color: slice.color,
                })
              }
              onMouseLeave={() => onHoverItem(null)}
            >
              <polyline
                points={`${slice.edgeX.toFixed(1)},${slice.edgeY.toFixed(1)} ${elbowX.toFixed(1)},${labelY.toFixed(1)} ${shelfEndX.toFixed(1)},${labelY.toFixed(1)}`}
                fill="none"
                stroke={slice.color}
                strokeOpacity={isHovered ? 0.95 : 0.72}
                strokeWidth={isHovered ? '1.6' : '1.15'}
                strokeLinejoin="round"
              />
              <circle cx={slice.edgeX} cy={slice.edgeY} r="2.2" fill={slice.color} />
              <text
                x={textX}
                y={labelY}
                textAnchor={slice.isRight ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="10.5"
              >
                <tspan fill={isDark ? '#e2e8f0' : '#0f172a'} fontWeight="600">
                  {shortName}{' '}
                </tspan>
                <tspan
                  fill={slice.labelTint}
                  fontWeight="700"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {slice.percent}%
                </tspan>
              </text>
            </g>
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
  const meshesRef = useRef<
    Array<{
      key: string;
      mesh: THREE.Mesh;
      datum: ChartDatum;
      percent: number;
      initialPos: THREE.Vector3;
      midAngle?: number;
      sliceAngle?: number;
      pieRadius?: number;
      pieHeight?: number;
    }>
  >([]);
  const overlaySliceRefs = useRef<
    Map<
      string,
      {
        g: SVGGElement | null;
        line: SVGPolylineElement | null;
        dot: SVGCircleElement | null;
        text: SVGTextElement | null;
      }
    >
  >(new Map());
  const chartTypeRef = useRef(chartType);
  chartTypeRef.current = chartType;
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;
  const hoveredLabelRef = useRef<string | null>(null);
  hoveredLabelRef.current = hoveredItem?.label || null;
  const isPointerDownRef = useRef(false);
  const prevPointerPosRef = useRef({ x: 0, y: 0 });

  const pieSlicesMeta = useMemo(() => {
    const valid = data.filter(d => Number.isFinite(d.value) && d.value > 0);
    const effTotal = totalSum > 0 ? totalSum : valid.reduce((acc, curr) => acc + curr.value, 0) || 1;
    return valid
      .map((item, idx) => {
        const fraction = item.value / effTotal;
        const sliceAngle = fraction * Math.PI * 2;
        const color = item.color || PALETTE[idx % PALETTE.length];
        const percent = Math.round(fraction * 100);
        return {
          key: item.id || String(idx),
          item,
          color,
          labelTint: isDark ? lightenHex(color, 0.35) : darkenHex(color, 0.2),
          percent,
          sliceAngle,
        };
      })
      .filter(s => s.sliceAngle >= 0.005);
  }, [data, totalSum, isDark]);

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
    const hemiLight = new THREE.HemisphereLight(0xffffff, isDark ? 0x0f172a : 0x94a3b8, 0.8);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.55 : 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.4 : 1.55);
    dirLight.position.set(3.5, 6, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, isDark ? 0.55 : 0.35);
    fillLight.position.set(-5, -3, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

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
        if (chartTypeRef.current === 'pie') {
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
            const mat = m.mesh.material as THREE.MeshStandardMaterial;
            if (m.mesh === hitMesh) {
              if (chartTypeRef.current === 'pie' && m.midAngle !== undefined) {
                m.mesh.position.set(
                  m.initialPos.x + Math.cos(m.midAngle) * 0.09,
                  m.initialPos.y + Math.sin(m.midAngle) * 0.09,
                  m.initialPos.z + 0.09
                );
                m.mesh.scale.set(1.03, 1.03, 1.03);
              } else {
                m.mesh.scale.set(1.05, 1.05, 1.05);
              }
              mat.emissive.setHex(0xffffff);
              mat.emissiveIntensity = 0.14;
            } else {
              m.mesh.position.copy(m.initialPos);
              m.mesh.scale.set(1, 1, 1);
              mat.emissiveIntensity = 0;
            }
          });
          return;
        }
      }

      meshesRef.current.forEach(m => {
        m.mesh.position.copy(m.initialPos);
        m.mesh.scale.set(1, 1, 1);
        (m.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      });
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
    const tmpEdgeVec = new THREE.Vector3();
    const tmpCenterVec = new THREE.Vector3();

    const updatePieOverlayLabels = () => {
      if (chartTypeRef.current !== 'pie' || meshesRef.current.length === 0) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;

      chartGroup.updateMatrixWorld();
      tmpCenterVec.set(0, 0, 0).applyMatrix4(chartGroup.matrixWorld).project(camera);
      const centerX = (tmpCenterVec.x * 0.5 + 0.5) * w;
      const centerY = (-tmpCenterVec.y * 0.5 + 0.5) * h;

      interface ProjectedLabelItem {
        key: string;
        label: string;
        edgeX: number;
        edgeY: number;
        ux: number;
        uy: number;
        naturalY: number;
        isRight: boolean;
      }

      const projected: ProjectedLabelItem[] = [];
      meshesRef.current.forEach(m => {
        if (m.midAngle === undefined || m.pieRadius === undefined) return;
        const frontZ = m.mesh.position.z + (m.pieHeight || 0.28) * 0.65;
        tmpEdgeVec
          .set(
            m.mesh.position.x + Math.cos(m.midAngle) * m.pieRadius,
            m.mesh.position.y + Math.sin(m.midAngle) * m.pieRadius,
            frontZ
          )
          .applyMatrix4(chartGroup.matrixWorld)
          .project(camera);

        const edgeX = (tmpEdgeVec.x * 0.5 + 0.5) * w;
        const edgeY = (-tmpEdgeVec.y * 0.5 + 0.5) * h;
        const vx = edgeX - centerX;
        const vy = edgeY - centerY;
        const dist = Math.hypot(vx, vy) || 1;
        const ux = vx / dist;
        const uy = vy / dist;
        const isRight = meshesRef.current.length === 1 ? true : ux >= 0;

        projected.push({
          key: m.key,
          label: m.datum.label,
          edgeX,
          edgeY,
          ux,
          uy,
          naturalY: edgeY + uy * 14,
          isRight,
        });
      });

      const placeSide = (items: ProjectedLabelItem[], minTop: number, maxBottom: number) => {
        const sorted = [...items].sort((a, b) => a.naturalY - b.naturalY);
        const minGap = 19;
        const ys = sorted.map(s => Math.max(minTop, Math.min(maxBottom, s.naturalY)));
        for (let i = 1; i < ys.length; i++) {
          if (ys[i] < ys[i - 1] + minGap) {
            ys[i] = ys[i - 1] + minGap;
          }
        }
        if (ys.length > 0 && ys[ys.length - 1] > maxBottom) {
          ys[ys.length - 1] = maxBottom;
          for (let i = ys.length - 2; i >= 0; i--) {
            if (ys[i] > ys[i + 1] - minGap) {
              ys[i] = ys[i + 1] - minGap;
            }
          }
          for (let i = 0; i < ys.length; i++) {
            if (ys[i] < minTop) ys[i] = minTop;
          }
        }
        const yMap = new Map<string, number>();
        sorted.forEach((s, i) => yMap.set(s.key, ys[i]));
        return yMap;
      };

      const rightY = placeSide(projected.filter(p => p.isRight), 22, h - 14);
      const leftY = placeSide(projected.filter(p => !p.isRight), 34, h - 14);
      const labelReserve = Math.min(122, Math.max(96, w * 0.26));
      const activeHover = hoveredLabelRef.current;

      projected.forEach(p => {
        const refs = overlaySliceRefs.current.get(p.key);
        if (!refs) return;
        const labelY = p.isRight ? rightY.get(p.key) ?? p.naturalY : leftY.get(p.key) ?? p.naturalY;
        const elbowX = p.isRight
          ? Math.min(w - labelReserve, Math.max(p.edgeX + 8, p.edgeX + Math.abs(p.ux) * 14 + 4))
          : Math.max(labelReserve, Math.min(p.edgeX - 8, p.edgeX - Math.abs(p.ux) * 14 - 4));
        const shelfEndX = p.isRight ? elbowX + 10 : elbowX - 10;
        const textX = p.isRight ? shelfEndX + 4 : shelfEndX - 4;

        if (refs.g) {
          refs.g.style.opacity = activeHover ? (activeHover === p.label ? '1' : '0.38') : '0.96';
        }
        if (refs.line) {
          refs.line.setAttribute(
            'points',
            `${p.edgeX.toFixed(1)},${p.edgeY.toFixed(1)} ${elbowX.toFixed(1)},${labelY.toFixed(1)} ${shelfEndX.toFixed(1)},${labelY.toFixed(1)}`
          );
        }
        if (refs.dot) {
          refs.dot.setAttribute('cx', p.edgeX.toFixed(1));
          refs.dot.setAttribute('cy', p.edgeY.toFixed(1));
        }
        if (refs.text) {
          refs.text.setAttribute('x', textX.toFixed(1));
          refs.text.setAttribute('y', labelY.toFixed(1));
          refs.text.setAttribute('text-anchor', p.isRight ? 'start' : 'end');
        }
      });
    };

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (isRotatingRef.current && !isPointerDownRef.current && chartGroup) {
        chartGroup.rotation.y += delta * 0.45;
      }
      renderer.render(scene, camera);
      updatePieOverlayLabels();
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
      camera.position.set(0, 0.12, 5.45);
      camera.lookAt(0, 0, 0);
      chartGroup.rotation.set(-0.34, 0.06, 0);
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
          key: item.id || String(idx),
          mesh,
          datum: item,
          percent,
          initialPos: new THREE.Vector3(x, y, z),
        });
      });
    } else {
      // 2. POLISHED CIRCULAR 3D PIE CHART (starts at 12 o'clock, silky smooth arc, glossy clearcoat)
      let currentAngle = Math.PI / 2;
      const pieHeight = 0.28;
      const pieRadius = 1.48;
      const zCenter = -pieHeight / 2;
      const singleSlice = validData.length === 1;

      // Subtle outer framing halo ring behind the circular pie
      const haloGeo = new THREE.RingGeometry(pieRadius + 0.12, pieRadius + 0.16, 72);
      const haloMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x94a3b8 : 0x475569,
        transparent: true,
        opacity: isDark ? 0.22 : 0.14,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(0, 0, zCenter - 0.06);
      chartGroup.add(haloMesh);

      // Subtle dark backing disc to give depth between separated slices
      const backingGeo = new THREE.CircleGeometry(pieRadius + 0.04, 72);
      const backingMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x020617 : 0xcbd5e1,
        transparent: true,
        opacity: isDark ? 0.55 : 0.35,
        side: THREE.DoubleSide,
      });
      const backingMesh = new THREE.Mesh(backingGeo, backingMat);
      backingMesh.position.set(0, 0, zCenter - 0.05);
      chartGroup.add(backingMesh);

      validData.forEach((item, idx) => {
        const colorHex = item.color || PALETTE[idx % PALETTE.length];
        const fraction = item.value / effectiveTotal;
        const sliceAngle = fraction * Math.PI * 2;

        if (sliceAngle < 0.005) return;

        const shape = new THREE.Shape();
        if (singleSlice || fraction >= 0.999) {
          shape.absarc(0, 0, pieRadius, 0, Math.PI * 2, false);
        } else {
          shape.moveTo(0, 0);
          shape.arc(0, 0, pieRadius, currentAngle, currentAngle - sliceAngle, true);
          shape.lineTo(0, 0);
        }

        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: pieHeight,
          bevelEnabled: true,
          bevelSegments: 4,
          steps: 1,
          bevelSize: 0.025,
          bevelThickness: 0.025,
          curveSegments: 56,
        };

        const sliceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const sliceMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.24,
          metalness: 0.06,
          clearcoat: 0.45,
          clearcoatRoughness: 0.18,
        });

        const mesh = new THREE.Mesh(sliceGeo, sliceMat);

        const midAngle = currentAngle - sliceAngle / 2;
        const explodeDist = singleSlice || fraction >= 0.999 ? 0 : 0.055;
        const exX = Math.cos(midAngle) * explodeDist;
        const exY = Math.sin(midAngle) * explodeDist;

        mesh.position.set(exX, exY, zCenter);
        chartGroup.add(mesh);

        const percent = Math.round(fraction * 100);
        meshesRef.current.push({
          key: item.id || String(idx),
          mesh,
          datum: item,
          percent,
          initialPos: new THREE.Vector3(exX, exY, zCenter),
          midAngle,
          sliceAngle,
          pieRadius,
          pieHeight,
        });

        currentAngle -= sliceAngle;
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
        groupRef.current.rotation.set(-0.34, 0.06, 0);
      }
    }
  };

  return (
    <div
      className="relative w-full flex flex-col rounded-xl overflow-hidden border border-slate-700/50 shadow-md transition-colors"
      style={{ backgroundColor: effectiveBgColor }}
    >
      {/* Chart Canvas Area (taller block for Pie so callout labels have generous room) */}
      {viewMode === '3d' && webGlAvailable ? (
        <div
          className={`w-full relative select-none transition-all duration-200 ${
            chartType === 'pie' ? 'h-80' : 'h-56'
          }`}
        >
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            title="Click and drag to rotate chart"
          />
          {chartType === 'pie' && pieSlicesMeta.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
              {pieSlicesMeta.map(s => {
                const shortName =
                  s.item.label.length > 12 ? `${s.item.label.slice(0, 11)}…` : s.item.label;
                return (
                  <g
                    key={s.key}
                    ref={el => {
                      const prev = overlaySliceRefs.current.get(s.key) || {
                        g: null,
                        line: null,
                        dot: null,
                        text: null,
                      };
                      prev.g = el;
                      overlaySliceRefs.current.set(s.key, prev);
                    }}
                    className="transition-opacity duration-150"
                  >
                    <polyline
                      ref={el => {
                        const prev = overlaySliceRefs.current.get(s.key) || {
                          g: null,
                          line: null,
                          dot: null,
                          text: null,
                        };
                        prev.line = el;
                        overlaySliceRefs.current.set(s.key, prev);
                      }}
                      fill="none"
                      stroke={s.color}
                      strokeOpacity="0.78"
                      strokeWidth="1.25"
                      strokeLinejoin="round"
                    />
                    <circle
                      ref={el => {
                        const prev = overlaySliceRefs.current.get(s.key) || {
                          g: null,
                          line: null,
                          dot: null,
                          text: null,
                        };
                        prev.dot = el;
                        overlaySliceRefs.current.set(s.key, prev);
                      }}
                      r="2.3"
                      fill={s.color}
                    />
                    <text
                      ref={el => {
                        const prev = overlaySliceRefs.current.get(s.key) || {
                          g: null,
                          line: null,
                          dot: null,
                          text: null,
                        };
                        prev.text = el;
                        overlaySliceRefs.current.set(s.key, prev);
                      }}
                      dominantBaseline="central"
                      fontSize="10.5"
                    >
                      <tspan fill={isDark ? '#e2e8f0' : '#0f172a'} fontWeight="600">
                        {shortName}{' '}
                      </tspan>
                      <tspan
                        fill={s.labelTint}
                        fontWeight="700"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {s.percent}%
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
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
