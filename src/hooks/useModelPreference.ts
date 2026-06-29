/**
 * useModelPreference — User-pinned LLM credential resolution.
 *
 * Wraps the backend `/user/model-preference` routes (P0-95 finale):
 *   GET    /user/model-preference          → current resolved state
 *   PUT    /user/model-preference          → set or clear pinned credential_id
 *   GET    /user/model-preference/options  → platform creds available in tenant pool
 *
 * The Casino Settings → Model tab (`ModelSettingsView`) drives off this hook;
 * the previous SDK shim returned the wrong shape and the page error-boundaried
 * to blank.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { flowstackFetch } from '../api/client';
import type { ModelOption, ModelPreferenceState } from '../types';

export interface UseModelPreferenceReturn {
  preference: ModelPreferenceState | null;
  options: ModelOption[];
  isLoading: boolean;
  error: string | null;
  setPreference: (credentialId: string | null) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PREF_PATH = '/user/model-preference';

export function useModelPreference(): UseModelPreferenceReturn {
  const { credentials: authCredentials, config } = useFlowstack();
  const [preference, setPref] = useState<ModelPreferenceState | null>(null);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const fetchAll = useCallback(async () => {
    if (!authCredentials) return;
    setError(null);
    try {
      const [prefRes, optsRes] = await Promise.all([
        flowstackFetch<ModelPreferenceState>(
          PREF_PATH,
          { credentials: authCredentials },
          clientConfig,
        ),
        flowstackFetch<ModelOption[]>(
          `${PREF_PATH}/options`,
          { credentials: authCredentials },
          clientConfig,
        ),
      ]);
      if (prefRes.ok && prefRes.data) setPref(prefRes.data);
      if (optsRes.ok && optsRes.data) setOptions(Array.isArray(optsRes.data) ? optsRes.data : []);
      if (!prefRes.ok && !optsRes.ok) {
        setError(prefRes.error || optsRes.error || 'Failed to load model preference');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load model preference');
    }
    // ESLint exhaustive-deps complains about clientConfig identity, but it
    // changes whenever config does and that's exactly when we want to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCredentials, clientConfig.baseUrl, clientConfig.tenantId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchAll();
    setIsLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setPreference = useCallback(
    async (credentialId: string | null): Promise<boolean> => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch<ModelPreferenceState>(
          PREF_PATH,
          {
            method: 'PUT',
            credentials: authCredentials,
            body: { credential_id: credentialId },
          },
          clientConfig,
        );
        if (!res.ok) {
          setError(res.error || `Failed to set preference: ${res.status}`);
          return false;
        }
        if (res.data) setPref(res.data);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to set preference');
        return false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId],
  );

  return { preference, options, isLoading, error, setPreference, refresh };
}
