'use client';

/**
 * SettingsPage Component
 *
 * A pre-built settings page that renders connection cards for all supported
 * OAuth services and data source connectors. Include this in every built app's
 * navigation so users can link their accounts and databases.
 *
 * @example
 * ```tsx
 * import { SettingsPage } from 'flowstack-sdk';
 *
 * function App() {
 *   return (
 *     <Routes>
 *       <Route path="/settings" element={<SettingsPage />} />
 *     </Routes>
 *   );
 * }
 * ```
 */

import React, { useState } from 'react';
import { useConnections } from '../../hooks/useConnections';
import { useDataSources } from '../../hooks/useDataSources';
import type { ServiceProvider, GoogleService } from '../../hooks/useConnections';
import type { DataSourceType, DataSourceConfig, ConnectionTestResult } from '../../types';

export interface SettingsPageService {
  key: ServiceProvider;
  label: string;
  sublabel: string;
  services?: GoogleService[];
}

export interface SettingsPageProps {
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Override the list of services shown. Defaults to all supported providers. */
  services?: SettingsPageService[];
  /** Additional CSS class */
  className?: string;
}

const DEFAULT_SERVICES: SettingsPageService[] = [
  { key: 'google', label: 'Google', sublabel: 'Analytics, Ads, Drive, YouTube', services: ['all'] },
  { key: 'reddit', label: 'Reddit', sublabel: 'Feed access' },
  { key: 'strava', label: 'Strava', sublabel: 'Activity data' },
  { key: 'twitter', label: 'Twitter / X', sublabel: 'Timeline and bookmarks' },
  { key: 'github', label: 'GitHub', sublabel: 'Repository access' },
];

const DS_TYPE_LABELS: Record<DataSourceType, string> = {
  mongodb: 'MongoDB',
  postgresql: 'PostgreSQL',
  s3: 'Amazon S3',
};

function formatPreview(preview?: Record<string, unknown>): string {
  if (!preview) return '';
  const parts: string[] = [];
  if (preview.host) parts.push(String(preview.host));
  if (preview.database) parts.push(String(preview.database));
  if (preview.bucket) parts.push(String(preview.bucket));
  if (preview.connection_string) parts.push(String(preview.connection_string));
  return parts.length ? `— ${parts.join(' / ')}` : '';
}

export function SettingsPage({
  title = 'Settings',
  description = 'Connect your accounts so the AI assistant can access your data.',
  services = DEFAULT_SERVICES,
  className = '',
}: SettingsPageProps) {
  const { connections, connect, disconnect, isLoading } = useConnections();
  const {
    dataSources,
    createDataSource,
    testConnection,
    testNewConnection,
    deleteDataSource,
    error: dsError,
  } = useDataSources();

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [dsName, setDsName] = useState('');
  const [dsType, setDsType] = useState<DataSourceType>('mongodb');
  const [dsConnectionString, setDsConnectionString] = useState('');
  const [dsS3Bucket, setDsS3Bucket] = useState('');
  const [dsS3AccessKey, setDsS3AccessKey] = useState('');
  const [dsS3SecretKey, setDsS3SecretKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Per-source action state
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [sourceTestResults, setSourceTestResults] = useState<Record<string, ConnectionTestResult>>({});

  function resetForm() {
    setDsName('');
    setDsType('mongodb');
    setDsConnectionString('');
    setDsS3Bucket('');
    setDsS3AccessKey('');
    setDsS3SecretKey('');
    setTestResult(null);
    setSaveError(null);
  }

  const isFormValid = dsName.trim() && (
    (dsType !== 's3' && dsConnectionString.trim()) ||
    (dsType === 's3' && dsS3Bucket.trim() && dsS3AccessKey.trim() && dsS3SecretKey.trim())
  );

  async function handleTestNew() {
    setIsTesting(true);
    setTestResult(null);
    const request = dsType === 's3'
      ? {
          source_type: dsType as DataSourceType,
          credentials: { access_key_id: dsS3AccessKey, secret_access_key: dsS3SecretKey },
          auth_method: 'access_key',
          metadata: { bucket: dsS3Bucket },
        }
      : {
          source_type: dsType as DataSourceType,
          credentials: { connection_string: dsConnectionString },
          auth_method: 'connection_string',
        };
    const result = await testNewConnection(request);
    setTestResult(result);
    setIsTesting(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    const config: DataSourceConfig = {
      type: dsType,
      name: dsName.trim(),
      auth_method: dsType === 's3' ? 'access_key' : 'connection_string',
      credentials: dsType === 's3'
        ? { access_key_id: dsS3AccessKey, secret_access_key: dsS3SecretKey }
        : { connection_string: dsConnectionString },
      metadata: dsType === 's3' ? { bucket: dsS3Bucket } : undefined,
    };
    const created = await createDataSource(config);
    setIsSaving(false);
    if (created) {
      setShowAddForm(false);
      resetForm();
    } else {
      setSaveError(dsError || 'Failed to save data source');
    }
  }

  async function handleTestExisting(id: string) {
    setTestingSourceId(id);
    setSourceTestResults(prev => { const next = { ...prev }; delete next[id]; return next; });
    const result = await testConnection(id);
    setSourceTestResults(prev => ({ ...prev, [id]: result }));
    setTestingSourceId(null);
  }

  async function handleDelete(id: string) {
    setDeletingSourceId(id);
    await deleteDataSource(id);
    setDeletingSourceId(null);
  }

  return (
    <div className={`flowstack-settings-page ${className}`}>
      <div className="flowstack-settings-header">
        <h1 className="flowstack-settings-title">{title}</h1>
        <p className="flowstack-settings-description">{description}</p>
      </div>

      {/* OAuth Services */}
      <div className="flowstack-settings-section">
        <h2 className="flowstack-settings-section-title">Connected Services</h2>
        <div className="flowstack-settings-cards">
          {services.map(({ key, label, sublabel, services: svc }) => {
            const status = connections[key];
            const isConnected = status?.connected ?? false;
            const subtitle = isConnected && 'username' in status && status.username
              ? status.username
              : isConnected && 'email' in status && status.email
              ? status.email
              : sublabel;

            return (
              <div key={key} className="flowstack-connection-card">
                <div className="flowstack-connection-info">
                  <h3 className="flowstack-connection-label">{label}</h3>
                  <p className="flowstack-connection-sublabel">{subtitle}</p>
                </div>
                <div className="flowstack-connection-status">
                  {isConnected && (
                    <span className="flowstack-connection-badge">Connected</span>
                  )}
                  {isConnected ? (
                    <button
                      className="flowstack-connection-btn flowstack-connection-btn--disconnect"
                      onClick={() => disconnect(key)}
                      disabled={isLoading}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="flowstack-connection-btn flowstack-connection-btn--connect"
                      onClick={() => connect(key, svc)}
                      disabled={isLoading}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Sources */}
      <div className="flowstack-settings-section" style={{ marginTop: 24 }}>
        <div className="flowstack-ds-section-header">
          <h2 className="flowstack-settings-section-title">Data Sources</h2>
          {!showAddForm && (
            <button
              className="flowstack-ds-add-btn"
              onClick={() => { setShowAddForm(true); resetForm(); }}
            >
              + Add Data Source
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="flowstack-ds-form">
            <input
              className="flowstack-ds-input"
              placeholder="Data source name"
              value={dsName}
              onChange={e => setDsName(e.target.value)}
            />
            <select
              className="flowstack-ds-input"
              value={dsType}
              onChange={e => { setDsType(e.target.value as DataSourceType); setTestResult(null); }}
            >
              <option value="mongodb">MongoDB</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="s3">Amazon S3</option>
            </select>

            {(dsType === 'mongodb' || dsType === 'postgresql') && (
              <input
                className="flowstack-ds-input"
                placeholder={dsType === 'mongodb' ? 'mongodb+srv://...' : 'postgresql://user:pass@host/db'}
                value={dsConnectionString}
                onChange={e => { setDsConnectionString(e.target.value); setTestResult(null); }}
              />
            )}

            {dsType === 's3' && (
              <>
                <input
                  className="flowstack-ds-input"
                  placeholder="Bucket name"
                  value={dsS3Bucket}
                  onChange={e => { setDsS3Bucket(e.target.value); setTestResult(null); }}
                />
                <input
                  className="flowstack-ds-input"
                  placeholder="Access Key ID"
                  value={dsS3AccessKey}
                  onChange={e => { setDsS3AccessKey(e.target.value); setTestResult(null); }}
                />
                <input
                  className="flowstack-ds-input"
                  placeholder="Secret Access Key"
                  type="password"
                  value={dsS3SecretKey}
                  onChange={e => { setDsS3SecretKey(e.target.value); setTestResult(null); }}
                />
              </>
            )}

            {testResult && (
              <div className={testResult.success ? 'flowstack-ds-test-success' : 'flowstack-ds-test-error'}>
                {testResult.message}
              </div>
            )}

            {saveError && (
              <div className="flowstack-ds-test-error">{saveError}</div>
            )}

            <div className="flowstack-ds-form-actions">
              <button
                className="flowstack-connection-btn flowstack-connection-btn--connect"
                onClick={handleTestNew}
                disabled={isTesting || !isFormValid}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                className="flowstack-connection-btn flowstack-connection-btn--connect"
                onClick={handleSave}
                disabled={isSaving || !testResult?.success}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="flowstack-connection-btn flowstack-connection-btn--disconnect"
                onClick={() => { setShowAddForm(false); resetForm(); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing data source cards */}
        <div className="flowstack-settings-cards">
          {dataSources.map(ds => {
            const result = sourceTestResults[ds.source_id];
            return (
              <div key={ds.source_id} className="flowstack-connection-card">
                <div className="flowstack-connection-info">
                  <h3 className="flowstack-connection-label">{ds.name}</h3>
                  <p className="flowstack-connection-sublabel">
                    {DS_TYPE_LABELS[ds.source_type] || ds.source_type} {formatPreview(ds.credentials_preview)}
                  </p>
                </div>
                <div className="flowstack-connection-status">
                  {result && (
                    <span className={result.success ? 'flowstack-connection-badge' : 'flowstack-connection-badge flowstack-connection-badge--error'}>
                      {result.success ? 'Connected' : 'Failed'}
                    </span>
                  )}
                  <button
                    className="flowstack-connection-btn flowstack-connection-btn--connect"
                    onClick={() => handleTestExisting(ds.source_id)}
                    disabled={testingSourceId === ds.source_id}
                  >
                    {testingSourceId === ds.source_id ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    className="flowstack-connection-btn flowstack-connection-btn--disconnect"
                    onClick={() => handleDelete(ds.source_id)}
                    disabled={deletingSourceId === ds.source_id}
                  >
                    {deletingSourceId === ds.source_id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}
          {dataSources.length === 0 && !showAddForm && (
            <p className="flowstack-ds-empty">No data sources connected.</p>
          )}
        </div>
      </div>

      <style>{`
        .flowstack-settings-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .flowstack-settings-header {
          margin-bottom: 32px;
        }

        .flowstack-settings-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .flowstack-settings-description {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .flowstack-settings-section {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          overflow: hidden;
        }

        .flowstack-settings-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e5e5;
          margin: 0;
        }

        .flowstack-settings-cards {
          display: flex;
          flex-direction: column;
        }

        .flowstack-connection-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
        }

        .flowstack-connection-card:last-child {
          border-bottom: none;
        }

        .flowstack-connection-info {
          flex: 1;
        }

        .flowstack-connection-label {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 2px 0;
        }

        .flowstack-connection-sublabel {
          font-size: 13px;
          color: #888;
          margin: 0;
        }

        .flowstack-connection-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .flowstack-connection-badge {
          font-size: 12px;
          font-weight: 500;
          color: #16a34a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .flowstack-connection-badge--error {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .flowstack-connection-btn {
          font-size: 14px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s;
        }

        .flowstack-connection-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .flowstack-connection-btn--connect {
          background: #1a1a1a;
          color: white;
        }

        .flowstack-connection-btn--connect:hover:not(:disabled) {
          opacity: 0.85;
        }

        .flowstack-connection-btn--disconnect {
          background: #f5f5f5;
          color: #666;
        }

        .flowstack-connection-btn--disconnect:hover:not(:disabled) {
          background: #fee2e2;
          color: #dc2626;
        }

        .flowstack-ds-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-right: 20px;
        }

        .flowstack-ds-section-header .flowstack-settings-section-title {
          border-bottom: none;
        }

        .flowstack-ds-add-btn {
          font-size: 13px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #e5e5e5;
          background: white;
          color: #1a1a1a;
          cursor: pointer;
        }

        .flowstack-ds-add-btn:hover {
          background: #f5f5f5;
        }

        .flowstack-ds-form {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .flowstack-ds-input {
          font-size: 14px;
          padding: 8px 12px;
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          outline: none;
          font-family: inherit;
        }

        .flowstack-ds-input:focus {
          border-color: #1a1a1a;
        }

        .flowstack-ds-form-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .flowstack-ds-test-success {
          font-size: 13px;
          color: #16a34a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .flowstack-ds-test-error {
          font-size: 13px;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .flowstack-ds-empty {
          font-size: 14px;
          color: #888;
          padding: 20px;
          text-align: center;
          margin: 0;
        }

        @media (max-width: 480px) {
          .flowstack-settings-page {
            padding: 20px 16px;
          }

          .flowstack-connection-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .flowstack-ds-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .flowstack-ds-form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
