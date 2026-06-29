/**
 * useAdminProviderCredentials — Tenant-admin LLM credential pool management.
 *
 * Wraps the backend `/admin/provider-credentials` routes (P0-95 multi-tenant):
 *   GET  /admin/provider-credentials/am-i-admin  → non-throwing isAdmin gate
 *   GET  /admin/provider-credentials             → list tenant's platform pool
 *   GET  /admin/provider-credentials/existing    → non-platform creds (promote candidates)
 *   POST /admin/provider-credentials             → create new platform credential
 *   POST /admin/provider-credentials/promote     → clone existing into platform pool
 *
 * Drives the admin-only sections of the Casino Settings → Model tab.
 * For non-admins, am-i-admin returns false and the rest of the requests are
 * skipped — the hook degrades to an empty/no-op state without errors so
 * non-admin users still see their own model picker.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { flowstackFetch } from '../api/client';
import type {
  AdminProviderCredential,
  ExistingProviderCredential,
  CreateAdminProviderCredentialInput,
} from '../types';

export interface UseAdminProviderCredentialsReturn {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  credentials: AdminProviderCredential[];
  existing: ExistingProviderCredential[];
  create: (input: CreateAdminProviderCredentialInput) => Promise<boolean>;
  // Signature mirrors the call site: ModelSettingsView passes
  // (src.tenant_id, src.credential_id) for legacy reasons. Backend's promote
  // endpoint is strict-same-tenant — we drop the tenant arg server-side.
  promote: (sourceTenantId: string, credentialId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ADMIN_PATH = '/admin/provider-credentials';

interface AmIAdminResponse {
  is_admin: boolean;
  user_id?: string | null;
  tenant_id?: string | null;
}

export function useAdminProviderCredentials(): UseAdminProviderCredentialsReturn {
  const { credentials: authCredentials, config } = useFlowstack();
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentials, setCredentials] = useState<AdminProviderCredential[]>([]);
  const [existing, setExisting] = useState<ExistingProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const fetchAll = useCallback(async () => {
    if (!authCredentials) return;
    setError(null);
    try {
      // am-i-admin first — both other endpoints 403 for non-admins, no point
      // in firing those when we already know the answer.
      const adminRes = await flowstackFetch<AmIAdminResponse>(
        `${ADMIN_PATH}/am-i-admin`,
        { credentials: authCredentials },
        clientConfig,
      );
      const admin = !!(adminRes.ok && adminRes.data?.is_admin);
      setIsAdmin(admin);

      if (!admin) {
        setCredentials([]);
        setExisting([]);
        return;
      }

      const [listRes, existRes] = await Promise.all([
        flowstackFetch<AdminProviderCredential[]>(
          ADMIN_PATH,
          { credentials: authCredentials },
          clientConfig,
        ),
        flowstackFetch<ExistingProviderCredential[]>(
          `${ADMIN_PATH}/existing`,
          { credentials: authCredentials },
          clientConfig,
        ),
      ]);
      if (listRes.ok && listRes.data) {
        setCredentials(Array.isArray(listRes.data) ? listRes.data : []);
      }
      if (existRes.ok && existRes.data) {
        setExisting(Array.isArray(existRes.data) ? existRes.data : []);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin credentials');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCredentials, clientConfig.baseUrl, clientConfig.tenantId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchAll();
    setIsLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateAdminProviderCredentialInput): Promise<boolean> => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch<AdminProviderCredential>(
          ADMIN_PATH,
          {
            method: 'POST',
            credentials: authCredentials,
            body: input,
          },
          clientConfig,
        );
        if (!res.ok) {
          setError(res.error || `Failed to create credential: ${res.status}`);
          return false;
        }
        await fetchAll();
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to create credential');
        return false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId, fetchAll],
  );

  const promote = useCallback(
    async (_sourceTenantId: string, credentialId: string): Promise<boolean> => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch<AdminProviderCredential>(
          `${ADMIN_PATH}/promote`,
          {
            method: 'POST',
            credentials: authCredentials,
            body: { credential_id: credentialId, is_default: true },
          },
          clientConfig,
        );
        if (!res.ok) {
          setError(res.error || `Failed to promote credential: ${res.status}`);
          return false;
        }
        await fetchAll();
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to promote credential');
        return false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId, fetchAll],
  );

  return { isAdmin, isLoading, error, credentials, existing, create, promote, refresh };
}
