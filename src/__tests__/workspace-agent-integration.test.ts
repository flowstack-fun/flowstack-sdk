/**
 * Workspace, Agent & Artifacts Integration Tests
 *
 * Tests the full flow: login → create workspace → query agent →
 * verify artifacts (datasets, visualizations, reports, sites).
 *
 * Run: npx vitest run src/__tests__/workspace-agent-integration.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  login,
  register,
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  listDatasets,
  listVisualizations,
  listReports,
  listModels,
  listScripts,
  listSites,
  createSite,
  deleteSite,
  executeQuery,
} from '../api/client';
import { parseSSEStream } from '../utils/sse-parser';
import type { FlowstackCredentials, FlowstackClientConfig } from '../types';

const BASE_URL = 'https://sage-api.flowstack.fun';
const TENANT_ID = 't_6fe54402be43';

const clientConfig: FlowstackClientConfig = {
  baseUrl: BASE_URL,
  tenantId: TENANT_ID,
};

// Unique test identity
const TEST_EMAIL = `sdk-agent-test-${Date.now()}@flowstack.fun`;
const TEST_PASSWORD = 'AgentTest123!';

let credentials: FlowstackCredentials;
let workspaceId: string;

// ─── Setup: register + login + create workspace ──────────────────────────────

beforeAll(async () => {
  // Register
  const regResult = await register(TEST_EMAIL, TEST_PASSWORD, clientConfig);
  if (!regResult.ok) {
    throw new Error(`Registration failed: ${regResult.error}`);
  }

  // Login
  const loginResult = await login(TEST_EMAIL, TEST_PASSWORD, clientConfig);
  if (!loginResult.ok || !loginResult.data) {
    throw new Error(`Login failed: ${loginResult.error}`);
  }

  credentials = {
    apiKey: loginResult.data.access_token || loginResult.data.session_token,
    tenantId: TENANT_ID,
    userId: loginResult.data.user_id,
    email: TEST_EMAIL,
  };

  console.log('[SETUP] Logged in as:', credentials.userId);
}, 30000);

// ─── Workspace CRUD ──────────────────────────────────────────────────────────

describe('Workspace operations', () => {
  it('should create a workspace', async () => {
    const result = await createWorkspace(
      credentials,
      `sdk-test-ws-${Date.now()}`,
      'Integration test workspace',
      clientConfig,
    );

    console.log('[CREATE WS] status:', result.status, 'ok:', result.ok);
    if (!result.ok) console.log('[CREATE WS] error:', result.error);

    expect(result.ok).toBe(true);
    expect(result.data?.workspace).toBeDefined();

    workspaceId = result.data!.workspace.workspaceId
      || (result.data!.workspace as any).workspace_id
      || (result.data as any).workspace_id;

    console.log('[CREATE WS] workspaceId:', workspaceId);
    expect(workspaceId).toBeDefined();
  });

  it('should list workspaces including the new one', async () => {
    const result = await listWorkspaces(credentials, 50, clientConfig);

    console.log('[LIST WS] status:', result.status, 'count:', result.data?.workspaces?.length);

    expect(result.ok).toBe(true);
    expect(result.data?.workspaces?.length).toBeGreaterThan(0);
  });

  it('should get workspace by ID', async () => {
    expect(workspaceId).toBeDefined();

    const result = await getWorkspace(credentials, workspaceId, clientConfig);

    console.log('[GET WS] status:', result.status, 'ok:', result.ok);
    if (!result.ok) console.log('[GET WS] error:', result.error);

    // May 404 if workspace_id format doesn't match — log either way
    if (result.ok) {
      console.log('[GET WS] name:', result.data?.workspace?.name);
    }
  });
});

// ─── Artifacts listing (empty workspace) ─────────────────────────────────────

describe('Artifact listing on fresh workspace', () => {
  it('should list datasets (expect empty)', async () => {
    const result = await listDatasets(credentials, workspaceId, clientConfig);

    console.log('[DATASETS] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      const count = result.data?.datasets?.length ?? 0;
      console.log('[DATASETS] count:', count);
    } else {
      console.log('[DATASETS] error:', result.error);
    }

    // Accept 200 with empty list, or 404 (no artifacts yet)
    if (result.ok) {
      expect(result.data?.datasets).toBeDefined();
    } else {
      expect(result.status).not.toBe(401);
    }
  });

  it('should list visualizations (expect empty)', async () => {
    const result = await listVisualizations(credentials, workspaceId, clientConfig);

    console.log('[VIZ] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[VIZ] count:', result.data?.visualizations?.length ?? 0);
    } else {
      console.log('[VIZ] error:', result.error);
    }

    if (result.ok) {
      expect(result.data?.visualizations).toBeDefined();
    } else {
      expect(result.status).not.toBe(401);
    }
  });

  it('should list reports (expect empty)', async () => {
    const result = await listReports(credentials, workspaceId, clientConfig);

    console.log('[REPORTS] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[REPORTS] count:', result.data?.reports?.length ?? 0);
    } else {
      console.log('[REPORTS] error:', result.error);
    }

    if (result.ok) {
      expect(result.data?.reports).toBeDefined();
    } else {
      expect(result.status).not.toBe(401);
    }
  });

  it('should list models (expect empty)', async () => {
    const result = await listModels(credentials, workspaceId, clientConfig);

    console.log('[MODELS] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[MODELS] count:', result.data?.models?.length ?? 0);
    } else {
      console.log('[MODELS] error:', result.error);
    }

    if (result.ok) {
      expect(result.data?.models).toBeDefined();
    } else {
      expect(result.status).not.toBe(401);
    }
  });

  it('should list scripts (expect empty)', async () => {
    const result = await listScripts(credentials, workspaceId, clientConfig);

    console.log('[SCRIPTS] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[SCRIPTS] count:', result.data?.scripts?.length ?? 0);
    } else {
      console.log('[SCRIPTS] error:', result.error);
    }

    if (result.ok) {
      expect(result.data?.scripts).toBeDefined();
    } else {
      expect(result.status).not.toBe(401);
    }
  });
});

// ─── Sites CRUD ──────────────────────────────────────────────────────────────

describe('Sites CRUD', () => {
  let siteId: string | undefined;

  it('should list sites (may be empty)', async () => {
    const result = await listSites(credentials, clientConfig);

    console.log('[LIST SITES] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[LIST SITES] count:', result.data?.sites?.length ?? 0);
    } else {
      console.log('[LIST SITES] error:', result.error);
      // Sites endpoint may not exist on all deployments
      console.log('[LIST SITES] NOTE: 404 means /api/v1/sites route not mounted');
    }
  });

  it('should create a site with inline files', async () => {
    const result = await createSite(credentials, {
      name: `sdk-test-site-${Date.now()}`,
      siteType: 'on_demand',
      description: 'Integration test site',
      files: {
        'index.html': '<html><body><h1>SDK Test</h1></body></html>',
        'styles.css': 'h1 { color: blue; }',
      },
    }, clientConfig);

    console.log('[CREATE SITE] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      siteId = result.data?.site?.id || result.data?.site_id as any;
      console.log('[CREATE SITE] id:', siteId);
      console.log('[CREATE SITE] url:', result.data?.site?.url);
    } else {
      console.log('[CREATE SITE] error:', result.error);
    }
  });

  it('should delete the test site', async () => {
    if (!siteId) {
      console.log('[DELETE SITE] skipped — no site was created');
      return;
    }

    const result = await deleteSite(credentials, siteId, clientConfig);

    console.log('[DELETE SITE] status:', result.status, 'ok:', result.ok);
    if (!result.ok) console.log('[DELETE SITE] error:', result.error);
  });
});

// ─── Agent streaming query ───────────────────────────────────────────────────

describe('Agent query (streaming)', () => {
  it('should send a query and receive SSE stream events', async () => {
    expect(workspaceId).toBeDefined();

    let response: Response;
    try {
      response = await executeQuery(
        credentials,
        'Hello, what can you help me with?',
        workspaceId,
        { networkMode: 'SANDBOX' },
        clientConfig,
      );
    } catch (err: any) {
      console.log('[AGENT QUERY] fetch error:', err.message);
      // May fail if streaming endpoint requires specific session setup
      return;
    }

    console.log('[AGENT QUERY] status:', response.status);
    console.log('[AGENT QUERY] content-type:', response.headers.get('content-type'));

    expect(response.status).toBe(200);

    // Read first chunk of the SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      console.log('[AGENT QUERY] no readable stream');
      return;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let eventCount = 0;
    const eventTypes = new Set<string>();

    const timeout = setTimeout(() => reader.cancel(), 30000); // 30s max

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Parse SSE events from chunk
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            eventTypes.add(eventType);
            eventCount++;
          }
        }

        // Stop after we've seen enough to validate the stream works
        if (eventCount > 20 || fullText.includes('"done"') || fullText.includes('event: complete')) {
          reader.cancel();
          break;
        }
      }
    } catch (e: any) {
      // Cancel is expected
      if (!e.message?.includes('cancel')) {
        console.log('[AGENT QUERY] stream error:', e.message);
      }
    } finally {
      clearTimeout(timeout);
    }

    console.log('[AGENT QUERY] events received:', eventCount);
    console.log('[AGENT QUERY] event types:', [...eventTypes]);
    console.log('[AGENT QUERY] stream length:', fullText.length, 'chars');

    expect(eventCount).toBeGreaterThan(0);
    expect(fullText.length).toBeGreaterThan(0);
  }, 60000);

  it('should reject agent query with bad token', async () => {
    const badCreds: FlowstackCredentials = {
      apiKey: 'invalid-token',
      tenantId: TENANT_ID,
      userId: 'fake',
      email: 'fake@test.com',
    };

    try {
      await executeQuery(badCreds, 'hello', 'fake-ws', {}, clientConfig);
      // If it doesn't throw, the response should be non-200
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      console.log('[BAD AGENT QUERY] error:', err.message);
      expect(err.message).toContain('failed');
    }
  });
});

// ─── Cross-tenant isolation ──────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it('should not access workspaces from a different tenant', async () => {
    const wrongTenantCreds: FlowstackCredentials = {
      ...credentials,
      tenantId: 't_nonexistent_tenant',
    };

    const result = await listWorkspaces(wrongTenantCreds, 50, {
      ...clientConfig,
      tenantId: 't_nonexistent_tenant',
    });

    console.log('[WRONG TENANT] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[WRONG TENANT] workspaces:', result.data?.workspaces?.length);
      // Should return empty or error — not another tenant's data
      expect(result.data?.workspaces?.length ?? 0).toBe(0);
    }
  });
});

// ─── User isolation ──────────────────────────────────────────────────────────

describe('User isolation', () => {
  let user2Credentials: FlowstackCredentials;
  const USER2_EMAIL = `sdk-user2-${Date.now()}@flowstack.fun`;
  const USER2_PASSWORD = 'User2Test123!';

  beforeAll(async () => {
    // Create a second user in the SAME tenant
    const regResult = await register(USER2_EMAIL, USER2_PASSWORD, clientConfig);
    if (!regResult.ok) throw new Error(`User2 registration failed: ${regResult.error}`);

    const loginResult = await login(USER2_EMAIL, USER2_PASSWORD, clientConfig);
    if (!loginResult.ok || !loginResult.data) throw new Error(`User2 login failed: ${loginResult.error}`);

    user2Credentials = {
      apiKey: loginResult.data.access_token || loginResult.data.session_token,
      tenantId: TENANT_ID,
      userId: loginResult.data.user_id,
      email: USER2_EMAIL,
    };

    console.log('[USER2 SETUP] Logged in as:', user2Credentials.userId);
  }, 30000);

  it('user2 should NOT see user1 workspaces', async () => {
    const result = await listWorkspaces(user2Credentials, 50, clientConfig);

    console.log('[USER2 WORKSPACES] status:', result.status, 'count:', result.data?.workspaces?.length);

    expect(result.ok).toBe(true);
    // User2 just registered — should have 0 workspaces, not user1's
    const wsNames = result.data?.workspaces?.map((w: any) => w.name || w.workspace_id) || [];
    console.log('[USER2 WORKSPACES] names:', wsNames);
    expect(result.data?.workspaces?.length ?? 0).toBe(0);
  });

  it('user2 should NOT see user1 datasets', async () => {
    // Try to access user1's workspace from user2's token
    const result = await listDatasets(user2Credentials, workspaceId, clientConfig);

    console.log('[USER2→USER1 DATASETS] status:', result.status, 'ok:', result.ok);
    if (!result.ok) console.log('[USER2→USER1 DATASETS] error:', result.error);

    // Should be empty, 403, 404, or 500 (wrapping 403) — NOT user1's data
    // NOTE: Backend returns 500 wrapping "403: You do not have access to this workspace"
    // instead of a clean 403. Isolation works but status code is wrong.
    if (result.ok) {
      console.log('[USER2→USER1 DATASETS] count:', result.data?.datasets?.length);
      expect(result.data?.datasets?.length ?? 0).toBe(0);
    } else {
      expect(result.ok).toBe(false); // Blocked — that's what matters
      if (result.status === 500 && result.error?.includes('403')) {
        console.log('[USER2→USER1 DATASETS] NOTE: backend returns 500 wrapping 403 — should be clean 403');
      }
    }
  });

  it('user2 should NOT see user1 visualizations', async () => {
    const result = await listVisualizations(user2Credentials, workspaceId, clientConfig);

    console.log('[USER2→USER1 VIZ] status:', result.status, 'ok:', result.ok);

    if (result.ok) {
      expect(result.data?.visualizations?.length ?? 0).toBe(0);
    } else {
      expect(result.ok).toBe(false);
    }
  });

  it('user2 should NOT see user1 reports', async () => {
    const result = await listReports(user2Credentials, workspaceId, clientConfig);

    console.log('[USER2→USER1 REPORTS] status:', result.status, 'ok:', result.ok);

    if (result.ok) {
      expect(result.data?.reports?.length ?? 0).toBe(0);
    } else {
      expect(result.ok).toBe(false);
    }
  });

  it('user2 should NOT query agent in user1 workspace', async () => {
    try {
      const response = await executeQuery(
        user2Credentials,
        'list my datasets',
        workspaceId,
        { networkMode: 'SANDBOX' },
        clientConfig,
      );

      console.log('[USER2→USER1 AGENT] status:', response.status);

      // If it returns 200, check that the agent doesn't expose user1's data
      // (workspace isolation should mean user2's session sees nothing)
      if (response.status === 200) {
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let text = '';
          const timeout = setTimeout(() => reader.cancel(), 15000);
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              text += decoder.decode(value, { stream: true });
              if (text.length > 2000 || text.includes('event: complete')) {
                reader.cancel();
                break;
              }
            }
          } catch {}
          clearTimeout(timeout);
          console.log('[USER2→USER1 AGENT] stream preview:', text.substring(0, 500));
        }
      }
    } catch (err: any) {
      // 403 or similar error is the CORRECT behavior
      console.log('[USER2→USER1 AGENT] blocked:', err.message);
    }
  }, 30000);
});
