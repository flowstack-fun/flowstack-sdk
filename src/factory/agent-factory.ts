/**
 * Agent Factory
 *
 * Creates and manages dynamic agent configurations based on user intent.
 * Combines IntentAnalyzer for intent parsing and AgentRegistry for storage.
 */

import type {
  DynamicAgentConfig,
  IntentAnalysis,
  RegisteredAgent,
  AgentFactoryOptions,
  IntentCategory,
  LLMExecutor,
} from './types';
import { IntentAnalyzer } from './intent-analyzer';
import { AgentRegistry } from './agent-registry';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `agent_${timestamp}_${random}`;
}

/**
 * Category to human-readable name mapping
 */
const CATEGORY_NAMES: Record<IntentCategory, string> = {
  data_analysis: 'Data Analyst',
  visualization: 'Visualization Expert',
  data_transformation: 'Data Engineer',
  machine_learning: 'ML Engineer',
  content_creation: 'Content Creator',
  research: 'Research Assistant',
  customer_support: 'Support Agent',
  code_generation: 'Code Assistant',
  general_assistant: 'General Assistant',
  custom: 'Custom Agent',
};

// =============================================================================
// Agent Factory Class
// =============================================================================

/**
 * Agent Factory
 *
 * Creates agents dynamically based on user intent.
 * Uses rule-based analysis with optional LLM fallback.
 */
export class AgentFactory {
  private analyzer: IntentAnalyzer;
  private registry: AgentRegistry;
  private options: Required<AgentFactoryOptions>;

  constructor(options: AgentFactoryOptions = {}) {
    this.options = {
      useLLMFallback: options.useLLMFallback !== false,
      ruleConfidenceThreshold: options.ruleConfidenceThreshold || 0.7,
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 30 * 60 * 1000, // 30 minutes
      customPatterns: options.customPatterns || [],
    };

    this.analyzer = new IntentAnalyzer({
      customPatterns: this.options.customPatterns,
      confidenceThreshold: this.options.ruleConfidenceThreshold,
      useLLMFallback: this.options.useLLMFallback,
    });

    this.registry = new AgentRegistry({
      enableCache: this.options.enableCache,
      cacheTTL: this.options.cacheTTL,
    });
  }

  /**
   * Create agent from user intent
   *
   * @param intent - Natural language description of what the user wants
   * @param llmExecutor - Optional function to execute LLM queries for fallback analysis
   * @returns Created or cached RegisteredAgent
   */
  async createFromIntent(
    intent: string,
    llmExecutor?: LLMExecutor
  ): Promise<RegisteredAgent> {
    // Check if similar intent already exists in registry
    const existingAgent = this.registry.findByIntent(intent);
    if (existingAgent) {
      this.registry.recordUsage(existingAgent.id);
      return existingAgent;
    }

    // Analyze intent
    const analysis = await this.analyzer.analyze(intent, llmExecutor);

    // Build agent config from analysis
    const config = this.buildConfig(analysis);

    // Create registered agent entry
    const agent: RegisteredAgent = {
      id: generateAgentId(),
      name: this.generateAgentName(analysis),
      config,
      intent,
      analysis,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      usageCount: 1,
    };

    // Register the agent
    this.registry.register(agent);

    return agent;
  }

  /**
   * Create agent from explicit configuration (bypass intent analysis)
   *
   * @param name - Human-readable agent name
   * @param config - Partial agent configuration
   * @returns Created RegisteredAgent
   */
  createFromConfig(
    name: string,
    config: Partial<DynamicAgentConfig>
  ): RegisteredAgent {
    const fullConfig: DynamicAgentConfig = {
      template: 'custom',
      streaming: true,
      networkMode: 'SANDBOX',
      ...config,
      name,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    const agent: RegisteredAgent = {
      id: generateAgentId(),
      name,
      config: fullConfig,
      intent: `Custom: ${name}`,
      analysis: {
        category: 'custom',
        confidence: 1.0,
        entities: [],
        suggestedConfig: config,
        originalIntent: `Custom: ${name}`,
        method: 'rule',
      },
      createdAt: new Date(),
      lastUsedAt: new Date(),
      usageCount: 1,
    };

    this.registry.register(agent);
    return agent;
  }

  /**
   * Build full config from intent analysis
   */
  private buildConfig(analysis: IntentAnalysis): DynamicAgentConfig {
    const baseConfig: DynamicAgentConfig = {
      template: analysis.suggestedConfig.template || 'custom',
      streaming: true,
      networkMode: 'SANDBOX',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    // Merge suggested config from analysis
    return {
      ...baseConfig,
      ...analysis.suggestedConfig,
      metadata: {
        analysisCategory: analysis.category,
        analysisConfidence: analysis.confidence,
        analysisMethod: analysis.method,
        entities: analysis.entities,
      },
    };
  }

  /**
   * Generate human-readable agent name from analysis
   */
  private generateAgentName(analysis: IntentAnalysis): string {
    return CATEGORY_NAMES[analysis.category] || 'Custom Agent';
  }

  // ===========================================================================
  // Registry Access Methods
  // ===========================================================================

  /**
   * Get agent by ID
   */
  getAgent(id: string): RegisteredAgent | undefined {
    return this.registry.get(id);
  }

  /**
   * List all registered agents
   */
  listAgents(): RegisteredAgent[] {
    return this.registry.listAll();
  }

  /**
   * List agents by usage (most used first)
   */
  listAgentsByUsage(): RegisteredAgent[] {
    return this.registry.listByUsage();
  }

  /**
   * List agents by recency (most recent first)
   */
  listAgentsByRecent(): RegisteredAgent[] {
    return this.registry.listByRecent();
  }

  /**
   * Remove an agent by ID
   */
  removeAgent(id: string): boolean {
    return this.registry.remove(id);
  }

  /**
   * Clear all agents
   */
  clearAll(): void {
    this.registry.clear();
  }

  /**
   * Get number of registered agents
   */
  getAgentCount(): number {
    return this.registry.size();
  }

  /**
   * Record usage of an agent
   */
  recordAgentUsage(id: string): void {
    this.registry.recordUsage(id);
  }

  // ===========================================================================
  // Analyzer Access Methods
  // ===========================================================================

  /**
   * Get the analyzer instance for direct access
   */
  getAnalyzer(): IntentAnalyzer {
    return this.analyzer;
  }

  /**
   * Get the registry instance for direct access
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  // ===========================================================================
  // Persistence Methods
  // ===========================================================================

  /**
   * Export factory state for persistence
   */
  exportState(): {
    agents: RegisteredAgent[];
    options: AgentFactoryOptions;
  } {
    return {
      agents: this.registry.export(),
      options: this.options,
    };
  }

  /**
   * Import factory state from persistence
   */
  importState(state: { agents: RegisteredAgent[] }): void {
    this.registry.import(state.agents);
  }
}
