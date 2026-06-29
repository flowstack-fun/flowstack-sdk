/**
 * SSE parser unit tests — P0-132 (G1/G2).
 *
 * Pure, no-network tests that pin the tool_result contract between the backend
 * (mono_sage/api/stream.py emits {type:'tool_result', name, content, is_error})
 * and the SDK. Before P0-132 the value was read from event.result (always
 * undefined) and is_error was dropped entirely.
 *
 * Run: npx vitest run src/utils/__tests__/sse-parser.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseSSELine, parseSSEStream } from '../sse-parser';

/** Build a ReadableStream of UTF-8 bytes from an SSE wire string. */
function streamOf(wire: string): ReadableStreamDefaultReader<Uint8Array> {
  const bytes = new TextEncoder().encode(wire);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }).getReader();
}

describe('normalizeEvent — tool_result (G1/G2)', () => {
  it('reads the tool return value from `content` and exposes it on event.content', () => {
    // Exactly the shape mono_sage/api/stream.py:145-152 emits.
    const ev = parseSSELine(
      'data: {"type":"tool_result","name":"query_mongodb","content":"[{\\"_id\\":1}]","is_error":false}',
    );
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('tool_result');
    // G1: value present under content (was being read from event.result → undefined)
    expect(ev!.content).toBe('[{"_id":1}]');
    // G2: tool name populated from backend `name`
    expect(ev!.tool).toBe('query_mongodb');
    // G1: error flag surfaced
    expect(ev!.isError).toBe(false);
  });

  it('surfaces is_error=true so callers can mark the tool call as failed', () => {
    const ev = parseSSELine(
      'data: {"type":"tool_result","name":"insert_documents","content":"boom","is_error":true}',
    );
    expect(ev!.isError).toBe(true);
    expect(ev!.content).toBe('boom');
  });

  it('still populates result/isError on the bare tool shape (no explicit type field)', () => {
    const ev = parseSSELine(
      'data: {"tool_use_id":"toolu_1","name":"insert_app_data","content":"ok","is_error":false}',
    );
    expect(ev!.type).toBe('tool_result');
    expect(ev!.result).toBe('ok');
    expect(ev!.toolUseId).toBe('toolu_1');
    expect(ev!.isError).toBe(false);
  });
});

describe('parseSSEStream — event:/data: pairing (G1/G2)', () => {
  it('yields a tool_result whose content carries the structured return value', async () => {
    const wire =
      'event: tool_call\n' +
      'data: {"name":"query_mongodb","id":"toolu_9","args":{"collection":"members"}}\n\n' +
      'event: tool_result\n' +
      'data: {"type":"tool_result","name":"query_mongodb","content":"[{\\"name\\":\\"a\\"}]","is_error":false}\n\n' +
      'event: complete\n' +
      'data: {"event_count":3}\n\n';

    const events = [];
    for await (const e of parseSSEStream(streamOf(wire))) events.push(e);

    const result = events.find((e) => e.type === 'tool_result');
    expect(result).toBeDefined();
    expect(result!.content).toBe('[{"name":"a"}]');
    expect(result!.tool).toBe('query_mongodb');
    expect(result!.isError).toBe(false);
  });
});
