'use client';

/**
 * useSubagents — fetches the library of user-defined subagent definitions.
 *
 * Calls GET /library/agents on the backend and splits the result into
 * `builtin` (source=builtin) and `userDefined` (source=user or mcp) lists.
 * Also provides uploadSubagent / deleteSubagent for the AgentsTab CRUD UI.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { FlowstackClientConfig } from '../api/client';

// Shape returned by GET /library/agents
export interface SubagentSummary {
  id: string;
  name: string;
  description: string;
  source?: string;
  /** kept for legacy compat (AgentsTab checks this) */
  created_by?: string;
  created_at?: string;
  site_id?: string;
}

// Full definition returned by GET /library/agents/{name}
export interface SubagentDefinition extends SubagentSummary {
  system_prompt?: string;
  /** @deprecated use system_prompt — kept for compat */
  systemPrompt?: string;
  tools?: string[];
  model?: string;
  max_turns?: number;
  max_cost_usd?: number;
}

export interface UseSubagentsReturn {
  subagents: SubagentSummary[];
  builtin: SubagentSummary[];
  userDefined: SubagentSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  uploadSubagent: (file: File) => Promise<SubagentDefinition | null>;
  deleteSubagent: (name: string) => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _authedFetch(
  method: string,
  path: string,
  credentials: any,
  config: FlowstackClientConfig,
  body?: unknown,
): Promise<Response> {
  const base = config.baseUrl || 'https://sage-api.flowstack.fun';
  const url = new URL(`${base}${path}`);
  if (method === 'GET' && credentials.userId) {
    url.searchParams.set('user_id', credentials.userId);
  }
  return fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'X-Tenant-ID': String(credentials.tenantId ?? ''),
      'X-User-ID': String(credentials.userId ?? ''),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export function useSubagents(): UseSubagentsReturn {
  const ctx = useFlowstackOptional();
  const [subagents, setSubagents] = useState<SubagentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creds = useMemo(() => ({
    apiKey: (ctx?.credentials as any)?.apiKey || '',
    tenantId: (ctx?.credentials as any)?.tenantId || ctx?.config?.tenantId || '',
    userId: (ctx?.credentials as any)?.userId || '',
  }), [ctx?.credentials, ctx?.config?.tenantId]);

  const clientConfig = useMemo(
    () => ({ baseUrl: ctx?.config?.baseUrl, tenantId: ctx?.config?.tenantId }),
    [ctx?.config?.baseUrl, ctx?.config?.tenantId],
  );

  const fetch_ = useCallback(async () => {
    if (!creds.apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await _authedFetch('GET', '/library/agents', creds, clientConfig);
      if (!resp.ok) {
        setError(`Failed to load agents (${resp.status})`);
        return;
      }
      const data = await resp.json();
      setSubagents(data.agents ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const uploadSubagent = useCallback(async (file: File): Promise<SubagentDefinition | null> => {
    if (!creds.apiKey) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const base = clientConfig.baseUrl || 'https://sage-api.flowstack.fun';
      const resp = await fetch(`${base}/library/agents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'X-Tenant-ID': creds.tenantId,
          'X-User-ID': creds.userId,
        },
        body: formData,
      });
      if (!resp.ok) return null;
      const result = await resp.json();
      fetch_(); // refresh list
      return result;
    } catch {
      return null;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl, fetch_]);

  const deleteSubagent = useCallback(async (name: string): Promise<boolean> => {
    if (!creds.apiKey) return false;
    try {
      const resp = await _authedFetch('DELETE', `/library/agents/${encodeURIComponent(name)}`, creds, clientConfig);
      if (resp.ok) fetch_();
      return resp.ok;
    } catch {
      return false;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl, fetch_]);

  const builtin = useMemo(
    () => subagents.filter(a => a.source === 'builtin'),
    [subagents],
  );
  const userDefined = useMemo(
    () => subagents.filter(a => a.source !== 'builtin'),
    [subagents],
  );

  return { subagents, builtin, userDefined, isLoading, error, refresh: fetch_, uploadSubagent, deleteSubagent };
}

/** Fetch full agent definition from GET /library/agents/{name} */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSubagent(
  credentials: any,
  name: string,
  config?: FlowstackClientConfig,
): Promise<{ ok: boolean; data?: SubagentDefinition; error?: string }> {
  try {
    const resp = await _authedFetch('GET', `/library/agents/${encodeURIComponent(name)}`, credentials, config ?? {});
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
