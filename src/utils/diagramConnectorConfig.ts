/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramType } from '../types/diagram';

export type ConnectorRoutingStyle = 'orthogonal' | 'curved' | 'straight';

export interface ConnectorStyleOption {
  id: ConnectorRoutingStyle;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  bestFor: string;
}

export const CONNECTOR_STYLE_OPTIONS: ConnectorStyleOption[] = [
  {
    id: 'orthogonal',
    label: 'Corners (Orthogonal)',
    shortLabel: 'Corners',
    iconName: 'corner-down-right',
    description: 'Right-angle stepped paths with clean 90° corners',
    bestFor: 'ERD, BPMN, Flowchart, C4, Swimlane, IDEF0, DFD, CEQA',
  },
  {
    id: 'curved',
    label: 'Curved (Bezier)',
    shortLabel: 'Curves',
    iconName: 'spline',
    description: 'Smooth organic cubic bezier curves',
    bestFor: 'Mind Map, Fishbone / Ishikawa, Concept Maps',
  },
  {
    id: 'straight',
    label: 'Straight (Direct)',
    shortLabel: 'Straight',
    iconName: 'minus',
    description: 'Direct straight line connecting nodes',
    bestFor: 'PERT Network, SIPOC, UML Sequence',
  },
];

/**
 * Returns the standard industry-recommended connector style for a given diagram type.
 * e.g. ERD -> orthogonal (corners)
 *      Mind Map -> curved (curves)
 *      PERT -> straight
 */
export function getDefaultConnectorStyleForDiagram(diagramType: DiagramType): ConnectorRoutingStyle {
  switch (diagramType) {
    case 'mindmap':
    case 'fishbone':
      return 'curved';

    case 'pert':
    case 'sipoc':
    case 'uml-sequence':
      return 'straight';

    case 'erd':
    case 'bpmn':
    case 'flowchart':
    case 'swimlane':
    case 'c4':
    case 'idef0':
    case 'dfd':
    case 'yourdon':
    case 'ceqa':
    case 'uml':
    case 'uml-usecase':
    case 'uml-state':
    case 'gantt':
    case 'vsm':
    case 'generic':
    default:
      return 'orthogonal';
  }
}

/**
 * Returns a human-friendly label for the diagram type's default style
 */
export function getDefaultConnectorDescription(diagramType: DiagramType): string {
  const style = getDefaultConnectorStyleForDiagram(diagramType);
  switch (style) {
    case 'curved':
      return 'Curved (standard for Mind Maps)';
    case 'orthogonal':
      return 'Corners (standard for ERD & Flowcharts)';
    case 'straight':
      return 'Straight (standard for PERT & Sequences)';
  }
}
