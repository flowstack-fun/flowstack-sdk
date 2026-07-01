/**
 * Flowstack SDK Type Definitions
 * Complete Backend-as-a-Service types for AI-powered apps
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Main SDK configuration
 */
export interface FlowstackConfig {
  /** JWT secret for token signing/verification.
   *  Optional for built apps using the broker auth flow (BrokeredLoginButton). */
  jwtSecret?: string;
  /** Secret for password hashing.
   *  Optional for built apps using the broker auth flow (BrokeredLoginButton). */
  passwordSecret?: string;
  /** Flowstack API base URL (default: https://sage-api.flowstack.fun) */
  baseUrl?: string;
  /** Tenant ID (default: shared tenant) */
  tenantId?: string;
  /** Auth providers configuration */
  auth?: AuthConfig;
  /** Redis cache configuration */
  redis?: RedisConfig;
  /** Database configuration for user accounts */
  database?: DatabaseConfig;
  /** Default agent template */
  agentTemplate?: AgentTemplate;
  /** Base URL for standalone agent service (e.g., openai-agent ALB endpoint) */
  agentServiceUrl?: string;
  /** Credential storage strategy */
  storage?: 'local' | 'session';
  /** SDK mode: production (default), development (relaxed validation), or mock (uses fixtures) */
  mode?: 'production' | 'development' | 'mock';
  /** Privy embedded wallet config (enables email/Google signup with auto-wallet) */
  privyConfig?: { appId: string };
  /** Blockchain chain for INFER token integration */
  chain?: 'arbitrum-sepolia' | 'arbitrum';
  /** MoonPay/Transak fiat on-ramp config */
  onRampConfig?: { apiKey: string; environment: 'sandbox' | 'production' };
  /** App scope (site_id) for built apps — scopes user data to this app's MongoDB collections.
   *  Set automatically by the site builder. When present, login/register embeds it in the JWT
   *  and all MongoDB operations are scoped to {appScope}__* collections. */
  appScope?: string;
}

export interface AuthConfig {
  /** Enabled auth providers */
  providers: ('email' | 'google')[];
  /** Google OAuth client ID */
  googleClientId?: string;
  /** Google OAuth client secret (server-side only) */
  googleClientSecret?: string;
  /** Require email verification */
  emailVerification?: boolean;
  /** Minimum password length (default: 8) */
  passwordMinLength?: number;
}

export interface RedisConfig {
  /** Upstash Redis REST URL */
  url: string;
  /** Upstash Redis REST token */
  token: string;
}

export interface DatabaseConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase service role key */
  supabaseKey: string;
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * User information for authentication
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Tenant ID the user belongs to */
  tenantId: string;
  /** Token expiration (ISO timestamp) */
  expiresAt?: string;
}

/**
 * User credentials stored after authentication
 */
export interface FlowstackCredentials {
  /** JWT session token */
  apiKey: string;
  /** Tenant ID */
  tenantId: string;
  /** User ID for isolation */
  userId?: string;
  /** User email */
  email?: string;
  /** Token expiration (ISO timestamp) */
  expiresAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  email?: string;
  tenantId?: string;
  userId?: string;
  expiresAt?: string;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  requiresVerification?: boolean;
  error?: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  sessionToken?: string;
  email?: string;
  tenantId?: string;
  userId?: string;
  expiresAt?: string;
  error?: string;
}

// =============================================================================
// Session & Workspace
// =============================================================================

export interface SessionState {
  sessionId: string | null;
  workspaceId: string | null;
  isConnected: boolean;
  lastActivity: Date | null;
}

export interface WorkspaceInfo {
  workspaceId: string;
  name: string;
  description?: string;
  datasetCount: number;
  visualizationCount: number;
  modelCount: number;
  createdAt: string;
  lastAccessed: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

// =============================================================================
// Datasets
// =============================================================================

export interface DatasetInfo {
  id: string;
  name: string;
  rows: number;
  columns: number;
  schema?: Record<string, ColumnSchema>;
  columnNames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ColumnSchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  nullable: boolean;
  unique?: boolean;
}

export interface DatasetRow {
  [key: string]: unknown;
}

export type DatasetCellValue = string | number | boolean | null;

export interface DatasetPreview {
  columns: string[];
  rows: DatasetCellValue[][];
}

export interface DatasetStreamOptions {
  limit?: number;
  offset?: number;
}

// =============================================================================
// Visualizations
// =============================================================================

export interface VisualizationData {
  name: string;
  type?: string;
  imageUrl?: string;
  imageBase64?: string;
  format?: 'png' | 'jpeg' | 'svg' | 'html' | string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Reports
// =============================================================================

export interface ReportInfo {
  id: string;
  name: string;
  format: string;
  url: string;
  size?: number;
  createdAt?: string;
}

// =============================================================================
// Published Sites
// =============================================================================

export interface PublishedSiteInfo {
  id: string;
  name: string;
  url: string;
  shortUrl?: string;
  siteType: 'on_demand' | 'daily' | 'js_build';
  fileCount: number;
  totalBytes?: number;
  createdAt: string;
  expiresAt?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  currentVersion?: number;
  liveVersion?: number;
  subdomainUrl?: string;
  alias?: string | null;
}

export interface CreateSiteParams {
  name: string;
  siteType?: 'on_demand' | 'daily' | 'js_build';
  description?: string;
  files?: Record<string, string>;
}

export interface UseSitesReturn {
  sites: PublishedSiteInfo[];
  isLoading: boolean;
  error: string | null;
  createSite: (params: CreateSiteParams) => Promise<PublishedSiteInfo | null>;
  addFile: (siteId: string, path: string, content: string) => Promise<boolean>;
  publishSite: (siteId: string) => Promise<PublishedSiteInfo | null>;
  deleteSite: (siteId: string) => Promise<boolean>;
  refreshSites: () => Promise<void>;
}

// =============================================================================
// Site Versioning
// =============================================================================

export interface SiteVersion {
  version: number;
  type: 'build' | 'edit';
  createdAt: string;
  description?: string;
  fileCount: number;
  totalBytes: number;
  url: string;
}

export interface SiteVersionManifest {
  siteId: string;
  name: string;
  liveVersion: number;
  versions: SiteVersion[];
  alias?: string | null;
  githubRepo?: {
    owner: string;
    repo: string;
    url: string;
  } | null;
}

export interface UseSiteVersionsReturn {
  versions: SiteVersion[];
  liveVersion: number | null;
  isLoading: boolean;
  error: string | null;
  promote: (version: number) => Promise<boolean>;
  deleteVersion: (version: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export interface PublishToGitHubParams {
  repoName: string;
  isPrivate?: boolean;
  version?: number;
}

export interface PublishToGitHubResult {
  repoUrl: string;
  commitSha: string;
}

// =============================================================================
// Agent Discovery
// =============================================================================

export interface AgentInfo {
  /** Agent identifier (used in targetAgent parameter) */
  name: string;
  /** Human-readable description of what this agent does */
  description: string;
  /** Tools available to this agent */
  tools: string[];
  /** Example phrases that trigger this agent */
  triggerPhrases: string[];
  /** Use cases this agent handles */
  useFor: string[];
  /** Whether this agent owns its full pipeline (never hands off) */
  isTerminal: boolean;
}

export interface UseAgentsReturn {
  /** Available agents */
  agents: AgentInfo[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh the agent list */
  refreshAgents: () => Promise<void>;
}

// =============================================================================
// ML Models
// =============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  format: string;
  size_bytes: number;
  last_modified?: string;
  download_url?: string;
  metadata?: Record<string, unknown>;
  s3_key?: string;
}

// =============================================================================
// Scripts
// =============================================================================

export interface ScriptInfo {
  name: string;
  extension: string;
  size_bytes?: number;
  created_at?: string;
  modified_at?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Data Sources
// =============================================================================

export type DataSourceType = 'mongodb' | 'postgresql' | 's3';

export interface DataSource {
  source_id: string;
  tenant_id: string;
  source_type: DataSourceType;
  name: string;
  auth_method: string;
  is_tenant_wide: boolean;
  user_id?: string;
  credentials_preview?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at?: number;
}

export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  connectionString?: string;
  auth_method?: string;
  credentials?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  is_tenant_wide?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Chat & Messages
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  visualizations?: VisualizationData[];
  searchResults?: SearchResultsData[];
  isStreaming?: boolean;
  /** Live status text shown during streaming (tool progress, agent status) */
  statusLine?: string;
  /** P0-57: PII entities that were masked in this message (user messages only) */
  piiRedacted?: PiiRedactedEntity[];
  /** Filenames the user attached when sending this message (user messages only).
   *  Set by useAgent.query() after a successful upload so the chat UI can
   *  render an attachment chip on the persisted message. */
  attachmentNames?: string[];
}

/**
 * Input shape accepted by `useAgent.query()` for file attachments. Either a
 * native `File` (preferred — no double-encode) or an already-base64-encoded
 * payload matching the chat-input wire format. The SDK uploads each one to
 * the workspace via `/upload` before streaming and prepends the resolved
 * dataset names to the prompt so the agent grounds on the right file
 * instead of rummaging the user's library.
 */
export type AttachmentInput =
  | File
  | { filename: string; content_type: string; data: string };

export interface ToolCall {
  id: string;
  toolUseId?: string;
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  agentResponse?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
}

export interface SearchResult {
  rank: number;
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResultsData {
  search_id: string;
  query: string;
  result_count: number;
  results: SearchResult[];
  answer?: string;
}

// =============================================================================
// Streaming Events
// =============================================================================

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  tool?: string;
  toolUseId?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  /** P0-132 (G1): backend emits the tool's return value under `content` and an
   *  `is_error` flag on `tool_result` events. Surfaced here so useAgent can mark
   *  failed tool calls as 'error' instead of silently 'complete'. */
  isError?: boolean;
  error?: string;
  data?: unknown;
  message?: string;
  percentage?: number;
}

export type StreamEventType =
  | 'content'
  | 'text'
  | 'delta'
  | 'metadata'
  | 'tool_call'
  | 'tool_use'
  | 'tool_result'
  | 'visualization'
  | 'progress'
  | 'stage'
  | 'credit_status'
  | 'budget_update'
  | 'complete'
  | 'done'
  | 'error'
  | 'interrupt';

export interface InterruptInfo {
  reason: string;
  timestamp?: number;
}

export interface DataSourceBadgeInfo {
  source_id: string;
  type: string;
  name: string;
}

// =============================================================================
// Agent Templates
// =============================================================================

export type AgentTemplate = 'data-science' | 'marketing' | 'support' | 'custom';

export interface AgentConfig {
  template: AgentTemplate;
  systemPrompt?: string;
  tools?: string[];
  streaming?: boolean;
  networkMode?: 'SANDBOX' | 'PUBLIC';
}

// =============================================================================
// Query Execution
// =============================================================================

export interface QueryOptions {
  workspaceId?: string;
  networkMode?: 'SANDBOX' | 'PUBLIC';
  tools?: string[];
}

// =============================================================================
// Usage & Credits
// =============================================================================

export interface UsageStats {
  today: UsagePeriod;
  thisMonth: UsagePeriod;
  allTime: UsagePeriod;
}

export interface UsagePeriod {
  analyses: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CreditStatus {
  remaining: number;
  used: number;
  total: number;
  purchasedRemaining?: number;
}

// =============================================================================
// Hook Return Types
// =============================================================================

export interface UseAuthReturn {
  /** User information (preferred over credentials) */
  user: User | null;
  /** Raw credentials (maintained for backward compatibility) */
  credentials: FlowstackCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  googleSignIn: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

export interface UseWorkspaceReturn {
  workspaces: WorkspaceInfo[];
  selectedWorkspace: WorkspaceInfo | null;
  isLoading: boolean;
  error: string | null;
  createWorkspace: (name: string, description?: string) => Promise<WorkspaceInfo | null>;
  selectWorkspace: (workspace: WorkspaceInfo) => void;
  refreshWorkspaces: () => Promise<void>;
}

export interface UseDatasetsReturn {
  datasets: DatasetInfo[];
  isLoading: boolean;
  error: string | null;
  uploadDataset: (file: File, name?: string) => Promise<DatasetInfo | null>;
  downloadDataset: (name: string) => Promise<Blob | null>;
  deleteDataset: (name: string) => Promise<boolean>;
  refreshDatasets: () => Promise<void>;
}

export interface UseVisualizationsReturn {
  visualizations: VisualizationData[];
  isLoading: boolean;
  error: string | null;
  refreshVisualizations: () => Promise<void>;
}

export interface UseReportsReturn {
  reports: ReportInfo[];
  isLoading: boolean;
  error: string | null;
  uploadReport: (file: File, name?: string) => Promise<ReportInfo | null>;
  downloadReport: (url: string, name: string, format: string) => Promise<Blob | null>;
  refreshReports: () => Promise<void>;
}

export interface UseModelsReturn {
  models: ModelInfo[];
  isLoading: boolean;
  error: string | null;
  downloadModel: (name: string) => Promise<Blob | null>;
  refreshModels: () => Promise<void>;
}

export interface UseDataSourcesReturn {
  dataSources: DataSource[];
  isLoading: boolean;
  error: string | null;
  createDataSource: (config: DataSourceConfig) => Promise<DataSource | null>;
  testConnection: (id: string) => Promise<ConnectionTestResult>;
  deleteDataSource: (id: string) => Promise<boolean>;
  refreshDataSources: () => Promise<void>;
}

export interface UseAgentOptions {
  /** Tool whitelist — when provided, only these tools are available to the agent */
  tools?: string[];
  /** @deprecated Strands swarm removed in P0-73. Pass `capabilities` instead
   *  to pre-load tool categories for built apps. This field is ignored
   *  server-side but kept in the type so older built-app bundles that
   *  still pass it continue to compile. */
  targetAgent?: string;
  /** @deprecated Strands swarm removed in P0-73. Use `capabilities` instead.
   *  This field is silently ignored by /mono/stream — the SDK no longer
   *  forwards it. Kept in the type for back-compat with frozen bundles. */
  targetAgents?: string[];
  /** P0-80: pre-declare the tool categories a built app needs. The SDK forwards
   *  these to /mono/stream, and the backend seeds `state.loaded_categories`
   *  before the first LLM turn so the agent has the right tools available
   *  immediately (no meta-tool discovery step). Values are meta-tool names:
   *    'site_operations' | 'data_access' | 'external_integration'
   *    | 'code_execution' | 'domain_task' | 'workspace_management'
   *  Omit or pass an empty array to let the agent discover tools on demand. */
  capabilities?: string[];
  /** Query mode hint — "chat" forces text-only responses, "build" allows the
   *  full build/edit pipeline. Defaults to auto-detected from the message
   *  content when omitted. Added in P0-66 to unblock MobileChat.tsx and other
   *  consumers that want to lock the agent into chat-only behavior. */
  mode?: 'chat' | 'build' | 'edit' | 'auto';
  /** P0-132 (G5): inline system-prompt override forwarded to the backend as
   *  `system_prompt_override`. Lets a hook instance run an inline persona prompt
   *  without registering a separate agent. Previously dropped by useAgent even
   *  though the wire/client already supported it. */
  systemPrompt?: string;
  /** P0-132 (G4): target a specific registered persona/subagent by name. Maps to
   *  `target_agents` on the wire. Without this, the backend auto-selects the first
   *  registered subagent, so multi-persona apps could only ever reach one. This
   *  re-enables persona selection only — it does NOT revive the removed Strands
   *  swarm (distinct from the deprecated `targetAgents` field above). */
  persona?: string;
  /** P0-132 (G4): alias for `persona`. Either may be used; `persona` wins if both
   *  are set. */
  agentName?: string;
  /** P0-132 (G8): namespaces this hook instance's conversation/session storage so
   *  independent surfaces (e.g. an interview chat and a matchmaker) keep separate
   *  conversations instead of sharing one tenant-wide session (which caused
   *  cross-talk). Pass a STABLE string per surface (e.g. 'interview') to preserve
   *  that surface's history across page refreshes. Omit to keep the legacy
   *  tenant-shared session (back-compatible default). */
  sessionKey?: string;
}

export interface UseAgentReturn {
  query: (prompt: string, attachments?: AttachmentInput[], allowedTerms?: string[]) => Promise<void>;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  toolCalls: ToolCall[];
  error: string | null;
  pendingInterrupts?: InterruptInfo[] | null;
  connectedDataSources: DataSourceBadgeInfo[];
  clearMessages: () => void;
  /** Start a genuinely new backend conversation (sends force_new_session=true). */
  startNewSession: () => void;
  cancelQuery: () => void;
  interruptAgent: () => Promise<void>;
  respondToInterrupt: (message: string) => Promise<void>;
}

export interface UseQueryReturn {
  execute: (prompt: string, options?: QueryOptions) => Promise<void>;
  isStreaming: boolean;
  result: string | null;
  toolCalls: ToolCall[];
  visualizations: VisualizationData[];
  error: string | null;
  cancel: () => void;
}

// =============================================================================
// User Management (Admin)
// =============================================================================

/**
 * User role levels for tenant management
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * User account status
 */
export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deactivated';

/**
 * Activity types for user activity logs
 */
export type UserActivityType =
  | 'login'
  | 'logout'
  | 'register'
  | 'password_reset'
  | 'profile_update'
  | 'workspace_create'
  | 'workspace_access'
  | 'dataset_upload'
  | 'query_execute'
  | 'api_call';

/**
 * Managed user - extended user info for admin management
 */
export interface ManagedUser {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Display name (optional) */
  name?: string;
  /** User's role in the tenant */
  role: UserRole;
  /** Account status */
  status: UserStatus;
  /** Tenant ID the user belongs to */
  tenantId: string;
  /** Account creation timestamp (ISO) */
  createdAt: string;
  /** Last login timestamp (ISO) */
  lastLoginAt?: string;
  /** Last activity timestamp (ISO) */
  lastActivityAt?: string;
  /** Profile image URL */
  avatarUrl?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User activity log entry
 */
export interface UserActivityLog {
  /** Activity ID */
  id: string;
  /** User who performed the action */
  userId: string;
  /** Type of activity */
  activityType: UserActivityType;
  /** Human-readable description */
  description: string;
  /** Activity timestamp (ISO) */
  timestamp: string;
  /** Related resource (workspace, dataset, etc.) */
  resourceType?: string;
  resourceId?: string;
  /** Additional context */
  metadata?: Record<string, unknown>;
  /** IP address (if available) */
  ipAddress?: string;
}

/**
 * Request to update a managed user
 */
export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Tenant-level user statistics
 */
export interface UserStats {
  /** Total registered users */
  totalUsers: number;
  /** Active users (logged in within 30 days) */
  activeUsers: number;
  /** Users by role */
  usersByRole: Record<UserRole, number>;
  /** Users by status */
  usersByStatus: Record<UserStatus, number>;
  /** New users this month */
  newUsersThisMonth: number;
  /** Daily active users (last 7 days) */
  dailyActiveUsers: number[];
}

/**
 * Pagination parameters for user lists
 */
export interface UserListParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default 20, max 100) */
  limit?: number;
  /** Filter by role */
  role?: UserRole;
  /** Filter by status */
  status?: UserStatus;
  /** Search by email or name */
  search?: string;
  /** Sort field */
  sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'name';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated user list response
 */
export interface UserListResponse {
  users: ManagedUser[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Return type for useUserManagement hook
 */
export interface UseUserManagementReturn {
  /** List of managed users */
  users: ManagedUser[];
  /** User statistics */
  stats: UserStats | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Pagination state */
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
  };
  /** Refresh user list */
  refreshUsers: (params?: UserListParams) => Promise<void>;
  /** Get user by ID */
  getUser: (userId: string) => Promise<ManagedUser | null>;
  /** Update user details */
  updateUser: (userId: string, updates: UpdateUserRequest) => Promise<boolean>;
  /** Suspend a user */
  suspendUser: (userId: string, reason?: string) => Promise<boolean>;
  /** Reactivate a suspended user */
  reactivateUser: (userId: string) => Promise<boolean>;
  /** Delete a user (permanent) */
  deleteUser: (userId: string) => Promise<boolean>;
  /** Get user activity logs */
  getUserActivity: (userId: string, limit?: number) => Promise<UserActivityLog[]>;
  /** Refresh statistics */
  refreshStats: () => Promise<void>;
  /** Set current page */
  setPage: (page: number) => void;
  /** Set search query */
  setSearch: (search: string) => void;
  /** Set role filter */
  setRoleFilter: (role: UserRole | null) => void;
  /** Set status filter */
  setStatusFilter: (status: UserStatus | null) => void;
  /** Current admin user has permission */
  canManageUsers: boolean;
}

// =============================================================================
// Provider Credentials
// =============================================================================

export const LLM_PROVIDERS = ['anthropic', 'openai', 'gemini', 'deepseek', 'xai', 'ollama'] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];

/**
 * One platform credential a user can pin via /user/model-preference.
 * Mirrors the backend ModelOption pydantic model in user_preferences.py.
 */
export interface ModelOption {
  credential_id: string;
  provider: string;
  model_id: string;
  purpose: string;
  is_default: boolean;
}

/**
 * The user's resolved model preference state. `is_auto=true` means no
 * pinned cred — runtime resolver falls back to the tenant's purpose default.
 */
export interface ModelPreferenceState {
  preferred_credential_id: string | null;
  resolved_provider: string | null;
  resolved_model_id: string | null;
  is_auto: boolean;
}

/**
 * Tenant-admin platform credential — what `/admin/provider-credentials`
 * lists. `masked_key` is `XXXX…last4` for display.
 */
export interface AdminProviderCredential {
  credential_id: string;
  provider: string;
  purpose: string;
  scope: string;
  model_id: string;
  is_default: boolean;
  masked_key: string;
  created_at: number;
  updated_at?: number;
}

/**
 * Non-platform credential already owned by the tenant — candidate for
 * promotion into the platform pool via `/admin/provider-credentials/promote`.
 */
export interface ExistingProviderCredential {
  credential_id: string;
  tenant_id: string;
  provider: string;
  purpose: string;
  scope: string;
  model_id: string;
  is_default: boolean;
  api_key_preview: string;
  created_at?: number;
}

export interface CreateAdminProviderCredentialInput {
  provider: LLMProvider | string;
  api_key: string;
  model_id?: string;
  purpose?: string;
  is_default?: boolean;
}

/**
 * Credential purposes after the P0-68 collapse. Only `default` and
 * `code_sandbox` are actively used by MonoSage. Legacy purposes remain
 * in the union for back-compat — reads resolve them to `default` server-side
 * and writes are still accepted, but new code should target `default`.
 */
export const CREDENTIAL_PURPOSES = [
  'default',
  'code_sandbox',
  // Legacy — resolved to `default` by the provider_credentials_service shim
  'llm',
  'swarm',
  'thinking',
  'data_operations',
  'visualization',
  'google_marketing',
  'site_builder',
  'site_planner',
  'site_style',
  'site_data_integrator',
  'daily_brief',
  'js_builder',
  'site_patch',
  'code_interpreter',
] as const;
export type CredentialPurpose = (typeof CREDENTIAL_PURPOSES)[number];

export interface ProviderCredential {
  credential_id: string;
  provider: LLMProvider;
  model_id: string;
  purpose: string;
  is_default: boolean;
  api_key?: string;
  host?: string;
  model_settings?: ProviderModelSettings;
  created_at?: string;
}

export interface ProviderModelSettings {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  [key: string]: unknown;
}

/** Sensible defaults for model settings. */
export const DEFAULT_PROVIDER_MODEL_SETTINGS: ProviderModelSettings = {
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1.0,
};

/** Runtime type guard for ProviderCredential objects. */
export function isProviderCredential(value: unknown): value is ProviderCredential {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.credential_id === 'string' &&
    typeof obj.provider === 'string' &&
    typeof obj.model_id === 'string' &&
    typeof obj.purpose === 'string' &&
    typeof obj.is_default === 'boolean'
  );
}

// =============================================================================
// Collection Layers (P0-27)
// =============================================================================

export const COLLECTION_LAYERS = ['shared', 'user', 'auto'] as const;
export type CollectionLayer = (typeof COLLECTION_LAYERS)[number];

export interface PurposeInfo {
  purpose: string;
  label: string;
  description: string;
  default_provider?: LLMProvider;
}

// =============================================================================
// Ollama Local Inference
// =============================================================================

export interface OllamaLocalModel {
  name: string;
  size: number;
  modified_at: string;
  digest?: string;
}

export interface OllamaStatus {
  available: boolean;
  host: string;
  models: OllamaLocalModel[];
  error?: string;
}

// =============================================================================
// Collection Explorer
// =============================================================================

export interface CollectionSchemaInfo {
  fields: { name: string; type: string }[];
}

export interface UserCollectionInfo {
  full_name: string;
  name: string;
  database: string;
  doc_count: number;
  site_name?: string;
  data_tier?: string;
  scope?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export interface ListResponse<T> {
  items: T[];
  totalCount: number;
  hasMore?: boolean;
  cached?: boolean;
}

// =============================================================================
// Context Value
// =============================================================================

/**
 * Full context value provided by FlowstackProvider
 */
export interface FlowstackContextValue {
  // Configuration
  config: FlowstackConfig;

  // Authentication
  credentials: FlowstackCredentials | null;
  setCredentials: (creds: FlowstackCredentials | null) => void;
  isAuthenticated: boolean;
  isInitialized: boolean;
  logout: () => void;

  // Session
  session: SessionState;

  // Workspaces
  workspaces: WorkspaceInfo[];
  selectedWorkspace: WorkspaceInfo | null;
  setSelectedWorkspace: (workspace: WorkspaceInfo | null) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<WorkspaceInfo | null>;
  isLoadingWorkspaces: boolean;

  // Chat Messages
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Query State
  isQueryRunning: boolean;
  setIsQueryRunning: (running: boolean) => void;
  queryStartTime: number | null;
  setQueryStartTime: (time: number | null) => void;

  // Datasets
  datasets: DatasetInfo[];
  setDatasets: (datasets: DatasetInfo[]) => void;
  refreshDatasets: () => Promise<void>;
  isLoadingDatasets: boolean;

  // Visualizations
  visualizations: VisualizationData[];
  setVisualizations: (vizs: VisualizationData[]) => void;
  addVisualization: (viz: VisualizationData) => void;
  refreshVisualizations: () => Promise<void>;
  isLoadingVisualizations: boolean;
  clearVisualizations: () => void;

  // Reports
  reports: ReportInfo[];
  refreshReports: () => Promise<void>;
  isLoadingReports: boolean;

  // Models
  models: ModelInfo[];
  refreshModels: () => Promise<void>;
  isLoadingModels: boolean;

  // Scripts
  scripts: ScriptInfo[];
  refreshScripts: () => Promise<void>;
  isLoadingScripts: boolean;

  // UI State
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: 'chat' | 'datasets' | 'visualizations' | 'reports' | 'models';
  setActiveTab: (tab: 'chat' | 'datasets' | 'visualizations' | 'reports' | 'models') => void;
}

// =============================================================================
// Data Explorer
// =============================================================================

export interface UserDataOverviewWorkspace {
  workspace_id: string;
  name?: string;
  artifact_counts?: Record<string, number>;
}

export interface UserDataOverview {
  workspaces: UserDataOverviewWorkspace[];
  sites: { site_id: string; name: string }[];
  mongodb_summary: { total_collections: number; total_documents: number };
}

// =============================================================================
// GitHub Integration
// =============================================================================

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  language?: string;
  default_branch: string;
}

// =============================================================================
// PII Settings
// =============================================================================

export interface PiiEntitySettings {
  [entityType: string]: boolean;
}

export interface PiiSettings {
  query_masking?: {
    enabled?: boolean;
    entity_types?: PiiEntitySettings;
  };
  file_masking?: {
    enabled?: boolean;
  };
}

/** P0-57: Detailed report of a single PII entity detected/masked in a query. */
export interface PiiRedactedEntity {
  entity_type: string;
  /** Original text that was masked. Partially redacted for ALWAYS_MASK types (SSN, CC). */
  original_text: string;
  start: number;
  end: number;
  score: number;
  is_always_masked: boolean;
  /** Whether this entity will actually be masked given current settings. (Preview only) */
  will_mask?: boolean;
}
