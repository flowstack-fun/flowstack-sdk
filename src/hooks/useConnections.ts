/**
 * useConnections — Manage external service connections (Google, Reddit, Strava, Twitter, GitHub).
 *
 * Provides status, connect, and disconnect for all supported OAuth integrations.
 * Built apps should include a Settings page that renders connection cards
 * so users can link their accounts to enable agent capabilities.
 *
 * Usage:
 *   const { connections, connect, disconnect, refresh, isLoading } = useConnections();
 *
 *   // Check if Google Analytics is connected
 *   connections.google?.analytics // true | false
 *
 *   // Connect Google services
 *   connect('google', ['analytics', 'drive']);
 *
 *   // Disconnect Reddit
 *   disconnect('reddit');
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { flowstackFetch } from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  analytics?: boolean;
  ads?: boolean;
  drive?: boolean;
  youtube?: boolean;
  scopes?: string[];
}

export interface ServiceConnectionStatus {
  connected: boolean;
  username?: string;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface ConnectionsState {
  google: GoogleConnectionStatus;
  reddit: ServiceConnectionStatus;
  strava: ServiceConnectionStatus;
  twitter: ServiceConnectionStatus;
  github: GitHubConnectionStatus;
}

export type GoogleService = 'analytics' | 'ads' | 'drive' | 'youtube' | 'all';
export type ServiceProvider = 'google' | 'reddit' | 'strava' | 'twitter' | 'github';

export interface UseConnectionsReturn {
  /** Current connection status for all services */
  connections: ConnectionsState;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Connect a service — opens OAuth popup/redirect */
  connect: (provider: ServiceProvider, services?: GoogleService[]) => Promise<void>;
  /** Disconnect a service */
  disconnect: (provider: ServiceProvider) => Promise<void>;
  /** Refresh connection status */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: ConnectionsState = {
  google: { connected: false },
  reddit: { connected: false },
  strava: { connected: false },
  twitter: { connected: false },
  github: { connected: false },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConnections(): UseConnectionsReturn {
  const { credentials, config } = useFlowstack();
  const [connections, setConnections] = useState<ConnectionsState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  // Fetch status for all services
  const refresh = useCallback(async () => {
    if (!credentials) return;
    setIsLoading(true);
    setError(null);

    try {
      const [googleRes, redditRes, stravaRes, twitterRes, githubRes] = await Promise.allSettled([
        flowstackFetch<any>('/auth/google/status', { credentials }, clientConfig),
        flowstackFetch<any>('/auth/reddit/status', { credentials }, clientConfig),
        flowstackFetch<any>('/auth/strava/status', { credentials }, clientConfig),
        flowstackFetch<any>('/auth/twitter/status', { credentials }, clientConfig),
        flowstackFetch<any>('/auth/github/status', { credentials }, clientConfig),
      ]);

      const resolveStatus = (res: PromiseSettledResult<any>) =>
        res.status === 'fulfilled' && res.value.ok ? res.value.data : { connected: false };

      setConnections({
        google: resolveStatus(googleRes),
        reddit: resolveStatus(redditRes),
        strava: resolveStatus(stravaRes),
        twitter: resolveStatus(twitterRes),
        github: resolveStatus(githubRes),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch connection status');
    } finally {
      setIsLoading(false);
    }
  }, [credentials, config.baseUrl, config.tenantId]);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Connect a service — opens OAuth in a popup or redirects
  const connect = useCallback(async (provider: ServiceProvider, services?: GoogleService[]) => {
    if (!credentials) throw new Error('Not authenticated');
    setError(null);

    try {
      let startUrl: string;

      if (provider === 'google') {
        const scopes = services?.join(',') || 'all';
        // Strip any leftover google_oauth query params from the URL before using as
        // redirect_uri — a previous failed attempt leaves ?google_oauth=error&... in
        // the URL, which then gets encoded into the next attempt's state, causing the
        // success redirect to append ?google_oauth=success on top of the error params.
        const cleanUrl = (() => {
          const u = new URL(window.location.href);
          ['google_oauth', 'email', 'message'].forEach(p => u.searchParams.delete(p));
          return u.toString();
        })();
        const returnUrl = encodeURIComponent(cleanUrl);
        const res = await flowstackFetch<{ auth_url: string }>(
          `/auth/google/start?scopes=${scopes}&redirect_uri=${returnUrl}`,
          { credentials },
          clientConfig,
        );
        if (!res.ok || !res.data?.auth_url) throw new Error('Failed to start Google OAuth');
        startUrl = res.data.auth_url;
      } else {
        const cleanUrl = (() => {
          const u = new URL(window.location.href);
          ['google_oauth', 'email', 'message'].forEach(p => u.searchParams.delete(p));
          return u.toString();
        })();
        const returnUrl = encodeURIComponent(cleanUrl);
        const res = await flowstackFetch<{ auth_url: string }>(
          `/auth/${provider}/start?redirect_uri=${returnUrl}`,
          { credentials },
          clientConfig,
        );
        if (!res.ok || !res.data?.auth_url) throw new Error(`Failed to start ${provider} OAuth`);
        startUrl = res.data.auth_url;
      }

      // Open OAuth in popup.
      // The backend callback returns an HTML page that postMessages the result back here
      // and calls window.close() — no redirect into the popup that would load the full app.
      const popup = window.open(startUrl, `${provider}_oauth`, 'width=600,height=700,scrollbars=yes');
      if (popup) {
        // Listen for the postMessage from the callback page
        const onMessage = (event: MessageEvent) => {
          if (
            event.data?.type === 'flowstack-google-oauth' ||
            event.data?.type === `flowstack-${provider}-oauth`
          ) {
            window.removeEventListener('message', onMessage);
            clearInterval(fallbackTimer);
            refresh();
          }
        };
        window.addEventListener('message', onMessage);

        // Fallback: if popup closes without postMessage (user closed it manually)
        const fallbackTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(fallbackTimer);
            window.removeEventListener('message', onMessage);
            refresh();
          }
        }, 500);
      } else {
        // Popup blocked — fall back to full-page redirect
        window.location.href = startUrl;
      }
    } catch (err: any) {
      setError(err.message || `Failed to connect ${provider}`);
    }
  }, [credentials, config.baseUrl, config.tenantId, refresh]);

  // Disconnect a service
  const disconnect = useCallback(async (provider: ServiceProvider) => {
    if (!credentials) throw new Error('Not authenticated');
    setError(null);

    try {
      if (provider === 'google') {
        await flowstackFetch('/auth/google/revoke', { method: 'POST', credentials }, clientConfig);
      } else {
        await flowstackFetch(`/auth/${provider}/disconnect`, { method: 'POST', credentials }, clientConfig);
      }
      await refresh();
    } catch (err: any) {
      setError(err.message || `Failed to disconnect ${provider}`);
    }
  }, [credentials, config.baseUrl, config.tenantId, refresh]);

  return { connections, isLoading, error, connect, disconnect, refresh };
}
