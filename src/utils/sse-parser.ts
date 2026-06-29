/**
 * Server-Sent Events (SSE) parser for streaming responses.
 *
 * ─── ARCHITECTURE ───────────────────────────────────────────────────────
 *
 * The backend (streaming_v2.py) emits SSE in standard two-line format:
 *
 *   event: delta
 *   data: {"delta": {"text": "Hello"}}
 *
 *   event: tool_call
 *   data: {"name": "execute_python", "id": "toolu_01...", "args": {...}}
 *
 *   event: tool_result
 *   data: {"tool_use_id": "toolu_01...", "content": "...", "status": "success"}
 *
 *   event: complete
 *   data: {"event_count": 483, "execution_ms": 12340}
 *
 * This parser:
 *  1. Pairs `event:` lines with the next `data:` line (pendingEventType)
 *  2. Normalizes the JSON payload into a consistent StreamEvent shape
 *  3. Yields events for consumption by useAgent() hook
 *
 * ─── V2 BACKEND EVENT FORMATS ──────────────────────────────────────────
 *
 * Text deltas:   event: delta   → data: {"delta": {"text": "token"}}
 * Tool calls:    event: tool_call → data: {"name": "...", "id": "...", "args": {...}}
 * Tool results:  event: tool_result → data: {"tool_use_id": "...", "content": "..."}
 * Final text:    event: text    → data: {"content": "full response", "accumulated": true}
 * Stream end:    event: complete → data: {"event_count": N, "execution_ms": N}
 * Errors:        event: error   → data: {"error": "message"}
 *
 * ────────────────────────────────────────────────────────────────────────
 */

import type { StreamEvent, StreamEventType } from '../types';

/**
 * Parse a single SSE line into a StreamEvent.
 *
 * Handles three line types:
 *  - "data: {...}"  → Parse JSON, normalize to StreamEvent
 *  - "data: [DONE]" → Return done event
 *  - "event: type"  → Return bare type (used by parseSSEStream for pairing)
 *
 * @param line - Raw SSE line (e.g., "data: {...}")
 * @returns Parsed StreamEvent or null
 */
export function parseSSELine(line: string): StreamEvent | null {
  // Skip empty lines and comments (SSE spec: lines starting with ":" are comments)
  if (!line || line.startsWith(':')) {
    return null;
  }

  // Parse "data: " prefix — this is where the actual payload lives
  if (line.startsWith('data: ')) {
    const data = line.slice(6);

    // Handle [DONE] signal (OpenAI-style stream termination)
    if (data === '[DONE]') {
      return { type: 'done' };
    }

    try {
      const parsed = JSON.parse(data);
      return normalizeEvent(parsed);
    } catch {
      // Non-JSON data: treat as plain text content
      return { type: 'content', content: data };
    }
  }

  // Parse "event: " prefix — bare event type, no payload.
  // In parseSSEStream, this is captured as pendingEventType and applied
  // to the NEXT data: line. We still return it here for standalone use.
  if (line.startsWith('event: ')) {
    const eventType = line.slice(7) as StreamEventType;
    return { type: eventType };
  }

  return null;
}

/**
 * Normalize a parsed JSON payload into a consistent StreamEvent.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────
 *
 * Different backends and API versions emit events in different JSON shapes.
 * This function maps ALL of them to a single StreamEvent interface so
 * the useAgent() hook doesn't need to know about format differences.
 *
 * ─── FORMAT PRIORITY ────────────────────────────────────────────────────
 *
 * Formats are checked in this order (first match wins):
 *
 * 1. Standard {type: "..."} — has explicit type field (e.g., v2 metadata/text/complete)
 * 2. Delta {delta: {text: "..."}} — v2 incremental text tokens
 * 3. Content block {content_block: {...}} — Anthropic raw format
 * 4. Tool format {name: "...", args: {...}} — v2 tool_call/tool_result events
 * 5. Text {text: "..." | content: "..."} — simple text payloads
 * 6. Error {error: "..."} — error events
 * 7. Visualization {visualization: {...}} — chart/image data
 * 8. Credit status {credits: N} — billing events
 * 9. Progress {step: "..." | percentage: N} — progress updates
 * 10. Fallback — generic content event
 *
 * ────────────────────────────────────────────────────────────────────────
 */
function normalizeEvent(data: Record<string, unknown>): StreamEvent {

  // ── 1. STANDARD FORMAT: {type: "...", ...} ──────────────────────────
  // Events that already declare their type. Most v2 events with explicit
  // type fields hit this path (metadata, text, complete, error).
  // Also handles tool_call when type is present — note we check data.name
  // as a fallback for tool since v2 emits "name" not "tool".
  if (data.type) {
    return {
      type: normalizeEventType(String(data.type)),
      content: data.content as string | undefined,
      tool: (data.tool || data.name) as string | undefined,
      toolUseId: (data.tool_use_id || data.toolUseId || data.id) as string | undefined,
      args: (data.args || data.input) as Record<string, unknown> | undefined,
      result: data.result,
      // P0-132 (G1): preserve the tool_result error flag (backend key: `is_error`).
      isError: (data.is_error ?? data.isError) as boolean | undefined,
      error: data.error as string | undefined,
      data: data.data,
      message: data.message as string | undefined,
      percentage: data.percentage as number | undefined,
    };
  }

  // ── 2. DELTA FORMAT: {delta: {text: "..."}} ─────────────────────────
  // V2 backend emits incremental text tokens as:
  //   event: delta
  //   data: {"delta": {"text": "Hello"}}
  //
  // The delta object may or may not have a "type" field:
  //   - Anthropic raw: {type: "text_delta", text: "..."}
  //   - V2 backend:    {text: "..."} (no type field)
  //   - Tool input:    {type: "input_json_delta", partial_json: "..."}
  if (data.delta) {
    const delta = data.delta as Record<string, unknown>;
    // Anthropic raw text_delta format
    if (delta.type === 'text_delta') {
      return { type: 'text', content: delta.text as string };
    }
    // Anthropic raw tool input streaming
    if (delta.type === 'input_json_delta') {
      return { type: 'tool_use', args: { partial: delta.partial_json } };
    }
    // V2 backend delta format: {"delta": {"text": "..."}} — no type field.
    // This is the PRIMARY text streaming path for v2.
    if (delta.text) {
      return { type: 'delta', content: delta.text as string };
    }
  }

  // ── 3. CONTENT BLOCK FORMAT: {content_block: {...}} ─────────────────
  // Anthropic raw content_block_start events (not commonly seen with v2)
  if (data.content_block) {
    const block = data.content_block as Record<string, unknown>;
    if (block.type === 'text') {
      return { type: 'text', content: block.text as string };
    }
    if (block.type === 'tool_use') {
      return {
        type: 'tool_use',
        tool: block.name as string,
        args: block.input as Record<string, unknown>,
      };
    }
  }

  // ── 4. TOOL FORMAT: {name: "...", id: "...", args: {...}} ───────────
  // V2 tool_call events: {"name": "execute_python", "id": "toolu_...", "args": {...}}
  // V2 tool_result events: {"tool_use_id": "toolu_...", "content": "...", "status": "success"}
  //
  // Detection: any of tool_use_id, tool_name, or name present.
  // Disambiguation: if content/output exists → tool_result, else → tool_use.
  //
  // NOTE: checks both data.input (Anthropic format) and data.args (v2 format)
  if (data.tool_use_id || data.tool_name || data.name) {
    return {
      type: data.content || data.output ? 'tool_result' : 'tool_use',
      tool: (data.tool_name || data.name) as string | undefined,
      toolUseId: (data.tool_use_id || data.id) as string | undefined,
      args: (data.input || data.args) as Record<string, unknown> | undefined,
      result: data.content || data.output,
      // P0-132 (G1): preserve the tool_result error flag (backend key: `is_error`).
      isError: (data.is_error ?? data.isError) as boolean | undefined,
    };
  }

  // ── 5. PLAIN TEXT: {text: "..." | content: "..."} ───────────────────
  if (data.text || data.content) {
    return { type: 'text', content: (data.text || data.content) as string };
  }

  // ── 6. ERROR: {error: "..."} ────────────────────────────────────────
  if (data.error) {
    return { type: 'error', error: data.error as string };
  }

  // ── 7. VISUALIZATION: {visualization: {...}} ────────────────────────
  if (data.visualization || data.image_url || data.imageUrl) {
    return {
      type: 'visualization',
      data: data.visualization || {
        imageUrl: data.image_url || data.imageUrl,
        name: data.name,
        format: data.format,
      },
    };
  }

  // ── 8. CREDIT STATUS: {credits: N | remaining: N} ──────────────────
  if (data.credits !== undefined || data.remaining !== undefined) {
    return {
      type: 'credit_status',
      data: {
        remaining: data.credits ?? data.remaining,
        used: data.used,
      },
    };
  }

  // ── 9. PROGRESS: {step: "..." | percentage: N} ─────────────────────
  if (data.step || data.progress || data.percentage !== undefined) {
    return {
      type: 'progress',
      message: (data.step || data.progress) as string | undefined,
      percentage: data.percentage as number | undefined,
    };
  }

  // ── 10. FALLBACK ────────────────────────────────────────────────────
  // Unknown format — wrap as generic content event for debugging
  return { type: 'content', data };
}

/**
 * Normalize event type strings to standard StreamEventType values.
 *
 * Maps backend-specific type names to the canonical types that useAgent()
 * switches on. This is where aliases collapse:
 *   "content_block_delta" → "delta"
 *   "viz" → "visualization"
 *   "message_stop" → "done"
 */
function normalizeEventType(type: string): StreamEventType {
  const typeMap: Record<string, StreamEventType> = {
    // Text streaming
    'text': 'text',             // Final accumulated text (v2: event: text)
    'delta': 'delta',           // Incremental token (v2: event: delta)
    'content': 'content',       // Generic content
    'content_block_delta': 'delta', // Anthropic raw format → delta

    // Tool lifecycle
    'tool_use': 'tool_use',     // Tool invocation start
    'tool_call': 'tool_call',   // V2 tool call with name + args
    'tool_result': 'tool_result', // Tool execution result

    // Data events
    'visualization': 'visualization',
    'viz': 'visualization',     // Shorthand alias

    // Progress
    'progress': 'progress',
    'step': 'progress',         // Step-based progress alias

    // Billing
    'credit_status': 'credit_status',
    'credits': 'credit_status', // Shorthand alias

    // P0-66: per-query execution budget snapshot (time/tool/cost)
    'budget_update': 'budget_update',

    // Stream lifecycle
    'metadata': 'metadata',     // V2 metadata with session info + data sources
    'complete': 'complete',     // V2 stream end event
    'done': 'done',             // OpenAI-style stream end
    'message_stop': 'done',     // Anthropic raw format → done

    // Interrupt
    'interrupt': 'interrupt',

    // Errors
    'error': 'error',
  };

  return typeMap[type.toLowerCase()] || 'content';
}

/**
 * Async generator that reads a ReadableStream and yields parsed StreamEvents.
 *
 * ─── SSE WIRE FORMAT ────────────────────────────────────────────────────
 *
 * The backend sends events as two-line pairs separated by blank lines:
 *
 *   event: delta\n          ← event type (optional but v2 always sends it)
 *   data: {"delta":...}\n   ← JSON payload
 *   \n                      ← blank line = end of event
 *
 * This generator:
 *  1. Buffers incoming bytes and splits on newlines
 *  2. When it sees "event: X", stores X as pendingEventType
 *  3. When it sees "data: {...}", parses the JSON via normalizeEvent()
 *  4. Applies the pending event type (overrides whatever normalizeEvent guessed)
 *  5. Yields the final StreamEvent
 *
 * This pairing is critical because normalizeEvent may guess wrong
 * (e.g., a tool_call payload with "name" field could be mistaken for
 * tool_use), but the explicit "event: tool_call" line corrects it.
 *
 * ────────────────────────────────────────────────────────────────────────
 *
 * @param reader - ReadableStreamDefaultReader from fetch response
 * @returns AsyncGenerator yielding StreamEvents
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';
  // Stores the event type from an "event: X" line until the next "data: " line
  let pendingEventType: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append decoded chunk to buffer, split into complete lines
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Last element is incomplete (no trailing newline yet) — keep in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // "event: delta" → store type, DON'T yield yet.
        // The actual payload comes on the next "data: " line.
        if (trimmed.startsWith('event: ')) {
          pendingEventType = trimmed.slice(7);
          continue;
        }

        // "data: {...}" → parse JSON and yield as StreamEvent
        const event = parseSSELine(trimmed);
        if (event) {
          // Override the type that normalizeEvent() guessed with the
          // explicit type from the preceding "event: " line.
          // This ensures "event: tool_call" + "data: {name: ...}"
          // correctly yields {type: 'tool_call'} not {type: 'tool_use'}.
          if (pendingEventType) {
            event.type = normalizeEventType(pendingEventType);
            pendingEventType = null;
          }

          yield event;

          // Stream termination — stop reading after done/complete
          if (event.type === 'done' || event.type === 'complete') {
            return;
          }
        }
      }
    }

    // Process any remaining bytes in the buffer after stream closes
    if (buffer.trim()) {
      const event = parseSSELine(buffer.trim());
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Convenience wrapper: process an SSE stream with callbacks instead of async iteration.
 * Used when you prefer callback-style over for-await-of.
 *
 * @param response - Fetch Response with SSE body
 * @param onEvent - Called for each parsed StreamEvent
 * @param onError - Called if the stream throws (optional)
 */
export async function processSSEStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  try {
    for await (const event of parseSSEStream(reader)) {
      onEvent(event);
    }
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    } else {
      throw error;
    }
  }
}
