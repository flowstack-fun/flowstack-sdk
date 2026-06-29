'use client';

/**
 * useAuth Hook
 *
 * Provides authentication functionality including login, register, and Google OAuth.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { login, isLoading, error } = useAuth();
 *
 *   const handleLogin = async (email: string, password: string) => {
 *     const success = await login(email, password);
 *     if (success) router.push('/dashboard');
 *   };
 * }
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseAuthReturn, FlowstackCredentials, User } from '../types';
import { login as apiLogin, register as apiRegister } from '../api/client';
import { mockCredentials, mockDelay } from '../mock/fixtures';

/**
 * Hook for authentication operations
 */
export function useAuth(): UseAuthReturn {
  const {
    credentials,
    setCredentials,
    isAuthenticated,
    logout: contextLogout,
    config,
  } = useFlowstack();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope,
  };

  const isMockMode = config.mode === 'mock';

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock mode - return mock credentials without API call
      if (isMockMode) {
        await mockDelay(200, 600);
        const newCredentials: FlowstackCredentials = {
          ...mockCredentials,
          email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        setCredentials(newCredentials);
        return true;
      }

      const response = await apiLogin(email, password, clientConfig);

      if (response.ok && response.data) {
        const { session_token, user_id, access_token } = response.data;

        const newCredentials: FlowstackCredentials = {
          apiKey: access_token || session_token,
          // setCredentials derives tenant from the JWT; config is just a fallback.
          tenantId: config.tenantId || '',
          userId: user_id,
          email,
        };

        setCredentials(newCredentials);
        return true;
      }

      setError(response.error || 'Login failed');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config.tenantId, setCredentials, clientConfig, isMockMode]);

  /**
   * Register a new user
   */
  const register = useCallback(async (
    email: string,
    password: string,
    _name?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock mode - simulate registration then auto-login
      if (isMockMode) {
        await mockDelay(300, 800);
        // Auto-login after mock registration
        return await login(email, password);
      }

      const response = await apiRegister(email, password, clientConfig);

      if (response.ok && response.data) {
        // Use session token from registration directly if available
        if (response.data.session_token) {
          const newCredentials: FlowstackCredentials = {
            apiKey: response.data.session_token,
            // setCredentials derives tenant from the JWT; server/config are fallbacks.
            tenantId: response.data.tenant_id || config.tenantId || '',
            userId: response.data.user_id,
            email,
          };
          setCredentials(newCredentials);
          return true;
        }
        // Fall back to login if registration didn't return a token
        if (response.data.user_id) {
          return await login(email, password);
        }
        return true;
      }

      setError(response.error || 'Registration failed');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login, clientConfig, isMockMode]);

  /**
   * Initiate Google OAuth sign-in
   */
  const googleSignIn = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Redirect to Google OAuth endpoint
      // The actual implementation depends on server-side route
      const googleClientId = config.auth?.googleClientId;
      if (!googleClientId) {
        throw new Error('Google OAuth not configured');
      }

      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const scope = 'openid email profile';
      const state = crypto.randomUUID();

      // Store state for CSRF protection
      sessionStorage.setItem('google_oauth_state', state);

      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      setIsLoading(false);
    }
  }, [config.auth?.googleClientId]);

  /**
   * Logout and clear credentials
   */
  const logout = useCallback(() => {
    setError(null);
    contextLogout();
  }, [contextLogout]);

  /**
   * Refresh token if needed
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!credentials) return false;

    // Check if token is expired or expiring soon
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now < expiresAt - fiveMinutes) {
        // Token still valid
        return true;
      }
    }

    // Token refresh would require server-side session refresh endpoint
    // For now, return true if we have valid credentials
    return !!credentials.apiKey;
  }, [credentials]);

  // Derive user from credentials
  const user: User | null = useMemo(() => {
    if (!credentials) return null;
    return {
      id: credentials.userId || '',
      email: credentials.email || '',
      tenantId: credentials.tenantId,
      expiresAt: credentials.expiresAt,
    };
  }, [credentials]);

  return {
    user,
    credentials,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    googleSignIn,
    logout,
    refreshToken,
  };
}
