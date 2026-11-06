/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Collaborator, UserRole } from '../types/diagram';

export interface ActivityEvent {
  id: string;
  user: string;
  userColor: string;
  action: string;
  timestamp: string;
}

export class CollaborationService {
  private collaborators: Collaborator[] = [
    {
      id: 'collab-sarah',
      name: 'Sarah Chen',
      role: 'admin',
      color: '#3b82f6',
      avatar: 'SC',
      activePageId: 'page-bpmn-fulfillment',
      cursorPosition: { x: 380, y: 220 },
      lastAction: 'Auditing BPMN Gateway logic',
      selectedNodeId: 'node-task-verify',
    },
    {
      id: 'collab-alex',
      name: 'Alex Rivera',
      role: 'editor',
      color: '#10b981',
      avatar: 'AR',
      activePageId: 'page-bpmn-fulfillment',
      cursorPosition: { x: 620, y: 400 },
      lastAction: 'Updating sub-process picking routing',
      selectedNodeId: 'node-subprocess-packing',
    },
    {
      id: 'collab-jordan',
      name: 'Jordan Taylor',
      role: 'reviewer',
      color: '#f59e0b',
      avatar: 'JT',
      activePageId: 'page-erd-database',
      cursorPosition: { x: 440, y: 280 },
      lastAction: 'Reviewing foreign key constraints',
    },
    {
      id: 'collab-david',
      name: 'David Kim',
      role: 'editor',
      color: '#8b5cf6',
      avatar: 'DK',
      activePageId: 'page-ceqa-process',
      cursorPosition: { x: 360, y: 160 },
      lastAction: 'Verifying CEQA Phase 2 checklist',
    },
  ];

  private activities: ActivityEvent[] = [
    {
      id: 'act-1',
      user: 'Sarah Chen',
      userColor: '#3b82f6',
      action: 'Created baseline v1.0 release snapshot',
      timestamp: '10 mins ago',
    },
    {
      id: 'act-2',
      user: 'Alex Rivera',
      userColor: '#10b981',
      action: 'Linked Sub-Process to child page',
      timestamp: '5 mins ago',
    },
    {
      id: 'act-3',
      user: 'David Kim',
      userColor: '#8b5cf6',
      action: 'Added indexing note to customers table',
      timestamp: '2 mins ago',
    },
  ];

  private listeners: Array<() => void> = [];
  private animationTimer: number | null = null;

  constructor() {
    this.startCursorSimulation();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getCollaborators(): Collaborator[] {
    return this.collaborators;
  }

  public getActivities(): ActivityEvent[] {
    return this.activities;
  }

  public addActivity(user: string, userColor: string, action: string) {
    this.activities.unshift({
      id: `act-${Date.now()}`,
      user,
      userColor,
      action,
      timestamp: 'Just now',
    });
    if (this.activities.length > 20) {
      this.activities.pop();
    }
    this.notify();
  }

  private startCursorSimulation() {
    if (typeof window === 'undefined') return;

    let tick = 0;
    setInterval(() => {
      tick++;
      // Gently drift simulated collaborator cursors to give alive, real-time feel
      this.collaborators = this.collaborators.map((c, i) => {
        if (!c.cursorPosition) return c;
        const offsetAngle = tick * 0.15 + i * 1.5;
        const dx = Math.sin(offsetAngle) * 35;
        const dy = Math.cos(offsetAngle * 0.8) * 25;
        return {
          ...c,
          cursorPosition: {
            x: Math.max(100, Math.min(1000, c.cursorPosition.x + dx * 0.2)),
            y: Math.max(80, Math.min(600, c.cursorPosition.y + dy * 0.2)),
          },
        };
      });
      this.notify();
    }, 1800);
  }
}

export const collaborationService = new CollaborationService();
