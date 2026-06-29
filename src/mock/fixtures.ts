/**
 * Mock Fixtures for Development Mode
 *
 * Provides realistic test data for development without a backend.
 */

import type {
  FlowstackCredentials,
  WorkspaceInfo,
  DatasetInfo,
  VisualizationData,
  ChatMessage,
  DataSource,
  User,
  ManagedUser,
  UserStats,
  UserActivityLog,
} from '../types';

/**
 * Mock user credentials
 */
export const mockCredentials: FlowstackCredentials = {
  apiKey: 'mock_session_token_abc123',
  tenantId: 't_mock_tenant',
  userId: 'user_mock_123',
  email: 'demo@example.com',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Mock user derived from credentials
 */
export const mockUser: User = {
  id: 'user_mock_123',
  email: 'demo@example.com',
  tenantId: 't_mock_tenant',
  expiresAt: mockCredentials.expiresAt,
};

/**
 * Mock workspaces
 */
export const mockWorkspaces: WorkspaceInfo[] = [
  {
    workspaceId: 'ws_demo_1',
    name: 'Demo Workspace',
    description: 'A demo workspace for testing',
    datasetCount: 3,
    visualizationCount: 5,
    modelCount: 1,
    createdAt: '2024-01-15T10:00:00Z',
    lastAccessed: new Date().toISOString(),
  },
  {
    workspaceId: 'ws_analytics',
    name: 'Analytics Project',
    description: 'Customer analytics and insights',
    datasetCount: 7,
    visualizationCount: 12,
    modelCount: 2,
    createdAt: '2024-02-20T14:30:00Z',
    lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    workspaceId: 'ws_ml_project',
    name: 'ML Experiments',
    description: 'Machine learning model experiments',
    datasetCount: 5,
    visualizationCount: 8,
    modelCount: 4,
    createdAt: '2024-03-10T09:15:00Z',
    lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Mock datasets
 */
export const mockDatasets: DatasetInfo[] = [
  {
    id: 'ds_customers',
    name: 'customers',
    rows: 10000,
    columns: 12,
    columnNames: ['id', 'name', 'email', 'created_at', 'country', 'segment', 'revenue', 'orders', 'last_order', 'lifetime_value', 'churn_risk', 'status'],
    schema: {
      id: { type: 'string', nullable: false, unique: true },
      name: { type: 'string', nullable: false },
      email: { type: 'string', nullable: false },
      created_at: { type: 'date', nullable: false },
      country: { type: 'string', nullable: true },
      segment: { type: 'string', nullable: true },
      revenue: { type: 'number', nullable: false },
      orders: { type: 'number', nullable: false },
      last_order: { type: 'date', nullable: true },
      lifetime_value: { type: 'number', nullable: false },
      churn_risk: { type: 'number', nullable: true },
      status: { type: 'string', nullable: false },
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-03-15T08:00:00Z',
  },
  {
    id: 'ds_orders',
    name: 'orders',
    rows: 50000,
    columns: 8,
    columnNames: ['order_id', 'customer_id', 'order_date', 'total', 'status', 'items', 'shipping_country', 'payment_method'],
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-03-14T16:45:00Z',
  },
  {
    id: 'ds_products',
    name: 'products',
    rows: 500,
    columns: 10,
    columnNames: ['product_id', 'name', 'category', 'price', 'cost', 'stock', 'rating', 'reviews', 'created_at', 'is_active'],
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-10T14:20:00Z',
  },
];

/**
 * Mock visualizations
 */
export const mockVisualizations: VisualizationData[] = [
  {
    name: 'Revenue by Month',
    type: 'line_chart',
    format: 'png',
    createdAt: '2024-03-15T10:00:00Z',
    metadata: { xAxis: 'month', yAxis: 'revenue' },
  },
  {
    name: 'Customer Segments',
    type: 'pie_chart',
    format: 'png',
    createdAt: '2024-03-14T15:30:00Z',
    metadata: { dimension: 'segment', measure: 'count' },
  },
  {
    name: 'Orders Heatmap',
    type: 'heatmap',
    format: 'png',
    createdAt: '2024-03-13T11:45:00Z',
    metadata: { xAxis: 'day_of_week', yAxis: 'hour' },
  },
];

/**
 * Mock data sources
 */
export const mockDataSources: DataSource[] = [
  {
    source_id: 'src_mongodb_1',
    tenant_id: 't_mock_tenant',
    source_type: 'mongodb',
    name: 'Production MongoDB',
    auth_method: 'connection_string',
    is_tenant_wide: true,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    credentials_preview: { host: 'mongodb.example.com', database: 'production' },
  },
  {
    source_id: 'src_postgres_1',
    tenant_id: 't_mock_tenant',
    source_type: 'postgresql',
    name: 'Analytics Database',
    auth_method: 'connection_string',
    is_tenant_wide: false,
    user_id: 'user_mock_123',
    created_at: Date.now() - 14 * 24 * 60 * 60 * 1000,
    credentials_preview: { host: 'pg.example.com', database: 'analytics' },
  },
];

/**
 * Mock chat messages (for demo)
 */
export const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'user',
    content: 'What are my top customers by revenue?',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 'msg_2',
    role: 'assistant',
    content: 'I analyzed the customers dataset and found your top 10 customers by revenue. Here are the results:\n\n1. Acme Corp - $125,000\n2. TechStart Inc - $98,500\n3. Global Retail - $87,200\n...',
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    toolCalls: [
      {
        id: 'tool_1',
        name: 'query_dataset',
        args: { dataset: 'customers', query: 'SELECT * FROM customers ORDER BY revenue DESC LIMIT 10' },
        result: { rows: 10 },
        status: 'complete',
      },
    ],
  },
];

/**
 * Generate a unique ID for mock data
 */
export function generateMockId(prefix: string = 'mock'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Simulate network delay for realistic mock responses
 */
export function mockDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// =============================================================================
// User Management Mock Data
// =============================================================================

/**
 * Mock managed users for admin dashboard
 */
export const mockManagedUsers: ManagedUser[] = [
  {
    id: 'user_mock_123',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'owner',
    status: 'active',
    tenantId: 't_mock_tenant',
    createdAt: '2024-01-01T10:00:00Z',
    lastLoginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    metadata: { plan: 'pro', company: 'Demo Inc' },
  },
  {
    id: 'user_admin_456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    status: 'active',
    tenantId: 't_mock_tenant',
    createdAt: '2024-01-15T14:30:00Z',
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'user_member_789',
    email: 'member@example.com',
    name: 'Team Member',
    role: 'member',
    status: 'active',
    tenantId: 't_mock_tenant',
    createdAt: '2024-02-10T09:00:00Z',
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user_suspended_101',
    email: 'suspended@example.com',
    name: 'Suspended User',
    role: 'member',
    status: 'suspended',
    tenantId: 't_mock_tenant',
    createdAt: '2024-02-20T11:00:00Z',
    lastLoginAt: '2024-03-01T08:00:00Z',
    metadata: { suspendReason: 'Policy violation' },
  },
  {
    id: 'user_pending_102',
    email: 'pending@example.com',
    name: 'New User',
    role: 'viewer',
    status: 'pending_verification',
    tenantId: 't_mock_tenant',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Mock user statistics
 */
export const mockUserStats: UserStats = {
  totalUsers: 127,
  activeUsers: 98,
  usersByRole: {
    owner: 1,
    admin: 5,
    member: 85,
    viewer: 36,
  },
  usersByStatus: {
    active: 98,
    suspended: 8,
    pending_verification: 15,
    deactivated: 6,
  },
  newUsersThisMonth: 23,
  dailyActiveUsers: [45, 52, 48, 61, 55, 43, 38, 67, 72, 58, 63, 71, 65, 54],
};

/**
 * Mock user activity logs
 */
export const mockUserActivity: UserActivityLog[] = [
  {
    id: 'act_1',
    userId: 'user_mock_123',
    activityType: 'login',
    description: 'Logged in from Chrome on macOS',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'act_2',
    userId: 'user_mock_123',
    activityType: 'query_execute',
    description: 'Executed query: "Show top customers"',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resourceType: 'workspace',
    resourceId: 'ws_demo_1',
  },
  {
    id: 'act_3',
    userId: 'user_mock_123',
    activityType: 'dataset_upload',
    description: 'Uploaded dataset: sales_data.csv',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resourceType: 'dataset',
    resourceId: 'ds_sales',
  },
  {
    id: 'act_4',
    userId: 'user_mock_123',
    activityType: 'workspace_create',
    description: 'Created workspace: Analytics Project',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resourceType: 'workspace',
    resourceId: 'ws_analytics',
  },
  {
    id: 'act_5',
    userId: 'user_mock_123',
    activityType: 'logout',
    description: 'Logged out',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
