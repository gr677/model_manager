/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BarChart3, PieChart as PieChartIcon, RotateCw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

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

export const ThreeDChart: React.FC<ThreeDChartProps> = ({
  data,
  chartType,
  onChangeChartType,
  isDark = true,
  totalSum = 0,
  fieldName = 'Value',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{ label: string; value: number; percent: number; color: string } | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // References for scene lifecycle
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const meshesRef = useRef<Array<{ mesh: THREE.Mesh; datum: ChartDatum; percent: number; initialY: number }>>([]);
  const isPointerDownRef = useRef(false);
  const prevPointerPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 280;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // WebGLRenderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.8 : 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.4 : 1.6);
    dirLight.position.set(6, 10, 7);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, isDark ? 0.9 : 0.6);
    rimLight.position.set(-7, -2, -5);
    scene.add(rimLight);

    // Ground reflective platform disc
    const platformGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.2, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.1;
    scene.add(platform);

    // Outer subtle ring border
    const ringGeo = new THREE.TorusGeometry(3.8, 0.04, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    // Central group holding chart meshes
    const chartGroup = new THREE.Group();
    scene.add(chartGroup);
    groupRef.current = chartGroup;

    // Build 3D Chart Data
    meshesRef.current = [];
    const validData = data.filter(d => Number.isFinite(d.value) && d.value > 0);
    const effectiveTotal = totalSum > 0 ? totalSum : validData.reduce((acc, curr) => acc + curr.value, 0) || 1;
    const maxValue = Math.max(...validData.map(d => d.value), 1);

    if (chartType === 'bar') {
      // 3D Bar Chart
      const count = validData.length;
      const radius = count > 5 ? 2.3 : Math.max(1.4, count * 0.35);

      validData.forEach((item, idx) => {
        const colorHex = item.color || PALETTE[idx % PALETTE.length];
        const barNormalized = (item.value / maxValue) * 3.2;
        const barHeight = Math.max(0.25, barNormalized);

        // Cylindrical 3D Bar with beveled appearance
        const barGeo = new THREE.CylinderGeometry(0.24, 0.28, barHeight, 32);
        const barMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.2,
          metalness: 0.15,
        });

        const mesh = new THREE.Mesh(barGeo, barMat);

        // Position bars evenly along a circular carousel or arc
        const angle = (idx / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = barHeight / 2;

        mesh.position.set(x, y, z);
        chartGroup.add(mesh);

        // Top cap gem
        const capGeo = new THREE.SphereGeometry(0.25, 24, 16);
        const capMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex).offsetHSL(0, 0, 0.1),
          roughness: 0.1,
          metalness: 0.4,
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(x, barHeight, z);
        cap.scale.set(1, 0.4, 1);
        chartGroup.add(cap);

        const percent = Math.round((item.value / effectiveTotal) * 100);
        meshesRef.current.push({ mesh, datum: item, percent, initialY: y });
      });
    } else {
      // 3D Pie / Wedge Chart
      let currentAngle = 0;
      const pieHeight = 0.65;
      const pieRadius = 2.2;

      validData.forEach((item, idx) => {
        const colorHex = item.color || PALETTE[idx % PALETTE.length];
        const fraction = item.value / effectiveTotal;
        const sliceAngle = fraction * Math.PI * 2;

        if (sliceAngle < 0.01) return;

        // Shape for extruded pie slice
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.arc(0, 0, pieRadius, currentAngle, currentAngle + sliceAngle, false);
        shape.lineTo(0, 0);

        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: pieHeight,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.04,
          bevelThickness: 0.04,
        };

        const sliceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        sliceGeo.rotateX(Math.PI / 2);

        const sliceMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.25,
          metalness: 0.1,
        });

        const mesh = new THREE.Mesh(sliceGeo, sliceMat);

        // Subtle radial explosion offset for visual separation
        const midAngle = currentAngle + sliceAngle / 2;
        const explodeDist = 0.08;
        const exX = Math.cos(midAngle) * explodeDist;
        const exZ = -Math.sin(midAngle) * explodeDist;

        mesh.position.set(exX, pieHeight, exZ);
        chartGroup.add(mesh);

        const percent = Math.round(fraction * 100);
        meshesRef.current.push({ mesh, datum: item, percent, initialY: pieHeight });

        currentAngle += sliceAngle;
      });
    }

    // Raycasting for interactive hover inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle user drag rotation
      if (isPointerDownRef.current) {
        const deltaX = e.clientX - prevPointerPosRef.current.x;
        if (chartGroup) {
          chartGroup.rotation.y += deltaX * 0.01;
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
          return;
        }
      }
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

    // Responsive Resize Observer
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

    // Animation Loop
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

      // Clean disposal
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [data, chartType, isDark, isRotating, totalSum]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? 0.85 : 1.15;
    cameraRef.current.position.multiplyScalar(factor);
  };

  const handleResetRotation = () => {
    if (groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <div className="relative w-full flex flex-col rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950/60 shadow-xl">
      {/* 3D Canvas Stage */}
      <div
        ref={mountRef}
        className="w-full h-56 relative cursor-grab active:cursor-grabbing select-none"
        title="Click and drag to spin 3D chart"
      />

      {/* Floating Hover Info Overlay */}
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
        <div className="absolute top-2 left-2 z-20 px-2 py-1 rounded bg-black/40 border border-white/5 text-[10px] text-slate-400 font-mono pointer-events-none flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
          <span>Interactive 3D {chartType === 'bar' ? 'Bar' : 'Pie'} Chart</span>
        </div>
      )}

      {/* Control Toolbar Bar: Bar/Pie switch & Camera controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-t border-slate-800 text-xs">
        {/* Chart Type Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeChartType?.('bar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to 3D Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeChartType?.('pie')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              chartType === 'pie'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to 3D Pie Chart"
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Pie</span>
          </button>
        </div>

        {/* View & Rotation Controls */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => setIsRotating(prev => !prev)}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer ${
              isRotating ? 'text-blue-400' : 'text-slate-400'
            }`}
            title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetRotation}
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer ml-1"
            title="Reset chart view rotation"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
