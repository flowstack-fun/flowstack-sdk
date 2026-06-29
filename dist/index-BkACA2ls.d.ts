/**
 * Flowstack SDK Type Definitions
 * Complete Backend-as-a-Service types for AI-powered apps
 */
/**
 * Main SDK configuration
 */
interface FlowstackConfig {
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
    redis?: RedisConfig$1;
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
    privyConfig?: {
        appId: string;
    };
    /** Blockchain chain for INFER token integration */
    chain?: 'arbitrum-sepolia' | 'arbitrum';
    /** MoonPay/Transak fiat on-ramp config */
    onRampConfig?: {
        apiKey: string;
        environment: 'sandbox' | 'production';
    };
    /** App scope (site_id) for built apps — scopes user data to this app's MongoDB collections.
     *  Set automatically by the site builder. When present, login/register embeds it in the JWT
     *  and all MongoDB operations are scoped to {appScope}__* collections. */
    appScope?: string;
}
interface AuthConfig {
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
interface RedisConfig$1 {
    /** Upstash Redis REST URL */
    url: string;
    /** Upstash Redis REST token */
    token: string;
}
interface DatabaseConfig {
    /** Supabase project URL */
    supabaseUrl: string;
    /** Supabase service role key */
    supabaseKey: string;
}
/**
 * User information for authentication
 */
interface User {
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
interface FlowstackCredentials {
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
interface LoginRequest {
    email: string;
    password: string;
}
interface LoginResponse {
    success: boolean;
    sessionToken?: string;
    email?: string;
    tenantId?: string;
    userId?: string;
    expiresAt?: string;
    error?: string;
}
interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}
interface RegisterResponse {
    success: boolean;
    message?: string;
    requiresVerification?: boolean;
    error?: string;
}
interface GoogleAuthResponse {
    success: boolean;
    sessionToken?: string;
    email?: string;
    tenantId?: string;
    userId?: string;
    expiresAt?: string;
    error?: string;
}
interface SessionState {
    sessionId: string | null;
    workspaceId: string | null;
    isConnected: boolean;
    lastActivity: Date | null;
}
interface WorkspaceInfo {
    workspaceId: string;
    name: string;
    description?: string;
    datasetCount: number;
    visualizationCount: number;
    modelCount: number;
    createdAt: string;
    lastAccessed: string;
}
interface CreateWorkspaceRequest {
    name: string;
    description?: string;
}
interface DatasetInfo {
    id: string;
    name: string;
    rows: number;
    columns: number;
    schema?: Record<string, ColumnSchema>;
    columnNames?: string[];
    createdAt?: string;
    updatedAt?: string;
}
interface ColumnSchema {
    type: 'string' | 'number' | 'boolean' | 'date' | 'object';
    nullable: boolean;
    unique?: boolean;
}
interface DatasetRow {
    [key: string]: unknown;
}
type DatasetCellValue = string | number | boolean | null;
interface DatasetPreview {
    columns: string[];
    rows: DatasetCellValue[][];
}
interface DatasetStreamOptions {
    limit?: number;
    offset?: number;
}
interface VisualizationData {
    name: string;
    type?: string;
    imageUrl?: string;
    imageBase64?: string;
    format?: 'png' | 'jpeg' | 'svg' | 'html' | string;
    createdAt?: string;
    metadata?: Record<string, unknown>;
}
interface ReportInfo {
    id: string;
    name: string;
    format: string;
    url: string;
    size?: number;
    createdAt?: string;
}
interface PublishedSiteInfo {
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
interface CreateSiteParams$1 {
    name: string;
    siteType?: 'on_demand' | 'daily' | 'js_build';
    description?: string;
    files?: Record<string, string>;
}
interface UseSitesReturn {
    sites: PublishedSiteInfo[];
    isLoading: boolean;
    error: string | null;
    createSite: (params: CreateSiteParams$1) => Promise<PublishedSiteInfo | null>;
    addFile: (siteId: string, path: string, content: string) => Promise<boolean>;
    publishSite: (siteId: string) => Promise<PublishedSiteInfo | null>;
    deleteSite: (siteId: string) => Promise<boolean>;
    refreshSites: () => Promise<void>;
}
interface SiteVersion {
    version: number;
    type: 'build' | 'edit';
    createdAt: string;
    description?: string;
    fileCount: number;
    totalBytes: number;
    url: string;
}
interface SiteVersionManifest {
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
interface UseSiteVersionsReturn {
    versions: SiteVersion[];
    liveVersion: number | null;
    isLoading: boolean;
    error: string | null;
    promote: (version: number) => Promise<boolean>;
    deleteVersion: (version: number) => Promise<boolean>;
    refresh: () => Promise<void>;
}
interface PublishToGitHubParams {
    repoName: string;
    isPrivate?: boolean;
    version?: number;
}
interface PublishToGitHubResult {
    repoUrl: string;
    commitSha: string;
}
interface AgentInfo {
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
interface UseAgentsReturn {
    /** Available agents */
    agents: AgentInfo[];
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Refresh the agent list */
    refreshAgents: () => Promise<void>;
}
interface ModelInfo {
    id: string;
    name: string;
    format: string;
    size_bytes: number;
    last_modified?: string;
    download_url?: string;
    metadata?: Record<string, unknown>;
    s3_key?: string;
}
interface ScriptInfo {
    name: string;
    extension: string;
    size_bytes?: number;
    created_at?: string;
    modified_at?: string;
    content?: string;
    metadata?: Record<string, unknown>;
}
type DataSourceType = 'mongodb' | 'postgresql' | 's3';
interface DataSource {
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
interface DataSourceConfig {
    type: DataSourceType;
    name: string;
    connectionString?: string;
    auth_method?: string;
    credentials?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    is_tenant_wide?: boolean;
}
interface ConnectionTestResult {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}
interface ChatMessage {
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
type AttachmentInput = File | {
    filename: string;
    content_type: string;
    data: string;
};
interface ToolCall {
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
interface SearchResult {
    rank: number;
    title: string;
    url: string;
    content: string;
    score: number;
}
interface SearchResultsData {
    search_id: string;
    query: string;
    result_count: number;
    results: SearchResult[];
    answer?: string;
}
interface StreamEvent {
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
type StreamEventType = 'content' | 'text' | 'delta' | 'metadata' | 'tool_call' | 'tool_use' | 'tool_result' | 'visualization' | 'progress' | 'credit_status' | 'budget_update' | 'complete' | 'done' | 'error' | 'interrupt';
interface InterruptInfo {
    reason: string;
    timestamp?: number;
}
interface DataSourceBadgeInfo {
    source_id: string;
    type: string;
    name: string;
}
type AgentTemplate = 'data-science' | 'marketing' | 'support' | 'custom';
interface AgentConfig {
    template: AgentTemplate;
    systemPrompt?: string;
    tools?: string[];
    streaming?: boolean;
    networkMode?: 'SANDBOX' | 'PUBLIC';
}
interface QueryOptions {
    workspaceId?: string;
    networkMode?: 'SANDBOX' | 'PUBLIC';
    tools?: string[];
}
interface UsageStats {
    today: UsagePeriod;
    thisMonth: UsagePeriod;
    allTime: UsagePeriod;
}
interface UsagePeriod {
    analyses: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}
interface CreditStatus {
    remaining: number;
    used: number;
    total: number;
    purchasedRemaining?: number;
}
interface UseAuthReturn {
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
interface UseWorkspaceReturn {
    workspaces: WorkspaceInfo[];
    selectedWorkspace: WorkspaceInfo | null;
    isLoading: boolean;
    error: string | null;
    createWorkspace: (name: string, description?: string) => Promise<WorkspaceInfo | null>;
    selectWorkspace: (workspace: WorkspaceInfo) => void;
    refreshWorkspaces: () => Promise<void>;
}
interface UseDatasetsReturn {
    datasets: DatasetInfo[];
    isLoading: boolean;
    error: string | null;
    uploadDataset: (file: File, name?: string) => Promise<DatasetInfo | null>;
    downloadDataset: (name: string) => Promise<Blob | null>;
    deleteDataset: (name: string) => Promise<boolean>;
    refreshDatasets: () => Promise<void>;
}
interface UseVisualizationsReturn {
    visualizations: VisualizationData[];
    isLoading: boolean;
    error: string | null;
    refreshVisualizations: () => Promise<void>;
}
interface UseReportsReturn {
    reports: ReportInfo[];
    isLoading: boolean;
    error: string | null;
    uploadReport: (file: File, name?: string) => Promise<ReportInfo | null>;
    downloadReport: (url: string, name: string, format: string) => Promise<Blob | null>;
    refreshReports: () => Promise<void>;
}
interface UseModelsReturn {
    models: ModelInfo[];
    isLoading: boolean;
    error: string | null;
    downloadModel: (name: string) => Promise<Blob | null>;
    refreshModels: () => Promise<void>;
}
interface UseDataSourcesReturn {
    dataSources: DataSource[];
    isLoading: boolean;
    error: string | null;
    createDataSource: (config: DataSourceConfig) => Promise<DataSource | null>;
    testConnection: (id: string) => Promise<ConnectionTestResult>;
    deleteDataSource: (id: string) => Promise<boolean>;
    refreshDataSources: () => Promise<void>;
}
interface UseAgentOptions {
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
interface UseAgentReturn {
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
interface UseQueryReturn {
    execute: (prompt: string, options?: QueryOptions) => Promise<void>;
    isStreaming: boolean;
    result: string | null;
    toolCalls: ToolCall[];
    visualizations: VisualizationData[];
    error: string | null;
    cancel: () => void;
}
/**
 * User role levels for tenant management
 */
type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
/**
 * User account status
 */
type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deactivated';
/**
 * Activity types for user activity logs
 */
type UserActivityType = 'login' | 'logout' | 'register' | 'password_reset' | 'profile_update' | 'workspace_create' | 'workspace_access' | 'dataset_upload' | 'query_execute' | 'api_call';
/**
 * Managed user - extended user info for admin management
 */
interface ManagedUser {
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
interface UserActivityLog {
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
interface UpdateUserRequest {
    name?: string;
    role?: UserRole;
    status?: UserStatus;
    metadata?: Record<string, unknown>;
}
/**
 * Tenant-level user statistics
 */
interface UserStats {
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
interface UserListParams {
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
interface UserListResponse {
    users: ManagedUser[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
/**
 * Return type for useUserManagement hook
 */
interface UseUserManagementReturn {
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
declare const LLM_PROVIDERS: readonly ["anthropic", "openai", "gemini", "deepseek", "xai", "ollama"];
type LLMProvider = (typeof LLM_PROVIDERS)[number];
/**
 * One platform credential a user can pin via /user/model-preference.
 * Mirrors the backend ModelOption pydantic model in user_preferences.py.
 */
interface ModelOption {
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
interface ModelPreferenceState {
    preferred_credential_id: string | null;
    resolved_provider: string | null;
    resolved_model_id: string | null;
    is_auto: boolean;
}
/**
 * Tenant-admin platform credential — what `/admin/provider-credentials`
 * lists. `masked_key` is `XXXX…last4` for display.
 */
interface AdminProviderCredential {
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
interface ExistingProviderCredential {
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
interface CreateAdminProviderCredentialInput {
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
declare const CREDENTIAL_PURPOSES: readonly ["default", "code_sandbox", "llm", "swarm", "thinking", "data_operations", "visualization", "google_marketing", "site_builder", "site_planner", "site_style", "site_data_integrator", "daily_brief", "js_builder", "site_patch", "code_interpreter"];
type CredentialPurpose = (typeof CREDENTIAL_PURPOSES)[number];
interface ProviderCredential {
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
interface ProviderModelSettings {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    [key: string]: unknown;
}
/** Sensible defaults for model settings. */
declare const DEFAULT_PROVIDER_MODEL_SETTINGS: ProviderModelSettings;
/** Runtime type guard for ProviderCredential objects. */
declare function isProviderCredential(value: unknown): value is ProviderCredential;
declare const COLLECTION_LAYERS: readonly ["shared", "user", "auto"];
type CollectionLayer = (typeof COLLECTION_LAYERS)[number];
interface PurposeInfo {
    purpose: string;
    label: string;
    description: string;
    default_provider?: LLMProvider;
}
interface OllamaLocalModel {
    name: string;
    size: number;
    modified_at: string;
    digest?: string;
}
interface OllamaStatus {
    available: boolean;
    host: string;
    models: OllamaLocalModel[];
    error?: string;
}
interface CollectionSchemaInfo {
    fields: {
        name: string;
        type: string;
    }[];
}
interface UserCollectionInfo {
    full_name: string;
    name: string;
    database: string;
    doc_count: number;
    site_name?: string;
    data_tier?: string;
    scope?: string;
}
interface ApiResponse<T = unknown> {
    ok: boolean;
    status: number;
    data?: T;
    error?: string;
}
interface ListResponse<T> {
    items: T[];
    totalCount: number;
    hasMore?: boolean;
    cached?: boolean;
}
/**
 * Full context value provided by FlowstackProvider
 */
interface FlowstackContextValue {
    config: FlowstackConfig;
    credentials: FlowstackCredentials | null;
    setCredentials: (creds: FlowstackCredentials | null) => void;
    isAuthenticated: boolean;
    isInitialized: boolean;
    logout: () => void;
    session: SessionState;
    workspaces: WorkspaceInfo[];
    selectedWorkspace: WorkspaceInfo | null;
    setSelectedWorkspace: (workspace: WorkspaceInfo | null) => void;
    refreshWorkspaces: () => Promise<void>;
    createWorkspace: (name: string, description?: string) => Promise<WorkspaceInfo | null>;
    isLoadingWorkspaces: boolean;
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    clearMessages: () => void;
    isQueryRunning: boolean;
    setIsQueryRunning: (running: boolean) => void;
    queryStartTime: number | null;
    setQueryStartTime: (time: number | null) => void;
    datasets: DatasetInfo[];
    setDatasets: (datasets: DatasetInfo[]) => void;
    refreshDatasets: () => Promise<void>;
    isLoadingDatasets: boolean;
    visualizations: VisualizationData[];
    setVisualizations: (vizs: VisualizationData[]) => void;
    addVisualization: (viz: VisualizationData) => void;
    refreshVisualizations: () => Promise<void>;
    isLoadingVisualizations: boolean;
    clearVisualizations: () => void;
    reports: ReportInfo[];
    refreshReports: () => Promise<void>;
    isLoadingReports: boolean;
    models: ModelInfo[];
    refreshModels: () => Promise<void>;
    isLoadingModels: boolean;
    scripts: ScriptInfo[];
    refreshScripts: () => Promise<void>;
    isLoadingScripts: boolean;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeTab: 'chat' | 'datasets' | 'visualizations' | 'reports' | 'models';
    setActiveTab: (tab: 'chat' | 'datasets' | 'visualizations' | 'reports' | 'models') => void;
}
interface UserDataOverviewWorkspace {
    workspace_id: string;
    name?: string;
    artifact_counts?: Record<string, number>;
}
interface UserDataOverview {
    workspaces: UserDataOverviewWorkspace[];
    sites: {
        site_id: string;
        name: string;
    }[];
    mongodb_summary: {
        total_collections: number;
        total_documents: number;
    };
}
interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description?: string;
    language?: string;
    default_branch: string;
}
interface PiiEntitySettings {
    [entityType: string]: boolean;
}
interface PiiSettings {
    query_masking?: {
        enabled?: boolean;
        entity_types?: PiiEntitySettings;
    };
    file_masking?: {
        enabled?: boolean;
    };
}
/** P0-57: Detailed report of a single PII entity detected/masked in a query. */
interface PiiRedactedEntity {
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

interface FlowstackClientConfig {
    baseUrl?: string;
    tenantId?: string;
    enforceUserScope?: boolean;
    /** App scope (site_id) — embedded in JWT for built-app users */
    appScope?: string;
}
/**
 * Request options for API calls
 */
interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    credentials: FlowstackCredentials;
}
/**
 * Make a request to the Flowstack API with user-level isolation
 */
declare function flowstackFetch<T = unknown>(endpoint: string, options: RequestOptions, config?: FlowstackClientConfig): Promise<ApiResponse<T>>;
/**
 * List workspaces for the current user
 */
declare function listWorkspaces(credentials: FlowstackCredentials, limit?: number, config?: FlowstackClientConfig): Promise<ApiResponse<{
    workspaces: WorkspaceInfo[];
    total_count: number;
    has_more: boolean;
}>>;
/**
 * Create a new workspace
 */
declare function createWorkspace(credentials: FlowstackCredentials, name: string, description?: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    workspace: WorkspaceInfo;
}>>;
/**
 * Get a single workspace
 */
declare function getWorkspace(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    workspace: WorkspaceInfo;
}>>;
/**
 * List datasets for a tenant (optionally filtered by workspace)
 */
declare function listDatasets(credentials: FlowstackCredentials, workspaceId?: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    datasets: DatasetInfo[];
}>>;
/**
 * Get dataset details
 */
declare function getDataset(credentials: FlowstackCredentials, datasetName: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    dataset: DatasetInfo;
}>>;
/**
 * Get a preview of dataset rows and columns
 */
declare function getDatasetPreview(credentials: FlowstackCredentials, datasetName: string, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<DatasetPreview>>;
/**
 * Delete a dataset
 * Note: Dataset deletion must be done through the agent chat interface
 */
declare function deleteDataset(_credentials: FlowstackCredentials, _datasetName: string, _config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
/**
 * List visualizations in a workspace
 */
declare function listVisualizations(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    visualizations: VisualizationData[];
}>>;
/**
 * List reports in a workspace
 */
declare function listReports(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    reports: ReportInfo[];
}>>;
/**
 * List ML models in a workspace
 */
declare function listModels(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    models: ModelInfo[];
}>>;
/**
 * Get model details
 */
declare function getModel(credentials: FlowstackCredentials, workspaceId: string, modelName: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    model: ModelInfo;
}>>;
/**
 * List scripts in a workspace
 */
declare function listScripts(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    scripts: ScriptInfo[];
}>>;
/**
 * List data sources
 */
declare function listDataSources(credentials: FlowstackCredentials, config?: FlowstackClientConfig, options?: {
    /**
     * P0-69: when true, appends `include_provenance=true` so the backend
     * returns the `_flowstack` workspace attribution envelope on every
     * data source. Required for built apps that need to know which
     * workspace a shared data source belongs to.
     */
    includeProvenance?: boolean;
}): Promise<ApiResponse<{
    datasources: DataSource[];
}>>;
/**
 * Create a data source
 */
declare function createDataSource(credentials: FlowstackCredentials, sourceConfig: DataSourceConfig, config?: FlowstackClientConfig): Promise<ApiResponse<DataSource>>;
/**
 * Test a data source connection
 */
declare function testDataSource(credentials: FlowstackCredentials, sourceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<ConnectionTestResult>>;
/**
 * Delete a data source
 */
declare function deleteDataSource(credentials: FlowstackCredentials, sourceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
/**
 * List available agents with descriptions and capabilities.
 * No credentials required — this is a public capability catalog.
 */
declare function listAgents(config?: FlowstackClientConfig): Promise<ApiResponse<{
    agents: AgentInfo[];
    count: number;
    workflows: any[];
}>>;
/**
 * Execute a streaming query
 * Returns the Response object for SSE streaming
 */
declare function executeQuery(credentials: FlowstackCredentials, query: string, workspaceId: string, options?: {
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
}, config?: FlowstackClientConfig): Promise<Response>;
/**
 * Execute a streaming query with custom agent configuration
 *
 * Extends executeQuery to support system prompt overrides, tool whitelists,
 * and direct agent targeting.
 */
declare function executeQueryWithConfig(credentials: FlowstackCredentials, query: string, workspaceId: string, options?: {
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
}, config?: FlowstackClientConfig): Promise<Response>;
/**
 * Query a MongoDB collection directly (for useCollection hook).
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
declare function queryCollection<T = Record<string, any>>(credentials: FlowstackCredentials, collection: string, options?: {
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
}, config?: FlowstackClientConfig): Promise<ApiResponse<{
    documents: T[];
    count: number;
    total: number;
}>>;
/**
 * Insert one or more documents into a MongoDB collection.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
declare function insertDocuments(credentials: FlowstackCredentials, collection: string, documents: Record<string, any> | Record<string, any>[], config?: FlowstackClientConfig, layer?: CollectionLayer): Promise<ApiResponse<{
    inserted_count: number;
    inserted_ids: string[];
    collection: string;
}>>;
/**
 * Update documents in a MongoDB collection matching the filter.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
declare function updateDocuments(credentials: FlowstackCredentials, collection: string, filter: Record<string, any>, update: Record<string, any>, options?: {
    upsert?: boolean;
}, config?: FlowstackClientConfig, layer?: CollectionLayer): Promise<ApiResponse<{
    matched_count: number;
    modified_count: number;
    collection: string;
}>>;
/**
 * Delete documents from a MongoDB collection matching the filter.
 *
 * Requires app_scope in JWT — only built-app users can use this.
 * Collection name is auto-prefixed with app_scope by the backend.
 */
declare function deleteDocuments(credentials: FlowstackCredentials, collection: string, filter: Record<string, any>, config?: FlowstackClientConfig, layer?: CollectionLayer): Promise<ApiResponse<{
    deleted_count: number;
    collection: string;
}>>;
/**
 * Invoke an agent tool directly (bypasses LLM orchestration).
 */
declare function invokeTool<T = any>(credentials: FlowstackCredentials, agentName: string, toolName: string, kwargs?: Record<string, any>, config?: FlowstackClientConfig): Promise<ApiResponse<{
    status: string;
    result: T;
}>>;
/**
 * Upload a file to a workspace
 */
declare function uploadFile(credentials: FlowstackCredentials, workspaceId: string, file: File, name?: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    dataset?: DatasetInfo;
    report?: ReportInfo;
}>>;
/**
 * Upload a document (PDF/DOCX/image/etc.) to a workspace's uploads/ prefix.
 *
 * The two upload routes split by intent: `/upload` parses tabular formats into
 * a queryable DataFrame (dataset); `/upload-document` stores raw bytes for the
 * agent's `ingest_document` / `search_documents` tools. The chat input
 * accepts both kinds of file, so useAgent.query() must pick the right route
 * by extension or the backend 400s with "Unsupported file type".
 */
declare function uploadDocument(credentials: FlowstackCredentials, workspaceId: string, file: File, documentName?: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    document_name?: string;
    filename?: string;
    format?: string;
    size_bytes?: number;
    s3_key?: string;
}>>;
/**
 * Login to get session token
 */
declare function login(email: string, password: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    session_token: string;
    user_id: string;
    access_token?: string;
}>>;
/**
 * Register a new user
 */
declare function register(email: string, password: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    user_id: string;
    message?: string;
    session_token?: string;
    tenant_id?: string;
}>>;
/**
 * Authenticate via Google OAuth authorization code.
 * Call this from the /api/auth/google/callback route after receiving the code from Google.
 */
declare function googleLogin(code: string, redirectUri: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    session_token: string;
    user_id: string;
    tenant_id?: string;
    expires_at?: string;
}>>;
/**
 * List users in the tenant with pagination and filtering
 */
declare function listUsers(credentials: FlowstackCredentials, params?: UserListParams, config?: FlowstackClientConfig): Promise<ApiResponse<UserListResponse>>;
/**
 * Get a single user by ID
 */
declare function getUser(credentials: FlowstackCredentials, userId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    user: ManagedUser;
}>>;
/**
 * Update a user's profile or role
 */
declare function updateUser(credentials: FlowstackCredentials, userId: string, updates: UpdateUserRequest, config?: FlowstackClientConfig): Promise<ApiResponse<{
    user: ManagedUser;
}>>;
/**
 * Delete a user permanently
 */
declare function deleteUser(credentials: FlowstackCredentials, userId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
/**
 * Suspend a user account
 */
declare function suspendUser(credentials: FlowstackCredentials, userId: string, reason?: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    user: ManagedUser;
}>>;
/**
 * Reactivate a suspended user account
 */
declare function reactivateUser(credentials: FlowstackCredentials, userId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    user: ManagedUser;
}>>;
/**
 * Get user activity logs
 */
declare function getUserActivity(credentials: FlowstackCredentials, userId: string, limit?: number, config?: FlowstackClientConfig): Promise<ApiResponse<{
    activities: UserActivityLog[];
}>>;
/**
 * Get user statistics for the tenant
 */
declare function getUserStats(credentials: FlowstackCredentials, config?: FlowstackClientConfig): Promise<ApiResponse<UserStats>>;
/**
 * Check if the current user has admin permissions to manage users
 */
declare function checkAdminPermissions(credentials: FlowstackCredentials, config?: FlowstackClientConfig): Promise<ApiResponse<{
    canManageUsers: boolean;
    role: string;
}>>;
/**
 * Get conversation history for a workspace/session
 */
declare function getConversationHistory(credentials: FlowstackCredentials, workspaceId: string, options?: {
    limit?: number;
    offset?: number;
}, config?: FlowstackClientConfig): Promise<ApiResponse<{
    messages: Array<{
        role: string;
        content: string;
        timestamp: string;
    }>;
}>>;
interface CreateSiteParams {
    name: string;
    siteType?: 'on_demand' | 'daily' | 'js_build';
    description?: string;
    files?: Record<string, string>;
}
/**
 * List all published sites for the current user
 */
declare function listSites(credentials: FlowstackCredentials, config?: FlowstackClientConfig): Promise<ApiResponse<{
    sites: PublishedSiteInfo[];
    count: number;
}>>;
/**
 * Get a single published site by ID
 */
declare function getSite(credentials: FlowstackCredentials, siteId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    site: PublishedSiteInfo;
}>>;
/**
 * Create a new site. If files are provided, publishes immediately.
 * Otherwise creates a staging area for incremental file uploads.
 */
declare function createSite(credentials: FlowstackCredentials, params: CreateSiteParams, config?: FlowstackClientConfig): Promise<ApiResponse<{
    site?: PublishedSiteInfo;
    site_id?: string;
    mode?: string;
}>>;
/**
 * Add or update a single file in a site's staging area.
 * Call this for each file, then publishStagedSite() to deploy.
 */
declare function addSiteFile(credentials: FlowstackCredentials, siteId: string, filePath: string, content: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
/**
 * Publish a staged site to CDN. Call after adding all files with addSiteFile().
 */
declare function publishStagedSite(credentials: FlowstackCredentials, siteId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    site: PublishedSiteInfo;
}>>;
/**
 * Delete a published site and all its files from CDN
 */
declare function deleteSite(credentials: FlowstackCredentials, siteId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
declare function getSiteVersions(credentials: FlowstackCredentials, siteId: string, config?: FlowstackClientConfig): Promise<ApiResponse<SiteVersionManifest>>;
declare function promoteSiteVersion(credentials: FlowstackCredentials, siteId: string, version: number, config?: FlowstackClientConfig): Promise<ApiResponse<SiteVersionManifest>>;
declare function deleteSiteVersion(credentials: FlowstackCredentials, siteId: string, version: number, config?: FlowstackClientConfig): Promise<ApiResponse<SiteVersionManifest>>;
declare function setSiteAlias(credentials: FlowstackCredentials, siteId: string, alias: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    alias: string;
    url: string;
}>>;
declare function removeSiteAlias(credentials: FlowstackCredentials, siteId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
declare function publishToGitHub(credentials: FlowstackCredentials, siteId: string, params: PublishToGitHubParams, config?: FlowstackClientConfig): Promise<ApiResponse<PublishToGitHubResult>>;
declare function listGitHubRepos(credentials: FlowstackCredentials, config?: FlowstackClientConfig): Promise<ApiResponse<{
    repos: GitHubRepo[];
}>>;
declare function importFromGitHub(credentials: FlowstackCredentials, params: {
    repoFullName: string;
    branch?: string;
    workspaceId?: string;
}, config?: FlowstackClientConfig): Promise<ApiResponse<{
    files_imported: number;
}>>;
declare function getPiiSettings(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    settings: PiiSettings;
}>>;
declare function updatePiiSettings(credentials: FlowstackCredentials, workspaceId: string, settings: PiiSettings, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
}>>;
declare function previewPiiMasking(credentials: FlowstackCredentials, query: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    entities: PiiRedactedEntity[];
}>>;
declare function getPiiAllowlist(credentials: FlowstackCredentials, workspaceId: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    allowlist: Array<{
        term: string;
        entity_type: string;
    }>;
}>>;
declare function addPiiAllowlistTerm(credentials: FlowstackCredentials, workspaceId: string, term: string, entityType: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
    allowlist: Array<{
        term: string;
        entity_type: string;
    }>;
}>>;
declare function removePiiAllowlistTerm(credentials: FlowstackCredentials, workspaceId: string, term: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    success: boolean;
    allowlist: Array<{
        term: string;
        entity_type: string;
    }>;
}>>;
declare function getUserDataOverview(credentials: FlowstackCredentials, config?: FlowstackClientConfig): Promise<ApiResponse<UserDataOverview>>;
declare function getUserCollections(credentials: FlowstackCredentials, params?: {
    siteId?: string;
    includeSchema?: boolean;
}, config?: FlowstackClientConfig): Promise<ApiResponse<{
    collections: UserCollectionInfo[];
    grouped_by_site: Record<string, UserCollectionInfo[]>;
}>>;
declare function getUserCollectionDocuments<T = Record<string, any>>(credentials: FlowstackCredentials, collection: string, params?: {
    filter?: Record<string, any>;
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
    database?: string;
}, config?: FlowstackClientConfig): Promise<ApiResponse<{
    documents: T[];
    total: number;
}>>;
declare function getUserCollectionSchema(credentials: FlowstackCredentials, collection: string, params?: {
    database?: string;
    sampleSize?: number;
}, config?: FlowstackClientConfig): Promise<ApiResponse<CollectionSchemaInfo>>;
declare function deleteUserCollection(credentials: FlowstackCredentials, collection: string, config?: FlowstackClientConfig): Promise<ApiResponse<{
    deleted: boolean;
    collection: string;
}>>;
declare function exportUserCollection(credentials: FlowstackCredentials, collection: string, params?: {
    format?: 'json' | 'csv';
    filter?: Record<string, any>;
    database?: string;
}, config?: FlowstackClientConfig): Promise<ApiResponse<Blob>>;

/**
 * Redis Cache Layer for Flowstack SDK
 * Uses Upstash Redis for serverless caching
 */

declare const CACHE_TTL: {
    readonly WORKSPACES: 300;
    readonly DATASETS: 60;
    readonly VISUALIZATIONS: 60;
    readonly REPORTS: 60;
    readonly SITES: 120;
    readonly MESSAGES: 0;
    readonly SESSION: 86400;
};
/**
 * Redis client configuration
 */
interface RedisConfig {
    url: string;
    token: string;
}
declare function getCachedWorkspaces(credentials: FlowstackCredentials, config: RedisConfig): Promise<WorkspaceInfo[] | null>;
declare function setCachedWorkspaces(credentials: FlowstackCredentials, workspaces: WorkspaceInfo[], config: RedisConfig): Promise<boolean>;
declare function invalidateWorkspacesCache(credentials: FlowstackCredentials, config: RedisConfig): Promise<boolean>;
declare function getCachedDatasets(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<DatasetInfo[] | null>;
declare function setCachedDatasets(credentials: FlowstackCredentials, workspaceId: string, datasets: DatasetInfo[], config: RedisConfig): Promise<boolean>;
declare function invalidateDatasetsCache(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<boolean>;
declare function getCachedVisualizations(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<VisualizationData[] | null>;
declare function setCachedVisualizations(credentials: FlowstackCredentials, workspaceId: string, visualizations: VisualizationData[], config: RedisConfig): Promise<boolean>;
declare function invalidateVisualizationsCache(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<boolean>;
declare function getCachedReports(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<ReportInfo[] | null>;
declare function setCachedReports(credentials: FlowstackCredentials, workspaceId: string, reports: ReportInfo[], config: RedisConfig): Promise<boolean>;
declare function invalidateReportsCache(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<boolean>;
/**
 * Invalidate all workspace artifacts (datasets, visualizations, reports)
 */
declare function invalidateWorkspaceArtifacts(credentials: FlowstackCredentials, workspaceId: string, config: RedisConfig): Promise<void>;
/**
 * Invalidate all user cache
 */
declare function invalidateAllUserCache(credentials: FlowstackCredentials, config: RedisConfig): Promise<void>;
/**
 * Get a cached value
 */
declare function getCached<T>(key: string, config: RedisConfig): Promise<T | null>;
/**
 * Set a cached value
 */
declare function setCached<T>(key: string, value: T, ttl: number, config: RedisConfig): Promise<boolean>;
/**
 * Delete a cached value
 */
declare function deleteCached(key: string, config: RedisConfig): Promise<boolean>;
declare function getCachedSites(credentials: FlowstackCredentials, config: RedisConfig): Promise<PublishedSiteInfo[] | null>;
declare function setCachedSites(credentials: FlowstackCredentials, sites: PublishedSiteInfo[], config: RedisConfig): Promise<boolean>;
declare function invalidateSitesCache(credentials: FlowstackCredentials, config: RedisConfig): Promise<boolean>;

export { type RedisConfig$1 as $, type AgentTemplate as A, type DataSourceBadgeInfo as B, type ChatMessage as C, type DatasetInfo as D, type AgentConfig as E, type FlowstackConfig as F, type ModelPreferenceState as G, type ModelOption as H, type AdminProviderCredential as I, type ExistingProviderCredential as J, type CreateAdminProviderCredentialInput as K, type LLMProvider as L, type ManagedUser as M, type FlowstackClientConfig as N, type OllamaLocalModel as O, type ProviderCredential as P, LLM_PROVIDERS as Q, CREDENTIAL_PURPOSES as R, type StreamEvent as S, type ToolCall as T, type UseAuthReturn as U, type VisualizationData as V, type WorkspaceInfo as W, DEFAULT_PROVIDER_MODEL_SETTINGS as X, isProviderCredential as Y, COLLECTION_LAYERS as Z, type AuthConfig as _, type FlowstackContextValue as a, deleteDataSource as a$, type DatabaseConfig as a0, type LoginRequest as a1, type LoginResponse as a2, type RegisterRequest as a3, type RegisterResponse as a4, type GoogleAuthResponse as a5, type SessionState as a6, type CreateWorkspaceRequest as a7, type DatasetPreview as a8, type ColumnSchema as a9, type PiiSettings as aA, type PiiEntitySettings as aB, type PiiRedactedEntity as aC, type ApiResponse as aD, type ListResponse as aE, type UserRole as aF, type UserStatus as aG, type UserActivityType as aH, type UpdateUserRequest as aI, type UserListParams as aJ, type UserListResponse as aK, flowstackFetch as aL, listWorkspaces as aM, createWorkspace as aN, getWorkspace as aO, listDatasets as aP, getDataset as aQ, getDatasetPreview as aR, deleteDataset as aS, listVisualizations as aT, listReports as aU, listModels as aV, listScripts as aW, getModel as aX, listDataSources as aY, createDataSource as aZ, testDataSource as a_, type DatasetRow as aa, type DatasetStreamOptions as ab, type ReportInfo as ac, type ModelInfo as ad, type ScriptInfo as ae, type DataSourceType as af, type DataSourceConfig as ag, type ConnectionTestResult as ah, type SearchResult as ai, type SearchResultsData as aj, type StreamEventType as ak, type InterruptInfo as al, type QueryOptions as am, type UsageStats as an, type UsagePeriod as ao, type CreditStatus as ap, type AgentInfo as aq, type PublishedSiteInfo as ar, type CreateSiteParams$1 as as, type SiteVersion as at, type SiteVersionManifest as au, type PublishToGitHubParams as av, type PublishToGitHubResult as aw, type CredentialPurpose as ax, type UserDataOverviewWorkspace as ay, type GitHubRepo as az, type UseWorkspaceReturn as b, getCachedSites as b$, executeQuery as b0, executeQueryWithConfig as b1, uploadFile as b2, login as b3, register as b4, googleLogin as b5, listUsers as b6, getUser as b7, updateUser as b8, deleteUser as b9, updatePiiSettings as bA, previewPiiMasking as bB, getPiiAllowlist as bC, addPiiAllowlistTerm as bD, removePiiAllowlistTerm as bE, getUserDataOverview as bF, getUserCollections as bG, getUserCollectionDocuments as bH, getUserCollectionSchema as bI, deleteUserCollection as bJ, exportUserCollection as bK, type RequestOptions as bL, CACHE_TTL as bM, getCachedWorkspaces as bN, setCachedWorkspaces as bO, invalidateWorkspacesCache as bP, getCachedDatasets as bQ, setCachedDatasets as bR, invalidateDatasetsCache as bS, getCachedVisualizations as bT, setCachedVisualizations as bU, invalidateVisualizationsCache as bV, getCachedReports as bW, setCachedReports as bX, invalidateReportsCache as bY, invalidateWorkspaceArtifacts as bZ, invalidateAllUserCache as b_, suspendUser as ba, reactivateUser as bb, getUserActivity as bc, getUserStats as bd, checkAdminPermissions as be, getConversationHistory as bf, listAgents as bg, listSites as bh, getSite as bi, createSite as bj, addSiteFile as bk, publishStagedSite as bl, deleteSite as bm, getSiteVersions as bn, promoteSiteVersion as bo, deleteSiteVersion as bp, setSiteAlias as bq, removeSiteAlias as br, publishToGitHub as bs, insertDocuments as bt, updateDocuments as bu, deleteDocuments as bv, invokeTool as bw, listGitHubRepos as bx, importFromGitHub as by, getPiiSettings as bz, type UseDatasetsReturn as c, setCachedSites as c0, invalidateSitesCache as c1, getCached as c2, setCached as c3, deleteCached as c4, queryCollection as c5, uploadDocument as c6, type CreateSiteParams as c7, type RedisConfig as c8, type UseVisualizationsReturn as d, type UseReportsReturn as e, type UseModelsReturn as f, type UseDataSourcesReturn as g, type UseAgentOptions as h, type UseAgentReturn as i, type UseQueryReturn as j, type UseUserManagementReturn as k, type UseSitesReturn as l, type UseAgentsReturn as m, type CollectionLayer as n, type UseSiteVersionsReturn as o, type PurposeInfo as p, type ProviderModelSettings as q, type OllamaStatus as r, type UserDataOverview as s, type UserCollectionInfo as t, type CollectionSchemaInfo as u, type FlowstackCredentials as v, type User as w, type DataSource as x, type UserStats as y, type UserActivityLog as z };
