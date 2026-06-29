/**
 * useProviderCredentials — Manage LLM provider credentials (BYOK + Ollama).
 *
 * Wraps the /api/v1/user/provider-credentials backend endpoints.
 * Used by the Casino "Models" settings tab to list, create, and delete
 * provider credentials including Ollama local inference.
 *
 * Usage:
 *   const { credentials, purposes, createCredential, deleteCredential, isLoading } = useProviderCredentials();
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { flowstackFetch } from '../api/client';
import type { ProviderCredential, PurposeInfo, LLMProvider, ProviderModelSettings } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCredentialParams {
  provider: LLMProvider;
  api_key?: string;
  host?: string;
  model_id?: string;
  purpose?: string;
  is_default?: boolean;
  model_settings?: ProviderModelSettings;
}

export interface UseProviderCredentialsReturn {
  credentials: ProviderCredential[];
  purposes: PurposeInfo[];
  createCredential: (params: CreateCredentialParams) => Promise<ProviderCredential>;
  deleteCredential: (credentialId: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const CRED_PATH = '/api/v1/user/provider-credentials';

export function useProviderCredentials(): UseProviderCredentialsReturn {
  const { credentials: authCredentials, config } = useFlowstack();
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [purposes, setPurposes] = useState<PurposeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const fetchCredentials = useCallback(async () => {
    if (!authCredentials) return;
    try {
      const res = await flowstackFetch<ProviderCredential[]>(
        CRED_PATH,
        { credentials: authCredentials },
        clientConfig,
      );
      if (res.ok && res.data) {
        setCredentials(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [authCredentials, clientConfig.baseUrl]);

  const fetchPurposes = useCallback(async () => {
    if (!authCredentials) return;
    try {
      const res = await flowstackFetch<PurposeInfo[]>(
        `${CRED_PATH}/purposes`,
        { credentials: authCredentials },
        clientConfig,
      );
      if (res.ok && res.data) {
        setPurposes(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Non-critical
    }
  }, [authCredentials, clientConfig.baseUrl]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchCredentials(), fetchPurposes()]);
    setIsLoading(false);
  }, [fetchCredentials, fetchPurposes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCredential = useCallback(async (params: CreateCredentialParams): Promise<ProviderCredential> => {
    if (!authCredentials) throw new Error('Not authenticated');
    const res = await flowstackFetch<ProviderCredential>(
      CRED_PATH,
      {
        method: 'POST',
        credentials: authCredentials,
        body: params,
      },
      clientConfig,
    );
    if (!res.ok) {
      throw new Error(res.error || `Failed to create credential: ${res.status}`);
    }
    await fetchCredentials();
    return res.data!;
  }, [authCredentials, clientConfig.baseUrl, fetchCredentials]);

  const deleteCredential = useCallback(async (credentialId: string): Promise<void> => {
    if (!authCredentials) throw new Error('Not authenticated');
    const res = await flowstackFetch(
      `${CRED_PATH}/${credentialId}`,
      {
        method: 'DELETE',
        credentials: authCredentials,
      },
      clientConfig,
    );
    if (!res.ok) {
      throw new Error(res.error || `Failed to delete credential: ${res.status}`);
    }
    await fetchCredentials();
  }, [authCredentials, clientConfig.baseUrl, fetchCredentials]);

  return {
    credentials,
    purposes,
    createCredential,
    deleteCredential,
    refresh,
    isLoading,
    error,
  };
}
