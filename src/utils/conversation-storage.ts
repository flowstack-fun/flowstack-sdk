/**
 * Conversation Storage — localStorage helpers for multi-conversation tracking.
 *
 * Paired with the backend casino-conversations-index (P0-14). localStorage
 * holds the LOCAL list so the sidebar can render instantly without a network
 * round-trip; the backend stays the source of truth and overrides the local
 * cache whenever useConversations() refreshes.
 *
 * Keys:
 *   flowstack:session_id:<tenant>:<workspace>            — current sessionId (legacy builder key)
 *   flowstack:session:<appScope>:<userId>                — current sessionId (app-scoped)
 *   flowstack:conversations:<appScope>:<userId>          — JSON list of {id, title, lastMessageAt}
 *
 * Anonymous built-app users fall back to sessionStorage so conversations are
 * tab-scoped and don't leak across devices.
 */

export interface LocalConversationEntry {
  id: string;
  title?: string;
  lastMessageAt?: string;
}

const BUILDER_KEY = 'flowstack:session:builder';

export function makeSessionStorageKey(
  appScope: string | undefined,
  userId: string | undefined,
): string {
  if (appScope && userId) return `flowstack:session:${appScope}:${userId}`;
  if (appScope) return `flowstack:session:${appScope}:anon`;
  return BUILDER_KEY;
}

export function makeConversationListKey(
  appScope: string | undefined,
  userId: string | undefined,
): string {
  if (appScope && userId) return `flowstack:conversations:${appScope}:${userId}`;
  if (appScope) return `flowstack:conversations:${appScope}:anon`;
  return 'flowstack:conversations:builder';
}

/**
 * Pick the right storage backend. Anonymous users (no wallet/user id) get
 * sessionStorage so their chats don't persist beyond the tab — matches the
 * demo-tier privacy story in the BRD.
 */
function storageFor(appScope: string | undefined, userId: string | undefined): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    if (appScope && !userId) return window.sessionStorage;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCurrentSessionId(
  appScope: string | undefined,
  userId: string | undefined,
): string | null {
  const store = storageFor(appScope, userId);
  if (!store) return null;
  try {
    return store.getItem(makeSessionStorageKey(appScope, userId));
  } catch {
    return null;
  }
}

export function writeCurrentSessionId(
  sessionId: string,
  appScope: string | undefined,
  userId: string | undefined,
): void {
  const store = storageFor(appScope, userId);
  if (!store) return;
  try {
    store.setItem(makeSessionStorageKey(appScope, userId), sessionId);
  } catch {
    // quota / disabled — swallow
  }
}

export function clearCurrentSessionId(
  appScope: string | undefined,
  userId: string | undefined,
): void {
  const store = storageFor(appScope, userId);
  if (!store) return;
  try {
    store.removeItem(makeSessionStorageKey(appScope, userId));
  } catch {
    // swallow
  }
}

export function readConversationList(
  appScope: string | undefined,
  userId: string | undefined,
): LocalConversationEntry[] {
  const store = storageFor(appScope, userId);
  if (!store) return [];
  try {
    const raw = store.getItem(makeConversationListKey(appScope, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is LocalConversationEntry => typeof e?.id === 'string',
    );
  } catch {
    return [];
  }
}

export function writeConversationList(
  entries: LocalConversationEntry[],
  appScope: string | undefined,
  userId: string | undefined,
): void {
  const store = storageFor(appScope, userId);
  if (!store) return;
  try {
    // Cap local cache size — full state lives in the backend index
    const capped = entries.slice(0, 100);
    store.setItem(
      makeConversationListKey(appScope, userId),
      JSON.stringify(capped),
    );
  } catch {
    // swallow
  }
}

/**
 * Append (or move to top) a conversation in the local list. Idempotent —
 * recording the same id twice just bumps its lastMessageAt timestamp.
 */
export function upsertLocalConversation(
  entry: LocalConversationEntry,
  appScope: string | undefined,
  userId: string | undefined,
): void {
  const list = readConversationList(appScope, userId);
  const without = list.filter(e => e.id !== entry.id);
  without.unshift({
    id: entry.id,
    title: entry.title,
    lastMessageAt: entry.lastMessageAt ?? new Date().toISOString(),
  });
  writeConversationList(without, appScope, userId);
}

export function removeLocalConversation(
  id: string,
  appScope: string | undefined,
  userId: string | undefined,
): void {
  const list = readConversationList(appScope, userId);
  writeConversationList(
    list.filter(e => e.id !== id),
    appScope,
    userId,
  );
}
