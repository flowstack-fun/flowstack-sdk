'use client';

/**
 * useAuthGuard Hook
 *
 * Provides auth guard logic without rendering components.
 * Useful for programmatic auth checks in pages/components.
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { isAllowed, isLoading, shouldRedirect } = useAuthGuard({
 *     requireAuth: true,
 *     redirectTo: '/login',
 *   });
 *
 *   useEffect(() => {
 *     if (shouldRedirect) {
 *       router.push('/login');
 *     }
 *   }, [shouldRedirect]);
 *
 *   if (isLoading) return <Loading />;
 *   if (!isAllowed) return null;
 *
 *   return <ProtectedContent />;
 * }
 * ```
 */

import { useState, useEffect, useMemo } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';

export interface AuthGuardOptions {
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  /** Require a workspace to be selected */
  requireWorkspace?: boolean;
  /** URL to redirect to when not authenticated */
  redirectTo?: string;
}

export interface UseAuthGuardReturn {
  /** Whether the user is allowed to access the protected content */
  isAllowed: boolean;
  /** Whether auth state is still being determined */
  isLoading: boolean;
  /** Whether a redirect should occur */
  shouldRedirect: boolean;
  /** The URL to redirect to (if shouldRedirect is true) */
  redirectTo?: string;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether a workspace is selected */
  hasWorkspace: boolean;
}

/**
 * Hook for programmatic auth guard logic
 */
export function useAuthGuard(options: AuthGuardOptions = {}): UseAuthGuardReturn {
  const {
    requireAuth = true,
    requireWorkspace = false,
    redirectTo,
  } = options;

  const {
    isAuthenticated,
    isInitialized,
    selectedWorkspace,
  } = useFlowstack();

  const [shouldRedirect, setShouldRedirect] = useState(false);

  const hasWorkspace = selectedWorkspace !== null;
  const isLoading = !isInitialized;

  // Determine if user is allowed
  const isAllowed = useMemo(() => {
    if (!isInitialized) return false;
    if (requireAuth && !isAuthenticated) return false;
    if (requireWorkspace && !hasWorkspace) return false;
    return true;
  }, [isInitialized, requireAuth, isAuthenticated, requireWorkspace, hasWorkspace]);

  // Determine if redirect should occur
  useEffect(() => {
    if (!isInitialized) return;

    if (requireAuth && !isAuthenticated && redirectTo) {
      setShouldRedirect(true);
    } else {
      setShouldRedirect(false);
    }
  }, [isInitialized, requireAuth, isAuthenticated, redirectTo]);

  return {
    isAllowed,
    isLoading,
    shouldRedirect,
    redirectTo,
    isAuthenticated,
    hasWorkspace,
  };
}
