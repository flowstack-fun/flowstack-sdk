/**
 * useDataOverview — Unified summary of all user-owned data.
 *
 * Fetches workspace artifact counts, site metadata, and MongoDB collection stats.
 * Used by the Casino "My Data" view for the top-level summary cards.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { getUserDataOverview } from '../api/client';
import type { UserDataOverview } from '../types';

export interface UseDataOverviewReturn {
  overview: UserDataOverview | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDataOverview(): UseDataOverviewReturn {
  const { credentials, config } = useFlowstack();
  const [overview, setOverview] = useState<UserDataOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const refresh = useCallback(async () => {
    // Don't leave the skeleton stuck on "LOADING…" if credentials aren't ready
    // yet — clear the loading flag and let the effect re-run once they hydrate
    // (deps include credentials). This is the first-mount stuck-load race.
    if (!credentials) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserDataOverview(credentials, clientConfig);
      if (res.ok && res.data) {
        setOverview(res.data);
      } else {
        setError(res.error || 'Failed to load data overview');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, clientConfig.baseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { overview, isLoading, error, refresh };
}
