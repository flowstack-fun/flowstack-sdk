/**
 * Agent Factory Module
 *
 * Exports for the intent-based agent factory system.
 */

// Types
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
} from './types';

// Classes
export { AgentFactory } from './agent-factory';
export { IntentAnalyzer, DEFAULT_PATTERNS, extractEntities, analyzeWithRules } from './intent-analyzer';
export { AgentRegistry } from './agent-registry';
