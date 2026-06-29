'use client';

/**
 * MessageList Component
 *
 * Renders a list of chat messages.
 *
 * @example
 * ```tsx
 * function Chat() {
 *   const { messages, isStreaming } = useAgent();
 *   return <MessageList messages={messages} isStreaming={isStreaming} />;
 * }
 * ```
 */

import React from 'react';
import type { ChatMessage, ToolCall, VisualizationData } from '../../types';
import { splitContentSegments } from '../../utils/mermaid-utils';
import { MermaidDiagram } from './MermaidDiagram';

export interface MessageListProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether agent is streaming */
  isStreaming?: boolean;
  /** Custom className */
  className?: string;
  /** Custom message renderer */
  renderMessage?: (message: ChatMessage) => React.ReactNode;
  /** Custom tool call renderer */
  renderToolCall?: (toolCall: ToolCall) => React.ReactNode;
  /** Custom visualization renderer */
  renderVisualization?: (viz: VisualizationData) => React.ReactNode;
}

/**
 * Message list component
 */
export function MessageList({
  messages,
  isStreaming = false,
  className = '',
  renderMessage,
  renderToolCall,
  renderVisualization,
}: MessageListProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const defaultRenderToolCall = (toolCall: ToolCall) => (
    <div key={toolCall.id} className="flowstack-message-tool">
      <div className="flowstack-tool-header">
        <span className="flowstack-tool-name">{toolCall.name}</span>
        <span className={`flowstack-tool-status ${toolCall.status}`}>
          {toolCall.status === 'running' && (
            <span className="flowstack-tool-spinner" />
          )}
          {toolCall.status}
        </span>
      </div>
      {toolCall.result !== undefined && toolCall.result !== null && (
        <pre className="flowstack-tool-result">
          {typeof toolCall.result === 'string'
            ? toolCall.result
            : JSON.stringify(toolCall.result, null, 2)}
        </pre>
      )}
    </div>
  );

  const defaultRenderVisualization = (viz: VisualizationData) => (
    <div key={viz.name} className="flowstack-message-viz">
      {viz.imageUrl ? (
        <img src={viz.imageUrl} alt={viz.name} />
      ) : viz.imageBase64 ? (
        <img
          src={`data:image/${viz.format || 'png'};base64,${viz.imageBase64}`}
          alt={viz.name}
        />
      ) : null}
      <span className="flowstack-viz-name">{viz.name}</span>
    </div>
  );

  const defaultRenderMessage = (message: ChatMessage) => (
    <div
      key={message.id}
      className={`flowstack-message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}
    >
      <div className="flowstack-message-header">
        <span className="flowstack-message-role">
          {message.role === 'user' ? 'You' : 'Assistant'}
        </span>
        <span className="flowstack-message-time">
          {formatTime(message.timestamp)}
        </span>
      </div>

      <div className="flowstack-message-content">
        {!message.content && message.isStreaming ? (
          <span className="flowstack-message-thinking">Thinking...</span>
        ) : message.isStreaming ? (
          message.content
        ) : (
          splitContentSegments(message.content ?? '').map((seg, i) =>
            seg.type === 'mermaid'
              ? <MermaidDiagram key={`m-${i}`} code={seg.content} />
              : <span key={`t-${i}`}>{seg.content}</span>
          )
        )}
      </div>

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flowstack-message-tools">
          {message.toolCalls.map(tc =>
            renderToolCall ? renderToolCall(tc) : defaultRenderToolCall(tc)
          )}
        </div>
      )}

      {message.visualizations && message.visualizations.length > 0 && (
        <div className="flowstack-message-visualizations">
          {message.visualizations.map(viz =>
            renderVisualization ? renderVisualization(viz) : defaultRenderVisualization(viz)
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flowstack-message-list ${className}`}>
      {messages.length === 0 ? (
        <div className="flowstack-message-empty">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        messages.map(message =>
          renderMessage ? renderMessage(message) : defaultRenderMessage(message)
        )
      )}

      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="flowstack-message assistant streaming">
          <div className="flowstack-message-header">
            <span className="flowstack-message-role">Assistant</span>
          </div>
          <div className="flowstack-message-content">
            <span className="flowstack-message-thinking">
              <span className="flowstack-thinking-dot" />
              <span className="flowstack-thinking-dot" />
              <span className="flowstack-thinking-dot" />
            </span>
          </div>
        </div>
      )}

      <style>{`
        .flowstack-message-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .flowstack-message-empty {
          text-align: center;
          color: #6b7280;
          padding: 2rem;
        }
        .flowstack-message {
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
        }
        .flowstack-message.user {
          align-self: flex-end;
          background: #3b82f6;
          color: white;
        }
        .flowstack-message.assistant {
          align-self: flex-start;
          background: white;
          border: 1px solid #e5e7eb;
        }
        .flowstack-message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .flowstack-message-role {
          font-weight: 600;
        }
        .flowstack-message-content {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
        }
        .flowstack-message-thinking {
          display: flex;
          gap: 0.25rem;
        }
        .flowstack-thinking-dot {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: flowstack-bounce 1.4s ease-in-out infinite both;
        }
        .flowstack-thinking-dot:nth-child(1) { animation-delay: 0s; }
        .flowstack-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .flowstack-thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes flowstack-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        .flowstack-message-tools {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .flowstack-message-tool {
          background: #f3f4f6;
          border-radius: 0.375rem;
          padding: 0.5rem;
          font-size: 0.8125rem;
        }
        .flowstack-tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .flowstack-tool-name {
          font-family: monospace;
          font-weight: 500;
        }
        .flowstack-tool-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .flowstack-tool-status.complete {
          color: #059669;
        }
        .flowstack-tool-status.error {
          color: #dc2626;
        }
        .flowstack-tool-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: flowstack-spin 0.8s linear infinite;
        }
        @keyframes flowstack-spin {
          to { transform: rotate(360deg); }
        }
        .flowstack-tool-result {
          margin: 0.5rem 0 0;
          padding: 0.5rem;
          background: #1f2937;
          color: #e5e7eb;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          overflow-x: auto;
          max-height: 150px;
        }
        .flowstack-message-visualizations {
          margin-top: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .flowstack-message-viz {
          display: flex;
          flex-direction: column;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        .flowstack-message-viz img {
          max-width: 300px;
          max-height: 200px;
          object-fit: contain;
        }
        .flowstack-viz-name {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}
