'use client';

/**
 * AuthGuard Component
 *
 * Protects routes/components from unauthenticated access.
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   return (
 *     <AuthGuard fallback={<LoginPage />}>
 *       <Dashboard />
 *     </AuthGuard>
 *   );
 * }
 * ```
 */

import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { useFlowstack } from '../../context/FlowstackProvider';
import { BrokeredLoginButton } from './BrokeredLoginButton';

export interface AuthGuardProps {
  /** Protected content */
  children: ReactNode;
  /** Content to show when not authenticated */
  fallback?: ReactNode;
  /** Redirect URL when not authenticated (alternative to fallback) */
  redirectTo?: string;
  /** Show loading state while checking auth */
  loadingComponent?: ReactNode;
  /** Require a specific workspace to be selected */
  requireWorkspace?: boolean;
  /**
   * Opt-in guest chat for built apps (U1). When the app has an `appScope` and
   * the site enabled guest chat server-side (`app_config.allowGuestChat`), an
   * unauthenticated visitor is transparently issued a short-lived guest session
   * (`POST /auth/guest`) instead of being shown the login gate — removing the
   * "sign up to the desk" friction. Per-site control lives entirely in the
   * backend flag: if the site hasn't opted in, `/auth/guest` returns 403 and we
   * fall back to the normal login UI. Default true, but it's a no-op unless the
   * app is built with an `appScope` (the Casino dashboard has none, so it is
   * unaffected and always requires real login).
   */
  allowGuest?: boolean;
}

const Spinner = () => (
  <div className="flowstack-auth-loading">
    <div className="flowstack-auth-spinner" />
    <style>{`
      .flowstack-auth-loading { display: flex; align-items: center; justify-content: center; min-height: 200px; }
      .flowstack-auth-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: flowstack-spin 0.8s linear infinite; }
      @keyframes flowstack-spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

/**
 * Auth guard component
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo,
  loadingComponent,
  requireWorkspace = false,
  allowGuest = true,
}: AuthGuardProps) {
  const {
    isAuthenticated,
    isInitialized,
    selectedWorkspace,
    config,
    setCredentials,
  } = useFlowstack();

  // U1: transparently obtain a guest session for opted-in built apps.
  const appScope = (config as any)?.appScope as string | undefined;
  const baseUrl = ((config as any)?.baseUrl as string | undefined) || 'https://sage-api.flowstack.fun';
  const [guestStatus, setGuestStatus] = useState<'idle' | 'trying' | 'done' | 'failed'>('idle');
  const guestStartedRef = useRef(false);

  useEffect(() => {
    if (!allowGuest || !isInitialized || isAuthenticated || !appScope || guestStartedRef.current) {
      return;
    }
    // Guard with a ref and keep guestStatus OUT of the dep array: calling
    // setGuestStatus('trying') below would otherwise re-run this effect, whose
    // cleanup would cancel the in-flight fetch, so setCredentials never fires and
    // the guard hangs on the loading state. The ref makes this run exactly once.
    guestStartedRef.current = true;
    setGuestStatus('trying');
    fetch(`${baseUrl}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: appScope }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (data?.token) {
          // Promote the guest token to the active session. The app_scope claim
          // matches config.appScope, so it survives the provider's hydration
          // cross-check and persists across refresh until it expires.
          setGuestStatus('done');
          setCredentials({ apiKey: data.token, tenantId: data.tenant_id, userId: data.user_id });
        } else {
          setGuestStatus('failed');
        }
      })
      .catch(() => {
        // 403 (site not opted in) or network error → fall back to login UI.
        setGuestStatus('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowGuest, isInitialized, isAuthenticated, appScope, baseUrl, setCredentials]);

  // Handle redirect — only fires AFTER the user has explicitly dismissed the
  // login UI (or if there is genuinely no fallback). An immediate redirect
  // races the BrokeredLoginButton popup and prevents the user from ever
  // completing auth, which is why built apps redirect to home on first load.
  // We intentionally do NOT redirect here; the fallback below handles login.
  useEffect(() => {
    // Intentionally empty — redirectTo is deprecated for built-app AuthGuard use.
    // Use fallback={<BrokeredLoginButton />} instead.
  }, [isInitialized, isAuthenticated, redirectTo]);

  // Show loading while initializing
  if (!isInitialized) {
    return loadingComponent ? <>{loadingComponent}</> : <Spinner />;
  }

  // U1: guest session being obtained for an opted-in built app — show loading,
  // not the login gate, so the visitor never sees the sign-up wall.
  if (!isAuthenticated && allowGuest && appScope && guestStatus === 'trying') {
    return loadingComponent ? <>{loadingComponent}</> : <Spinner />;
  }

  // Not authenticated — always show a login UI, never redirect immediately.
  // If the caller passed a fallback, use it. If they passed redirectTo (a
  // common LLM-generated pattern), ignore the redirect and show the default
  // BrokeredLoginButton so the user can actually log in.
  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '16px', padding: '32px' }}>
        <p style={{ color: '#6b7280', fontSize: '15px', textAlign: 'center' }}>Sign in to continue</p>
        <BrokeredLoginButton />
      </div>
    );
  }

  // Check workspace requirement
  if (requireWorkspace && !selectedWorkspace) {
    return (
      <div className="flowstack-workspace-required">
        <p>Please select a workspace to continue.</p>
        <style>{`
          .flowstack-workspace-required {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}
