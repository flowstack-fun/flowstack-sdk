'use client';

/**
 * useIntegrations — CRUD for HTTP API integrations (P0-79).
 *
 * Lets built apps register any HTTPS REST API as a named integration that
 * the agent can call as a tool. Credentials are encrypted at rest by the
 * backend; the frontend never receives raw secrets after creation.
 *
 * Usage:
 *   const { integrations, create, update, remove, isLoading } = useIntegrations();
 *
 *   // Register a new API
 *   await create({
 *     name: 'Shopify',
 *     description: 'Shopify Admin API for order management',
 *     base_url: 'https://my-store.myshopify.com/admin/api/2024-01',
 *     auth_type: 'bearer',
 *     auth_config: { token: 'shpat_xxx' },
 *     endpoints: [
 *       { name: 'list_orders', method: 'GET', path: '/orders.json' },
 *       { name: 'get_order',   method: 'GET', path: '/orders/{id}.json' },
 *     ],
 *   });
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntegrationAuthType =
  | 'bearer'
  | 'api_key_header'
  | 'api_key_query'
  | 'basic'
  | 'none';

export interface IntegrationEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface Integration {
  integration_id: string;
  name: string;
  description: string;
  base_url: string;
  auth_type: IntegrationAuthType;
  /** Redacted preview — raw secrets are never returned after creation */
  auth_preview?: Record<string, unknown>;
  endpoint_count: number;
  endpoints?: IntegrationEndpoint[];
  workspace_id?: string;
  created_at: number;
  updated_at?: number;
}

export interface CreateIntegrationInput {
  name: string;
  /** 20–300 chars */
  description: string;
  /** HTTPS base URL, e.g. "https://api.stripe.com/v1" */
  base_url: string;
  auth_type?: IntegrationAuthType;
  /** Credentials — encrypted at rest, never returned after save */
  auth_config?: Record<string, unknown>;
  endpoints?: IntegrationEndpoint[];
  workspace_id?: string;
}

export interface UpdateIntegrationInput {
  name?: string;
  description?: string;
  base_url?: string;
  auth_config?: Record<string, unknown>;
  endpoints?: IntegrationEndpoint[];
}

export interface UseIntegrationsReturn {
  integrations: Integration[];
  isLoading: boolean;
  error: string | null;
  /** Create and register a new HTTP API integration */
  create: (input: CreateIntegrationInput) => Promise<Integration | null>;
  /** Update an existing integration */
  update: (id: string, input: UpdateIntegrationInput) => Promise<boolean>;
  /** Delete an integration */
  remove: (id: string) => Promise<boolean>;
  /** Get a single integration with full endpoint details */
  get: (id: string) => Promise<Integration | null>;
  /** Refresh the list */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIntegrations(): UseIntegrationsReturn {
  const { credentials, config } = useFlowstack();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
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
      const res = await fetch(`${base}/integrations`, { headers: headers() });
      if (!res.ok) { setError(`Failed to load integrations (${res.status})`); return; }
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  }, [creds?.apiKey, creds?.tenantId, base]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateIntegrationInput): Promise<Integration | null> => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/integrations`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await refresh();
      return data as Integration;
    } catch { return null; }
  }, [creds?.apiKey, base, refresh]);

  const update = useCallback(async (id: string, input: UpdateIntegrationInput): Promise<boolean> => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, {
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
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch { return false; }
  }, [creds?.apiKey, base, refresh]);

  const get = useCallback(async (id: string): Promise<Integration | null> => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, { headers: headers() });
      if (!res.ok) return null;
      return await res.json() as Integration;
    } catch { return null; }
  }, [creds?.apiKey, base]);

  return { integrations, isLoading, error, create, update, remove, get, refresh };
}
