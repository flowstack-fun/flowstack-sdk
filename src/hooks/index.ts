/**
 * Flowstack SDK Hooks
 *
 * All hooks use the FlowstackProvider context for state management.
 */

export { useAuth } from './useAuth';
export { useWorkspace } from './useWorkspace';
export { useDatasets } from './useDatasets';
export { useVisualizations } from './useVisualizations';
export { useReports } from './useReports';
export { useModels } from './useModels';
export { useDataSources } from './useDataSources';
export { useAgent } from './useAgent';
export { useQuery } from './useQuery';
export { useIntentAgent } from './useIntentAgent';
export { useAuthGuard } from './useAuthGuard';
export { useFlowstackStatus } from './useFlowstackStatus';
export { useUserManagement } from './useUserManagement';
export { useSites } from './useSites';
export { useAgents } from './useAgents';
export { useCollection, COLLECTION_CHANGED_EVENT } from './useCollection';
export { useToolInvocation } from './useToolInvocation';
export { useConnections } from './useConnections';
export { useSiteVersions } from './useSiteVersions';
export { useProviderCredentials } from './useProviderCredentials';
export { useOllamaDetection } from './useOllamaDetection';
export { useDataOverview } from './useDataOverview';
export { useUserCollections } from './useUserCollections';
export { useCollectionExplorer } from './useCollectionExplorer';
export { usePublicCollection } from './usePublicCollection';
export { useConversations } from './useConversations';
export { useIntegrations } from './useIntegrations';
export { useAutomations } from './useAutomations';
export type { UseConversationsOptions, UseConversationsReturn, ConversationSummary } from './useConversations';

export type { AuthGuardOptions, UseAuthGuardReturn } from './useAuthGuard';
export type { UseToolInvocationOptions, UseToolInvocationReturn } from './useToolInvocation';
export type { ConnectionStatus, UseFlowstackStatusReturn, UseFlowstackStatusOptions } from './useFlowstackStatus';
export type { UseCollectionOptions, UseCollectionReturn } from './useCollection';
export type { ConnectionsState, GoogleService, ServiceProvider, UseConnectionsReturn, GoogleConnectionStatus, ServiceConnectionStatus, GitHubConnectionStatus } from './useConnections';
export type { CreateCredentialParams, UseProviderCredentialsReturn } from './useProviderCredentials';
export type { UseDataOverviewReturn } from './useDataOverview';
export type { UseUserCollectionsOptions, UseUserCollectionsReturn } from './useUserCollections';
export type { UseCollectionExplorerOptions, UseCollectionExplorerReturn } from './useCollectionExplorer';
export type { UsePublicCollectionOptions, UsePublicCollectionReturn } from './usePublicCollection';
export type { Integration, CreateIntegrationInput, UpdateIntegrationInput, UseIntegrationsReturn, IntegrationEndpoint, IntegrationAuthType } from './useIntegrations';
export type { Automation, AutomationRun, CreateAutomationInput, UpdateAutomationInput, UseAutomationsReturn, AutomationOutputConfig, AutomationOutputType, AutomationStatus } from './useAutomations';
