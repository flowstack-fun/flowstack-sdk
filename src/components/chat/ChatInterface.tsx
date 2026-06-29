'use client';

/**
 * ChatInterface Component
 *
 * Complete chat UI with message list and input.
 *
 * @example
 * ```tsx
 * function ChatPage() {
 *   const { messages, query, isStreaming, clearMessages } = useAgent('data-science');
 *
 *   return (
 *     <ChatInterface
 *       messages={messages}
 *       isStreaming={isStreaming}
 *       onSend={query}
 *       onClear={clearMessages}
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { MessageList } from './MessageList';
import type { ChatMessage, DataSourceBadgeInfo } from '../../types';

export interface ChatInterfaceProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether agent is streaming a response */
  isStreaming?: boolean;
  /** Send message callback */
  onSend: (message: string) => void;
  /** Clear messages callback */
  onClear?: () => void;
  /** Cancel current query */
  onCancel?: () => void;
  /** Connected data sources to display as badges */
  dataSources?: DataSourceBadgeInfo[];
  /** Placeholder text */
  placeholder?: string;
  /** Custom className */
  className?: string;
  /** Show clear button */
  showClearButton?: boolean;
  /** Disable input */
  disabled?: boolean;
}

/**
 * Chat interface component
 */
export function ChatInterface({
  messages,
  isStreaming = false,
  onSend,
  onClear,
  onCancel,
  dataSources,
  placeholder = 'Ask a question...',
  className = '',
  showClearButton = true,
  disabled = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;

    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`flowstack-chat ${className}`}>
      <div className="flowstack-chat-messages">
        <MessageList messages={messages} isStreaming={isStreaming} />
        <div ref={messagesEndRef} />
      </div>

      {dataSources && dataSources.length > 0 && (
        <div className="flowstack-datasource-bar">
          {dataSources.map((ds) => (
            <span key={ds.source_id} className="flowstack-datasource-badge">
              <span className="flowstack-datasource-dot" />
              {ds.name}
              <span className="flowstack-datasource-type">{ds.type}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flowstack-chat-input-container">
        {showClearButton && messages.length > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flowstack-chat-clear"
            title="Clear messages"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <form onSubmit={handleSubmit} className="flowstack-chat-form">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming || disabled}
            rows={1}
            className="flowstack-chat-input"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onCancel}
              className="flowstack-chat-cancel"
              title="Cancel"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              className="flowstack-chat-send"
              title="Send"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 10L18 3L11 18L9 11L3 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </form>
      </div>

      <style>{`
        .flowstack-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #fafafa;
        }
        .flowstack-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        .flowstack-chat-input-container {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .flowstack-chat-clear {
          padding: 0.5rem;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.375rem;
          transition: color 0.15s, background 0.15s;
        }
        .flowstack-chat-clear:hover {
          color: #dc2626;
          background: #fee2e2;
        }
        .flowstack-chat-form {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
        .flowstack-chat-input {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          font-size: 0.9375rem;
          line-height: 1.5;
          max-height: 200px;
          padding: 0.25rem;
        }
        .flowstack-chat-input::placeholder {
          color: #9ca3af;
        }
        .flowstack-chat-send,
        .flowstack-chat-cancel {
          padding: 0.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-chat-send:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-chat-send:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .flowstack-chat-cancel {
          background: #ef4444;
        }
        .flowstack-chat-cancel:hover {
          background: #dc2626;
        }
        .flowstack-datasource-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          padding: 0.5rem 1rem 0;
        }
        .flowstack-datasource-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          font-size: 0.75rem;
          color: #166534;
          line-height: 1;
        }
        .flowstack-datasource-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
        }
        .flowstack-datasource-type {
          text-transform: uppercase;
          font-size: 0.625rem;
          font-weight: 600;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
