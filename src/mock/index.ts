/**
 * Mock Mode for Flowstack SDK
 *
 * Provides mock implementations for development and testing without a backend.
 *
 * @example
 * ```tsx
 * <FlowstackProvider config={{ ...config, mode: 'mock' }}>
 *   <App />
 * </FlowstackProvider>
 * ```
 */

export * from './fixtures';

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
} from './fixtures';
