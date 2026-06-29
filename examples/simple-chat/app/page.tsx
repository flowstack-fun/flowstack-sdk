// app/page.tsx - Complete AI Chat App from README
'use client';

import { useState } from 'react';
import {
  FlowstackProvider,
  useAuth,
  useWorkspace,
  useAgent,
} from '@flowstack/sdk';

// Configuration - use mock mode for development
const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  passwordSecret: process.env.PASSWORD_SECRET || 'dev-password',
  tenantId: 'my_app_tenant',
  mode: 'mock' as const, // Remove for production
};

// Main App Component
function ChatApp() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const { workspaces, selectedWorkspace, selectWorkspace } = useWorkspace();
  const { messages, isStreaming, query, clearMessages } = useAgent('data-science', { tools: ['code_interpreter', 'data_analysis'] });
  const [input, setInput] = useState('');

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input;
    setInput('');
    await query(message);
  };

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <h1>AI Chat</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Sign in to start chatting with your AI assistant.
        </p>
        <button
          onClick={() => login('demo@example.com', 'password')}
          disabled={authLoading}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            cursor: authLoading ? 'wait' : 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: 8,
          }}
        >
          {authLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    );
  }

  // No workspace selected - show selector
  if (!selectedWorkspace && workspaces.length > 0) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
        <h1>Select Workspace</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>Choose a workspace to continue:</p>
        {workspaces.map(ws => (
          <button
            key={ws.workspaceId}
            onClick={() => selectWorkspace(ws)}
            style={{
              display: 'block',
              width: '100%',
              margin: '8px 0',
              padding: '16px 24px',
              fontSize: 16,
              cursor: 'pointer',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 8,
              textAlign: 'left',
            }}
          >
            <strong>{ws.name}</strong>
            {ws.description && (
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                {ws.description}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Main chat interface
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          padding: 16,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <strong>{selectedWorkspace?.name || 'AI Chat'}</strong>
          <span style={{ marginLeft: 16, color: '#666', fontSize: 14 }}>{user?.email}</span>
        </div>
        <div>
          <button
            onClick={clearMessages}
            style={{
              marginRight: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 4,
            }}
          >
            Clear
          </button>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 4,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>
            Ask me anything about your data!
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
              maxWidth: '80%',
              marginLeft: msg.role === 'user' ? 'auto' : 0,
            }}
          >
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            {msg.isStreaming && <span style={{ color: '#999' }}>▋</span>}
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask a question..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            border: '1px solid #ddd',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 8,
            cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
            backgroundColor: isStreaming || !input.trim() ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
          }}
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// Wrap with provider
export default function Page() {
  return (
    <FlowstackProvider config={config}>
      <ChatApp />
    </FlowstackProvider>
  );
}
