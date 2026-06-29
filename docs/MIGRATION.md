# Flowstack SDK Migration Guide

## Upgrading to v2.0

This guide covers breaking changes and migration steps for upgrading to Flowstack SDK v2.0.

---

## Breaking Changes

### 1. Error Handling

**Before (v1.x):**
```tsx
const { error } = useAuth();
// error is string | null

if (error) {
  console.log(error); // "Login failed"
}
```

**After (v2.0):**
```tsx
import { isFlowstackError, ErrorCodes } from '@flowstack/sdk';

const { error } = useAuth();
// error is FlowstackError | null

if (error) {
  console.log(error.code);           // 'AUTHENTICATION_FAILED'
  console.log(error.message);        // Technical message
  console.log(error.userMessage);    // User-friendly message
  console.log(error.recoveryAction); // Suggested action

  if (error.code === ErrorCodes.ACCOUNT_NOT_ACTIVE) {
    showActivationPrompt();
  }
}
```

**Migration Steps:**
1. Update error handling to use `FlowstackError` properties
2. Replace string comparisons with `ErrorCodes` constants
3. Use `isFlowstackError()` for type narrowing

---

### 2. Configuration Validation

**Before (v1.x):**
```tsx
// Missing config silently failed at runtime
<FlowstackProvider config={{}}> // No error until API call
```

**After (v2.0):**
```tsx
// Config is validated on mount - throws FlowstackError if invalid
<FlowstackProvider config={{
  jwtSecret: process.env.JWT_SECRET!, // Required
  passwordSecret: process.env.PASSWORD_SECRET!, // Required
}}>
```

**Migration Steps:**
1. Ensure `jwtSecret` and `passwordSecret` are provided
2. Add validation before rendering:
   ```tsx
   import { validateConfig } from '@flowstack/sdk';

   const result = validateConfig(config);
   if (!result.valid) {
     console.error('Config errors:', result.errors);
   }
   ```

---

### 3. User Type in useAuth

**Before (v1.x):**
```tsx
const { credentials } = useAuth();

const userId = credentials?.userId;
const email = credentials?.email;
```

**After (v2.0):**
```tsx
const { user, credentials } = useAuth();

// Preferred - use the new user object
const userId = user?.id;
const email = user?.email;

// Still works - credentials is maintained for backward compatibility
const legacyUserId = credentials?.userId;
```

**Migration Steps:**
1. Replace `credentials.userId` with `user.id`
2. Replace `credentials.email` with `user.email`
3. Use `user` for new code, `credentials` only if you need raw token data

---

## New Features in v2.0

### Mock Mode

Develop without a live backend:

```tsx
<FlowstackProvider config={{ ...config, mode: 'mock' }}>
  <App />
</FlowstackProvider>
```

### Auth Guard Hook

Programmatic route protection:

```tsx
import { useAuthGuard } from '@flowstack/sdk';

function ProtectedPage() {
  const { isAllowed, isLoading, shouldRedirect } = useAuthGuard({
    requireAuth: true,
    redirectTo: '/login',
  });

  if (isLoading) return <Loading />;
  if (shouldRedirect) router.push('/login');
  if (!isAllowed) return null;

  return <Content />;
}
```

### Connection Status

Monitor backend connectivity:

```tsx
import { useFlowstackStatus } from '@flowstack/sdk';

function StatusIndicator() {
  const { isConnected, latency } = useFlowstackStatus();

  return <span>{isConnected ? `Online (${latency}ms)` : 'Offline'}</span>;
}
```

### Page Components

Pre-built page templates:

```tsx
import { AuthPage, DashboardLayout, ChatPage } from '@flowstack/sdk';

// Complete auth page
<AuthPage onSuccess={() => router.push('/dashboard')} />

// Dashboard layout
<DashboardLayout sidebar={<Sidebar />}>
  <Content />
</DashboardLayout>

// Chat interface
<ChatPage title="AI Assistant" />
```

---

## Type Changes

### FlowstackConfig

```diff
interface FlowstackConfig {
  jwtSecret: string;
  passwordSecret: string;
  baseUrl?: string;
  tenantId?: string;
+ mode?: 'production' | 'development' | 'mock';
  storage?: 'local' | 'session';
  auth?: AuthConfig;
}
```

### UseAuthReturn

```diff
interface UseAuthReturn {
+ user: User | null;
  credentials: FlowstackCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
- error: string | null;
+ error: FlowstackError | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  googleSignIn: (credential: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}
```

### New User Type

```typescript
interface User {
  id: string;
  email: string;
  tenantId: string;
  expiresAt?: string;
}
```

---

## Checklist

- [ ] Update error handling to use `FlowstackError`
- [ ] Ensure required config values are provided
- [ ] Replace `credentials` access with `user` where appropriate
- [ ] Consider using `mode: 'mock'` for local development
- [ ] Use new `useAuthGuard` for route protection
- [ ] Use new `useFlowstackStatus` for connection monitoring
- [ ] Consider adopting page components for faster development
