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
  private collaborators: Collaborator[] = [];

  private activities: ActivityEvent[] = [];

  private listeners: Array<() => void> = [];

  constructor() {}

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
}

export const collaborationService = new CollaborationService();
