'use client';

/**
 * GoogleSignIn Component
 *
 * Google OAuth sign-in button.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   return (
 *     <div>
 *       <LoginForm />
 *       <GoogleSignIn onSuccess={() => router.push('/dashboard')} />
 *     </div>
 *   );
 * }
 * ```
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export interface GoogleSignInProps {
  /** Callback on successful sign-in */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Custom className */
  className?: string;
  /** Button text */
  label?: string;
}

/**
 * Google OAuth sign-in button
 */
export function GoogleSignIn({
  onSuccess,
  onError,
  className = '',
  label = 'Continue with Google',
}: GoogleSignInProps) {
  const { googleSignIn, isLoading, error } = useAuth();

  const handleClick = async () => {
    try {
      await googleSignIn();
      // Note: actual success happens after OAuth redirect
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      onError?.(errorMsg);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`flowstack-google-button ${className}`}
    >
      <svg
        className="flowstack-google-icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span>{isLoading ? 'Loading...' : label}</span>

      {error && (
        <span className="flowstack-google-error">{error}</span>
      )}

      <style>{`
        .flowstack-google-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .flowstack-google-button:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .flowstack-google-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-google-icon {
          flex-shrink: 0;
        }
        .flowstack-google-error {
          display: block;
          width: 100%;
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
      `}</style>
    </button>
  );
}
