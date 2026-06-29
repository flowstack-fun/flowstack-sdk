/**
 * Agent Registry
 *
 * Stores and manages registered agents with caching support.
 * Supports fuzzy intent matching to reuse similar agent configurations.
 */

import type { RegisteredAgent, AgentRegistryOptions } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate similarity between two intent strings using Jaccard similarity
 */
function intentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) {
    return 1;
  }
  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Normalize intent string for comparison
 */
function normalizeIntent(intent: string): string {
  return intent
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

// =============================================================================
// Agent Registry Class
// =============================================================================

/**
 * Agent Registry
 *
 * Manages registration, retrieval, and caching of dynamically created agents.
 */
export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private intentIndex: Map<string, string> = new Map(); // normalized intent -> agentId
  private options: Required<AgentRegistryOptions>;

  constructor(options: AgentRegistryOptions = {}) {
    this.options = {
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 30 * 60 * 1000, // 30 minutes default
    };
  }

  /**
   * Register a new agent
   */
  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);
    this.intentIndex.set(normalizeIntent(agent.intent), agent.id);
  }

  /**
   * Get agent by ID
   */
  get(id: string): RegisteredAgent | undefined {
    const agent = this.agents.get(id);

    if (!agent) {
      return undefined;
    }

    // Check if expired (only if caching is enabled)
    if (this.options.enableCache && this.options.cacheTTL > 0) {
      const age = Date.now() - agent.lastUsedAt.getTime();
      if (age > this.options.cacheTTL) {
        this.remove(id);
        return undefined;
      }
    }

    return agent;
  }

  /**
   * Find agent by exact intent match
   */
  findByExactIntent(intent: string): RegisteredAgent | undefined {
    const normalizedIntent = normalizeIntent(intent);
    const agentId = this.intentIndex.get(normalizedIntent);

    if (agentId) {
      return this.get(agentId);
    }

    return undefined;
  }

  /**
   * Find agent by similar intent (fuzzy matching)
   */
  findByIntent(intent: string, threshold: number = 0.8): RegisteredAgent | undefined {
    // Try exact match first
    const exactMatch = this.findByExactIntent(intent);
    if (exactMatch) {
      return exactMatch;
    }

    const normalizedIntent = normalizeIntent(intent);

    // Fuzzy match against all registered intents
    let bestMatch: { agent: RegisteredAgent; similarity: number } | null = null;

    for (const [registeredIntent, agentId] of this.intentIndex) {
      const similarity = intentSimilarity(normalizedIntent, registeredIntent);

      if (similarity >= threshold && similarity > (bestMatch?.similarity || 0)) {
        const agent = this.get(agentId);
        if (agent) {
          bestMatch = { agent, similarity };
        }
      }
    }

    return bestMatch?.agent;
  }

  /**
   * Record agent usage (updates lastUsedAt and usageCount)
   */
  recordUsage(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastUsedAt = new Date();
      agent.usageCount++;

      if (agent.config.lastUsedAt !== undefined) {
        agent.config.lastUsedAt = new Date();
      }
    }
  }

  /**
   * List all registered agents
   */
  listAll(): RegisteredAgent[] {
    // Clean expired entries first if caching is enabled
    if (this.options.enableCache && this.options.cacheTTL > 0) {
      this.cleanExpired();
    }

    return Array.from(this.agents.values());
  }

  /**
   * List agents sorted by usage count (most used first)
   */
  listByUsage(): RegisteredAgent[] {
    return this.listAll().sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * List agents sorted by last used (most recent first)
   */
  listByRecent(): RegisteredAgent[] {
    return this.listAll().sort(
      (a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    );
  }

  /**
   * Remove agent by ID
   */
  remove(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      this.intentIndex.delete(normalizeIntent(agent.intent));
      return this.agents.delete(id);
    }
    return false;
  }

  /**
   * Clear all registered agents
   */
  clear(): void {
    this.agents.clear();
    this.intentIndex.clear();
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.agents.size;
  }

  /**
   * Check if agent exists
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Clean expired agents
   */
  private cleanExpired(): void {
    if (!this.options.enableCache || this.options.cacheTTL <= 0) {
      return;
    }

    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, agent] of this.agents) {
      const age = now - agent.lastUsedAt.getTime();
      if (age > this.options.cacheTTL) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.remove(id);
    }
  }

  /**
   * Update cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.options.cacheTTL = Math.max(0, ttl);
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.options.enableCache = enabled;
  }

  /**
   * Export registry state (for persistence)
   */
  export(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Import registry state (for restoration)
   */
  import(agents: RegisteredAgent[]): void {
    for (const agent of agents) {
      // Convert date strings back to Date objects if needed
      const normalizedAgent: RegisteredAgent = {
        ...agent,
        createdAt: agent.createdAt instanceof Date ? agent.createdAt : new Date(agent.createdAt),
        lastUsedAt: agent.lastUsedAt instanceof Date ? agent.lastUsedAt : new Date(agent.lastUsedAt),
      };
      this.register(normalizedAgent);
    }
  }
}
