/**
 * useThreads — list a built-app user's private message threads (P0-138).
 *
 * Backed by the server-owned, ACL'd DM store: the backend only ever returns
 * threads the authenticated caller participates in. Each thread carries the
 * counterpart's user key, the last message, and an unread count.
 *
 * Private messaging is a built-app capability — requires an `appScope` on the
 * FlowstackProvider config. In a Casino personal session the backend returns 403
 * and this hook surfaces an error.
 *
 * Usage:
 *   const { threads, isLoading, refresh } = useThreads({ refreshInterval: 5000 });
 *   threads.map(t => <ThreadRow key={t.pair_key} counterpart={t.with_user_key} ... />)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { listThreads, openThread as openThreadApi } from '../api/client';
import type { DmThread } from '../api/client';

export interface UseThreadsOptions {
  /** Auto-poll interval in ms (optional — no polling by default). */
  refreshInterval?: number;
  /** Skip initial fetch. */
  enabled?: boolean;
}

export interface UseThreadsReturn {
  threads: DmThread[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * Record the caller's consent to open a thread with `withUserKey`. The thread
   * becomes sendable only once BOTH parties have consented. Idempotent per caller;
   * refetches the thread list on success. Returns the resulting status.
   */
  openThread: (withUserKey: string) => Promise<'pending' | 'open' | null>;
}

export function useThreads(options?: UseThreadsOptions): UseThreadsReturn {
  const { credentials, config } = useFlowstack();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled !== false;
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope,
  };

  const refresh = useCallback(async () => {
    if (!credentials || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listThreads(credentials, clientConfig);
      if (res.ok && res.data) {
        setThreads(res.data.threads);
      } else {
        setError(res.error || 'Failed to load threads');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load threads');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, config.baseUrl, config.tenantId, config.appScope, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Optional polling
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    intervalRef.current = setInterval(refresh, options.refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [options?.refreshInterval, enabled, refresh]);

  const openThread = useCallback(
    async (withUserKey: string): Promise<'pending' | 'open' | null> => {
      if (!credentials || !withUserKey) return null;
      const res = await openThreadApi(credentials, withUserKey, clientConfig);
      if (res.ok && res.data) {
        await refresh();
        return res.data.status as 'pending' | 'open';
      }
      setError(res.error || 'Failed to open thread');
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [credentials, config.baseUrl, config.tenantId, config.appScope, refresh],
  );

  return { threads, isLoading, error, refresh, openThread };
}
