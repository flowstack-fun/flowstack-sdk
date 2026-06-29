'use client';

/**
 * LoginForm Component
 *
 * Pre-built login form with email/password support.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   return (
 *     <LoginForm
 *       onSuccess={() => router.push('/dashboard')}
 *       showRegisterLink
 *       registerHref="/register"
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

export interface LoginFormProps {
  /** Callback on successful login */
  onSuccess?: () => void;
  /** Callback on login error */
  onError?: (error: string) => void;
  /** Show "Register" link */
  showRegisterLink?: boolean;
  /** Register page href */
  registerHref?: string;
  /** Custom className for form container */
  className?: string;
  /** Custom className for inputs */
  inputClassName?: string;
  /** Custom className for button */
  buttonClassName?: string;
  /** Custom labels */
  labels?: {
    title?: string;
    email?: string;
    password?: string;
    submit?: string;
    register?: string;
    loading?: string;
  };
}

/**
 * Login form component
 */
export function LoginForm({
  onSuccess,
  onError,
  showRegisterLink = false,
  registerHref = '/register',
  className = '',
  inputClassName = '',
  buttonClassName = '',
  labels = {},
}: LoginFormProps) {
  const { login, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        onSuccess?.();
      } else {
        const errorMsg = authError || 'Login failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const displayError = error || authError;

  return (
    <form onSubmit={handleSubmit} className={`flowstack-login-form ${className}`}>
      <h2 className="flowstack-login-title">
        {labels.title || 'Sign In'}
      </h2>

      {displayError && (
        <div className="flowstack-login-error" role="alert">
          {displayError}
        </div>
      )}

      <div className="flowstack-login-field">
        <label htmlFor="flowstack-email">
          {labels.email || 'Email'}
        </label>
        <input
          id="flowstack-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          required
          autoComplete="email"
          className={inputClassName}
        />
      </div>

      <div className="flowstack-login-field">
        <label htmlFor="flowstack-password">
          {labels.password || 'Password'}
        </label>
        <input
          id="flowstack-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          disabled={isLoading}
          required
          autoComplete="current-password"
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`flowstack-login-button ${buttonClassName}`}
      >
        {isLoading ? (labels.loading || 'Signing in...') : (labels.submit || 'Sign In')}
      </button>

      {showRegisterLink && (
        <p className="flowstack-login-register">
          Don&apos;t have an account?{' '}
          <a href={registerHref}>
            {labels.register || 'Register'}
          </a>
        </p>
      )}

      <style>{`
        .flowstack-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .flowstack-login-title {
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
          margin: 0 0 1rem 0;
        }
        .flowstack-login-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-login-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-login-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-login-field input {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        .flowstack-login-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-login-button {
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-login-button:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-login-register {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-login-register a {
          color: #3b82f6;
          text-decoration: none;
        }
        .flowstack-login-register a:hover {
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
