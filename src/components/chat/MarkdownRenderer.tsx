'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { unflattenMarkdownTables } from '../../utils/stream-utils';

export interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const processed = unflattenMarkdownTables(content ?? '');

  return (
    <div className={className} style={{ lineHeight: 1.7 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.875rem' }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{ padding: '6px 12px', borderBottom: '2px solid currentColor', textAlign: 'left', opacity: 0.7 }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '6px 12px', borderBottom: '1px solid rgba(128,128,128,0.2)', verticalAlign: 'top' }}>
              {children}
            </td>
          ),
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code style={{ background: 'rgba(128,128,128,0.15)', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', fontSize: '0.85em' }} {...props}>
                {children}
              </code>
            ) : (
              <pre style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: 12, overflowX: 'auto', margin: '8px 0' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }} {...props}>{children}</code>
              </pre>
            ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
