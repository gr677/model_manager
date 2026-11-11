/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EvaluatedScriptResult {
  expression: string;
  result: number;
  formatted: string;
  timestamp: number;
}

const STORAGE_CACHE_KEY = 'omnimind_script_eval_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

class ScriptEvaluationService {
  private cache: Map<string, EvaluatedScriptResult> = new Map();
  private inFlightRequests: Set<string> = new Set();
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([key, val]: [string, any]) => {
            if (val && typeof val.result === 'number') {
              this.cache.set(key, val);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, EvaluatedScriptResult> = {};
      this.cache.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  private makeKey(workspaceId: string, expression: string): string {
    return `${workspaceId || 'workspace1'}:${expression.trim()}`;
  }

  public isScriptExpression(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    return /^[a-zA-Z0-9_-]+\s*\([\s\S]*\)$/.test(trimmed);
  }

  public getEvaluatedNumber(workspaceId: string, expression: string): number | null {
    const key = this.makeKey(workspaceId, expression);
    const entry = this.cache.get(key);
    if (entry && typeof entry.result === 'number') {
      return entry.result;
    }
    // If not in flight and not cached, enqueue background evaluation
    this.evaluateAsync(workspaceId, expression).catch(() => {});
    return null;
  }

  public getFormattedResult(workspaceId: string, expression: string): string | null {
    const key = this.makeKey(workspaceId, expression);
    const entry = this.cache.get(key);
    if (entry && entry.formatted) {
      return entry.formatted;
    }
    return null;
  }

  public async evaluateAsync(workspaceId: string, expression: string): Promise<number | null> {
    const key = this.makeKey(workspaceId, expression);
    if (this.inFlightRequests.has(key)) return null;

    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.result;
    }

    this.inFlightRequests.add(key);
    try {
      const resp = await fetch(`/api/workspaces/${workspaceId || 'workspace1'}/scripts/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && typeof data.result === 'number') {
          const evalResult: EvaluatedScriptResult = {
            expression,
            result: data.result,
            formatted: data.formatted || `£${data.result.toFixed(2)}`,
            timestamp: Date.now(),
          };
          this.cache.set(key, evalResult);
          this.saveToStorage();
          this.notify();
          return data.result;
        }
      }
    } catch (e) {
      console.warn('[ScriptEvaluationService] Failed to evaluate script:', expression, e);
    } finally {
      this.inFlightRequests.delete(key);
    }
    return null;
  }

  public async evaluateBatch(workspaceId: string, expressions: string[]): Promise<void> {
    const unique = Array.from(new Set(expressions.filter(e => this.isScriptExpression(e))));
    const needed = unique.filter(e => {
      const key = this.makeKey(workspaceId, e);
      const entry = this.cache.get(key);
      return !entry || Date.now() - entry.timestamp > CACHE_TTL_MS;
    });

    if (needed.length === 0) return;

    try {
      const resp = await fetch(`/api/workspaces/${workspaceId || 'workspace1'}/scripts/evaluate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions: needed }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.results) {
          let updated = false;
          Object.entries(data.results).forEach(([expr, resObj]: [string, any]) => {
            if (typeof resObj?.result === 'number') {
              const key = this.makeKey(workspaceId, expr);
              this.cache.set(key, {
                expression: expr,
                result: resObj.result,
                formatted: resObj.formatted || `£${resObj.result.toFixed(2)}`,
                timestamp: Date.now(),
              });
              updated = true;
            }
          });
          if (updated) {
            this.saveToStorage();
            this.notify();
          }
        }
      }
    } catch (e) {
      console.warn('[ScriptEvaluationService] Batch evaluation failed:', e);
    }
  }

  public async refreshAllRates(workspaceId: string): Promise<void> {
    // Clear in-memory cache and re-fetch all expressions
    const keysToRefresh = Array.from(this.cache.keys()).filter(k => k.startsWith(`${workspaceId}:`));
    const expressionsToRefresh = keysToRefresh.map(k => this.cache.get(k)!.expression);
    keysToRefresh.forEach(k => this.cache.delete(k));
    this.saveToStorage();
    this.notify();
    if (expressionsToRefresh.length > 0) {
      await this.evaluateBatch(workspaceId, expressionsToRefresh);
    }
  }
}

export const scriptEvaluationService = new ScriptEvaluationService();
