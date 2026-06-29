/**
 * Intent Analyzer
 *
 * Analyzes user intent and returns structured analysis with suggested config.
 * Uses rule-based matching first, falls back to LLM for ambiguous cases.
 */

import type {
  IntentAnalysis,
  IntentCategory,
  IntentPattern,
  IntentEntity,
  DynamicAgentConfig,
  IntentAnalyzerOptions,
  LLMExecutor,
} from './types';

// =============================================================================
// Default Intent Patterns
// =============================================================================

/**
 * Pre-configured patterns for common intent categories
 */
export const DEFAULT_PATTERNS: IntentPattern[] = [
  {
    id: 'data-analysis',
    category: 'data_analysis',
    patterns: [
      /analyz[es]?\s+(the\s+)?data/i,
      /data\s+analysis/i,
      /explore\s+(my\s+)?dataset/i,
      /statistical\s+analysis/i,
      /find\s+patterns?\s+in/i,
      /correlat(e|ion)/i,
      /summarize\s+(the\s+)?data/i,
      /describe\s+(the\s+)?dataset/i,
    ],
    keywords: ['analyze', 'analysis', 'explore', 'statistics', 'patterns', 'insights', 'trends', 'summary', 'describe'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a data analyst specializing in exploratory data analysis.
Focus on:
- Statistical summaries and distributions
- Identifying patterns, correlations, and anomalies
- Providing actionable insights with supporting evidence
- Creating clear visualizations when helpful

Always explain your methodology and confidence levels.`,
      networkMode: 'SANDBOX',
    },
    priority: 10,
  },
  {
    id: 'visualization',
    category: 'visualization',
    patterns: [
      /create\s+(a\s+)?chart/i,
      /visualiz[es]/i,
      /plot\s+(the\s+)?data/i,
      /show\s+(me\s+)?(a\s+)?graph/i,
      /dashboard/i,
      /make\s+(a\s+)?(bar|line|pie|scatter)/i,
      /draw\s+(a\s+)?diagram/i,
    ],
    keywords: ['chart', 'graph', 'plot', 'visualize', 'visualization', 'dashboard', 'diagram', 'bar', 'line', 'pie', 'scatter'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a data visualization expert.
Focus on:
- Creating clear, informative visualizations
- Choosing appropriate chart types for the data
- Using effective color schemes and layouts
- Adding meaningful labels and annotations

Always save visualizations and explain what they show.`,
      networkMode: 'SANDBOX',
    },
    priority: 9,
  },
  {
    id: 'machine-learning',
    category: 'machine_learning',
    patterns: [
      /train\s+(a\s+)?model/i,
      /machine\s+learning/i,
      /predict(ion)?s?/i,
      /classif(y|ication)/i,
      /regression/i,
      /clustering/i,
      /build\s+(a\s+)?model/i,
      /deep\s+learning/i,
      /neural\s+network/i,
    ],
    keywords: ['model', 'predict', 'train', 'machine learning', 'ML', 'classification', 'regression', 'clustering', 'neural', 'AI'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a machine learning engineer.
Focus on:
- Selecting appropriate ML algorithms for the task
- Proper data preparation and feature engineering
- Model training, validation, and evaluation
- Clear explanation of model performance and limitations

Always split data properly and report metrics.`,
      networkMode: 'SANDBOX',
    },
    priority: 8,
  },
  {
    id: 'data-transformation',
    category: 'data_transformation',
    patterns: [
      /transform\s+(the\s+)?data/i,
      /clean\s+(the\s+)?data/i,
      /filter\s+(the\s+)?rows/i,
      /merge\s+(the\s+)?datasets/i,
      /join\s+(the\s+)?tables/i,
      /pivot\s+(the\s+)?data/i,
      /reshape/i,
    ],
    keywords: ['transform', 'clean', 'filter', 'merge', 'join', 'pivot', 'reshape', 'aggregate', 'group'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a data engineer specializing in data transformation.
Focus on:
- Cleaning and preprocessing data
- Efficient transformations and aggregations
- Data quality validation
- Clear documentation of transformations applied

Always verify data integrity after transformations.`,
      networkMode: 'SANDBOX',
    },
    priority: 7,
  },
  {
    id: 'content-creation',
    category: 'content_creation',
    patterns: [
      /write\s+(a\s+)?blog/i,
      /create\s+content/i,
      /marketing\s+copy/i,
      /social\s+media\s+post/i,
      /draft\s+(an?\s+)?email/i,
      /write\s+(an?\s+)?article/i,
      /generate\s+copy/i,
    ],
    keywords: ['write', 'content', 'blog', 'marketing', 'copy', 'email', 'social media', 'article', 'draft'],
    suggestedConfig: {
      template: 'marketing',
      systemPrompt: `You are a content strategist and copywriter.
Focus on:
- Clear, engaging writing tailored to the audience
- SEO optimization where appropriate
- Consistent brand voice and messaging
- Actionable calls-to-action

Always ask about target audience if unclear.`,
      networkMode: 'PUBLIC',
    },
    priority: 6,
  },
  {
    id: 'customer-support',
    category: 'customer_support',
    patterns: [
      /customer\s+support/i,
      /help\s+desk/i,
      /answer\s+questions/i,
      /FAQ/i,
      /troubleshoot/i,
      /resolve\s+issues/i,
      /support\s+agent/i,
    ],
    keywords: ['support', 'help', 'troubleshoot', 'FAQ', 'questions', 'issues', 'resolve', 'assist'],
    suggestedConfig: {
      template: 'support',
      systemPrompt: `You are a customer support specialist.
Focus on:
- Understanding the customer's problem quickly
- Providing clear, step-by-step solutions
- Escalating when necessary
- Being empathetic and professional

Always verify the solution works before closing.`,
      networkMode: 'SANDBOX',
    },
    priority: 5,
  },
  {
    id: 'code-generation',
    category: 'code_generation',
    patterns: [
      /write\s+(some\s+)?code/i,
      /generate\s+(a\s+)?script/i,
      /create\s+(a\s+)?function/i,
      /implement\s+(a\s+)?feature/i,
      /code\s+to\s+/i,
      /python\s+(script|code)/i,
    ],
    keywords: ['code', 'script', 'function', 'implement', 'program', 'python', 'javascript'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a software developer.
Focus on:
- Writing clean, well-documented code
- Following best practices and conventions
- Error handling and edge cases
- Testing and validation

Always explain your implementation decisions.`,
      networkMode: 'SANDBOX',
    },
    priority: 4,
  },
  {
    id: 'research',
    category: 'research',
    patterns: [
      /research\s+/i,
      /find\s+information/i,
      /look\s+up/i,
      /search\s+for/i,
      /investigate/i,
    ],
    keywords: ['research', 'find', 'search', 'investigate', 'look up', 'discover'],
    suggestedConfig: {
      template: 'data-science',
      systemPrompt: `You are a research assistant.
Focus on:
- Thorough information gathering
- Source verification and credibility
- Clear summarization of findings
- Identifying knowledge gaps

Always cite your sources when possible.`,
      networkMode: 'PUBLIC',
    },
    priority: 3,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract entities from intent string
 */
export function extractEntities(intent: string): IntentEntity[] {
  const entities: IntentEntity[] = [];

  // Data source patterns
  const dataSourceMatch = intent.match(/(?:from|using|with)\s+(?:the\s+)?(\w+)\s+(?:data|dataset|file|table)/i);
  if (dataSourceMatch) {
    entities.push({
      type: 'data_source',
      value: dataSourceMatch[1],
      position: dataSourceMatch.index || 0,
    });
  }

  // Output format patterns
  const formatMatch = intent.match(/(?:as|in|to)\s+(?:a\s+)?(\w+)\s+(?:format|file|chart|graph)/i);
  if (formatMatch) {
    entities.push({
      type: 'output_format',
      value: formatMatch[1],
      position: formatMatch.index || 0,
    });
  }

  // Domain patterns
  const domainPatterns = [
    { regex: /(?:sales|revenue|financial)/i, domain: 'finance' },
    { regex: /(?:customer|user|client)/i, domain: 'customer' },
    { regex: /(?:marketing|campaign|ad)/i, domain: 'marketing' },
    { regex: /(?:product|inventory|stock)/i, domain: 'product' },
    { regex: /(?:health|medical|patient)/i, domain: 'healthcare' },
  ];

  for (const { regex, domain } of domainPatterns) {
    const match = intent.match(regex);
    if (match) {
      entities.push({
        type: 'domain',
        value: domain,
        position: match.index || 0,
      });
      break;
    }
  }

  // Action patterns
  const actionPatterns = ['analyze', 'visualize', 'predict', 'classify', 'train', 'create', 'generate', 'transform', 'clean'];
  for (const action of actionPatterns) {
    const actionIndex = intent.toLowerCase().indexOf(action);
    if (actionIndex !== -1) {
      entities.push({
        type: 'action',
        value: action,
        position: actionIndex,
      });
      break;
    }
  }

  return entities;
}

/**
 * Analyze intent using rule-based matching
 */
export function analyzeWithRules(
  intent: string,
  customPatterns: IntentPattern[] = []
): IntentAnalysis | null {
  const allPatterns = [...customPatterns, ...DEFAULT_PATTERNS]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const normalizedIntent = intent.toLowerCase().trim();
  let bestMatch: { pattern: IntentPattern; score: number } | null = null;

  for (const pattern of allPatterns) {
    let score = 0;

    // Check regex patterns (weighted at 40%)
    for (const regex of pattern.patterns) {
      if (regex.test(normalizedIntent)) {
        score += 0.4;
        break;
      }
    }

    // Check keywords (weighted at 60%)
    const matchedKeywords = pattern.keywords.filter(kw =>
      normalizedIntent.includes(kw.toLowerCase())
    );
    score += (matchedKeywords.length / pattern.keywords.length) * 0.6;

    if (score > (bestMatch?.score || 0)) {
      bestMatch = { pattern, score };
    }
  }

  if (!bestMatch || bestMatch.score < 0.3) {
    return null;
  }

  const entities = extractEntities(intent);

  return {
    category: bestMatch.pattern.category,
    confidence: Math.min(bestMatch.score, 1),
    entities,
    suggestedConfig: bestMatch.pattern.suggestedConfig,
    originalIntent: intent,
    method: 'rule',
  };
}

/**
 * Analyze intent using LLM (fallback for ambiguous cases)
 */
export async function analyzeWithLLM(
  intent: string,
  llmExecute: LLMExecutor
): Promise<IntentAnalysis> {
  const analysisPrompt = `Analyze this user intent and respond with JSON only:
Intent: "${intent}"

Respond with this exact JSON structure (no markdown, just JSON):
{
  "category": "data_analysis|visualization|machine_learning|data_transformation|content_creation|customer_support|code_generation|research|general_assistant",
  "confidence": 0.0-1.0,
  "suggestedSystemPrompt": "A brief system prompt for an AI agent to handle this intent",
  "template": "data-science|marketing|support|custom"
}`;

  try {
    const response = await llmExecute(analysisPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category as IntentCategory,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        entities: extractEntities(intent),
        suggestedConfig: {
          template: parsed.template || 'custom',
          systemPrompt: parsed.suggestedSystemPrompt,
        },
        originalIntent: intent,
        method: 'llm',
      };
    }
  } catch (error) {
    console.error('LLM intent analysis failed:', error);
  }

  // Fallback to general assistant
  return {
    category: 'general_assistant',
    confidence: 0.5,
    entities: extractEntities(intent),
    suggestedConfig: {
      template: 'custom',
      systemPrompt: `You are a helpful AI assistant. The user wants: ${intent}`,
    },
    originalIntent: intent,
    method: 'llm',
  };
}

// =============================================================================
// Intent Analyzer Class
// =============================================================================

/**
 * Intent Analyzer
 *
 * Analyzes user intent strings and produces structured analysis
 * with suggested agent configurations.
 */
export class IntentAnalyzer {
  private customPatterns: IntentPattern[];
  private confidenceThreshold: number;
  private useLLMFallback: boolean;

  constructor(options: IntentAnalyzerOptions = {}) {
    this.customPatterns = options.customPatterns || [];
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.useLLMFallback = options.useLLMFallback !== false;
  }

  /**
   * Analyze intent and return structured analysis
   */
  async analyze(
    intent: string,
    llmExecutor?: LLMExecutor
  ): Promise<IntentAnalysis> {
    // Try rule-based first
    const ruleAnalysis = analyzeWithRules(intent, this.customPatterns);

    if (ruleAnalysis && ruleAnalysis.confidence >= this.confidenceThreshold) {
      return ruleAnalysis;
    }

    // Fall back to LLM if enabled and executor provided
    if (this.useLLMFallback && llmExecutor) {
      const llmAnalysis = await analyzeWithLLM(intent, llmExecutor);

      // Merge with rule analysis if available and has higher confidence
      if (ruleAnalysis && llmAnalysis.confidence < ruleAnalysis.confidence) {
        return { ...ruleAnalysis, method: 'hybrid' };
      }

      return { ...llmAnalysis, method: 'hybrid' };
    }

    // Return rule analysis even if below threshold
    if (ruleAnalysis) {
      return ruleAnalysis;
    }

    // Last resort - general assistant
    return {
      category: 'general_assistant',
      confidence: 0.3,
      entities: extractEntities(intent),
      suggestedConfig: {
        template: 'custom',
        systemPrompt: `You are a helpful AI assistant. The user wants: ${intent}`,
      },
      originalIntent: intent,
      method: 'rule',
    };
  }

  /**
   * Register a custom intent pattern
   */
  addPattern(pattern: IntentPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Remove a custom pattern by ID
   */
  removePattern(patternId: string): boolean {
    const index = this.customPatterns.findIndex(p => p.id === patternId);
    if (index >= 0) {
      this.customPatterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered patterns (custom + defaults)
   */
  getPatterns(): IntentPattern[] {
    return [...this.customPatterns, ...DEFAULT_PATTERNS];
  }

  /**
   * Get only custom patterns
   */
  getCustomPatterns(): IntentPattern[] {
    return [...this.customPatterns];
  }

  /**
   * Update confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Enable or disable LLM fallback
   */
  setLLMFallback(enabled: boolean): void {
    this.useLLMFallback = enabled;
  }
}
