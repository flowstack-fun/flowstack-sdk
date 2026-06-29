'use client';

/**
 * ChatPage Component
 *
 * A complete chat interface page with message history and streaming support.
 *
 * @example
 * ```tsx
 * function AIChat() {
 *   return (
 *     <ChatPage
 *       title="AI Assistant"
 *       placeholder="Ask me anything..."
 *     />
 *   );
 * }
 * ```
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { ChatInterface, MessageList } from '../chat';

export interface ChatPageProps {
  /** Page title */
  title?: string;
  /** Chat input placeholder */
  placeholder?: string;
  /** Welcome message when no messages */
  welcomeMessage?: ReactNode;
  /** Header content */
  header?: ReactNode;
  /** Sidebar content */
  sidebar?: ReactNode;
  /** Show clear button */
  showClearButton?: boolean;
  /** Show cancel button during streaming */
  showCancelButton?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Callback when a message is sent */
  onMessageSent?: (message: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Complete chat page component
 */
export function ChatPage({
  title = 'AI Chat',
  placeholder = 'Type your message...',
  welcomeMessage,
  header,
  sidebar,
  showClearButton = true,
  showCancelButton = true,
  className = '',
  onMessageSent,
  onError,
}: ChatPageProps) {
  const {
    messages,
    isStreaming,
    isLoading,
    error,
    query,
    clearMessages,
    cancelQuery,
  } = useAgent('data-science', { tools: ['code_interpreter', 'data_analysis', 'visualization'] });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleSend = async (message: string) => {
    if (onMessageSent) {
      onMessageSent(message);
    }
    await query(message);
  };

  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <div className={`flowstack-chat-page ${className}`}>
      {/* Sidebar */}
      {sidebar && <aside className="flowstack-chat-sidebar">{sidebar}</aside>}

      {/* Main chat area */}
      <div className="flowstack-chat-main">
        {/* Header */}
        <div className="flowstack-chat-header">
          {header || <h1 className="flowstack-chat-title">{title}</h1>}
        </div>

        {/* Messages area */}
        <div className="flowstack-chat-messages">
          {showWelcome && welcomeMessage && (
            <div className="flowstack-chat-welcome">{welcomeMessage}</div>
          )}

          {showWelcome && !welcomeMessage && (
            <div className="flowstack-chat-welcome">
              <div className="flowstack-chat-welcome-icon">AI</div>
              <h2>How can I help you today?</h2>
              <p>Ask me anything about your data or request analysis.</p>
            </div>
          )}

          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="flowstack-chat-error">
            <span className="flowstack-chat-error-icon">!</span>
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="flowstack-chat-input-area">
          <ChatInterface
            messages={messages}
            isStreaming={isStreaming}
            onSend={handleSend}
            onClear={showClearButton ? clearMessages : undefined}
            onCancel={showCancelButton ? cancelQuery : undefined}
            placeholder={placeholder}
            disabled={isLoading}
            showClearButton={showClearButton && messages.length > 0}
          />
        </div>
      </div>

      <style>{`
        .flowstack-chat-page {
          display: flex;
          height: 100dvh;
          overflow: hidden;
          background: #f8f9fa;
        }

        .flowstack-chat-sidebar {
          width: 280px;
          background: white;
          border-right: 1px solid #e5e5e5;
          flex-shrink: 0;
        }

        .flowstack-chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .flowstack-chat-header {
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e5e5e5;
        }

        .flowstack-chat-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: #1a1a1a;
        }

        .flowstack-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .flowstack-chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 24px;
          color: #666;
        }

        .flowstack-chat-welcome-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .flowstack-chat-welcome h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .flowstack-chat-welcome p {
          font-size: 16px;
          margin: 0;
          max-width: 400px;
        }

        .flowstack-chat-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 14px;
        }

        .flowstack-chat-error-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .flowstack-chat-input-area {
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e5e5e5;
        }

        @media (max-width: 768px) {
          .flowstack-chat-sidebar {
            display: none;
          }

          .flowstack-chat-messages {
            padding: 16px;
          }

          .flowstack-chat-input-area {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}
