/**
 * Agent Factory Type Definitions
 *
 * Types for the intent-based agent factory system.
 */

import type { AgentTemplate, ChatMessage, ToolCall } from '../types';

// =============================================================================
// Agent Configuration
// =============================================================================

/**
 * Extended agent configuration with dynamic properties
 */
export interface DynamicAgentConfig {
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

// =============================================================================
// Intent Analysis
// =============================================================================

/**
 * Intent categories for matching
 */
export type IntentCategory =
  | 'data_analysis'
  | 'visualization'
  | 'data_transformation'
  | 'machine_learning'
  | 'content_creation'
  | 'research'
  | 'customer_support'
  | 'code_generation'
  | 'general_assistant'
  | 'custom';

/**
 * Extracted entity from intent string
 */
export interface IntentEntity {
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
export interface IntentAnalysis {
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
export interface IntentPattern {
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

// =============================================================================
// Agent Registration
// =============================================================================

/**
 * Registered agent entry
 */
export interface RegisteredAgent {
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

// =============================================================================
// Factory Options
// =============================================================================

/**
 * Agent factory configuration options
 */
export interface AgentFactoryOptions {
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
export interface IntentAnalyzerOptions {
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
export interface AgentRegistryOptions {
  /** Enable caching (default: true) */
  enableCache?: boolean;

  /** Cache TTL in milliseconds (default: 30 minutes) */
  cacheTTL?: number;
}

// =============================================================================
// Hook Types
// =============================================================================

/**
 * Options for useIntentAgent hook
 */
export interface UseIntentAgentOptions extends AgentFactoryOptions {
  /** Initial intent to create agent with */
  initialIntent?: string;
}

/**
 * Return type for useIntentAgent hook
 */
export interface UseIntentAgentReturn {
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

// =============================================================================
// LLM Executor Type
// =============================================================================

/**
 * Function type for executing LLM queries (used for fallback analysis)
 */
export type LLMExecutor = (prompt: string) => Promise<string>;
