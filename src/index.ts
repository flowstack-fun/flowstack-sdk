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

// =============================================================================
// Core Context
// =============================================================================

export {
  FlowstackProvider,
  useFlowstack,
  useFlowstackOptional,
} from './context';

// =============================================================================
// Errors
// =============================================================================

export {
  FlowstackError,
  ErrorCodes,
  ErrorMessages,
  RecoveryActions,
  isFlowstackError,
  withErrorHandling,
} from './errors';

export type {
  ErrorCode,
  FlowstackErrorOptions,
} from './errors';

// =============================================================================
// Config Validation
// =============================================================================

export {
  validateConfig,
  validateConfigOrThrow,
  isDevelopmentConfig,
  getConfigSummary,
} from './config';

export type { ValidationResult } from './config';

// =============================================================================
// Hooks
// =============================================================================

export {
  useAuth,
  useWorkspace,
  useDatasets,
  useVisualizations,
  useReports,
  useModels,
  useDataSources,
  useAgent,
  useQuery,
  useIntentAgent,
  useAuthGuard,
  useFlowstackStatus,
  useUserManagement,
  useSites,
  useAgents,
  useCollection,
  useToolInvocation,
  useConnections,
  useThreads,
  useMessages,
  useSiteVersions,
  useProviderCredentials,
  useOllamaDetection,
  useDataOverview,
  useUserCollections,
  useCollectionExplorer,
  usePublicCollection,
  useConversations,
  COLLECTION_CHANGED_EVENT,
} from './hooks';

export type {
  AuthGuardOptions,
  UseAuthGuardReturn,
  ConnectionStatus,
  UseFlowstackStatusReturn,
  UseFlowstackStatusOptions,
  UseToolInvocationOptions,
  UseToolInvocationReturn,
  UseCollectionOptions,
  UseCollectionReturn,
  ConnectionsState,
  GoogleService,
  ServiceProvider,
  UseConnectionsReturn,
  GitHubConnectionStatus,
  CreateCredentialParams,
  UseProviderCredentialsReturn,
  UseDataOverviewReturn,
  UseUserCollectionsOptions,
  UseUserCollectionsReturn,
  UseCollectionExplorerOptions,
  UseCollectionExplorerReturn,
  UsePublicCollectionOptions,
  UsePublicCollectionReturn,
  UseThreadsOptions,
  UseThreadsReturn,
  UseMessagesOptions,
  UseMessagesReturn,
} from './hooks';

// =============================================================================
// Mock Mode
// =============================================================================

export {
  mockCredentials,
  mockUser,
  mockWorkspaces,
  mockDatasets,
  mockVisualizations,
  mockDataSources,
  mockChatHistory,
  mockManagedUsers,
  mockUserStats,
  mockUserActivity,
  generateMockId,
  mockDelay,
} from './mock';

// =============================================================================
// Components
// =============================================================================

export {
  // Auth
  LoginForm,
  RegisterForm,
  GoogleSignIn,
  AuthGuard,
  AdminGate,
  BrokeredLoginButton,
  // Workspace
  WorkspaceSelector,
  CreateWorkspaceModal,
  // Datasets
  DatasetUploader,
  // Chat
  ChatInterface,
  MessageList,
  MarkdownRenderer,
  // Pages
  AuthPage,
  DashboardLayout,
  ChatPage,
} from './components';

// =============================================================================
// Built-App Monetization (P0-121)
// =============================================================================

// AppPaywall is intentionally not in the main entry point for tree-shaking.
// Import from 'flowstack-sdk/wallet':
//   import { AppPaywall, useAppAccess } from 'flowstack-sdk/wallet'
// Re-exporting type only here for convenience.
export type { AppAccessStatus, UseAppAccessReturn, AppPaywallProps } from './wallet/types';

// Component props types
export type {
  LoginFormProps,
  RegisterFormProps,
  GoogleSignInProps,
  AuthGuardProps,
  AdminGateProps,
  BrokeredLoginButtonProps,
  WorkspaceSelectorProps,
  CreateWorkspaceModalProps,
  DatasetUploaderProps,
  ChatInterfaceProps,
  MessageListProps,
  MarkdownRendererProps,
  AuthPageProps,
  DashboardLayoutProps,
  ChatPageProps,
} from './components';

// =============================================================================
// Types — runtime constants
// =============================================================================

export {
  LLM_PROVIDERS,
  CREDENTIAL_PURPOSES,
  DEFAULT_PROVIDER_MODEL_SETTINGS,
  isProviderCredential,
  COLLECTION_LAYERS,
} from './types';

// =============================================================================
// Types
// =============================================================================

export type {
  // Config
  FlowstackConfig,
  AuthConfig,
  RedisConfig,
  DatabaseConfig,
  // Auth
  User,
  FlowstackCredentials,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  GoogleAuthResponse,
  // Session & Workspace
  SessionState,
  WorkspaceInfo,
  CreateWorkspaceRequest,
  // Datasets
  DatasetInfo,
  DatasetPreview,
  ColumnSchema,
  DatasetRow,
  DatasetStreamOptions,
  // Visualizations
  VisualizationData,
  // Reports
  ReportInfo,
  // Models
  ModelInfo,
  // Scripts
  ScriptInfo,
  // Data Sources
  DataSourceType,
  DataSource,
  DataSourceConfig,
  ConnectionTestResult,
  // Chat & Messages
  ChatMessage,
  ToolCall,
  SearchResult,
  SearchResultsData,
  // Streaming
  StreamEvent,
  StreamEventType,
  InterruptInfo,
  DataSourceBadgeInfo,
  // Agent
  AgentTemplate,
  AgentConfig,
  QueryOptions,
  // Usage
  UsageStats,
  UsagePeriod,
  CreditStatus,
  // Hook Returns
  UseAuthReturn,
  UseWorkspaceReturn,
  UseDatasetsReturn,
  UseVisualizationsReturn,
  UseReportsReturn,
  UseModelsReturn,
  UseDataSourcesReturn,
  UseAgentOptions,
  UseAgentReturn,
  UseQueryReturn,
  UseUserManagementReturn,
  // Agents
  AgentInfo,
  UseAgentsReturn,
  // Sites
  PublishedSiteInfo,
  CreateSiteParams,
  UseSitesReturn,
  // Site Versioning
  SiteVersion,
  SiteVersionManifest,
  UseSiteVersionsReturn,
  PublishToGitHubParams,
  PublishToGitHubResult,
  // Provider Credentials
  LLMProvider,
  CredentialPurpose,
  ProviderCredential,
  ProviderModelSettings,
  PurposeInfo,
  // Collection Layers
  CollectionLayer,
  // Ollama
  OllamaLocalModel,
  OllamaStatus,
  // Collection Explorer
  CollectionSchemaInfo,
  UserCollectionInfo,
  // Data Explorer
  UserDataOverview,
  UserDataOverviewWorkspace,
  // GitHub
  GitHubRepo,
  // PII
  PiiSettings,
  PiiEntitySettings,
  PiiRedactedEntity,
  // API
  ApiResponse,
  ListResponse,
  // Context
  FlowstackContextValue,
  // User Management
  UserRole,
  UserStatus,
  UserActivityType,
  ManagedUser,
  UserActivityLog,
  UpdateUserRequest,
  UserStats,
  UserListParams,
  UserListResponse,
} from './types';

// =============================================================================
// API Client
// =============================================================================

export {
  flowstackFetch,
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  listDatasets,
  getDataset,
  getDatasetPreview,
  deleteDataset,
  listVisualizations,
  listReports,
  listModels,
  listScripts,
  getModel,
  listDataSources,
  createDataSource,
  testDataSource,
  deleteDataSource,
  executeQuery,
  executeQueryWithConfig,
  uploadFile,
  login,
  register,
  googleLogin,
  // User Management
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  suspendUser,
  reactivateUser,
  getUserActivity,
  getUserStats,
  checkAdminPermissions,
  // Conversation History
  getConversationHistory,
  // Agents
  listAgents,
  // Sites
  listSites,
  getSite,
  createSite,
  addSiteFile,
  publishStagedSite,
  deleteSite,
  // Site Versioning
  getSiteVersions,
  promoteSiteVersion,
  deleteSiteVersion,
  // Site Aliases
  setSiteAlias,
  removeSiteAlias,
  // GitHub Publishing
  publishToGitHub,
  // Collections — direct MongoDB CRUD
  insertDocuments,
  updateDocuments,
  deleteDocuments,
  // Private messaging (P0-138)
  listThreads,
  listMessages,
  sendMessage,
  openThread,
  markMessageRead,
  dmPairKey,
  // Direct tool invocation
  invokeTool,
  // GitHub Import
  listGitHubRepos,
  importFromGitHub,
  // PII Settings & Masking
  getPiiSettings,
  updatePiiSettings,
  previewPiiMasking,
  getPiiAllowlist,
  addPiiAllowlistTerm,
  removePiiAllowlistTerm,
  // User Data Explorer
  getUserDataOverview,
  getUserCollections,
  getUserCollectionDocuments,
  getUserCollectionSchema,
  deleteUserCollection,
  exportUserCollection,
} from './api/client';

export type {
  FlowstackClientConfig,
  RequestOptions,
  DmMessage,
  DmThread,
} from './api/client';

// =============================================================================
// Cache
// =============================================================================

export {
  CACHE_TTL,
  getCachedWorkspaces,
  setCachedWorkspaces,
  invalidateWorkspacesCache,
  getCachedDatasets,
  setCachedDatasets,
  invalidateDatasetsCache,
  getCachedVisualizations,
  setCachedVisualizations,
  invalidateVisualizationsCache,
  getCachedReports,
  setCachedReports,
  invalidateReportsCache,
  invalidateWorkspaceArtifacts,
  invalidateAllUserCache,
  getCachedSites,
  setCachedSites,
  invalidateSitesCache,
  getCached,
  setCached,
  deleteCached,
} from './api/cache';

// =============================================================================
// Utilities
// =============================================================================

export {
  // SSE Parser (browser-safe)
  parseSSELine,
  parseSSEStream,
  processSSEStream,
  // Storage (browser-safe)
  saveCredentials,
  loadCredentials,
  clearCredentials,
  saveSelectedWorkspace,
  loadSelectedWorkspace,
  clearSelectedWorkspace,
  saveMessages,
  loadMessages,
  clearMessages,
  setItem,
  getItem,
  removeItem,
  clearAllFlowstackData,
  // Mermaid utilities (browser-safe)
  sanitizeMermaidCode,
  splitContentSegments,
} from './utils';

export type { ContentSegment } from './utils';

// =============================================================================
// Templates
// =============================================================================

export {
  dataScienceTemplate,
  marketingTemplate,
  supportTemplate,
  createCustomTemplate,
  getAgentTemplate,
} from './templates';

// =============================================================================
// Agent Factory
// =============================================================================

export {
  AgentFactory,
  IntentAnalyzer,
  AgentRegistry,
  DEFAULT_PATTERNS,
  extractEntities,
  analyzeWithRules,
} from './factory';

export type {
  DynamicAgentConfig,
  IntentCategory,
  IntentEntity,
  IntentAnalysis,
  IntentPattern,
  RegisteredAgent,
  AgentFactoryOptions,
  IntentAnalyzerOptions,
  AgentRegistryOptions,
  UseIntentAgentOptions,
  UseIntentAgentReturn,
  LLMExecutor,
} from './factory';

// =============================================================================
// API Route Generators — SERVER-ONLY
// =============================================================================
// createLoginRoute and createRegisterRoute use Node.js crypto + jsonwebtoken.
// Import them directly: import { createLoginRoute } from 'flowstack-sdk/api/routes'
// They are NOT exported from the main entry point to keep it browser-safe.

export type {
  LoginRouteConfig,
  RegisterRouteConfig,
} from './api/routes';

// =============================================================================
// Session Locking (P0-75) — stub until full implementation ships
// =============================================================================
export function useCurrentSession() {
  return {
    currentSession: null as { sessionId: string } | null,
    lockStatus: 'available' as 'available' | 'elsewhere' | 'claimed',
    claim: async () => {},
    release: async () => {},
  };
}

// useConversations is now a real hook — exported from hooks/useConversations.ts via hooks/index.ts

// Real implementations — see hooks/useModelPreference.ts and
// hooks/useAdminProviderCredentials.ts. Previously these were return-empty
// stubs whose shape didn't even match what ModelSettingsView consumed, which
// blanked the Settings → Model page via React's error boundary.
export { useModelPreference } from './hooks/useModelPreference';
export type { UseModelPreferenceReturn } from './hooks/useModelPreference';

export { useAdminProviderCredentials } from './hooks/useAdminProviderCredentials';
export type { UseAdminProviderCredentialsReturn } from './hooks/useAdminProviderCredentials';

export type {
  ModelOption,
  ModelPreferenceState,
  AdminProviderCredential,
  ExistingProviderCredential,
  CreateAdminProviderCredentialInput,
} from './types';

export { useAutomations } from './hooks/useAutomations';
export type { Automation, AutomationRun, CreateAutomationInput, UpdateAutomationInput, UseAutomationsReturn, AutomationOutputConfig, AutomationOutputType, AutomationStatus } from './hooks/useAutomations';

export { useIntegrations } from './hooks/useIntegrations';
export type { Integration, CreateIntegrationInput, UpdateIntegrationInput, UseIntegrationsReturn, IntegrationEndpoint, IntegrationAuthType } from './hooks/useIntegrations';

export { useLibrary } from './hooks/useLibrary';
export type { UseLibraryReturn } from './hooks/useLibrary';

export function useLibraryConversations() {
  return {
    conversations: [] as LibraryConversationSummary[],
    isLoading: false,
    error: null as string | null,
    refresh: () => {},
    star: async (_id: string) => {},
    unstar: async (_id: string) => {},
    deleteConversation: async (_id: string) => {},
  };
}

export function useRecentLibraryConversations(_limit?: number) {
  return {
    items: [] as LibraryConversationSummary[],
    conversations: [] as LibraryConversationSummary[],
    isLoading: false,
    error: null as string | null,
    refresh: () => {},
  };
}

export function useLibrarySearch(_options?: string | { limit?: number }) {
  return {
    results: [] as LibraryItem[],
    isLoading: false,
    query: '' as string,
    setQuery: (_q: string) => {},
    error: null as string | null,
    clear: () => {},
  };
}

export function useLibraryTrash() {
  return {
    items: [] as TrashedItem[],
    isLoading: false,
    restore: async (_id: string) => {},
    deletePermanently: async (_id: string) => {},
    refresh: () => {},
  };
}

export { useSubagents } from './hooks/useSubagents';

export function useSubagentInvoke() {
  return {
    invoke: async (_id: string, _input: Record<string, unknown>): Promise<SubagentInvokeRun> => ({
      runId: '',
      status: 'pending' as const,
      output: null,
    }),
    isRunning: false,
    error: null as string | null,
  };
}

export { getSubagent } from './hooks/useSubagents';

export async function listLibraryItems(
  credentials: { apiKey: string; tenantId: string; userId: string },
  type: string,
  _options?: { limit?: number },
  config?: { baseUrl?: string },
): Promise<{ ok: boolean; data?: { total: number | null; items: unknown[] }; error?: string }> {
  const TYPE_PATH: Record<string, string> = {
    dataset: 'datasets', visualization: 'visualizations', code: 'code',
    document: 'documents', report: 'reports', model: 'models',
  };
  const seg = TYPE_PATH[type];
  if (!seg || !credentials?.apiKey) return { ok: false };
  try {
    const base = config?.baseUrl || 'https://sage-api.flowstack.fun';
    const url = new URL(`${base}/library/${seg}`);
    url.searchParams.set('user_id', credentials.userId);
    url.searchParams.set('limit', '1');
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'X-Tenant-ID': credentials.tenantId,
        'X-User-ID': credentials.userId,
      },
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data: { total: data.total ?? null, items: data.items ?? [] } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// Automation types now come from ./hooks/useAutomations (real implementation above)
export type LibraryItemType = 'dataset' | 'visualization' | 'code' | 'document' | 'report' | 'model' | 'conversation' | 'script';
export interface LibraryItem {
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
  // Legacy camelCase aliases kept for compat
  id?: string;
  title?: string;
  createdAt?: string;
  [key: string]: unknown;
}
export type LibraryItemDetail = LibraryItem & { content: string };
export type LibraryConversationSummary = {
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
export type TrashedItem = { id: string; type: LibraryItemType; title: string; trashedAt: string };
export type SubagentSummary = { id: string; name: string; description: string; source?: string; site_id?: string };
export type SubagentDefinition = SubagentSummary & {
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
export type SubagentInvokeRun = { runId: string; status: 'pending' | 'running' | 'done' | 'error'; output: string | null };

export { useConversation } from './hooks/useConversation';
export type { UseConversationReturn } from './hooks/useConversation';

// getSubagent is re-exported from hooks/useSubagents above
