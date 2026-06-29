/**
 * Real API Integration Tests
 * Tests against live sage-api.flowstack.fun
 */

const https = require('https');

const BASE_URL = process.env.TEST_BASE_URL || 'https://sage-api.flowstack.fun';
const TENANT_ID = process.env.TEST_TENANT_ID || 't_6fe54402be43';

// Provide a key via env: TEST_API_KEY=sage_... node test-real-api.cjs
// (create one for your tenant via POST /tenants/{tenant_id}/api-keys; never commit it)
const TEST_API_KEY = process.env.TEST_API_KEY;
if (!TEST_API_KEY) {
  console.error('Set TEST_API_KEY (a sage_ API key) to run the live integration test.');
  process.exit(1);
}

let passCount = 0;
let failCount = 0;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data || '{}')),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
  console.log('\n========================================');
  console.log('  FLOWSTACK SDK REAL API TESTS');
  console.log('  Target: ' + BASE_URL);
  console.log('========================================\n');

  // ==================== HEALTH CHECK ====================
  console.log('🏥 Health Check\n');

  await test('API is healthy', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.ok, `Health check failed: ${res.status}`);
    const data = await res.json();
    assert(data.status === 'healthy', `Status is ${data.status}`);
    console.log(`    Service: ${data.service}, Version: ${data.version}`);
  });

  // ==================== AUTH ENDPOINTS ====================
  console.log('\n🔐 Auth Endpoints\n');

  await test('Login endpoint exists', async () => {
    const res = await fetch(`${BASE_URL}/auth/user/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', process.env.HARDCODED_PASSWORD }),
    });
    // Should return 401 (unauthorized) not 404 (not found)
    assert(res.status === 401 || res.status === 400, `Expected 401/400, got ${res.status}`);
  });

  await test('Register endpoint exists', async () => {
    const res = await fetch(`${BASE_URL}/auth/user/register`, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', process.env.HARDCODED_PASSWORD }),
    });
    // Should return 400/409 (already exists or validation) not 404
    assert(res.status !== 404, `Register endpoint not found: ${res.status}`);
  });

  // ==================== WORKSPACE ENDPOINTS ====================
  console.log('\n📁 Workspace Endpoints\n');

  await test('List workspaces with auth', async () => {
    const res = await fetch(`${BASE_URL}/tenants/${TENANT_ID}/workspaces?limit=10`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`    Workspaces found: ${data.workspaces?.length || 0}`);
    }
    // Just verify endpoint exists and responds
    assert(res.status !== 404, `Workspaces endpoint not found`);
  });

  await test('Create workspace endpoint exists', async () => {
    const res = await fetch(`${BASE_URL}/tenants/${TENANT_ID}/workspaces`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SDK Test Workspace',
        description: 'Created by SDK integration test',
      }),
    });
    console.log(`    Status: ${res.status}`);
    assert(res.status !== 404, `Create workspace endpoint not found`);
  });

  // ==================== DATASET ENDPOINTS ====================
  console.log('\n📊 Dataset Endpoints\n');

  // Use a real workspace ID from the tenant
  const REAL_WORKSPACE_ID = 'ws_1766611715_3201cd14';

  await test('List datasets for tenant', async () => {
    // API uses /tenants/{tenant_id}/datasets (not workspace-scoped)
    const res = await fetch(`${BASE_URL}/tenants/${TENANT_ID}/datasets`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`    Datasets found: ${Array.isArray(data) ? data.length : data.datasets?.length || 0}`);
    }
    assert(res.status !== 404, `Datasets endpoint not found`);
  });

  // ==================== STREAM ENDPOINT ====================
  console.log('\n🌊 Stream Endpoint\n');

  await test('Stream endpoint exists', async () => {
    const res = await fetch(`${BASE_URL}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'hello',
        workspace_id: 'test',
      }),
    });
    console.log(`    Status: ${res.status}`);
    // Stream endpoint should exist (may return error for invalid workspace)
    assert(res.status !== 404, `Stream endpoint not found`);
  });

  // ==================== DATA SOURCES ====================
  console.log('\n🔌 Data Source Endpoints\n');

  await test('List data sources endpoint', async () => {
    const res = await fetch(`${BASE_URL}/data-sources?tenant_id=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`    Data sources found: ${Array.isArray(data) ? data.length : 'N/A'}`);
    }
  });

  // ==================== API KEY MANAGEMENT ====================
  console.log('\n🔑 API Key Management (Whitelabeling)\n');

  await test('List API keys for tenant', async () => {
    const res = await fetch(`${BASE_URL}/tenants/${TENANT_ID}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`    API keys found: ${Array.isArray(data) ? data.length : data.keys?.length || 'N/A'}`);
    }
    assert(res.status !== 404, `API keys endpoint not found`);
  });

  await test('API key stats endpoint', async () => {
    const res = await fetch(`${BASE_URL}/tenants/${TENANT_ID}/api-keys/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    assert(res.status !== 404, `API key stats endpoint not found`);
  });

  // ==================== USER MANAGEMENT ====================
  console.log('\n👤 User Management\n');

  await test('Get current user info', async () => {
    const res = await fetch(`${BASE_URL}/auth/user/me`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    assert(res.status !== 404, `User info endpoint not found`);
  });

  await test('User status endpoint', async () => {
    const res = await fetch(`${BASE_URL}/auth/user/status`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
    });
    console.log(`    Status: ${res.status}`);
    assert(res.status !== 404, `User status endpoint not found`);
  });

  // ==================== SUMMARY ====================
  console.log('\n========================================');
  console.log('  RESULTS');
  console.log('========================================\n');
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  Total:   ${passCount + failCount}`);
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('All API endpoints accessible! ✨\n');
    process.exit(0);
  }
}

runTests().catch(console.error);
