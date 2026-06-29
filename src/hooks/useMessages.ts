/**
 * useMessages — read + send private messages in one thread (P0-138).
 *
 * Mirrors `useCollection`'s ergonomics but is backed by the server-owned, ACL'd
 * DM endpoints instead of a Mongo collection. The backend pins the sender to the
 * caller's identity and only delivers into a mutually-consented (open) thread, so
 * a `send()` to a not-yet-open thread returns an error.
 *
 * SECURITY: message bodies are UNTRUSTED user input. Render them as plain text or
 * sanitized markdown — never as raw HTML (no dangerouslySetInnerHTML). If a body
 * is ever fed to an agent, treat it as data, not instructions.
 *
 * Usage:
 *   const { messages, send, isLoading, refresh } = useMessages(counterpartUserKey, {
 *     refreshInterval: 4000,
 *   });
 *   await send('hey there');
 *   messages.map(m => <Bubble key={m.message_id} mine={m.from === myKey}>{m.body}</Bubble>)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { listMessages, sendMessage } from '../api/client';
import type { DmMessage } from '../api/client';

export interface UseMessagesOptions {
  /** Max messages to load (default 50, max 200). */
  limit?: number;
  /** Auto-poll interval in ms (optional — no polling by default). */
  refreshInterval?: number;
  /** Skip initial fetch (e.g. before a counterpart is selected). */
  enabled?: boolean;
}

export interface UseMessagesReturn {
  messages: DmMessage[];
  isLoading: boolean;
  error: string | null;
  /** Send a message to the counterpart. Refetches on success. */
  send: (body: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMessages(
  withUserKey: string | null | undefined,
  options?: UseMessagesOptions,
): UseMessagesReturn {
  const { credentials, config } = useFlowstack();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled !== false && !!withUserKey;
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope,
  };

  const refresh = useCallback(async () => {
    if (!credentials || !withUserKey || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMessages(
        credentials,
        withUserKey,
        { limit: options?.limit },
        clientConfig,
      );
      if (res.ok && res.data) {
        setMessages(res.data.messages);
      } else {
        setError(res.error || 'Failed to load messages');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, withUserKey, config.baseUrl, config.tenantId, config.appScope, enabled, options?.limit]);

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

  const send = useCallback(
    async (body: string) => {
      if (!credentials) throw new Error('Not authenticated');
      if (!withUserKey) throw new Error('No counterpart selected');
      if (!body || !body.trim()) return;
      setError(null);
      const res = await sendMessage(credentials, withUserKey, body, clientConfig);
      if (!res.ok) {
        const msg = res.error || 'Failed to send message';
        setError(msg);
        throw new Error(msg);
      }
      await refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [credentials, withUserKey, config.baseUrl, config.tenantId, config.appScope, refresh],
  );

  return { messages, isLoading, error, send, refresh };
}
