/**
 * Storage utilities for credential and state persistence
 * Supports both localStorage and sessionStorage with user-scoped isolation
 */

import type { FlowstackCredentials } from '../types';

// Storage key constants
const CREDENTIALS_KEY = 'flowstack_credentials';
const WORKSPACE_KEY = 'flowstack_workspace';
const MESSAGES_KEY = 'flowstack_messages';

/**
 * Get the storage adapter (localStorage or sessionStorage)
 * @param type - Storage type ('local' or 'session')
 * @returns Storage object or null if not available
 */
function getStorage(type: 'local' | 'session' = 'local'): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    // Test if storage is accessible
    storage.setItem('__test__', '__test__');
    storage.removeItem('__test__');
    return storage;
  } catch {
    console.warn(`[Storage] ${type}Storage not available`);
    return null;
  }
}

/**
 * Extract user ID from credentials for storage isolation
 * @param credentials - User credentials
 * @returns User-specific storage key prefix
 */
function getUserPrefix(credentials: FlowstackCredentials | null): string {
  if (!credentials?.userId) return '';
  return `${credentials.userId.substring(0, 16)}:`;
}

/**
 * Get user-scoped storage key
 * @param baseKey - Base key name
 * @param credentials - User credentials for scoping
 * @returns Scoped storage key
 */
function getScopedKey(baseKey: string, credentials: FlowstackCredentials | null): string {
  return `${getUserPrefix(credentials)}${baseKey}`;
}

// =============================================================================
// Credentials Storage
// =============================================================================

/**
 * Save credentials to storage
 * @param credentials - Credentials to save
 * @param storageType - Storage type ('local' or 'session')
 */
export function saveCredentials(
  credentials: FlowstackCredentials,
  storageType: 'local' | 'session' = 'local'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    storage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('[Storage] Failed to save credentials:', error);
  }
}

/**
 * Load credentials from storage
 * @param storageType - Storage type ('local' or 'session')
 * @returns Stored credentials or null
 */
export function loadCredentials(
  storageType: 'local' | 'session' = 'local'
): FlowstackCredentials | null {
  const storage = getStorage(storageType);
  if (!storage) return null;

  try {
    const stored = storage.getItem(CREDENTIALS_KEY);
    if (!stored) return null;

    const credentials = JSON.parse(stored) as FlowstackCredentials;

    // Check if expired
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < new Date()) {
        console.log('[Storage] Credentials expired, clearing');
        clearCredentials(storageType);
        return null;
      }
    }

    return credentials;
  } catch (error) {
    console.error('[Storage] Failed to load credentials:', error);
    return null;
  }
}

/**
 * Clear credentials from storage
 * @param storageType - Storage type ('local' or 'session')
 */
export function clearCredentials(storageType: 'local' | 'session' = 'local'): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    storage.removeItem(CREDENTIALS_KEY);
  } catch (error) {
    console.error('[Storage] Failed to clear credentials:', error);
  }
}

// =============================================================================
// Workspace Storage
// =============================================================================

/**
 * Save selected workspace ID to storage
 * @param workspaceId - Workspace ID to save
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
export function saveSelectedWorkspace(
  workspaceId: string,
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'local'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    storage.setItem(key, workspaceId);
  } catch (error) {
    console.error('[Storage] Failed to save workspace:', error);
  }
}

/**
 * Load selected workspace ID from storage
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 * @returns Workspace ID or null
 */
export function loadSelectedWorkspace(
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'local'
): string | null {
  const storage = getStorage(storageType);
  if (!storage) return null;

  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    return storage.getItem(key);
  } catch (error) {
    console.error('[Storage] Failed to load workspace:', error);
    return null;
  }
}

/**
 * Clear selected workspace from storage
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
export function clearSelectedWorkspace(
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'local'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    storage.removeItem(key);
  } catch (error) {
    console.error('[Storage] Failed to clear workspace:', error);
  }
}

// =============================================================================
// Messages Storage (optional persistence)
// =============================================================================

/**
 * Save chat messages to storage
 * @param messages - Messages to save
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
export function saveMessages<T>(
  messages: T[],
  workspaceId: string,
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'session'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    const data = JSON.stringify(messages);
    try {
      storage.setItem(key, data);
    } catch (quotaError) {
      // Storage full — keep only the last 20 messages and retry
      if (messages.length > 20) {
        const trimmed = messages.slice(-20);
        storage.setItem(key, JSON.stringify(trimmed));
      } else {
        // Can't trim further — clear all flowstack storage and retry
        for (let i = storage.length - 1; i >= 0; i--) {
          const k = storage.key(i);
          if (k && k.includes('flowstack')) storage.removeItem(k);
        }
        storage.setItem(key, data);
      }
    }
  } catch (error) {
    // Silently fail — storage is best-effort for the web demo
  }
}

/**
 * Load chat messages from storage
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 * @returns Messages array or empty array
 */
export function loadMessages<T>(
  workspaceId: string,
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'session'
): T[] {
  const storage = getStorage(storageType);
  if (!storage) return [];

  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    const stored = storage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Storage] Failed to load messages:', error);
    return [];
  }
}

/**
 * Clear chat messages from storage
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
export function clearMessages(
  workspaceId: string,
  credentials: FlowstackCredentials | null,
  storageType: 'local' | 'session' = 'session'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    storage.removeItem(key);
  } catch (error) {
    console.error('[Storage] Failed to clear messages:', error);
  }
}

// =============================================================================
// Generic Storage Utilities
// =============================================================================

/**
 * Set an item in storage with optional expiry
 * @param key - Storage key
 * @param value - Value to store
 * @param ttlMs - Time to live in milliseconds (optional)
 * @param storageType - Storage type
 */
export function setItem<T>(
  key: string,
  value: T,
  ttlMs?: number,
  storageType: 'local' | 'session' = 'local'
): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const item = ttlMs
      ? { value, expiresAt: Date.now() + ttlMs }
      : { value };
    storage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`[Storage] Failed to set ${key}:`, error);
  }
}

/**
 * Get an item from storage
 * @param key - Storage key
 * @param storageType - Storage type
 * @returns Stored value or null
 */
export function getItem<T>(
  key: string,
  storageType: 'local' | 'session' = 'local'
): T | null {
  const storage = getStorage(storageType);
  if (!storage) return null;

  try {
    const stored = storage.getItem(key);
    if (!stored) return null;

    const item = JSON.parse(stored) as { value: T; expiresAt?: number };

    // Check expiry
    if (item.expiresAt && Date.now() > item.expiresAt) {
      storage.removeItem(key);
      return null;
    }

    return item.value;
  } catch (error) {
    console.error(`[Storage] Failed to get ${key}:`, error);
    return null;
  }
}

/**
 * Remove an item from storage
 * @param key - Storage key
 * @param storageType - Storage type
 */
export function removeItem(key: string, storageType: 'local' | 'session' = 'local'): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
  }
}

/**
 * Clear all Flowstack-related items from storage. P0-72: also clears
 * `privy:*` keys as a belt-and-suspenders sweep so a logout always leaves
 * a clean slate for the next login attempt — even if Privy's own
 * `logout()` call missed a key. Without this, a Flowstack-only clear
 * left Privy's sticky session in place and silently re-authed the
 * same wallet on the next click.
 * @param storageType - Storage type
 */
export function clearAllFlowstackData(storageType: 'local' | 'session' = 'local'): void {
  const storage = getStorage(storageType);
  if (!storage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith('flowstack_') || key?.startsWith('privy:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  } catch (error) {
    console.error('[Storage] Failed to clear all data:', error);
  }
}
