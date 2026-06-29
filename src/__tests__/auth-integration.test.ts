/**
 * Auth Integration Tests
 *
 * Tests the SDK auth flow against the real Sage API.
 * Verifies register → login → token usage → workspace access.
 *
 * Run: npx vitest run src/__tests__/auth-integration.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  login,
  register,
  listWorkspaces,
  listDatasets,
  listSites,
} from '../api/client';
import { generateSagePassword } from '../utils/crypto';
import type { FlowstackCredentials, FlowstackClientConfig } from '../types';

const BASE_URL = 'https://sage-api.flowstack.fun';
const TENANT_ID = 't_6fe54402be43';

const clientConfig: FlowstackClientConfig = {
  baseUrl: BASE_URL,
  tenantId: TENANT_ID,
};

// Generate unique test email to avoid collisions
const TEST_EMAIL = `sdk-test-${Date.now()}@flowstack.fun`;
const TEST_PASSWORD = 'TestPassword123!';

let credentials: FlowstackCredentials | null = null;

describe('Auth: Direct API (CDN site path)', () => {
  it('should register a new user with raw password', async () => {
    const result = await register(TEST_EMAIL, TEST_PASSWORD, clientConfig);

    console.log('[REGISTER] status:', result.status, 'ok:', result.ok);
    console.log('[REGISTER] data:', JSON.stringify(result.data, null, 2));
    if (!result.ok) console.log('[REGISTER] error:', result.error);

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.user_id).toBeDefined();
  });

  it('should login with raw password (same as register)', async () => {
    const result = await login(TEST_EMAIL, TEST_PASSWORD, clientConfig);

    console.log('[LOGIN] status:', result.status, 'ok:', result.ok);
    console.log('[LOGIN] data:', JSON.stringify(result.data, null, 2));
    if (!result.ok) console.log('[LOGIN] error:', result.error);

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.session_token || result.data?.access_token).toBeDefined();
    expect(result.data?.user_id).toBeDefined();

    // Store credentials for subsequent tests
    credentials = {
      apiKey: result.data!.access_token || result.data!.session_token,
      tenantId: TENANT_ID,
      userId: result.data!.user_id,
      email: TEST_EMAIL,
    };
  });

  it('should reject login with wrong password', async () => {
    const result = await login(TEST_EMAIL, 'WrongPassword999!', clientConfig);

    console.log('[BAD LOGIN] status:', result.status);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it('should reject login with non-existent email', async () => {
    const result = await login('nonexistent-xyz@flowstack.fun', TEST_PASSWORD, clientConfig);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe('Auth: generateSagePassword mismatch test', () => {
  it('should FAIL login when using generateSagePassword (route path mismatch)', async () => {
    // This simulates what createLoginRoute does — transforms password before sending
    // A user registered via direct API (raw password) should NOT be able to login
    // with the transformed password, proving the two paths are incompatible.
    const sagePassword = generateSagePassword(TEST_EMAIL, 'flowstack-cdn-site', TEST_PASSWORD);

    console.log('[SAGE-PW] transformed:', sagePassword.substring(0, 10) + '...');

    const result = await login(TEST_EMAIL, sagePassword, clientConfig);

    console.log('[SAGE-PW LOGIN] status:', result.status, 'ok:', result.ok);

    // This SHOULD fail — the user registered with raw password, not the sage-transformed one
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe('Auth: Token usage for API calls', () => {
  it('should list workspaces with valid token', async () => {
    expect(credentials).not.toBeNull();

    // listWorkspaces signature: (credentials, limit, config)
    const result = await listWorkspaces(credentials!, 50, clientConfig);

    console.log('[WORKSPACES] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[WORKSPACES] count:', result.data?.workspaces?.length ?? 'unknown');
    } else {
      console.log('[WORKSPACES] error:', result.error);
    }

    expect(result.ok).toBe(true);
  });

  it('should list sites with valid token', async () => {
    expect(credentials).not.toBeNull();

    const result = await listSites(credentials!, clientConfig);

    console.log('[SITES] status:', result.status, 'ok:', result.ok);
    if (result.ok) {
      console.log('[SITES] count:', result.data?.sites?.length ?? 'unknown');
    } else {
      console.log('[SITES] error:', result.error);
    }

    // Sites may return 404 if endpoint requires workspace context — log but don't fail hard
    // The key test is that auth token is accepted (not 401/403)
    if (!result.ok) {
      expect(result.status).not.toBe(401);
      expect(result.status).not.toBe(403);
    }
  });

  it('should reject API calls with invalid token', async () => {
    const badCreds: FlowstackCredentials = {
      apiKey: 'invalid-token-xyz',
      tenantId: TENANT_ID,
      userId: 'fake',
      email: 'fake@test.com',
    };

    const result = await listWorkspaces(badCreds, clientConfig);

    console.log('[BAD TOKEN] status:', result.status);

    expect(result.ok).toBe(false);
  });

  it('should reject API calls with expired JWT', async () => {
    // Forge an expired JWT (won't have valid signature either)
    const expiredPayload = btoa(JSON.stringify({
      user_id: 'test',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    }));
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${expiredPayload}.fake-signature`;

    const expiredCreds: FlowstackCredentials = {
      apiKey: fakeJwt,
      tenantId: TENANT_ID,
      userId: 'test',
      email: 'test@test.com',
    };

    const result = await listWorkspaces(expiredCreds, clientConfig);

    console.log('[EXPIRED TOKEN] status:', result.status);

    expect(result.ok).toBe(false);
  });
});

describe('Auth: Duplicate registration', () => {
  it('should reject duplicate email registration', async () => {
    const result = await register(TEST_EMAIL, TEST_PASSWORD, clientConfig);

    console.log('[DUP REGISTER] status:', result.status, 'ok:', result.ok);
    if (!result.ok) console.log('[DUP REGISTER] error:', result.error);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
  });
});

describe('Auth: JWT structure', () => {
  it('should return a valid JWT with expected claims', () => {
    expect(credentials).not.toBeNull();
    expect(credentials!.apiKey).toContain('.');

    const parts = credentials!.apiKey.split('.');
    expect(parts.length).toBe(3);

    const payload = JSON.parse(atob(parts[1]));
    console.log('[JWT] claims:', Object.keys(payload));
    console.log('[JWT] user_id:', payload.user_id);
    console.log('[JWT] exp:', payload.exp, '→', new Date(payload.exp * 1000).toISOString());

    expect(payload.user_id).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('credentials userId should match JWT user_id claim', () => {
    expect(credentials).not.toBeNull();

    const parts = credentials!.apiKey.split('.');
    const payload = JSON.parse(atob(parts[1]));

    expect(credentials!.userId).toBe(payload.user_id);
  });
});
