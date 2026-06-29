'use client';

/**
 * AuthPage Component
 *
 * A complete authentication page with login/register tabs.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   return (
 *     <AuthPage
 *       defaultTab="login"
 *       onSuccess={() => router.push('/dashboard')}
 *       logo={<MyLogo />}
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, ReactNode } from 'react';
import { LoginForm, RegisterForm, GoogleSignIn, BrokeredLoginButton } from '../auth';
import { useFlowstack } from '../../context/FlowstackProvider';

export interface AuthPageProps {
  /** Default tab to show */
  defaultTab?: 'login' | 'register';
  /** Callback when authentication succeeds */
  onSuccess?: () => void;
  /** Callback when authentication fails */
  onError?: (error: string) => void;
  /** Custom logo component */
  logo?: ReactNode;
  /** Page title */
  title?: string;
  /** Show Google Sign In button */
  showGoogle?: boolean;
  /**
   * Show the "Continue with Flowstack" brokered-login button as the primary
   * CTA (P0-60). Defaults to true — this is the unified-login path for built
   * apps. Casino itself should pass `false` to avoid opening a broker popup
   * from the same origin that hosts the broker.
   */
  showFlowstackBroker?: boolean;
  /**
   * Override the broker URL (default https://openinferencefoundation.org/auth/broker).
   * Useful for staging or local development.
   */
  brokerUrl?: string;
  /** Custom footer content */
  footer?: ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Custom styles for the container */
  containerClassName?: string;
  /** Custom styles for the card */
  cardClassName?: string;
}

/**
 * Complete authentication page component
 */
export function AuthPage({
  defaultTab = 'login',
  onSuccess,
  onError,
  logo,
  title,
  showGoogle = false,
  showFlowstackBroker = true,
  brokerUrl,
  footer,
  className = '',
  containerClassName = '',
  cardClassName = '',
}: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const { config } = useFlowstack();

  const hasGoogle = showGoogle && config.auth?.providers?.includes('google');

  return (
    <div className={`flowstack-auth-page ${className}`}>
      <div className={`flowstack-auth-container ${containerClassName}`}>
        <div className={`flowstack-auth-card ${cardClassName}`}>
          {/* Logo */}
          {logo && <div className="flowstack-auth-logo">{logo}</div>}

          {/* Title */}
          <h1 className="flowstack-auth-title">
            {title || (activeTab === 'login' ? 'Welcome back' : 'Create account')}
          </h1>

          {/* P0-60: Continue with Flowstack (brokered SSO) — primary CTA.
              Lets users reuse their Casino identity + wallet in any built app. */}
          {showFlowstackBroker && (
            <>
              <div className="flowstack-auth-broker">
                <BrokeredLoginButton
                  brokerUrl={brokerUrl}
                  onSuccess={() => onSuccess?.()}
                />
              </div>
              <div className="flowstack-auth-divider">
                <span>or sign in with email</span>
              </div>
            </>
          )}

          {/* Tabs */}
          <div className="flowstack-auth-tabs">
            <button
              type="button"
              className={`flowstack-auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flowstack-auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Sign Up
            </button>
          </div>

          {/* Forms */}
          <div className="flowstack-auth-form-container">
            {activeTab === 'login' ? (
              <LoginForm
                onSuccess={onSuccess}
                onError={onError}
                showRegisterLink={false}
              />
            ) : (
              <RegisterForm
                onSuccess={onSuccess}
                onError={onError}
                showLoginLink={false}
              />
            )}
          </div>

          {/* Divider */}
          {hasGoogle && (
            <div className="flowstack-auth-divider">
              <span>or</span>
            </div>
          )}

          {/* Google Sign In */}
          {hasGoogle && (
            <div className="flowstack-auth-social">
              <GoogleSignIn onSuccess={onSuccess} onError={onError} />
            </div>
          )}

          {/* Footer */}
          {footer && <div className="flowstack-auth-footer">{footer}</div>}
        </div>
      </div>

      <style>{`
        .flowstack-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          padding: 20px;
        }

        .flowstack-auth-container {
          width: 100%;
          max-width: 420px;
        }

        .flowstack-auth-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          padding: 40px;
        }

        .flowstack-auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .flowstack-auth-title {
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          color: #1a1a1a;
          margin: 0 0 24px 0;
        }

        .flowstack-auth-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: #f5f5f5;
          padding: 4px;
          border-radius: 8px;
        }

        .flowstack-auth-tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flowstack-auth-tab.active {
          background: white;
          color: #1a1a1a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .flowstack-auth-tab:hover:not(.active) {
          color: #1a1a1a;
        }

        .flowstack-auth-form-container {
          margin-bottom: 16px;
        }

        .flowstack-auth-broker {
          margin-bottom: 20px;
        }

        .flowstack-auth-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
          color: #999;
          font-size: 14px;
        }

        .flowstack-auth-divider::before,
        .flowstack-auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e5e5;
        }

        .flowstack-auth-social {
          margin-top: 16px;
        }

        .flowstack-auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }

        @media (max-width: 480px) {
          .flowstack-auth-card {
            padding: 24px;
          }

          .flowstack-auth-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
