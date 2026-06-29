# Flowstack SDK Troubleshooting Guide

Common issues and their solutions.

---

## Configuration Errors

### "Missing required: jwtSecret"

**Cause:** The `jwtSecret` config option is not provided.

**Solution:**
```tsx
<FlowstackProvider config={{
  jwtSecret: process.env.JWT_SECRET!,
  passwordSecret: process.env.PASSWORD_SECRET!,
}}>
```

Ensure your environment variables are set:
```bash
# .env.local
JWT_SECRET=your-secret-key-here
PASSWORD_SECRET=your-password-secret-here
```

### "Missing required: passwordSecret"

**Cause:** The `passwordSecret` config option is not provided.

**Solution:** Same as above - add `passwordSecret` to your config.

---

## Authentication Errors

### AUTHENTICATION_FAILED

**Error Code:** `ErrorCodes.AUTHENTICATION_FAILED`

**Causes:**
- Invalid email or password
- User doesn't exist
- Network issues

**Solution:**
```tsx
const { error, login } = useAuth();

const handleLogin = async () => {
  const success = await login(email, password);
  if (!success && error) {
    if (error.code === ErrorCodes.AUTHENTICATION_FAILED) {
      showToast('Invalid email or password');
    }
  }
};
```

### ACCOUNT_NOT_ACTIVE

**Error Code:** `ErrorCodes.ACCOUNT_NOT_ACTIVE`

**Cause:** Account exists but hasn't been activated.

**Solution:**
```tsx
if (error?.code === ErrorCodes.ACCOUNT_NOT_ACTIVE) {
  // Show activation prompt
  showActivationDialog();
  // Or resend activation email
  await resendActivationEmail(email);
}
```

### Token Expired

**Symptom:** API calls fail after some time.

**Solution:**
```tsx
const { refreshToken, logout } = useAuth();

// Try refreshing the token
const success = await refreshToken();
if (!success) {
  logout(); // Force re-login
}
```

---

## Network Errors

### NETWORK_ERROR

**Error Code:** `ErrorCodes.NETWORK_ERROR`

**Causes:**
- No internet connection
- API server unreachable
- CORS issues

**Solution:**
```tsx
import { useFlowstackStatus } from '@flowstack/sdk';

function App() {
  const { isConnected, error } = useFlowstackStatus();

  if (!isConnected) {
    return <OfflineMessage />;
  }

  return <MainApp />;
}
```

### CORS Errors

**Symptom:** Browser console shows CORS errors.

**Cause:** API server not configured for your origin.

**Solution:**
1. Check your `baseUrl` configuration
2. Ensure the API server allows your origin
3. For development, use `mode: 'mock'`:
   ```tsx
   <FlowstackProvider config={{ ...config, mode: 'mock' }}>
   ```

---

## Workspace Errors

### WORKSPACE_NOT_FOUND

**Error Code:** `ErrorCodes.WORKSPACE_NOT_FOUND`

**Cause:** Trying to access a workspace that doesn't exist or was deleted.

**Solution:**
```tsx
const { workspaces, selectWorkspace, refreshWorkspaces } = useWorkspace();

// Refresh workspaces list
await refreshWorkspaces();

// Check if workspace still exists
const exists = workspaces.some(ws => ws.id === targetWorkspaceId);
if (!exists) {
  // Workspace was deleted, select another
  if (workspaces.length > 0) {
    selectWorkspace(workspaces[0]);
  }
}
```

---

## Dataset Errors

### DATASET_UPLOAD_FAILED

**Error Code:** `ErrorCodes.DATASET_UPLOAD_FAILED`

**Causes:**
- File too large
- Invalid file format
- Network timeout

**Solution:**
```tsx
const { uploadDataset, error } = useDatasets();

const handleUpload = async (file: File) => {
  // Check file size before upload
  if (file.size > 100 * 1024 * 1024) {
    showToast('File too large. Maximum size is 100MB');
    return;
  }

  const result = await uploadDataset(file);
  if (!result && error) {
    if (error.isRetryable()) {
      // Retry the upload
      await uploadDataset(file);
    }
  }
};
```

---

## TypeScript Errors

### "Cannot find module '@flowstack/sdk'"

**Cause:** Types not generated or package not installed correctly.

**Solution:**
```bash
# Reinstall the package
npm uninstall @flowstack/sdk
npm install @flowstack/sdk

# Or rebuild if using local link
cd flowstack-sdk
npm run build
```

### "Property 'user' does not exist on type 'UseAuthReturn'"

**Cause:** Using outdated type definitions.

**Solution:**
1. Update to the latest SDK version
2. Restart your TypeScript server in your IDE
3. Check your `node_modules/@flowstack/sdk/dist/index.d.ts` exists

---

## React Errors

### "useFlowstack must be used within a FlowstackProvider"

**Cause:** Using a hook outside the provider context.

**Solution:**
```tsx
// Ensure provider wraps your app
function App() {
  return (
    <FlowstackProvider config={config}>
      <YourApp /> {/* Hooks work here */}
    </FlowstackProvider>
  );
}
```

### "Cannot update state on unmounted component"

**Cause:** Async operation completing after component unmounts.

**Solution:**
```tsx
function MyComponent() {
  const { query, cancelQuery } = useAgent();

  useEffect(() => {
    return () => {
      cancelQuery(); // Cancel on unmount
    };
  }, []);

  // ...
}
```

---

## Mock Mode Issues

### Mock mode not working

**Symptom:** Still hitting real API in mock mode.

**Solution:**
1. Verify config is set correctly:
   ```tsx
   <FlowstackProvider config={{ ...config, mode: 'mock' }}>
   ```

2. Check for env variable overrides:
   ```tsx
   const config = {
     mode: process.env.NODE_ENV === 'development' ? 'mock' : 'production',
   };
   ```

---

## Streaming Issues

### Messages not appearing during streaming

**Cause:** Not handling streaming state correctly.

**Solution:**
```tsx
const { messages, isStreaming } = useAgent();

return (
  <div>
    {messages.map(msg => <Message key={msg.id} {...msg} />)}
    {isStreaming && <TypingIndicator />}
  </div>
);
```

### Stream cuts off early

**Cause:** Network timeout or server disconnection.

**Solution:**
```tsx
const { error, query } = useAgent();

// Retry on network errors
if (error?.code === ErrorCodes.NETWORK_ERROR && error.isRetryable()) {
  await query(lastMessage);
}
```

---

## Performance Issues

### Slow initial load

**Cause:** Large bundle or unnecessary re-renders.

**Solution:**
1. Use dynamic imports for page components:
   ```tsx
   const ChatPage = dynamic(() => import('@flowstack/sdk').then(m => m.ChatPage));
   ```

2. Memoize expensive computations:
   ```tsx
   const sortedDatasets = useMemo(() =>
     datasets.sort((a, b) => b.updatedAt - a.updatedAt),
     [datasets]
   );
   ```

---

## Getting Help

If you can't resolve an issue:

1. **Check error details:**
   ```tsx
   if (isFlowstackError(error)) {
     console.log({
       code: error.code,
       message: error.message,
       userMessage: error.userMessage,
       recoveryAction: error.recoveryAction,
       details: error.details,
     });
   }
   ```

2. **Enable development mode:**
   ```tsx
   <FlowstackProvider config={{ ...config, mode: 'development' }}>
   ```

3. **Report issues:** https://github.com/flowstack/sdk/issues
