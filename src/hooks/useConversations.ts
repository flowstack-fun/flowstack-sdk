/**
 * useConversations — fetches the user's past Casino builder conversations
 * from GET /library/conversations. Powers the Sessions sidebar in ChatView.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';

export interface ConversationSummary {
  id: string;
  title: string;
  preview?: string;
  last_message_at?: string | number;
  message_count?: number;
  starred?: boolean;
}

export interface UseConversationsOptions {
  limit?: number;
  includeDeleted?: boolean;
  refreshIntervalMs?: number;
}

export interface UseConversationsReturn {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteConversation: (sessionId: string) => Promise<boolean>;
  renameConversation: (sessionId: string, title: string) => Promise<boolean>;
}

export function useConversations(options?: UseConversationsOptions): UseConversationsReturn {
  const { credentials, config } = useFlowstack();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = config?.baseUrl || 'https://sage-api.flowstack.fun';
  const apiKey = credentials?.apiKey;
  const limit = options?.limit ?? 50;

  const refresh = useCallback(async (): Promise<void> => {
    if (!apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/library/conversations?limit=${limit}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const items: ConversationSummary[] = (data.items || data.conversations || []).map((c: any) => {
        // Title: prefer explicit title, fall back to first_message_preview
        // (trimmed, capped at 60 chars), then last_snippet, then 'Untitled'.
        const rawTitle = c.title?.trim();
        const rawPreview = (c.first_message_preview || c.last_snippet || '').trim();
        const title = rawTitle || (rawPreview ? rawPreview.slice(0, 60) : 'Untitled');
        return {
          id: c.conversation_id || c.id || c.session_id || '',
          title,
          // show the preview text if it differs from the title
          preview: rawPreview && rawPreview !== title ? rawPreview.slice(0, 80) : '',
          last_message_at: c.last_activity_at || c.last_message_at || c.created_at,
          message_count: c.message_count,
          starred: c.starred,
        };
      });
      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, limit]);

  useEffect(() => {
    if (!credentials) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [credentials, refresh]);

  useEffect(() => {
    const interval = options?.refreshIntervalMs ?? 0;
    if (!interval || interval < 1000 || !credentials) return;
    const handle = setInterval(refresh, interval);
    return () => clearInterval(handle);
  }, [credentials, refresh, options?.refreshIntervalMs]);

  const deleteConversation = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!apiKey) return false;
    try {
      const res = await fetch(`${baseUrl}/library/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== sessionId));
        return true;
      }
      return false;
    } catch { return false; }
  }, [apiKey, baseUrl]);

  const renameConversation = useCallback(async (sessionId: string, title: string): Promise<boolean> => {
    if (!apiKey) return false;
    try {
      const res = await fetch(`${baseUrl}/library/conversations/${sessionId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === sessionId ? { ...c, title } : c));
        return true;
      }
      return false;
    } catch { return false; }
  }, [apiKey, baseUrl]);

  return { conversations, isLoading, error, refresh, deleteConversation, renameConversation };
}
