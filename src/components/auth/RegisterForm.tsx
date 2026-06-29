'use client';

/**
 * RegisterForm Component
 *
 * Pre-built registration form with email/password support.
 *
 * @example
 * ```tsx
 * function RegisterPage() {
 *   return (
 *     <RegisterForm
 *       onSuccess={() => router.push('/dashboard')}
 *       showLoginLink
 *       loginHref="/login"
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

export interface RegisterFormProps {
  /** Callback on successful registration */
  onSuccess?: () => void;
  /** Callback on registration error */
  onError?: (error: string) => void;
  /** Show "Login" link */
  showLoginLink?: boolean;
  /** Login page href */
  loginHref?: string;
  /** Minimum password length */
  minPasswordLength?: number;
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
    confirmPassword?: string;
    submit?: string;
    login?: string;
    loading?: string;
  };
}

/**
 * Registration form component
 */
export function RegisterForm({
  onSuccess,
  onError,
  showLoginLink = false,
  loginHref = '/login',
  minPasswordLength = 8,
  className = '',
  inputClassName = '',
  buttonClassName = '',
  labels = {},
}: RegisterFormProps) {
  const { register, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const success = await register(email, password);
      if (success) {
        onSuccess?.();
      } else {
        const errorMsg = authError || 'Registration failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const displayError = error || authError;

  return (
    <form onSubmit={handleSubmit} className={`flowstack-register-form ${className}`}>
      <h2 className="flowstack-register-title">
        {labels.title || 'Create Account'}
      </h2>

      {displayError && (
        <div className="flowstack-register-error" role="alert">
          {displayError}
        </div>
      )}

      <div className="flowstack-register-field">
        <label htmlFor="flowstack-reg-email">
          {labels.email || 'Email'}
        </label>
        <input
          id="flowstack-reg-email"
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

      <div className="flowstack-register-field">
        <label htmlFor="flowstack-reg-password">
          {labels.password || 'Password'}
        </label>
        <input
          id="flowstack-reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${minPasswordLength} characters`}
          disabled={isLoading}
          required
          autoComplete="new-password"
          className={inputClassName}
        />
      </div>

      <div className="flowstack-register-field">
        <label htmlFor="flowstack-reg-confirm">
          {labels.confirmPassword || 'Confirm Password'}
        </label>
        <input
          id="flowstack-reg-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          disabled={isLoading}
          required
          autoComplete="new-password"
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`flowstack-register-button ${buttonClassName}`}
      >
        {isLoading ? (labels.loading || 'Creating account...') : (labels.submit || 'Create Account')}
      </button>

      {showLoginLink && (
        <p className="flowstack-register-login">
          Already have an account?{' '}
          <a href={loginHref}>
            {labels.login || 'Sign In'}
          </a>
        </p>
      )}

      <style>{`
        .flowstack-register-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .flowstack-register-title {
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
          margin: 0 0 1rem 0;
        }
        .flowstack-register-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-register-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-register-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-register-field input {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        .flowstack-register-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-register-button {
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
        .flowstack-register-button:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-register-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-register-login {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-register-login a {
          color: #3b82f6;
          text-decoration: none;
        }
        .flowstack-register-login a:hover {
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
