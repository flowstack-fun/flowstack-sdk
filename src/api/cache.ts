/**
 * Redis Cache Layer for Flowstack SDK
 * Uses Upstash Redis for serverless caching
 */

import type { FlowstackCredentials, WorkspaceInfo, DatasetInfo, VisualizationData, ReportInfo, PublishedSiteInfo } from '../types';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  WORKSPACES: 300,      // 5 minutes
  DATASETS: 60,         // 1 minute
  VISUALIZATIONS: 60,   // 1 minute
  REPORTS: 60,          // 1 minute
  SITES: 120,           // 2 minutes
  MESSAGES: 0,          // No expiry
  SESSION: 86400,       // 24 hours
} as const;

// Cache key prefix
const NAMESPACE = 'flowstack';

/**
 * Redis client configuration
 */
export interface RedisConfig {
  url: string;
  token: string;
}

/**
 * Create a Redis client for Upstash
 */
function createRedisClient(config: RedisConfig) {
  const { url, token } = config;

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const response = await fetch(`${url}/get/${key}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.result ? JSON.parse(data.result) : null;
      } catch {
        return null;
      }
    },

    async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
      try {
        const body = ttl
          ? ['SET', key, JSON.stringify(value), 'EX', ttl.toString()]
          : ['SET', key, JSON.stringify(value)];

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async del(key: string): Promise<boolean> {
      try {
        const response = await fetch(`${url}/del/${key}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async keys(pattern: string): Promise<string[]> {
      try {
        const response = await fetch(`${url}/keys/${pattern}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.result || [];
      } catch {
        return [];
      }
    },
  };
}

/**
 * Generate user-scoped cache key
 */
function getCacheKey(
  type: string,
  credentials: FlowstackCredentials,
  ...parts: string[]
): string {
  const userId = credentials.userId || 'anonymous';
  const tenantId = credentials.tenantId;
  const key = [NAMESPACE, type, tenantId, userId, ...parts].filter(Boolean).join(':');
  return key;
}

// =============================================================================
// Workspace Cache
// =============================================================================

export async function getCachedWorkspaces(
  credentials: FlowstackCredentials,
  config: RedisConfig
): Promise<WorkspaceInfo[] | null> {
  const client = createRedisClient(config);
  const key = getCacheKey('workspaces', credentials);
  return client.get<WorkspaceInfo[]>(key);
}

export async function setCachedWorkspaces(
  credentials: FlowstackCredentials,
  workspaces: WorkspaceInfo[],
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('workspaces', credentials);
  return client.set(key, workspaces, CACHE_TTL.WORKSPACES);
}

export async function invalidateWorkspacesCache(
  credentials: FlowstackCredentials,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('workspaces', credentials);
  return client.del(key);
}

// =============================================================================
// Dataset Cache
// =============================================================================

export async function getCachedDatasets(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<DatasetInfo[] | null> {
  const client = createRedisClient(config);
  const key = getCacheKey('datasets', credentials, workspaceId);
  return client.get<DatasetInfo[]>(key);
}

export async function setCachedDatasets(
  credentials: FlowstackCredentials,
  workspaceId: string,
  datasets: DatasetInfo[],
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('datasets', credentials, workspaceId);
  return client.set(key, datasets, CACHE_TTL.DATASETS);
}

export async function invalidateDatasetsCache(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('datasets', credentials, workspaceId);
  return client.del(key);
}

// =============================================================================
// Visualization Cache
// =============================================================================

export async function getCachedVisualizations(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<VisualizationData[] | null> {
  const client = createRedisClient(config);
  const key = getCacheKey('visualizations', credentials, workspaceId);
  return client.get<VisualizationData[]>(key);
}

export async function setCachedVisualizations(
  credentials: FlowstackCredentials,
  workspaceId: string,
  visualizations: VisualizationData[],
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('visualizations', credentials, workspaceId);
  return client.set(key, visualizations, CACHE_TTL.VISUALIZATIONS);
}

export async function invalidateVisualizationsCache(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('visualizations', credentials, workspaceId);
  return client.del(key);
}

// =============================================================================
// Report Cache
// =============================================================================

export async function getCachedReports(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<ReportInfo[] | null> {
  const client = createRedisClient(config);
  const key = getCacheKey('reports', credentials, workspaceId);
  return client.get<ReportInfo[]>(key);
}

export async function setCachedReports(
  credentials: FlowstackCredentials,
  workspaceId: string,
  reports: ReportInfo[],
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('reports', credentials, workspaceId);
  return client.set(key, reports, CACHE_TTL.REPORTS);
}

export async function invalidateReportsCache(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('reports', credentials, workspaceId);
  return client.del(key);
}

// =============================================================================
// Bulk Invalidation
// =============================================================================

/**
 * Invalidate all workspace artifacts (datasets, visualizations, reports)
 */
export async function invalidateWorkspaceArtifacts(
  credentials: FlowstackCredentials,
  workspaceId: string,
  config: RedisConfig
): Promise<void> {
  await Promise.all([
    invalidateDatasetsCache(credentials, workspaceId, config),
    invalidateVisualizationsCache(credentials, workspaceId, config),
    invalidateReportsCache(credentials, workspaceId, config),
  ]);
}

/**
 * Invalidate all user cache
 */
export async function invalidateAllUserCache(
  credentials: FlowstackCredentials,
  config: RedisConfig
): Promise<void> {
  const client = createRedisClient(config);
  const userId = credentials.userId || 'anonymous';
  const tenantId = credentials.tenantId;
  const pattern = `${NAMESPACE}:*:${tenantId}:${userId}:*`;

  const keys = await client.keys(pattern);
  await Promise.all(keys.map(key => client.del(key)));
}

// =============================================================================
// Generic Cache Operations
// =============================================================================

/**
 * Get a cached value
 */
export async function getCached<T>(
  key: string,
  config: RedisConfig
): Promise<T | null> {
  const client = createRedisClient(config);
  return client.get<T>(`${NAMESPACE}:${key}`);
}

/**
 * Set a cached value
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  return client.set(`${NAMESPACE}:${key}`, value, ttl);
}

/**
 * Delete a cached value
 */
export async function deleteCached(
  key: string,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  return client.del(`${NAMESPACE}:${key}`);
}

// =============================================================================
// Sites Cache
// =============================================================================

export async function getCachedSites(
  credentials: FlowstackCredentials,
  config: RedisConfig
): Promise<PublishedSiteInfo[] | null> {
  const client = createRedisClient(config);
  const key = getCacheKey('sites', credentials);
  return client.get<PublishedSiteInfo[]>(key);
}

export async function setCachedSites(
  credentials: FlowstackCredentials,
  sites: PublishedSiteInfo[],
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('sites', credentials);
  return client.set(key, sites, CACHE_TTL.SITES);
}

export async function invalidateSitesCache(
  credentials: FlowstackCredentials,
  config: RedisConfig
): Promise<boolean> {
  const client = createRedisClient(config);
  const key = getCacheKey('sites', credentials);
  return client.del(key);
}
