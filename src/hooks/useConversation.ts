/**
 * useConversation — fetch the full message history for a specific session.
 *
 * Used by the built-app sidebar when the user clicks a past conversation —
 * we hydrate the chat panel by fetching the S3-backed history via
 * /conversations/{id}/messages and calling restoreConversation on the
 * shared provider so useAgent renders it.
 */

import { useCallback, useEffect, useState } from 'react';

import { useFlowstack } from '../context/FlowstackProvider';

export interface ConversationMessage {
  id?: string;
  role: string;
  content: string | unknown;
  timestamp?: string;
  [key: string]: unknown;
}

async function _fetchMessages(
  credentials: { apiKey: string; [k: string]: unknown },
  sessionId: string,
  opts: { appScope?: string; limit?: number },
  config: { baseUrl?: string; tenantId?: string },
): Promise<{ ok: boolean; data?: { messages: ConversationMessage[] }; error?: string }> {
  const base = config.baseUrl || 'https://sage-api.flowstack.fun';
  const url = new URL(`${base}/conversations/${encodeURIComponent(sessionId)}/messages`);
  url.searchParams.set('limit', String(opts.limit ?? 500));
  if (opts.appScope) url.searchParams.set('app_scope', opts.appScope);
  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'X-Tenant-ID': String((credentials as any).tenantId || config.tenantId || ''),
        'X-User-ID': String((credentials as any).userId || ''),
      },
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data: { messages: data.messages || data.items || [] } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export interface UseConversationReturn {
  messages: ConversationMessage[];
  /** The sessionId these messages belong to — used by ChatView to guard
   *  against painting stale messages from a previous session. */
  forSessionId: string | null | undefined;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversation(sessionId: string | null | undefined): UseConversationReturn {
  const { credentials, config } = useFlowstack();
  const appScope = config.appScope;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!credentials || !sessionId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await _fetchMessages(
        credentials as any,
        sessionId,
        { appScope, limit: 500 },
        { baseUrl: config.baseUrl, tenantId: config.tenantId },
      );
      if (resp.ok && resp.data) {
        setMessages(resp.data.messages || []);
        setResolvedSessionId(sessionId); // confirm messages are for THIS session
      } else {
        setError(resp.error || 'Failed to load conversation');
        setMessages([]);
        setResolvedSessionId(sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, sessionId, appScope, config.baseUrl, config.tenantId]);

  useEffect(() => {
    // Reset resolved ID immediately on sessionId change so ChatView's guard
    // never sees a stale match while the new fetch is in-flight.
    setResolvedSessionId(undefined);
    setMessages([]);
    refresh();
  }, [refresh]);

  return { messages, forSessionId: resolvedSessionId, isLoading, error, refresh };
}
