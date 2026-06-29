'use client';

/**
 * useAutomations — CRUD for agent cron automations (P0-85).
 *
 * Lets built apps create scheduled jobs that run an agent prompt on a
 * cron schedule via AWS EventBridge. Each automation can target specific
 * agent personas, configure output delivery (email, webhook, file, silent),
 * and be paused/resumed without deletion.
 *
 * Schedule format: 5-field Unix cron  "minute hour dom month dow"
 *   "0 9 * * 1-5"   → weekdays at 9 AM
 *   "0 * * * *"     → every hour
 *   "30 8 1 * *"    → 1st of every month at 8:30 AM
 *
 * Usage:
 *   const { automations, create, pause, resume, runNow } = useAutomations();
 *
 *   await create({
 *     name: 'Daily sales digest',
 *     prompt: 'Pull yesterday\'s sales from Shopify, summarize by region, email me.',
 *     schedule: '0 8 * * 1-5',
 *     target_agents: ['shopify_analyst'],
 *     output_config: { type: 'email', to: 'me@company.com' },
 *   });
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutomationOutputType = 'silent' | 'email' | 'webhook' | 'file';
export type AutomationStatus = 'active' | 'paused' | 'error';
export type AutomationRunStatus = 'success' | 'failure' | 'running' | 'timeout';

export interface AutomationOutputConfig {
  /** Where to send results (default: "silent" — stored only) */
  type: AutomationOutputType;
  /** Email address — required when type="email" */
  to?: string;
  /** Webhook URL — required when type="webhook" */
  url?: string;
  /** Custom headers for webhook delivery */
  headers?: Record<string, string>;
  /** Output format for file/email: "csv" | "json" | "pdf" */
  format?: string;
  /** Subject line template for emails */
  subject_template?: string;
}

export interface Automation {
  automation_id: string;
  name: string;
  description: string;
  prompt: string;
  /** 5-field Unix cron expression */
  schedule: string;
  timezone: string;
  /** Agent persona names to route this job to */
  target_agents: string[];
  status: AutomationStatus;
  output_config: AutomationOutputConfig;
  max_runtime_seconds: number;
  retry_on_failure: boolean;
  max_retries: number;
  created_at: number;
  updated_at: number;
  last_run_at: number;
  last_run_status: string;
  run_count: number;
  failure_count: number;
}

export interface AutomationRun {
  automation_id: string;
  run_id: string;
  status: AutomationRunStatus;
  started_at: number;
  completed_at?: number;
  duration_ms: number;
  credits_used: number;
  output_summary: string;
  output_url?: string;
  error_msg?: string;
}

export interface CreateAutomationInput {
  name: string;
  /** What the agent should do each run */
  prompt: string;
  /** 5-field Unix cron, e.g. "0 9 * * 1-5" */
  schedule: string;
  timezone?: string;
  target_agents?: string[];
  output_config?: Partial<AutomationOutputConfig>;
  max_runtime_seconds?: number;
  retry_on_failure?: boolean;
  max_retries?: number;
  description?: string;
}

export interface UpdateAutomationInput {
  name?: string;
  prompt?: string;
  schedule?: string;
  timezone?: string;
  target_agents?: string[];
  output_config?: Partial<AutomationOutputConfig>;
  max_runtime_seconds?: number;
  retry_on_failure?: boolean;
  max_retries?: number;
  description?: string;
}

export interface UseAutomationsReturn {
  automations: Automation[];
  isLoading: boolean;
  error: string | null;
  /** Create a new scheduled automation */
  create: (input: CreateAutomationInput) => Promise<Automation | null>;
  /** Update an existing automation */
  update: (id: string, input: UpdateAutomationInput) => Promise<boolean>;
  /** Delete an automation and its EventBridge rule */
  remove: (id: string) => Promise<boolean>;
  /** Pause scheduling without deleting */
  pause: (id: string) => Promise<boolean>;
  /** Resume a paused automation */
  resume: (id: string) => Promise<boolean>;
  /** Trigger an immediate run (ignores schedule) */
  runNow: (id: string) => Promise<{ invoked: boolean; status_code?: number } | null>;
  /** Get run history for an automation */
  getRuns: (id: string, limit?: number) => Promise<AutomationRun[]>;
  /** Refresh the list */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAutomations(): UseAutomationsReturn {
  const { credentials, config } = useFlowstack();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = (config as any)?.baseUrl || 'https://sage-api.flowstack.fun';
  const creds = credentials as any;

  const headers = (): Record<string, string> => ({
    Authorization: `Bearer ${creds?.apiKey || ''}`,
    'X-Tenant-ID': creds?.tenantId || (config as any)?.tenantId || '',
    'Content-Type': 'application/json',
  });

  const refresh = useCallback(async () => {
    if (!creds?.apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/automations`, { headers: headers() });
      if (!res.ok) { setError(`Failed to load automations (${res.status})`); return; }
      const data = await res.json();
      setAutomations(data.automations ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load automations');
    } finally {
      setIsLoading(false);
    }
  }, [creds?.apiKey, creds?.tenantId, base]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateAutomationInput): Promise<Automation | null> => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/automations`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await refresh();
      return data as Automation;
    } catch { return null; }
  }, [creds?.apiKey, base, refresh]);

  const update = useCallback(async (id: string, input: UpdateAutomationInput): Promise<boolean> => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(input),
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch { return false; }
  }, [creds?.apiKey, base, refresh]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch { return false; }
  }, [creds?.apiKey, base, refresh]);

  const pause = useCallback(async (id: string): Promise<boolean> => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/pause`, {
        method: 'POST',
        headers: headers(),
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch { return false; }
  }, [creds?.apiKey, base, refresh]);

  const resume = useCallback(async (id: string): Promise<boolean> => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/resume`, {
        method: 'POST',
        headers: headers(),
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch { return false; }
  }, [creds?.apiKey, base, refresh]);

  const runNow = useCallback(async (id: string) => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/run`, {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }, [creds?.apiKey, base]);

  const getRuns = useCallback(async (id: string, limit = 20): Promise<AutomationRun[]> => {
    if (!creds?.apiKey) return [];
    try {
      const url = `${base}/automations/${encodeURIComponent(id)}/runs?limit=${limit}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.runs ?? [];
    } catch { return []; }
  }, [creds?.apiKey, base]);

  return { automations, isLoading, error, create, update, remove, pause, resume, runNow, getRuns, refresh };
}
