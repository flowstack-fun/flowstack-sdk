'use client';

/**
 * useAgent Hook
 *
 * The main hook for interacting with AI agents. Supports pre-configured templates
 * and streaming responses with tool calls.
 *
 * @example
 * ```tsx
 * function ChatApp() {
 *   const { query, messages, isStreaming, toolCalls, clearMessages } = useAgent('data-science');
 *
 *   const handleSend = async (input: string) => {
 *     await query(input);
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(m => (
 *         <div key={m.id} className={m.role}>
 *           {m.content}
 *         </div>
 *       ))}
 *       {isStreaming && <div>Thinking...</div>}
 *       <input onKeyDown={(e) => e.key === 'Enter' && handleSend(e.currentTarget.value)} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseAgentReturn, UseAgentOptions, ChatMessage, ToolCall, AgentTemplate, VisualizationData, InterruptInfo, DataSourceBadgeInfo, PiiRedactedEntity, AttachmentInput } from '../types';
import { executeQueryWithConfig, uploadFile, uploadDocument } from '../api/client';
import { parseSSEStream } from '../utils/sse-parser';
import { mockDelay, mockChatHistory } from '../mock/fixtures';
import { isJsonBlob, summarizeJsonEvent, dedupeContent, cleanContent, parseErrorMessage, unflattenMarkdownTables } from '../utils/stream-utils';
import { COLLECTION_CHANGED_EVENT } from './useCollection';

// P0-132 (G3): tool names whose completion should trigger a useCollection
// refresh (refreshOnAgentComplete). The old gate only matched the legacy
// mongodb_insert/update/delete names, but the real backend write tools are the
// document/app-data tools below — so reactive refresh silently never fired and
// apps had to call collection.refresh() manually. The legacy names are kept for
// back-compat with any older backend build.
const COLLECTION_WRITE_TOOLS = new Set<string>([
  'insert_documents',
  'update_documents',
  'delete_documents',
  'insert_app_data',
  'update_app_data',
  'delete_app_data',
  // legacy aliases
  'mongodb_insert',
  'mongodb_update',
  'mongodb_delete',
]);

// =============================================================================
// Standalone Agent Service (mock mode → real GPT-4o-mini)
// =============================================================================

/**
 * Template system prompts for auto-provisioning agents.
 * Extracted from intent-analyzer DEFAULT_PATTERNS.
 */
const TEMPLATE_SYSTEM_PROMPTS: Record<string, string> = {
  'data-science': `You are a data analyst specializing in exploratory data analysis.
Focus on:
- Statistical summaries and distributions
- Identifying patterns, correlations, and anomalies
- Providing actionable insights with supporting evidence
- Creating clear visualizations when helpful

Always explain your methodology and confidence levels.`,
  'marketing': `You are a content strategist and copywriter.
Focus on:
- Clear, engaging writing tailored to the audience
- SEO optimization where appropriate
- Consistent brand voice and messaging
- Actionable calls-to-action

Always ask about target audience if unclear.`,
  'support': `You are a customer support specialist.
Focus on:
- Understanding the customer's problem quickly
- Providing clear, step-by-step solutions
- Escalating when necessary
- Being empathetic and professional

Always verify the solution works before closing.`,
  'custom': 'You are a helpful AI assistant.',
};

/**
 * In-memory credentials for auto-provisioned agent sessions.
 * Intentionally NOT persisted to localStorage — every browser session
 * auto-provisions fresh. This avoids exposing API keys to XSS attacks
 * at the cost of a sub-cent auto-provision call per page load.
 */
interface AgentCredentials {
  api_key: string;
  tenant_id: string;
  thread_id?: string;
}

/** Module-level store — lives for the lifetime of the JS context only */
let agentCredentialsCache: AgentCredentials | null = null;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate mock response based on prompt keywords
 */
function getMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('customer') || lowerPrompt.includes('revenue')) {
    return `I analyzed your customer data and found some interesting insights:

**Top Findings:**
1. Your top 10 customers account for 45% of total revenue
2. Customer retention rate is 78% (above industry average)
3. Average order value has increased 12% this quarter

**Recommendations:**
- Consider implementing a loyalty program for high-value customers
- Focus marketing efforts on the 25-34 age demographic
- Investigate churn patterns in the "Enterprise" segment

Would you like me to create a visualization of these trends?`;
  }

  if (lowerPrompt.includes('analyze') || lowerPrompt.includes('analysis')) {
    return `I've completed the analysis of your data. Here's what I found:

**Summary Statistics:**
- Total records: 10,432
- Time period: Jan 2024 - Dec 2024
- Completeness: 98.5%

**Key Insights:**
- Significant growth trend detected (r² = 0.87)
- Seasonal patterns observed in Q4
- 3 potential outliers identified for review

Would you like me to dive deeper into any specific area?`;
  }

  if (lowerPrompt.includes('chart') || lowerPrompt.includes('visual') || lowerPrompt.includes('plot')) {
    return `I've created a visualization based on your request. The chart shows the distribution of your data over time.

**Chart Details:**
- Type: Line chart with trend overlay
- X-axis: Time period (monthly)
- Y-axis: Values (normalized)

The visualization has been saved to your workspace. You can find it in the Visualizations tab.

Would you like me to create additional views or modify this chart?`;
  }

  // Default response
  return `I understand you're asking about: "${prompt}"

In **mock mode**, I'm simulating a response without connecting to the backend. This helps you:
- Test your UI components
- Develop without network dependencies
- Validate user flows

To connect to a real AI agent, change your config:
\`\`\`tsx
<FlowstackProvider config={{ ...config, mode: 'production' }}>
\`\`\`

Is there anything specific you'd like to test?`;
}

/**
 * Reconstruct a `File` from the base64 wire format. Browser-only — `atob` and
 * `File` are window globals. We accept the encoded form because that's what
 * existing chat-input components produce; native `File` callers skip this.
 */
function decodeAttachment(att: { filename: string; content_type: string; data: string }): File {
  const binary = atob(att.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], att.filename, { type: att.content_type });
}

/**
 * Extensions the backend's /upload route parses into a queryable DataFrame.
 * Anything else routes through /upload-document, which stores raw bytes for
 * the agent's ingest_document / search_documents tools. Without this split,
 * a PDF/PNG/DOCX attachment 400s with "Unsupported file type" because /upload
 * is dataset-only. Set is intentionally narrow: .txt and .md fall through to
 * /upload-document since chat users typically attach those to discuss, not to
 * query as tab-separated tables.
 */
const TABULAR_EXTS = new Set([
  'csv', 'tsv', 'xlsx', 'xls', 'parquet', 'json', 'jsonl', 'avro', 'h5', 'hdf5', 'pkl',
]);

function _fileExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i + 1).toLowerCase();
}

/**
 * Hook for AI agent interactions
 * @param template - Agent template to use (default: 'data-science'). NOTE
 *   (P0-132 / G6): for apps whose brain is a registered persona, this template
 *   only sets a fallback agent_name + default instructions that the persona
 *   overrides — it does NOT mean the app runs on a "data-science parent agent".
 *   Pass a persona via `options.persona` (G4) to target it explicitly, or
 *   `options.systemPrompt` (G5) for an inline prompt. The default is fine for
 *   persona-backed apps; 'custom' is the honest label when no template applies.
 */
export function useAgent(template: AgentTemplate = 'data-science', options?: UseAgentOptions): UseAgentReturn {
  const {
    credentials,
    selectedWorkspace,
    messages,
    addMessage,
    updateMessage,
    clearMessages: contextClear,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config,
  } = useFlowstack();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingInterrupts, setPendingInterrupts] = useState<InterruptInfo[] | null>(null);
  const [connectedDataSources, setConnectedDataSources] = useState<DataSourceBadgeInfo[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const pendingPromptRef = useRef<string | null>(null);
  // When true, the NEXT query() call sends force_new_session=true so the
  // backend creates a new conversation on its end (not just cleared frontend state).
  const forceNewSessionRef = useRef<boolean>(false);
  // Persist session_id to sessionStorage so the backend can reload conversation
  // history after a page refresh. Without this, each refresh creates a new session.
  // P0-132 (G8): namespace the key by an optional per-instance sessionKey so two
  // useAgent instances in the same app (e.g. an interview chat and a matchmaker)
  // hold independent conversations instead of sharing one tenant-wide session
  // (which caused replies to bleed across surfaces). Omitting sessionKey keeps the
  // legacy tenant-shared key, so existing single-surface apps are unaffected.
  const sessionStorageKey = `flowstack:session_id:${config.tenantId || 'default'}${
    options?.sessionKey ? `:${options.sessionKey}` : ''
  }`;
  const sessionIdRef = useRef<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(sessionStorageKey) : null
  );

  const clientConfig = useMemo(() => ({
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  }), [config.baseUrl, config.tenantId]);

  const isMockMode = config.mode === 'mock';

  /**
   * Execute a query to the agent
   */
  const query = useCallback(async (prompt: string, attachments?: AttachmentInput[], allowedTerms?: string[]): Promise<void> => {
    if (isStreaming) {
      console.warn('[useAgent] Query already in progress, ignoring');
      return;
    }

    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return;
    }

    if (!selectedWorkspace && !isMockMode) {
      // Workspace auto-create may still be in flight — queue and retry once it resolves
      pendingPromptRef.current = prompt;
      return;
    }

    // Upload attachments BEFORE streaming. The `/stream` endpoint has no
    // attachment field on the wire — files have to land as workspace
    // datasets first, then the agent picks them up via list_datasets/get_dataset.
    // We bail out (rather than silently sending the prompt without the file)
    // because the alternative is the agent hallucinating a substitute dataset
    // from the user's library.
    let finalPrompt = prompt;
    let attachmentNames: string[] | undefined;
    if (attachments && attachments.length > 0 && !isMockMode && credentials && selectedWorkspace) {
      const uploaded: string[] = [];
      const datasetNames: string[] = [];
      const documentNames: string[] = [];
      for (const att of attachments) {
        const file = att instanceof File ? att : decodeAttachment(att);
        const ext = _fileExt(file.name);
        const isTabular = TABULAR_EXTS.has(ext);
        const res = isTabular
          ? await uploadFile(credentials, selectedWorkspace.workspaceId, file, file.name, clientConfig)
          : await uploadDocument(credentials, selectedWorkspace.workspaceId, file, file.name, clientConfig);
        if (!res.ok) {
          setError(`Failed to upload ${file.name}: ${res.error || 'unknown error'}`);
          return;
        }
        const resolvedName = isTabular
          ? ((res.data as any)?.dataset?.name || (res.data as any)?.report?.name || file.name)
          : ((res.data as any)?.document_name || file.name);
        uploaded.push(resolvedName);
        (isTabular ? datasetNames : documentNames).push(resolvedName);
      }
      attachmentNames = uploaded;
      // Type-tagged hints route the agent to the right tool. Without these,
      // Gemini wrote PdfReader("X.pdf") in a Daytona sandbox for a PDF — the
      // attached file existed but the agent had to guess the tool from the
      // extension alone. With explicit tool hints, datasets go through the
      // SQL/dataframe path and documents go through ingest/search, sidestepping
      // Daytona entirely for non-tabular files.
      const hints: string[] = [];
      if (datasetNames.length > 0) {
        hints.push(`[Attached dataset${datasetNames.length > 1 ? 's' : ''}: ${datasetNames.join(', ')} — use list_datasets / get_dataset / query_dataset_sql]`);
      }
      if (documentNames.length > 0) {
        hints.push(`[Attached document${documentNames.length > 1 ? 's' : ''}: ${documentNames.join(', ')} — use ingest_document / search_documents]`);
      }
      finalPrompt = `${hints.join('\n')}\n${prompt}`;
      // Refresh the dataset list in context so any panels that read it
      // see the new file without waiting for a manual refresh.
      try { await refreshDatasets?.(); } catch {}
    }

    // Add user message — use the original prompt so the chat UI shows what
    // the user typed, not the attachment-prefixed wire form.
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      attachmentNames,
    };
    addMessage(userMessage);
    const userMessageId = userMessage.id; // P0-57: capture for PII metadata attachment

    // Create assistant message placeholder
    const assistantId = generateId();
    currentMessageIdRef.current = assistantId;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
      visualizations: [],
    };
    addMessage(assistantMessage);

    // Set loading state
    setIsStreaming(true);
    setIsLoading(true);
    setIsQueryRunning(true);
    setQueryStartTime(Date.now());
    setToolCalls([]);

    // Mock mode — route to standalone agent service if configured,
    // otherwise fall back to canned keyword-matched responses.
    if (isMockMode) {
      if (config.agentServiceUrl) {
        // ── Standalone agent service path (real GPT-4o-mini) ──────────
        abortControllerRef.current = new AbortController();
        let fullContent = '';

        try {
          // Bootstrap: auto-provision agent on first query per session
          if (!agentCredentialsCache) {
            const provisionRes = await fetch(`${config.agentServiceUrl}/openai/auto-provision`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template: template || config.agentTemplate || 'data-science',
                agent_name: `${template || config.agentTemplate || 'data-science'}-agent`,
                instructions: TEMPLATE_SYSTEM_PROMPTS[template || config.agentTemplate || 'data-science'] || TEMPLATE_SYSTEM_PROMPTS['custom'],
                model: 'gpt-4o-mini',
              }),
            });

            if (!provisionRes.ok) {
              throw new Error(`Auto-provision failed: ${provisionRes.status}`);
            }

            const provisionData = await provisionRes.json();
            agentCredentialsCache = {
              api_key: provisionData.api_key,
              tenant_id: provisionData.tenant_id,
            };
          }

          // Chat call — SSE stream from /openai/chat
          const chatRes = await fetch(`${config.agentServiceUrl}/openai/chat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${agentCredentialsCache.api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: prompt,
              thread_id: agentCredentialsCache.thread_id,
            }),
            signal: abortControllerRef.current.signal,
          });

          if (!chatRes.ok) {
            throw new Error(`Agent chat failed: ${chatRes.status}`);
          }

          if (!chatRes.body) {
            throw new Error('No response body from agent service');
          }

          const reader = chatRes.body.getReader();

          // Reuse the same SSE parser + event switch as production.
          // The openai-agent backend now emits event:delta + {"delta":{"text":"..."}}
          // which parseSSEStream normalizes into StreamEvent with type='delta'.
          for await (const event of parseSSEStream(reader)) {
            if (abortControllerRef.current?.signal.aborted) break;

            switch (event.type) {
              case 'text':
              case 'content':
              case 'delta':
                if (event.content) {
                  fullContent += event.content;
                  updateMessage(assistantId, { content: fullContent });
                }
                break;

              case 'error':
                setError(event.error || 'Agent query failed');
                break;

              case 'done':
              case 'complete': {
                // Extract thread_id for multi-turn conversation
                const completeData = event.data as Record<string, unknown> | undefined;
                if (completeData?.thread_id) {
                  agentCredentialsCache!.thread_id = completeData.thread_id as string;
                }
                break;
              }
            }
          }

          updateMessage(assistantId, {
            content: fullContent,
            isStreaming: false,
          });
        } catch (err) {
          // Network error → fall back to canned mock responses
          const isFetchError = err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'));
          if (isFetchError) {
            console.warn('[useAgent] Agent service unreachable, falling back to mock responses');
            const mockResponse = getMockResponse(prompt);
            updateMessage(assistantId, {
              content: mockResponse,
              isStreaming: false,
            });
          } else {
            const message = err instanceof Error ? err.message : 'Agent query failed';
            setError(message);
            updateMessage(assistantId, {
              content: fullContent || `Error: ${message}`,
              isStreaming: false,
            });
          }
        } finally {
          setIsStreaming(false);
          setIsLoading(false);
          setIsQueryRunning(false);
          setQueryStartTime(null);
          currentMessageIdRef.current = null;
          abortControllerRef.current = null;
        }
        return;
      }

      // ── Canned mock responses (no agentServiceUrl configured) ────────
      try {
        await mockDelay(500, 1000);

        const mockResponse = getMockResponse(prompt);
        let streamedContent = '';

        for (let i = 0; i < mockResponse.length; i += 3) {
          if (abortControllerRef.current?.signal.aborted) break;
          streamedContent += mockResponse.slice(i, i + 3);
          updateMessage(assistantId, { content: streamedContent });
          await mockDelay(10, 30);
        }

        updateMessage(assistantId, {
          content: mockResponse,
          isStreaming: false,
        });
      } finally {
        setIsStreaming(false);
        setIsLoading(false);
        setIsQueryRunning(false);
        setQueryStartTime(null);
        currentMessageIdRef.current = null;
      }
      return;
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Track content outside try block for error handling
    let fullContent = '';

    try {
      const networkMode = config.agentTemplate === 'marketing' ? 'PUBLIC' : 'SANDBOX';
      const response = await executeQueryWithConfig(
        credentials!,
        finalPrompt,
        selectedWorkspace!.workspaceId,
        {
          networkMode,
          tools: options?.tools,
          capabilities: options?.capabilities,
          sessionId: sessionIdRef.current || undefined,
          forceNewSession: forceNewSessionRef.current || undefined,
          allowedTerms,
          // P0-132 (G5): forward an inline system-prompt override (was dropped).
          systemPrompt: options?.systemPrompt,
          // P0-132 (G4): target a specific registered persona (maps to
          // target_agents on the wire). persona wins over the agentName alias.
          persona: options?.persona ?? options?.agentName,
        },
        clientConfig
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const currentToolCalls: ToolCall[] = [];
      const currentVisualizations: VisualizationData[] = [];

      // ── Process SSE stream ────────────────────────────────────────────
      //
      // V2 BACKEND EVENT FLOW:
      //
      // 1. metadata   → session/workspace/tenant IDs (ignored here)
      // 2. delta      → incremental text tokens: {content: "token"}
      //                  Appended to fullContent for real-time display.
      // 3. tool_call  → tool invocation: {tool: "name", args: {...}}
      //                  Added to currentToolCalls, shown as "running".
      // 4. tool_result → tool output: {result: "...", tool: undefined}
      //                  Matched to running tool call, status → "complete".
      // 5. text       → final accumulated text: {content: "full response"}
      //                  Appended like any other text event.
      // 6. complete   → stream end: {event_count: N, execution_ms: N}
      //                  Terminates the loop.
      //
      // The SSE parser (sse-parser.ts) normalizes all backend formats
      // into StreamEvent objects before they reach this switch.
      // ────────────────────────────────────────────────────────────────
      for await (const event of parseSSEStream(reader)) {
        // Check if user cancelled the query
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        switch (event.type) {
          // ── METADATA ───────────────────────────────────────────────
          // First event from v2 backend with session info + data sources.
          // Extract connected data sources for badge display.
          case 'metadata': {
            const metaData = event.data as Record<string, unknown> | undefined;
            if (metaData?.session_id && typeof metaData.session_id === 'string') {
              // Backend assigned a new session_id — store it and clear the
              // force_new_session flag so subsequent turns continue this session.
              sessionIdRef.current = metaData.session_id;
              forceNewSessionRef.current = false;
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(sessionStorageKey, metaData.session_id);
              }
            }
            if (metaData?.data_sources && Array.isArray(metaData.data_sources)) {
              setConnectedDataSources(metaData.data_sources as DataSourceBadgeInfo[]);
            }
            // P0-57: Attach PII masking report to the user message
            if (metaData?.pii_redacted && Array.isArray(metaData.pii_redacted) && metaData.pii_redacted.length > 0) {
              updateMessage(userMessageId, {
                piiRedacted: metaData.pii_redacted as PiiRedactedEntity[],
              });
            }
            break;
          }

          // ── TEXT STREAMING ─────────────────────────────────────────
          // 'delta' = incremental token from v2 backend
          // 'text'  = final accumulated text from v2, or Anthropic raw
          // 'content' = generic text fallback
          // All append to fullContent for progressive UI rendering.
          case 'text':
          case 'content':
          case 'delta':
            if (event.content) {
              // Filter raw JSON blobs — show summary in statusLine instead
              if (isJsonBlob(event.content)) {
                const summary = summarizeJsonEvent(event.content);
                if (summary) {
                  updateMessage(assistantId, { statusLine: summary });
                }
                break;
              }

              // MonoSage backend emits {"type": "text", "content": chunk} for EVERY
              // streaming token — there is no separate "delta" type in this path.
              // Both 'text' and 'delta' events are incremental chunks: always append.
              // Never replace, never skip based on length — all chunks must accumulate.
              fullContent += event.content;
              const displayContent = unflattenMarkdownTables(fullContent);
              updateMessage(assistantId, { content: displayContent, statusLine: undefined });
            }
            break;

          // ── TOOL CALLS ─────────────────────────────────────────────
          // V2 emits: event.tool = tool name (from data.name),
          //           event.args = tool arguments (from data.args)
          // Parsed by normalizeEvent's tool format branch (section 4).
          case 'tool_call':
          case 'tool_use':
            if (event.tool) {
              // Deduplicate: if this tool is already running, don't add another entry.
              // The swarm re-broadcasts inner pipeline tool_call events, causing
              // the same tool to appear many times in the stream.
              const alreadyRunning = currentToolCalls.some(
                tc => tc.name === event.tool && tc.status === 'running'
              );
              if (alreadyRunning) break;

              const toolCall: ToolCall = {
                id: generateId(),
                toolUseId: event.args?.tool_use_id as string,
                name: event.tool,
                args: event.args,
                status: 'running',
                startTime: Date.now(),
              };
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
              updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
            }
            break;

          // ── TOOL RESULTS ───────────────────────────────────────────
          // V2 emits: tool_use_id, content, status
          // event.tool may be undefined (v2 doesn't include tool name
          // in results), so we fall back to finding the first running
          // tool call in the list.
          case 'tool_result':
            if (event.tool || event.toolUseId || currentToolCalls.length > 0) {
              // Match by toolUseId first, then name, then first running tool
              let toolIndex = -1;
              if (event.toolUseId) {
                toolIndex = currentToolCalls.findIndex(tc => tc.toolUseId === event.toolUseId);
              }
              if (toolIndex < 0 && event.tool) {
                toolIndex = currentToolCalls.findIndex(tc => tc.name === event.tool && tc.status === 'running');
              }
              if (toolIndex < 0) {
                toolIndex = currentToolCalls.findIndex(tc => tc.status === 'running');
              }
              if (toolIndex >= 0) {
                const completedTool = currentToolCalls[toolIndex];
                currentToolCalls[toolIndex] = {
                  ...completedTool,
                  // P0-132 (G1): the backend emits the tool's return value under
                  // `content` (normalized to event.content); `event.result` is only
                  // populated by legacy/alternate event shapes. Reading content first
                  // makes structured tool output actually reach toolCalls[].result —
                  // previously it was always undefined.
                  result: event.content ?? event.result,
                  // P0-132 (G1): mark a failed tool call as 'error' (backend
                  // is_error flag) instead of silently reporting 'complete'.
                  status: event.isError ? 'error' : 'complete',
                  endTime: Date.now(),
                };
                setToolCalls([...currentToolCalls]);
                updateMessage(assistantId, { toolCalls: [...currentToolCalls] });

                // Emit collection-changed event for useCollection reactive updates.
                // P0-132 (G3): match the real backend write tools (see
                // COLLECTION_WRITE_TOOLS) so refreshOnAgentComplete fires. A failed
                // write (is_error) must NOT trigger a refresh.
                const toolName = completedTool.name || '';
                if (COLLECTION_WRITE_TOOLS.has(toolName) && !event.isError) {
                  window.dispatchEvent(new CustomEvent(COLLECTION_CHANGED_EVENT, {
                    detail: { tool: toolName },
                  }));
                }
              }
            }
            break;

          // ── PROGRESS (swarm agent text) ──────────────────────────────
          // During swarm execution, specialist agents stream text as
          // 'progress' events. Append to main content AND to the matching
          // tool call's agentResponse so CasinoDemo can render it.
          case 'progress':
            if (event.message) {
              // Skip heartbeat keepalive events — they're for connection stability only
              const progressData = event.data as Record<string, unknown> | undefined;
              if (progressData?.progressType === 'heartbeat') break;

              // Filter JSON progress events — show summary instead
              if (isJsonBlob(event.message)) {
                const summary = summarizeJsonEvent(event.message, event.tool);
                if (summary) {
                  updateMessage(assistantId, { statusLine: summary });
                }
                break;
              }

              // Progress events show tool activity in the status line.
              // They do NOT append to fullContent — the backend's final 'text' event
              // is the authoritative complete response. Mixing progress text into
              // fullContent caused doubled/garbled content when the 'text' event arrived.
              updateMessage(assistantId, {
                statusLine: event.tool
                  ? `${event.tool}: ${event.message.substring(0, 80)}`
                  : event.message.substring(0, 100),
              });

              // Track progress text on the matching tool call's agentResponse
              // (used by tool call UI to show what the agent said during the tool run)
              if (currentToolCalls.length > 0) {
                let idx = -1;
                if (event.tool) {
                  for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                    if (currentToolCalls[i].name === event.tool) { idx = i; break; }
                  }
                }
                if (idx < 0) {
                  for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                    if (currentToolCalls[i].status === 'running') { idx = i; break; }
                  }
                }
                if (idx >= 0) {
                  const prev = currentToolCalls[idx].agentResponse || '';
                  const sep = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
                  currentToolCalls[idx] = {
                    ...currentToolCalls[idx],
                    agentResponse: prev + sep + event.message,
                  };
                  setToolCalls([...currentToolCalls]);
                  updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
                }
              }
            }
            break;

          // ── BUILD PIPELINE STAGE MARKERS ─────────────────────────────
          // The build harness emits {type:"stage", name:"plan"|"style"|
          // "build"|"verify"|"publish"} as the app progresses. Surface each
          // as a `[<tool>] stage: <name>` line on the running build tool's
          // agentResponse so the Casino build UI's stage bar can advance.
          // Without this these events fell through to 'content' and were
          // dropped, leaving the bar stuck on "Building…".
          // (normalizeEvent maps the event's `name` field onto `tool`.)
          case 'stage': {
            const stageName = (event.tool
              || (event.data as Record<string, unknown> | undefined)?.name) as string | undefined;
            if (stageName && currentToolCalls.length > 0) {
              let idx = -1;
              for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                if (currentToolCalls[i].status === 'running') { idx = i; break; }
              }
              if (idx >= 0) {
                const marker = `[${currentToolCalls[idx].name}] stage: ${stageName}`;
                const prev = currentToolCalls[idx].agentResponse || '';
                // Skip a duplicate trailing marker (harness may repeat a stage).
                if (!prev.endsWith(marker)) {
                  currentToolCalls[idx] = {
                    ...currentToolCalls[idx],
                    agentResponse: prev + (prev.length > 0 ? '\n' : '') + marker,
                  };
                  setToolCalls([...currentToolCalls]);
                  updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
                }
              }
            }
            break;
          }

          // ── VISUALIZATIONS ─────────────────────────────────────────
          case 'visualization':
            if (event.data) {
              const viz = event.data as VisualizationData;
              currentVisualizations.push(viz);
              addVisualization(viz);
              updateMessage(assistantId, { visualizations: [...currentVisualizations] });
            }
            break;

          // ── INTERRUPT ─────────────────────────────────────────────
          case 'interrupt':
            if (event.data) {
              setPendingInterrupts([event.data as InterruptInfo]);
            }
            break;

          // ── ERRORS ─────────────────────────────────────────────────
          case 'error': {
            const parsed = parseErrorMessage(event.error || 'Query failed');
            setError(parsed.message);
            break;
          }

          // ── STREAM END ─────────────────────────────────────────────
          // 'complete' = v2 stream termination (with event_count, execution_ms)
          // 'done' = OpenAI-style [DONE] signal
          case 'done':
          case 'complete': {
            const completeData = event.data as Record<string, unknown> | undefined;
            if (completeData?.stop_reason === 'interrupt') {
              // Keep pendingInterrupts set — agent was interrupted
            }
            break;
          }
        }
      }

      // Finalize any tool calls still marked as 'running'
      const now = Date.now();
      for (let i = 0; i < currentToolCalls.length; i++) {
        if (currentToolCalls[i].status === 'running') {
          currentToolCalls[i] = { ...currentToolCalls[i], status: 'complete', endTime: now };
        }
      }

      // Apply content cleaning pipeline (table repair only).
      // dedupeContent is intentionally removed — it used heuristic half-split
      // detection that triggered false positives on structured responses (numbered
      // lists, repeated headers) and truncated valid content to its second half.
      const cleanedContent = cleanContent(fullContent);

      // Mark message as complete
      updateMessage(assistantId, {
        content: cleanedContent,
        isStreaming: false,
        toolCalls: currentToolCalls,
        visualizations: currentVisualizations,
        statusLine: undefined,
      });

      // Refresh artifacts if tools were used
      if (currentToolCalls.length > 0) {
        await Promise.all([
          refreshDatasets(),
          refreshVisualizations(),
        ]);
      }

    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Query failed';
      const parsed = parseErrorMessage(raw);
      setError(parsed.message);

      // Update message with error
      updateMessage(assistantId, {
        content: fullContent || `Error: ${parsed.message}`,
        isStreaming: false,
      });
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
      setIsQueryRunning(false);
      setQueryStartTime(null);
      currentMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [
    isStreaming,
    credentials,
    selectedWorkspace,
    addMessage,
    updateMessage,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config,
    clientConfig,
    isMockMode,
    template,
  ]);

  // Flush pending prompt once workspace is available
  useEffect(() => {
    if (selectedWorkspace && pendingPromptRef.current) {
      const pending = pendingPromptRef.current;
      pendingPromptRef.current = null;
      query(pending);
    }
  }, [selectedWorkspace, query]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setToolCalls([]);
    sessionIdRef.current = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(sessionStorageKey);
    }
    contextClear();
  }, [contextClear, sessionStorageKey]);

  /**
   * Start a genuinely new backend conversation.
   *
   * Unlike `clearMessages()` which only clears frontend state, this also
   * tells the backend to create a new session on the next `query()` call via
   * `force_new_session=true`. The backend derives app session IDs
   * deterministically from (tenant, user, app_scope) — without this flag,
   * the old conversation history is always reloaded regardless of what the
   * frontend cleared.
   *
   * Usage in a built app:
   * ```tsx
   * const { startNewSession } = useAgent(undefined, { targetAgents: ['my_agent'] });
   * <button onClick={startNewSession}>New conversation</button>
   * ```
   */
  const startNewSession = useCallback(() => {
    setError(null);
    setToolCalls([]);
    sessionIdRef.current = null;
    forceNewSessionRef.current = true;   // ← tells backend to create new session
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(sessionStorageKey);
    }
    contextClear();
  }, [contextClear, sessionStorageKey]);

  /**
   * Cancel the current query
   */
  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Mark current message as cancelled
    if (currentMessageIdRef.current) {
      updateMessage(currentMessageIdRef.current, {
        content: '*(Query cancelled)*',
        isStreaming: false,
      });
    }

    setIsStreaming(false);
    setIsLoading(false);
    setIsQueryRunning(false);
    setQueryStartTime(null);
    setPendingInterrupts(null);
  }, [updateMessage, setIsQueryRunning, setQueryStartTime]);

  /**
   * Interrupt the currently running agent
   */
  const interruptAgent = useCallback(async () => {
    if (!credentials || !selectedWorkspace) return;

    const baseUrl = clientConfig.baseUrl || 'https://sage-api.flowstack.fun';
    const tenantId = credentials.tenantId || clientConfig.tenantId || '';

    await fetch(`${baseUrl}/stream/interrupt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': credentials.userId || '',
      },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.workspaceId,
        reason: '',
      }),
    });
  }, [credentials, selectedWorkspace, clientConfig]);

  /**
   * Respond to a pending interrupt by clearing the interrupt state and sending a new query
   */
  const respondToInterrupt = useCallback(async (message: string) => {
    setPendingInterrupts(null);
    await query(message);
  }, [query]);

  return {
    query,
    messages,
    isStreaming,
    isLoading,
    toolCalls,
    error,
    pendingInterrupts,
    connectedDataSources,
    clearMessages,
    startNewSession,
    cancelQuery,
    interruptAgent,
    respondToInterrupt,
  };
}
