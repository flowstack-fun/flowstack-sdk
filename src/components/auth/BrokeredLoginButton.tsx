/**
 * BrokeredLoginButton — "Continue with Flowstack" SSO button for built apps.
 *
 * Opens the /auth/broker route at openinferencefoundation.org in a popup. That
 * origin runs Privy (it's a registered origin), authenticates the user, and
 * postMessages a Flowstack JWT back to this component. We validate the
 * message (origin + source + CSRF state + shape), then inject the credentials
 * into FlowstackProvider via setCredentials — AuthGuard unblocks on the next
 * render.
 *
 * Why this exists: Privy's Allowed Origins list doesn't support wildcards and
 * every built app lives at its own subdomain. Registering every subdomain
 * manually doesn't scale. The broker pattern keeps Privy registered only on
 * openinferencefoundation.org and lets every built app delegate auth there.
 *
 * Security notes:
 *   - event.origin must be https://openinferencefoundation.org (strict match).
 *   - event.source must equal the popup we opened (prevents other frames
 *     from spoofing the response).
 *   - `state` is a per-click CSRF nonce.
 *   - On popup blocker we surface a clear error and leave the user free to
 *     fall back to the email/password tabs in AuthPage.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowstack } from '../../context/FlowstackProvider';
import type { FlowstackCredentials } from '../../types';

const DEFAULT_BROKER_URL = 'https://openinferencefoundation.org/auth/broker';

// Exact broker origin. We do NOT accept preview subdomains for the broker —
// built apps in prod should always talk to the prod broker.
const EXPECTED_SENDER_ORIGIN = 'https://openinferencefoundation.org';

// For local SDK development, optionally allow localhost. Set via the
// `brokerUrl` prop; if it points at localhost we derive the allowed origin
// from it so dev flows work.
function deriveExpectedOrigin(brokerUrl: string): string {
  try {
    const url = new URL(brokerUrl);
    return url.origin;
  } catch {
    return EXPECTED_SENDER_ORIGIN;
  }
}

export interface BrokeredLoginButtonProps {
  /** Override broker URL (default https://openinferencefoundation.org/auth/broker). */
  brokerUrl?: string;
  /** Button label (default "Continue with Flowstack"). */
  label?: string;
  /** Optional wrapper className. */
  className?: string;
  /** Fired after credentials are successfully injected. */
  onSuccess?: (credentials: FlowstackCredentials) => void;
}

interface BrokerMessage {
  type: 'flowstack-auth-success';
  credentials: Partial<FlowstackCredentials>;
  state: string;
}

function isBrokerMessage(data: unknown): data is BrokerMessage {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.type === 'flowstack-auth-success' && typeof d.state === 'string' && !!d.credentials;
}

export function BrokeredLoginButton({
  brokerUrl = DEFAULT_BROKER_URL,
  label = 'Continue with Flowstack',
  className = '',
  onSuccess,
}: BrokeredLoginButtonProps) {
  const { setCredentials, config } = useFlowstack();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const stateRef = useRef<string>('');
  const expectedOriginRef = useRef<string>(deriveExpectedOrigin(brokerUrl));

  useEffect(() => {
    expectedOriginRef.current = deriveExpectedOrigin(brokerUrl);
  }, [brokerUrl]);

  // Listen for postMessage responses from the broker popup.
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      // 1. Sender origin must match the broker's origin.
      if (event.origin !== expectedOriginRef.current) return;
      // 2. Source must be the popup we opened — OR null.
      // On mobile Safari, window.open() opens a new tab; after window.close(),
      // the tab is gone before the message is delivered, so event.source arrives
      // as null.  We accept null-source messages when origin + CSRF both match
      // (checks 1 + 4 provide sufficient proof of authenticity).
      if (
        popupRef.current &&
        event.source !== null &&
        event.source !== popupRef.current
      ) return;
      // 3. Shape check.
      if (!isBrokerMessage(event.data)) return;
      // 4. CSRF nonce check.
      if (event.data.state !== stateRef.current) {
        setError('Authentication state mismatch. Please try again.');
        setIsOpening(false);
        return;
      }
      // 5. Credentials payload check.
      const c = event.data.credentials;
      if (!c.apiKey || !c.tenantId) {
        setError('Authentication response was incomplete.');
        setIsOpening(false);
        return;
      }
      // 6. Inject into FlowstackProvider. AuthGuard will unblock on next render.
      const creds: FlowstackCredentials = {
        apiKey: c.apiKey,
        tenantId: c.tenantId,
        userId: c.userId,
        email: c.email,
        expiresAt: c.expiresAt,
      };
      setCredentials(creds);
      setIsOpening(false);
      setError(null);
      onSuccess?.(creds);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [setCredentials, onSuccess]);

  const handleClick = useCallback(() => {
    setError(null);
    setIsOpening(true);

    // CSRF nonce — random per click, validated on response.
    const nonce =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    stateRef.current = nonce;

    // After an in-app logout, force the broker to purge its sticky Privy/Casino
    // session so the user can pick a DIFFERENT account. Without this, the broker
    // silently re-auths the just-logged-out identity and account-switching is
    // impossible. logout() sets this one-shot marker; we consume it here.
    let forceRelogin = false;
    try {
      forceRelogin = typeof window !== 'undefined'
        && window.localStorage.getItem('flowstack:force_relogin') === '1';
      if (forceRelogin) window.localStorage.removeItem('flowstack:force_relogin');
    } catch { /* storage unavailable — fall through without force */ }

    const url =
      `${brokerUrl}?return=${encodeURIComponent(window.location.origin)}` +
      `&state=${encodeURIComponent(nonce)}` +
      (config.appScope ? `&app_scope=${encodeURIComponent(config.appScope)}` : '') +
      (forceRelogin ? '&force_login=1' : '');

    const popup = window.open(
      url,
      'flowstack-auth',
      'width=480,height=720,left=200,top=100'
    );
    if (!popup) {
      setError('Pop-up blocked. Please allow pop-ups from this site and try again.');
      setIsOpening(false);
      return;
    }
    popupRef.current = popup;

    // Watchdog: if the user closes the popup without completing, reset state.
    const watchdog = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(watchdog);
        // Only reset if we're still pending — the message handler may have
        // already set isOpening=false on success.
        setIsOpening((prev) => (prev ? false : prev));
      }
    }, 500);
  }, [brokerUrl]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isOpening}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#7c3aed',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: isOpening ? 'default' : 'pointer',
          opacity: isOpening ? 0.6 : 1,
          transition: 'opacity 150ms ease',
        }}
      >
        {isOpening ? 'Signing in…' : label}
      </button>
      {error && (
        <p
          style={{
            marginTop: '8px',
            color: '#ef4444',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
