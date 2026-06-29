/**
 * Stream content utilities — ported from mobile casino-utils.ts + error-utils.ts
 * Handles JSON blob filtering, content deduplication, table repair, and cleaning.
 */

/** Check if a string looks like raw JSON (object or array). */
export function isJsonBlob(s: string): boolean {
  const t = s.trimStart();
  return t.startsWith('{"') || t.startsWith('[{') || t.startsWith('["');
}

/** Extract a human-readable summary from a JSON event blob. */
export function summarizeJsonEvent(raw: string, tool?: string): string | null {
  try {
    const d = JSON.parse(raw);
    if (d.status === 'success' && d.count !== undefined) {
      return `Found ${d.count} dataset${d.count !== 1 ? 's' : ''}${d.query ? ` for "${d.query}"` : ''}`;
    }
    if (d.status === 'progress' && d.message) {
      return typeof d.message === 'string' ? d.message : null;
    }
    const msg = d.message || d.description || d.status;
    if (typeof msg === 'string' && msg.length < 120) {
      return tool ? `${tool}: ${msg}` : msg;
    }
    if (Array.isArray(d) && d.length > 0) {
      return `Received ${d.length} result${d.length !== 1 ? 's' : ''}`;
    }
    return tool ? `${tool} processing...` : null;
  } catch {
    return null;
  }
}

/**
 * Detect and strip doubled content from streaming responses.
 * The backend sometimes sends the full response twice.
 */
export function dedupeContent(text: string): string {
  if (!text || text.length < 100) return text;

  const len = text.length;
  const mid = Math.floor(len / 2);

  for (let offset = 0; offset <= Math.floor(len * 0.05); offset++) {
    for (const m of [mid + offset, mid - offset]) {
      if (m < 50 || m > len - 50) continue;

      const a = text.slice(0, m);
      const b = text.slice(m);

      if (Math.abs(a.length - b.length) > Math.min(a.length, b.length) * 0.15) continue;

      const norm = (s: string) =>
        s.toLowerCase().replace(/\s+/g, ' ').replace(/[*#_`\-|>]/g, '').trim();

      const na = norm(a);
      const nb = norm(b);

      const cmpLen = 60;
      if (na.length < cmpLen || nb.length < cmpLen) continue;

      const prefixMatch = na.slice(0, cmpLen) === nb.slice(0, cmpLen);
      const suffixMatch = na.slice(-cmpLen) === nb.slice(-cmpLen);

      const midSample = Math.floor(Math.min(na.length, nb.length) / 2);
      const midMatch = na.slice(midSample, midSample + 30) === nb.slice(midSample, midSample + 30);

      if (prefixMatch && suffixMatch && midMatch) {
        return b.trim();
      }
    }
  }

  return text;
}

/** Check if a line is a markdown table separator row. */
function isSeparatorRow(line: string): boolean {
  return /^\|[\s:-]*-{2,}[\s|:-]*\|?$/.test(line.trim());
}

/** Repair markdown tables broken by streaming concatenation. */
function repairTables(text: string): string {
  if (!text.includes('|')) return text;

  let s = text;

  // Handle entire table on a single line
  s = s.replace(/^(\|[^\n]*\|)$/gm, (line) => {
    const cells = line.split('|').slice(1);
    if (cells.length > 0 && !cells[cells.length - 1].trim()) cells.pop();
    if (cells.length < 6) return line;

    const isSep = cells.map(c => /^\s*:?-{2,}:?\s*$/.test(c));
    let sepStart = -1;
    let sepLen = 0;
    for (let i = 0; i < isSep.length; i++) {
      if (isSep[i]) {
        if (sepStart === -1) sepStart = i;
        sepLen++;
      } else if (sepStart !== -1) break;
    }
    if (sepLen < 2 || sepStart < sepLen) return line;
    const cols = sepLen;
    if (sepStart !== cols) return line;
    const dataCells = cells.slice(sepStart + cols);
    if (dataCells.length < cols) return line;

    const header = '| ' + cells.slice(0, cols).map(c => c.trim()).join(' | ') + ' |';
    const sep = '| ' + cells.slice(sepStart, sepStart + cols).map(c => c.trim()).join(' | ') + ' |';
    const rows: string[] = [];
    for (let i = 0; i < dataCells.length; i += cols) {
      const chunk = dataCells.slice(i, i + cols);
      if (chunk.length === cols) {
        rows.push('| ' + chunk.map(c => c.trim()).join(' | ') + ' |');
      } else if (chunk.some(c => c.trim())) {
        while (chunk.length < cols) chunk.push(' ');
        rows.push('| ' + chunk.map(c => c.trim()).join(' | ') + ' |');
      }
    }
    return [header, sep, ...rows].join('\n');
  });

  // Strip separator fragments glued to header row end
  s = s.replace(
    /^(\|[^|\n]+(?:\|[^|\n]+)*\|)\s*---[-|\s]*$/gm,
    (match, captured) => {
      const cells = captured.split('|').filter((c: string) => c.trim());
      if (cells.every((c: string) => /^[\s:-]*-{2,}[\s:-]*$/.test(c))) return match;
      return captured;
    }
  );

  // Fix fragmented separator rows
  s = s.replace(
    /^(\|[^|\n]+(?:\|[^|\n]+)*)\|\s*\|---\n(?:[-|\s]*\n)*/gm,
    (match, headerPart) => {
      const cols = (headerPart.match(/\|/g) || []).length;
      if (cols < 1) return match;
      return headerPart + '|\n|' + Array(cols).fill(' --- ').join('|') + '|\n';
    }
  );

  // Split concatenated table rows
  s = s.replace(/\|\s*\|(?=\s*[^\s|])/g, '|\n|');

  // Clean orphaned separator debris
  s = s.replace(/^-+\|[-|\s]*$/gm, '');
  s = s.replace(/^[-|\s]*\|---[-|\s]*$/gm, '');
  s = s.replace(/^\|\s*$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');

  // Find table blocks and ensure separator + split over-long rows
  const lines = s.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if ((line.match(/\|/g) || []).length >= 2 && !isSeparatorRow(line)) {
      const tableLines: string[] = [line];
      let hasSeparator = false;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if ((next.match(/\|/g) || []).length >= 2 || isSeparatorRow(next)) {
          if (isSeparatorRow(next)) hasSeparator = true;
          tableLines.push(next);
          j++;
        } else if (next.trim() === '') {
          if (j + 1 < lines.length && (lines[j + 1].match(/\|/g) || []).length >= 2) {
            tableLines.push(next);
            j++;
          } else break;
        } else break;
      }
      const headerCols = (tableLines[0].match(/\|/g) || []).length - 1;

      const expanded: string[] = [];
      for (const tl of tableLines) {
        if (tl.trim() === '') continue;
        if (isSeparatorRow(tl) || headerCols < 2) {
          expanded.push(tl);
          continue;
        }
        const rowPipes = (tl.match(/\|/g) || []).length - 1;
        if (rowPipes > headerCols && rowPipes >= headerCols * 2) {
          const cells = tl.split('|');
          const inner = cells.slice(1, -1);
          for (let c = 0; c < inner.length; c += headerCols) {
            const chunk = inner.slice(c, c + headerCols);
            if (chunk.length === headerCols) {
              expanded.push('|' + chunk.join('|') + '|');
            } else if (chunk.some(cell => cell.trim())) {
              while (chunk.length < headerCols) chunk.push(' ');
              expanded.push('|' + chunk.join('|') + '|');
            }
          }
        } else {
          expanded.push(tl);
        }
      }

      if (!hasSeparator && expanded.length >= 2 && headerCols >= 2) {
        const sep = '|' + Array(headerCols).fill(' --- ').join('|') + '|';
        result.push(expanded[0], sep);
        for (let k = 1; k < expanded.length; k++) result.push(expanded[k]);
      } else if (hasSeparator && headerCols >= 2) {
        for (const tl of expanded) {
          if (isSeparatorRow(tl)) {
            const sepCols = (tl.match(/\|/g) || []).length - 1;
            result.push(sepCols !== headerCols
              ? '|' + Array(headerCols).fill(' --- ').join('|') + '|'
              : tl);
          } else {
            result.push(tl);
          }
        }
      } else {
        result.push(...expanded);
      }
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }
  s = result.join('\n');

  // Ensure table blocks have blank line before them
  s = s.replace(/([^\n])\n(\|[^\n]*\|[^\n]*\n\|[\s|:-]+\|)/g, '$1\n\n$2');

  return s;
}

/**
 * Detect markdown tables that streaming concatenation collapsed onto one line
 * and re-insert row boundaries so remarkGfm can parse them.
 *
 * Ported from casino/components/workspace/ChatMessage.tsx (lines 106-137).
 */
export function unflattenMarkdownTables(content: string): string {
  if (!content) return content;
  if (!content.includes('|')) return content;
  if (!/\|\s*:?-{3,}:?\s*\|/.test(content)) return content;

  const lines = content.split('\n');
  const rewritten = lines.map((line) => {
    if (!/\|\s*:?-{3,}:?\s*\|/.test(line)) return line;
    const rebuilt = line.replace(/ \| \| /g, ' |\n| ');
    if (rebuilt === line) return line;
    const firstPipe = rebuilt.indexOf('|');
    if (firstPipe > 0) {
      const lead = rebuilt.slice(0, firstPipe).trimEnd();
      const table = rebuilt.slice(firstPipe);
      return lead ? `${lead}\n\n${table}` : table;
    }
    return rebuilt;
  });
  return rewritten.join('\n');
}

/**
 * Clean assistant message content before rendering as Markdown.
 */
export function cleanContent(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Strip S3 URLs — both clean and tokenizer-broken (streaming inserts spaces within URLs)
  cleaned = cleaned.replace(/Visualization URL:\s*https?:\/\/[^\s)]+/gi, '');
  // Strip markdown links containing S3 URLs (clean or broken)
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*s3\.amazonaws\.com[^)]*\)/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*X-Amz[^)]*\)/g, '$1');
  // Strip clean S3 presigned URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s)]*\.s3\.amazonaws\.com\/[^\s)]*\?X-Amz[^\s)]*/g, '');
  // Strip tokenizer-broken S3 URLs (spaces within URL) — match from https to closing paren or end of line
  cleaned = cleaned.replace(/https?\s*:\s*\/\s*\/[^)]*s\s*3\s*\.\s*amazonaws\s*\.\s*com[^)\n]*(?:\)|$)/gm, '');
  // Strip standalone lines that are purely X-Amz credential debris (no meaningful content)
  cleaned = cleaned.replace(/^\s*(?:&?X\s*-\s*Amz\s*-\s*\w+=[^\n]*)+\s*$/gm, '');
  // Strip lines that are just continuation of broken presigned URL tokens (>85% encoded chars, no pipe/table)
  cleaned = cleaned.replace(/^[A-Za-z0-9%+/=\s]{20,}$/gm, (line) => {
    if (line.includes('|')) return line; // Preserve table rows
    const alphaPercent = (line.match(/[A-Za-z0-9%+/=]/g) || []).length;
    return alphaPercent / line.length > 0.85 ? '' : line;
  });

  // Strip JSON blobs that leak from tool results
  cleaned = cleaned.replace(/\{"status"\s*:\s*"[^"]*"[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, '');
  cleaned = cleaned.replace(/(?:complete|success|error)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '');
  cleaned = cleaned.replace(/\[\s*\{[^[\]]*(?:\[[^\]]*\][^[\]]*)*\}\s*(?:,\s*\{[^[\]]*\}\s*)*\]/g, '');
  cleaned = cleaned.replace(/\[?\d+ rows? x \d+ columns?\]?\s*/g, '');
  cleaned = cleaned.replace(/^.*(?:NaN\s+){3,}.*$/gm, '');
  cleaned = cleaned.replace(/[\d.]+ MB \(streaming[^)]*\)/g, '');
  cleaned = cleaned.replace(/,"?error"?\s*:\s*null[^}\n]*/g, '');

  // Strip orchestrator self-talk
  cleaned = cleaned.replace(/(?:Let me|Now let me|I'll|I will)\s+(?:start|begin|continue|retrieve|get|run|perform|compile|hand off|create|check|explore)[^.:\n]*[.:]\s*/gi, '');
  cleaned = cleaned.replace(/(?:Great|Perfect|Excellent|Wonderful)!\s*/g, '');
  cleaned = cleaned.replace(/Now\s+[a-z][^.:]*[.:]\s*/g, '');

  // Fix streaming-broken tables
  cleaned = repairTables(cleaned);

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned.trim();
}

/**
 * Parse error messages from the backend into user-friendly format.
 */
export function parseErrorMessage(raw: string): {
  message: string;
  isAuth: boolean;
  isContextLimit: boolean;
} {
  let msg = raw;
  let isAuth = false;
  let isContextLimit = false;

  // Try to extract from JSON
  try {
    const parsed = JSON.parse(raw);
    msg = parsed.error || parsed.detail || parsed.message || raw;
  } catch {
    // Not JSON — use as-is
  }

  // Detect auth errors
  if (/token.*expired|unauthorized|401|403|permission denied|invalid.*token|auth.*required/i.test(msg)) {
    isAuth = true;
    msg = 'Session expired — tap Reconnect to continue.';
  }

  // Detect context limit
  if (/context.*limit|too many tokens|max.*context|prompt.*too.*long/i.test(msg)) {
    isContextLimit = true;
    msg = 'Conversation got too long. Starting fresh on next message.';
  }

  // Truncate overly long messages
  if (msg.length > 200) {
    msg = msg.substring(0, 197) + '...';
  }

  return { message: msg, isAuth, isContextLimit };
}
