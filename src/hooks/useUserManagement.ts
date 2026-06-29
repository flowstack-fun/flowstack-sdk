'use client';

/**
 * useUserManagement Hook
 *
 * Provides user management functionality for developers to track and manage
 * users who sign up through their apps.
 *
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { users, stats, suspendUser, canManageUsers } = useUserManagement();
 *
 *   if (!canManageUsers) return <div>Access denied</div>;
 *
 *   return (
 *     <div>
 *       <h2>Total Users: {stats?.totalUsers}</h2>
 *       {users.map(user => (
 *         <div key={user.id}>
 *           {user.email} - {user.role}
 *           <button onClick={() => suspendUser(user.id)}>Suspend</button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type {
  UseUserManagementReturn,
  ManagedUser,
  UserStats,
  UserActivityLog,
  UserListParams,
  UpdateUserRequest,
  UserRole,
  UserStatus,
} from '../types';
import {
  listUsers as apiListUsers,
  getUser as apiGetUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  suspendUser as apiSuspendUser,
  reactivateUser as apiReactivateUser,
  getUserActivity as apiGetUserActivity,
  getUserStats as apiGetUserStats,
  checkAdminPermissions as apiCheckAdminPermissions,
} from '../api/client';
import { mockDelay, mockManagedUsers, mockUserStats, mockUserActivity } from '../mock/fixtures';

/**
 * Hook for user management operations
 */
export function useUserManagement(): UseUserManagementReturn {
  const { credentials, config } = useFlowstack();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    hasMore: false,
  });

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | null>(null);
  const [statusFilter, setStatusFilter] = useState<UserStatus | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };

  const isMockMode = config.mode === 'mock';

  /**
   * Check admin permissions on mount
   */
  useEffect(() => {
    const checkPermissions = async () => {
      if (!credentials && !isMockMode) {
        setCanManageUsers(false);
        return;
      }

      if (isMockMode) {
        // In mock mode, assume owner/admin can manage
        setCanManageUsers(true);
        return;
      }

      try {
        const response = await apiCheckAdminPermissions(credentials!, clientConfig);
        if (response.ok && response.data) {
          setCanManageUsers(response.data.canManageUsers);
        }
      } catch {
        setCanManageUsers(false);
      }
    };

    checkPermissions();
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Refresh users list with optional parameters
   */
  const refreshUsers = useCallback(async (params?: UserListParams): Promise<void> => {
    setError(null);
    setIsLoading(true);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      if (isMockMode) {
        await mockDelay(200, 500);

        // Apply filters to mock data
        let filtered = [...mockManagedUsers];

        const searchTerm = params?.search || search;
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(u =>
            u.email.toLowerCase().includes(lower) ||
            u.name?.toLowerCase().includes(lower)
          );
        }

        const role = params?.role || roleFilter;
        if (role) {
          filtered = filtered.filter(u => u.role === role);
        }

        const status = params?.status || statusFilter;
        if (status) {
          filtered = filtered.filter(u => u.status === status);
        }

        setUsers(filtered);
        setPagination(prev => ({
          ...prev,
          page: params?.page || prev.page,
          limit: params?.limit || prev.limit,
          totalCount: filtered.length,
          hasMore: false,
        }));
        return;
      }

      const response = await apiListUsers(credentials!, {
        page: params?.page || pagination.page,
        limit: params?.limit || pagination.limit,
        search: params?.search || search,
        role: params?.role || roleFilter || undefined,
        status: params?.status || statusFilter || undefined,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      }, clientConfig);

      if (response.ok && response.data) {
        setUsers(response.data.users);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          totalCount: response.data.totalCount,
          hasMore: response.data.hasMore,
        });
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, isMockMode, clientConfig, pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  /**
   * Get a single user by ID
   */
  const getUser = useCallback(async (userId: string): Promise<ManagedUser | null> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return null;
    }

    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        return mockManagedUsers.find(u => u.id === userId) || null;
      }

      const response = await apiGetUser(credentials!, userId, clientConfig);
      if (response.ok && response.data) {
        return response.data.user;
      }

      setError(response.error || 'User not found');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user';
      setError(message);
      return null;
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Update a user's profile or role
   */
  const updateUser = useCallback(async (
    userId: string,
    updates: UpdateUserRequest
  ): Promise<boolean> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return false;
    }

    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        // Update local state
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, ...updates } : u
        ));
        return true;
      }

      const response = await apiUpdateUser(credentials!, userId, updates, clientConfig);
      if (response.ok && response.data) {
        // Update local state with response
        setUsers(prev => prev.map(u =>
          u.id === userId ? response.data!.user : u
        ));
        return true;
      }

      setError(response.error || 'Failed to update user');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Suspend a user account
   */
  const suspendUser = useCallback(async (
    userId: string,
    reason?: string
  ): Promise<boolean> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return false;
    }

    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, status: 'suspended' as UserStatus } : u
        ));
        return true;
      }

      const response = await apiSuspendUser(credentials!, userId, reason, clientConfig);
      if (response.ok && response.data) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? response.data!.user : u
        ));
        return true;
      }

      setError(response.error || 'Failed to suspend user');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend user';
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Reactivate a suspended user account
   */
  const reactivateUser = useCallback(async (userId: string): Promise<boolean> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return false;
    }

    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, status: 'active' as UserStatus } : u
        ));
        return true;
      }

      const response = await apiReactivateUser(credentials!, userId, clientConfig);
      if (response.ok && response.data) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? response.data!.user : u
        ));
        return true;
      }

      setError(response.error || 'Failed to reactivate user');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate user';
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Delete a user permanently
   */
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return false;
    }

    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers(prev => prev.filter(u => u.id !== userId));
        return true;
      }

      const response = await apiDeleteUser(credentials!, userId, clientConfig);
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        return true;
      }

      setError(response.error || 'Failed to delete user');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Get user activity logs
   */
  const getUserActivity = useCallback(async (
    userId: string,
    limit: number = 50
  ): Promise<UserActivityLog[]> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return [];
    }

    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        return mockUserActivity.filter(a => a.userId === userId).slice(0, limit);
      }

      const response = await apiGetUserActivity(credentials!, userId, limit, clientConfig);
      if (response.ok && response.data) {
        return response.data.activities;
      }

      setError(response.error || 'Failed to get activity');
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get activity';
      setError(message);
      return [];
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Refresh user statistics
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return;
    }

    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        setStats(mockUserStats);
        return;
      }

      const response = await apiGetUserStats(credentials!, clientConfig);
      if (response.ok && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load stats');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stats';
      setError(message);
    }
  }, [credentials, isMockMode, clientConfig]);

  /**
   * Set page for pagination
   */
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  /**
   * Set role filter
   */
  const setRoleFilterCallback = useCallback((role: UserRole | null) => {
    setRoleFilter(role);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Set status filter
   */
  const setStatusFilterCallback = useCallback((status: UserStatus | null) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Set search term
   */
  const setSearchCallback = useCallback((searchTerm: string) => {
    setSearch(searchTerm);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Load users and stats on mount if authenticated
  useEffect(() => {
    if (credentials || isMockMode) {
      refreshUsers();
      refreshStats();
    }
  }, [credentials, isMockMode]);

  return {
    users,
    stats,
    isLoading,
    error,
    pagination,
    refreshUsers,
    getUser,
    updateUser,
    suspendUser,
    reactivateUser,
    deleteUser,
    getUserActivity,
    refreshStats,
    setPage,
    setSearch: setSearchCallback,
    setRoleFilter: setRoleFilterCallback,
    setStatusFilter: setStatusFilterCallback,
    canManageUsers,
  };
}
