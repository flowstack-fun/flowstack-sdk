# Flowstack SDK API Reference

Complete API documentation for the Flowstack SDK.

## Table of Contents

- [Provider](#provider)
- [Hooks](#hooks)
- [Components](#components)
- [Types](#types)
- [Error Handling](#error-handling)
- [Mock Mode](#mock-mode)

---

## Provider

### FlowstackProvider

Wrap your app with this provider to enable all SDK features.

```tsx
import { FlowstackProvider } from '@flowstack/sdk';

const config = {
  jwtSecret: process.env.JWT_SECRET!,
  passwordSecret: process.env.PASSWORD_SECRET!,
  tenantId: 't_your_tenant_id',
  mode: 'production', // or 'development' or 'mock'
};

function App() {
  return (
    <FlowstackProvider config={config}>
      <YourApp />
    </FlowstackProvider>
  );
}
```

#### Config Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `jwtSecret` | `string` | Yes | JWT secret for token verification |
| `passwordSecret` | `string` | Yes | Secret for password hashing |
| `baseUrl` | `string` | No | API base URL (default: Flowstack API) |
| `tenantId` | `string` | No | Tenant ID for user isolation |
| `mode` | `'production' \| 'development' \| 'mock'` | No | SDK mode (default: production) |
| `storage` | `'local' \| 'session'` | No | Credential storage strategy |
| `auth` | `AuthConfig` | No | Auth provider configuration |

---

## Hooks

### useAuth

Authentication and user management.

```tsx
import { useAuth } from '@flowstack/sdk';

function LoginPage() {
  const {
    user,           // User | null - current user
    credentials,    // FlowstackCredentials | null - raw credentials
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    googleSignIn,
    logout,
    refreshToken,
  } = useAuth();

  const handleLogin = async () => {
    const success = await login(email, password);
    if (success) router.push('/dashboard');
  };
}
```

### useWorkspace

Workspace management.

```tsx
import { useWorkspace } from '@flowstack/sdk';

function WorkspaceManager() {
  const {
    workspaces,        // WorkspaceInfo[]
    selectedWorkspace, // WorkspaceInfo | null
    isLoading,
    error,
    createWorkspace,
    selectWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const handleCreate = async () => {
    const ws = await createWorkspace('New Project', 'Description');
    if (ws) selectWorkspace(ws);
  };
}
```

### useDatasets

Dataset operations.

```tsx
import { useDatasets } from '@flowstack/sdk';

function DataManager() {
  const {
    datasets,       // DatasetInfo[]
    isLoading,
    error,
    uploadDataset,
    downloadDataset,
    deleteDataset,
    refreshDatasets,
  } = useDatasets();

  const handleUpload = async (file: File) => {
    const dataset = await uploadDataset(file, 'my-dataset');
  };
}
```

### useAgent

AI agent queries with streaming.

```tsx
import { useAgent } from '@flowstack/sdk';

function Chat() {
  const {
    messages,     // ChatMessage[]
    isStreaming,
    isLoading,
    toolCalls,    // ToolCall[]
    error,
    query,
    clearMessages,
    cancelQuery,
  } = useAgent();

  const handleAsk = async () => {
    await query('Analyze my sales data');
  };
}
```

### useAuthGuard

Programmatic auth guard logic.

```tsx
import { useAuthGuard } from '@flowstack/sdk';

function ProtectedPage() {
  const {
    isAllowed,     // boolean
    isLoading,     // boolean
    shouldRedirect,// boolean
    redirectTo,    // string | undefined
  } = useAuthGuard({
    requireAuth: true,
    requireWorkspace: true,
    redirectTo: '/login',
  });

  useEffect(() => {
    if (shouldRedirect) router.push('/login');
  }, [shouldRedirect]);

  if (isLoading) return <Loading />;
  if (!isAllowed) return null;

  return <Content />;
}
```

### useFlowstackStatus

Backend connection monitoring.

```tsx
import { useFlowstackStatus } from '@flowstack/sdk';

function StatusIndicator() {
  const {
    status,         // 'connected' | 'disconnected' | etc.
    isConnected,
    latency,        // number | null (ms)
    error,
    checkConnection,
  } = useFlowstackStatus({
    pollInterval: 30000, // 30 seconds
    autoPoll: true,
  });

  return <span>{isConnected ? 'Online' : 'Offline'}</span>;
}
```

---

## Components

### Page Components

#### AuthPage

Complete authentication page with login/register tabs.

```tsx
import { AuthPage } from '@flowstack/sdk';

function LoginPage() {
  return (
    <AuthPage
      defaultTab="login"
      onSuccess={() => router.push('/dashboard')}
      logo={<Logo />}
      showGoogle
    />
  );
}
```

#### DashboardLayout

Responsive dashboard layout.

```tsx
import { DashboardLayout } from '@flowstack/sdk';

function Dashboard() {
  return (
    <DashboardLayout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <Content />
    </DashboardLayout>
  );
}
```

#### ChatPage

Full-featured chat interface.

```tsx
import { ChatPage } from '@flowstack/sdk';

function AIChat() {
  return (
    <ChatPage
      title="AI Assistant"
      placeholder="Ask anything..."
      welcomeMessage={<WelcomeMessage />}
    />
  );
}
```

### Form Components

#### LoginForm / RegisterForm

```tsx
import { LoginForm, RegisterForm } from '@flowstack/sdk';

// Simple usage
<LoginForm onSuccess={() => router.push('/')} />

// With customization
<LoginForm
  onSuccess={handleSuccess}
  onError={handleError}
  showRegisterLink
  labels={{ title: 'Sign In', submit: 'Continue' }}
/>
```

#### AuthGuard

Protect routes from unauthenticated access.

```tsx
import { AuthGuard } from '@flowstack/sdk';

<AuthGuard
  fallback={<LoginPage />}
  requireWorkspace
>
  <ProtectedContent />
</AuthGuard>
```

---

## Error Handling

### FlowstackError

Structured errors with codes and recovery actions.

```tsx
import { FlowstackError, ErrorCodes, isFlowstackError } from '@flowstack/sdk';

try {
  await someOperation();
} catch (error) {
  if (isFlowstackError(error)) {
    console.log(error.code);         // 'AUTHENTICATION_FAILED'
    console.log(error.userMessage);  // 'Authentication failed'
    console.log(error.recoveryAction); // 'Log in again to continue'

    if (error.code === ErrorCodes.ACCOUNT_NOT_ACTIVE) {
      showActivationPrompt();
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NETWORK_ERROR` | Unable to connect to server |
| `AUTHENTICATION_FAILED` | Login failed |
| `ACCOUNT_NOT_ACTIVE` | Account needs activation |
| `WORKSPACE_NOT_FOUND` | Workspace doesn't exist |
| `RATE_LIMITED` | Too many requests |
| `CONFIG_INVALID` | Invalid SDK configuration |

---

## Mock Mode

Develop and test without a backend. When `mode: 'mock'` is enabled, **all hooks return mock data without making API calls**.

```tsx
import { FlowstackProvider } from '@flowstack/sdk';

// Enable mock mode - all hooks now use mock data
<FlowstackProvider config={{ ...config, mode: 'mock' }}>
  <App />
</FlowstackProvider>
```

### What Works in Mock Mode

| Hook | Behavior in Mock Mode |
|------|----------------------|
| `useAuth` | `login()` and `register()` succeed with mock credentials |
| `useWorkspace` | Returns 3 mock workspaces, `createWorkspace()` adds to local state |
| `useDatasets` | Returns 3 mock datasets, upload/delete simulate success |
| `useAgent` | Returns contextual mock responses with simulated streaming |

### Example Usage

```tsx
function App() {
  const { login } = useAuth();
  const { workspaces } = useWorkspace();

  // In mock mode, this succeeds without any API call
  const handleLogin = async () => {
    const success = await login('demo@example.com', 'password');
    console.log(success); // true
  };

  // Workspaces are automatically populated with mock data
  console.log(workspaces); // [{ name: 'Demo Workspace', ... }, ...]
}
```

### Mock AI Agent Responses

The `useAgent` hook provides contextual responses based on your query:

```tsx
const { query, messages } = useAgent();

// Queries about "customers" or "revenue" return analytics-style responses
await query('Show me top customers by revenue');

// Queries about "analysis" return statistical summaries
await query('Analyze my sales data');

// Other queries return explanatory mock responses
await query('Hello');
```

### Available Fixtures

For direct access to mock data:

```tsx
import {
  mockCredentials,  // Mock user credentials
  mockUser,         // Mock user object
  mockWorkspaces,   // 3 sample workspaces
  mockDatasets,     // 3 sample datasets with schema
  mockVisualizations,
  mockDataSources,
  mockChatHistory,
  generateMockId,   // Helper to generate IDs
  mockDelay,        // Simulate network latency
} from '@flowstack/sdk';
```

---

## Configuration Validation

Validate config on startup:

```tsx
import { validateConfig, validateConfigOrThrow } from '@flowstack/sdk';

// Get validation result
const result = validateConfig(config);
if (!result.valid) {
  console.error('Errors:', result.errors);
}
result.warnings.forEach(w => console.warn(w));

// Or throw on invalid
validateConfigOrThrow(config); // Throws FlowstackError if invalid
```
