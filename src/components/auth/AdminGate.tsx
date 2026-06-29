'use client';

import React, { useState, useCallback, type ReactNode } from 'react';

export interface AdminGateProps {
  children: ReactNode;
  /** SHA-256 hex hash of the admin password. If omitted, accepts any non-empty password (dev mode). */
  passwordHash?: string;
  /** Fallback content shown when not authenticated as admin */
  fallback?: ReactNode;
  /** localStorage key for session persistence (default: 'flowstack_admin') */
  storageKey?: string;
}

/**
 * Password-based gate for admin routes in Casino-built apps.
 * Persists admin access in localStorage for session duration.
 *
 * Usage:
 *   <AdminGate passwordHash="a1b2c3...">
 *     <AdminPanel />
 *   </AdminGate>
 */
export function AdminGate({
  children,
  passwordHash,
  fallback,
  storageKey = 'flowstack_admin',
}: AdminGateProps) {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;

      if (!passwordHash) {
        // No hash configured — accept any non-empty password (dev/demo mode)
        localStorage.setItem(storageKey, 'true');
        setIsAdmin(true);
        return;
      }

      const data = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex === passwordHash) {
        localStorage.setItem(storageKey, 'true');
        setIsAdmin(true);
      } else {
        setError('Invalid admin password');
      }
    },
    [password, passwordHash, storageKey],
  );

  if (isAdmin) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
      }}
    >
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
          Admin access required
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Enter admin password"
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            marginRight: '8px',
            fontSize: '16px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Enter
        </button>
        {error && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
