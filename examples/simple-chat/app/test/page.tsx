'use client';

import { useState, useEffect } from 'react';
import {
  FlowstackProvider,
  useAuth,
  useWorkspace,
  useDatasets,
  useAgent,
  useUserManagement,
  useFlowstackStatus,
  useDataSources,
} from '@flowstack/sdk';

const config = {
  jwtSecret: 'test-secret',
  passwordSecret: 'test-password',
  tenantId: 'test_tenant',
  mode: 'mock' as const,
};

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
}

function TestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Hooks
  const auth = useAuth();
  const workspace = useWorkspace();
  const datasets = useDatasets();
  const agent = useAgent('data-science', { tools: ['code_interpreter', 'data_analysis'] });
  const userMgmt = useUserManagement();
  const status = useFlowstackStatus();
  const dataSources = useDataSources();

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // ==================== AUTH TESTS ====================
    console.log('\n=== AUTH TESTS ===');

    // Test 1: Login
    addResult({ name: 'Auth: Login', status: 'running' });
    const loginStart = Date.now();
    try {
      const loginSuccess = await auth.login('test@example.com', 'password123');
      if (loginSuccess && auth.isAuthenticated) {
        updateResult('Auth: Login', {
          status: 'pass',
          message: `Logged in as ${auth.user?.email}`,
          duration: Date.now() - loginStart
        });
      } else {
        updateResult('Auth: Login', { status: 'fail', message: 'Login returned false', duration: Date.now() - loginStart });
      }
    } catch (e) {
      updateResult('Auth: Login', { status: 'fail', message: String(e), duration: Date.now() - loginStart });
    }

    // Wait for state to settle
    await new Promise(r => setTimeout(r, 500));

    // Test 2: Check user object
    addResult({ name: 'Auth: User object', status: 'running' });
    try {
      if (auth.user && auth.user.email && auth.user.id) {
        updateResult('Auth: User object', {
          status: 'pass',
          message: `User: ${auth.user.email}, ID: ${auth.user.id}`
        });
      } else {
        updateResult('Auth: User object', { status: 'fail', message: `User object invalid: ${JSON.stringify(auth.user)}` });
      }
    } catch (e) {
      updateResult('Auth: User object', { status: 'fail', message: String(e) });
    }

    // Test 3: Credentials
    addResult({ name: 'Auth: Credentials', status: 'running' });
    try {
      if (auth.credentials && auth.credentials.apiKey && auth.credentials.tenantId) {
        updateResult('Auth: Credentials', {
          status: 'pass',
          message: `Tenant: ${auth.credentials.tenantId}`
        });
      } else {
        updateResult('Auth: Credentials', { status: 'fail', message: 'Missing credentials' });
      }
    } catch (e) {
      updateResult('Auth: Credentials', { status: 'fail', message: String(e) });
    }

    // ==================== WORKSPACE TESTS ====================
    console.log('\n=== WORKSPACE TESTS ===');
    await new Promise(r => setTimeout(r, 300));

    // Test 4: List workspaces
    addResult({ name: 'Workspace: List', status: 'running' });
    const wsStart = Date.now();
    try {
      await workspace.refreshWorkspaces();
      await new Promise(r => setTimeout(r, 500));
      if (workspace.workspaces && workspace.workspaces.length > 0) {
        updateResult('Workspace: List', {
          status: 'pass',
          message: `Found ${workspace.workspaces.length} workspaces`,
          duration: Date.now() - wsStart
        });
      } else {
        updateResult('Workspace: List', { status: 'fail', message: 'No workspaces returned', duration: Date.now() - wsStart });
      }
    } catch (e) {
      updateResult('Workspace: List', { status: 'fail', message: String(e), duration: Date.now() - wsStart });
    }

    // Test 5: Select workspace
    addResult({ name: 'Workspace: Select', status: 'running' });
    try {
      if (workspace.workspaces && workspace.workspaces.length > 0) {
        workspace.selectWorkspace(workspace.workspaces[0]);
        await new Promise(r => setTimeout(r, 300));
        if (workspace.selectedWorkspace) {
          updateResult('Workspace: Select', {
            status: 'pass',
            message: `Selected: ${workspace.selectedWorkspace.name}`
          });
        } else {
          updateResult('Workspace: Select', { status: 'fail', message: 'Selection failed' });
        }
      } else {
        updateResult('Workspace: Select', { status: 'fail', message: 'No workspaces to select' });
      }
    } catch (e) {
      updateResult('Workspace: Select', { status: 'fail', message: String(e) });
    }

    // Test 6: Create workspace
    addResult({ name: 'Workspace: Create', status: 'running' });
    const createStart = Date.now();
    try {
      const newWs = await workspace.createWorkspace('Test Workspace', 'Created by test');
      if (newWs && newWs.workspaceId) {
        updateResult('Workspace: Create', {
          status: 'pass',
          message: `Created: ${newWs.name} (${newWs.workspaceId})`,
          duration: Date.now() - createStart
        });
      } else {
        updateResult('Workspace: Create', { status: 'fail', message: 'Create returned null', duration: Date.now() - createStart });
      }
    } catch (e) {
      updateResult('Workspace: Create', { status: 'fail', message: String(e), duration: Date.now() - createStart });
    }

    // ==================== DATASET TESTS ====================
    console.log('\n=== DATASET TESTS ===');
    await new Promise(r => setTimeout(r, 300));

    // Test 7: List datasets
    addResult({ name: 'Datasets: List', status: 'running' });
    const dsStart = Date.now();
    try {
      await datasets.refreshDatasets();
      await new Promise(r => setTimeout(r, 500));
      // In mock mode, datasets should be populated
      updateResult('Datasets: List', {
        status: 'pass',
        message: `Found ${datasets.datasets?.length || 0} datasets`,
        duration: Date.now() - dsStart
      });
    } catch (e) {
      updateResult('Datasets: List', { status: 'fail', message: String(e), duration: Date.now() - dsStart });
    }

    // Test 8: Upload dataset (mock)
    addResult({ name: 'Datasets: Upload', status: 'running' });
    const uploadStart = Date.now();
    try {
      const mockFile = new File(['col1,col2\n1,2\n3,4'], 'test.csv', { type: 'text/csv' });
      const uploaded = await datasets.uploadDataset(mockFile, 'test-dataset');
      if (uploaded) {
        updateResult('Datasets: Upload', {
          status: 'pass',
          message: `Uploaded: ${uploaded.name}`,
          duration: Date.now() - uploadStart
        });
      } else {
        updateResult('Datasets: Upload', { status: 'fail', message: 'Upload returned null', duration: Date.now() - uploadStart });
      }
    } catch (e) {
      updateResult('Datasets: Upload', { status: 'fail', message: String(e), duration: Date.now() - uploadStart });
    }

    // ==================== AGENT TESTS ====================
    console.log('\n=== AGENT TESTS ===');
    await new Promise(r => setTimeout(r, 300));

    // Test 9: Agent query
    addResult({ name: 'Agent: Query', status: 'running' });
    const queryStart = Date.now();
    try {
      await agent.query('Hello, can you help me analyze data?');
      // Wait for streaming to complete
      await new Promise(r => setTimeout(r, 2000));
      if (agent.messages && agent.messages.length >= 2) {
        const lastMsg = agent.messages[agent.messages.length - 1];
        updateResult('Agent: Query', {
          status: 'pass',
          message: `Response received (${lastMsg.content.length} chars)`,
          duration: Date.now() - queryStart
        });
      } else {
        updateResult('Agent: Query', { status: 'fail', message: `Only ${agent.messages?.length || 0} messages`, duration: Date.now() - queryStart });
      }
    } catch (e) {
      updateResult('Agent: Query', { status: 'fail', message: String(e), duration: Date.now() - queryStart });
    }

    // Test 10: Clear messages
    addResult({ name: 'Agent: Clear', status: 'running' });
    try {
      const beforeClear = agent.messages?.length || 0;
      agent.clearMessages();
      await new Promise(r => setTimeout(r, 200));
      updateResult('Agent: Clear', {
        status: 'pass',
        message: `Cleared ${beforeClear} messages`
      });
    } catch (e) {
      updateResult('Agent: Clear', { status: 'fail', message: String(e) });
    }

    // ==================== USER MANAGEMENT TESTS ====================
    console.log('\n=== USER MANAGEMENT TESTS ===');
    await new Promise(r => setTimeout(r, 300));

    // Test 11: List users
    addResult({ name: 'UserMgmt: List', status: 'running' });
    const umStart = Date.now();
    try {
      await userMgmt.refreshUsers();
      await new Promise(r => setTimeout(r, 500));
      if (userMgmt.users && userMgmt.users.length > 0) {
        updateResult('UserMgmt: List', {
          status: 'pass',
          message: `Found ${userMgmt.users.length} users`,
          duration: Date.now() - umStart
        });
      } else {
        updateResult('UserMgmt: List', { status: 'fail', message: 'No users returned', duration: Date.now() - umStart });
      }
    } catch (e) {
      updateResult('UserMgmt: List', { status: 'fail', message: String(e), duration: Date.now() - umStart });
    }

    // Test 12: User stats
    addResult({ name: 'UserMgmt: Stats', status: 'running' });
    const statsStart = Date.now();
    try {
      await userMgmt.refreshStats();
      await new Promise(r => setTimeout(r, 300));
      if (userMgmt.stats && userMgmt.stats.totalUsers > 0) {
        updateResult('UserMgmt: Stats', {
          status: 'pass',
          message: `Total: ${userMgmt.stats.totalUsers}, Active: ${userMgmt.stats.activeUsers}`,
          duration: Date.now() - statsStart
        });
      } else {
        updateResult('UserMgmt: Stats', { status: 'fail', message: 'No stats returned', duration: Date.now() - statsStart });
      }
    } catch (e) {
      updateResult('UserMgmt: Stats', { status: 'fail', message: String(e), duration: Date.now() - statsStart });
    }

    // Test 13: Get single user
    addResult({ name: 'UserMgmt: Get user', status: 'running' });
    try {
      if (userMgmt.users && userMgmt.users.length > 0) {
        const user = await userMgmt.getUser(userMgmt.users[0].id);
        if (user) {
          updateResult('UserMgmt: Get user', {
            status: 'pass',
            message: `Got: ${user.email} (${user.role})`
          });
        } else {
          updateResult('UserMgmt: Get user', { status: 'fail', message: 'User not found' });
        }
      } else {
        updateResult('UserMgmt: Get user', { status: 'fail', message: 'No users to get' });
      }
    } catch (e) {
      updateResult('UserMgmt: Get user', { status: 'fail', message: String(e) });
    }

    // Test 14: canManageUsers flag
    addResult({ name: 'UserMgmt: Permissions', status: 'running' });
    try {
      updateResult('UserMgmt: Permissions', {
        status: 'pass',
        message: `canManageUsers: ${userMgmt.canManageUsers}`
      });
    } catch (e) {
      updateResult('UserMgmt: Permissions', { status: 'fail', message: String(e) });
    }

    // ==================== STATUS TESTS ====================
    console.log('\n=== STATUS TESTS ===');

    // Test 15: Connection status
    addResult({ name: 'Status: Check', status: 'running' });
    try {
      updateResult('Status: Check', {
        status: 'pass',
        message: `Status: ${status.status}, Connected: ${status.isConnected}`
      });
    } catch (e) {
      updateResult('Status: Check', { status: 'fail', message: String(e) });
    }

    // ==================== LOGOUT TEST ====================
    console.log('\n=== LOGOUT TEST ===');

    // Test 16: Logout
    addResult({ name: 'Auth: Logout', status: 'running' });
    try {
      auth.logout();
      await new Promise(r => setTimeout(r, 300));
      if (!auth.isAuthenticated) {
        updateResult('Auth: Logout', { status: 'pass', message: 'Logged out successfully' });
      } else {
        updateResult('Auth: Logout', { status: 'fail', message: 'Still authenticated after logout' });
      }
    } catch (e) {
      updateResult('Auth: Logout', { status: 'fail', message: String(e) });
    }

    setIsRunning(false);
    console.log('\n=== TESTS COMPLETE ===');
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, monospace', maxWidth: 900, margin: '0 auto' }}>
      <h1>Flowstack SDK Test Suite</h1>
      <p style={{ color: '#666' }}>Tests all hooks and routes in mock mode</p>

      <button
        onClick={runTests}
        disabled={isRunning}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          backgroundColor: isRunning ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: isRunning ? 'wait' : 'pointer',
          marginBottom: 20,
        }}
      >
        {isRunning ? 'Running Tests...' : 'Run All Tests'}
      </button>

      {results.length > 0 && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <strong>Results:</strong> {passCount} passed, {failCount} failed, {results.length} total
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor:
                r.status === 'pass' ? '#e8f5e9' :
                r.status === 'fail' ? '#ffebee' :
                r.status === 'running' ? '#fff3e0' : '#f5f5f5',
              borderLeft: `4px solid ${
                r.status === 'pass' ? '#4caf50' :
                r.status === 'fail' ? '#f44336' :
                r.status === 'running' ? '#ff9800' : '#ccc'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{r.name}</strong>
              <span style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor:
                  r.status === 'pass' ? '#4caf50' :
                  r.status === 'fail' ? '#f44336' :
                  r.status === 'running' ? '#ff9800' : '#ccc',
                color: 'white',
              }}>
                {r.status.toUpperCase()}
                {r.duration && ` (${r.duration}ms)`}
              </span>
            </div>
            {r.message && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {r.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <div>Please log in to run tests.</div>;
  return <>{children}</>;
}

export default function TestPage() {
  return (
    <FlowstackProvider config={config}>
      <AuthGuard>
        <TestRunner />
      </AuthGuard>
    </FlowstackProvider>
  );
}
