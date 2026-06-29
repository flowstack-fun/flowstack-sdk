'use client';

/**
 * MermaidDiagram — renders sanitized Mermaid code as an SVG diagram.
 *
 * Used by the SDK's MessageList to give built apps diagram rendering.
 * Applies sanitizeMermaidCode before rendering and shows a graceful
 * fallback on parse errors (never exposes parser internals to users).
 */

import React, { useEffect, useRef, useState } from 'react';
import { sanitizeMermaidCode } from '../../utils/mermaid-utils';

export interface MermaidDiagramProps {
  /** Raw Mermaid code (will be sanitized before rendering) */
  code: string;
}

let mermaidInitialized = false;

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'strict',
            fontFamily: 'inherit',
          });
          mermaidInitialized = true;
        }

        const sanitized = sanitizeMermaidCode(code.trim());
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, sanitized);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="flowstack-diagram-fallback">
        <div className="flowstack-diagram-fallback-header">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
          </svg>
          <span>Diagram could not render</span>
        </div>
        <button
          className="flowstack-diagram-toggle"
          onClick={() => setShowCode(!showCode)}
        >
          {showCode ? 'Hide code' : 'View as code'}
        </button>
        {showCode && (
          <pre className="flowstack-diagram-code">{code}</pre>
        )}
        <style>{`
          .flowstack-diagram-fallback {
            margin: 0.75rem 0;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
          }
          .flowstack-diagram-fallback-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
          }
          .flowstack-diagram-toggle {
            margin-top: 0.5rem;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            cursor: pointer;
          }
          .flowstack-diagram-toggle:hover {
            background: #f3f4f6;
          }
          .flowstack-diagram-code {
            margin-top: 0.5rem;
            font-size: 0.75rem;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            color: #6b7280;
            background: #f3f4f6;
            padding: 0.5rem;
            border-radius: 0.25rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flowstack-diagram-container"
      />
      <style>{`
        .flowstack-diagram-container {
          margin: 0.75rem 0;
          overflow-x: auto;
          border-radius: 0.5rem;
          background: #f9fafb;
          padding: 1rem;
        }
        .flowstack-diagram-container > svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </>
  );
}
