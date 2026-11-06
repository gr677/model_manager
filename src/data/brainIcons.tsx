import React from 'react';

export type BrainIconStyle =
  | 'classic-cortex'
  | 'neural-circuit'
  | 'split-mind'
  | 'prismatic-mesh'
  | 'zen-continuous'
  | 'quantum-core';

export interface BrainIconDefinition {
  id: BrainIconStyle;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  render: (props: { className?: string; size?: number; color?: string }) => React.ReactElement;
  getSvgString: (strokeColor?: string, fillColor?: string) => string;
}

export const BRAIN_ICONS: BrainIconDefinition[] = [
  // 1. Classic Anatomical Cortex
  {
    id: 'classic-cortex',
    name: '1. Classic Anatomical Cortex',
    subtitle: 'Balanced dual-hemisphere cerebral folds',
    description: 'Symmetrical cerebral cortex with organic frontal and temporal lobe convolutions, clean mid-fissure line, and deep cranial curves. Balanced, professional, and timeless.',
    tags: ['Classic', 'Anatomical', 'Balanced', 'Architecture'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Left hemisphere lobes */}
        <path d="M12 4.5 C9.5 4.5 7.5 5.5 6.5 7.5 C5 8.5 4.5 10.5 5 12.5 C4.2 13.8 4.5 16 6 17.5 C7.5 19 9.5 19.5 12 19.5" />
        {/* Right hemisphere lobes */}
        <path d="M12 4.5 C14.5 4.5 16.5 5.5 17.5 7.5 C19 8.5 19.5 10.5 19 12.5 C19.8 13.8 19.5 16 18 17.5 C16.5 19 14.5 19.5 12 19.5" />
        {/* Central fissure separator */}
        <path d="M12 4.5 V19.5" strokeDasharray="1 1" opacity="0.6" />
        {/* Left internal sulci folds */}
        <path d="M7 9 C8.5 9.5 9.5 8.5 12 8.5" />
        <path d="M6.5 13 C8.5 13 9.5 12 12 12" />
        <path d="M7.5 16.5 C9 16 10 16.5 12 15.5" />
        {/* Right internal sulci folds */}
        <path d="M17 9 C15.5 9.5 14.5 8.5 12 8.5" />
        <path d="M17.5 13 C15.5 13 14.5 12 12 12" />
        <path d="M16.5 16.5 C15 16 14 16.5 12 15.5" />
      </svg>
    ),
    getSvgString: (stroke = '#38bdf8', fill = '#6366f1') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4.5 C9.5 4.5 7.5 5.5 6.5 7.5 C5 8.5 4.5 10.5 5 12.5 C4.2 13.8 4.5 16 6 17.5 C7.5 19 9.5 19.5 12 19.5" fill="${fill}" fill-opacity="0.25"/>
        <path d="M12 4.5 C14.5 4.5 16.5 5.5 17.5 7.5 C19 8.5 19.5 10.5 19 12.5 C19.8 13.8 19.5 16 18 17.5 C16.5 19 14.5 19.5 12 19.5" fill="${fill}" fill-opacity="0.25"/>
        <path d="M12 4.5 V19.5" stroke="${stroke}" stroke-dasharray="1 1" opacity="0.7"/>
        <path d="M7 9 C8.5 9.5 9.5 8.5 12 8.5"/>
        <path d="M6.5 13 C8.5 13 9.5 12 12 12"/>
        <path d="M7.5 16.5 C9 16 10 16.5 12 15.5"/>
        <path d="M17 9 C15.5 9.5 14.5 8.5 12 8.5"/>
        <path d="M17.5 13 C15.5 13 14.5 12 12 12"/>
        <path d="M16.5 16.5 C15 16 14 16.5 12 15.5"/>
      </svg>
    `,
  },

  // 2. Cyber Synapse & Neural Circuit
  {
    id: 'neural-circuit',
    name: '2. Cyber Synapse & Neural Circuit',
    subtitle: 'Digital microchip bus traces & synaptic nodes',
    description: 'Technological brain fused with circuit PCB tracks, 45-degree angle buses, and glowing terminal synaptic contact nodes. Modern, AI-driven, and computational.',
    tags: ['Circuit', 'Cyber', 'AI', 'Synapses', 'Engineering'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Outer Cranial Shell */}
        <path d="M12 4 C8 4 5 7 5 11 C5 14 7 16 7 18 C8.5 19.5 10 20 12 20 C14 20 15.5 19.5 17 18 C17 16 19 14 19 11 C19 7 16 4 12 4 Z" />
        {/* Central Vertical Spine / Bus */}
        <path d="M12 7 V17" />
        {/* Synapse Connection Nodes (Dots) */}
        <circle cx="12" cy="7" r="1.2" fill={color} />
        <circle cx="12" cy="12" r="1.2" fill={color} />
        <circle cx="12" cy="17" r="1.2" fill={color} />
        {/* Circuit Branch Left */}
        <path d="M12 9 H8.5 L7 10.5" />
        <circle cx="7" cy="10.5" r="1.2" fill={color} />
        <path d="M12 14 H8.5 L7 15" />
        <circle cx="7" cy="15" r="1.2" fill={color} />
        {/* Circuit Branch Right */}
        <path d="M12 9 H15.5 L17 10.5" />
        <circle cx="17" cy="10.5" r="1.2" fill={color} />
        <path d="M12 14 H15.5 L17 15" />
        <circle cx="17" cy="15" r="1.2" fill={color} />
      </svg>
    ),
    getSvgString: (stroke = '#38bdf8', fill = '#0ea5e9') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4 C8 4 5 7 5 11 C5 14 7 16 7 18 C8.5 19.5 10 20 12 20 C14 20 15.5 19.5 17 18 C17 16 19 14 19 11 C19 7 16 4 12 4 Z" fill="${fill}" fill-opacity="0.2"/>
        <path d="M12 7 V17" stroke="${stroke}"/>
        <circle cx="12" cy="7" r="1.3" fill="${stroke}"/>
        <circle cx="12" cy="12" r="1.3" fill="${stroke}"/>
        <circle cx="12" cy="17" r="1.3" fill="${stroke}"/>
        <path d="M12 9 H8.5 L7 10.5"/>
        <circle cx="7" cy="10.5" r="1.3" fill="${stroke}"/>
        <path d="M12 14 H8.5 L7 15"/>
        <circle cx="7" cy="15" r="1.3" fill="${stroke}"/>
        <path d="M12 9 H15.5 L17 10.5"/>
        <circle cx="17" cy="10.5" r="1.3" fill="${stroke}"/>
        <path d="M12 14 H15.5 L17 15"/>
        <circle cx="17" cy="15" r="1.3" fill="${stroke}"/>
      </svg>
    `,
  },

  // 3. Dual Mind: Matrix & Creative Flow
  {
    id: 'split-mind',
    name: '3. Dual Mind: Logic & Creative Flow',
    subtitle: 'Left analytical grid vs Right creative fluid waves',
    description: 'Split hemisphere concept symbolizing total cognitive synergy: analytical structured grid cubes on the left, organic inspiration waves and fluid sparks on the right.',
    tags: ['Dual', 'Creative', 'Analytical', 'Innovation', 'Balanced'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Left Side: Geometric Grid / Logic */}
        <path d="M12 4 C9 4 6 6 5.5 9 C5 12 5.5 14 6.5 16.5 C7.5 18.5 9.5 19.5 12 19.5" />
        <rect x="7" y="7" width="3" height="3" rx="0.5" fill={color} fillOpacity="0.4" />
        <rect x="7.5" y="12" width="2.8" height="2.8" rx="0.5" fill={color} fillOpacity="0.4" />
        <path d="M8.5 10 V12" />
        <path d="M10 8.5 H12" />
        <path d="M10.3 13.4 H12" />

        {/* Center Divide */}
        <path d="M12 3.5 V20.5" strokeWidth="2" />

        {/* Right Side: Fluid Organic Waves */}
        <path d="M12 4 C15 4 18 6 18.5 9 C19 12 18.5 14 17.5 16.5 C16.5 18.5 14.5 19.5 12 19.5" />
        <path d="M12 8 C14 7.5 15.5 9 17 8.5" />
        <path d="M12 12 C14.5 11.5 15.5 13.5 17.5 12.5" />
        <path d="M12 16 C14 15.5 15 17 16.5 16" />
      </svg>
    ),
    getSvgString: (stroke = '#c084fc', fill = '#a855f7') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4 C9 4 6 6 5.5 9 C5 12 5.5 14 6.5 16.5 C7.5 18.5 9.5 19.5 12 19.5" fill="${fill}" fill-opacity="0.2"/>
        <rect x="7" y="7" width="3" height="3" rx="0.5" fill="${stroke}" fill-opacity="0.4"/>
        <rect x="7.5" y="12" width="2.8" height="2.8" rx="0.5" fill="${stroke}" fill-opacity="0.4"/>
        <path d="M8.5 10 V12"/>
        <path d="M10 8.5 H12"/>
        <path d="M10.3 13.4 H12"/>
        <path d="M12 3.5 V20.5" stroke="${stroke}" stroke-width="2"/>
        <path d="M12 4 C15 4 18 6 18.5 9 C19 12 18.5 14 17.5 16.5 C16.5 18.5 14.5 19.5 12 19.5" fill="${fill}" fill-opacity="0.2"/>
        <path d="M12 8 C14 7.5 15.5 9 17 8.5"/>
        <path d="M12 12 C14.5 11.5 15.5 13.5 17.5 12.5"/>
        <path d="M12 16 C14 15.5 15 17 16.5 16"/>
      </svg>
    `,
  },

  // 4. Low-Poly Geometric Crystal
  {
    id: 'prismatic-mesh',
    name: '4. Low-Poly Geometric Crystal',
    subtitle: 'Faceted 3D structural lattice & vertices',
    description: 'Precision triangulation mesh with geometric nodes and crystalline facets. Perfect for architectural modeling, multi-layered data schemas, and structural precision.',
    tags: ['Geometric', '3D', 'Crystal', 'Mesh', 'Prismatic'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Outer Facets */}
        <polygon points="12,3 6,6 4,12 7,18 12,21 17,18 20,12 18,6" />
        {/* Central Axis */}
        <line x1="12" y1="3" x2="12" y2="21" />
        {/* Left Triangulation */}
        <line x1="6" y1="6" x2="12" y2="9" />
        <line x1="4" y1="12" x2="12" y2="9" />
        <line x1="4" y1="12" x2="12" y2="15" />
        <line x1="7" y1="18" x2="12" y2="15" />
        {/* Right Triangulation */}
        <line x1="18" y1="6" x2="12" y2="9" />
        <line x1="20" y1="12" x2="12" y2="9" />
        <line x1="20" y1="12" x2="12" y2="15" />
        <line x1="17" y1="18" x2="12" y2="15" />
        {/* Subtle Node Dots */}
        <circle cx="12" cy="9" r="1.3" fill={color} />
        <circle cx="12" cy="15" r="1.3" fill={color} />
      </svg>
    ),
    getSvgString: (stroke = '#10b981', fill = '#059669') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12,3 6,6 4,12 7,18 12,21 17,18 20,12 18,6" fill="${fill}" fill-opacity="0.2"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
        <line x1="6" y1="6" x2="12" y2="9"/>
        <line x1="4" y1="12" x2="12" y2="9"/>
        <line x1="4" y1="12" x2="12" y2="15"/>
        <line x1="7" y1="18" x2="12" y2="15"/>
        <line x1="18" y1="6" x2="12" y2="9"/>
        <line x1="20" y1="12" x2="12" y2="9"/>
        <line x1="20" y1="12" x2="12" y2="15"/>
        <line x1="17" y1="18" x2="12" y2="15"/>
        <circle cx="12" cy="9" r="1.4" fill="${stroke}"/>
        <circle cx="12" cy="15" r="1.4" fill="${stroke}"/>
      </svg>
    `,
  },

  // 5. Minimalist Continuous Line
  {
    id: 'zen-continuous',
    name: '5. Minimalist Continuous Line',
    subtitle: 'Ultra-clean single-stroke Zen silhouette',
    description: 'Boutique single continuous line stroke that traces the lobes, cerebral loops, and central symmetry in an unbroken elegant curve. Pure, uncluttered, and contemporary.',
    tags: ['Minimalist', 'Zen', 'One-Stroke', 'Modern', 'Clean'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M12 19 C8 19 5.5 17 5.5 13.5 C5.5 11 7 9.5 7 8 C7 5.5 9 4.5 12 4.5 C15 4.5 17 5.5 17 8 C17 9.5 18.5 11 18.5 13.5 C18.5 17 16 19 12 19 Z" />
        <path d="M9.5 11 C8.5 12 8.5 14 10 15 C11 15.7 12 14.5 12 13.5 C12 11 10.5 10 9.5 11 Z" />
        <path d="M14.5 11 C15.5 12 15.5 14 14 15 C13 15.7 12 14.5 12 13.5 C12 11 13.5 10 14.5 11 Z" />
      </svg>
    ),
    getSvgString: (stroke = '#f59e0b', fill = '#d97706') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19 C8 19 5.5 17 5.5 13.5 C5.5 11 7 9.5 7 8 C7 5.5 9 4.5 12 4.5 C15 4.5 17 5.5 17 8 C17 9.5 18.5 11 18.5 13.5 C18.5 17 16 19 12 19 Z" fill="${fill}" fill-opacity="0.2"/>
        <path d="M9.5 11 C8.5 12 8.5 14 10 15 C11 15.7 12 14.5 12 13.5 C12 11 10.5 10 9.5 11 Z"/>
        <path d="M14.5 11 C15.5 12 15.5 14 14 15 C13 15.7 12 14.5 12 13.5 C12 11 13.5 10 14.5 11 Z"/>
      </svg>
    `,
  },

  // 6. Quantum Thought & Synaptic Core
  {
    id: 'quantum-core',
    name: '6. Quantum Thought & Orbital Synapses',
    subtitle: 'Glowing nucleus with planetary neural rings',
    description: 'Central luminescent intellectual nucleus surrounded by intersecting elliptical thought orbits and pulse nodes. Dynamic, radiant, and visionary.',
    tags: ['Quantum', 'Orbital', 'Nuclear', 'Visionary', 'Dynamic'],
    render: ({ className = 'w-5 h-5', size = 20, color = 'currentColor' }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Central Core Brain Nucleus */}
        <circle cx="12" cy="12" r="3.2" fill={color} fillOpacity="0.3" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.2" fill={color} />
        {/* Orbital Ring 1: Diagonal Right */}
        <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(-30 12 12)" />
        {/* Orbital Ring 2: Diagonal Left */}
        <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(30 12 12)" />
        {/* Orbital Ring 3: Vertical Ellipse */}
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" opacity="0.4" strokeDasharray="2 2" />
        {/* Synapse Nodes */}
        <circle cx="5" cy="8" r="1.2" fill={color} />
        <circle cx="19" cy="8" r="1.2" fill={color} />
        <circle cx="5" cy="16" r="1.2" fill={color} />
        <circle cx="19" cy="16" r="1.2" fill={color} />
      </svg>
    ),
    getSvgString: (stroke = '#ec4899', fill = '#f43f5e') => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3.2" fill="${fill}" fill-opacity="0.3" stroke-width="2"/>
        <circle cx="12" cy="12" r="1.3" fill="${stroke}"/>
        <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(-30 12 12)"/>
        <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(30 12 12)"/>
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" opacity="0.5" stroke-dasharray="2 2"/>
        <circle cx="5" cy="8" r="1.3" fill="${stroke}"/>
        <circle cx="19" cy="8" r="1.3" fill="${stroke}"/>
        <circle cx="5" cy="16" r="1.3" fill="${stroke}"/>
        <circle cx="19" cy="16" r="1.3" fill="${stroke}"/>
      </svg>
    `,
  },
];
