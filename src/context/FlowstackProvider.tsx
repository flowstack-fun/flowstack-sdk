'use client';

/**
 * Flowstack SDK Provider
 *
 * Main context provider that manages all SDK state including:
 * - Authentication (credentials, session)
 * - Workspaces (list, selection, creation)
 * - Chat messages with persistence
 * - Datasets, visualizations, reports, models
 * - Query execution state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

import type {
  FlowstackConfig,
  FlowstackCredentials,
  FlowstackContextValue,
  ChatMessage,
  WorkspaceInfo,
  DatasetInfo,
  VisualizationData,
  ReportInfo,
  ModelInfo,
  ScriptInfo,
  SessionState,
} from '../types';

import {
  listWorkspaces,
  createWorkspace as apiCreateWorkspace,
  listDatasets,
  listVisualizations,
  listReports,
  listModels,
  listScripts,
} from '../api/client';

import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  saveSelectedWorkspace,
  loadSelectedWorkspace,
  clearSelectedWorkspace,
  saveMessages,
  loadMessages,
  clearMessages as clearStoredMessages,
  clearAllFlowstackData,
} from '../utils/storage';

import {
  mockCredentials,
  mockWorkspaces,
  mockDatasets,
  mockVisualizations,
  mockDelay,
  generateMockId,
} from '../mock/fixtures';

// Default configuration
const DEFAULT_BASE_URL = 'https://sage-api.flowstack.fun';
// NOTE: there is intentionally no DEFAULT_TENANT_ID. For authenticated calls the
// backend derives tenant_id from the JWT/API key and ignores any client-sent
// X-Tenant-ID, so a default is pointless there. The only case that needs an
// explicit tenant is anonymous access (usePublicCollection) — and silently
// defaulting that to a real platform tenant would route a misconfigured app's
// public data into the wrong pool. So tenant is JWT-derived or explicitly set.

/**
 * Normalize workspace object from backend (snake_case) to SDK (camelCase).
 * The backend returns workspace_id, dataset_count, etc. but the SDK type expects camelCase.
 */
function normalizeWorkspace(ws: any): WorkspaceInfo {
  return {
    workspaceId: ws.workspaceId || ws.workspace_id || ws.id || '',
    name: ws.name || '',
    description: ws.description,
    datasetCount: ws.datasetCount ?? ws.dataset_count ?? 0,
    visualizationCount: ws.visualizationCount ?? ws.visualization_count ?? 0,
    modelCount: ws.modelCount ?? ws.model_count ?? 0,
    createdAt: ws.createdAt || ws.created_at || '',
    lastAccessed: ws.lastAccessed || ws.last_accessed || '',
  };
}

/** Check if a URL is a valid presigned S3 URL (not raw/unsigned). */
function isPresignedUrl(url?: string): boolean {
  return !!url && url.includes('X-Amz-');
}

/** Normalize visualization object from backend snake_case to SDK camelCase. */
function normalizeVisualization(v: any): VisualizationData {
  const meta = v.metadata || {};
  // Presigned URLs first — they have auth. Unsigned S3 URLs will AccessDenied.
  const imageUrl =
    v.presigned_url || meta.presigned_url ||
    v.imageUrl || v.image_url ||
    (v.url && !v.url.includes('s3.amazonaws.com') ? v.url : undefined) ||
    (meta.url && !meta.url.includes('s3.amazonaws.com') ? meta.url : undefined) ||
    meta.image_url ||
    undefined;
  return {
    name: v.name || '',
    type: v.type || v.visualization_type || v.chart_type || meta.chart_type,
    imageUrl,
    imageBase64: v.imageBase64 || v.image_base64 || meta.image_base64,
    format: v.format || meta.format,
    createdAt: v.createdAt || v.created_at || meta.created_at,
    metadata: v.metadata,
  };
}

/** Normalize dataset object from backend to SDK format. */
function normalizeDataset(d: any): DatasetInfo {
  // Backend returns shape: [rows, cols] and columns: ["col1", "col2", ...]
  const shape = d.shape || [];
  const colArray = Array.isArray(d.columns) ? d.columns : d.column_names || d.columns_list || [];
  const rowCount = d.rows ?? d.row_count ?? d.num_rows ?? d.size ?? (shape[0] || 0);
  const colCount = typeof d.columns === 'number' ? d.columns : (d.column_count ?? d.num_columns ?? shape[1] ?? colArray.length ?? 0);
  return {
    ...d,
    id: d.id || d.dataset_id,
    name: d.name || d.dataset_name || '',
    rows: rowCount,
    columns: colCount,
    columnNames: colArray,
    createdAt: d.createdAt || d.created_at,
    fileSize: d.fileSize || d.file_size || d.size,
    schema: d.schema || d.dtypes,
  };
}

// Context instance
const FlowstackContext = createContext<FlowstackContextValue | null>(null);

/**
 * Extract user ID from JWT or API key
 */
function extractUserId(apiKey: string): string {
  try {
    // JWT token - extract from payload
    if (apiKey.includes('.')) {
      const parts = apiKey.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.user_id) return String(payload.user_id);
        } catch {
          // JWT decode failed
        }
      }
    }

    // Legacy API key format
    if (apiKey.startsWith('sage_t_')) {
      return apiKey.substring(7, 23);
    } else if (apiKey.startsWith('sage_')) {
      return apiKey.substring(5, 21);
    }

    // Fallback
    return apiKey.substring(0, 16);
  } catch {
    return apiKey.substring(0, 16);
  }
}

/**
 * Derive tenant_id from a JWT's payload (browser-safe, no jsonwebtoken dep).
 * Returns undefined when it can't be derived — callers fall back to an explicitly
 * configured tenantId, never to a hardcoded platform tenant.
 */
function extractTenantId(apiKey?: string | null): string | undefined {
  if (!apiKey || !apiKey.includes('.')) return undefined;
  try {
    const parts = apiKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.tenant_id) return String(payload.tenant_id);
    }
  } catch {
    // not a decodable JWT — caller falls back to configured tenantId
  }
  return undefined;
}

/**
 * Check if credentials are expired
 */
function isExpired(credentials: FlowstackCredentials): boolean {
  if (!credentials.expiresAt) {
    // Try to extract from JWT
    if (credentials.apiKey.includes('.')) {
      try {
        const parts = credentials.apiKey.split('.');
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          return Date.now() > payload.exp * 1000;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  const expiresAt = new Date(credentials.expiresAt);
  return expiresAt < new Date();
}

/**
 * FlowstackProvider Props
 */
interface FlowstackProviderProps {
  children: ReactNode;
  config: FlowstackConfig;
  /**
   * P0-72: Optional Privy auth state passed from the parent. When provided,
   * FlowstackProvider cross-validates stored credentials against Privy on
   * mount — if Privy says "not authenticated", stale Flowstack creds are
   * cleared instead of blindly hydrated. This eliminates the 4-minute 401
   * request storm on cold load when Privy's session is absent but
   * sessionStorage still has `flowstack_credentials`.
   *
   * When omitted (e.g., SIWE-only mode, tests), the provider falls back
   * to the legacy behavior of trusting sessionStorage.
   */
  privyAuthState?: {
    ready: boolean;
    authenticated: boolean;
  };
}

/**
 * Flowstack Provider Component
 *
 * Wrap your app with this provider to enable all Flowstack SDK features.
 *
 * @example
 * ```tsx
 * <FlowstackProvider config={{ jwtSecret: process.env.JWT_SECRET! }}>
 *   <App />
 * </FlowstackProvider>
 * ```
 */
export function FlowstackProvider({
  children,
  config,
  privyAuthState,
}: FlowstackProviderProps) {
  // Configuration
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  // Empty string (not a real tenant) when unset — authenticated calls ignore the
  // X-Tenant-ID header (backend uses the JWT), and usePublicCollection hard-errors
  // on an empty tenant rather than silently using a platform default.
  const tenantId = config.tenantId || '';
  const isMockMode = config.mode === 'mock';

  // Auth state
  const [credentials, setCredentialsState] = useState<FlowstackCredentials | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Session state
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    workspaceId: null,
    isConnected: false,
    lastActivity: null,
  });

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<WorkspaceInfo | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Query state
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);

  // Data state
  const [datasets, setDatasetsState] = useState<DatasetInfo[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  const [visualizations, setVisualizationsState] = useState<VisualizationData[]>([]);
  const [isLoadingVisualizations, setIsLoadingVisualizations] = useState(false);

  const [reports, setReportsState] = useState<ReportInfo[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const [models, setModelsState] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const [scripts, setScriptsState] = useState<ScriptInfo[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);

  // UI state
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'datasets' | 'visualizations' | 'reports' | 'models'>('chat');

  // Build client config for API calls
  const clientConfig = { baseUrl, tenantId };

  // =============================================================================
  // Authentication
  // =============================================================================

  // Load credentials on mount — with P0-72 Privy cross-validation.
  //
  // Legacy behavior (no privyAuthState prop):
  //   Trust sessionStorage. Hydrate whatever's there if not expired.
  //
  // P0-72 behavior (privyAuthState passed):
  //   Wait for `ready`, then hydrate only if Privy agrees the user is
  //   authenticated. If sessionStorage has creds but Privy says no,
  //   clear the stale creds instead of firing authenticated API
  //   requests into a 401 storm.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Gate on Privy being ready when caller opted into cross-validation.
    if (privyAuthState && !privyAuthState.ready) {
      return;
    }

    const stored = loadCredentials('session');
    if (!stored) {
      setIsInitialized(true);
      return;
    }

    if (isExpired(stored)) {
      clearCredentials('session');
      setIsInitialized(true);
      return;
    }

    // app_scope cross-check: if this provider is configured with an appScope
    // (a built app), the stored JWT must carry a matching claim. A JWT issued
    // from the main Casino login (app_scope=null) silently bypasses all
    // collection guards and loads the full platform orchestrator instead of
    // the app's custom agent. Same logic as the broker fix for the Privy path.
    if (config.appScope) {
      try {
        const _parts = stored.apiKey.split('.');
        const _payload = JSON.parse(atob(_parts[1]));
        const _tokenScope: string | null = _payload.app_scope ?? null;
        if (_tokenScope !== config.appScope) {
          clearCredentials('session');
          clearAllFlowstackData('session');
          setIsInitialized(true);
          return;
        }
      } catch {
        // Malformed JWT — clear and force re-auth.
        clearCredentials('session');
        setIsInitialized(true);
        return;
      }
    }

    // P0-72 cross-check: Privy is the source of truth for "is this user
    // authenticated." If sessionStorage disagrees, trust Privy and clear
    // the stale Flowstack creds.
    if (privyAuthState && !privyAuthState.authenticated) {
      console.log('[FlowstackProvider] Privy session absent, clearing stale credentials');
      clearCredentials('session');
      clearAllFlowstackData('session');
      setIsInitialized(true);
      return;
    }

    // Both storage and (optionally) Privy agree — hydrate.
    setCredentialsState(stored);
    const workspaceId = loadSelectedWorkspace(stored, 'local');
    if (workspaceId) {
      setSession(prev => ({
        ...prev,
        sessionId: workspaceId,
        workspaceId,
        isConnected: true,
      }));
    }
    setIsInitialized(true);
  }, [privyAuthState?.ready, privyAuthState?.authenticated]);

  // Set credentials handler
  const setCredentials = useCallback((creds: FlowstackCredentials | null) => {
    setCredentialsState(creds);
    if (creds) {
      // Resolve tenant: explicit on the creds, else derive from the JWT, else the
      // configured tenantId. No hardcoded platform default.
      const credsWithTenant = {
        ...creds,
        tenantId: creds.tenantId || extractTenantId(creds.apiKey) || tenantId,
      };
      saveCredentials(credsWithTenant, 'session');
    } else {
      clearCredentials('session');
    }
  }, [tenantId]);

  // Logout handler
  const logout = useCallback(() => {
    if (credentials) {
      // Clear workspace selection
      clearSelectedWorkspace(credentials, 'local');

      // Clear messages for current workspace
      if (session.workspaceId) {
        clearStoredMessages(session.workspaceId, credentials, 'session');
      }
    }

    // Clear all Flowstack data
    clearAllFlowstackData('local');
    clearAllFlowstackData('session');

    // One-shot marker (set AFTER the clears so it survives): tells the next
    // BrokeredLoginButton click to pass force_login=1, so the broker purges its
    // sticky Privy/Casino session and the user can sign in with a DIFFERENT
    // account. Without this, brokered re-login silently returns the same identity.
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('flowstack:force_relogin', '1');
      }
    } catch { /* storage unavailable — non-fatal */ }

    // Reset state
    setCredentialsState(null);
    setWorkspaces([]);
    setSelectedWorkspaceState(null);
    setMessages([]);
    setDatasetsState([]);
    setVisualizationsState([]);
    setReportsState([]);
    setModelsState([]);
    setSession({
      sessionId: null,
      workspaceId: null,
      isConnected: false,
      lastActivity: null,
    });
  }, [credentials, session.workspaceId]);

  // =============================================================================
  // Workspace Management
  // =============================================================================

  // Refresh workspaces
  const refreshWorkspaces = useCallback(async () => {
    if (!credentials && !isMockMode) return;

    setIsLoadingWorkspaces(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setWorkspaces(mockWorkspaces);
        return;
      }

      const response = await listWorkspaces(credentials!, 50, clientConfig);
      if (response.ok && response.data) {
        setWorkspaces(response.data.workspaces.map(normalizeWorkspace));
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh workspaces:', error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [credentials, clientConfig, isMockMode]);

  // Create workspace
  const createWorkspace = useCallback(async (name: string, description?: string): Promise<WorkspaceInfo | null> => {
    if (!credentials && !isMockMode) return null;

    try {
      if (isMockMode) {
        await mockDelay();
        const newWorkspace: WorkspaceInfo = {
          workspaceId: generateMockId('ws'),
          name,
          description,
          datasetCount: 0,
          visualizationCount: 0,
          modelCount: 0,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        };
        setWorkspaces(prev => [newWorkspace, ...prev]);
        return newWorkspace;
      }

      const response = await apiCreateWorkspace(credentials!, name, description, clientConfig);
      if (response.ok && response.data) {
        const newWorkspace = normalizeWorkspace(response.data.workspace);
        setWorkspaces(prev => [newWorkspace, ...prev]);
        return newWorkspace;
      }
      return null;
    } catch (error) {
      console.error('[Flowstack] Failed to create workspace:', error);
      return null;
    }
  }, [credentials, clientConfig, isMockMode]);

  // Select workspace
  const setSelectedWorkspace = useCallback((workspace: WorkspaceInfo | null) => {
    setSelectedWorkspaceState(workspace);

    if (workspace && credentials) {
      // Update session
      setSession(prev => ({
        ...prev,
        sessionId: workspace.workspaceId,
        workspaceId: workspace.workspaceId,
        isConnected: true,
        lastActivity: new Date(),
      }));

      // Persist selection
      saveSelectedWorkspace(workspace.workspaceId, credentials, 'local');

      // Load messages for this workspace
      const storedMessages = loadMessages<ChatMessage>(
        workspace.workspaceId,
        credentials,
        'session'
      );

      // Fix any interrupted streaming messages
      const fixedMessages = storedMessages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
        isStreaming: false,
        content: m.isStreaming && !m.content?.trim()
          ? '*(Response interrupted)*'
          : m.content,
      }));
      setMessages(fixedMessages);

      // Clear data - will be refreshed
      setDatasetsState([]);
      setVisualizationsState([]);
      setReportsState([]);
      setModelsState([]);
    } else {
      setSession(prev => ({
        ...prev,
        sessionId: null,
        workspaceId: null,
        isConnected: false,
      }));
      setMessages([]);
    }
  }, [credentials]);

  // Auto-load workspaces when authenticated (or in mock mode)
  useEffect(() => {
    if ((credentials || isMockMode) && workspaces.length === 0 && isInitialized) {
      refreshWorkspaces();
    }
  }, [credentials, isInitialized, isMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select or auto-create workspace when workspaces load
  useEffect(() => {
    if (!credentials && !isMockMode) return;
    if (selectedWorkspace) return;

    if (workspaces.length > 0) {
      // If a session workspace exists, select it; otherwise select the first one
      const found = session.workspaceId
        ? workspaces.find(ws => ws.workspaceId === session.workspaceId)
        : null;
      // Use setSelectedWorkspace (not raw state setter) to trigger message restoration
      setSelectedWorkspace(found || workspaces[0]);
    } else if (workspaces.length === 0 && isInitialized && !isLoadingWorkspaces) {
      // No workspaces — auto-create a default one
      createWorkspace('My Workspace', 'Default workspace').then(ws => {
        if (ws) setSelectedWorkspace(ws);
      });
    }
  }, [workspaces, session.workspaceId, selectedWorkspace, credentials, isMockMode, isInitialized, isLoadingWorkspaces]); // eslint-disable-line react-hooks/exhaustive-deps

  // =============================================================================
  // Message Management
  // =============================================================================

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const updated = [...prev, message];

      // Persist non-streaming messages
      if (!message.isStreaming && credentials && session.workspaceId) {
        saveMessages(updated, session.workspaceId, credentials, 'session');
      }

      return updated;
    });
  }, [credentials, session.workspaceId]);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const updated = prev.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      );

      // Persist when streaming completes
      if (updates.isStreaming === false && credentials && session.workspaceId) {
        saveMessages(updated, session.workspaceId, credentials, 'session');
      }

      return updated;
    });
  }, [credentials, session.workspaceId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (credentials && session.workspaceId) {
      clearStoredMessages(session.workspaceId, credentials, 'session');
    }
  }, [credentials, session.workspaceId]);

  // =============================================================================
  // Dataset Management
  // =============================================================================

  const setDatasets = useCallback((datasets: DatasetInfo[]) => {
    setDatasetsState(datasets);
  }, []);

  const refreshDatasets = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;

    setIsLoadingDatasets(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setDatasetsState(mockDatasets);
        return;
      }

      const response = await listDatasets(
        credentials!,
        selectedWorkspace!.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setDatasetsState(response.data.datasets.map(normalizeDataset));
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh datasets:', error);
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);

  // =============================================================================
  // Visualization Management
  // =============================================================================

  const setVisualizations = useCallback((vizs: VisualizationData[]) => {
    setVisualizationsState(vizs);
  }, []);

  const addVisualization = useCallback((viz: VisualizationData) => {
    setVisualizationsState(prev => {
      const exists = prev.some(v => v.name === viz.name);
      if (exists) {
        return prev.map(v => v.name === viz.name ? viz : v);
      }
      return [...prev, viz];
    });
  }, []);

  const refreshVisualizations = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;

    setIsLoadingVisualizations(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setVisualizationsState(mockVisualizations);
        return;
      }

      const response = await listVisualizations(
        credentials!,
        selectedWorkspace!.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        const apiVizs = response.data.visualizations.map(normalizeVisualization);
        // Merge: preserve image data from streaming visualizations (SSE events
        // include imageBase64/imageUrl but the list API does not)
        setVisualizationsState(prev => {
          const streamMap = new Map(prev.filter(v => v.imageUrl || v.imageBase64).map(v => [v.name, v]));
          return apiVizs.map(v => {
            const streamed = streamMap.get(v.name);
            if (streamed && !v.imageUrl && !v.imageBase64) {
              return { ...v, imageUrl: streamed.imageUrl, imageBase64: streamed.imageBase64, format: streamed.format || v.format };
            }
            return v;
          });
        });
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh visualizations:', error);
    } finally {
      setIsLoadingVisualizations(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);

  const clearVisualizations = useCallback(() => {
    setVisualizationsState([]);
  }, []);

  // =============================================================================
  // Report Management
  // =============================================================================

  const refreshReports = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;

    setIsLoadingReports(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setReportsState([]); // No mock reports by default
        return;
      }

      const response = await listReports(
        credentials!,
        selectedWorkspace!.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setReportsState(response.data.reports);
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);

  // =============================================================================
  // Model Management
  // =============================================================================

  const refreshModels = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;

    setIsLoadingModels(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setModelsState([]); // No mock models by default
        return;
      }

      const response = await listModels(
        credentials!,
        selectedWorkspace!.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setModelsState(response.data.models);
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);

  // =============================================================================
  // Script Management
  // =============================================================================

  const refreshScripts = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;

    setIsLoadingScripts(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setScriptsState([]);
        return;
      }

      const response = await listScripts(
        credentials!,
        selectedWorkspace!.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setScriptsState(response.data.scripts);
      }
    } catch (error) {
      console.error('[Flowstack] Failed to refresh scripts:', error);
    } finally {
      setIsLoadingScripts(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);

  // =============================================================================
  // Auto-refresh on workspace change
  // =============================================================================

  useEffect(() => {
    if ((credentials || isMockMode) && selectedWorkspace) {
      const timer = setTimeout(() => {
        refreshDatasets();
        refreshVisualizations();
        refreshReports();
        refreshModels();
        refreshScripts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedWorkspace?.workspaceId, isMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // =============================================================================
  // Context Value
  // =============================================================================

  const value: FlowstackContextValue = {
    // Config
    config,

    // Auth
    credentials,
    setCredentials,
    isAuthenticated: !!credentials,
    isInitialized,
    logout,

    // Session
    session,

    // Workspaces
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    refreshWorkspaces,
    createWorkspace,
    isLoadingWorkspaces,

    // Messages
    messages,
    addMessage,
    updateMessage,
    clearMessages,

    // Query state
    isQueryRunning,
    setIsQueryRunning,
    queryStartTime,
    setQueryStartTime,

    // Datasets
    datasets,
    setDatasets,
    refreshDatasets,
    isLoadingDatasets,

    // Visualizations
    visualizations,
    setVisualizations,
    addVisualization,
    refreshVisualizations,
    isLoadingVisualizations,
    clearVisualizations,

    // Reports
    reports,
    refreshReports,
    isLoadingReports,

    // Models
    models,
    refreshModels,
    isLoadingModels,

    // Scripts
    scripts,
    refreshScripts,
    isLoadingScripts,

    // UI
    isSidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
  };

  return (
    <FlowstackContext.Provider value={value}>
      {children}
    </FlowstackContext.Provider>
  );
}

/**
 * Hook to access Flowstack context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, credentials } = useFlowstack();
 *   // ...
 * }
 * ```
 */
export function useFlowstack(): FlowstackContextValue {
  const context = useContext(FlowstackContext);
  if (!context) {
    throw new Error('useFlowstack must be used within a FlowstackProvider');
  }
  return context;
}

/**
 * Optional hook - returns null if not in provider (for conditional usage)
 */
export function useFlowstackOptional(): FlowstackContextValue | null {
  return useContext(FlowstackContext);
}
