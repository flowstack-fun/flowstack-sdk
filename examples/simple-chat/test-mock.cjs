/**
 * Mock Data Test Script (CommonJS)
 * Tests the SDK mock data directly
 */

const {
  mockCredentials,
  mockUser,
  mockWorkspaces,
  mockDatasets,
  mockManagedUsers,
  mockUserStats,
  mockUserActivity,
  mockDataSources,
  generateMockId,
} = require('../../dist/index.js');

const results = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
    results.push({ name, status: 'pass' });
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failCount++;
    results.push({ name, status: 'fail', error: e.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('\n========================================');
console.log('  FLOWSTACK SDK MOCK DATA TESTS (CJS)');
console.log('========================================\n');

// ==================== MOCK DATA TESTS ====================
console.log('📦 Mock Data Tests\n');

test('mockCredentials has required fields', () => {
  assert(mockCredentials.apiKey, 'Missing apiKey');
  assert(mockCredentials.tenantId, 'Missing tenantId');
  assert(mockCredentials.userId, 'Missing userId');
  assert(mockCredentials.email, 'Missing email');
});

test('mockUser has required fields', () => {
  assert(mockUser.id, 'Missing id');
  assert(mockUser.email, 'Missing email');
  assert(mockUser.tenantId, 'Missing tenantId');
});

test('mockWorkspaces is array with items', () => {
  assert(Array.isArray(mockWorkspaces), 'Not an array');
  assert(mockWorkspaces.length > 0, 'Empty array');
  assert(mockWorkspaces[0].workspaceId, 'Missing workspaceId');
  assert(mockWorkspaces[0].name, 'Missing name');
});

test('mockDatasets is array with items', () => {
  assert(Array.isArray(mockDatasets), 'Not an array');
  assert(mockDatasets.length > 0, 'Empty array');
  assert(mockDatasets[0].id, 'Missing id');
  assert(mockDatasets[0].name, 'Missing name');
  assert(typeof mockDatasets[0].rows === 'number', 'Missing rows');
});

test('mockManagedUsers is array with items', () => {
  assert(Array.isArray(mockManagedUsers), 'Not an array');
  assert(mockManagedUsers.length > 0, 'Empty array');
  assert(mockManagedUsers[0].id, 'Missing id');
  assert(mockManagedUsers[0].email, 'Missing email');
  assert(mockManagedUsers[0].role, 'Missing role');
  assert(mockManagedUsers[0].status, 'Missing status');
});

test('mockUserStats has required fields', () => {
  assert(typeof mockUserStats.totalUsers === 'number', 'Missing totalUsers');
  assert(typeof mockUserStats.activeUsers === 'number', 'Missing activeUsers');
  assert(mockUserStats.usersByRole, 'Missing usersByRole');
  assert(mockUserStats.usersByStatus, 'Missing usersByStatus');
});

test('mockUserActivity is array with items', () => {
  assert(Array.isArray(mockUserActivity), 'Not an array');
  assert(mockUserActivity.length > 0, 'Empty array');
  assert(mockUserActivity[0].id, 'Missing id');
  assert(mockUserActivity[0].userId, 'Missing userId');
  assert(mockUserActivity[0].activityType, 'Missing activityType');
});

test('mockDataSources is array with items', () => {
  assert(Array.isArray(mockDataSources), 'Not an array');
  assert(mockDataSources.length > 0, 'Empty array');
  assert(mockDataSources[0].source_id, 'Missing source_id');
  assert(mockDataSources[0].source_type, 'Missing source_type');
});

// ==================== UTILITY TESTS ====================
console.log('\n🔧 Utility Tests\n');

test('generateMockId creates unique IDs', () => {
  const id1 = generateMockId('test');
  const id2 = generateMockId('test');
  assert(id1.startsWith('test_'), 'ID should start with prefix');
  assert(id1 !== id2, 'IDs should be unique');
});

// ==================== TYPE STRUCTURE TESTS ====================
console.log('\n📋 Type Structure Tests\n');

test('ManagedUser has all role types', () => {
  const roles = mockManagedUsers.map(u => u.role);
  assert(roles.includes('owner'), 'Missing owner role');
  assert(roles.includes('admin'), 'Missing admin role');
  assert(roles.includes('member'), 'Missing member role');
});

test('ManagedUser has various status types', () => {
  const statuses = mockManagedUsers.map(u => u.status);
  assert(statuses.includes('active'), 'Missing active status');
  assert(statuses.includes('suspended'), 'Missing suspended status');
});

test('UserStats has role counts', () => {
  assert(typeof mockUserStats.usersByRole.owner === 'number', 'Missing owner count');
  assert(typeof mockUserStats.usersByRole.admin === 'number', 'Missing admin count');
  assert(typeof mockUserStats.usersByRole.member === 'number', 'Missing member count');
  assert(typeof mockUserStats.usersByRole.viewer === 'number', 'Missing viewer count');
});

test('UserStats has status counts', () => {
  assert(typeof mockUserStats.usersByStatus.active === 'number', 'Missing active count');
  assert(typeof mockUserStats.usersByStatus.suspended === 'number', 'Missing suspended count');
});

test('WorkspaceInfo has expected structure', () => {
  const ws = mockWorkspaces[0];
  assert(ws.workspaceId, 'Missing workspaceId');
  assert(ws.name, 'Missing name');
  assert(typeof ws.datasetCount === 'number', 'Missing datasetCount');
  assert(ws.createdAt, 'Missing createdAt');
});

test('DatasetInfo has expected structure', () => {
  const ds = mockDatasets[0];
  assert(ds.id, 'Missing id');
  assert(ds.name, 'Missing name');
  assert(typeof ds.rows === 'number', 'Missing rows');
  assert(typeof ds.columns === 'number', 'Missing columns');
  assert(Array.isArray(ds.columnNames), 'columnNames not an array');
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
  console.log('Failed tests:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('All tests passed! ✨\n');
  process.exit(0);
}
