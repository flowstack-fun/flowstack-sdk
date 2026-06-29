/**
 * Mermaid diagram utilities — sanitization and content parsing.
 *
 * Used by both the SDK's MessageList (built apps) and Casino's ChatMessage
 * to safely render LLM-generated Mermaid code.
 */

const VALID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequencediagram', 'classdiagram',
  'statediagram', 'erdiagram', 'gantt', 'pie', 'gitgraph',
  'mindmap', 'timeline', 'sankey', 'xychart', 'block',
];

/**
 * Sanitize LLM-generated Mermaid code before passing to the renderer.
 * Strips HTML tags, replaces special characters in labels, and fixes
 * common structural issues that break the Mermaid parser.
 */
export function sanitizeMermaidCode(code: string): string {
  if (!code || !code.trim()) return code;

  const lines = code.split('\n');
  const firstNonEmpty = lines.find(l => l.trim())?.trim().toLowerCase() ?? '';

  // Only sanitize if it looks like mermaid (starts with a known diagram type)
  if (!VALID_DIAGRAM_TYPES.some(t => firstNonEmpty.startsWith(t))) {
    return code;
  }

  let result = code;

  // 1. Strip HTML tags (e.g. <br/>, <b>text</b>) — replace with space
  result = result.replace(/<\/?[a-z][a-z0-9]*\s*\/?>/gi, ' ');

  // 2. Replace special characters inside node labels [...] and ("...")
  //    Match [...] brackets (node labels)
  result = result.replace(/\[([^\]]*)\]/g, (_match, inner: string) => {
    const cleaned = inner
      .replace(/&/g, ' and ')
      .replace(/\|/g, '/')
      .replace(/#(?![0-9a-fA-F]{3,6}\b)/g, 'no.'); // preserve hex colors
    return `[${cleaned}]`;
  });

  // Match (...) parentheses (round node labels)
  result = result.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    const cleaned = inner
      .replace(/&/g, ' and ')
      .replace(/\|/g, '/')
      .replace(/#(?![0-9a-fA-F]{3,6}\b)/g, 'no.');
    return `(${cleaned})`;
  });

  // 3. Remove blank lines (mermaid can choke on them in some diagram types)
  result = result.replace(/^\s*$/gm, '').replace(/\n{2,}/g, '\n');

  // 4. Fix style declarations appended to edge/node lines
  //    e.g. "A --> B  style A fill:#f9f" → "A --> B\nstyle A fill:#f9f"
  result = result.replace(/(\S)\s{2,}(style\s+)/g, '$1\n$2');

  return result;
}

// ---------------------------------------------------------------------------
// Content segment splitting — detect ```mermaid blocks in message text
// ---------------------------------------------------------------------------

export interface ContentSegment {
  type: 'text' | 'mermaid';
  content: string;
}

const MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/g;

/**
 * Split message content into alternating text and mermaid segments.
 * Text segments preserve everything outside fenced mermaid blocks.
 * Mermaid segments contain only the code inside the fences (trimmed).
 */
export function splitContentSegments(text: string): ContentSegment[] {
  if (!text) return [{ type: 'text', content: text ?? '' }];

  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MERMAID_BLOCK_RE)) {
    const matchStart = match.index!;
    // Text before this mermaid block
    if (matchStart > lastIndex) {
      const before = text.slice(lastIndex, matchStart);
      if (before.trim()) segments.push({ type: 'text', content: before });
    }
    // The mermaid code (captured group)
    segments.push({ type: 'mermaid', content: match[1].trim() });
    lastIndex = matchStart + match[0].length;
  }

  // Remaining text after last block
  if (lastIndex < text.length) {
    const after = text.slice(lastIndex);
    if (after.trim()) segments.push({ type: 'text', content: after });
  }

  // If no mermaid blocks found, return the whole thing as text
  if (segments.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return segments;
}
