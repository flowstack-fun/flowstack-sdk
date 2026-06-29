/**
 * Agent Templates
 *
 * Pre-configured agent templates for different use cases.
 */

import type { AgentConfig, AgentTemplate } from '../types';

/**
 * Data Science agent template
 * Optimized for data analysis, ML, and visualization
 */
export const dataScienceTemplate: AgentConfig = {
  template: 'data-science',
  streaming: true,
  networkMode: 'SANDBOX',
};

/**
 * Marketing agent template
 * Optimized for content, campaigns, and analytics
 */
export const marketingTemplate: AgentConfig = {
  template: 'marketing',
  streaming: true,
  networkMode: 'PUBLIC',
};

/**
 * Support agent template
 * Optimized for customer support and knowledge base
 */
export const supportTemplate: AgentConfig = {
  template: 'support',
  streaming: true,
  networkMode: 'SANDBOX',
};

/**
 * Custom agent template factory
 */
export function createCustomTemplate(config: Partial<AgentConfig>): AgentConfig {
  return {
    template: 'custom',
    streaming: true,
    networkMode: 'SANDBOX',
    ...config,
  };
}

/**
 * Get agent template by name
 */
export function getAgentTemplate(name: AgentTemplate): AgentConfig {
  switch (name) {
    case 'data-science':
      return dataScienceTemplate;
    case 'marketing':
      return marketingTemplate;
    case 'support':
      return supportTemplate;
    case 'custom':
    default:
      return createCustomTemplate({});
  }
}
