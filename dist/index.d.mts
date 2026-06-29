import * as react_jsx_runtime from 'react/jsx-runtime';
import React, { ReactNode } from 'react';
import { F as FlowstackConfig, a as FlowstackContextValue, U as UseAuthReturn, b as UseWorkspaceReturn, c as UseDatasetsReturn, d as UseVisualizationsReturn, e as UseReportsReturn, f as UseModelsReturn, g as UseDataSourcesReturn, A as AgentTemplate, h as UseAgentOptions, i as UseAgentReturn, j as UseQueryReturn, C as ChatMessage, T as ToolCall, k as UseUserManagementReturn, l as UseSitesReturn, m as UseAgentsReturn, n as CollectionLayer, o as UseSiteVersionsReturn, P as ProviderCredential, p as PurposeInfo, L as LLMProvider, q as ProviderModelSettings, O as OllamaLocalModel, r as OllamaStatus, s as UserDataOverview, t as UserCollectionInfo, u as CollectionSchemaInfo, v as FlowstackCredentials, w as User, W as WorkspaceInfo, D as DatasetInfo, V as VisualizationData, x as DataSource, M as ManagedUser, y as UserStats, z as UserActivityLog, B as DataSourceBadgeInfo, S as StreamEvent, E as AgentConfig, G as ModelPreferenceState, H as ModelOption, I as AdminProviderCredential, J as ExistingProviderCredential, K as CreateAdminProviderCredentialInput, N as FlowstackClientConfig } from './index-BkACA2ls.mjs';
export { aq as AgentInfo, aD as ApiResponse, _ as AuthConfig, bM as CACHE_TTL, Z as COLLECTION_LAYERS, R as CREDENTIAL_PURPOSES, a9 as ColumnSchema, ah as ConnectionTestResult, as as CreateSiteParams, a7 as CreateWorkspaceRequest, ax as CredentialPurpose, ap as CreditStatus, X as DEFAULT_PROVIDER_MODEL_SETTINGS, ag as DataSourceConfig, af as DataSourceType, a0 as DatabaseConfig, a8 as DatasetPreview, aa as DatasetRow, ab as DatasetStreamOptions, az as GitHubRepo, a5 as GoogleAuthResponse, al as InterruptInfo, Q as LLM_PROVIDERS, aE as ListResponse, a1 as LoginRequest, a2 as LoginResponse, ad as ModelInfo, aB as PiiEntitySettings, aC as PiiRedactedEntity, aA as PiiSettings, av as PublishToGitHubParams, aw as PublishToGitHubResult, ar as PublishedSiteInfo, am as QueryOptions, $ as RedisConfig, a3 as RegisterRequest, a4 as RegisterResponse, ac as ReportInfo, bL as RequestOptions, ae as ScriptInfo, ai as SearchResult, aj as SearchResultsData, a6 as SessionState, at as SiteVersion, au as SiteVersionManifest, ak as StreamEventType, aI as UpdateUserRequest, ao as UsagePeriod, an as UsageStats, aH as UserActivityType, ay as UserDataOverviewWorkspace, aJ as UserListParams, aK as UserListResponse, aF as UserRole, aG as UserStatus, bD as addPiiAllowlistTerm, bk as addSiteFile, be as checkAdminPermissions, aZ as createDataSource, bj as createSite, aN as createWorkspace, c4 as deleteCached, a$ as deleteDataSource, aS as deleteDataset, bv as deleteDocuments, bm as deleteSite, bp as deleteSiteVersion, b9 as deleteUser, bJ as deleteUserCollection, b0 as executeQuery, b1 as executeQueryWithConfig, bK as exportUserCollection, aL as flowstackFetch, c2 as getCached, bQ as getCachedDatasets, bW as getCachedReports, b$ as getCachedSites, bT as getCachedVisualizations, bN as getCachedWorkspaces, bf as getConversationHistory, aQ as getDataset, aR as getDatasetPreview, aX as getModel, bC as getPiiAllowlist, bz as getPiiSettings, bi as getSite, bn as getSiteVersions, b7 as getUser, bc as getUserActivity, bH as getUserCollectionDocuments, bI as getUserCollectionSchema, bG as getUserCollections, bF as getUserDataOverview, bd as getUserStats, aO as getWorkspace, b5 as googleLogin, by as importFromGitHub, bt as insertDocuments, b_ as invalidateAllUserCache, bS as invalidateDatasetsCache, bY as invalidateReportsCache, c1 as invalidateSitesCache, bV as invalidateVisualizationsCache, bZ as invalidateWorkspaceArtifacts, bP as invalidateWorkspacesCache, bw as invokeTool, Y as isProviderCredential, bg as listAgents, aY as listDataSources, aP as listDatasets, bx as listGitHubRepos, aV as listModels, aU as listReports, aW as listScripts, bh as listSites, b6 as listUsers, aT as listVisualizations, aM as listWorkspaces, b3 as login, bB as previewPiiMasking, bo as promoteSiteVersion, bl as publishStagedSite, bs as publishToGitHub, bb as reactivateUser, b4 as register, bE as removePiiAllowlistTerm, br as removeSiteAlias, c3 as setCached, bR as setCachedDatasets, bX as setCachedReports, c0 as setCachedSites, bU as setCachedVisualizations, bO as setCachedWorkspaces, bq as setSiteAlias, ba as suspendUser, a_ as testDataSource, bu as updateDocuments, bA as updatePiiSettings, b8 as updateUser, b2 as uploadFile } from './index-BkACA2ls.mjs';
export { h as AppAccessStatus, A as AppPaywallProps, e as UseAppAccessReturn } from './types-BmCPwbGH.mjs';

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
declare function FlowstackProvider({ children, config, privyAuthState, }: FlowstackProviderProps): react_jsx_runtime.JSX.Element;
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
declare function useFlowstack(): FlowstackContextValue;
/**
 * Optional hook - returns null if not in provider (for conditional usage)
 */
declare function useFlowstackOptional(): FlowstackContextValue | null;

/**
 * Flowstack SDK Error Codes
 *
 * Standardized error codes for programmatic error handling.
 */
declare const ErrorCodes: {
    readonly CONFIG_INVALID: "CONFIG_INVALID";
    readonly CONFIG_MISSING_JWT_SECRET: "CONFIG_MISSING_JWT_SECRET";
    readonly CONFIG_MISSING_PASSWORD_SECRET: "CONFIG_MISSING_PASSWORD_SECRET";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly NETWORK_TIMEOUT: "NETWORK_TIMEOUT";
    readonly NETWORK_OFFLINE: "NETWORK_OFFLINE";
    readonly AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED";
    readonly AUTHENTICATION_EXPIRED: "AUTHENTICATION_EXPIRED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND";
    readonly WORKSPACE_REQUIRED: "WORKSPACE_REQUIRED";
    readonly WORKSPACE_CREATE_FAILED: "WORKSPACE_CREATE_FAILED";
    readonly DATASET_NOT_FOUND: "DATASET_NOT_FOUND";
    readonly DATASET_UPLOAD_FAILED: "DATASET_UPLOAD_FAILED";
    readonly DATASET_DOWNLOAD_FAILED: "DATASET_DOWNLOAD_FAILED";
    readonly DATASET_DELETE_FAILED: "DATASET_DELETE_FAILED";
    readonly DATASET_TOO_LARGE: "DATASET_TOO_LARGE";
    readonly INVALID_FILE_TYPE: "INVALID_FILE_TYPE";
    readonly QUERY_FAILED: "QUERY_FAILED";
    readonly QUERY_TIMEOUT: "QUERY_TIMEOUT";
    readonly QUERY_CANCELLED: "QUERY_CANCELLED";
    readonly AGENT_ERROR: "AGENT_ERROR";
    readonly STREAMING_ERROR: "STREAMING_ERROR";
    readonly DATA_SOURCE_NOT_FOUND: "DATA_SOURCE_NOT_FOUND";
    readonly DATA_SOURCE_CONNECTION_FAILED: "DATA_SOURCE_CONNECTION_FAILED";
    readonly DATA_SOURCE_AUTH_FAILED: "DATA_SOURCE_AUTH_FAILED";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly CREDITS_EXHAUSTED: "CREDITS_EXHAUSTED";
    readonly SERVER_ERROR: "SERVER_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly MAINTENANCE_MODE: "MAINTENANCE_MODE";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_EMAIL: "INVALID_EMAIL";
    readonly PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
/**
 * User-friendly messages for each error code
 */
declare const ErrorMessages: Record<ErrorCode, string>;
/**
 * Recovery actions for each error code
 */
declare const RecoveryActions: Partial<Record<ErrorCode, string>>;

/**
 * Flowstack SDK Error Handling
 *
 * Provides structured error handling with error codes, user-friendly messages,
 * and recovery actions.
 *
 * @example
 * ```tsx
 * import { FlowstackError, ErrorCodes } from 'flowstack-sdk';
 *
 * try {
 *   await login(email, password);
 * } catch (error) {
 *   if (error instanceof FlowstackError) {
 *     if (error.code === ErrorCodes.ACCOUNT_NOT_ACTIVE) {
 *       showActivationPrompt();
 *     }
 *     showError(error.userMessage);
 *   }
 * }
 * ```
 */

interface FlowstackErrorOptions {
    /** User-friendly error message */
    userMessage?: string;
    /** Suggested recovery action */
    recoveryAction?: string;
    /** Additional error details */
    details?: Record<string, unknown>;
    /** HTTP status code if from API */
    status?: number;
    /** Original error that caused this error */
    cause?: Error;
}
/**
 * Structured error class for Flowstack SDK
 *
 * Provides:
 * - Error code for programmatic handling
 * - User-friendly message for display
 * - Recovery action suggestions
 * - Additional details for debugging
 */
declare class FlowstackError extends Error {
    /** Error code for programmatic handling */
    readonly code: ErrorCode;
    /** User-friendly message safe to display */
    readonly userMessage: string;
    /** Suggested action to recover from the error */
    readonly recoveryAction?: string;
    /** Additional error details */
    details?: Record<string, unknown>;
    /** HTTP status code if from API response */
    readonly status?: number;
    /** Original error that caused this error */
    readonly originalCause?: Error;
    constructor(code: ErrorCode, message?: string, options?: FlowstackErrorOptions);
    /**
     * Create a FlowstackError from an API response
     */
    static fromApiError(status: number, body: string | Record<string, unknown>): FlowstackError;
    /**
     * Create a FlowstackError from a network error
     */
    static fromNetworkError(error: Error): FlowstackError;
    /**
     * Create a FlowstackError from any error
     */
    static from(error: unknown): FlowstackError;
    /**
     * Check if this error is retryable
     */
    isRetryable(): boolean;
    /**
     * Check if this error requires re-authentication
     */
    requiresReauth(): boolean;
    /**
     * Get a serializable representation of the error
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Type guard to check if an error is a FlowstackError
 */
declare function isFlowstackError(error: unknown): error is FlowstackError;
/**
 * Utility to wrap async functions with error handling
 */
declare function withErrorHandling<T>(fn: () => Promise<T>, context?: string): Promise<T>;

/**
 * Configuration Validator
 *
 * Validates FlowstackConfig on startup and provides helpful error messages.
 */

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validate the SDK configuration
 *
 * @param config - FlowstackConfig to validate
 * @returns ValidationResult with errors and warnings
 *
 * @example
 * ```ts
 * const result = validateConfig(config);
 * if (!result.valid) {
 *   console.error('Config errors:', result.errors);
 * }
 * result.warnings.forEach(w => console.warn(w));
 * ```
 */
declare function validateConfig(config: FlowstackConfig): ValidationResult;
/**
 * Validate config and throw FlowstackError if invalid
 *
 * @param config - FlowstackConfig to validate
 * @throws FlowstackError if configuration is invalid
 */
declare function validateConfigOrThrow(config: FlowstackConfig): void;
/**
 * Check if config is for development/testing (relaxed validation)
 */
declare function isDevelopmentConfig(config: FlowstackConfig): boolean;
/**
 * Get a summary of the config for debugging
 */
declare function getConfigSummary(config: FlowstackConfig): Record<string, unknown>;

/**
 * Hook for authentication operations
 */
declare function useAuth(): UseAuthReturn;

/**
 * Hook for workspace management
 */
declare function useWorkspace(): UseWorkspaceReturn;

/**
 * Hook for dataset operations
 */
declare function useDatasets(): UseDatasetsReturn;

/**
 * Hook for visualization operations
 */
declare function useVisualizations(): UseVisualizationsReturn;

/**
 * Hook for report operations
 */
declare function useReports(): UseReportsReturn;

/**
 * Hook for ML model operations
 */
declare function useModels(): UseModelsReturn;

/**
 * Hook options for {@link useDataSources}.
 */
interface UseDataSourcesOptions {
    /**
     * P0-69: when true, appends `include_provenance=true` to the list
     * request so each data source comes back with a `_flowstack`
     * workspace attribution envelope. Useful for built apps that need to
     * know which workspace a shared data source belongs to.
     */
    includeProvenance?: boolean;
}
/**
 * Hook for data source management
 */
declare function useDataSources(options?: UseDataSourcesOptions): UseDataSourcesReturn;

/**
 * Hook for AI agent interactions
 * @param template - Agent template to use (default: 'data-science'). NOTE
 *   (P0-132 / G6): for apps whose brain is a registered persona, this template
 *   only sets a fallback agent_name + default instructions that the persona
 *   overrides — it does NOT mean the app runs on a "data-science parent agent".
 *   Pass a persona via `options.persona` (G4) to target it explicitly, or
 *   `options.systemPrompt` (G5) for an inline prompt. The default is fine for
 *   persona-backed apps; 'custom' is the honest label when no template applies.
 */
declare function useAgent(template?: AgentTemplate, options?: UseAgentOptions): UseAgentReturn;

/**
 * Hook for direct query execution
 */
declare function useQuery(): UseQueryReturn;

/**
 * Agent Factory Type Definitions
 *
 * Types for the intent-based agent factory system.
 */

/**
 * Extended agent configuration with dynamic properties
 */
interface DynamicAgentConfig {
    /** Base template for defaults */
    template: AgentTemplate;
    /** Custom system prompt - overrides template default */
    systemPrompt?: string;
    /** Tool whitelist - limits available tools */
    tools?: string[];
    /** Enable streaming responses */
    streaming?: boolean;
    /** Network mode for code execution */
    networkMode?: 'SANDBOX' | 'PUBLIC';
    /** Agent display name */
    name?: string;
    /** Agent description for debugging */
    description?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Created timestamp */
    createdAt?: Date;
    /** Last used timestamp */
    lastUsedAt?: Date;
}
/**
 * Intent categories for matching
 */
type IntentCategory = 'data_analysis' | 'visualization' | 'data_transformation' | 'machine_learning' | 'content_creation' | 'research' | 'customer_support' | 'code_generation' | 'general_assistant' | 'custom';
/**
 * Extracted entity from intent string
 */
interface IntentEntity {
    /** Entity type */
    type: 'data_source' | 'output_format' | 'domain' | 'constraint' | 'action';
    /** Extracted value */
    value: string;
    /** Position in original string */
    position: number;
}
/**
 * Result of intent analysis
 */
interface IntentAnalysis {
    /** Detected primary intent category */
    category: IntentCategory;
    /** Confidence score 0-1 */
    confidence: number;
    /** Extracted entities from intent */
    entities: IntentEntity[];
    /** Suggested agent configuration */
    suggestedConfig: Partial<DynamicAgentConfig>;
    /** Original intent string */
    originalIntent: string;
    /** Analysis method used */
    method: 'rule' | 'llm' | 'hybrid';
}
/**
 * Intent pattern for rule-based matching
 */
interface IntentPattern {
    /** Unique pattern identifier */
    id: string;
    /** Category this pattern maps to */
    category: IntentCategory;
    /** Regex patterns to match */
    patterns: RegExp[];
    /** Keywords to look for */
    keywords: string[];
    /** Suggested config when matched */
    suggestedConfig: Partial<DynamicAgentConfig>;
    /** Priority for pattern matching (higher = checked first) */
    priority?: number;
}
/**
 * Registered agent entry
 */
interface RegisteredAgent {
    /** Unique agent identifier */
    id: string;
    /** Human-readable agent name */
    name: string;
    /** Agent configuration */
    config: DynamicAgentConfig;
    /** Original intent that created this agent */
    intent: string;
    /** Analysis result */
    analysis: IntentAnalysis;
    /** Creation timestamp */
    createdAt: Date;
    /** Last used timestamp */
    lastUsedAt: Date;
    /** Number of times this agent was used */
    usageCount: number;
}
/**
 * Agent factory configuration options
 */
interface AgentFactoryOptions {
    /** Use LLM for ambiguous intents (default: true) */
    useLLMFallback?: boolean;
    /** Minimum confidence for rule-based matching (default: 0.7) */
    ruleConfidenceThreshold?: number;
    /** Cache created agents (default: true) */
    enableCache?: boolean;
    /** Cache TTL in milliseconds (default: 30 minutes) */
    cacheTTL?: number;
    /** Custom intent patterns to add */
    customPatterns?: IntentPattern[];
}
/**
 * Intent analyzer configuration options
 */
interface IntentAnalyzerOptions {
    /** Custom patterns to add to default patterns */
    customPatterns?: IntentPattern[];
    /** Minimum confidence threshold for rule-based (default: 0.7) */
    confidenceThreshold?: number;
    /** Enable LLM fallback for low-confidence matches (default: true) */
    useLLMFallback?: boolean;
}
/**
 * Agent registry configuration options
 */
interface AgentRegistryOptions {
    /** Enable caching (default: true) */
    enableCache?: boolean;
    /** Cache TTL in milliseconds (default: 30 minutes) */
    cacheTTL?: number;
}
/**
 * Options for useIntentAgent hook
 */
interface UseIntentAgentOptions extends AgentFactoryOptions {
    /** Initial intent to create agent with */
    initialIntent?: string;
}
/**
 * Return type for useIntentAgent hook
 */
interface UseIntentAgentReturn {
    /** Create agent from intent */
    createAgent: (intent: string) => Promise<RegisteredAgent>;
    /** Execute query with current agent */
    query: (prompt: string) => Promise<void>;
    /** Current agent (if created) */
    agent: RegisteredAgent | null;
    /** Chat messages */
    messages: ChatMessage[];
    /** Streaming state */
    isStreaming: boolean;
    /** Loading state during agent creation */
    isCreating: boolean;
    /** Tool calls from current session */
    toolCalls: ToolCall[];
    /** Error state */
    error: string | null;
    /** Clear current agent and messages */
    reset: () => void;
    /** List all registered agents */
    listAgents: () => RegisteredAgent[];
    /** Switch to a registered agent by ID */
    useAgent: (agentId: string) => void;
    /** Remove an agent by ID */
    removeAgent: (agentId: string) => boolean;
}
/**
 * Function type for executing LLM queries (used for fallback analysis)
 */
type LLMExecutor = (prompt: string) => Promise<string>;

/**
 * Hook for intent-based AI agent interactions
 *
 * @param options - Factory configuration options
 */
declare function useIntentAgent(options?: UseIntentAgentOptions): UseIntentAgentReturn;

interface AuthGuardOptions {
    /** Require authentication (default: true) */
    requireAuth?: boolean;
    /** Require a workspace to be selected */
    requireWorkspace?: boolean;
    /** URL to redirect to when not authenticated */
    redirectTo?: string;
}
interface UseAuthGuardReturn {
    /** Whether the user is allowed to access the protected content */
    isAllowed: boolean;
    /** Whether auth state is still being determined */
    isLoading: boolean;
    /** Whether a redirect should occur */
    shouldRedirect: boolean;
    /** The URL to redirect to (if shouldRedirect is true) */
    redirectTo?: string;
    /** Whether the user is authenticated */
    isAuthenticated: boolean;
    /** Whether a workspace is selected */
    hasWorkspace: boolean;
}
/**
 * Hook for programmatic auth guard logic
 */
declare function useAuthGuard(options?: AuthGuardOptions): UseAuthGuardReturn;

type ConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected' | 'error';
interface UseFlowstackStatusReturn {
    /** Current connection status */
    status: ConnectionStatus;
    /** Whether connected to backend */
    isConnected: boolean;
    /** Whether currently checking connection */
    isChecking: boolean;
    /** Last measured latency in milliseconds */
    latency: number | null;
    /** Last successful connection time */
    lastConnected: Date | null;
    /** Last error message if any */
    error: string | null;
    /** Manually trigger a connection check */
    checkConnection: () => Promise<void>;
}
interface UseFlowstackStatusOptions {
    /** Polling interval in milliseconds (default: 30000) */
    pollInterval?: number;
    /** Whether to poll automatically (default: true) */
    autoPoll?: boolean;
    /** Whether to check on mount (default: true) */
    checkOnMount?: boolean;
}
/**
 * Hook for monitoring Flowstack backend status
 */
declare function useFlowstackStatus(options?: UseFlowstackStatusOptions): UseFlowstackStatusReturn;

/**
 * Hook for user management operations
 */
declare function useUserManagement(): UseUserManagementReturn;

/**
 * Hook for published site management
 */
declare function useSites(): UseSitesReturn;

declare function useAgents(): UseAgentsReturn;

/**
 * useCollection — Direct MongoDB access for built-app components.
 *
 * Provides reactive read access and direct write mutations (insert, update, remove)
 * to MongoDB collections. The agent is NOT involved in data operations.
 *
 * Collection names are auto-prefixed with app_scope by the backend —
 * just pass the short name (e.g. 'transactions', not 'site_abc__transactions').
 *
 * Usage:
 *   const { documents, isLoading, insert, update, remove } = useCollection<Transaction>('transactions', {
 *     sort: { date: -1 },
 *     limit: 50,
 *     refreshOnAgentComplete: true,
 *   });
 *
 *   // Insert a document — auto-refetches all useCollection('transactions') instances
 *   await insert({ date: '2026-04-02', amount: 42.50, category: 'Groceries' });
 *
 *   // Update a document
 *   await update({ _id: docId }, { $set: { category: 'Dining' } });
 *
 *   // Delete a document
 *   await remove({ _id: docId });
 */

interface UseCollectionOptions {
    /** MongoDB query filter (e.g. { status: 'pending' }) */
    filter?: Record<string, any>;
    /** Max documents to return (default 50, max 500) */
    limit?: number;
    /** Skip N documents for pagination */
    skip?: number;
    /** Sort spec (e.g. { date: -1 } for newest first) */
    sort?: Record<string, 1 | -1>;
    /** Field projection (e.g. { _id: 0, amount: 1 }) */
    projection?: Record<string, 0 | 1>;
    /** Auto-poll interval in ms (optional — no polling by default) */
    refreshInterval?: number;
    /** Auto-refresh when agent completes a MongoDB write (default false) */
    refreshOnAgentComplete?: boolean;
    /** Skip initial fetch (useful for conditional rendering) */
    enabled?: boolean;
    /** Data layer override: 'shared' | 'user' | 'auto' (default: backend decides via app_config) */
    layer?: CollectionLayer;
    /**
     * P0-69: include workspace provenance envelope (`_flowstack`) on every
     * document in the response. Sends `include_provenance=true` on the
     * query string. When true, each document will have a `_flowstack`
     * field with workspace attribution metadata. Default false.
     */
    includeProvenance?: boolean;
}
interface UseCollectionReturn<T> {
    /** Array of documents from the collection */
    documents: T[];
    /** Number of documents returned (≤ limit) */
    count: number;
    /** Total documents matching the filter (for pagination) */
    total: number;
    /** Loading state */
    isLoading: boolean;
    /** Error message if query failed */
    error: string | null;
    /** Manual refresh — re-fetches with current options */
    refresh: () => Promise<void>;
    /** Insert one or more documents. Auto-refetches after success. */
    insert: (doc: Partial<T> | Partial<T>[]) => Promise<{
        inserted_ids: string[];
    }>;
    /** Update documents matching filter. Auto-refetches after success. */
    update: (filter: Record<string, any>, update: Record<string, any>, opts?: {
        upsert?: boolean;
    }) => Promise<{
        modified_count: number;
    }>;
    /** Delete documents matching filter. Auto-refetches after success. */
    remove: (filter: Record<string, any>) => Promise<{
        deleted_count: number;
    }>;
}
declare const COLLECTION_CHANGED_EVENT = "flowstack:collection-changed";
declare function useCollection<T = Record<string, any>>(collection: string, options?: UseCollectionOptions): UseCollectionReturn<T>;

interface UseToolInvocationOptions {
    /** Target agent name (e.g. "finance_agent") */
    agentName: string;
    /** Tool to invoke (e.g. "mongodb_query") */
    toolName: string;
}
interface UseToolInvocationReturn<T = any> {
    /** Call the tool with keyword arguments */
    invoke: (kwargs?: Record<string, any>) => Promise<T | null>;
    /** Last successful result */
    result: T | null;
    /** True while the tool call is in flight */
    isLoading: boolean;
    /** Error message from the last failed call */
    error: string | null;
    /** Reset result and error state */
    reset: () => void;
}
declare function useToolInvocation<T = any>(options: UseToolInvocationOptions): UseToolInvocationReturn<T>;

/**
 * useConnections — Manage external service connections (Google, Reddit, Strava, Twitter, GitHub).
 *
 * Provides status, connect, and disconnect for all supported OAuth integrations.
 * Built apps should include a Settings page that renders connection cards
 * so users can link their accounts to enable agent capabilities.
 *
 * Usage:
 *   const { connections, connect, disconnect, refresh, isLoading } = useConnections();
 *
 *   // Check if Google Analytics is connected
 *   connections.google?.analytics // true | false
 *
 *   // Connect Google services
 *   connect('google', ['analytics', 'drive']);
 *
 *   // Disconnect Reddit
 *   disconnect('reddit');
 */
interface GoogleConnectionStatus {
    connected: boolean;
    email?: string;
    analytics?: boolean;
    ads?: boolean;
    drive?: boolean;
    youtube?: boolean;
    scopes?: string[];
}
interface ServiceConnectionStatus {
    connected: boolean;
    username?: string;
}
interface GitHubConnectionStatus {
    connected: boolean;
    username?: string;
    avatarUrl?: string;
}
interface ConnectionsState {
    google: GoogleConnectionStatus;
    reddit: ServiceConnectionStatus;
    strava: ServiceConnectionStatus;
    twitter: ServiceConnectionStatus;
    github: GitHubConnectionStatus;
}
type GoogleService = 'analytics' | 'ads' | 'drive' | 'youtube' | 'all';
type ServiceProvider = 'google' | 'reddit' | 'strava' | 'twitter' | 'github';
interface UseConnectionsReturn {
    /** Current connection status for all services */
    connections: ConnectionsState;
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Connect a service — opens OAuth popup/redirect */
    connect: (provider: ServiceProvider, services?: GoogleService[]) => Promise<void>;
    /** Disconnect a service */
    disconnect: (provider: ServiceProvider) => Promise<void>;
    /** Refresh connection status */
    refresh: () => Promise<void>;
}
declare function useConnections(): UseConnectionsReturn;

declare function useSiteVersions(siteId: string | null): UseSiteVersionsReturn;

/**
 * useProviderCredentials — Manage LLM provider credentials (BYOK + Ollama).
 *
 * Wraps the /api/v1/user/provider-credentials backend endpoints.
 * Used by the Casino "Models" settings tab to list, create, and delete
 * provider credentials including Ollama local inference.
 *
 * Usage:
 *   const { credentials, purposes, createCredential, deleteCredential, isLoading } = useProviderCredentials();
 */

interface CreateCredentialParams {
    provider: LLMProvider;
    api_key?: string;
    host?: string;
    model_id?: string;
    purpose?: string;
    is_default?: boolean;
    model_settings?: ProviderModelSettings;
}
interface UseProviderCredentialsReturn {
    credentials: ProviderCredential[];
    purposes: PurposeInfo[];
    createCredential: (params: CreateCredentialParams) => Promise<ProviderCredential>;
    deleteCredential: (credentialId: string) => Promise<void>;
    refresh: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}
declare function useProviderCredentials(): UseProviderCredentialsReturn;

/**
 * useOllamaDetection — Detect a local Ollama instance and list available models.
 *
 * Probes the Ollama API at the given host (default: http://localhost:11434)
 * via GET /api/tags. If Ollama is running and CORS is enabled, returns the
 * list of locally available models.
 *
 * Note: Users must set OLLAMA_ORIGINS=* (or include the Casino origin) when
 * starting Ollama for browser-side detection to work.
 *
 * Usage:
 *   const { available, models, error, detect } = useOllamaDetection();
 */

interface UseOllamaDetectionReturn {
    available: boolean;
    models: OllamaLocalModel[];
    host: string;
    error: string | null;
    isDetecting: boolean;
    detect: (host?: string) => Promise<OllamaStatus>;
}
declare function useOllamaDetection(initialHost?: string): UseOllamaDetectionReturn;

/**
 * useDataOverview — Unified summary of all user-owned data.
 *
 * Fetches workspace artifact counts, site metadata, and MongoDB collection stats.
 * Used by the Casino "My Data" view for the top-level summary cards.
 */

interface UseDataOverviewReturn {
    overview: UserDataOverview | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}
declare function useDataOverview(): UseDataOverviewReturn;

/**
 * useUserCollections — List all MongoDB collections the user owns.
 *
 * Returns collections across all sites, grouped by site ID.
 * Supports optional site_id filtering and schema inclusion.
 */

interface UseUserCollectionsOptions {
    siteId?: string;
    includeSchema?: boolean;
}
interface UseUserCollectionsReturn {
    collections: UserCollectionInfo[];
    groupedBySite: Record<string, UserCollectionInfo[]>;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    deleteCollection: (fullName: string) => Promise<boolean>;
}
declare function useUserCollections(options?: UseUserCollectionsOptions): UseUserCollectionsReturn;

/**
 * useCollectionExplorer — Browse, query, export, and delete a specific MongoDB collection.
 *
 * Provides paginated document browsing, schema inference, CSV/JSON export,
 * and collection deletion for the Casino data explorer.
 */

interface UseCollectionExplorerOptions {
    filter?: Record<string, any>;
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
    database?: string;
}
interface UseCollectionExplorerReturn<T> {
    documents: T[];
    total: number;
    schema: CollectionSchemaInfo | null;
    isLoading: boolean;
    error: string | null;
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    refresh: () => Promise<void>;
    exportAs: (format: 'json' | 'csv') => Promise<void>;
    deleteCollection: () => Promise<boolean>;
}
declare function useCollectionExplorer<T = Record<string, any>>(collection: string, options?: UseCollectionExplorerOptions): UseCollectionExplorerReturn<T>;

/**
 * usePublicCollection — anonymous public submissions for built apps.
 *
 * Provides read and insert access to a public collection that requires
 * NO user authentication. Any visitor can read and write documents.
 * The collection must be declared in the app's publicCollections config.
 *
 * Designed for: leaderboards, guestbooks, comment threads, voting, polls.
 *
 * Usage:
 *   const { documents, isLoading, insert } = usePublicCollection<HighScore>('high_scores', {
 *     sort: { score: -1 },
 *     limit: 25,
 *     filter: { album: 'yeezus' },
 *   });
 *
 *   await insert({ album: 'yeezus', name: 'KEON', score: 12500 });
 *
 * No credentials required — the hook reads appScope from FlowstackProvider config.
 * Rate limiting and spam protection are enforced server-side.
 */
interface UsePublicCollectionOptions {
    /** MongoDB query filter (e.g. { album: 'yeezus' }) */
    filter?: Record<string, any>;
    /** Max documents to return (default 25, max 200) */
    limit?: number;
    /** Skip N documents for pagination */
    skip?: number;
    /** Sort spec (e.g. { score: -1 } for highest first) */
    sort?: Record<string, 1 | -1>;
    /** Auto-refresh interval in ms (optional) */
    refreshInterval?: number;
    /** Skip initial fetch (useful for conditional rendering) */
    enabled?: boolean;
}
interface UsePublicCollectionReturn<T> {
    /** Array of documents (submitter_ip_hash stripped server-side) */
    documents: T[];
    /** Count of documents returned (≤ limit) */
    count: number;
    /** Total documents in collection matching the filter */
    total: number;
    /** Loading state */
    isLoading: boolean;
    /** Error message if query failed */
    error: string | null;
    /** Insert a single document — no auth required */
    insert: (doc: Partial<T>) => Promise<{
        inserted_id: string;
    }>;
    /** Manual refresh */
    refresh: () => Promise<void>;
}
declare function usePublicCollection<T = Record<string, any>>(collection: string, options?: UsePublicCollectionOptions): UsePublicCollectionReturn<T>;

/**
 * useConversations — fetches the user's past Casino builder conversations
 * from GET /library/conversations. Powers the Sessions sidebar in ChatView.
 */
interface ConversationSummary {
    id: string;
    title: string;
    preview?: string;
    last_message_at?: string | number;
    message_count?: number;
    starred?: boolean;
}
interface UseConversationsOptions {
    limit?: number;
    includeDeleted?: boolean;
    refreshIntervalMs?: number;
}
interface UseConversationsReturn {
    conversations: ConversationSummary[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    deleteConversation: (sessionId: string) => Promise<boolean>;
    renameConversation: (sessionId: string, title: string) => Promise<boolean>;
}
declare function useConversations(options?: UseConversationsOptions): UseConversationsReturn;

type IntegrationAuthType = 'bearer' | 'api_key_header' | 'api_key_query' | 'basic' | 'none';
interface IntegrationEndpoint {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description?: string;
    parameters?: Record<string, unknown>;
}
interface Integration {
    integration_id: string;
    name: string;
    description: string;
    base_url: string;
    auth_type: IntegrationAuthType;
    /** Redacted preview — raw secrets are never returned after creation */
    auth_preview?: Record<string, unknown>;
    endpoint_count: number;
    endpoints?: IntegrationEndpoint[];
    workspace_id?: string;
    created_at: number;
    updated_at?: number;
}
interface CreateIntegrationInput {
    name: string;
    /** 20–300 chars */
    description: string;
    /** HTTPS base URL, e.g. "https://api.stripe.com/v1" */
    base_url: string;
    auth_type?: IntegrationAuthType;
    /** Credentials — encrypted at rest, never returned after save */
    auth_config?: Record<string, unknown>;
    endpoints?: IntegrationEndpoint[];
    workspace_id?: string;
}
interface UpdateIntegrationInput {
    name?: string;
    description?: string;
    base_url?: string;
    auth_config?: Record<string, unknown>;
    endpoints?: IntegrationEndpoint[];
}
interface UseIntegrationsReturn {
    integrations: Integration[];
    isLoading: boolean;
    error: string | null;
    /** Create and register a new HTTP API integration */
    create: (input: CreateIntegrationInput) => Promise<Integration | null>;
    /** Update an existing integration */
    update: (id: string, input: UpdateIntegrationInput) => Promise<boolean>;
    /** Delete an integration */
    remove: (id: string) => Promise<boolean>;
    /** Get a single integration with full endpoint details */
    get: (id: string) => Promise<Integration | null>;
    /** Refresh the list */
    refresh: () => Promise<void>;
}
declare function useIntegrations(): UseIntegrationsReturn;

type AutomationOutputType = 'silent' | 'email' | 'webhook' | 'file';
type AutomationStatus = 'active' | 'paused' | 'error';
type AutomationRunStatus = 'success' | 'failure' | 'running' | 'timeout';
interface AutomationOutputConfig {
    /** Where to send results (default: "silent" — stored only) */
    type: AutomationOutputType;
    /** Email address — required when type="email" */
    to?: string;
    /** Webhook URL — required when type="webhook" */
    url?: string;
    /** Custom headers for webhook delivery */
    headers?: Record<string, string>;
    /** Output format for file/email: "csv" | "json" | "pdf" */
    format?: string;
    /** Subject line template for emails */
    subject_template?: string;
}
interface Automation {
    automation_id: string;
    name: string;
    description: string;
    prompt: string;
    /** 5-field Unix cron expression */
    schedule: string;
    timezone: string;
    /** Agent persona names to route this job to */
    target_agents: string[];
    status: AutomationStatus;
    output_config: AutomationOutputConfig;
    max_runtime_seconds: number;
    retry_on_failure: boolean;
    max_retries: number;
    created_at: number;
    updated_at: number;
    last_run_at: number;
    last_run_status: string;
    run_count: number;
    failure_count: number;
}
interface AutomationRun {
    automation_id: string;
    run_id: string;
    status: AutomationRunStatus;
    started_at: number;
    completed_at?: number;
    duration_ms: number;
    credits_used: number;
    output_summary: string;
    output_url?: string;
    error_msg?: string;
}
interface CreateAutomationInput {
    name: string;
    /** What the agent should do each run */
    prompt: string;
    /** 5-field Unix cron, e.g. "0 9 * * 1-5" */
    schedule: string;
    timezone?: string;
    target_agents?: string[];
    output_config?: Partial<AutomationOutputConfig>;
    max_runtime_seconds?: number;
    retry_on_failure?: boolean;
    max_retries?: number;
    description?: string;
}
interface UpdateAutomationInput {
    name?: string;
    prompt?: string;
    schedule?: string;
    timezone?: string;
    target_agents?: string[];
    output_config?: Partial<AutomationOutputConfig>;
    max_runtime_seconds?: number;
    retry_on_failure?: boolean;
    max_retries?: number;
    description?: string;
}
interface UseAutomationsReturn {
    automations: Automation[];
    isLoading: boolean;
    error: string | null;
    /** Create a new scheduled automation */
    create: (input: CreateAutomationInput) => Promise<Automation | null>;
    /** Update an existing automation */
    update: (id: string, input: UpdateAutomationInput) => Promise<boolean>;
    /** Delete an automation and its EventBridge rule */
    remove: (id: string) => Promise<boolean>;
    /** Pause scheduling without deleting */
    pause: (id: string) => Promise<boolean>;
    /** Resume a paused automation */
    resume: (id: string) => Promise<boolean>;
    /** Trigger an immediate run (ignores schedule) */
    runNow: (id: string) => Promise<{
        invoked: boolean;
        status_code?: number;
    } | null>;
    /** Get run history for an automation */
    getRuns: (id: string, limit?: number) => Promise<AutomationRun[]>;
    /** Refresh the list */
    refresh: () => Promise<void>;
}
declare function useAutomations(): UseAutomationsReturn;

/**
 * Mock Fixtures for Development Mode
 *
 * Provides realistic test data for development without a backend.
 */

/**
 * Mock user credentials
 */
declare const mockCredentials: FlowstackCredentials;
/**
 * Mock user derived from credentials
 */
declare const mockUser: User;
/**
 * Mock workspaces
 */
declare const mockWorkspaces: WorkspaceInfo[];
/**
 * Mock datasets
 */
declare const mockDatasets: DatasetInfo[];
/**
 * Mock visualizations
 */
declare const mockVisualizations: VisualizationData[];
/**
 * Mock data sources
 */
declare const mockDataSources: DataSource[];
/**
 * Mock chat messages (for demo)
 */
declare const mockChatHistory: ChatMessage[];
/**
 * Generate a unique ID for mock data
 */
declare function generateMockId(prefix?: string): string;
/**
 * Simulate network delay for realistic mock responses
 */
declare function mockDelay(minMs?: number, maxMs?: number): Promise<void>;
/**
 * Mock managed users for admin dashboard
 */
declare const mockManagedUsers: ManagedUser[];
/**
 * Mock user statistics
 */
declare const mockUserStats: UserStats;
/**
 * Mock user activity logs
 */
declare const mockUserActivity: UserActivityLog[];

interface LoginFormProps {
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
declare function LoginForm({ onSuccess, onError, showRegisterLink, registerHref, className, inputClassName, buttonClassName, labels, }: LoginFormProps): react_jsx_runtime.JSX.Element;

interface RegisterFormProps {
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
declare function RegisterForm({ onSuccess, onError, showLoginLink, loginHref, minPasswordLength, className, inputClassName, buttonClassName, labels, }: RegisterFormProps): react_jsx_runtime.JSX.Element;

interface GoogleSignInProps {
    /** Callback on successful sign-in */
    onSuccess?: () => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Custom className */
    className?: string;
    /** Button text */
    label?: string;
}
/**
 * Google OAuth sign-in button
 */
declare function GoogleSignIn({ onSuccess, onError, className, label, }: GoogleSignInProps): react_jsx_runtime.JSX.Element;

interface AuthGuardProps {
    /** Protected content */
    children: ReactNode;
    /** Content to show when not authenticated */
    fallback?: ReactNode;
    /** Redirect URL when not authenticated (alternative to fallback) */
    redirectTo?: string;
    /** Show loading state while checking auth */
    loadingComponent?: ReactNode;
    /** Require a specific workspace to be selected */
    requireWorkspace?: boolean;
    /**
     * Opt-in guest chat for built apps (U1). When the app has an `appScope` and
     * the site enabled guest chat server-side (`app_config.allowGuestChat`), an
     * unauthenticated visitor is transparently issued a short-lived guest session
     * (`POST /auth/guest`) instead of being shown the login gate — removing the
     * "sign up to the desk" friction. Per-site control lives entirely in the
     * backend flag: if the site hasn't opted in, `/auth/guest` returns 403 and we
     * fall back to the normal login UI. Default true, but it's a no-op unless the
     * app is built with an `appScope` (the Casino dashboard has none, so it is
     * unaffected and always requires real login).
     */
    allowGuest?: boolean;
}
/**
 * Auth guard component
 */
declare function AuthGuard({ children, fallback, redirectTo, loadingComponent, requireWorkspace, allowGuest, }: AuthGuardProps): react_jsx_runtime.JSX.Element;

interface AdminGateProps {
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
declare function AdminGate({ children, passwordHash, fallback, storageKey, }: AdminGateProps): react_jsx_runtime.JSX.Element;

interface BrokeredLoginButtonProps {
    /** Override broker URL (default https://openinferencefoundation.org/auth/broker). */
    brokerUrl?: string;
    /** Button label (default "Continue with Flowstack"). */
    label?: string;
    /** Optional wrapper className. */
    className?: string;
    /** Fired after credentials are successfully injected. */
    onSuccess?: (credentials: FlowstackCredentials) => void;
}
declare function BrokeredLoginButton({ brokerUrl, label, className, onSuccess, }: BrokeredLoginButtonProps): react_jsx_runtime.JSX.Element;

interface WorkspaceSelectorProps {
    /** List of workspaces */
    workspaces: WorkspaceInfo[];
    /** Currently selected workspace */
    selected: WorkspaceInfo | null;
    /** Callback when workspace is selected */
    onSelect: (workspace: WorkspaceInfo) => void;
    /** Callback to create new workspace */
    onCreateNew?: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Custom className */
    className?: string;
    /** Placeholder text */
    placeholder?: string;
}
/**
 * Workspace selector dropdown
 */
declare function WorkspaceSelector({ workspaces, selected, onSelect, onCreateNew, isLoading, className, placeholder, }: WorkspaceSelectorProps): react_jsx_runtime.JSX.Element;

interface CreateWorkspaceModalProps {
    /** Whether modal is open */
    isOpen: boolean;
    /** Close callback */
    onClose: () => void;
    /** Callback after workspace is created */
    onCreated?: (workspace: WorkspaceInfo) => void;
    /** Custom className */
    className?: string;
}
/**
 * Create workspace modal
 */
declare function CreateWorkspaceModal({ isOpen, onClose, onCreated, className, }: CreateWorkspaceModalProps): react_jsx_runtime.JSX.Element | null;

interface DatasetUploaderProps {
    /** Upload handler */
    onUpload: (file: File, name?: string) => Promise<DatasetInfo | null>;
    /** Callback after successful upload */
    onUploadComplete?: (dataset: DatasetInfo) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Accepted file types */
    accept?: string;
    /** Max file size in MB */
    maxSizeMB?: number;
    /** Custom className */
    className?: string;
}
/**
 * Dataset uploader component
 */
declare function DatasetUploader({ onUpload, onUploadComplete, onError, accept, maxSizeMB, className, }: DatasetUploaderProps): react_jsx_runtime.JSX.Element;

interface ChatInterfaceProps {
    /** Chat messages */
    messages: ChatMessage[];
    /** Whether agent is streaming a response */
    isStreaming?: boolean;
    /** Send message callback */
    onSend: (message: string) => void;
    /** Clear messages callback */
    onClear?: () => void;
    /** Cancel current query */
    onCancel?: () => void;
    /** Connected data sources to display as badges */
    dataSources?: DataSourceBadgeInfo[];
    /** Placeholder text */
    placeholder?: string;
    /** Custom className */
    className?: string;
    /** Show clear button */
    showClearButton?: boolean;
    /** Disable input */
    disabled?: boolean;
}
/**
 * Chat interface component
 */
declare function ChatInterface({ messages, isStreaming, onSend, onClear, onCancel, dataSources, placeholder, className, showClearButton, disabled, }: ChatInterfaceProps): react_jsx_runtime.JSX.Element;

interface MessageListProps {
    /** Chat messages */
    messages: ChatMessage[];
    /** Whether agent is streaming */
    isStreaming?: boolean;
    /** Custom className */
    className?: string;
    /** Custom message renderer */
    renderMessage?: (message: ChatMessage) => React.ReactNode;
    /** Custom tool call renderer */
    renderToolCall?: (toolCall: ToolCall) => React.ReactNode;
    /** Custom visualization renderer */
    renderVisualization?: (viz: VisualizationData) => React.ReactNode;
}
/**
 * Message list component
 */
declare function MessageList({ messages, isStreaming, className, renderMessage, renderToolCall, renderVisualization, }: MessageListProps): react_jsx_runtime.JSX.Element;

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    className?: string;
}
declare function MarkdownRenderer({ content, className }: MarkdownRendererProps): react_jsx_runtime.JSX.Element;

interface AuthPageProps {
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
declare function AuthPage({ defaultTab, onSuccess, onError, logo, title, showGoogle, showFlowstackBroker, brokerUrl, footer, className, containerClassName, cardClassName, }: AuthPageProps): react_jsx_runtime.JSX.Element;

interface DashboardLayoutProps {
    /** Main content */
    children: ReactNode;
    /** Sidebar content */
    sidebar?: ReactNode;
    /** Header content */
    header?: ReactNode;
    /** Footer content */
    footer?: ReactNode;
    /** Show workspace selector in header */
    showWorkspaceSelector?: boolean;
    /** Show user menu in header */
    showUserMenu?: boolean;
    /** Sidebar collapsed by default */
    sidebarCollapsed?: boolean;
    /** Sidebar width in pixels */
    sidebarWidth?: number;
    /** Header height in pixels */
    headerHeight?: number;
    /** Additional CSS class */
    className?: string;
}
/**
 * Dashboard layout component with responsive sidebar
 */
declare function DashboardLayout({ children, sidebar, header, footer, showWorkspaceSelector, showUserMenu, sidebarCollapsed, sidebarWidth, headerHeight, className, }: DashboardLayoutProps): react_jsx_runtime.JSX.Element;

interface ChatPageProps {
    /** Page title */
    title?: string;
    /** Chat input placeholder */
    placeholder?: string;
    /** Welcome message when no messages */
    welcomeMessage?: ReactNode;
    /** Header content */
    header?: ReactNode;
    /** Sidebar content */
    sidebar?: ReactNode;
    /** Show clear button */
    showClearButton?: boolean;
    /** Show cancel button during streaming */
    showCancelButton?: boolean;
    /** Additional CSS class */
    className?: string;
    /** Callback when a message is sent */
    onMessageSent?: (message: string) => void;
    /** Callback when an error occurs */
    onError?: (error: string) => void;
}
/**
 * Complete chat page component
 */
declare function ChatPage({ title, placeholder, welcomeMessage, header, sidebar, showClearButton, showCancelButton, className, onMessageSent, onError, }: ChatPageProps): react_jsx_runtime.JSX.Element;

/**
 * Server-Sent Events (SSE) parser for streaming responses.
 *
 * ─── ARCHITECTURE ───────────────────────────────────────────────────────
 *
 * The backend (streaming_v2.py) emits SSE in standard two-line format:
 *
 *   event: delta
 *   data: {"delta": {"text": "Hello"}}
 *
 *   event: tool_call
 *   data: {"name": "execute_python", "id": "toolu_01...", "args": {...}}
 *
 *   event: tool_result
 *   data: {"tool_use_id": "toolu_01...", "content": "...", "status": "success"}
 *
 *   event: complete
 *   data: {"event_count": 483, "execution_ms": 12340}
 *
 * This parser:
 *  1. Pairs `event:` lines with the next `data:` line (pendingEventType)
 *  2. Normalizes the JSON payload into a consistent StreamEvent shape
 *  3. Yields events for consumption by useAgent() hook
 *
 * ─── V2 BACKEND EVENT FORMATS ──────────────────────────────────────────
 *
 * Text deltas:   event: delta   → data: {"delta": {"text": "token"}}
 * Tool calls:    event: tool_call → data: {"name": "...", "id": "...", "args": {...}}
 * Tool results:  event: tool_result → data: {"tool_use_id": "...", "content": "..."}
 * Final text:    event: text    → data: {"content": "full response", "accumulated": true}
 * Stream end:    event: complete → data: {"event_count": N, "execution_ms": N}
 * Errors:        event: error   → data: {"error": "message"}
 *
 * ────────────────────────────────────────────────────────────────────────
 */

/**
 * Parse a single SSE line into a StreamEvent.
 *
 * Handles three line types:
 *  - "data: {...}"  → Parse JSON, normalize to StreamEvent
 *  - "data: [DONE]" → Return done event
 *  - "event: type"  → Return bare type (used by parseSSEStream for pairing)
 *
 * @param line - Raw SSE line (e.g., "data: {...}")
 * @returns Parsed StreamEvent or null
 */
declare function parseSSELine(line: string): StreamEvent | null;
/**
 * Async generator that reads a ReadableStream and yields parsed StreamEvents.
 *
 * ─── SSE WIRE FORMAT ────────────────────────────────────────────────────
 *
 * The backend sends events as two-line pairs separated by blank lines:
 *
 *   event: delta\n          ← event type (optional but v2 always sends it)
 *   data: {"delta":...}\n   ← JSON payload
 *   \n                      ← blank line = end of event
 *
 * This generator:
 *  1. Buffers incoming bytes and splits on newlines
 *  2. When it sees "event: X", stores X as pendingEventType
 *  3. When it sees "data: {...}", parses the JSON via normalizeEvent()
 *  4. Applies the pending event type (overrides whatever normalizeEvent guessed)
 *  5. Yields the final StreamEvent
 *
 * This pairing is critical because normalizeEvent may guess wrong
 * (e.g., a tool_call payload with "name" field could be mistaken for
 * tool_use), but the explicit "event: tool_call" line corrects it.
 *
 * ────────────────────────────────────────────────────────────────────────
 *
 * @param reader - ReadableStreamDefaultReader from fetch response
 * @returns AsyncGenerator yielding StreamEvents
 */
declare function parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<StreamEvent, void, unknown>;
/**
 * Convenience wrapper: process an SSE stream with callbacks instead of async iteration.
 * Used when you prefer callback-style over for-await-of.
 *
 * @param response - Fetch Response with SSE body
 * @param onEvent - Called for each parsed StreamEvent
 * @param onError - Called if the stream throws (optional)
 */
declare function processSSEStream(response: Response, onEvent: (event: StreamEvent) => void, onError?: (error: Error) => void): Promise<void>;

/**
 * Storage utilities for credential and state persistence
 * Supports both localStorage and sessionStorage with user-scoped isolation
 */

/**
 * Save credentials to storage
 * @param credentials - Credentials to save
 * @param storageType - Storage type ('local' or 'session')
 */
declare function saveCredentials(credentials: FlowstackCredentials, storageType?: 'local' | 'session'): void;
/**
 * Load credentials from storage
 * @param storageType - Storage type ('local' or 'session')
 * @returns Stored credentials or null
 */
declare function loadCredentials(storageType?: 'local' | 'session'): FlowstackCredentials | null;
/**
 * Clear credentials from storage
 * @param storageType - Storage type ('local' or 'session')
 */
declare function clearCredentials(storageType?: 'local' | 'session'): void;
/**
 * Save selected workspace ID to storage
 * @param workspaceId - Workspace ID to save
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
declare function saveSelectedWorkspace(workspaceId: string, credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): void;
/**
 * Load selected workspace ID from storage
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 * @returns Workspace ID or null
 */
declare function loadSelectedWorkspace(credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): string | null;
/**
 * Clear selected workspace from storage
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
declare function clearSelectedWorkspace(credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): void;
/**
 * Save chat messages to storage
 * @param messages - Messages to save
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
declare function saveMessages<T>(messages: T[], workspaceId: string, credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): void;
/**
 * Load chat messages from storage
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 * @returns Messages array or empty array
 */
declare function loadMessages<T>(workspaceId: string, credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): T[];
/**
 * Clear chat messages from storage
 * @param workspaceId - Workspace ID for scoping
 * @param credentials - User credentials for scoping
 * @param storageType - Storage type
 */
declare function clearMessages(workspaceId: string, credentials: FlowstackCredentials | null, storageType?: 'local' | 'session'): void;
/**
 * Set an item in storage with optional expiry
 * @param key - Storage key
 * @param value - Value to store
 * @param ttlMs - Time to live in milliseconds (optional)
 * @param storageType - Storage type
 */
declare function setItem<T>(key: string, value: T, ttlMs?: number, storageType?: 'local' | 'session'): void;
/**
 * Get an item from storage
 * @param key - Storage key
 * @param storageType - Storage type
 * @returns Stored value or null
 */
declare function getItem<T>(key: string, storageType?: 'local' | 'session'): T | null;
/**
 * Remove an item from storage
 * @param key - Storage key
 * @param storageType - Storage type
 */
declare function removeItem(key: string, storageType?: 'local' | 'session'): void;
/**
 * Clear all Flowstack-related items from storage. P0-72: also clears
 * `privy:*` keys as a belt-and-suspenders sweep so a logout always leaves
 * a clean slate for the next login attempt — even if Privy's own
 * `logout()` call missed a key. Without this, a Flowstack-only clear
 * left Privy's sticky session in place and silently re-authed the
 * same wallet on the next click.
 * @param storageType - Storage type
 */
declare function clearAllFlowstackData(storageType?: 'local' | 'session'): void;

/**
 * Mermaid diagram utilities — sanitization and content parsing.
 *
 * Used by both the SDK's MessageList (built apps) and Casino's ChatMessage
 * to safely render LLM-generated Mermaid code.
 */
/**
 * Sanitize LLM-generated Mermaid code before passing to the renderer.
 * Strips HTML tags, replaces special characters in labels, and fixes
 * common structural issues that break the Mermaid parser.
 */
declare function sanitizeMermaidCode(code: string): string;
interface ContentSegment {
    type: 'text' | 'mermaid';
    content: string;
}
/**
 * Split message content into alternating text and mermaid segments.
 * Text segments preserve everything outside fenced mermaid blocks.
 * Mermaid segments contain only the code inside the fences (trimmed).
 */
declare function splitContentSegments(text: string): ContentSegment[];

/**
 * Agent Templates
 *
 * Pre-configured agent templates for different use cases.
 */

/**
 * Data Science agent template
 * Optimized for data analysis, ML, and visualization
 */
declare const dataScienceTemplate: AgentConfig;
/**
 * Marketing agent template
 * Optimized for content, campaigns, and analytics
 */
declare const marketingTemplate: AgentConfig;
/**
 * Support agent template
 * Optimized for customer support and knowledge base
 */
declare const supportTemplate: AgentConfig;
/**
 * Custom agent template factory
 */
declare function createCustomTemplate(config: Partial<AgentConfig>): AgentConfig;
/**
 * Get agent template by name
 */
declare function getAgentTemplate(name: AgentTemplate): AgentConfig;

/**
 * Intent Analyzer
 *
 * Analyzes user intent and returns structured analysis with suggested config.
 * Uses rule-based matching first, falls back to LLM for ambiguous cases.
 */

/**
 * Pre-configured patterns for common intent categories
 */
declare const DEFAULT_PATTERNS: IntentPattern[];
/**
 * Extract entities from intent string
 */
declare function extractEntities(intent: string): IntentEntity[];
/**
 * Analyze intent using rule-based matching
 */
declare function analyzeWithRules(intent: string, customPatterns?: IntentPattern[]): IntentAnalysis | null;
/**
 * Intent Analyzer
 *
 * Analyzes user intent strings and produces structured analysis
 * with suggested agent configurations.
 */
declare class IntentAnalyzer {
    private customPatterns;
    private confidenceThreshold;
    private useLLMFallback;
    constructor(options?: IntentAnalyzerOptions);
    /**
     * Analyze intent and return structured analysis
     */
    analyze(intent: string, llmExecutor?: LLMExecutor): Promise<IntentAnalysis>;
    /**
     * Register a custom intent pattern
     */
    addPattern(pattern: IntentPattern): void;
    /**
     * Remove a custom pattern by ID
     */
    removePattern(patternId: string): boolean;
    /**
     * Get all registered patterns (custom + defaults)
     */
    getPatterns(): IntentPattern[];
    /**
     * Get only custom patterns
     */
    getCustomPatterns(): IntentPattern[];
    /**
     * Update confidence threshold
     */
    setConfidenceThreshold(threshold: number): void;
    /**
     * Enable or disable LLM fallback
     */
    setLLMFallback(enabled: boolean): void;
}

/**
 * Agent Registry
 *
 * Stores and manages registered agents with caching support.
 * Supports fuzzy intent matching to reuse similar agent configurations.
 */

/**
 * Agent Registry
 *
 * Manages registration, retrieval, and caching of dynamically created agents.
 */
declare class AgentRegistry {
    private agents;
    private intentIndex;
    private options;
    constructor(options?: AgentRegistryOptions);
    /**
     * Register a new agent
     */
    register(agent: RegisteredAgent): void;
    /**
     * Get agent by ID
     */
    get(id: string): RegisteredAgent | undefined;
    /**
     * Find agent by exact intent match
     */
    findByExactIntent(intent: string): RegisteredAgent | undefined;
    /**
     * Find agent by similar intent (fuzzy matching)
     */
    findByIntent(intent: string, threshold?: number): RegisteredAgent | undefined;
    /**
     * Record agent usage (updates lastUsedAt and usageCount)
     */
    recordUsage(id: string): void;
    /**
     * List all registered agents
     */
    listAll(): RegisteredAgent[];
    /**
     * List agents sorted by usage count (most used first)
     */
    listByUsage(): RegisteredAgent[];
    /**
     * List agents sorted by last used (most recent first)
     */
    listByRecent(): RegisteredAgent[];
    /**
     * Remove agent by ID
     */
    remove(id: string): boolean;
    /**
     * Clear all registered agents
     */
    clear(): void;
    /**
     * Get registry size
     */
    size(): number;
    /**
     * Check if agent exists
     */
    has(id: string): boolean;
    /**
     * Clean expired agents
     */
    private cleanExpired;
    /**
     * Update cache TTL
     */
    setCacheTTL(ttl: number): void;
    /**
     * Enable or disable caching
     */
    setCacheEnabled(enabled: boolean): void;
    /**
     * Export registry state (for persistence)
     */
    export(): RegisteredAgent[];
    /**
     * Import registry state (for restoration)
     */
    import(agents: RegisteredAgent[]): void;
}

/**
 * Agent Factory
 *
 * Creates and manages dynamic agent configurations based on user intent.
 * Combines IntentAnalyzer for intent parsing and AgentRegistry for storage.
 */

/**
 * Agent Factory
 *
 * Creates agents dynamically based on user intent.
 * Uses rule-based analysis with optional LLM fallback.
 */
declare class AgentFactory {
    private analyzer;
    private registry;
    private options;
    constructor(options?: AgentFactoryOptions);
    /**
     * Create agent from user intent
     *
     * @param intent - Natural language description of what the user wants
     * @param llmExecutor - Optional function to execute LLM queries for fallback analysis
     * @returns Created or cached RegisteredAgent
     */
    createFromIntent(intent: string, llmExecutor?: LLMExecutor): Promise<RegisteredAgent>;
    /**
     * Create agent from explicit configuration (bypass intent analysis)
     *
     * @param name - Human-readable agent name
     * @param config - Partial agent configuration
     * @returns Created RegisteredAgent
     */
    createFromConfig(name: string, config: Partial<DynamicAgentConfig>): RegisteredAgent;
    /**
     * Build full config from intent analysis
     */
    private buildConfig;
    /**
     * Generate human-readable agent name from analysis
     */
    private generateAgentName;
    /**
     * Get agent by ID
     */
    getAgent(id: string): RegisteredAgent | undefined;
    /**
     * List all registered agents
     */
    listAgents(): RegisteredAgent[];
    /**
     * List agents by usage (most used first)
     */
    listAgentsByUsage(): RegisteredAgent[];
    /**
     * List agents by recency (most recent first)
     */
    listAgentsByRecent(): RegisteredAgent[];
    /**
     * Remove an agent by ID
     */
    removeAgent(id: string): boolean;
    /**
     * Clear all agents
     */
    clearAll(): void;
    /**
     * Get number of registered agents
     */
    getAgentCount(): number;
    /**
     * Record usage of an agent
     */
    recordAgentUsage(id: string): void;
    /**
     * Get the analyzer instance for direct access
     */
    getAnalyzer(): IntentAnalyzer;
    /**
     * Get the registry instance for direct access
     */
    getRegistry(): AgentRegistry;
    /**
     * Export factory state for persistence
     */
    exportState(): {
        agents: RegisteredAgent[];
        options: AgentFactoryOptions;
    };
    /**
     * Import factory state from persistence
     */
    importState(state: {
        agents: RegisteredAgent[];
    }): void;
}

/**
 * Login Route Generator
 *
 * Creates a Next.js API route handler for user login.
 *
 * @example
 * ```ts
 * // app/api/auth/login/route.ts
 * import { createLoginRoute } from 'flowstack-sdk/api/routes';
 *
 * export const POST = createLoginRoute({
 *   jwtSecret: process.env.JWT_SECRET!,
 *   passwordSecret: process.env.PASSWORD_SECRET!,
 * });
 * ```
 */

interface LoginRouteConfig {
    /** JWT secret for token signing */
    jwtSecret: string;
    /** Token expiration in seconds (default: 86400 = 24 hours) */
    tokenExpiry?: number;
    /** Tenant ID (default: shared tenant) */
    tenantId?: string;
    /** Sage API base URL */
    baseUrl?: string;
    /** Custom user lookup function */
    getUserByEmail?: (email: string) => Promise<{
        id: string;
        email: string;
        passwordHash: string;
    } | null>;
}

/**
 * Register Route Generator
 *
 * Creates a Next.js API route handler for user registration.
 *
 * @example
 * ```ts
 * // app/api/auth/register/route.ts
 * import { createRegisterRoute } from 'flowstack-sdk/api/routes';
 *
 * export const POST = createRegisterRoute({
 *   jwtSecret: process.env.JWT_SECRET!,
 *   passwordSecret: process.env.PASSWORD_SECRET!,
 * });
 * ```
 */

interface RegisterRouteConfig {
    /** JWT secret for token signing */
    jwtSecret: string;
    /** Token expiration in seconds (default: 86400 = 24 hours) */
    tokenExpiry?: number;
    /** Minimum password length (default: 8) */
    minPasswordLength?: number;
    /** Tenant ID (default: shared tenant) */
    tenantId?: string;
    /** Sage API base URL */
    baseUrl?: string;
    /** Custom user creation function */
    createUser?: (data: {
        email: string;
        passwordHash: string;
    }) => Promise<{
        id: string;
        email: string;
    }>;
    /** Check if email already exists */
    userExists?: (email: string) => Promise<boolean>;
}

/**
 * useModelPreference — User-pinned LLM credential resolution.
 *
 * Wraps the backend `/user/model-preference` routes (P0-95 finale):
 *   GET    /user/model-preference          → current resolved state
 *   PUT    /user/model-preference          → set or clear pinned credential_id
 *   GET    /user/model-preference/options  → platform creds available in tenant pool
 *
 * The Casino Settings → Model tab (`ModelSettingsView`) drives off this hook;
 * the previous SDK shim returned the wrong shape and the page error-boundaried
 * to blank.
 */

interface UseModelPreferenceReturn {
    preference: ModelPreferenceState | null;
    options: ModelOption[];
    isLoading: boolean;
    error: string | null;
    setPreference: (credentialId: string | null) => Promise<boolean>;
    refresh: () => Promise<void>;
}
declare function useModelPreference(): UseModelPreferenceReturn;

/**
 * useAdminProviderCredentials — Tenant-admin LLM credential pool management.
 *
 * Wraps the backend `/admin/provider-credentials` routes (P0-95 multi-tenant):
 *   GET  /admin/provider-credentials/am-i-admin  → non-throwing isAdmin gate
 *   GET  /admin/provider-credentials             → list tenant's platform pool
 *   GET  /admin/provider-credentials/existing    → non-platform creds (promote candidates)
 *   POST /admin/provider-credentials             → create new platform credential
 *   POST /admin/provider-credentials/promote     → clone existing into platform pool
 *
 * Drives the admin-only sections of the Casino Settings → Model tab.
 * For non-admins, am-i-admin returns false and the rest of the requests are
 * skipped — the hook degrades to an empty/no-op state without errors so
 * non-admin users still see their own model picker.
 */

interface UseAdminProviderCredentialsReturn {
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;
    credentials: AdminProviderCredential[];
    existing: ExistingProviderCredential[];
    create: (input: CreateAdminProviderCredentialInput) => Promise<boolean>;
    promote: (sourceTenantId: string, credentialId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}
declare function useAdminProviderCredentials(): UseAdminProviderCredentialsReturn;

type LibraryItemType$1 = string;
interface UseLibraryReturn {
    items: any[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    total: number | null;
    loadMore: () => void;
    refresh: (search?: string) => void;
    deleteItem: (name: string) => Promise<boolean>;
    getDetail: (name: string) => Promise<Record<string, any> | null>;
}
declare function useLibrary(type: LibraryItemType$1): UseLibraryReturn;

interface SubagentSummary$1 {
    id: string;
    name: string;
    description: string;
    source?: string;
    /** kept for legacy compat (AgentsTab checks this) */
    created_by?: string;
    created_at?: string;
    site_id?: string;
}
interface SubagentDefinition$1 extends SubagentSummary$1 {
    system_prompt?: string;
    /** @deprecated use system_prompt — kept for compat */
    systemPrompt?: string;
    tools?: string[];
    model?: string;
    max_turns?: number;
    max_cost_usd?: number;
}
interface UseSubagentsReturn {
    subagents: SubagentSummary$1[];
    builtin: SubagentSummary$1[];
    userDefined: SubagentSummary$1[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    uploadSubagent: (file: File) => Promise<SubagentDefinition$1 | null>;
    deleteSubagent: (name: string) => Promise<boolean>;
}
declare function useSubagents(): UseSubagentsReturn;
/** Fetch full agent definition from GET /library/agents/{name} */
declare function getSubagent(credentials: any, name: string, config?: FlowstackClientConfig): Promise<{
    ok: boolean;
    data?: SubagentDefinition$1;
    error?: string;
}>;

/**
 * useConversation — fetch the full message history for a specific session.
 *
 * Used by the built-app sidebar when the user clicks a past conversation —
 * we hydrate the chat panel by fetching the S3-backed history via
 * /conversations/{id}/messages and calling restoreConversation on the
 * shared provider so useAgent renders it.
 */
interface ConversationMessage {
    id?: string;
    role: string;
    content: string | unknown;
    timestamp?: string;
    [key: string]: unknown;
}
interface UseConversationReturn {
    messages: ConversationMessage[];
    /** The sessionId these messages belong to — used by ChatView to guard
     *  against painting stale messages from a previous session. */
    forSessionId: string | null | undefined;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}
declare function useConversation(sessionId: string | null | undefined): UseConversationReturn;

/**
 * Flowstack SDK
 *
 * Complete Backend-as-a-Service for AI-powered apps.
 *
 * @example
 * ```tsx
 * import { FlowstackProvider, useAuth, useAgent, LoginForm } from 'flowstack-sdk';
 *
 * function App() {
 *   return (
 *     <FlowstackProvider config={{ jwtSecret: process.env.JWT_SECRET! }}>
 *       <MyApp />
 *     </FlowstackProvider>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

declare function useCurrentSession(): {
    currentSession: {
        sessionId: string;
    } | null;
    lockStatus: "available" | "elsewhere" | "claimed";
    claim: () => Promise<void>;
    release: () => Promise<void>;
};

declare function useLibraryConversations(): {
    conversations: LibraryConversationSummary[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    star: (_id: string) => Promise<void>;
    unstar: (_id: string) => Promise<void>;
    deleteConversation: (_id: string) => Promise<void>;
};
declare function useRecentLibraryConversations(_limit?: number): {
    items: LibraryConversationSummary[];
    conversations: LibraryConversationSummary[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
};
declare function useLibrarySearch(_options?: string | {
    limit?: number;
}): {
    results: LibraryItem[];
    isLoading: boolean;
    query: string;
    setQuery: (_q: string) => void;
    error: string | null;
    clear: () => void;
};
declare function useLibraryTrash(): {
    items: TrashedItem[];
    isLoading: boolean;
    restore: (_id: string) => Promise<void>;
    deletePermanently: (_id: string) => Promise<void>;
    refresh: () => void;
};

declare function useSubagentInvoke(): {
    invoke: (_id: string, _input: Record<string, unknown>) => Promise<SubagentInvokeRun>;
    isRunning: boolean;
    error: string | null;
};

declare function listLibraryItems(credentials: {
    apiKey: string;
    tenantId: string;
    userId: string;
}, type: string, _options?: {
    limit?: number;
}, config?: {
    baseUrl?: string;
}): Promise<{
    ok: boolean;
    data?: {
        total: number | null;
        items: unknown[];
    };
    error?: string;
}>;
type LibraryItemType = 'dataset' | 'visualization' | 'code' | 'document' | 'report' | 'model' | 'conversation' | 'script';
interface LibraryItem {
    /** Primary display name (from backend "name" field) */
    name: string;
    type?: string;
    /** ISO string or Unix epoch (number) */
    created_at?: string | number;
    updated_at?: string | number;
    size_bytes?: number;
    format?: string;
    source_conversation_title_snapshot?: string;
    source?: string;
    id?: string;
    title?: string;
    createdAt?: string;
    [key: string]: unknown;
}
type LibraryItemDetail = LibraryItem & {
    content: string;
};
type LibraryConversationSummary = {
    id: string;
    conversation_id?: string;
    title: string;
    lastMessageAt?: string;
    last_activity_at?: string;
    first_message_preview?: string;
    last_snippet?: string;
    message_count?: number;
    starred?: boolean;
};
type TrashedItem = {
    id: string;
    type: LibraryItemType;
    title: string;
    trashedAt: string;
};
type SubagentSummary = {
    id: string;
    name: string;
    description: string;
    source?: string;
    site_id?: string;
};
type SubagentDefinition = SubagentSummary & {
    /** snake_case from backend — preferred */
    system_prompt?: string;
    /** camelCase alias — kept for compat */
    systemPrompt?: string;
    tools?: string[];
    model?: string;
    max_turns?: number;
    max_cost_usd?: number;
    created_at?: string;
};
type SubagentInvokeRun = {
    runId: string;
    status: 'pending' | 'running' | 'done' | 'error';
    output: string | null;
};

export { AdminGate, type AdminGateProps, AdminProviderCredential, AgentConfig, AgentFactory, type AgentFactoryOptions, AgentRegistry, type AgentRegistryOptions, AgentTemplate, AuthGuard, type AuthGuardOptions, type AuthGuardProps, AuthPage, type AuthPageProps, type Automation, type AutomationOutputConfig, type AutomationOutputType, type AutomationRun, type AutomationStatus, BrokeredLoginButton, type BrokeredLoginButtonProps, COLLECTION_CHANGED_EVENT, ChatInterface, type ChatInterfaceProps, ChatMessage, ChatPage, type ChatPageProps, CollectionLayer, CollectionSchemaInfo, type ConnectionStatus, type ConnectionsState, type ContentSegment, CreateAdminProviderCredentialInput, type CreateAutomationInput, type CreateCredentialParams, type CreateIntegrationInput, CreateWorkspaceModal, type CreateWorkspaceModalProps, DEFAULT_PATTERNS, DashboardLayout, type DashboardLayoutProps, DataSource, DataSourceBadgeInfo, DatasetInfo, DatasetUploader, type DatasetUploaderProps, type DynamicAgentConfig, type ErrorCode, ErrorCodes, ErrorMessages, ExistingProviderCredential, FlowstackClientConfig, FlowstackConfig, FlowstackContextValue, FlowstackCredentials, FlowstackError, type FlowstackErrorOptions, FlowstackProvider, type GitHubConnectionStatus, type GoogleService, GoogleSignIn, type GoogleSignInProps, type Integration, type IntegrationAuthType, type IntegrationEndpoint, type IntentAnalysis, IntentAnalyzer, type IntentAnalyzerOptions, type IntentCategory, type IntentEntity, type IntentPattern, type LLMExecutor, LLMProvider, type LibraryConversationSummary, type LibraryItem, type LibraryItemDetail, type LibraryItemType, LoginForm, type LoginFormProps, type LoginRouteConfig, ManagedUser, MarkdownRenderer, type MarkdownRendererProps, MessageList, type MessageListProps, ModelOption, ModelPreferenceState, OllamaLocalModel, OllamaStatus, ProviderCredential, ProviderModelSettings, PurposeInfo, RecoveryActions, RegisterForm, type RegisterFormProps, type RegisterRouteConfig, type RegisteredAgent, type ServiceProvider, StreamEvent, type SubagentDefinition, type SubagentInvokeRun, type SubagentSummary, ToolCall, type TrashedItem, type UpdateAutomationInput, type UpdateIntegrationInput, type UseAdminProviderCredentialsReturn, UseAgentOptions, UseAgentReturn, UseAgentsReturn, type UseAuthGuardReturn, UseAuthReturn, type UseAutomationsReturn, type UseCollectionExplorerOptions, type UseCollectionExplorerReturn, type UseCollectionOptions, type UseCollectionReturn, type UseConnectionsReturn, type UseConversationReturn, type UseDataOverviewReturn, UseDataSourcesReturn, UseDatasetsReturn, type UseFlowstackStatusOptions, type UseFlowstackStatusReturn, type UseIntegrationsReturn, type UseIntentAgentOptions, type UseIntentAgentReturn, type UseLibraryReturn, type UseModelPreferenceReturn, UseModelsReturn, type UseProviderCredentialsReturn, type UsePublicCollectionOptions, type UsePublicCollectionReturn, UseQueryReturn, UseReportsReturn, UseSiteVersionsReturn, UseSitesReturn, type UseToolInvocationOptions, type UseToolInvocationReturn, type UseUserCollectionsOptions, type UseUserCollectionsReturn, UseUserManagementReturn, UseVisualizationsReturn, UseWorkspaceReturn, User, UserActivityLog, UserCollectionInfo, UserDataOverview, UserStats, type ValidationResult, VisualizationData, WorkspaceInfo, WorkspaceSelector, type WorkspaceSelectorProps, analyzeWithRules, clearAllFlowstackData, clearCredentials, clearMessages, clearSelectedWorkspace, createCustomTemplate, dataScienceTemplate, extractEntities, generateMockId, getAgentTemplate, getConfigSummary, getItem, getSubagent, isDevelopmentConfig, isFlowstackError, listLibraryItems, loadCredentials, loadMessages, loadSelectedWorkspace, marketingTemplate, mockChatHistory, mockCredentials, mockDataSources, mockDatasets, mockDelay, mockManagedUsers, mockUser, mockUserActivity, mockUserStats, mockVisualizations, mockWorkspaces, parseSSELine, parseSSEStream, processSSEStream, removeItem, sanitizeMermaidCode, saveCredentials, saveMessages, saveSelectedWorkspace, setItem, splitContentSegments, supportTemplate, useAdminProviderCredentials, useAgent, useAgents, useAuth, useAuthGuard, useAutomations, useCollection, useCollectionExplorer, useConnections, useConversation, useConversations, useCurrentSession, useDataOverview, useDataSources, useDatasets, useFlowstack, useFlowstackOptional, useFlowstackStatus, useIntegrations, useIntentAgent, useLibrary, useLibraryConversations, useLibrarySearch, useLibraryTrash, useModelPreference, useModels, useOllamaDetection, useProviderCredentials, usePublicCollection, useQuery, useRecentLibraryConversations, useReports, useSiteVersions, useSites, useSubagentInvoke, useSubagents, useToolInvocation, useUserCollections, useUserManagement, useVisualizations, useWorkspace, validateConfig, validateConfigOrThrow, withErrorHandling };
