/**
 * Flowstack API Client
 *
 * CRITICAL: This enforces user-level isolation for the shared tenant architecture.
 * ALL API requests MUST go through this client to prevent data leakage.
 *
 * Architecture:
 * - Flowstack: Multi-user, single-tenant system
 * - Backend: Multi-tenant system
 * - Isolation: By user_id within shared tenant
 */

import type {
  ApiResponse,
  FlowstackCredentials,
  WorkspaceInfo,
  DatasetInfo,
  VisualizationData,
  ReportInfo,
  ModelInfo,
  DataSource,
  DataSourceConfig,
  ConnectionTestResult,
  ManagedUser,
  UserStats,
  UserActivityLog,
  UserListParams,
  UserListResponse,
  UpdateUserRequest,
  DatasetPreview,
  GitHubRepo,
  PiiSettings,
  PiiRedactedEntity,
  PublishedSiteInfo,
  ScriptInfo,
  AgentInfo,
  SiteVersionManifest,
  PublishToGitHubParams,
  PublishToGitHubResult,
  CollectionLayer,
  UserDataOverview,
  UserCollectionInfo,
  CollectionSchemaInfo,
} from '../types';

// Default API URL
const DEFAULT_BASE_URL = 'https://sage-api.flowstack.fun';
// No real default tenant: every function here is authenticated (takes `credentials`),
// so the backend derives tenant_id from the JWT/API key and ignores the X-Tenant-ID
// header. Falling back to '' avoids silently tagging requests with a platform tenant.
const DEFAULT_TENANT_ID = '';

// Client configuration
export interface FlowstackClientConfig {
  baseUrl?: string;
  tenantId?: string;
  enforceUserScope?: boolean;
  /** App scope (site_id) — embedded in JWT for built-app users */
  appScope?: string;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  credentials: FlowstackCredentials;
}

/**
 * Make a request to the Flowstack API with user-level isolation
 */
export async function flowstackFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions,
  config?: FlowstackClientConfig
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, credentials } = options;
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const enforceUserScope = config?.enforceUserScope !== false;

  const { apiKey, tenantId, userId } = credentials;

  // CRITICAL: Enforce user ID requirement
  if (enforceUserScope && !userId) {
    console.error('[FlowstackClient] CRITICAL: No user ID provided!');
    throw new Error('SECURITY: User ID is required for all API requests.');
  }

  // Build full URL
  const url = new URL(`${baseUrl}${endpoint}`);

  // Add user_id as query parameter for GET requests
  if (method === 'GET' && userId) {
    url.searchParams.set('user_id', userId);
  }

  // Build request headers
  const requestHeaders: HeadersInit = {
    'Authorization': `Bearer ${apiKey}`,
    'X-Tenant-ID': tenantId || config?.tenantId || DEFAULT_TENANT_ID,
    'X-User-ID': userId || '',
    ...headers,
  };

  // Add Content-Type for POST/PUT/PATCH
  if (body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FlowstackClient] Error ${response.status}:`, errorText);
      return {
        ok: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data: data as T,
    };
  } catch (error) {
    console.error('[FlowstackClient] Request failed:', error);
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Workspace Operations
// =============================================================================

/**
 * List workspaces for the current user
 */
export async function listWorkspaces(
  credentials: FlowstackCredentials,
  limit: number = 50,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ workspaces: WorkspaceInfo[]; total_count: number; has_more: boolean }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces?limit=${limit}`, {
    credentials,
  }, config);
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  credentials: FlowstackCredentials,
  name: string,
  description?: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ workspace: WorkspaceInfo }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces`, {
    method: 'POST',
    credentials,
    body: {
      name,
      workspace_name: name,
      description,
      user_id: credentials.userId,
    },
  }, config);
}

/**
 * Get a single workspace
 */
export async function getWorkspace(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ workspace: WorkspaceInfo }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces/${workspaceId}`, {
    credentials,
  }, config);
}

// =============================================================================
// Dataset Operations
// =============================================================================

/**
 * List datasets for a tenant (optionally filtered by workspace)
 */
export async function listDatasets(
  credentials: FlowstackCredentials,
  workspaceId?: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ datasets: DatasetInfo[] }>> {
  // Use workspace-scoped endpoint (non-tenant-prefixed) — demo users lack admin:read
  const query = workspaceId
    ? `?workspace_id=${workspaceId}&session_id=${workspaceId}`
    : '';
  return flowstackFetch(`/datasets${query}`, {
    credentials,
  }, config);
}

/**
 * Get dataset details
 */
export async function getDataset(
  credentials: FlowstackCredentials,
  datasetName: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ dataset: DatasetInfo }>> {
  // API provides dataset info through the download endpoint
  return flowstackFetch(`/datasets/${datasetName}/download`, {
    credentials,
  }, config);
}

/**
 * Get a preview of dataset rows and columns
 */
export async function getDatasetPreview(
  credentials: FlowstackCredentials,
  datasetName: string,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<DatasetPreview>> {
  return flowstackFetch(`/datasets/${datasetName}/preview?workspace_id=${workspaceId}&session_id=${workspaceId}&limit=50`, {
    credentials,
  }, config);
}

/**
 * Delete a dataset
 * Note: Dataset deletion must be done through the agent chat interface
 */
export async function deleteDataset(
  _credentials: FlowstackCredentials,
  _datasetName: string,
  _config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  // Dataset deletion is handled through agent interactions, not a direct API call
  return {
    ok: false,
    status: 501,
    error: 'Dataset deletion is handled through the agent chat interface. Use the /stream endpoint to request deletion.',
  };
}

// =============================================================================
// Visualization Operations
// =============================================================================

/**
 * List visualizations in a workspace
 */
export async function listVisualizations(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ visualizations: VisualizationData[] }>> {
  return flowstackFetch(`/visualizations?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials,
  }, config);
}

// =============================================================================
// Report Operations
// =============================================================================

/**
 * List reports in a workspace
 */
export async function listReports(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ reports: ReportInfo[] }>> {
  return flowstackFetch(`/reports?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials,
  }, config);
}

// =============================================================================
// Model Operations
// =============================================================================

/**
 * List ML models in a workspace
 */
export async function listModels(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ models: ModelInfo[] }>> {
  return flowstackFetch(`/models?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials,
  }, config);
}

/**
 * Get model details
 */
export async function getModel(
  credentials: FlowstackCredentials,
  workspaceId: string,
  modelName: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ model: ModelInfo }>> {
  return flowstackFetch(`/models/${modelName}?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials,
  }, config);
}

// =============================================================================
// Script Operations
// =============================================================================

/**
 * List scripts in a workspace
 */
export async function listScripts(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ scripts: ScriptInfo[] }>> {
  return flowstackFetch(`/scripts/detailed?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials,
  }, config);
}

// =============================================================================
// Data Source Operations
// =============================================================================

/**
 * List data sources
 */
export async function listDataSources(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig,
  options?: {
    /**
     * P0-69: when true, appends `include_provenance=true` so the backend
     * returns the `_flowstack` workspace attribution envelope on every
     * data source. Required for built apps that need to know which
     * workspace a shared data source belongs to.
     */
    includeProvenance?: boolean;
  },
): Promise<ApiResponse<{ datasources: DataSource[] }>> {
  const qs = options?.includeProvenance ? '?include_provenance=true' : '';
  return flowstackFetch(`/data-sources${qs}`, {
    credentials,
  }, config);
}

/**
 * Create a data source
 */
export async function createDataSource(
  credentials: FlowstackCredentials,
  sourceConfig: DataSourceConfig,
  config?: FlowstackClientConfig
): Promise<ApiResponse<DataSource>> {
  return flowstackFetch('/data-sources', {
    method: 'POST',
    credentials,
    body: {
      source_type: sourceConfig.type,
      name: sourceConfig.name,
      auth_method: sourceConfig.auth_method || 'connection_string',
      credentials: sourceConfig.credentials || {
        connection_string: sourceConfig.connectionString,
      },
      metadata: sourceConfig.metadata,
      is_tenant_wide: sourceConfig.is_tenant_wide || false,
    },
  }, config);
}

/**
 * Test a data source connection
 */
export async function testDataSource(
  credentials: FlowstackCredentials,
  sourceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<ConnectionTestResult>> {
  return flowstackFetch(`/data-sources/${sourceId}/test`, {
    method: 'POST',
    credentials,
  }, config);
}

/**
 * Delete a data source
 */
export async function deleteDataSource(
  credentials: FlowstackCredentials,
  sourceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  return flowstackFetch(`/data-sources/${sourceId}`, {
    method: 'DELETE',
    credentials,
  }, config);
}

// =============================================================================
// Agent Discovery
// =============================================================================

/**
 * List available agents with descriptions and capabilities.
 * No credentials required — this is a public capability catalog.
 */
export async function listAgents(
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ agents: AgentInfo[]; count: number; workflows: any[] }>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/agents`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, error: errorText };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to fetch agents',
    };
  }
}

// =============================================================================
// Query Execution
// =============================================================================

/**
 * Execute a streaming query
 * Returns the Response object for SSE streaming
 */
export async function executeQuery(
  credentials: FlowstackCredentials,
  query: string,
  workspaceId: string,
  options?: {
    networkMode?: 'SANDBOX' | 'PUBLIC';
    tools?: string[];
    /** @deprecated P0-73: Strands swarm removed. Use `capabilities` instead. */
    targetAgent?: string;
    /** @deprecated P0-73: Strands swarm removed. Use `capabilities` instead. */
    targetAgents?: string[];
    /** P0-80: meta-tool categories to pre-load on the server so the agent
     *  has the right tools available from turn 1. Values: 'site_operations',
     *  'data_access', 'external_integration', 'code_execution',
     *  'domain_task', 'workspace_management'. */
    capabilities?: string[];
    /** Session ID for conversation continuity */
    sessionId?: string;
    /**
     * When true, backend generates a new session key (appends timestamp to
     * the deterministic hash) so end-users of built apps get a fresh
     * conversation on the backend, not just cleared frontend state.
     */
    forceNewSession?: boolean;
  },
  config?: FlowstackClientConfig
): Promise<Response> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;

  const response = await fetch(`${baseUrl}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.apiKey}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': credentials.userId || '',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      query,
      workspace_id: workspaceId,
      session_id: options?.sessionId || undefined,
      force_new_session: options?.forceNewSession || undefined,
      tenant_id: tenantId,
      user_id: credentials.userId,
      code_interpreter_network_mode: options?.networkMode || 'SANDBOX',
      // P0-80: capabilities replaces target_agents on the wire. Deprecated
      // target_agents/target_agent are intentionally NOT forwarded — they
      // were no-ops post-P0-73 and forwarding them just added noise to logs.
      capabilities: options?.capabilities && options.capabilities.length > 0
        ? options.capabilities
        : undefined,
    }),
  });

  if (!response.ok) {
    // 402 Payment Required → out of credits. Throw a typed error that Casino's
    // useAgent hook can catch and surface via the CreditGate modal.
    if (response.status === 402) {
      let body: any = {};
      try { body = await response.json(); } catch {}
      const err = new Error(body?.message || 'Out of credits — top up to continue');
      (err as any).status = 402;
      (err as any).code = 'INSUFFICIENT_CREDITS';
      (err as any).body = body;
      throw err;
    }
    // Other failures — try to parse the body for a meaningful message
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.detail || body?.error || body?.message || detail;
    } catch {}
    throw new Error(`Query failed: ${detail}`);
  }

  return response;
}

/**
 * Execute a streaming query with custom agent configuration
 *
 * Extends executeQuery to support system prompt overrides, tool whitelists,
 * and direct agent targeting.
 */
export async function executeQueryWithConfig(
  credentials: FlowstackCredentials,
  query: string,
  workspaceId: string,
  options?: {
    networkMode?: 'SANDBOX' | 'PUBLIC';
    systemPrompt?: string;
    tools?: string[];
    /** @deprecated P0-73: Strands swarm removed. Use `capabilities` instead. */
    targetAgent?: string;
    /** @deprecated P0-73: Strands swarm removed. Use `capabilities` instead. */
    targetAgents?: string[];
    /** P0-80: meta-tool categories to pre-load on the server. */
    capabilities?: string[];
    /** P0-132 (G4): target a specific registered persona/subagent by name. Sent
     *  as `target_agents` on the wire so multi-persona apps can pick a persona
     *  instead of always hitting the auto-selected first subagent. This is the
     *  supported persona-selection path — distinct from the deprecated Strands
     *  swarm `targetAgent(s)` fields above. */
    persona?: string;
    /** Session ID for conversation continuity */
    sessionId?: string;
    /** P0-57: Per-request PII allowlist — terms the user explicitly allowed */
    allowedTerms?: string[];
    /** Force backend to create a new conversation (appends timestamp to session hash) */
    forceNewSession?: boolean;
  },
  config?: FlowstackClientConfig
): Promise<Response> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;

  const response = await fetch(`${baseUrl}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.apiKey}`,
      'X-Tenant-ID': tenantId,
      'X-User-ID': credentials.userId || '',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      query,
      workspace_id: workspaceId,
      session_id: options?.sessionId || undefined,
      force_new_session: options?.forceNewSession || undefined,
      tenant_id: tenantId,
      user_id: credentials.userId,
      code_interpreter_network_mode: options?.networkMode || 'SANDBOX',
      // P0-80: capabilities replaces target_agents on the wire.
      capabilities: options?.capabilities && options.capabilities.length > 0
        ? options.capabilities
        : undefined,
      system_prompt_override: options?.systemPrompt,
      tool_whitelist: options?.tools,
      allowed_terms: options?.allowedTerms || undefined,
      // P0-132 (G4): persona selection → target_agents. The backend persona
      // resolver honors request.target_agents and otherwise auto-selects the
      // first registered subagent. Only sent when a persona is requested.
      target_agents: options?.persona ? [options.persona] : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return response;
}

// =============================================================================
// Collections — Direct MongoDB Read Access
// =============================================================================

/**
 * Query a MongoDB collection directly (for useCollection hook).
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
export async function queryCollection<T = Record<string, any>>(
  credentials: FlowstackCredentials,
  collection: string,
  options?: {
    filter?: Record<string, any>;
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
    projection?: Record<string, 0 | 1>;
    layer?: CollectionLayer;
    /**
     * P0-69: when true, appends `include_provenance=true` so the backend
     * returns the `_flowstack` workspace attribution envelope on every
     * document. Backend strips the envelope when this param is absent.
     */
    includeProvenance?: boolean;
  },
  config?: FlowstackClientConfig,
): Promise<ApiResponse<{ documents: T[]; count: number; total: number }>> {
  const params = new URLSearchParams();
  params.set('collection', collection);
  if (options?.filter) params.set('filter', JSON.stringify(options.filter));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.skip) params.set('skip', String(options.skip));
  if (options?.sort) params.set('sort', JSON.stringify(options.sort));
  if (options?.projection) params.set('projection', JSON.stringify(options.projection));
  if (options?.layer) params.set('layer', options.layer);
  if (options?.includeProvenance) params.set('include_provenance', 'true');

  return flowstackFetch<{ documents: T[]; count: number; total: number }>(
    `/collections/query?${params.toString()}`,
    { credentials },
    config,
  );
}

/**
 * Insert one or more documents into a MongoDB collection.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
export async function insertDocuments(
  credentials: FlowstackCredentials,
  collection: string,
  documents: Record<string, any> | Record<string, any>[],
  config?: FlowstackClientConfig,
  layer?: CollectionLayer,
): Promise<ApiResponse<{ inserted_count: number; inserted_ids: string[]; collection: string }>> {
  const isArray = Array.isArray(documents);
  return flowstackFetch<{ inserted_count: number; inserted_ids: string[]; collection: string }>(
    '/collections/insert',
    {
      method: 'POST',
      credentials,
      body: {
        collection,
        ...(isArray ? { documents } : { document: documents }),
        ...(layer ? { layer } : {}),
      },
    },
    config,
  );
}

/**
 * Update documents in a MongoDB collection matching the filter.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
export async function updateDocuments(
  credentials: FlowstackCredentials,
  collection: string,
  filter: Record<string, any>,
  update: Record<string, any>,
  options?: { upsert?: boolean },
  config?: FlowstackClientConfig,
  layer?: CollectionLayer,
): Promise<ApiResponse<{ matched_count: number; modified_count: number; collection: string }>> {
  return flowstackFetch<{ matched_count: number; modified_count: number; collection: string }>(
    '/collections/update',
    {
      method: 'POST',
      credentials,
      body: {
        collection,
        filter,
        update,
        upsert: options?.upsert ?? false,
        ...(layer ? { layer } : {}),
      },
    },
    config,
  );
}

/**
 * Delete documents from a MongoDB collection matching the filter.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
export async function deleteDocuments(
  credentials: FlowstackCredentials,
  collection: string,
  filter: Record<string, any>,
  config?: FlowstackClientConfig,
  layer?: CollectionLayer,
): Promise<ApiResponse<{ deleted_count: number; collection: string }>> {
  return flowstackFetch<{ deleted_count: number; collection: string }>(
    '/collections/delete',
    {
      method: 'POST',
      credentials,
      body: {
        collection,
        filter,
        ...(layer ? { layer } : {}),
      },
    },
    config,
  );
}

// =============================================================================
// Direct Tool Invocation
// =============================================================================

/**
 * Invoke an agent tool directly (bypasses LLM orchestration).
 */
export async function invokeTool<T = any>(
  credentials: FlowstackCredentials,
  agentName: string,
  toolName: string,
  kwargs: Record<string, any> = {},
  config?: FlowstackClientConfig,
): Promise<ApiResponse<{ status: string; result: T }>> {
  return flowstackFetch<{ status: string; result: T }>(
    '/tool/invoke',
    {
      method: 'POST',
      credentials,
      body: {
        agent_name: agentName,
        tool_name: toolName,
        kwargs,
      },
    },
    config,
  );
}

// =============================================================================
// File Upload
// =============================================================================

/**
 * Upload a file to a workspace
 */
export async function uploadFile(
  credentials: FlowstackCredentials,
  workspaceId: string,
  file: File,
  name?: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ dataset?: DatasetInfo; report?: ReportInfo }>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  if (name) {
    formData.append('name', name);
    formData.append('dataset_name', name);
  }

  try {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': credentials.userId || '',
        'X-Session-ID': workspaceId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a document (PDF/DOCX/image/etc.) to a workspace's uploads/ prefix.
 *
 * The two upload routes split by intent: `/upload` parses tabular formats into
 * a queryable DataFrame (dataset); `/upload-document` stores raw bytes for the
 * agent's `ingest_document` / `search_documents` tools. The chat input
 * accepts both kinds of file, so useAgent.query() must pick the right route
 * by extension or the backend 400s with "Unsupported file type".
 */
export async function uploadDocument(
  credentials: FlowstackCredentials,
  workspaceId: string,
  file: File,
  documentName?: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ document_name?: string; filename?: string; format?: string; size_bytes?: number; s3_key?: string }>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  if (documentName) formData.append('document_name', documentName);

  try {
    const response = await fetch(`${baseUrl}/upload-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': credentials.userId || '',
        'X-Session-ID': workspaceId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, error: errorText };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Document upload failed',
    };
  }
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Login to get session token
 */
export async function login(
  email: string,
  password: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{
  session_token: string;
  user_id: string;
  access_token?: string;
}>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/auth/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.tenantId ? { 'X-Tenant-ID': config.tenantId } : {}),
      },
      body: JSON.stringify({
        email,
        password,
        ...(config?.appScope ? { app_scope: config.appScope } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ user_id: string; message?: string; session_token?: string; tenant_id?: string }>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/auth/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.tenantId ? { 'X-Tenant-ID': config.tenantId } : {}),
      },
      body: JSON.stringify({
        email,
        password,
        skip_email_verification: true,
        ...(config?.appScope ? { app_scope: config.appScope } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Authenticate via Google OAuth authorization code.
 * Call this from the /api/auth/google/callback route after receiving the code from Google.
 */
export async function googleLogin(
  code: string,
  redirectUri: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ session_token: string; user_id: string; tenant_id?: string; expires_at?: string }>> {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/auth/google/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config?.tenantId ? { 'X-Tenant-ID': config.tenantId } : {}),
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Google login failed',
    };
  }
}

// =============================================================================
// User Management Operations
// =============================================================================

/**
 * List users in the tenant with pagination and filtering
 */
export async function listUsers(
  credentials: FlowstackCredentials,
  params?: UserListParams,
  config?: FlowstackClientConfig
): Promise<ApiResponse<UserListResponse>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;

  // Build query string
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.search) queryParams.set('search', params.search);
  if (params?.role) queryParams.set('role', params.role);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.sortBy) queryParams.set('sort_by', params.sortBy);
  if (params?.sortOrder) queryParams.set('sort_order', params.sortOrder);

  const queryString = queryParams.toString();
  const endpoint = `/tenants/${tenantId}/users${queryString ? `?${queryString}` : ''}`;

  return flowstackFetch<UserListResponse>(endpoint, { credentials }, config);
}

/**
 * Get a single user by ID
 */
export async function getUser(
  credentials: FlowstackCredentials,
  userId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ user: ManagedUser }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, { credentials }, config);
}

/**
 * Update a user's profile or role
 */
export async function updateUser(
  credentials: FlowstackCredentials,
  userId: string,
  updates: UpdateUserRequest,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ user: ManagedUser }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, {
    method: 'PATCH',
    credentials,
    body: updates,
  }, config);
}

/**
 * Delete a user permanently
 */
export async function deleteUser(
  credentials: FlowstackCredentials,
  userId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, {
    method: 'DELETE',
    credentials,
  }, config);
}

/**
 * Suspend a user account
 */
export async function suspendUser(
  credentials: FlowstackCredentials,
  userId: string,
  reason?: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ user: ManagedUser }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/suspend`, {
    method: 'POST',
    credentials,
    body: reason ? { reason } : undefined,
  }, config);
}

/**
 * Reactivate a suspended user account
 */
export async function reactivateUser(
  credentials: FlowstackCredentials,
  userId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ user: ManagedUser }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/reactivate`, {
    method: 'POST',
    credentials,
  }, config);
}

/**
 * Get user activity logs
 */
export async function getUserActivity(
  credentials: FlowstackCredentials,
  userId: string,
  limit: number = 50,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ activities: UserActivityLog[] }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/activity?limit=${limit}`, {
    credentials,
  }, config);
}

/**
 * Get user statistics for the tenant
 */
export async function getUserStats(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig
): Promise<ApiResponse<UserStats>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/stats`, { credentials }, config);
}

/**
 * Check if the current user has admin permissions to manage users
 */
export async function checkAdminPermissions(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ canManageUsers: boolean; role: string }>> {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/me/permissions`, { credentials }, config);
}

// =============================================================================
// Conversation History
// =============================================================================

/**
 * Get conversation history for a workspace/session
 */
export async function getConversationHistory(
  credentials: FlowstackCredentials,
  workspaceId: string,
  options?: { limit?: number; offset?: number },
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ messages: Array<{ role: string; content: string; timestamp: string }> }>> {
  const params = new URLSearchParams();
  params.set('session_id', workspaceId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  return flowstackFetch(
    `/conversations?${params.toString()}`,
    { method: 'GET', credentials },
    config
  );
}

// =============================================================================
// Sites — Published websites and CDN management
// =============================================================================

export interface CreateSiteParams {
  name: string;
  siteType?: 'on_demand' | 'daily' | 'js_build';
  description?: string;
  files?: Record<string, string>;
}

/**
 * List all published sites for the current user
 */
export async function listSites(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ sites: PublishedSiteInfo[]; count: number }>> {
  return flowstackFetch('/api/v1/sites', { method: 'GET', credentials }, config);
}

/**
 * Get a single published site by ID
 */
export async function getSite(
  credentials: FlowstackCredentials,
  siteId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ site: PublishedSiteInfo }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}`, { method: 'GET', credentials }, config);
}

/**
 * Create a new site. If files are provided, publishes immediately.
 * Otherwise creates a staging area for incremental file uploads.
 */
export async function createSite(
  credentials: FlowstackCredentials,
  params: CreateSiteParams,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ site?: PublishedSiteInfo; site_id?: string; mode?: string }>> {
  return flowstackFetch('/api/v1/sites', {
    method: 'POST',
    credentials,
    body: {
      site_name: params.name,
      site_type: params.siteType || 'on_demand',
      description: params.description,
      files: params.files,
    },
  }, config);
}

/**
 * Add or update a single file in a site's staging area.
 * Call this for each file, then publishStagedSite() to deploy.
 */
export async function addSiteFile(
  credentials: FlowstackCredentials,
  siteId: string,
  filePath: string,
  content: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/files/${filePath}`, {
    method: 'PUT',
    credentials,
    body: { content },
  }, config);
}

/**
 * Publish a staged site to CDN. Call after adding all files with addSiteFile().
 */
export async function publishStagedSite(
  credentials: FlowstackCredentials,
  siteId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ site: PublishedSiteInfo }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/publish`, {
    method: 'POST',
    credentials,
  }, config);
}

/**
 * Delete a published site and all its files from CDN
 */
export async function deleteSite(
  credentials: FlowstackCredentials,
  siteId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}`, {
    method: 'DELETE',
    credentials,
  }, config);
}

// =============================================================================
// Site Versioning
// =============================================================================

export async function getSiteVersions(
  credentials: FlowstackCredentials,
  siteId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<SiteVersionManifest>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/versions`, {
    method: 'GET',
    credentials,
  }, config);
}

export async function promoteSiteVersion(
  credentials: FlowstackCredentials,
  siteId: string,
  version: number,
  config?: FlowstackClientConfig
): Promise<ApiResponse<SiteVersionManifest>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/promote`, {
    method: 'POST',
    credentials,
    body: { version },
  }, config);
}

export async function deleteSiteVersion(
  credentials: FlowstackCredentials,
  siteId: string,
  version: number,
  config?: FlowstackClientConfig
): Promise<ApiResponse<SiteVersionManifest>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/versions/${version}`, {
    method: 'DELETE',
    credentials,
  }, config);
}

// =============================================================================
// Site Aliases
// =============================================================================

export async function setSiteAlias(
  credentials: FlowstackCredentials,
  siteId: string,
  alias: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ alias: string; url: string }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/alias`, {
    method: 'POST',
    credentials,
    body: { alias },
  }, config);
}

export async function removeSiteAlias(
  credentials: FlowstackCredentials,
  siteId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/alias`, {
    method: 'DELETE',
    credentials,
  }, config);
}

// =============================================================================
// Publish to GitHub
// =============================================================================

export async function publishToGitHub(
  credentials: FlowstackCredentials,
  siteId: string,
  params: PublishToGitHubParams,
  config?: FlowstackClientConfig
): Promise<ApiResponse<PublishToGitHubResult>> {
  return flowstackFetch(`/api/v1/sites/${siteId}/publish-github`, {
    method: 'POST',
    credentials,
    body: {
      repo_name: params.repoName,
      private: params.isPrivate ?? true,
      ...(params.version != null ? { version: params.version } : {}),
    },
  }, config);
}

// =============================================================================
// GitHub Repository Import
// =============================================================================

export async function listGitHubRepos(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ repos: GitHubRepo[] }>> {
  return flowstackFetch('/api/v1/github/repos', {
    credentials,
  }, config);
}

export async function importFromGitHub(
  credentials: FlowstackCredentials,
  params: { repoFullName: string; branch?: string; workspaceId?: string },
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ files_imported: number }>> {
  return flowstackFetch('/api/v1/github/import', {
    method: 'POST',
    credentials,
    body: params,
  }, config);
}

// =============================================================================
// PII Settings
// =============================================================================

export async function getPiiSettings(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ settings: PiiSettings }>> {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-settings`, {
    credentials,
  }, config);
}

export async function updatePiiSettings(
  credentials: FlowstackCredentials,
  workspaceId: string,
  settings: PiiSettings,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean }>> {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-settings`, {
    method: 'PUT',
    credentials,
    body: settings,
  }, config);
}

// P0-57: PII preview — detect entities without masking
export async function previewPiiMasking(
  credentials: FlowstackCredentials,
  query: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ entities: PiiRedactedEntity[] }>> {
  // Guard: skip if credentials not yet loaded (prevents "Not enough segments" 401 spam
  // when built apps call this on mount before Privy has issued a valid token)
  if (!credentials?.apiKey || credentials.apiKey.split('.').length !== 3) {
    return { ok: false, error: 'Not authenticated', status: 401 };
  }
  return flowstackFetch('/stream/pii-preview', {
    method: 'POST',
    credentials,
    body: { query },
  }, config);
}

// P0-57: PII allowlist CRUD
export async function getPiiAllowlist(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ allowlist: Array<{ term: string; entity_type: string }> }>> {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    credentials,
  }, config);
}

export async function addPiiAllowlistTerm(
  credentials: FlowstackCredentials,
  workspaceId: string,
  term: string,
  entityType: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean; allowlist: Array<{ term: string; entity_type: string }> }>> {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    method: 'POST',
    credentials,
    body: { term, entity_type: entityType },
  }, config);
}

export async function removePiiAllowlistTerm(
  credentials: FlowstackCredentials,
  workspaceId: string,
  term: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ success: boolean; allowlist: Array<{ term: string; entity_type: string }> }>> {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    method: 'DELETE',
    credentials,
    body: { term },
  }, config);
}

// =============================================================================
// User Data Explorer
// =============================================================================

export async function getUserDataOverview(
  credentials: FlowstackCredentials,
  config?: FlowstackClientConfig
): Promise<ApiResponse<UserDataOverview>> {
  return flowstackFetch('/api/v1/user/data-overview', {
    credentials,
  }, config);
}

export async function getUserCollections(
  credentials: FlowstackCredentials,
  params?: { siteId?: string; includeSchema?: boolean },
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ collections: UserCollectionInfo[]; grouped_by_site: Record<string, UserCollectionInfo[]> }>> {
  const query = new URLSearchParams();
  if (params?.siteId) query.set('site_id', params.siteId);
  if (params?.includeSchema) query.set('include_schema', 'true');
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections${qs ? `?${qs}` : ''}`, {
    credentials,
  }, config);
}

export async function getUserCollectionDocuments<T = Record<string, any>>(
  credentials: FlowstackCredentials,
  collection: string,
  params?: { filter?: Record<string, any>; limit?: number; skip?: number; sort?: Record<string, 1 | -1>; database?: string },
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ documents: T[]; total: number }>> {
  const query = new URLSearchParams();
  if (params?.filter) query.set('filter', JSON.stringify(params.filter));
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.skip != null) query.set('skip', String(params.skip));
  if (params?.sort) query.set('sort', JSON.stringify(params.sort));
  if (params?.database) query.set('database', params.database);
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/documents${qs ? `?${qs}` : ''}`, {
    credentials,
  }, config);
}

export async function getUserCollectionSchema(
  credentials: FlowstackCredentials,
  collection: string,
  params?: { database?: string; sampleSize?: number },
  config?: FlowstackClientConfig
): Promise<ApiResponse<CollectionSchemaInfo>> {
  const query = new URLSearchParams();
  if (params?.database) query.set('database', params.database);
  if (params?.sampleSize != null) query.set('sample_size', String(params.sampleSize));
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/schema${qs ? `?${qs}` : ''}`, {
    credentials,
  }, config);
}

export async function deleteUserCollection(
  credentials: FlowstackCredentials,
  collection: string,
  config?: FlowstackClientConfig
): Promise<ApiResponse<{ deleted: boolean; collection: string }>> {
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}?confirm=true`, {
    method: 'DELETE',
    credentials,
  }, config);
}

export async function exportUserCollection(
  credentials: FlowstackCredentials,
  collection: string,
  params?: { format?: 'json' | 'csv'; filter?: Record<string, any>; database?: string },
  config?: FlowstackClientConfig
): Promise<ApiResponse<Blob>> {
  const query = new URLSearchParams();
  if (params?.database) query.set('database', params.database);
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/export${qs ? `?${qs}` : ''}`, {
    method: 'POST',
    credentials,
    body: {
      format: params?.format || 'json',
      filter: params?.filter || null,
    },
  }, config);
}
