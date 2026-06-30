import { createContext, useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// src/context/FlowstackProvider.tsx

// src/api/client.ts
var DEFAULT_BASE_URL = "https://sage-api.flowstack.fun";
var DEFAULT_TENANT_ID = "";
async function flowstackFetch(endpoint, options, config) {
  const { method = "GET", body, headers = {}, credentials } = options;
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const enforceUserScope = config?.enforceUserScope !== false;
  const { apiKey, tenantId, userId } = credentials;
  if (enforceUserScope && !userId) {
    console.error("[FlowstackClient] CRITICAL: No user ID provided!");
    throw new Error("SECURITY: User ID is required for all API requests.");
  }
  const url = new URL(`${baseUrl}${endpoint}`);
  if (method === "GET" && userId) {
    url.searchParams.set("user_id", userId);
  }
  const requestHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "X-Tenant-ID": tenantId || config?.tenantId || DEFAULT_TENANT_ID,
    "X-User-ID": userId || "",
    ...headers
  };
  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }
  try {
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FlowstackClient] Error ${response.status}:`, errorText);
      return {
        ok: false,
        status: response.status,
        error: errorText
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (error) {
    console.error("[FlowstackClient] Request failed:", error);
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function listWorkspaces(credentials, limit = 50, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces?limit=${limit}`, {
    credentials
  }, config);
}
async function createWorkspace(credentials, name, description, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces`, {
    method: "POST",
    credentials,
    body: {
      name,
      workspace_name: name,
      description,
      user_id: credentials.userId
    }
  }, config);
}
async function getWorkspace(credentials, workspaceId, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/workspaces/${workspaceId}`, {
    credentials
  }, config);
}
async function listDatasets(credentials, workspaceId, config) {
  const query = workspaceId ? `?workspace_id=${workspaceId}&session_id=${workspaceId}` : "";
  return flowstackFetch(`/datasets${query}`, {
    credentials
  }, config);
}
async function getDataset(credentials, datasetName, config) {
  return flowstackFetch(`/datasets/${datasetName}/download`, {
    credentials
  }, config);
}
async function getDatasetPreview(credentials, datasetName, workspaceId, config) {
  return flowstackFetch(`/datasets/${datasetName}/preview?workspace_id=${workspaceId}&session_id=${workspaceId}&limit=50`, {
    credentials
  }, config);
}
async function deleteDataset(_credentials, _datasetName, _config) {
  return {
    ok: false,
    status: 501,
    error: "Dataset deletion is handled through the agent chat interface. Use the /stream endpoint to request deletion."
  };
}
async function listVisualizations(credentials, workspaceId, config) {
  return flowstackFetch(`/visualizations?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials
  }, config);
}
async function listReports(credentials, workspaceId, config) {
  return flowstackFetch(`/reports?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials
  }, config);
}
async function listModels(credentials, workspaceId, config) {
  return flowstackFetch(`/models?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials
  }, config);
}
async function getModel(credentials, workspaceId, modelName, config) {
  return flowstackFetch(`/models/${modelName}?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials
  }, config);
}
async function listScripts(credentials, workspaceId, config) {
  return flowstackFetch(`/scripts/detailed?workspace_id=${workspaceId}&session_id=${workspaceId}`, {
    credentials
  }, config);
}
async function listDataSources(credentials, config, options) {
  const qs = options?.includeProvenance ? "?include_provenance=true" : "";
  return flowstackFetch(`/data-sources${qs}`, {
    credentials
  }, config);
}
async function createDataSource(credentials, sourceConfig, config) {
  return flowstackFetch("/data-sources", {
    method: "POST",
    credentials,
    body: {
      source_type: sourceConfig.type,
      name: sourceConfig.name,
      auth_method: sourceConfig.auth_method || "connection_string",
      credentials: sourceConfig.credentials || {
        connection_string: sourceConfig.connectionString
      },
      metadata: sourceConfig.metadata,
      is_tenant_wide: sourceConfig.is_tenant_wide || false
    }
  }, config);
}
async function testDataSource(credentials, sourceId, config) {
  return flowstackFetch(`/data-sources/${sourceId}/test`, {
    method: "POST",
    credentials
  }, config);
}
async function deleteDataSource(credentials, sourceId, config) {
  return flowstackFetch(`/data-sources/${sourceId}`, {
    method: "DELETE",
    credentials
  }, config);
}
async function listAgents(config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/agents`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, error: errorText };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to fetch agents"
    };
  }
}
async function executeQuery(credentials, query, workspaceId, options, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  const response = await fetch(`${baseUrl}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`,
      "X-Tenant-ID": tenantId,
      "X-User-ID": credentials.userId || "",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      query,
      workspace_id: workspaceId,
      session_id: options?.sessionId || void 0,
      force_new_session: options?.forceNewSession || void 0,
      tenant_id: tenantId,
      user_id: credentials.userId,
      code_interpreter_network_mode: options?.networkMode || "SANDBOX",
      // P0-80: capabilities replaces target_agents on the wire. Deprecated
      // target_agents/target_agent are intentionally NOT forwarded — they
      // were no-ops post-P0-73 and forwarding them just added noise to logs.
      capabilities: options?.capabilities && options.capabilities.length > 0 ? options.capabilities : void 0
    })
  });
  if (!response.ok) {
    if (response.status === 402) {
      let body = {};
      try {
        body = await response.json();
      } catch {
      }
      const err = new Error(body?.message || "Out of credits \u2014 top up to continue");
      err.status = 402;
      err.code = "INSUFFICIENT_CREDITS";
      err.body = body;
      throw err;
    }
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.detail || body?.error || body?.message || detail;
    } catch {
    }
    throw new Error(`Query failed: ${detail}`);
  }
  return response;
}
async function executeQueryWithConfig(credentials, query, workspaceId, options, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  const response = await fetch(`${baseUrl}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`,
      "X-Tenant-ID": tenantId,
      "X-User-ID": credentials.userId || "",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      query,
      workspace_id: workspaceId,
      session_id: options?.sessionId || void 0,
      force_new_session: options?.forceNewSession || void 0,
      tenant_id: tenantId,
      user_id: credentials.userId,
      code_interpreter_network_mode: options?.networkMode || "SANDBOX",
      // P0-80: capabilities replaces target_agents on the wire.
      capabilities: options?.capabilities && options.capabilities.length > 0 ? options.capabilities : void 0,
      system_prompt_override: options?.systemPrompt,
      tool_whitelist: options?.tools,
      allowed_terms: options?.allowedTerms || void 0,
      // P0-132 (G4): persona selection → target_agents. The backend persona
      // resolver honors request.target_agents and otherwise auto-selects the
      // first registered subagent. Only sent when a persona is requested.
      target_agents: options?.persona ? [options.persona] : void 0
    })
  });
  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }
  return response;
}
async function queryCollection(credentials, collection, options, config) {
  const params = new URLSearchParams();
  params.set("collection", collection);
  if (options?.filter) params.set("filter", JSON.stringify(options.filter));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.skip) params.set("skip", String(options.skip));
  if (options?.sort) params.set("sort", JSON.stringify(options.sort));
  if (options?.projection) params.set("projection", JSON.stringify(options.projection));
  if (options?.layer) params.set("layer", options.layer);
  if (options?.includeProvenance) params.set("include_provenance", "true");
  return flowstackFetch(
    `/collections/query?${params.toString()}`,
    { credentials },
    config
  );
}
async function insertDocuments(credentials, collection, documents, config, layer) {
  const isArray = Array.isArray(documents);
  return flowstackFetch(
    "/collections/insert",
    {
      method: "POST",
      credentials,
      body: {
        collection,
        ...isArray ? { documents } : { document: documents },
        ...layer ? { layer } : {}
      }
    },
    config
  );
}
async function updateDocuments(credentials, collection, filter, update, options, config, layer) {
  return flowstackFetch(
    "/collections/update",
    {
      method: "POST",
      credentials,
      body: {
        collection,
        filter,
        update,
        upsert: options?.upsert ?? false,
        ...layer ? { layer } : {}
      }
    },
    config
  );
}
async function deleteDocuments(credentials, collection, filter, config, layer) {
  return flowstackFetch(
    "/collections/delete",
    {
      method: "POST",
      credentials,
      body: {
        collection,
        filter,
        ...layer ? { layer } : {}
      }
    },
    config
  );
}
function dmPairKey(a, b) {
  return [a, b].sort().join("::");
}
function requireAppScope(config) {
  const scope = config?.appScope;
  if (!scope) {
    throw new Error("Private messaging requires an app scope (built-app context).");
  }
  return scope;
}
async function listThreads(credentials, config) {
  const scope = requireAppScope(config);
  return flowstackFetch(
    `/apps/${encodeURIComponent(scope)}/threads`,
    { credentials },
    config
  );
}
async function listMessages(credentials, withUserKey, options, config) {
  const scope = requireAppScope(config);
  const params = new URLSearchParams();
  params.set("with", withUserKey);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);
  return flowstackFetch(
    `/apps/${encodeURIComponent(scope)}/messages?${params.toString()}`,
    { credentials },
    config
  );
}
async function sendMessage(credentials, toUserKey, body, config) {
  const scope = requireAppScope(config);
  return flowstackFetch(
    `/apps/${encodeURIComponent(scope)}/messages`,
    { method: "POST", credentials, body: { to_user_key: toUserKey, body } },
    config
  );
}
async function openThread(credentials, withUserKey, config) {
  const scope = requireAppScope(config);
  const me = credentials.userId;
  if (!me) throw new Error("openThread requires an authenticated user.");
  const pk = dmPairKey(me, withUserKey);
  return flowstackFetch(
    `/apps/${encodeURIComponent(scope)}/threads/${encodeURIComponent(pk)}/consent`,
    { method: "POST", credentials },
    config
  );
}
async function markMessageRead(credentials, messageId, config) {
  const scope = requireAppScope(config);
  return flowstackFetch(
    `/apps/${encodeURIComponent(scope)}/messages/${encodeURIComponent(messageId)}/read`,
    { method: "POST", credentials },
    config
  );
}
async function invokeTool(credentials, agentName, toolName, kwargs = {}, config) {
  return flowstackFetch(
    "/tool/invoke",
    {
      method: "POST",
      credentials,
      body: {
        agent_name: agentName,
        tool_name: toolName,
        kwargs
      }
    },
    config
  );
}
async function uploadFile(credentials, workspaceId, file, name, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspace_id", workspaceId);
  if (name) {
    formData.append("name", name);
    formData.append("dataset_name", name);
  }
  try {
    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${credentials.apiKey}`,
        "X-Tenant-ID": tenantId,
        "X-User-ID": credentials.userId || "",
        "X-Session-ID": workspaceId
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Upload failed"
    };
  }
}
async function uploadDocument(credentials, workspaceId, file, documentName, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspace_id", workspaceId);
  if (documentName) formData.append("document_name", documentName);
  try {
    const response = await fetch(`${baseUrl}/upload-document`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${credentials.apiKey}`,
        "X-Tenant-ID": tenantId,
        "X-User-ID": credentials.userId || "",
        "X-Session-ID": workspaceId
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, error: errorText };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Document upload failed"
    };
  }
}
async function login(email, password, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/auth/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config?.tenantId ? { "X-Tenant-ID": config.tenantId } : {}
      },
      body: JSON.stringify({
        email,
        password,
        ...config?.appScope ? { app_scope: config.appScope } : {}
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Login failed"
    };
  }
}
async function register(email, password, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/auth/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config?.tenantId ? { "X-Tenant-ID": config.tenantId } : {}
      },
      body: JSON.stringify({
        email,
        password,
        skip_email_verification: true,
        ...config?.appScope ? { app_scope: config.appScope } : {}
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Registration failed"
    };
  }
}
async function googleLogin(code, redirectUri, config) {
  const baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/auth/google/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config?.tenantId ? { "X-Tenant-ID": config.tenantId } : {}
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Google login failed"
    };
  }
}
async function listUsers(credentials, params, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.search) queryParams.set("search", params.search);
  if (params?.role) queryParams.set("role", params.role);
  if (params?.status) queryParams.set("status", params.status);
  if (params?.sortBy) queryParams.set("sort_by", params.sortBy);
  if (params?.sortOrder) queryParams.set("sort_order", params.sortOrder);
  const queryString = queryParams.toString();
  const endpoint = `/tenants/${tenantId}/users${queryString ? `?${queryString}` : ""}`;
  return flowstackFetch(endpoint, { credentials }, config);
}
async function getUser(credentials, userId, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, { credentials }, config);
}
async function updateUser(credentials, userId, updates, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, {
    method: "PATCH",
    credentials,
    body: updates
  }, config);
}
async function deleteUser(credentials, userId, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}`, {
    method: "DELETE",
    credentials
  }, config);
}
async function suspendUser(credentials, userId, reason, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/suspend`, {
    method: "POST",
    credentials,
    body: reason ? { reason } : void 0
  }, config);
}
async function reactivateUser(credentials, userId, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/reactivate`, {
    method: "POST",
    credentials
  }, config);
}
async function getUserActivity(credentials, userId, limit = 50, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/${userId}/activity?limit=${limit}`, {
    credentials
  }, config);
}
async function getUserStats(credentials, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/stats`, { credentials }, config);
}
async function checkAdminPermissions(credentials, config) {
  const tenantId = credentials.tenantId || config?.tenantId || DEFAULT_TENANT_ID;
  return flowstackFetch(`/tenants/${tenantId}/users/me/permissions`, { credentials }, config);
}
async function getConversationHistory(credentials, workspaceId, options, config) {
  const params = new URLSearchParams();
  params.set("session_id", workspaceId);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  return flowstackFetch(
    `/conversations?${params.toString()}`,
    { method: "GET", credentials },
    config
  );
}
async function listSites(credentials, config) {
  return flowstackFetch("/api/v1/sites", { method: "GET", credentials }, config);
}
async function getSite(credentials, siteId, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}`, { method: "GET", credentials }, config);
}
async function createSite(credentials, params, config) {
  return flowstackFetch("/api/v1/sites", {
    method: "POST",
    credentials,
    body: {
      site_name: params.name,
      site_type: params.siteType || "on_demand",
      description: params.description,
      files: params.files
    }
  }, config);
}
async function addSiteFile(credentials, siteId, filePath, content, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/files/${filePath}`, {
    method: "PUT",
    credentials,
    body: { content }
  }, config);
}
async function publishStagedSite(credentials, siteId, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/publish`, {
    method: "POST",
    credentials
  }, config);
}
async function deleteSite(credentials, siteId, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}`, {
    method: "DELETE",
    credentials
  }, config);
}
async function getSiteVersions(credentials, siteId, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/versions`, {
    method: "GET",
    credentials
  }, config);
}
async function promoteSiteVersion(credentials, siteId, version, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/promote`, {
    method: "POST",
    credentials,
    body: { version }
  }, config);
}
async function deleteSiteVersion(credentials, siteId, version, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/versions/${version}`, {
    method: "DELETE",
    credentials
  }, config);
}
async function setSiteAlias(credentials, siteId, alias, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/alias`, {
    method: "POST",
    credentials,
    body: { alias }
  }, config);
}
async function removeSiteAlias(credentials, siteId, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/alias`, {
    method: "DELETE",
    credentials
  }, config);
}
async function publishToGitHub(credentials, siteId, params, config) {
  return flowstackFetch(`/api/v1/sites/${siteId}/publish-github`, {
    method: "POST",
    credentials,
    body: {
      repo_name: params.repoName,
      private: params.isPrivate ?? true,
      ...params.version != null ? { version: params.version } : {}
    }
  }, config);
}
async function listGitHubRepos(credentials, config) {
  return flowstackFetch("/api/v1/github/repos", {
    credentials
  }, config);
}
async function importFromGitHub(credentials, params, config) {
  return flowstackFetch("/api/v1/github/import", {
    method: "POST",
    credentials,
    body: params
  }, config);
}
async function getPiiSettings(credentials, workspaceId, config) {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-settings`, {
    credentials
  }, config);
}
async function updatePiiSettings(credentials, workspaceId, settings, config) {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-settings`, {
    method: "PUT",
    credentials,
    body: settings
  }, config);
}
async function previewPiiMasking(credentials, query, config) {
  if (!credentials?.apiKey || credentials.apiKey.split(".").length !== 3) {
    return { ok: false, error: "Not authenticated", status: 401 };
  }
  return flowstackFetch("/stream/pii-preview", {
    method: "POST",
    credentials,
    body: { query }
  }, config);
}
async function getPiiAllowlist(credentials, workspaceId, config) {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    credentials
  }, config);
}
async function addPiiAllowlistTerm(credentials, workspaceId, term, entityType, config) {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    method: "POST",
    credentials,
    body: { term, entity_type: entityType }
  }, config);
}
async function removePiiAllowlistTerm(credentials, workspaceId, term, config) {
  return flowstackFetch(`/api/v1/workspaces/${workspaceId}/pii-allowlist`, {
    method: "DELETE",
    credentials,
    body: { term }
  }, config);
}
async function getUserDataOverview(credentials, config) {
  return flowstackFetch("/api/v1/user/data-overview", {
    credentials
  }, config);
}
async function getUserCollections(credentials, params, config) {
  const query = new URLSearchParams();
  if (params?.siteId) query.set("site_id", params.siteId);
  if (params?.includeSchema) query.set("include_schema", "true");
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections${qs ? `?${qs}` : ""}`, {
    credentials
  }, config);
}
async function getUserCollectionDocuments(credentials, collection, params, config) {
  const query = new URLSearchParams();
  if (params?.filter) query.set("filter", JSON.stringify(params.filter));
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.skip != null) query.set("skip", String(params.skip));
  if (params?.sort) query.set("sort", JSON.stringify(params.sort));
  if (params?.database) query.set("database", params.database);
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/documents${qs ? `?${qs}` : ""}`, {
    credentials
  }, config);
}
async function getUserCollectionSchema(credentials, collection, params, config) {
  const query = new URLSearchParams();
  if (params?.database) query.set("database", params.database);
  if (params?.sampleSize != null) query.set("sample_size", String(params.sampleSize));
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/schema${qs ? `?${qs}` : ""}`, {
    credentials
  }, config);
}
async function deleteUserCollection(credentials, collection, config) {
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}?confirm=true`, {
    method: "DELETE",
    credentials
  }, config);
}
async function exportUserCollection(credentials, collection, params, config) {
  const query = new URLSearchParams();
  if (params?.database) query.set("database", params.database);
  const qs = query.toString();
  return flowstackFetch(`/api/v1/user/collections/${encodeURIComponent(collection)}/export${qs ? `?${qs}` : ""}`, {
    method: "POST",
    credentials,
    body: {
      format: params?.format || "json",
      filter: params?.filter || null
    }
  }, config);
}

// src/utils/storage.ts
var CREDENTIALS_KEY = "flowstack_credentials";
var WORKSPACE_KEY = "flowstack_workspace";
var MESSAGES_KEY = "flowstack_messages";
function getStorage(type = "local") {
  if (typeof window === "undefined") return null;
  try {
    const storage = type === "local" ? window.localStorage : window.sessionStorage;
    storage.setItem("__test__", "__test__");
    storage.removeItem("__test__");
    return storage;
  } catch {
    console.warn(`[Storage] ${type}Storage not available`);
    return null;
  }
}
function getUserPrefix(credentials) {
  if (!credentials?.userId) return "";
  return `${credentials.userId.substring(0, 16)}:`;
}
function getScopedKey(baseKey, credentials) {
  return `${getUserPrefix(credentials)}${baseKey}`;
}
function saveCredentials(credentials, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    storage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error("[Storage] Failed to save credentials:", error);
  }
}
function loadCredentials(storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return null;
  try {
    const stored = storage.getItem(CREDENTIALS_KEY);
    if (!stored) return null;
    const credentials = JSON.parse(stored);
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        console.log("[Storage] Credentials expired, clearing");
        clearCredentials(storageType);
        return null;
      }
    }
    return credentials;
  } catch (error) {
    console.error("[Storage] Failed to load credentials:", error);
    return null;
  }
}
function clearCredentials(storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    storage.removeItem(CREDENTIALS_KEY);
  } catch (error) {
    console.error("[Storage] Failed to clear credentials:", error);
  }
}
function saveSelectedWorkspace(workspaceId, credentials, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    storage.setItem(key, workspaceId);
  } catch (error) {
    console.error("[Storage] Failed to save workspace:", error);
  }
}
function loadSelectedWorkspace(credentials, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return null;
  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    return storage.getItem(key);
  } catch (error) {
    console.error("[Storage] Failed to load workspace:", error);
    return null;
  }
}
function clearSelectedWorkspace(credentials, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const key = getScopedKey(WORKSPACE_KEY, credentials);
    storage.removeItem(key);
  } catch (error) {
    console.error("[Storage] Failed to clear workspace:", error);
  }
}
function saveMessages(messages, workspaceId, credentials, storageType = "session") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    const data = JSON.stringify(messages);
    try {
      storage.setItem(key, data);
    } catch (quotaError) {
      if (messages.length > 20) {
        const trimmed = messages.slice(-20);
        storage.setItem(key, JSON.stringify(trimmed));
      } else {
        for (let i = storage.length - 1; i >= 0; i--) {
          const k = storage.key(i);
          if (k && k.includes("flowstack")) storage.removeItem(k);
        }
        storage.setItem(key, data);
      }
    }
  } catch (error) {
  }
}
function loadMessages(workspaceId, credentials, storageType = "session") {
  const storage = getStorage(storageType);
  if (!storage) return [];
  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    const stored = storage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[Storage] Failed to load messages:", error);
    return [];
  }
}
function clearMessages(workspaceId, credentials, storageType = "session") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const key = getScopedKey(`${MESSAGES_KEY}:${workspaceId}`, credentials);
    storage.removeItem(key);
  } catch (error) {
    console.error("[Storage] Failed to clear messages:", error);
  }
}
function setItem(key, value, ttlMs, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const item = ttlMs ? { value, expiresAt: Date.now() + ttlMs } : { value };
    storage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`[Storage] Failed to set ${key}:`, error);
  }
}
function getItem(key, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return null;
  try {
    const stored = storage.getItem(key);
    if (!stored) return null;
    const item = JSON.parse(stored);
    if (item.expiresAt && Date.now() > item.expiresAt) {
      storage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    console.error(`[Storage] Failed to get ${key}:`, error);
    return null;
  }
}
function removeItem(key, storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
  }
}
function clearAllFlowstackData(storageType = "local") {
  const storage = getStorage(storageType);
  if (!storage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith("flowstack_") || key?.startsWith("privy:")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.error("[Storage] Failed to clear all data:", error);
  }
}

// src/mock/fixtures.ts
var mockCredentials = {
  apiKey: "mock_session_token_abc123",
  tenantId: "t_mock_tenant",
  userId: "user_mock_123",
  email: "demo@example.com",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
};
var mockUser = {
  id: "user_mock_123",
  email: "demo@example.com",
  tenantId: "t_mock_tenant",
  expiresAt: mockCredentials.expiresAt
};
var mockWorkspaces = [
  {
    workspaceId: "ws_demo_1",
    name: "Demo Workspace",
    description: "A demo workspace for testing",
    datasetCount: 3,
    visualizationCount: 5,
    modelCount: 1,
    createdAt: "2024-01-15T10:00:00Z",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    workspaceId: "ws_analytics",
    name: "Analytics Project",
    description: "Customer analytics and insights",
    datasetCount: 7,
    visualizationCount: 12,
    modelCount: 2,
    createdAt: "2024-02-20T14:30:00Z",
    lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    workspaceId: "ws_ml_project",
    name: "ML Experiments",
    description: "Machine learning model experiments",
    datasetCount: 5,
    visualizationCount: 8,
    modelCount: 4,
    createdAt: "2024-03-10T09:15:00Z",
    lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString()
  }
];
var mockDatasets = [
  {
    id: "ds_customers",
    name: "customers",
    rows: 1e4,
    columns: 12,
    columnNames: ["id", "name", "email", "created_at", "country", "segment", "revenue", "orders", "last_order", "lifetime_value", "churn_risk", "status"],
    schema: {
      id: { type: "string", nullable: false, unique: true },
      name: { type: "string", nullable: false },
      email: { type: "string", nullable: false },
      created_at: { type: "date", nullable: false },
      country: { type: "string", nullable: true },
      segment: { type: "string", nullable: true },
      revenue: { type: "number", nullable: false },
      orders: { type: "number", nullable: false },
      last_order: { type: "date", nullable: true },
      lifetime_value: { type: "number", nullable: false },
      churn_risk: { type: "number", nullable: true },
      status: { type: "string", nullable: false }
    },
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-03-15T08:00:00Z"
  },
  {
    id: "ds_orders",
    name: "orders",
    rows: 5e4,
    columns: 8,
    columnNames: ["order_id", "customer_id", "order_date", "total", "status", "items", "shipping_country", "payment_method"],
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-03-14T16:45:00Z"
  },
  {
    id: "ds_products",
    name: "products",
    rows: 500,
    columns: 10,
    columnNames: ["product_id", "name", "category", "price", "cost", "stock", "rating", "reviews", "created_at", "is_active"],
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-03-10T14:20:00Z"
  }
];
var mockVisualizations = [
  {
    name: "Revenue by Month",
    type: "line_chart",
    format: "png",
    createdAt: "2024-03-15T10:00:00Z",
    metadata: { xAxis: "month", yAxis: "revenue" }
  },
  {
    name: "Customer Segments",
    type: "pie_chart",
    format: "png",
    createdAt: "2024-03-14T15:30:00Z",
    metadata: { dimension: "segment", measure: "count" }
  },
  {
    name: "Orders Heatmap",
    type: "heatmap",
    format: "png",
    createdAt: "2024-03-13T11:45:00Z",
    metadata: { xAxis: "day_of_week", yAxis: "hour" }
  }
];
var mockDataSources = [
  {
    source_id: "src_mongodb_1",
    tenant_id: "t_mock_tenant",
    source_type: "mongodb",
    name: "Production MongoDB",
    auth_method: "connection_string",
    is_tenant_wide: true,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1e3,
    credentials_preview: { host: "mongodb.example.com", database: "production" }
  },
  {
    source_id: "src_postgres_1",
    tenant_id: "t_mock_tenant",
    source_type: "postgresql",
    name: "Analytics Database",
    auth_method: "connection_string",
    is_tenant_wide: false,
    user_id: "user_mock_123",
    created_at: Date.now() - 14 * 24 * 60 * 60 * 1e3,
    credentials_preview: { host: "pg.example.com", database: "analytics" }
  }
];
var mockChatHistory = [
  {
    id: "msg_1",
    role: "user",
    content: "What are my top customers by revenue?",
    timestamp: new Date(Date.now() - 5 * 60 * 1e3)
  },
  {
    id: "msg_2",
    role: "assistant",
    content: "I analyzed the customers dataset and found your top 10 customers by revenue. Here are the results:\n\n1. Acme Corp - $125,000\n2. TechStart Inc - $98,500\n3. Global Retail - $87,200\n...",
    timestamp: new Date(Date.now() - 4 * 60 * 1e3),
    toolCalls: [
      {
        id: "tool_1",
        name: "query_dataset",
        args: { dataset: "customers", query: "SELECT * FROM customers ORDER BY revenue DESC LIMIT 10" },
        result: { rows: 10 },
        status: "complete"
      }
    ]
  }
];
function generateMockId(prefix = "mock") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
function mockDelay(minMs = 100, maxMs = 500) {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
var mockManagedUsers = [
  {
    id: "user_mock_123",
    email: "demo@example.com",
    name: "Demo User",
    role: "owner",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-01-01T10:00:00Z",
    lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastActivityAt: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: { plan: "pro", company: "Demo Inc" }
  },
  {
    id: "user_admin_456",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-01-15T14:30:00Z",
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1e3).toISOString()
  },
  {
    id: "user_member_789",
    email: "member@example.com",
    name: "Team Member",
    role: "member",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-02-10T09:00:00Z",
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString(),
    lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    id: "user_suspended_101",
    email: "suspended@example.com",
    name: "Suspended User",
    role: "member",
    status: "suspended",
    tenantId: "t_mock_tenant",
    createdAt: "2024-02-20T11:00:00Z",
    lastLoginAt: "2024-03-01T08:00:00Z",
    metadata: { suspendReason: "Policy violation" }
  },
  {
    id: "user_pending_102",
    email: "pending@example.com",
    name: "New User",
    role: "viewer",
    status: "pending_verification",
    tenantId: "t_mock_tenant",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
  }
];
var mockUserStats = {
  totalUsers: 127,
  activeUsers: 98,
  usersByRole: {
    owner: 1,
    admin: 5,
    member: 85,
    viewer: 36
  },
  usersByStatus: {
    active: 98,
    suspended: 8,
    pending_verification: 15,
    deactivated: 6
  },
  newUsersThisMonth: 23,
  dailyActiveUsers: [45, 52, 48, 61, 55, 43, 38, 67, 72, 58, 63, 71, 65, 54]
};
var mockUserActivity = [
  {
    id: "act_1",
    userId: "user_mock_123",
    activityType: "login",
    description: "Logged in from Chrome on macOS",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "act_2",
    userId: "user_mock_123",
    activityType: "query_execute",
    description: 'Executed query: "Show top customers"',
    timestamp: new Date(Date.now() - 30 * 60 * 1e3).toISOString(),
    resourceType: "workspace",
    resourceId: "ws_demo_1"
  },
  {
    id: "act_3",
    userId: "user_mock_123",
    activityType: "dataset_upload",
    description: "Uploaded dataset: sales_data.csv",
    timestamp: new Date(Date.now() - 60 * 60 * 1e3).toISOString(),
    resourceType: "dataset",
    resourceId: "ds_sales"
  },
  {
    id: "act_4",
    userId: "user_mock_123",
    activityType: "workspace_create",
    description: "Created workspace: Analytics Project",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
    resourceType: "workspace",
    resourceId: "ws_analytics"
  },
  {
    id: "act_5",
    userId: "user_mock_123",
    activityType: "logout",
    description: "Logged out",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
  }
];
var DEFAULT_BASE_URL2 = "https://sage-api.flowstack.fun";
function normalizeWorkspace(ws) {
  return {
    workspaceId: ws.workspaceId || ws.workspace_id || ws.id || "",
    name: ws.name || "",
    description: ws.description,
    datasetCount: ws.datasetCount ?? ws.dataset_count ?? 0,
    visualizationCount: ws.visualizationCount ?? ws.visualization_count ?? 0,
    modelCount: ws.modelCount ?? ws.model_count ?? 0,
    createdAt: ws.createdAt || ws.created_at || "",
    lastAccessed: ws.lastAccessed || ws.last_accessed || ""
  };
}
function normalizeVisualization(v) {
  const meta = v.metadata || {};
  const imageUrl = v.presigned_url || meta.presigned_url || v.imageUrl || v.image_url || (v.url && !v.url.includes("s3.amazonaws.com") ? v.url : void 0) || (meta.url && !meta.url.includes("s3.amazonaws.com") ? meta.url : void 0) || meta.image_url || void 0;
  return {
    name: v.name || "",
    type: v.type || v.visualization_type || v.chart_type || meta.chart_type,
    imageUrl,
    imageBase64: v.imageBase64 || v.image_base64 || meta.image_base64,
    format: v.format || meta.format,
    createdAt: v.createdAt || v.created_at || meta.created_at,
    metadata: v.metadata
  };
}
function normalizeDataset(d) {
  const shape = d.shape || [];
  const colArray = Array.isArray(d.columns) ? d.columns : d.column_names || d.columns_list || [];
  const rowCount = d.rows ?? d.row_count ?? d.num_rows ?? d.size ?? (shape[0] || 0);
  const colCount = typeof d.columns === "number" ? d.columns : d.column_count ?? d.num_columns ?? shape[1] ?? colArray.length ?? 0;
  return {
    ...d,
    id: d.id || d.dataset_id,
    name: d.name || d.dataset_name || "",
    rows: rowCount,
    columns: colCount,
    columnNames: colArray,
    createdAt: d.createdAt || d.created_at,
    fileSize: d.fileSize || d.file_size || d.size,
    schema: d.schema || d.dtypes
  };
}
var FlowstackContext = createContext(null);
function extractTenantId(apiKey) {
  if (!apiKey || !apiKey.includes(".")) return void 0;
  try {
    const parts = apiKey.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.tenant_id) return String(payload.tenant_id);
    }
  } catch {
  }
  return void 0;
}
function isExpired(credentials) {
  if (!credentials.expiresAt) {
    if (credentials.apiKey.includes(".")) {
      try {
        const parts = credentials.apiKey.split(".");
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          return Date.now() > payload.exp * 1e3;
        }
      } catch {
        return false;
      }
    }
    return false;
  }
  const expiresAt = new Date(credentials.expiresAt);
  return expiresAt < /* @__PURE__ */ new Date();
}
function FlowstackProvider({
  children,
  config,
  privyAuthState
}) {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL2;
  const tenantId = config.tenantId || "";
  const isMockMode = config.mode === "mock";
  const [credentials, setCredentialsState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState({
    sessionId: null,
    workspaceId: null,
    isConnected: false,
    lastActivity: null
  });
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [queryStartTime, setQueryStartTime] = useState(null);
  const [datasets, setDatasetsState] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [visualizations, setVisualizationsState] = useState([]);
  const [isLoadingVisualizations, setIsLoadingVisualizations] = useState(false);
  const [reports, setReportsState] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [models, setModelsState] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [scripts, setScriptsState] = useState([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const clientConfig = { baseUrl, tenantId };
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (privyAuthState && !privyAuthState.ready) {
      return;
    }
    const stored = loadCredentials("session");
    if (!stored) {
      setIsInitialized(true);
      return;
    }
    if (isExpired(stored)) {
      clearCredentials("session");
      setIsInitialized(true);
      return;
    }
    if (config.appScope) {
      try {
        const _parts = stored.apiKey.split(".");
        const _payload = JSON.parse(atob(_parts[1]));
        const _tokenScope = _payload.app_scope ?? null;
        if (_tokenScope !== config.appScope) {
          clearCredentials("session");
          clearAllFlowstackData("session");
          setIsInitialized(true);
          return;
        }
      } catch {
        clearCredentials("session");
        setIsInitialized(true);
        return;
      }
    }
    if (privyAuthState && !privyAuthState.authenticated) {
      console.log("[FlowstackProvider] Privy session absent, clearing stale credentials");
      clearCredentials("session");
      clearAllFlowstackData("session");
      setIsInitialized(true);
      return;
    }
    setCredentialsState(stored);
    const workspaceId = loadSelectedWorkspace(stored, "local");
    if (workspaceId) {
      setSession((prev) => ({
        ...prev,
        sessionId: workspaceId,
        workspaceId,
        isConnected: true
      }));
    }
    setIsInitialized(true);
  }, [privyAuthState?.ready, privyAuthState?.authenticated]);
  const setCredentials = useCallback((creds) => {
    setCredentialsState(creds);
    if (creds) {
      const credsWithTenant = {
        ...creds,
        tenantId: creds.tenantId || extractTenantId(creds.apiKey) || tenantId
      };
      saveCredentials(credsWithTenant, "session");
    } else {
      clearCredentials("session");
    }
  }, [tenantId]);
  const logout = useCallback(() => {
    if (credentials) {
      clearSelectedWorkspace(credentials, "local");
      if (session.workspaceId) {
        clearMessages(session.workspaceId, credentials, "session");
      }
    }
    clearAllFlowstackData("local");
    clearAllFlowstackData("session");
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("flowstack:force_relogin", "1");
      }
    } catch {
    }
    setCredentialsState(null);
    setWorkspaces([]);
    setSelectedWorkspaceState(null);
    setMessages([]);
    setDatasetsState([]);
    setVisualizationsState([]);
    setReportsState([]);
    setModelsState([]);
    setSession({
      sessionId: null,
      workspaceId: null,
      isConnected: false,
      lastActivity: null
    });
  }, [credentials, session.workspaceId]);
  const refreshWorkspaces = useCallback(async () => {
    if (!credentials && !isMockMode) return;
    setIsLoadingWorkspaces(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setWorkspaces(mockWorkspaces);
        return;
      }
      const response = await listWorkspaces(credentials, 50, clientConfig);
      if (response.ok && response.data) {
        setWorkspaces(response.data.workspaces.map(normalizeWorkspace));
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh workspaces:", error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [credentials, clientConfig, isMockMode]);
  const createWorkspace2 = useCallback(async (name, description) => {
    if (!credentials && !isMockMode) return null;
    try {
      if (isMockMode) {
        await mockDelay();
        const newWorkspace = {
          workspaceId: generateMockId("ws"),
          name,
          description,
          datasetCount: 0,
          visualizationCount: 0,
          modelCount: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastAccessed: (/* @__PURE__ */ new Date()).toISOString()
        };
        setWorkspaces((prev) => [newWorkspace, ...prev]);
        return newWorkspace;
      }
      const response = await createWorkspace(credentials, name, description, clientConfig);
      if (response.ok && response.data) {
        const newWorkspace = normalizeWorkspace(response.data.workspace);
        setWorkspaces((prev) => [newWorkspace, ...prev]);
        return newWorkspace;
      }
      return null;
    } catch (error) {
      console.error("[Flowstack] Failed to create workspace:", error);
      return null;
    }
  }, [credentials, clientConfig, isMockMode]);
  const setSelectedWorkspace = useCallback((workspace) => {
    setSelectedWorkspaceState(workspace);
    if (workspace && credentials) {
      setSession((prev) => ({
        ...prev,
        sessionId: workspace.workspaceId,
        workspaceId: workspace.workspaceId,
        isConnected: true,
        lastActivity: /* @__PURE__ */ new Date()
      }));
      saveSelectedWorkspace(workspace.workspaceId, credentials, "local");
      const storedMessages = loadMessages(
        workspace.workspaceId,
        credentials,
        "session"
      );
      const fixedMessages = storedMessages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        isStreaming: false,
        content: m.isStreaming && !m.content?.trim() ? "*(Response interrupted)*" : m.content
      }));
      setMessages(fixedMessages);
      setDatasetsState([]);
      setVisualizationsState([]);
      setReportsState([]);
      setModelsState([]);
    } else {
      setSession((prev) => ({
        ...prev,
        sessionId: null,
        workspaceId: null,
        isConnected: false
      }));
      setMessages([]);
    }
  }, [credentials]);
  useEffect(() => {
    if ((credentials || isMockMode) && workspaces.length === 0 && isInitialized) {
      refreshWorkspaces();
    }
  }, [credentials, isInitialized, isMockMode]);
  useEffect(() => {
    if (!credentials && !isMockMode) return;
    if (selectedWorkspace) return;
    if (workspaces.length > 0) {
      const found = session.workspaceId ? workspaces.find((ws) => ws.workspaceId === session.workspaceId) : null;
      setSelectedWorkspace(found || workspaces[0]);
    } else if (workspaces.length === 0 && isInitialized && !isLoadingWorkspaces) {
      createWorkspace2("My Workspace", "Default workspace").then((ws) => {
        if (ws) setSelectedWorkspace(ws);
      });
    }
  }, [workspaces, session.workspaceId, selectedWorkspace, credentials, isMockMode, isInitialized, isLoadingWorkspaces]);
  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const updated = [...prev, message];
      if (!message.isStreaming && credentials && session.workspaceId) {
        saveMessages(updated, session.workspaceId, credentials, "session");
      }
      return updated;
    });
  }, [credentials, session.workspaceId]);
  const updateMessage = useCallback((id, updates) => {
    setMessages((prev) => {
      const updated = prev.map(
        (msg) => msg.id === id ? { ...msg, ...updates } : msg
      );
      if (updates.isStreaming === false && credentials && session.workspaceId) {
        saveMessages(updated, session.workspaceId, credentials, "session");
      }
      return updated;
    });
  }, [credentials, session.workspaceId]);
  const clearMessages2 = useCallback(() => {
    setMessages([]);
    if (credentials && session.workspaceId) {
      clearMessages(session.workspaceId, credentials, "session");
    }
  }, [credentials, session.workspaceId]);
  const setDatasets = useCallback((datasets2) => {
    setDatasetsState(datasets2);
  }, []);
  const refreshDatasets = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;
    setIsLoadingDatasets(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setDatasetsState(mockDatasets);
        return;
      }
      const response = await listDatasets(
        credentials,
        selectedWorkspace.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setDatasetsState(response.data.datasets.map(normalizeDataset));
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh datasets:", error);
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);
  const setVisualizations = useCallback((vizs) => {
    setVisualizationsState(vizs);
  }, []);
  const addVisualization = useCallback((viz) => {
    setVisualizationsState((prev) => {
      const exists = prev.some((v) => v.name === viz.name);
      if (exists) {
        return prev.map((v) => v.name === viz.name ? viz : v);
      }
      return [...prev, viz];
    });
  }, []);
  const refreshVisualizations = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;
    setIsLoadingVisualizations(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setVisualizationsState(mockVisualizations);
        return;
      }
      const response = await listVisualizations(
        credentials,
        selectedWorkspace.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        const apiVizs = response.data.visualizations.map(normalizeVisualization);
        setVisualizationsState((prev) => {
          const streamMap = new Map(prev.filter((v) => v.imageUrl || v.imageBase64).map((v) => [v.name, v]));
          return apiVizs.map((v) => {
            const streamed = streamMap.get(v.name);
            if (streamed && !v.imageUrl && !v.imageBase64) {
              return { ...v, imageUrl: streamed.imageUrl, imageBase64: streamed.imageBase64, format: streamed.format || v.format };
            }
            return v;
          });
        });
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh visualizations:", error);
    } finally {
      setIsLoadingVisualizations(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);
  const clearVisualizations = useCallback(() => {
    setVisualizationsState([]);
  }, []);
  const refreshReports = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;
    setIsLoadingReports(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setReportsState([]);
        return;
      }
      const response = await listReports(
        credentials,
        selectedWorkspace.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setReportsState(response.data.reports);
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh reports:", error);
    } finally {
      setIsLoadingReports(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);
  const refreshModels = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;
    setIsLoadingModels(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setModelsState([]);
        return;
      }
      const response = await listModels(
        credentials,
        selectedWorkspace.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setModelsState(response.data.models);
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);
  const refreshScripts = useCallback(async () => {
    if ((!credentials || !selectedWorkspace) && !isMockMode) return;
    setIsLoadingScripts(true);
    try {
      if (isMockMode) {
        await mockDelay();
        setScriptsState([]);
        return;
      }
      const response = await listScripts(
        credentials,
        selectedWorkspace.workspaceId,
        clientConfig
      );
      if (response.ok && response.data) {
        setScriptsState(response.data.scripts);
      }
    } catch (error) {
      console.error("[Flowstack] Failed to refresh scripts:", error);
    } finally {
      setIsLoadingScripts(false);
    }
  }, [credentials, selectedWorkspace, clientConfig, isMockMode]);
  useEffect(() => {
    if ((credentials || isMockMode) && selectedWorkspace) {
      const timer = setTimeout(() => {
        refreshDatasets();
        refreshVisualizations();
        refreshReports();
        refreshModels();
        refreshScripts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedWorkspace?.workspaceId, isMockMode]);
  const value = {
    // Config
    config,
    // Auth
    credentials,
    setCredentials,
    isAuthenticated: !!credentials,
    isInitialized,
    logout,
    // Session
    session,
    // Workspaces
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    refreshWorkspaces,
    createWorkspace: createWorkspace2,
    isLoadingWorkspaces,
    // Messages
    messages,
    addMessage,
    updateMessage,
    clearMessages: clearMessages2,
    // Query state
    isQueryRunning,
    setIsQueryRunning,
    queryStartTime,
    setQueryStartTime,
    // Datasets
    datasets,
    setDatasets,
    refreshDatasets,
    isLoadingDatasets,
    // Visualizations
    visualizations,
    setVisualizations,
    addVisualization,
    refreshVisualizations,
    isLoadingVisualizations,
    clearVisualizations,
    // Reports
    reports,
    refreshReports,
    isLoadingReports,
    // Models
    models,
    refreshModels,
    isLoadingModels,
    // Scripts
    scripts,
    refreshScripts,
    isLoadingScripts,
    // UI
    isSidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab
  };
  return /* @__PURE__ */ jsx(FlowstackContext.Provider, { value, children });
}
function useFlowstack() {
  const context = useContext(FlowstackContext);
  if (!context) {
    throw new Error("useFlowstack must be used within a FlowstackProvider");
  }
  return context;
}
function useFlowstackOptional() {
  return useContext(FlowstackContext);
}

// src/errors/codes.ts
var ErrorCodes = {
  // Configuration errors
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_MISSING_JWT_SECRET: "CONFIG_MISSING_JWT_SECRET",
  CONFIG_MISSING_PASSWORD_SECRET: "CONFIG_MISSING_PASSWORD_SECRET",
  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",
  // Authentication errors
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  AUTHENTICATION_EXPIRED: "AUTHENTICATION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  // Authorization errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  // Workspace errors
  WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND",
  WORKSPACE_REQUIRED: "WORKSPACE_REQUIRED",
  WORKSPACE_CREATE_FAILED: "WORKSPACE_CREATE_FAILED",
  // Dataset errors
  DATASET_NOT_FOUND: "DATASET_NOT_FOUND",
  DATASET_UPLOAD_FAILED: "DATASET_UPLOAD_FAILED",
  DATASET_DOWNLOAD_FAILED: "DATASET_DOWNLOAD_FAILED",
  DATASET_DELETE_FAILED: "DATASET_DELETE_FAILED",
  DATASET_TOO_LARGE: "DATASET_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  // Query/Agent errors
  QUERY_FAILED: "QUERY_FAILED",
  QUERY_TIMEOUT: "QUERY_TIMEOUT",
  QUERY_CANCELLED: "QUERY_CANCELLED",
  AGENT_ERROR: "AGENT_ERROR",
  STREAMING_ERROR: "STREAMING_ERROR",
  // Data source errors
  DATA_SOURCE_NOT_FOUND: "DATA_SOURCE_NOT_FOUND",
  DATA_SOURCE_CONNECTION_FAILED: "DATA_SOURCE_CONNECTION_FAILED",
  DATA_SOURCE_AUTH_FAILED: "DATA_SOURCE_AUTH_FAILED",
  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  CREDITS_EXHAUSTED: "CREDITS_EXHAUSTED",
  // Server errors
  SERVER_ERROR: "SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  MAINTENANCE_MODE: "MAINTENANCE_MODE",
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_EMAIL: "INVALID_EMAIL",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
};
var ErrorMessages = {
  [ErrorCodes.CONFIG_INVALID]: "Invalid SDK configuration",
  [ErrorCodes.CONFIG_MISSING_JWT_SECRET]: "JWT secret is required in configuration",
  [ErrorCodes.CONFIG_MISSING_PASSWORD_SECRET]: "Password secret is required in configuration",
  [ErrorCodes.NETWORK_ERROR]: "Unable to connect to the server",
  [ErrorCodes.NETWORK_TIMEOUT]: "Request timed out. Please try again",
  [ErrorCodes.NETWORK_OFFLINE]: "No internet connection",
  [ErrorCodes.AUTHENTICATION_FAILED]: "Authentication failed",
  [ErrorCodes.AUTHENTICATION_EXPIRED]: "Your session has expired. Please log in again",
  [ErrorCodes.INVALID_CREDENTIALS]: "Invalid email or password",
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: "Your account is not active. Please check your email for activation instructions",
  [ErrorCodes.ACCOUNT_LOCKED]: "Your account has been locked. Please contact support",
  [ErrorCodes.EMAIL_NOT_VERIFIED]: "Please verify your email address to continue",
  [ErrorCodes.UNAUTHORIZED]: "You are not authorized to perform this action",
  [ErrorCodes.FORBIDDEN]: "Access denied",
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: "You do not have permission to access this resource",
  [ErrorCodes.WORKSPACE_NOT_FOUND]: "Workspace not found",
  [ErrorCodes.WORKSPACE_REQUIRED]: "Please select a workspace to continue",
  [ErrorCodes.WORKSPACE_CREATE_FAILED]: "Failed to create workspace",
  [ErrorCodes.DATASET_NOT_FOUND]: "Dataset not found",
  [ErrorCodes.DATASET_UPLOAD_FAILED]: "Failed to upload dataset",
  [ErrorCodes.DATASET_DOWNLOAD_FAILED]: "Failed to download dataset",
  [ErrorCodes.DATASET_DELETE_FAILED]: "Failed to delete dataset",
  [ErrorCodes.DATASET_TOO_LARGE]: "Dataset exceeds maximum size limit",
  [ErrorCodes.INVALID_FILE_TYPE]: "Invalid file type",
  [ErrorCodes.QUERY_FAILED]: "Query failed",
  [ErrorCodes.QUERY_TIMEOUT]: "Query timed out. Please try a simpler request",
  [ErrorCodes.QUERY_CANCELLED]: "Query was cancelled",
  [ErrorCodes.AGENT_ERROR]: "AI agent encountered an error",
  [ErrorCodes.STREAMING_ERROR]: "Error in streaming response",
  [ErrorCodes.DATA_SOURCE_NOT_FOUND]: "Data source not found",
  [ErrorCodes.DATA_SOURCE_CONNECTION_FAILED]: "Failed to connect to data source",
  [ErrorCodes.DATA_SOURCE_AUTH_FAILED]: "Data source authentication failed",
  [ErrorCodes.RATE_LIMITED]: "Too many requests. Please slow down",
  [ErrorCodes.CREDITS_EXHAUSTED]: "You have run out of credits",
  [ErrorCodes.SERVER_ERROR]: "An unexpected server error occurred",
  [ErrorCodes.SERVICE_UNAVAILABLE]: "Service is temporarily unavailable",
  [ErrorCodes.MAINTENANCE_MODE]: "Service is under maintenance",
  [ErrorCodes.VALIDATION_ERROR]: "Validation error",
  [ErrorCodes.INVALID_EMAIL]: "Please enter a valid email address",
  [ErrorCodes.PASSWORD_TOO_SHORT]: "Password is too short",
  [ErrorCodes.MISSING_REQUIRED_FIELD]: "Required field is missing",
  [ErrorCodes.UNKNOWN_ERROR]: "An unexpected error occurred"
};
var RecoveryActions = {
  [ErrorCodes.NETWORK_ERROR]: "Check your internet connection and try again",
  [ErrorCodes.NETWORK_OFFLINE]: "Connect to the internet and try again",
  [ErrorCodes.AUTHENTICATION_EXPIRED]: "Log in again to continue",
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: "Check your email for the activation link",
  [ErrorCodes.EMAIL_NOT_VERIFIED]: "Check your email for the verification link",
  [ErrorCodes.WORKSPACE_REQUIRED]: "Select or create a workspace",
  [ErrorCodes.RATE_LIMITED]: "Wait a moment and try again",
  [ErrorCodes.CREDITS_EXHAUSTED]: "Upgrade your plan or wait for credits to reset"
};

// src/errors/index.ts
var FlowstackError = class _FlowstackError extends Error {
  constructor(code, message, options) {
    const finalMessage = message || ErrorMessages[code] || "An error occurred";
    super(finalMessage);
    this.name = "FlowstackError";
    this.code = code;
    this.userMessage = options?.userMessage || ErrorMessages[code] || finalMessage;
    this.recoveryAction = options?.recoveryAction || RecoveryActions[code];
    this.details = options?.details;
    this.status = options?.status;
    this.originalCause = options?.cause;
    Object.setPrototypeOf(this, _FlowstackError.prototype);
  }
  /**
   * Create a FlowstackError from an API response
   */
  static fromApiError(status, body) {
    const parsed = typeof body === "string" ? tryParseJSON(body) : body;
    const detail = parsed?.detail || parsed?.error || parsed?.message || "Request failed";
    const code = mapStatusToErrorCode(status, String(detail));
    return new _FlowstackError(code, String(detail), {
      status,
      details: typeof parsed === "object" && parsed !== null ? parsed : { raw: body }
    });
  }
  /**
   * Create a FlowstackError from a network error
   */
  static fromNetworkError(error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return new _FlowstackError(ErrorCodes.NETWORK_ERROR, "Failed to connect to server", {
        cause: error
      });
    }
    if (error.message.includes("timeout") || error.name === "AbortError") {
      return new _FlowstackError(ErrorCodes.NETWORK_TIMEOUT, "Request timed out", {
        cause: error
      });
    }
    return new _FlowstackError(ErrorCodes.NETWORK_ERROR, error.message, {
      cause: error
    });
  }
  /**
   * Create a FlowstackError from any error
   */
  static from(error) {
    if (error instanceof _FlowstackError) {
      return error;
    }
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("ECONNREFUSED")) {
        return _FlowstackError.fromNetworkError(error);
      }
      return new _FlowstackError(ErrorCodes.UNKNOWN_ERROR, error.message, {
        cause: error
      });
    }
    const message = typeof error === "string" ? error : "An unexpected error occurred";
    return new _FlowstackError(ErrorCodes.UNKNOWN_ERROR, message);
  }
  /**
   * Check if this error is retryable
   */
  isRetryable() {
    const retryableCodes = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.NETWORK_TIMEOUT,
      ErrorCodes.SERVER_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.RATE_LIMITED
    ];
    return retryableCodes.includes(this.code);
  }
  /**
   * Check if this error requires re-authentication
   */
  requiresReauth() {
    const reauthCodes = [
      ErrorCodes.AUTHENTICATION_EXPIRED,
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.INVALID_CREDENTIALS
    ];
    return reauthCodes.includes(this.code);
  }
  /**
   * Get a serializable representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoveryAction: this.recoveryAction,
      details: this.details,
      status: this.status
    };
  }
};
function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
function mapStatusToErrorCode(status, detail) {
  const lowerDetail = detail.toLowerCase();
  if (lowerDetail.includes("not active") || lowerDetail.includes("account not active")) {
    return ErrorCodes.ACCOUNT_NOT_ACTIVE;
  }
  if (lowerDetail.includes("not verified") || lowerDetail.includes("verify")) {
    return ErrorCodes.EMAIL_NOT_VERIFIED;
  }
  if (lowerDetail.includes("locked")) {
    return ErrorCodes.ACCOUNT_LOCKED;
  }
  if (lowerDetail.includes("rate limit") || lowerDetail.includes("too many")) {
    return ErrorCodes.RATE_LIMITED;
  }
  if (lowerDetail.includes("credit") || lowerDetail.includes("quota")) {
    return ErrorCodes.CREDITS_EXHAUSTED;
  }
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION_ERROR;
    case 401:
      return ErrorCodes.AUTHENTICATION_FAILED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.WORKSPACE_NOT_FOUND;
    case 408:
      return ErrorCodes.NETWORK_TIMEOUT;
    case 409:
      return ErrorCodes.VALIDATION_ERROR;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    case 500:
      return ErrorCodes.SERVER_ERROR;
    case 502:
    case 503:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    case 504:
      return ErrorCodes.NETWORK_TIMEOUT;
    default:
      return status >= 500 ? ErrorCodes.SERVER_ERROR : ErrorCodes.UNKNOWN_ERROR;
  }
}
function isFlowstackError(error) {
  return error instanceof FlowstackError;
}
async function withErrorHandling(fn, context) {
  try {
    return await fn();
  } catch (error) {
    const flowstackError = FlowstackError.from(error);
    if (context) {
      flowstackError.details = { ...flowstackError.details, context };
    }
    throw flowstackError;
  }
}

// src/config/validator.ts
function validateConfig(config) {
  const errors = [];
  const warnings = [];
  if (!config.jwtSecret) {
    errors.push(
      "Missing required: jwtSecret. This is needed to verify session tokens. Get your JWT secret from your dashboard or set via FLOWSTACK_JWT_SECRET env var."
    );
  } else if (config.jwtSecret.length < 32) {
    warnings.push(
      "jwtSecret is shorter than 32 characters. Consider using a longer secret for security."
    );
  }
  if (!config.passwordSecret) {
    errors.push(
      "Missing required: passwordSecret. This is needed for secure password hashing. Generate a unique secret or set via FLOWSTACK_PASSWORD_SECRET env var."
    );
  } else if (config.passwordSecret.length < 32) {
    warnings.push(
      "passwordSecret is shorter than 32 characters. Consider using a longer secret for security."
    );
  }
  if (!config.tenantId) {
    warnings.push(
      "No tenantId set. Fine for authenticated apps (tenant comes from the JWT). Required only if you use usePublicCollection (anonymous access)."
    );
  }
  if (!config.baseUrl) {
    warnings.push("No baseUrl provided. Using default Flowstack API URL.");
  }
  if (config.auth) {
    if (config.auth.providers.includes("google")) {
      if (!config.auth.googleClientId) {
        errors.push(
          "Google OAuth is enabled but googleClientId is missing. Get your client ID from the Google Cloud Console."
        );
      }
    }
    if (config.auth.passwordMinLength && config.auth.passwordMinLength < 8) {
      warnings.push(
        "passwordMinLength is less than 8. Consider requiring stronger passwords."
      );
    }
  }
  if (config.redis) {
    if (!config.redis.url) {
      errors.push("Redis config provided but url is missing.");
    }
    if (!config.redis.token) {
      errors.push("Redis config provided but token is missing.");
    }
  }
  if (config.database) {
    if (!config.database.supabaseUrl) {
      errors.push("Database config provided but supabaseUrl is missing.");
    }
    if (!config.database.supabaseKey) {
      errors.push("Database config provided but supabaseKey is missing.");
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function validateConfigOrThrow(config) {
  const result = validateConfig(config);
  if (!result.valid) {
    throw new FlowstackError(ErrorCodes.CONFIG_INVALID, result.errors.join("\n"), {
      userMessage: "SDK configuration is invalid. Check the console for details.",
      details: { errors: result.errors, warnings: result.warnings }
    });
  }
  result.warnings.forEach((warning) => {
    console.warn("[Flowstack]", warning);
  });
}
function isDevelopmentConfig(config) {
  return config.mode === "development" || config.mode === "mock" || typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}
function getConfigSummary(config) {
  return {
    mode: config.mode || "production",
    hasJwtSecret: !!config.jwtSecret,
    hasPasswordSecret: !!config.passwordSecret,
    tenantId: config.tenantId || "(from token)",
    baseUrl: config.baseUrl || "(default)",
    authProviders: config.auth?.providers || ["email"],
    hasRedis: !!config.redis,
    hasDatabase: !!config.database,
    storage: config.storage || "local"
  };
}
function useAuth() {
  const {
    credentials,
    setCredentials,
    isAuthenticated,
    logout: contextLogout,
    config
  } = useFlowstack();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope
  };
  const isMockMode = config.mode === "mock";
  const login2 = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await mockDelay(200, 600);
        const newCredentials = {
          ...mockCredentials,
          email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
        };
        setCredentials(newCredentials);
        return true;
      }
      const response = await login(email, password, clientConfig);
      if (response.ok && response.data) {
        const { session_token, user_id, access_token } = response.data;
        const newCredentials = {
          apiKey: access_token || session_token,
          // setCredentials derives tenant from the JWT; config is just a fallback.
          tenantId: config.tenantId || "",
          userId: user_id,
          email
        };
        setCredentials(newCredentials);
        return true;
      }
      setError(response.error || "Login failed");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config.tenantId, setCredentials, clientConfig, isMockMode]);
  const register2 = useCallback(async (email, password, _name) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await mockDelay(300, 800);
        return await login2(email, password);
      }
      const response = await register(email, password, clientConfig);
      if (response.ok && response.data) {
        if (response.data.session_token) {
          const newCredentials = {
            apiKey: response.data.session_token,
            // setCredentials derives tenant from the JWT; server/config are fallbacks.
            tenantId: response.data.tenant_id || config.tenantId || "",
            userId: response.data.user_id,
            email
          };
          setCredentials(newCredentials);
          return true;
        }
        if (response.data.user_id) {
          return await login2(email, password);
        }
        return true;
      }
      setError(response.error || "Registration failed");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login2, clientConfig, isMockMode]);
  const googleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const googleClientId = config.auth?.googleClientId;
      if (!googleClientId) {
        throw new Error("Google OAuth not configured");
      }
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const scope = "openid email profile";
      const state = crypto.randomUUID();
      sessionStorage.setItem("google_oauth_state", state);
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope,
        state,
        access_type: "offline",
        prompt: "consent"
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      setIsLoading(false);
    }
  }, [config.auth?.googleClientId]);
  const logout = useCallback(() => {
    setError(null);
    contextLogout();
  }, [contextLogout]);
  const refreshToken = useCallback(async () => {
    if (!credentials) return false;
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1e3;
      if (now < expiresAt - fiveMinutes) {
        return true;
      }
    }
    return !!credentials.apiKey;
  }, [credentials]);
  const user = useMemo(() => {
    if (!credentials) return null;
    return {
      id: credentials.userId || "",
      email: credentials.email || "",
      tenantId: credentials.tenantId,
      expiresAt: credentials.expiresAt
    };
  }, [credentials]);
  return {
    user,
    credentials,
    isAuthenticated,
    isLoading,
    error,
    login: login2,
    register: register2,
    googleSignIn,
    logout,
    refreshToken
  };
}
function useWorkspace() {
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    refreshWorkspaces: contextRefresh,
    createWorkspace: contextCreate,
    isLoadingWorkspaces
  } = useFlowstack();
  const [error, setError] = useState(null);
  const createWorkspace2 = useCallback(async (name, description) => {
    setError(null);
    try {
      const workspace = await contextCreate(name, description);
      if (!workspace) {
        setError("Failed to create workspace");
      }
      return workspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
      return null;
    }
  }, [contextCreate]);
  const selectWorkspace = useCallback((workspace) => {
    setError(null);
    setSelectedWorkspace(workspace);
  }, [setSelectedWorkspace]);
  const refreshWorkspaces = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh workspaces";
      setError(message);
    }
  }, [contextRefresh]);
  return {
    workspaces,
    selectedWorkspace,
    isLoading: isLoadingWorkspaces,
    error,
    createWorkspace: createWorkspace2,
    selectWorkspace,
    refreshWorkspaces
  };
}
function useDatasets() {
  const {
    credentials,
    selectedWorkspace,
    datasets,
    refreshDatasets: contextRefresh,
    isLoadingDatasets,
    config
  } = useFlowstack();
  const [error, setError] = useState(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const isMockMode = config.mode === "mock";
  const uploadDataset = useCallback(async (file, name) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return null;
    }
    if (!selectedWorkspace && !isMockMode) {
      setError("No workspace selected");
      return null;
    }
    try {
      if (isMockMode) {
        await mockDelay(500, 1500);
        const mockDataset = {
          id: generateMockId("ds"),
          name: name || file.name.replace(/\.[^/.]+$/, ""),
          rows: Math.floor(Math.random() * 1e4) + 100,
          columns: Math.floor(Math.random() * 20) + 3,
          columnNames: ["col1", "col2", "col3"],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await contextRefresh();
        return mockDataset;
      }
      const response = await uploadFile(
        credentials,
        selectedWorkspace.workspaceId,
        file,
        name,
        clientConfig
      );
      if (response.ok && response.data?.dataset) {
        await contextRefresh();
        return response.data.dataset;
      }
      setError(response.error || "Upload failed");
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    }
  }, [credentials, selectedWorkspace, clientConfig, contextRefresh, isMockMode]);
  const downloadDataset = useCallback(async (name) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return null;
    }
    if (!selectedWorkspace && !isMockMode) {
      setError("No workspace selected");
      return null;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 500);
        const mockCsv = "id,name,value\n1,Item A,100\n2,Item B,200\n3,Item C,300";
        return new Blob([mockCsv], { type: "text/csv" });
      }
      const baseUrl = config.baseUrl || "https://sage-api.flowstack.fun";
      const tenantId = credentials.tenantId || config.tenantId || "";
      const url = `${baseUrl}/datasets/${name}/download`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${credentials.apiKey}`,
          "X-Tenant-ID": tenantId,
          "X-User-ID": credentials.userId || ""
        }
      });
      if (!response.ok) {
        setError(`Download failed: ${response.statusText}`);
        return null;
      }
      return await response.blob();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
      return null;
    }
  }, [credentials, selectedWorkspace, config, isMockMode]);
  const deleteDataset2 = useCallback(async (name) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return false;
    }
    if (!selectedWorkspace && !isMockMode) {
      setError("No workspace selected");
      return false;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 500);
        await contextRefresh();
        return true;
      }
      const response = await deleteDataset(
        credentials,
        name,
        clientConfig
      );
      if (response.ok) {
        await contextRefresh();
        return true;
      }
      setError(response.error || "Delete failed");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      return false;
    }
  }, [credentials, selectedWorkspace, clientConfig, contextRefresh, isMockMode]);
  const refreshDatasets = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
    }
  }, [contextRefresh]);
  return {
    datasets,
    isLoading: isLoadingDatasets,
    error,
    uploadDataset,
    downloadDataset,
    deleteDataset: deleteDataset2,
    refreshDatasets
  };
}
function useVisualizations() {
  const {
    visualizations,
    refreshVisualizations: contextRefresh,
    isLoadingVisualizations
  } = useFlowstack();
  const [error, setError] = useState(null);
  const refreshVisualizations = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
    }
  }, [contextRefresh]);
  return {
    visualizations,
    isLoading: isLoadingVisualizations,
    error,
    refreshVisualizations
  };
}
function useReports() {
  const {
    credentials,
    reports,
    refreshReports: contextRefresh,
    isLoadingReports,
    config
  } = useFlowstack();
  const [error, setError] = useState(null);
  const uploadReport = useCallback(async (_file, _name) => {
    setError(null);
    setError("Report upload not implemented");
    return null;
  }, []);
  const downloadReport = useCallback(async (url, _name, _format) => {
    setError(null);
    if (!credentials) {
      setError("Not authenticated");
      return null;
    }
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${credentials.apiKey}`,
          "X-Tenant-ID": credentials.tenantId,
          "X-User-ID": credentials.userId || ""
        }
      });
      if (!response.ok) {
        setError(`Download failed: ${response.statusText}`);
        return null;
      }
      return await response.blob();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
      return null;
    }
  }, [credentials]);
  const refreshReports = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
    }
  }, [contextRefresh]);
  return {
    reports,
    isLoading: isLoadingReports,
    error,
    uploadReport,
    downloadReport,
    refreshReports
  };
}
function useModels() {
  const {
    credentials,
    selectedWorkspace,
    models,
    refreshModels: contextRefresh,
    isLoadingModels,
    config
  } = useFlowstack();
  const [error, setError] = useState(null);
  const downloadModel = useCallback(async (name) => {
    setError(null);
    if (!credentials) {
      setError("Not authenticated");
      return null;
    }
    if (!selectedWorkspace) {
      setError("No workspace selected");
      return null;
    }
    try {
      const model = models.find((m) => m.name === name);
      if (!model?.download_url) {
        setError("Model download URL not available");
        return null;
      }
      const response = await fetch(model.download_url, {
        headers: {
          "Authorization": `Bearer ${credentials.apiKey}`,
          "X-Tenant-ID": credentials.tenantId,
          "X-User-ID": credentials.userId || ""
        }
      });
      if (!response.ok) {
        setError(`Download failed: ${response.statusText}`);
        return null;
      }
      return await response.blob();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
      return null;
    }
  }, [credentials, selectedWorkspace, models]);
  const refreshModels = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setError(message);
    }
  }, [contextRefresh]);
  return {
    models,
    isLoading: isLoadingModels,
    error,
    downloadModel,
    refreshModels
  };
}
function useDataSources(options) {
  const {
    credentials,
    config
  } = useFlowstack();
  const [dataSources, setDataSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const includeProvenance = options?.includeProvenance;
  const refreshDataSources = useCallback(async () => {
    if (!credentials) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listDataSources(credentials, clientConfig, { includeProvenance });
      if (response.ok && response.data) {
        setDataSources(response.data.datasources || []);
      } else {
        setError(response.error || "Failed to load data sources");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data sources";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, clientConfig, includeProvenance]);
  useEffect(() => {
    if (credentials) {
      refreshDataSources();
    }
  }, [credentials]);
  const createDataSource2 = useCallback(async (sourceConfig) => {
    setError(null);
    if (!credentials) {
      setError("Not authenticated");
      return null;
    }
    try {
      const response = await createDataSource(credentials, sourceConfig, clientConfig);
      if (response.ok && response.data) {
        await refreshDataSources();
        return response.data;
      }
      setError(response.error || "Failed to create data source");
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create data source";
      setError(message);
      return null;
    }
  }, [credentials, clientConfig, refreshDataSources]);
  const testConnection = useCallback(async (id) => {
    setError(null);
    if (!credentials) {
      return { success: false, message: "Not authenticated" };
    }
    try {
      const response = await testDataSource(credentials, id, clientConfig);
      if (response.ok && response.data) {
        return response.data;
      }
      return { success: false, message: response.error || "Connection test failed" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection test failed";
      return { success: false, message };
    }
  }, [credentials, clientConfig]);
  const deleteDataSource2 = useCallback(async (id) => {
    setError(null);
    if (!credentials) {
      setError("Not authenticated");
      return false;
    }
    try {
      const response = await deleteDataSource(credentials, id, clientConfig);
      if (response.ok) {
        await refreshDataSources();
        return true;
      }
      setError(response.error || "Failed to delete data source");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete data source";
      setError(message);
      return false;
    }
  }, [credentials, clientConfig, refreshDataSources]);
  return {
    dataSources,
    isLoading,
    error,
    createDataSource: createDataSource2,
    testConnection,
    deleteDataSource: deleteDataSource2,
    refreshDataSources
  };
}

// src/utils/sse-parser.ts
function parseSSELine(line) {
  if (!line || line.startsWith(":")) {
    return null;
  }
  if (line.startsWith("data: ")) {
    const data = line.slice(6);
    if (data === "[DONE]") {
      return { type: "done" };
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeEvent(parsed);
    } catch {
      return { type: "content", content: data };
    }
  }
  if (line.startsWith("event: ")) {
    const eventType = line.slice(7);
    return { type: eventType };
  }
  return null;
}
function normalizeEvent(data) {
  if (data.type) {
    return {
      type: normalizeEventType(String(data.type)),
      content: data.content,
      tool: data.tool || data.name,
      toolUseId: data.tool_use_id || data.toolUseId || data.id,
      args: data.args || data.input,
      result: data.result,
      // P0-132 (G1): preserve the tool_result error flag (backend key: `is_error`).
      isError: data.is_error ?? data.isError,
      error: data.error,
      data: data.data,
      message: data.message,
      percentage: data.percentage
    };
  }
  if (data.delta) {
    const delta = data.delta;
    if (delta.type === "text_delta") {
      return { type: "text", content: delta.text };
    }
    if (delta.type === "input_json_delta") {
      return { type: "tool_use", args: { partial: delta.partial_json } };
    }
    if (delta.text) {
      return { type: "delta", content: delta.text };
    }
  }
  if (data.content_block) {
    const block = data.content_block;
    if (block.type === "text") {
      return { type: "text", content: block.text };
    }
    if (block.type === "tool_use") {
      return {
        type: "tool_use",
        tool: block.name,
        args: block.input
      };
    }
  }
  if (data.tool_use_id || data.tool_name || data.name) {
    return {
      type: data.content || data.output ? "tool_result" : "tool_use",
      tool: data.tool_name || data.name,
      toolUseId: data.tool_use_id || data.id,
      args: data.input || data.args,
      result: data.content || data.output,
      // P0-132 (G1): preserve the tool_result error flag (backend key: `is_error`).
      isError: data.is_error ?? data.isError
    };
  }
  if (data.text || data.content) {
    return { type: "text", content: data.text || data.content };
  }
  if (data.error) {
    return { type: "error", error: data.error };
  }
  if (data.visualization || data.image_url || data.imageUrl) {
    return {
      type: "visualization",
      data: data.visualization || {
        imageUrl: data.image_url || data.imageUrl,
        name: data.name,
        format: data.format
      }
    };
  }
  if (data.credits !== void 0 || data.remaining !== void 0) {
    return {
      type: "credit_status",
      data: {
        remaining: data.credits ?? data.remaining,
        used: data.used
      }
    };
  }
  if (data.step || data.progress || data.percentage !== void 0) {
    return {
      type: "progress",
      message: data.step || data.progress,
      percentage: data.percentage
    };
  }
  return { type: "content", data };
}
function normalizeEventType(type) {
  const typeMap = {
    // Text streaming
    "text": "text",
    // Final accumulated text (v2: event: text)
    "delta": "delta",
    // Incremental token (v2: event: delta)
    "content": "content",
    // Generic content
    "content_block_delta": "delta",
    // Anthropic raw format → delta
    // Tool lifecycle
    "tool_use": "tool_use",
    // Tool invocation start
    "tool_call": "tool_call",
    // V2 tool call with name + args
    "tool_result": "tool_result",
    // Tool execution result
    // Data events
    "visualization": "visualization",
    "viz": "visualization",
    // Shorthand alias
    // Progress
    "progress": "progress",
    "step": "progress",
    // Step-based progress alias
    // Billing
    "credit_status": "credit_status",
    "credits": "credit_status",
    // Shorthand alias
    // P0-66: per-query execution budget snapshot (time/tool/cost)
    "budget_update": "budget_update",
    // Stream lifecycle
    "metadata": "metadata",
    // V2 metadata with session info + data sources
    "complete": "complete",
    // V2 stream end event
    "done": "done",
    // OpenAI-style stream end
    "message_stop": "done",
    // Anthropic raw format → done
    // Interrupt
    "interrupt": "interrupt",
    // Errors
    "error": "error"
  };
  return typeMap[type.toLowerCase()] || "content";
}
async function* parseSSEStream(reader) {
  const decoder = new TextDecoder();
  let buffer = "";
  let pendingEventType = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("event: ")) {
          pendingEventType = trimmed.slice(7);
          continue;
        }
        const event = parseSSELine(trimmed);
        if (event) {
          if (pendingEventType) {
            event.type = normalizeEventType(pendingEventType);
            pendingEventType = null;
          }
          yield event;
          if (event.type === "done" || event.type === "complete") {
            return;
          }
        }
      }
    }
    if (buffer.trim()) {
      const event = parseSSELine(buffer.trim());
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
async function processSSEStream(response, onEvent, onError) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }
  try {
    for await (const event of parseSSEStream(reader)) {
      onEvent(event);
    }
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    } else {
      throw error;
    }
  }
}

// src/utils/stream-utils.ts
function isJsonBlob(s) {
  const t = s.trimStart();
  return t.startsWith('{"') || t.startsWith("[{") || t.startsWith('["');
}
function summarizeJsonEvent(raw, tool) {
  try {
    const d = JSON.parse(raw);
    if (d.status === "success" && d.count !== void 0) {
      return `Found ${d.count} dataset${d.count !== 1 ? "s" : ""}${d.query ? ` for "${d.query}"` : ""}`;
    }
    if (d.status === "progress" && d.message) {
      return typeof d.message === "string" ? d.message : null;
    }
    const msg = d.message || d.description || d.status;
    if (typeof msg === "string" && msg.length < 120) {
      return tool ? `${tool}: ${msg}` : msg;
    }
    if (Array.isArray(d) && d.length > 0) {
      return `Received ${d.length} result${d.length !== 1 ? "s" : ""}`;
    }
    return tool ? `${tool} processing...` : null;
  } catch {
    return null;
  }
}
function isSeparatorRow(line) {
  return /^\|[\s:-]*-{2,}[\s|:-]*\|?$/.test(line.trim());
}
function repairTables(text) {
  if (!text.includes("|")) return text;
  let s = text;
  s = s.replace(/^(\|[^\n]*\|)$/gm, (line) => {
    const cells = line.split("|").slice(1);
    if (cells.length > 0 && !cells[cells.length - 1].trim()) cells.pop();
    if (cells.length < 6) return line;
    const isSep = cells.map((c) => /^\s*:?-{2,}:?\s*$/.test(c));
    let sepStart = -1;
    let sepLen = 0;
    for (let i2 = 0; i2 < isSep.length; i2++) {
      if (isSep[i2]) {
        if (sepStart === -1) sepStart = i2;
        sepLen++;
      } else if (sepStart !== -1) break;
    }
    if (sepLen < 2 || sepStart < sepLen) return line;
    const cols = sepLen;
    if (sepStart !== cols) return line;
    const dataCells = cells.slice(sepStart + cols);
    if (dataCells.length < cols) return line;
    const header = "| " + cells.slice(0, cols).map((c) => c.trim()).join(" | ") + " |";
    const sep = "| " + cells.slice(sepStart, sepStart + cols).map((c) => c.trim()).join(" | ") + " |";
    const rows = [];
    for (let i2 = 0; i2 < dataCells.length; i2 += cols) {
      const chunk = dataCells.slice(i2, i2 + cols);
      if (chunk.length === cols) {
        rows.push("| " + chunk.map((c) => c.trim()).join(" | ") + " |");
      } else if (chunk.some((c) => c.trim())) {
        while (chunk.length < cols) chunk.push(" ");
        rows.push("| " + chunk.map((c) => c.trim()).join(" | ") + " |");
      }
    }
    return [header, sep, ...rows].join("\n");
  });
  s = s.replace(
    /^(\|[^|\n]+(?:\|[^|\n]+)*\|)\s*---[-|\s]*$/gm,
    (match, captured) => {
      const cells = captured.split("|").filter((c) => c.trim());
      if (cells.every((c) => /^[\s:-]*-{2,}[\s:-]*$/.test(c))) return match;
      return captured;
    }
  );
  s = s.replace(
    /^(\|[^|\n]+(?:\|[^|\n]+)*)\|\s*\|---\n(?:[-|\s]*\n)*/gm,
    (match, headerPart) => {
      const cols = (headerPart.match(/\|/g) || []).length;
      if (cols < 1) return match;
      return headerPart + "|\n|" + Array(cols).fill(" --- ").join("|") + "|\n";
    }
  );
  s = s.replace(/\|\s*\|(?=\s*[^\s|])/g, "|\n|");
  s = s.replace(/^-+\|[-|\s]*$/gm, "");
  s = s.replace(/^[-|\s]*\|---[-|\s]*$/gm, "");
  s = s.replace(/^\|\s*$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  const lines = s.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if ((line.match(/\|/g) || []).length >= 2 && !isSeparatorRow(line)) {
      const tableLines = [line];
      let hasSeparator = false;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if ((next.match(/\|/g) || []).length >= 2 || isSeparatorRow(next)) {
          if (isSeparatorRow(next)) hasSeparator = true;
          tableLines.push(next);
          j++;
        } else if (next.trim() === "") {
          if (j + 1 < lines.length && (lines[j + 1].match(/\|/g) || []).length >= 2) {
            tableLines.push(next);
            j++;
          } else break;
        } else break;
      }
      const headerCols = (tableLines[0].match(/\|/g) || []).length - 1;
      const expanded = [];
      for (const tl of tableLines) {
        if (tl.trim() === "") continue;
        if (isSeparatorRow(tl) || headerCols < 2) {
          expanded.push(tl);
          continue;
        }
        const rowPipes = (tl.match(/\|/g) || []).length - 1;
        if (rowPipes > headerCols && rowPipes >= headerCols * 2) {
          const cells = tl.split("|");
          const inner = cells.slice(1, -1);
          for (let c = 0; c < inner.length; c += headerCols) {
            const chunk = inner.slice(c, c + headerCols);
            if (chunk.length === headerCols) {
              expanded.push("|" + chunk.join("|") + "|");
            } else if (chunk.some((cell) => cell.trim())) {
              while (chunk.length < headerCols) chunk.push(" ");
              expanded.push("|" + chunk.join("|") + "|");
            }
          }
        } else {
          expanded.push(tl);
        }
      }
      if (!hasSeparator && expanded.length >= 2 && headerCols >= 2) {
        const sep = "|" + Array(headerCols).fill(" --- ").join("|") + "|";
        result.push(expanded[0], sep);
        for (let k = 1; k < expanded.length; k++) result.push(expanded[k]);
      } else if (hasSeparator && headerCols >= 2) {
        for (const tl of expanded) {
          if (isSeparatorRow(tl)) {
            const sepCols = (tl.match(/\|/g) || []).length - 1;
            result.push(sepCols !== headerCols ? "|" + Array(headerCols).fill(" --- ").join("|") + "|" : tl);
          } else {
            result.push(tl);
          }
        }
      } else {
        result.push(...expanded);
      }
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }
  s = result.join("\n");
  s = s.replace(/([^\n])\n(\|[^\n]*\|[^\n]*\n\|[\s|:-]+\|)/g, "$1\n\n$2");
  return s;
}
function unflattenMarkdownTables(content) {
  if (!content) return content;
  if (!content.includes("|")) return content;
  if (!/\|\s*:?-{3,}:?\s*\|/.test(content)) return content;
  const lines = content.split("\n");
  const rewritten = lines.map((line) => {
    if (!/\|\s*:?-{3,}:?\s*\|/.test(line)) return line;
    const rebuilt = line.replace(/ \| \| /g, " |\n| ");
    if (rebuilt === line) return line;
    const firstPipe = rebuilt.indexOf("|");
    if (firstPipe > 0) {
      const lead = rebuilt.slice(0, firstPipe).trimEnd();
      const table = rebuilt.slice(firstPipe);
      return lead ? `${lead}

${table}` : table;
    }
    return rebuilt;
  });
  return rewritten.join("\n");
}
function cleanContent(text) {
  if (!text) return text;
  let cleaned = text;
  cleaned = cleaned.replace(/Visualization URL:\s*https?:\/\/[^\s)]+/gi, "");
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*s3\.amazonaws\.com[^)]*\)/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*X-Amz[^)]*\)/g, "$1");
  cleaned = cleaned.replace(/https?:\/\/[^\s)]*\.s3\.amazonaws\.com\/[^\s)]*\?X-Amz[^\s)]*/g, "");
  cleaned = cleaned.replace(/https?\s*:\s*\/\s*\/[^)]*s\s*3\s*\.\s*amazonaws\s*\.\s*com[^)\n]*(?:\)|$)/gm, "");
  cleaned = cleaned.replace(/^\s*(?:&?X\s*-\s*Amz\s*-\s*\w+=[^\n]*)+\s*$/gm, "");
  cleaned = cleaned.replace(/^[A-Za-z0-9%+/=\s]{20,}$/gm, (line) => {
    if (line.includes("|")) return line;
    const alphaPercent = (line.match(/[A-Za-z0-9%+/=]/g) || []).length;
    return alphaPercent / line.length > 0.85 ? "" : line;
  });
  cleaned = cleaned.replace(/\{"status"\s*:\s*"[^"]*"[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, "");
  cleaned = cleaned.replace(/(?:complete|success|error)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, "");
  cleaned = cleaned.replace(/\[\s*\{[^[\]]*(?:\[[^\]]*\][^[\]]*)*\}\s*(?:,\s*\{[^[\]]*\}\s*)*\]/g, "");
  cleaned = cleaned.replace(/\[?\d+ rows? x \d+ columns?\]?\s*/g, "");
  cleaned = cleaned.replace(/^.*(?:NaN\s+){3,}.*$/gm, "");
  cleaned = cleaned.replace(/[\d.]+ MB \(streaming[^)]*\)/g, "");
  cleaned = cleaned.replace(/,"?error"?\s*:\s*null[^}\n]*/g, "");
  cleaned = cleaned.replace(/(?:Let me|Now let me|I'll|I will)\s+(?:start|begin|continue|retrieve|get|run|perform|compile|hand off|create|check|explore)[^.:\n]*[.:]\s*/gi, "");
  cleaned = cleaned.replace(/(?:Great|Perfect|Excellent|Wonderful)!\s*/g, "");
  cleaned = cleaned.replace(/Now\s+[a-z][^.:]*[.:]\s*/g, "");
  cleaned = repairTables(cleaned);
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  return cleaned.trim();
}
function parseErrorMessage(raw) {
  let msg = raw;
  let isAuth = false;
  let isContextLimit = false;
  try {
    const parsed = JSON.parse(raw);
    msg = parsed.error || parsed.detail || parsed.message || raw;
  } catch {
  }
  if (/token.*expired|unauthorized|401|403|permission denied|invalid.*token|auth.*required/i.test(msg)) {
    isAuth = true;
    msg = "Session expired \u2014 tap Reconnect to continue.";
  }
  if (/context.*limit|too many tokens|max.*context|prompt.*too.*long/i.test(msg)) {
    isContextLimit = true;
    msg = "Conversation got too long. Starting fresh on next message.";
  }
  if (msg.length > 200) {
    msg = msg.substring(0, 197) + "...";
  }
  return { message: msg, isAuth, isContextLimit };
}
var COLLECTION_CHANGED_EVENT = "flowstack:collection-changed";
function dispatchCollectionChanged(collection) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COLLECTION_CHANGED_EVENT, { detail: { collection } })
    );
  }
}
function useCollection(collection, options) {
  const { credentials, config } = useFlowstack();
  const [documents, setDocuments] = useState([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const enabled = options?.enabled !== false;
  const fetchData = useCallback(async () => {
    if (!credentials || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryCollection(
        credentials,
        collection,
        {
          filter: options?.filter,
          limit: options?.limit,
          skip: options?.skip,
          sort: options?.sort,
          projection: options?.projection,
          layer: options?.layer,
          includeProvenance: options?.includeProvenance
        },
        { baseUrl: config.baseUrl, tenantId: config.tenantId }
      );
      if (!mountedRef.current) return;
      if (result.ok && result.data) {
        setDocuments(result.data.documents);
        setCount(result.data.count);
        setTotal(result.data.total);
      } else {
        setError(result.error || "Failed to fetch collection");
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "Network error");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    credentials,
    config.baseUrl,
    config.tenantId,
    collection,
    enabled,
    // Serialize options for dependency comparison
    JSON.stringify(options?.filter),
    options?.limit,
    options?.skip,
    JSON.stringify(options?.sort),
    JSON.stringify(options?.projection),
    options?.layer
  ]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    const interval = setInterval(fetchData, options.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refreshInterval, enabled]);
  useEffect(() => {
    if (!options?.refreshOnAgentComplete) return;
    const handler = (e) => {
      const detail = e?.detail;
      if (!detail?.collection || detail.collection === collection) {
        fetchData();
      }
    };
    window.addEventListener(COLLECTION_CHANGED_EVENT, handler);
    return () => window.removeEventListener(COLLECTION_CHANGED_EVENT, handler);
  }, [fetchData, options?.refreshOnAgentComplete, collection]);
  const insert = useCallback(async (doc) => {
    if (!credentials) throw new Error("Not authenticated");
    const result = await insertDocuments(
      credentials,
      collection,
      doc,
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer
    );
    if (!result.ok) {
      throw new Error(result.error || "Insert failed");
    }
    dispatchCollectionChanged(collection);
    await fetchData();
    return { inserted_ids: result.data.inserted_ids };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);
  const update = useCallback(async (filter, updateSpec, opts) => {
    if (!credentials) throw new Error("Not authenticated");
    const result = await updateDocuments(
      credentials,
      collection,
      filter,
      updateSpec,
      opts,
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer
    );
    if (!result.ok) {
      throw new Error(result.error || "Update failed");
    }
    dispatchCollectionChanged(collection);
    await fetchData();
    return { modified_count: result.data.modified_count };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);
  const remove = useCallback(async (filter) => {
    if (!credentials) throw new Error("Not authenticated");
    const result = await deleteDocuments(
      credentials,
      collection,
      filter,
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer
    );
    if (!result.ok) {
      throw new Error(result.error || "Delete failed");
    }
    dispatchCollectionChanged(collection);
    await fetchData();
    return { deleted_count: result.data.deleted_count };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);
  return {
    documents,
    count,
    total,
    isLoading,
    error,
    refresh: fetchData,
    insert,
    update,
    remove
  };
}

// src/hooks/useAgent.ts
var COLLECTION_WRITE_TOOLS = /* @__PURE__ */ new Set([
  "insert_documents",
  "update_documents",
  "delete_documents",
  "insert_app_data",
  "update_app_data",
  "delete_app_data",
  // legacy aliases
  "mongodb_insert",
  "mongodb_update",
  "mongodb_delete"
]);
var TEMPLATE_SYSTEM_PROMPTS = {
  "data-science": `You are a data analyst specializing in exploratory data analysis.
Focus on:
- Statistical summaries and distributions
- Identifying patterns, correlations, and anomalies
- Providing actionable insights with supporting evidence
- Creating clear visualizations when helpful

Always explain your methodology and confidence levels.`,
  "marketing": `You are a content strategist and copywriter.
Focus on:
- Clear, engaging writing tailored to the audience
- SEO optimization where appropriate
- Consistent brand voice and messaging
- Actionable calls-to-action

Always ask about target audience if unclear.`,
  "support": `You are a customer support specialist.
Focus on:
- Understanding the customer's problem quickly
- Providing clear, step-by-step solutions
- Escalating when necessary
- Being empathetic and professional

Always verify the solution works before closing.`,
  "custom": "You are a helpful AI assistant."
};
var agentCredentialsCache = null;
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function getMockResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("customer") || lowerPrompt.includes("revenue")) {
    return `I analyzed your customer data and found some interesting insights:

**Top Findings:**
1. Your top 10 customers account for 45% of total revenue
2. Customer retention rate is 78% (above industry average)
3. Average order value has increased 12% this quarter

**Recommendations:**
- Consider implementing a loyalty program for high-value customers
- Focus marketing efforts on the 25-34 age demographic
- Investigate churn patterns in the "Enterprise" segment

Would you like me to create a visualization of these trends?`;
  }
  if (lowerPrompt.includes("analyze") || lowerPrompt.includes("analysis")) {
    return `I've completed the analysis of your data. Here's what I found:

**Summary Statistics:**
- Total records: 10,432
- Time period: Jan 2024 - Dec 2024
- Completeness: 98.5%

**Key Insights:**
- Significant growth trend detected (r\xB2 = 0.87)
- Seasonal patterns observed in Q4
- 3 potential outliers identified for review

Would you like me to dive deeper into any specific area?`;
  }
  if (lowerPrompt.includes("chart") || lowerPrompt.includes("visual") || lowerPrompt.includes("plot")) {
    return `I've created a visualization based on your request. The chart shows the distribution of your data over time.

**Chart Details:**
- Type: Line chart with trend overlay
- X-axis: Time period (monthly)
- Y-axis: Values (normalized)

The visualization has been saved to your workspace. You can find it in the Visualizations tab.

Would you like me to create additional views or modify this chart?`;
  }
  return `I understand you're asking about: "${prompt}"

In **mock mode**, I'm simulating a response without connecting to the backend. This helps you:
- Test your UI components
- Develop without network dependencies
- Validate user flows

To connect to a real AI agent, change your config:
\`\`\`tsx
<FlowstackProvider config={{ ...config, mode: 'production' }}>
\`\`\`

Is there anything specific you'd like to test?`;
}
function decodeAttachment(att) {
  const binary = atob(att.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], att.filename, { type: att.content_type });
}
var TABULAR_EXTS = /* @__PURE__ */ new Set([
  "csv",
  "tsv",
  "xlsx",
  "xls",
  "parquet",
  "json",
  "jsonl",
  "avro",
  "h5",
  "hdf5",
  "pkl"
]);
function _fileExt(filename) {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i + 1).toLowerCase();
}
function useAgent(template = "data-science", options) {
  const {
    credentials,
    selectedWorkspace,
    messages,
    addMessage,
    updateMessage,
    clearMessages: contextClear,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config
  } = useFlowstack();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
  const [error, setError] = useState(null);
  const [pendingInterrupts, setPendingInterrupts] = useState(null);
  const [connectedDataSources, setConnectedDataSources] = useState([]);
  const abortControllerRef = useRef(null);
  const currentMessageIdRef = useRef(null);
  const pendingPromptRef = useRef(null);
  const forceNewSessionRef = useRef(false);
  const sessionStorageKey = `flowstack:session_id:${config.tenantId || "default"}${options?.sessionKey ? `:${options.sessionKey}` : ""}`;
  const sessionIdRef = useRef(
    typeof window !== "undefined" ? sessionStorage.getItem(sessionStorageKey) : null
  );
  const clientConfig = useMemo(() => ({
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  }), [config.baseUrl, config.tenantId]);
  const isMockMode = config.mode === "mock";
  const query = useCallback(async (prompt, attachments, allowedTerms) => {
    if (isStreaming) {
      console.warn("[useAgent] Query already in progress, ignoring");
      return;
    }
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return;
    }
    if (!selectedWorkspace && !isMockMode) {
      pendingPromptRef.current = prompt;
      return;
    }
    let finalPrompt = prompt;
    let attachmentNames;
    if (attachments && attachments.length > 0 && !isMockMode && credentials && selectedWorkspace) {
      const uploaded = [];
      const datasetNames = [];
      const documentNames = [];
      for (const att of attachments) {
        const file = att instanceof File ? att : decodeAttachment(att);
        const ext = _fileExt(file.name);
        const isTabular = TABULAR_EXTS.has(ext);
        const res = isTabular ? await uploadFile(credentials, selectedWorkspace.workspaceId, file, file.name, clientConfig) : await uploadDocument(credentials, selectedWorkspace.workspaceId, file, file.name, clientConfig);
        if (!res.ok) {
          setError(`Failed to upload ${file.name}: ${res.error || "unknown error"}`);
          return;
        }
        const resolvedName = isTabular ? res.data?.dataset?.name || res.data?.report?.name || file.name : res.data?.document_name || file.name;
        uploaded.push(resolvedName);
        (isTabular ? datasetNames : documentNames).push(resolvedName);
      }
      attachmentNames = uploaded;
      const hints = [];
      if (datasetNames.length > 0) {
        hints.push(`[Attached dataset${datasetNames.length > 1 ? "s" : ""}: ${datasetNames.join(", ")} \u2014 use list_datasets / get_dataset / query_dataset_sql]`);
      }
      if (documentNames.length > 0) {
        hints.push(`[Attached document${documentNames.length > 1 ? "s" : ""}: ${documentNames.join(", ")} \u2014 use ingest_document / search_documents]`);
      }
      finalPrompt = `${hints.join("\n")}
${prompt}`;
      try {
        await refreshDatasets?.();
      } catch {
      }
    }
    const userMessage = {
      id: generateId(),
      role: "user",
      content: prompt,
      timestamp: /* @__PURE__ */ new Date(),
      attachmentNames
    };
    addMessage(userMessage);
    const userMessageId = userMessage.id;
    const assistantId = generateId();
    currentMessageIdRef.current = assistantId;
    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: /* @__PURE__ */ new Date(),
      isStreaming: true,
      toolCalls: [],
      visualizations: []
    };
    addMessage(assistantMessage);
    setIsStreaming(true);
    setIsLoading(true);
    setIsQueryRunning(true);
    setQueryStartTime(Date.now());
    setToolCalls([]);
    if (isMockMode) {
      if (config.agentServiceUrl) {
        abortControllerRef.current = new AbortController();
        let fullContent2 = "";
        try {
          if (!agentCredentialsCache) {
            const provisionRes = await fetch(`${config.agentServiceUrl}/openai/auto-provision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                template: template || config.agentTemplate || "data-science",
                agent_name: `${template || config.agentTemplate || "data-science"}-agent`,
                instructions: TEMPLATE_SYSTEM_PROMPTS[template || config.agentTemplate || "data-science"] || TEMPLATE_SYSTEM_PROMPTS["custom"],
                model: "gpt-4o-mini"
              })
            });
            if (!provisionRes.ok) {
              throw new Error(`Auto-provision failed: ${provisionRes.status}`);
            }
            const provisionData = await provisionRes.json();
            agentCredentialsCache = {
              api_key: provisionData.api_key,
              tenant_id: provisionData.tenant_id
            };
          }
          const chatRes = await fetch(`${config.agentServiceUrl}/openai/chat`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${agentCredentialsCache.api_key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: prompt,
              thread_id: agentCredentialsCache.thread_id
            }),
            signal: abortControllerRef.current.signal
          });
          if (!chatRes.ok) {
            throw new Error(`Agent chat failed: ${chatRes.status}`);
          }
          if (!chatRes.body) {
            throw new Error("No response body from agent service");
          }
          const reader = chatRes.body.getReader();
          for await (const event of parseSSEStream(reader)) {
            if (abortControllerRef.current?.signal.aborted) break;
            switch (event.type) {
              case "text":
              case "content":
              case "delta":
                if (event.content) {
                  fullContent2 += event.content;
                  updateMessage(assistantId, { content: fullContent2 });
                }
                break;
              case "error":
                setError(event.error || "Agent query failed");
                break;
              case "done":
              case "complete": {
                const completeData = event.data;
                if (completeData?.thread_id) {
                  agentCredentialsCache.thread_id = completeData.thread_id;
                }
                break;
              }
            }
          }
          updateMessage(assistantId, {
            content: fullContent2,
            isStreaming: false
          });
        } catch (err) {
          const isFetchError = err instanceof TypeError || err instanceof Error && err.message.includes("fetch");
          if (isFetchError) {
            console.warn("[useAgent] Agent service unreachable, falling back to mock responses");
            const mockResponse = getMockResponse(prompt);
            updateMessage(assistantId, {
              content: mockResponse,
              isStreaming: false
            });
          } else {
            const message = err instanceof Error ? err.message : "Agent query failed";
            setError(message);
            updateMessage(assistantId, {
              content: fullContent2 || `Error: ${message}`,
              isStreaming: false
            });
          }
        } finally {
          setIsStreaming(false);
          setIsLoading(false);
          setIsQueryRunning(false);
          setQueryStartTime(null);
          currentMessageIdRef.current = null;
          abortControllerRef.current = null;
        }
        return;
      }
      try {
        await mockDelay(500, 1e3);
        const mockResponse = getMockResponse(prompt);
        let streamedContent = "";
        for (let i = 0; i < mockResponse.length; i += 3) {
          if (abortControllerRef.current?.signal.aborted) break;
          streamedContent += mockResponse.slice(i, i + 3);
          updateMessage(assistantId, { content: streamedContent });
          await mockDelay(10, 30);
        }
        updateMessage(assistantId, {
          content: mockResponse,
          isStreaming: false
        });
      } finally {
        setIsStreaming(false);
        setIsLoading(false);
        setIsQueryRunning(false);
        setQueryStartTime(null);
        currentMessageIdRef.current = null;
      }
      return;
    }
    abortControllerRef.current = new AbortController();
    let fullContent = "";
    try {
      const networkMode = config.agentTemplate === "marketing" ? "PUBLIC" : "SANDBOX";
      const response = await executeQueryWithConfig(
        credentials,
        finalPrompt,
        selectedWorkspace.workspaceId,
        {
          networkMode,
          tools: options?.tools,
          capabilities: options?.capabilities,
          sessionId: sessionIdRef.current || void 0,
          forceNewSession: forceNewSessionRef.current || void 0,
          allowedTerms,
          // P0-132 (G5): forward an inline system-prompt override (was dropped).
          systemPrompt: options?.systemPrompt,
          // P0-132 (G4): target a specific registered persona (maps to
          // target_agents on the wire). persona wins over the agentName alias.
          persona: options?.persona ?? options?.agentName
        },
        clientConfig
      );
      if (!response.body) {
        throw new Error("No response body");
      }
      const reader = response.body.getReader();
      const currentToolCalls = [];
      const currentVisualizations = [];
      for await (const event of parseSSEStream(reader)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        switch (event.type) {
          // ── METADATA ───────────────────────────────────────────────
          // First event from v2 backend with session info + data sources.
          // Extract connected data sources for badge display.
          case "metadata": {
            const metaData = event.data;
            if (metaData?.session_id && typeof metaData.session_id === "string") {
              sessionIdRef.current = metaData.session_id;
              forceNewSessionRef.current = false;
              if (typeof window !== "undefined") {
                sessionStorage.setItem(sessionStorageKey, metaData.session_id);
              }
            }
            if (metaData?.data_sources && Array.isArray(metaData.data_sources)) {
              setConnectedDataSources(metaData.data_sources);
            }
            if (metaData?.pii_redacted && Array.isArray(metaData.pii_redacted) && metaData.pii_redacted.length > 0) {
              updateMessage(userMessageId, {
                piiRedacted: metaData.pii_redacted
              });
            }
            break;
          }
          // ── TEXT STREAMING ─────────────────────────────────────────
          // 'delta' = incremental token from v2 backend
          // 'text'  = final accumulated text from v2, or Anthropic raw
          // 'content' = generic text fallback
          // All append to fullContent for progressive UI rendering.
          case "text":
          case "content":
          case "delta":
            if (event.content) {
              if (isJsonBlob(event.content)) {
                const summary = summarizeJsonEvent(event.content);
                if (summary) {
                  updateMessage(assistantId, { statusLine: summary });
                }
                break;
              }
              fullContent += event.content;
              const displayContent = unflattenMarkdownTables(fullContent);
              updateMessage(assistantId, { content: displayContent, statusLine: void 0 });
            }
            break;
          // ── TOOL CALLS ─────────────────────────────────────────────
          // V2 emits: event.tool = tool name (from data.name),
          //           event.args = tool arguments (from data.args)
          // Parsed by normalizeEvent's tool format branch (section 4).
          case "tool_call":
          case "tool_use":
            if (event.tool) {
              const alreadyRunning = currentToolCalls.some(
                (tc) => tc.name === event.tool && tc.status === "running"
              );
              if (alreadyRunning) break;
              const toolCall = {
                id: generateId(),
                toolUseId: event.args?.tool_use_id,
                name: event.tool,
                args: event.args,
                status: "running",
                startTime: Date.now()
              };
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
              updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
            }
            break;
          // ── TOOL RESULTS ───────────────────────────────────────────
          // V2 emits: tool_use_id, content, status
          // event.tool may be undefined (v2 doesn't include tool name
          // in results), so we fall back to finding the first running
          // tool call in the list.
          case "tool_result":
            if (event.tool || event.toolUseId || currentToolCalls.length > 0) {
              let toolIndex = -1;
              if (event.toolUseId) {
                toolIndex = currentToolCalls.findIndex((tc) => tc.toolUseId === event.toolUseId);
              }
              if (toolIndex < 0 && event.tool) {
                toolIndex = currentToolCalls.findIndex((tc) => tc.name === event.tool && tc.status === "running");
              }
              if (toolIndex < 0) {
                toolIndex = currentToolCalls.findIndex((tc) => tc.status === "running");
              }
              if (toolIndex >= 0) {
                const completedTool = currentToolCalls[toolIndex];
                currentToolCalls[toolIndex] = {
                  ...completedTool,
                  // P0-132 (G1): the backend emits the tool's return value under
                  // `content` (normalized to event.content); `event.result` is only
                  // populated by legacy/alternate event shapes. Reading content first
                  // makes structured tool output actually reach toolCalls[].result —
                  // previously it was always undefined.
                  result: event.content ?? event.result,
                  // P0-132 (G1): mark a failed tool call as 'error' (backend
                  // is_error flag) instead of silently reporting 'complete'.
                  status: event.isError ? "error" : "complete",
                  endTime: Date.now()
                };
                setToolCalls([...currentToolCalls]);
                updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
                const toolName = completedTool.name || "";
                if (COLLECTION_WRITE_TOOLS.has(toolName) && !event.isError) {
                  window.dispatchEvent(new CustomEvent(COLLECTION_CHANGED_EVENT, {
                    detail: { tool: toolName }
                  }));
                }
              }
            }
            break;
          // ── PROGRESS (swarm agent text) ──────────────────────────────
          // During swarm execution, specialist agents stream text as
          // 'progress' events. Append to main content AND to the matching
          // tool call's agentResponse so CasinoDemo can render it.
          case "progress":
            if (event.message) {
              const progressData = event.data;
              if (progressData?.progressType === "heartbeat") break;
              if (isJsonBlob(event.message)) {
                const summary = summarizeJsonEvent(event.message, event.tool);
                if (summary) {
                  updateMessage(assistantId, { statusLine: summary });
                }
                break;
              }
              updateMessage(assistantId, {
                statusLine: event.tool ? `${event.tool}: ${event.message.substring(0, 80)}` : event.message.substring(0, 100)
              });
              if (currentToolCalls.length > 0) {
                let idx = -1;
                if (event.tool) {
                  for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                    if (currentToolCalls[i].name === event.tool) {
                      idx = i;
                      break;
                    }
                  }
                }
                if (idx < 0) {
                  for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                    if (currentToolCalls[i].status === "running") {
                      idx = i;
                      break;
                    }
                  }
                }
                if (idx >= 0) {
                  const prev = currentToolCalls[idx].agentResponse || "";
                  const sep = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
                  currentToolCalls[idx] = {
                    ...currentToolCalls[idx],
                    agentResponse: prev + sep + event.message
                  };
                  setToolCalls([...currentToolCalls]);
                  updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
                }
              }
            }
            break;
          // ── VISUALIZATIONS ─────────────────────────────────────────
          case "visualization":
            if (event.data) {
              const viz = event.data;
              currentVisualizations.push(viz);
              addVisualization(viz);
              updateMessage(assistantId, { visualizations: [...currentVisualizations] });
            }
            break;
          // ── INTERRUPT ─────────────────────────────────────────────
          case "interrupt":
            if (event.data) {
              setPendingInterrupts([event.data]);
            }
            break;
          // ── ERRORS ─────────────────────────────────────────────────
          case "error": {
            const parsed = parseErrorMessage(event.error || "Query failed");
            setError(parsed.message);
            break;
          }
          // ── STREAM END ─────────────────────────────────────────────
          // 'complete' = v2 stream termination (with event_count, execution_ms)
          // 'done' = OpenAI-style [DONE] signal
          case "done":
          case "complete": {
            const completeData = event.data;
            if (completeData?.stop_reason === "interrupt") {
            }
            break;
          }
        }
      }
      const now = Date.now();
      for (let i = 0; i < currentToolCalls.length; i++) {
        if (currentToolCalls[i].status === "running") {
          currentToolCalls[i] = { ...currentToolCalls[i], status: "complete", endTime: now };
        }
      }
      const cleanedContent = cleanContent(fullContent);
      updateMessage(assistantId, {
        content: cleanedContent,
        isStreaming: false,
        toolCalls: currentToolCalls,
        visualizations: currentVisualizations,
        statusLine: void 0
      });
      if (currentToolCalls.length > 0) {
        await Promise.all([
          refreshDatasets(),
          refreshVisualizations()
        ]);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Query failed";
      const parsed = parseErrorMessage(raw);
      setError(parsed.message);
      updateMessage(assistantId, {
        content: fullContent || `Error: ${parsed.message}`,
        isStreaming: false
      });
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
      setIsQueryRunning(false);
      setQueryStartTime(null);
      currentMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [
    isStreaming,
    credentials,
    selectedWorkspace,
    addMessage,
    updateMessage,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config,
    clientConfig,
    isMockMode,
    template
  ]);
  useEffect(() => {
    if (selectedWorkspace && pendingPromptRef.current) {
      const pending = pendingPromptRef.current;
      pendingPromptRef.current = null;
      query(pending);
    }
  }, [selectedWorkspace, query]);
  const clearMessages2 = useCallback(() => {
    setError(null);
    setToolCalls([]);
    sessionIdRef.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(sessionStorageKey);
    }
    contextClear();
  }, [contextClear, sessionStorageKey]);
  const startNewSession = useCallback(() => {
    setError(null);
    setToolCalls([]);
    sessionIdRef.current = null;
    forceNewSessionRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(sessionStorageKey);
    }
    contextClear();
  }, [contextClear, sessionStorageKey]);
  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentMessageIdRef.current) {
      updateMessage(currentMessageIdRef.current, {
        content: "*(Query cancelled)*",
        isStreaming: false
      });
    }
    setIsStreaming(false);
    setIsLoading(false);
    setIsQueryRunning(false);
    setQueryStartTime(null);
    setPendingInterrupts(null);
  }, [updateMessage, setIsQueryRunning, setQueryStartTime]);
  const interruptAgent = useCallback(async () => {
    if (!credentials || !selectedWorkspace) return;
    const baseUrl = clientConfig.baseUrl || "https://sage-api.flowstack.fun";
    const tenantId = credentials.tenantId || clientConfig.tenantId || "";
    await fetch(`${baseUrl}/stream/interrupt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.apiKey}`,
        "X-Tenant-ID": tenantId,
        "X-User-ID": credentials.userId || ""
      },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.workspaceId,
        reason: ""
      })
    });
  }, [credentials, selectedWorkspace, clientConfig]);
  const respondToInterrupt = useCallback(async (message) => {
    setPendingInterrupts(null);
    await query(message);
  }, [query]);
  return {
    query,
    messages,
    isStreaming,
    isLoading,
    toolCalls,
    error,
    pendingInterrupts,
    connectedDataSources,
    clearMessages: clearMessages2,
    startNewSession,
    cancelQuery,
    interruptAgent,
    respondToInterrupt
  };
}
function generateId2() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function useQuery() {
  const {
    credentials,
    selectedWorkspace,
    addVisualization,
    config
  } = useFlowstack();
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState(null);
  const [toolCalls, setToolCalls] = useState([]);
  const [visualizations, setVisualizations] = useState([]);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const execute = useCallback(async (prompt, options) => {
    setError(null);
    setResult(null);
    setToolCalls([]);
    setVisualizations([]);
    if (!credentials) {
      setError("Not authenticated");
      return;
    }
    const workspaceId = options?.workspaceId || selectedWorkspace?.workspaceId;
    if (!workspaceId) {
      setError("No workspace selected");
      return;
    }
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();
    try {
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        workspaceId,
        { networkMode: options?.networkMode || "SANDBOX", tools: options?.tools },
        clientConfig
      );
      if (!response.body) {
        throw new Error("No response body");
      }
      const reader = response.body.getReader();
      let fullContent = "";
      const currentToolCalls = [];
      const currentVisualizations = [];
      for await (const event of parseSSEStream(reader)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        switch (event.type) {
          case "text":
          case "content":
          case "delta":
            if (event.content) {
              fullContent += event.content;
              setResult(fullContent);
            }
            break;
          case "tool_call":
          case "tool_use":
            if (event.tool) {
              const toolCall = {
                id: generateId2(),
                toolUseId: event.args?.tool_use_id,
                name: event.tool,
                args: event.args,
                status: "running",
                startTime: Date.now()
              };
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
            }
            break;
          case "tool_result":
            if (event.tool || currentToolCalls.length > 0) {
              const toolIndex = currentToolCalls.findIndex(
                (tc) => tc.name === event.tool || tc.status === "running"
              );
              if (toolIndex >= 0) {
                currentToolCalls[toolIndex] = {
                  ...currentToolCalls[toolIndex],
                  result: event.result,
                  status: "complete",
                  endTime: Date.now()
                };
                setToolCalls([...currentToolCalls]);
              }
            }
            break;
          case "visualization":
            if (event.data) {
              const viz = event.data;
              currentVisualizations.push(viz);
              setVisualizations([...currentVisualizations]);
              addVisualization(viz);
            }
            break;
          case "error":
            setError(event.error || "Query failed");
            break;
        }
      }
      setResult(fullContent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [credentials, selectedWorkspace, addVisualization, config, clientConfig]);
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);
  return {
    execute,
    isStreaming,
    result,
    toolCalls,
    visualizations,
    error,
    cancel
  };
}

// src/factory/intent-analyzer.ts
var DEFAULT_PATTERNS = [
  {
    id: "data-analysis",
    category: "data_analysis",
    patterns: [
      /analyz[es]?\s+(the\s+)?data/i,
      /data\s+analysis/i,
      /explore\s+(my\s+)?dataset/i,
      /statistical\s+analysis/i,
      /find\s+patterns?\s+in/i,
      /correlat(e|ion)/i,
      /summarize\s+(the\s+)?data/i,
      /describe\s+(the\s+)?dataset/i
    ],
    keywords: ["analyze", "analysis", "explore", "statistics", "patterns", "insights", "trends", "summary", "describe"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a data analyst specializing in exploratory data analysis.
Focus on:
- Statistical summaries and distributions
- Identifying patterns, correlations, and anomalies
- Providing actionable insights with supporting evidence
- Creating clear visualizations when helpful

Always explain your methodology and confidence levels.`,
      networkMode: "SANDBOX"
    },
    priority: 10
  },
  {
    id: "visualization",
    category: "visualization",
    patterns: [
      /create\s+(a\s+)?chart/i,
      /visualiz[es]/i,
      /plot\s+(the\s+)?data/i,
      /show\s+(me\s+)?(a\s+)?graph/i,
      /dashboard/i,
      /make\s+(a\s+)?(bar|line|pie|scatter)/i,
      /draw\s+(a\s+)?diagram/i
    ],
    keywords: ["chart", "graph", "plot", "visualize", "visualization", "dashboard", "diagram", "bar", "line", "pie", "scatter"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a data visualization expert.
Focus on:
- Creating clear, informative visualizations
- Choosing appropriate chart types for the data
- Using effective color schemes and layouts
- Adding meaningful labels and annotations

Always save visualizations and explain what they show.`,
      networkMode: "SANDBOX"
    },
    priority: 9
  },
  {
    id: "machine-learning",
    category: "machine_learning",
    patterns: [
      /train\s+(a\s+)?model/i,
      /machine\s+learning/i,
      /predict(ion)?s?/i,
      /classif(y|ication)/i,
      /regression/i,
      /clustering/i,
      /build\s+(a\s+)?model/i,
      /deep\s+learning/i,
      /neural\s+network/i
    ],
    keywords: ["model", "predict", "train", "machine learning", "ML", "classification", "regression", "clustering", "neural", "AI"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a machine learning engineer.
Focus on:
- Selecting appropriate ML algorithms for the task
- Proper data preparation and feature engineering
- Model training, validation, and evaluation
- Clear explanation of model performance and limitations

Always split data properly and report metrics.`,
      networkMode: "SANDBOX"
    },
    priority: 8
  },
  {
    id: "data-transformation",
    category: "data_transformation",
    patterns: [
      /transform\s+(the\s+)?data/i,
      /clean\s+(the\s+)?data/i,
      /filter\s+(the\s+)?rows/i,
      /merge\s+(the\s+)?datasets/i,
      /join\s+(the\s+)?tables/i,
      /pivot\s+(the\s+)?data/i,
      /reshape/i
    ],
    keywords: ["transform", "clean", "filter", "merge", "join", "pivot", "reshape", "aggregate", "group"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a data engineer specializing in data transformation.
Focus on:
- Cleaning and preprocessing data
- Efficient transformations and aggregations
- Data quality validation
- Clear documentation of transformations applied

Always verify data integrity after transformations.`,
      networkMode: "SANDBOX"
    },
    priority: 7
  },
  {
    id: "content-creation",
    category: "content_creation",
    patterns: [
      /write\s+(a\s+)?blog/i,
      /create\s+content/i,
      /marketing\s+copy/i,
      /social\s+media\s+post/i,
      /draft\s+(an?\s+)?email/i,
      /write\s+(an?\s+)?article/i,
      /generate\s+copy/i
    ],
    keywords: ["write", "content", "blog", "marketing", "copy", "email", "social media", "article", "draft"],
    suggestedConfig: {
      template: "marketing",
      systemPrompt: `You are a content strategist and copywriter.
Focus on:
- Clear, engaging writing tailored to the audience
- SEO optimization where appropriate
- Consistent brand voice and messaging
- Actionable calls-to-action

Always ask about target audience if unclear.`,
      networkMode: "PUBLIC"
    },
    priority: 6
  },
  {
    id: "customer-support",
    category: "customer_support",
    patterns: [
      /customer\s+support/i,
      /help\s+desk/i,
      /answer\s+questions/i,
      /FAQ/i,
      /troubleshoot/i,
      /resolve\s+issues/i,
      /support\s+agent/i
    ],
    keywords: ["support", "help", "troubleshoot", "FAQ", "questions", "issues", "resolve", "assist"],
    suggestedConfig: {
      template: "support",
      systemPrompt: `You are a customer support specialist.
Focus on:
- Understanding the customer's problem quickly
- Providing clear, step-by-step solutions
- Escalating when necessary
- Being empathetic and professional

Always verify the solution works before closing.`,
      networkMode: "SANDBOX"
    },
    priority: 5
  },
  {
    id: "code-generation",
    category: "code_generation",
    patterns: [
      /write\s+(some\s+)?code/i,
      /generate\s+(a\s+)?script/i,
      /create\s+(a\s+)?function/i,
      /implement\s+(a\s+)?feature/i,
      /code\s+to\s+/i,
      /python\s+(script|code)/i
    ],
    keywords: ["code", "script", "function", "implement", "program", "python", "javascript"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a software developer.
Focus on:
- Writing clean, well-documented code
- Following best practices and conventions
- Error handling and edge cases
- Testing and validation

Always explain your implementation decisions.`,
      networkMode: "SANDBOX"
    },
    priority: 4
  },
  {
    id: "research",
    category: "research",
    patterns: [
      /research\s+/i,
      /find\s+information/i,
      /look\s+up/i,
      /search\s+for/i,
      /investigate/i
    ],
    keywords: ["research", "find", "search", "investigate", "look up", "discover"],
    suggestedConfig: {
      template: "data-science",
      systemPrompt: `You are a research assistant.
Focus on:
- Thorough information gathering
- Source verification and credibility
- Clear summarization of findings
- Identifying knowledge gaps

Always cite your sources when possible.`,
      networkMode: "PUBLIC"
    },
    priority: 3
  }
];
function extractEntities(intent) {
  const entities = [];
  const dataSourceMatch = intent.match(/(?:from|using|with)\s+(?:the\s+)?(\w+)\s+(?:data|dataset|file|table)/i);
  if (dataSourceMatch) {
    entities.push({
      type: "data_source",
      value: dataSourceMatch[1],
      position: dataSourceMatch.index || 0
    });
  }
  const formatMatch = intent.match(/(?:as|in|to)\s+(?:a\s+)?(\w+)\s+(?:format|file|chart|graph)/i);
  if (formatMatch) {
    entities.push({
      type: "output_format",
      value: formatMatch[1],
      position: formatMatch.index || 0
    });
  }
  const domainPatterns = [
    { regex: /(?:sales|revenue|financial)/i, domain: "finance" },
    { regex: /(?:customer|user|client)/i, domain: "customer" },
    { regex: /(?:marketing|campaign|ad)/i, domain: "marketing" },
    { regex: /(?:product|inventory|stock)/i, domain: "product" },
    { regex: /(?:health|medical|patient)/i, domain: "healthcare" }
  ];
  for (const { regex, domain } of domainPatterns) {
    const match = intent.match(regex);
    if (match) {
      entities.push({
        type: "domain",
        value: domain,
        position: match.index || 0
      });
      break;
    }
  }
  const actionPatterns = ["analyze", "visualize", "predict", "classify", "train", "create", "generate", "transform", "clean"];
  for (const action of actionPatterns) {
    const actionIndex = intent.toLowerCase().indexOf(action);
    if (actionIndex !== -1) {
      entities.push({
        type: "action",
        value: action,
        position: actionIndex
      });
      break;
    }
  }
  return entities;
}
function analyzeWithRules(intent, customPatterns = []) {
  const allPatterns = [...customPatterns, ...DEFAULT_PATTERNS].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const normalizedIntent = intent.toLowerCase().trim();
  let bestMatch = null;
  for (const pattern of allPatterns) {
    let score = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(normalizedIntent)) {
        score += 0.4;
        break;
      }
    }
    const matchedKeywords = pattern.keywords.filter(
      (kw) => normalizedIntent.includes(kw.toLowerCase())
    );
    score += matchedKeywords.length / pattern.keywords.length * 0.6;
    if (score > (bestMatch?.score || 0)) {
      bestMatch = { pattern, score };
    }
  }
  if (!bestMatch || bestMatch.score < 0.3) {
    return null;
  }
  const entities = extractEntities(intent);
  return {
    category: bestMatch.pattern.category,
    confidence: Math.min(bestMatch.score, 1),
    entities,
    suggestedConfig: bestMatch.pattern.suggestedConfig,
    originalIntent: intent,
    method: "rule"
  };
}
async function analyzeWithLLM(intent, llmExecute) {
  const analysisPrompt = `Analyze this user intent and respond with JSON only:
Intent: "${intent}"

Respond with this exact JSON structure (no markdown, just JSON):
{
  "category": "data_analysis|visualization|machine_learning|data_transformation|content_creation|customer_support|code_generation|research|general_assistant",
  "confidence": 0.0-1.0,
  "suggestedSystemPrompt": "A brief system prompt for an AI agent to handle this intent",
  "template": "data-science|marketing|support|custom"
}`;
  try {
    const response = await llmExecute(analysisPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
        entities: extractEntities(intent),
        suggestedConfig: {
          template: parsed.template || "custom",
          systemPrompt: parsed.suggestedSystemPrompt
        },
        originalIntent: intent,
        method: "llm"
      };
    }
  } catch (error) {
    console.error("LLM intent analysis failed:", error);
  }
  return {
    category: "general_assistant",
    confidence: 0.5,
    entities: extractEntities(intent),
    suggestedConfig: {
      template: "custom",
      systemPrompt: `You are a helpful AI assistant. The user wants: ${intent}`
    },
    originalIntent: intent,
    method: "llm"
  };
}
var IntentAnalyzer = class {
  constructor(options = {}) {
    this.customPatterns = options.customPatterns || [];
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.useLLMFallback = options.useLLMFallback !== false;
  }
  /**
   * Analyze intent and return structured analysis
   */
  async analyze(intent, llmExecutor) {
    const ruleAnalysis = analyzeWithRules(intent, this.customPatterns);
    if (ruleAnalysis && ruleAnalysis.confidence >= this.confidenceThreshold) {
      return ruleAnalysis;
    }
    if (this.useLLMFallback && llmExecutor) {
      const llmAnalysis = await analyzeWithLLM(intent, llmExecutor);
      if (ruleAnalysis && llmAnalysis.confidence < ruleAnalysis.confidence) {
        return { ...ruleAnalysis, method: "hybrid" };
      }
      return { ...llmAnalysis, method: "hybrid" };
    }
    if (ruleAnalysis) {
      return ruleAnalysis;
    }
    return {
      category: "general_assistant",
      confidence: 0.3,
      entities: extractEntities(intent),
      suggestedConfig: {
        template: "custom",
        systemPrompt: `You are a helpful AI assistant. The user wants: ${intent}`
      },
      originalIntent: intent,
      method: "rule"
    };
  }
  /**
   * Register a custom intent pattern
   */
  addPattern(pattern) {
    this.customPatterns.push(pattern);
  }
  /**
   * Remove a custom pattern by ID
   */
  removePattern(patternId) {
    const index = this.customPatterns.findIndex((p) => p.id === patternId);
    if (index >= 0) {
      this.customPatterns.splice(index, 1);
      return true;
    }
    return false;
  }
  /**
   * Get all registered patterns (custom + defaults)
   */
  getPatterns() {
    return [...this.customPatterns, ...DEFAULT_PATTERNS];
  }
  /**
   * Get only custom patterns
   */
  getCustomPatterns() {
    return [...this.customPatterns];
  }
  /**
   * Update confidence threshold
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }
  /**
   * Enable or disable LLM fallback
   */
  setLLMFallback(enabled) {
    this.useLLMFallback = enabled;
  }
};

// src/factory/agent-registry.ts
function intentSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) {
    return 1;
  }
  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = /* @__PURE__ */ new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}
function normalizeIntent(intent) {
  return intent.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
}
var AgentRegistry = class {
  constructor(options = {}) {
    this.agents = /* @__PURE__ */ new Map();
    this.intentIndex = /* @__PURE__ */ new Map();
    this.options = {
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 30 * 60 * 1e3
      // 30 minutes default
    };
  }
  /**
   * Register a new agent
   */
  register(agent) {
    this.agents.set(agent.id, agent);
    this.intentIndex.set(normalizeIntent(agent.intent), agent.id);
  }
  /**
   * Get agent by ID
   */
  get(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      return void 0;
    }
    if (this.options.enableCache && this.options.cacheTTL > 0) {
      const age = Date.now() - agent.lastUsedAt.getTime();
      if (age > this.options.cacheTTL) {
        this.remove(id);
        return void 0;
      }
    }
    return agent;
  }
  /**
   * Find agent by exact intent match
   */
  findByExactIntent(intent) {
    const normalizedIntent = normalizeIntent(intent);
    const agentId = this.intentIndex.get(normalizedIntent);
    if (agentId) {
      return this.get(agentId);
    }
    return void 0;
  }
  /**
   * Find agent by similar intent (fuzzy matching)
   */
  findByIntent(intent, threshold = 0.8) {
    const exactMatch = this.findByExactIntent(intent);
    if (exactMatch) {
      return exactMatch;
    }
    const normalizedIntent = normalizeIntent(intent);
    let bestMatch = null;
    for (const [registeredIntent, agentId] of this.intentIndex) {
      const similarity = intentSimilarity(normalizedIntent, registeredIntent);
      if (similarity >= threshold && similarity > (bestMatch?.similarity || 0)) {
        const agent = this.get(agentId);
        if (agent) {
          bestMatch = { agent, similarity };
        }
      }
    }
    return bestMatch?.agent;
  }
  /**
   * Record agent usage (updates lastUsedAt and usageCount)
   */
  recordUsage(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastUsedAt = /* @__PURE__ */ new Date();
      agent.usageCount++;
      if (agent.config.lastUsedAt !== void 0) {
        agent.config.lastUsedAt = /* @__PURE__ */ new Date();
      }
    }
  }
  /**
   * List all registered agents
   */
  listAll() {
    if (this.options.enableCache && this.options.cacheTTL > 0) {
      this.cleanExpired();
    }
    return Array.from(this.agents.values());
  }
  /**
   * List agents sorted by usage count (most used first)
   */
  listByUsage() {
    return this.listAll().sort((a, b) => b.usageCount - a.usageCount);
  }
  /**
   * List agents sorted by last used (most recent first)
   */
  listByRecent() {
    return this.listAll().sort(
      (a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    );
  }
  /**
   * Remove agent by ID
   */
  remove(id) {
    const agent = this.agents.get(id);
    if (agent) {
      this.intentIndex.delete(normalizeIntent(agent.intent));
      return this.agents.delete(id);
    }
    return false;
  }
  /**
   * Clear all registered agents
   */
  clear() {
    this.agents.clear();
    this.intentIndex.clear();
  }
  /**
   * Get registry size
   */
  size() {
    return this.agents.size;
  }
  /**
   * Check if agent exists
   */
  has(id) {
    return this.agents.has(id);
  }
  /**
   * Clean expired agents
   */
  cleanExpired() {
    if (!this.options.enableCache || this.options.cacheTTL <= 0) {
      return;
    }
    const now = Date.now();
    const toRemove = [];
    for (const [id, agent] of this.agents) {
      const age = now - agent.lastUsedAt.getTime();
      if (age > this.options.cacheTTL) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.remove(id);
    }
  }
  /**
   * Update cache TTL
   */
  setCacheTTL(ttl) {
    this.options.cacheTTL = Math.max(0, ttl);
  }
  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled) {
    this.options.enableCache = enabled;
  }
  /**
   * Export registry state (for persistence)
   */
  export() {
    return Array.from(this.agents.values());
  }
  /**
   * Import registry state (for restoration)
   */
  import(agents) {
    for (const agent of agents) {
      const normalizedAgent = {
        ...agent,
        createdAt: agent.createdAt instanceof Date ? agent.createdAt : new Date(agent.createdAt),
        lastUsedAt: agent.lastUsedAt instanceof Date ? agent.lastUsedAt : new Date(agent.lastUsedAt)
      };
      this.register(normalizedAgent);
    }
  }
};

// src/factory/agent-factory.ts
function generateAgentId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `agent_${timestamp}_${random}`;
}
var CATEGORY_NAMES = {
  data_analysis: "Data Analyst",
  visualization: "Visualization Expert",
  data_transformation: "Data Engineer",
  machine_learning: "ML Engineer",
  content_creation: "Content Creator",
  research: "Research Assistant",
  customer_support: "Support Agent",
  code_generation: "Code Assistant",
  general_assistant: "General Assistant",
  custom: "Custom Agent"
};
var AgentFactory = class {
  constructor(options = {}) {
    this.options = {
      useLLMFallback: options.useLLMFallback !== false,
      ruleConfidenceThreshold: options.ruleConfidenceThreshold || 0.7,
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 30 * 60 * 1e3,
      // 30 minutes
      customPatterns: options.customPatterns || []
    };
    this.analyzer = new IntentAnalyzer({
      customPatterns: this.options.customPatterns,
      confidenceThreshold: this.options.ruleConfidenceThreshold,
      useLLMFallback: this.options.useLLMFallback
    });
    this.registry = new AgentRegistry({
      enableCache: this.options.enableCache,
      cacheTTL: this.options.cacheTTL
    });
  }
  /**
   * Create agent from user intent
   *
   * @param intent - Natural language description of what the user wants
   * @param llmExecutor - Optional function to execute LLM queries for fallback analysis
   * @returns Created or cached RegisteredAgent
   */
  async createFromIntent(intent, llmExecutor) {
    const existingAgent = this.registry.findByIntent(intent);
    if (existingAgent) {
      this.registry.recordUsage(existingAgent.id);
      return existingAgent;
    }
    const analysis = await this.analyzer.analyze(intent, llmExecutor);
    const config = this.buildConfig(analysis);
    const agent = {
      id: generateAgentId(),
      name: this.generateAgentName(analysis),
      config,
      intent,
      analysis,
      createdAt: /* @__PURE__ */ new Date(),
      lastUsedAt: /* @__PURE__ */ new Date(),
      usageCount: 1
    };
    this.registry.register(agent);
    return agent;
  }
  /**
   * Create agent from explicit configuration (bypass intent analysis)
   *
   * @param name - Human-readable agent name
   * @param config - Partial agent configuration
   * @returns Created RegisteredAgent
   */
  createFromConfig(name, config) {
    const fullConfig = {
      template: "custom",
      streaming: true,
      networkMode: "SANDBOX",
      ...config,
      name,
      createdAt: /* @__PURE__ */ new Date(),
      lastUsedAt: /* @__PURE__ */ new Date()
    };
    const agent = {
      id: generateAgentId(),
      name,
      config: fullConfig,
      intent: `Custom: ${name}`,
      analysis: {
        category: "custom",
        confidence: 1,
        entities: [],
        suggestedConfig: config,
        originalIntent: `Custom: ${name}`,
        method: "rule"
      },
      createdAt: /* @__PURE__ */ new Date(),
      lastUsedAt: /* @__PURE__ */ new Date(),
      usageCount: 1
    };
    this.registry.register(agent);
    return agent;
  }
  /**
   * Build full config from intent analysis
   */
  buildConfig(analysis) {
    const baseConfig = {
      template: analysis.suggestedConfig.template || "custom",
      streaming: true,
      networkMode: "SANDBOX",
      createdAt: /* @__PURE__ */ new Date(),
      lastUsedAt: /* @__PURE__ */ new Date()
    };
    return {
      ...baseConfig,
      ...analysis.suggestedConfig,
      metadata: {
        analysisCategory: analysis.category,
        analysisConfidence: analysis.confidence,
        analysisMethod: analysis.method,
        entities: analysis.entities
      }
    };
  }
  /**
   * Generate human-readable agent name from analysis
   */
  generateAgentName(analysis) {
    return CATEGORY_NAMES[analysis.category] || "Custom Agent";
  }
  // ===========================================================================
  // Registry Access Methods
  // ===========================================================================
  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.registry.get(id);
  }
  /**
   * List all registered agents
   */
  listAgents() {
    return this.registry.listAll();
  }
  /**
   * List agents by usage (most used first)
   */
  listAgentsByUsage() {
    return this.registry.listByUsage();
  }
  /**
   * List agents by recency (most recent first)
   */
  listAgentsByRecent() {
    return this.registry.listByRecent();
  }
  /**
   * Remove an agent by ID
   */
  removeAgent(id) {
    return this.registry.remove(id);
  }
  /**
   * Clear all agents
   */
  clearAll() {
    this.registry.clear();
  }
  /**
   * Get number of registered agents
   */
  getAgentCount() {
    return this.registry.size();
  }
  /**
   * Record usage of an agent
   */
  recordAgentUsage(id) {
    this.registry.recordUsage(id);
  }
  // ===========================================================================
  // Analyzer Access Methods
  // ===========================================================================
  /**
   * Get the analyzer instance for direct access
   */
  getAnalyzer() {
    return this.analyzer;
  }
  /**
   * Get the registry instance for direct access
   */
  getRegistry() {
    return this.registry;
  }
  // ===========================================================================
  // Persistence Methods
  // ===========================================================================
  /**
   * Export factory state for persistence
   */
  exportState() {
    return {
      agents: this.registry.export(),
      options: this.options
    };
  }
  /**
   * Import factory state from persistence
   */
  importState(state) {
    this.registry.import(state.agents);
  }
};

// src/hooks/useIntentAgent.ts
function generateId3() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
function useIntentAgent(options = {}) {
  const {
    credentials,
    selectedWorkspace,
    messages,
    addMessage,
    updateMessage,
    clearMessages: contextClear,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config
  } = useFlowstack();
  const factory = useMemo(
    () => new AgentFactory({
      useLLMFallback: options.useLLMFallback,
      ruleConfidenceThreshold: options.ruleConfidenceThreshold,
      enableCache: options.enableCache,
      cacheTTL: options.cacheTTL,
      customPatterns: options.customPatterns
    }),
    [
      options.useLLMFallback,
      options.ruleConfidenceThreshold,
      options.enableCache,
      options.cacheTTL,
      options.customPatterns
    ]
  );
  const [agent, setAgent] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const currentMessageIdRef = useRef(null);
  const clientConfig = useMemo(() => ({
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  }), [config.baseUrl, config.tenantId]);
  useEffect(() => {
    if (options.initialIntent && !agent && !isCreating) {
      createAgent(options.initialIntent);
    }
  }, [options.initialIntent]);
  const createLLMExecutor = useCallback(() => {
    if (!credentials || !selectedWorkspace) {
      return void 0;
    }
    return async (prompt) => {
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        selectedWorkspace.workspaceId,
        { networkMode: "SANDBOX" },
        clientConfig
      );
      if (!response.body) {
        throw new Error("No response body");
      }
      const reader = response.body.getReader();
      let result = "";
      for await (const event of parseSSEStream(reader)) {
        if (event.type === "text" || event.type === "content" || event.type === "delta") {
          result += event.content || "";
        }
      }
      return result;
    };
  }, [credentials, selectedWorkspace, clientConfig]);
  const createAgent = useCallback(async (intent) => {
    setError(null);
    setIsCreating(true);
    try {
      const llmExecutor = createLLMExecutor();
      const newAgent = await factory.createFromIntent(intent, llmExecutor);
      setAgent(newAgent);
      return newAgent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create agent";
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [factory, createLLMExecutor]);
  const query = useCallback(async (prompt) => {
    setError(null);
    if (!credentials) {
      setError("Not authenticated");
      return;
    }
    if (!selectedWorkspace) {
      setError("No workspace selected");
      return;
    }
    if (!agent) {
      setError("No agent created. Call createAgent first.");
      return;
    }
    const userMessage = {
      id: generateId3(),
      role: "user",
      content: prompt,
      timestamp: /* @__PURE__ */ new Date()
    };
    addMessage(userMessage);
    const assistantId = generateId3();
    currentMessageIdRef.current = assistantId;
    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: /* @__PURE__ */ new Date(),
      isStreaming: true,
      toolCalls: [],
      visualizations: []
    };
    addMessage(assistantMessage);
    setIsStreaming(true);
    setIsQueryRunning(true);
    setQueryStartTime(Date.now());
    setToolCalls([]);
    abortControllerRef.current = new AbortController();
    let fullContent = "";
    try {
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        selectedWorkspace.workspaceId,
        {
          networkMode: agent.config.networkMode || "SANDBOX",
          systemPrompt: agent.config.systemPrompt,
          tools: agent.config.tools
        },
        clientConfig
      );
      if (!response.body) {
        throw new Error("No response body");
      }
      const reader = response.body.getReader();
      const currentToolCalls = [];
      const currentVisualizations = [];
      for await (const event of parseSSEStream(reader)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        switch (event.type) {
          case "text":
          case "content":
          case "delta":
            if (event.content) {
              fullContent += event.content;
              updateMessage(assistantId, { content: fullContent });
            }
            break;
          case "tool_call":
          case "tool_use":
            if (event.tool) {
              const toolCall = {
                id: generateId3(),
                toolUseId: event.args?.tool_use_id,
                name: event.tool,
                args: event.args,
                status: "running",
                startTime: Date.now()
              };
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
              updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
            }
            break;
          case "tool_result":
            if (event.tool || currentToolCalls.length > 0) {
              const toolIndex = currentToolCalls.findIndex(
                (tc) => tc.name === event.tool || tc.status === "running"
              );
              if (toolIndex >= 0) {
                currentToolCalls[toolIndex] = {
                  ...currentToolCalls[toolIndex],
                  result: event.result,
                  status: "complete",
                  endTime: Date.now()
                };
                setToolCalls([...currentToolCalls]);
                updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
              }
            }
            break;
          case "visualization":
            if (event.data) {
              const viz = event.data;
              currentVisualizations.push(viz);
              addVisualization(viz);
              updateMessage(assistantId, { visualizations: [...currentVisualizations] });
            }
            break;
          case "error":
            setError(event.error || "Query failed");
            break;
          case "done":
          case "complete":
            break;
        }
      }
      updateMessage(assistantId, {
        content: fullContent,
        isStreaming: false,
        toolCalls: currentToolCalls,
        visualizations: currentVisualizations
      });
      factory.recordAgentUsage(agent.id);
      if (currentToolCalls.length > 0) {
        await Promise.all([
          refreshDatasets(),
          refreshVisualizations()
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
      updateMessage(assistantId, {
        content: fullContent || `Error: ${message}`,
        isStreaming: false
      });
    } finally {
      setIsStreaming(false);
      setIsQueryRunning(false);
      setQueryStartTime(null);
      currentMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [
    credentials,
    selectedWorkspace,
    agent,
    addMessage,
    updateMessage,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    clientConfig,
    factory
  ]);
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAgent(null);
    setError(null);
    setToolCalls([]);
    setIsStreaming(false);
    setIsCreating(false);
    contextClear();
  }, [contextClear]);
  const listAgents2 = useCallback(() => {
    return factory.listAgents();
  }, [factory]);
  const useRegisteredAgent = useCallback((agentId) => {
    const registeredAgent = factory.getAgent(agentId);
    if (registeredAgent) {
      setAgent(registeredAgent);
      factory.recordAgentUsage(agentId);
      setError(null);
    } else {
      setError(`Agent ${agentId} not found`);
    }
  }, [factory]);
  const removeAgent = useCallback((agentId) => {
    const removed = factory.removeAgent(agentId);
    if (removed && agent?.id === agentId) {
      setAgent(null);
    }
    return removed;
  }, [factory, agent]);
  return {
    createAgent,
    query,
    agent,
    messages,
    isStreaming,
    isCreating,
    toolCalls,
    error,
    reset,
    listAgents: listAgents2,
    useAgent: useRegisteredAgent,
    removeAgent
  };
}
function useAuthGuard(options = {}) {
  const {
    requireAuth = true,
    requireWorkspace = false,
    redirectTo
  } = options;
  const {
    isAuthenticated,
    isInitialized,
    selectedWorkspace
  } = useFlowstack();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const hasWorkspace = selectedWorkspace !== null;
  const isLoading = !isInitialized;
  const isAllowed = useMemo(() => {
    if (!isInitialized) return false;
    if (requireAuth && !isAuthenticated) return false;
    if (requireWorkspace && !hasWorkspace) return false;
    return true;
  }, [isInitialized, requireAuth, isAuthenticated, requireWorkspace, hasWorkspace]);
  useEffect(() => {
    if (!isInitialized) return;
    if (requireAuth && !isAuthenticated && redirectTo) {
      setShouldRedirect(true);
    } else {
      setShouldRedirect(false);
    }
  }, [isInitialized, requireAuth, isAuthenticated, redirectTo]);
  return {
    isAllowed,
    isLoading,
    shouldRedirect,
    redirectTo,
    isAuthenticated,
    hasWorkspace
  };
}
function useFlowstackStatus(options = {}) {
  const {
    pollInterval = 3e4,
    autoPoll = true,
    checkOnMount = true
  } = options;
  const { config } = useFlowstack();
  const [status, setStatus] = useState("unknown");
  const [isChecking, setIsChecking] = useState(false);
  const [latency, setLatency] = useState(null);
  const [lastConnected, setLastConnected] = useState(null);
  const [error, setError] = useState(null);
  const baseUrl = config.baseUrl || "https://sage-api.flowstack.fun";
  const checkConnection = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatus("connecting");
    setError(null);
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        mode: "cors",
        cache: "no-cache"
      });
      const elapsed = Date.now() - start;
      setLatency(elapsed);
      if (response.ok) {
        setStatus("connected");
        setLastConnected(/* @__PURE__ */ new Date());
        setError(null);
      } else {
        setStatus("error");
        setError(`Server returned ${response.status}`);
      }
    } catch (err) {
      setStatus("disconnected");
      setLatency(null);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsChecking(false);
    }
  }, [baseUrl, isChecking]);
  useEffect(() => {
    if (checkOnMount) {
      checkConnection();
    }
  }, [checkOnMount]);
  useEffect(() => {
    if (!autoPoll || pollInterval <= 0) return;
    const interval = setInterval(checkConnection, pollInterval);
    return () => clearInterval(interval);
  }, [autoPoll, pollInterval, checkConnection]);
  return {
    status,
    isConnected: status === "connected",
    isChecking,
    latency,
    lastConnected,
    error,
    checkConnection
  };
}
function useUserManagement() {
  const { credentials, config } = useFlowstack();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    hasMore: false
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const isMockMode = config.mode === "mock";
  useEffect(() => {
    const checkPermissions = async () => {
      if (!credentials && !isMockMode) {
        setCanManageUsers(false);
        return;
      }
      if (isMockMode) {
        setCanManageUsers(true);
        return;
      }
      try {
        const response = await checkAdminPermissions(credentials, clientConfig);
        if (response.ok && response.data) {
          setCanManageUsers(response.data.canManageUsers);
        }
      } catch {
        setCanManageUsers(false);
      }
    };
    checkPermissions();
  }, [credentials, isMockMode, clientConfig]);
  const refreshUsers = useCallback(async (params) => {
    setError(null);
    setIsLoading(true);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 500);
        let filtered = [...mockManagedUsers];
        const searchTerm = params?.search || search;
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (u) => u.email.toLowerCase().includes(lower) || u.name?.toLowerCase().includes(lower)
          );
        }
        const role = params?.role || roleFilter;
        if (role) {
          filtered = filtered.filter((u) => u.role === role);
        }
        const status = params?.status || statusFilter;
        if (status) {
          filtered = filtered.filter((u) => u.status === status);
        }
        setUsers(filtered);
        setPagination((prev) => ({
          ...prev,
          page: params?.page || prev.page,
          limit: params?.limit || prev.limit,
          totalCount: filtered.length,
          hasMore: false
        }));
        return;
      }
      const response = await listUsers(credentials, {
        page: params?.page || pagination.page,
        limit: params?.limit || pagination.limit,
        search: params?.search || search,
        role: params?.role || roleFilter || void 0,
        status: params?.status || statusFilter || void 0,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder
      }, clientConfig);
      if (response.ok && response.data) {
        setUsers(response.data.users);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          totalCount: response.data.totalCount,
          hasMore: response.data.hasMore
        });
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, isMockMode, clientConfig, pagination.page, pagination.limit, search, roleFilter, statusFilter]);
  const getUser2 = useCallback(async (userId) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return null;
    }
    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        return mockManagedUsers.find((u) => u.id === userId) || null;
      }
      const response = await getUser(credentials, userId, clientConfig);
      if (response.ok && response.data) {
        return response.data.user;
      }
      setError(response.error || "User not found");
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get user";
      setError(message);
      return null;
    }
  }, [credentials, isMockMode, clientConfig]);
  const updateUser2 = useCallback(async (userId, updates) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return false;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? { ...u, ...updates } : u
        ));
        return true;
      }
      const response = await updateUser(credentials, userId, updates, clientConfig);
      if (response.ok && response.data) {
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? response.data.user : u
        ));
        return true;
      }
      setError(response.error || "Failed to update user");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);
  const suspendUser2 = useCallback(async (userId, reason) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return false;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? { ...u, status: "suspended" } : u
        ));
        return true;
      }
      const response = await suspendUser(credentials, userId, reason, clientConfig);
      if (response.ok && response.data) {
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? response.data.user : u
        ));
        return true;
      }
      setError(response.error || "Failed to suspend user");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to suspend user";
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);
  const reactivateUser2 = useCallback(async (userId) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return false;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? { ...u, status: "active" } : u
        ));
        return true;
      }
      const response = await reactivateUser(credentials, userId, clientConfig);
      if (response.ok && response.data) {
        setUsers((prev) => prev.map(
          (u) => u.id === userId ? response.data.user : u
        ));
        return true;
      }
      setError(response.error || "Failed to reactivate user");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reactivate user";
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);
  const deleteUser2 = useCallback(async (userId) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return false;
    }
    try {
      if (isMockMode) {
        await mockDelay(200, 400);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        return true;
      }
      const response = await deleteUser(credentials, userId, clientConfig);
      if (response.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        return true;
      }
      setError(response.error || "Failed to delete user");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
      return false;
    }
  }, [credentials, isMockMode, clientConfig]);
  const getUserActivity2 = useCallback(async (userId, limit = 50) => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return [];
    }
    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        return mockUserActivity.filter((a) => a.userId === userId).slice(0, limit);
      }
      const response = await getUserActivity(credentials, userId, limit, clientConfig);
      if (response.ok && response.data) {
        return response.data.activities;
      }
      setError(response.error || "Failed to get activity");
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get activity";
      setError(message);
      return [];
    }
  }, [credentials, isMockMode, clientConfig]);
  const refreshStats = useCallback(async () => {
    setError(null);
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return;
    }
    try {
      if (isMockMode) {
        await mockDelay(100, 300);
        setStats(mockUserStats);
        return;
      }
      const response = await getUserStats(credentials, clientConfig);
      if (response.ok && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || "Failed to load stats");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load stats";
      setError(message);
    }
  }, [credentials, isMockMode, clientConfig]);
  const setPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);
  const setRoleFilterCallback = useCallback((role) => {
    setRoleFilter(role);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);
  const setStatusFilterCallback = useCallback((status) => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);
  const setSearchCallback = useCallback((searchTerm) => {
    setSearch(searchTerm);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);
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
    getUser: getUser2,
    updateUser: updateUser2,
    suspendUser: suspendUser2,
    reactivateUser: reactivateUser2,
    deleteUser: deleteUser2,
    getUserActivity: getUserActivity2,
    refreshStats,
    setPage,
    setSearch: setSearchCallback,
    setRoleFilter: setRoleFilterCallback,
    setStatusFilter: setStatusFilterCallback,
    canManageUsers
  };
}
function useSites() {
  const { credentials, config } = useFlowstack();
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMockMode = config.mode === "mock";
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const normalizeSite = (raw) => ({
    id: raw.site_id || raw.id || "",
    name: raw.site_name || raw.name || "",
    url: raw.url || "",
    shortUrl: raw.short_url || raw.shortUrl,
    siteType: raw.site_type || raw.siteType || "on_demand",
    fileCount: raw.file_count || raw.fileCount || 0,
    totalBytes: raw.total_bytes || raw.totalBytes,
    createdAt: raw.created_at || raw.createdAt || "",
    description: raw.description,
    metadata: raw.metadata,
    currentVersion: raw.current_version || raw.currentVersion,
    liveVersion: raw.live_version || raw.liveVersion,
    subdomainUrl: raw.subdomain_url || raw.subdomainUrl,
    alias: raw.alias ?? void 0
  });
  const refreshSites = useCallback(async () => {
    if (!credentials && !isMockMode) return;
    setIsLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        setSites([]);
        return;
      }
      const response = await listSites(credentials, clientConfig);
      if (response.ok && response.data) {
        const rawSites = response.data.sites;
        setSites((rawSites || []).map(normalizeSite));
      } else {
        setError(response.error || "Failed to load sites");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setIsLoading(false);
    }
  }, [credentials, isMockMode, config.baseUrl]);
  useEffect(() => {
    refreshSites();
  }, [refreshSites]);
  const createSite2 = useCallback(async (params) => {
    if (!credentials && !isMockMode) {
      setError("Not authenticated");
      return null;
    }
    setError(null);
    try {
      const response = await createSite(credentials, params, clientConfig);
      if (response.ok && response.data) {
        const data = response.data;
        const site = data.site;
        if (site) {
          const normalized = normalizeSite(site);
          setSites((prev) => [normalized, ...prev]);
          return normalized;
        }
        return {
          id: data.site_id,
          name: params.name,
          url: "",
          siteType: params.siteType || "on_demand",
          fileCount: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      setError(response.error || "Failed to create site");
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
      return null;
    }
  }, [credentials, isMockMode, config.baseUrl]);
  const addFile = useCallback(async (siteId, path, content) => {
    if (!credentials) {
      setError("Not authenticated");
      return false;
    }
    setError(null);
    try {
      const response = await addSiteFile(credentials, siteId, path, content, clientConfig);
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add file");
      return false;
    }
  }, [credentials, config.baseUrl]);
  const publishSite = useCallback(async (siteId) => {
    if (!credentials) {
      setError("Not authenticated");
      return null;
    }
    setError(null);
    try {
      const response = await publishStagedSite(credentials, siteId, clientConfig);
      if (response.ok && response.data) {
        const site = response.data.site;
        if (site) {
          const normalized = normalizeSite(site);
          await refreshSites();
          return normalized;
        }
      }
      setError(response.error || "Failed to publish site");
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish site");
      return null;
    }
  }, [credentials, config.baseUrl, refreshSites]);
  const deleteSite2 = useCallback(async (siteId) => {
    if (!credentials) {
      setError("Not authenticated");
      return false;
    }
    setError(null);
    try {
      const response = await deleteSite(credentials, siteId, clientConfig);
      if (response.ok) {
        setSites((prev) => prev.filter((s) => s.id !== siteId));
        return true;
      }
      setError(response.error || "Failed to delete site");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete site");
      return false;
    }
  }, [credentials, config.baseUrl]);
  return {
    sites,
    isLoading,
    error,
    createSite: createSite2,
    addFile,
    publishSite,
    deleteSite: deleteSite2,
    refreshSites
  };
}
function useAgents() {
  const flowstack = useFlowstackOptional();
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientConfig = {
    baseUrl: flowstack?.config?.baseUrl,
    tenantId: flowstack?.config?.tenantId
  };
  const refreshAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAgents(clientConfig);
      if (result.ok && result.data) {
        const normalized = result.data.agents.map((a) => ({
          name: a.name,
          description: a.description || "",
          tools: a.tools || [],
          triggerPhrases: a.trigger_phrases || a.triggerPhrases || [],
          useFor: a.use_for || a.useFor || [],
          isTerminal: a.is_terminal ?? a.isTerminal ?? false
        }));
        setAgents(normalized);
      } else {
        setError(result.error || "Failed to fetch agents");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch agents");
    } finally {
      setIsLoading(false);
    }
  }, [flowstack?.config?.baseUrl]);
  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);
  return { agents, isLoading, error, refreshAgents };
}
function useToolInvocation(options) {
  const { agentName, toolName } = options;
  const { credentials, config } = useFlowstack();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inflightRef = useRef(false);
  const invoke = useCallback(
    async (kwargs = {}) => {
      if (!credentials) {
        const msg = "Not authenticated \u2014 cannot invoke tool";
        setError(msg);
        console.error(`[useToolInvocation] ${msg}`);
        return null;
      }
      if (inflightRef.current) {
        console.warn(`[useToolInvocation] ${agentName}.${toolName} already in flight \u2014 skipping`);
        return null;
      }
      inflightRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const response = await invokeTool(
          credentials,
          agentName,
          toolName,
          kwargs,
          config
        );
        if (!response.ok) {
          const errMsg = response.error || `Tool invocation failed (${response.status})`;
          setError(errMsg);
          console.error(`[useToolInvocation] ${agentName}.${toolName} failed:`, errMsg);
          return null;
        }
        const toolResult = response.data?.result ?? response.data;
        setResult(toolResult);
        return toolResult;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Tool invocation failed";
        setError(errMsg);
        console.error(`[useToolInvocation] ${agentName}.${toolName} error:`, err);
        return null;
      } finally {
        inflightRef.current = false;
        setIsLoading(false);
      }
    },
    [credentials, config, agentName, toolName]
  );
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);
  return { invoke, result, isLoading, error, reset };
}
var DEFAULT_STATE = {
  google: { connected: false },
  reddit: { connected: false },
  strava: { connected: false },
  twitter: { connected: false },
  github: { connected: false }
};
function useConnections() {
  const { credentials, config } = useFlowstack();
  const [connections, setConnections] = useState(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const refresh = useCallback(async () => {
    if (!credentials) return;
    setIsLoading(true);
    setError(null);
    try {
      const [googleRes, redditRes, stravaRes, twitterRes, githubRes] = await Promise.allSettled([
        flowstackFetch("/auth/google/status", { credentials }, clientConfig),
        flowstackFetch("/auth/reddit/status", { credentials }, clientConfig),
        flowstackFetch("/auth/strava/status", { credentials }, clientConfig),
        flowstackFetch("/auth/twitter/status", { credentials }, clientConfig),
        flowstackFetch("/auth/github/status", { credentials }, clientConfig)
      ]);
      const resolveStatus = (res) => res.status === "fulfilled" && res.value.ok ? res.value.data : { connected: false };
      setConnections({
        google: resolveStatus(googleRes),
        reddit: resolveStatus(redditRes),
        strava: resolveStatus(stravaRes),
        twitter: resolveStatus(twitterRes),
        github: resolveStatus(githubRes)
      });
    } catch (err) {
      setError(err.message || "Failed to fetch connection status");
    } finally {
      setIsLoading(false);
    }
  }, [credentials, config.baseUrl, config.tenantId]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const connect = useCallback(async (provider, services) => {
    if (!credentials) throw new Error("Not authenticated");
    setError(null);
    try {
      let startUrl;
      if (provider === "google") {
        const scopes = services?.join(",") || "all";
        const cleanUrl = (() => {
          const u = new URL(window.location.href);
          ["google_oauth", "email", "message"].forEach((p) => u.searchParams.delete(p));
          return u.toString();
        })();
        const returnUrl = encodeURIComponent(cleanUrl);
        const res = await flowstackFetch(
          `/auth/google/start?scopes=${scopes}&redirect_uri=${returnUrl}`,
          { credentials },
          clientConfig
        );
        if (!res.ok || !res.data?.auth_url) throw new Error("Failed to start Google OAuth");
        startUrl = res.data.auth_url;
      } else {
        const cleanUrl = (() => {
          const u = new URL(window.location.href);
          ["google_oauth", "email", "message"].forEach((p) => u.searchParams.delete(p));
          return u.toString();
        })();
        const returnUrl = encodeURIComponent(cleanUrl);
        const res = await flowstackFetch(
          `/auth/${provider}/start?redirect_uri=${returnUrl}`,
          { credentials },
          clientConfig
        );
        if (!res.ok || !res.data?.auth_url) throw new Error(`Failed to start ${provider} OAuth`);
        startUrl = res.data.auth_url;
      }
      const popup = window.open(startUrl, `${provider}_oauth`, "width=600,height=700,scrollbars=yes");
      if (popup) {
        const onMessage = (event) => {
          if (event.data?.type === "flowstack-google-oauth" || event.data?.type === `flowstack-${provider}-oauth`) {
            window.removeEventListener("message", onMessage);
            clearInterval(fallbackTimer);
            refresh();
          }
        };
        window.addEventListener("message", onMessage);
        const fallbackTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(fallbackTimer);
            window.removeEventListener("message", onMessage);
            refresh();
          }
        }, 500);
      } else {
        window.location.href = startUrl;
      }
    } catch (err) {
      setError(err.message || `Failed to connect ${provider}`);
    }
  }, [credentials, config.baseUrl, config.tenantId, refresh]);
  const disconnect = useCallback(async (provider) => {
    if (!credentials) throw new Error("Not authenticated");
    setError(null);
    try {
      if (provider === "google") {
        await flowstackFetch("/auth/google/revoke", { method: "POST", credentials }, clientConfig);
      } else {
        await flowstackFetch(`/auth/${provider}/disconnect`, { method: "POST", credentials }, clientConfig);
      }
      await refresh();
    } catch (err) {
      setError(err.message || `Failed to disconnect ${provider}`);
    }
  }, [credentials, config.baseUrl, config.tenantId, refresh]);
  return { connections, isLoading, error, connect, disconnect, refresh };
}
function useThreads(options) {
  const { credentials, config } = useFlowstack();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const enabled = options?.enabled !== false;
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope
  };
  const refresh = useCallback(async () => {
    if (!credentials || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listThreads(credentials, clientConfig);
      if (res.ok && res.data) {
        setThreads(res.data.threads);
      } else {
        setError(res.error || "Failed to load threads");
      }
    } catch (err) {
      setError(err?.message || "Failed to load threads");
    } finally {
      setIsLoading(false);
    }
  }, [credentials, config.baseUrl, config.tenantId, config.appScope, enabled]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    intervalRef.current = setInterval(refresh, options.refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [options?.refreshInterval, enabled, refresh]);
  const openThread2 = useCallback(
    async (withUserKey) => {
      if (!credentials || !withUserKey) return null;
      const res = await openThread(credentials, withUserKey, clientConfig);
      if (res.ok && res.data) {
        await refresh();
        return res.data.status;
      }
      setError(res.error || "Failed to open thread");
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [credentials, config.baseUrl, config.tenantId, config.appScope, refresh]
  );
  return { threads, isLoading, error, refresh, openThread: openThread2 };
}
function useMessages(withUserKey, options) {
  const { credentials, config } = useFlowstack();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const enabled = options?.enabled !== false && !!withUserKey;
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    appScope: config.appScope
  };
  const refresh = useCallback(async () => {
    if (!credentials || !withUserKey || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMessages(
        credentials,
        withUserKey,
        { limit: options?.limit },
        clientConfig
      );
      if (res.ok && res.data) {
        setMessages(res.data.messages);
      } else {
        setError(res.error || "Failed to load messages");
      }
    } catch (err) {
      setError(err?.message || "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [credentials, withUserKey, config.baseUrl, config.tenantId, config.appScope, enabled, options?.limit]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    intervalRef.current = setInterval(refresh, options.refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [options?.refreshInterval, enabled, refresh]);
  const send = useCallback(
    async (body) => {
      if (!credentials) throw new Error("Not authenticated");
      if (!withUserKey) throw new Error("No counterpart selected");
      if (!body || !body.trim()) return;
      setError(null);
      const res = await sendMessage(credentials, withUserKey, body, clientConfig);
      if (!res.ok) {
        const msg = res.error || "Failed to send message";
        setError(msg);
        throw new Error(msg);
      }
      await refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [credentials, withUserKey, config.baseUrl, config.tenantId, config.appScope, refresh]
  );
  return { messages, isLoading, error, send, refresh };
}
function normalizeVersion(raw) {
  return {
    version: raw.version || 0,
    type: raw.type || "build",
    createdAt: raw.created_at || raw.createdAt || "",
    description: raw.description,
    fileCount: raw.file_count || raw.fileCount || 0,
    totalBytes: raw.total_bytes || raw.totalBytes || 0,
    url: raw.url || ""
  };
}
function normalizeManifest(raw) {
  const versions = raw.versions;
  return {
    siteId: raw.site_id || raw.siteId || "",
    name: raw.name || "",
    liveVersion: raw.live_version || raw.liveVersion || 1,
    versions: (versions || []).map(normalizeVersion),
    alias: raw.alias ?? null,
    githubRepo: raw.github_repo || raw.githubRepo || null
  };
}
function useSiteVersions(siteId) {
  const { credentials, config } = useFlowstack();
  const [versions, setVersions] = useState([]);
  const [liveVersion, setLiveVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId
  };
  const refresh = useCallback(async () => {
    if (!siteId || !credentials) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSiteVersions(credentials, siteId, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
      } else {
        setError(response.error || "Failed to load versions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  }, [siteId, credentials, config.baseUrl]);
  useEffect(() => {
    if (siteId) {
      refresh();
    } else {
      setVersions([]);
      setLiveVersion(null);
      setError(null);
    }
  }, [siteId, refresh]);
  const promote = useCallback(async (version) => {
    if (!siteId || !credentials) return false;
    setError(null);
    try {
      const response = await promoteSiteVersion(credentials, siteId, version, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
        return true;
      }
      setError(response.error || "Failed to promote version");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote version");
      return false;
    }
  }, [siteId, credentials, config.baseUrl]);
  const deleteVersion = useCallback(async (version) => {
    if (!siteId || !credentials) return false;
    setError(null);
    try {
      const response = await deleteSiteVersion(credentials, siteId, version, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
        return true;
      }
      setError(response.error || "Failed to delete version");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete version");
      return false;
    }
  }, [siteId, credentials, config.baseUrl]);
  return {
    versions,
    liveVersion,
    isLoading,
    error,
    promote,
    deleteVersion,
    refresh
  };
}
var CRED_PATH = "/api/v1/user/provider-credentials";
function useProviderCredentials() {
  const { credentials: authCredentials, config } = useFlowstack();
  const [credentials, setCredentials] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const fetchCredentials = useCallback(async () => {
    if (!authCredentials) return;
    try {
      const res = await flowstackFetch(
        CRED_PATH,
        { credentials: authCredentials },
        clientConfig
      );
      if (res.ok && res.data) {
        setCredentials(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [authCredentials, clientConfig.baseUrl]);
  const fetchPurposes = useCallback(async () => {
    if (!authCredentials) return;
    try {
      const res = await flowstackFetch(
        `${CRED_PATH}/purposes`,
        { credentials: authCredentials },
        clientConfig
      );
      if (res.ok && res.data) {
        setPurposes(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
    }
  }, [authCredentials, clientConfig.baseUrl]);
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchCredentials(), fetchPurposes()]);
    setIsLoading(false);
  }, [fetchCredentials, fetchPurposes]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const createCredential = useCallback(async (params) => {
    if (!authCredentials) throw new Error("Not authenticated");
    const res = await flowstackFetch(
      CRED_PATH,
      {
        method: "POST",
        credentials: authCredentials,
        body: params
      },
      clientConfig
    );
    if (!res.ok) {
      throw new Error(res.error || `Failed to create credential: ${res.status}`);
    }
    await fetchCredentials();
    return res.data;
  }, [authCredentials, clientConfig.baseUrl, fetchCredentials]);
  const deleteCredential = useCallback(async (credentialId) => {
    if (!authCredentials) throw new Error("Not authenticated");
    const res = await flowstackFetch(
      `${CRED_PATH}/${credentialId}`,
      {
        method: "DELETE",
        credentials: authCredentials
      },
      clientConfig
    );
    if (!res.ok) {
      throw new Error(res.error || `Failed to delete credential: ${res.status}`);
    }
    await fetchCredentials();
  }, [authCredentials, clientConfig.baseUrl, fetchCredentials]);
  return {
    credentials,
    purposes,
    createCredential,
    deleteCredential,
    refresh,
    isLoading,
    error
  };
}
var DEFAULT_HOST = "http://localhost:11434";
var DETECTION_TIMEOUT_MS = 3e3;
function useOllamaDetection(initialHost = DEFAULT_HOST) {
  const [available, setAvailable] = useState(false);
  const [models, setModels] = useState([]);
  const [host, setHost] = useState(initialHost);
  const [error, setError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const detect = useCallback(async (targetHost) => {
    const h = targetHost || host;
    setIsDetecting(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DETECTION_TIMEOUT_MS);
      const res = await fetch(`${h}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}`);
      }
      const data = await res.json();
      const ollamaModels = (data.models || []).map((m) => ({
        name: m.name,
        size: m.size || 0,
        modified_at: m.modified_at || "",
        digest: m.digest
      }));
      setAvailable(true);
      setModels(ollamaModels);
      if (targetHost) setHost(targetHost);
      return { available: true, host: h, models: ollamaModels };
    } catch (err) {
      const msg = err.name === "AbortError" ? "Connection timed out" : err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError") ? "Ollama not reachable. Ensure it is running and OLLAMA_ORIGINS=* is set." : err.message;
      setAvailable(false);
      setModels([]);
      setError(msg);
      return { available: false, host: h, models: [], error: msg };
    } finally {
      setIsDetecting(false);
    }
  }, [host]);
  useEffect(() => {
    detect();
  }, []);
  return { available, models, host, error, isDetecting, detect };
}
function useDataOverview() {
  const { credentials, config } = useFlowstack();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const refresh = useCallback(async () => {
    if (!credentials) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserDataOverview(credentials, clientConfig);
      if (res.ok && res.data) {
        setOverview(res.data);
      } else {
        setError(res.error || "Failed to load data overview");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, clientConfig.baseUrl]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { overview, isLoading, error, refresh };
}
function useUserCollections(options) {
  const { credentials, config } = useFlowstack();
  const [collections, setCollections] = useState([]);
  const [groupedBySite, setGroupedBySite] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const refresh = useCallback(async () => {
    if (!credentials) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserCollections(
        credentials,
        { siteId: options?.siteId, includeSchema: options?.includeSchema },
        clientConfig
      );
      if (res.ok && res.data) {
        setCollections(res.data.collections || []);
        setGroupedBySite(res.data.grouped_by_site || {});
      } else {
        setError(res.error || "Failed to load collections");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, options?.siteId, options?.includeSchema, clientConfig.baseUrl]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const handleDelete = useCallback(async (fullName) => {
    if (!credentials) return false;
    try {
      const res = await deleteUserCollection(credentials, fullName, clientConfig);
      if (res.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [credentials, clientConfig.baseUrl, refresh]);
  return {
    collections,
    groupedBySite,
    isLoading,
    error,
    refresh,
    deleteCollection: handleDelete
  };
}
function useCollectionExplorer(collection, options) {
  const { credentials, config } = useFlowstack();
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [schema, setSchema] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = options?.limit || 50;
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const fetchDocuments = useCallback(async () => {
    if (!credentials || !collection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserCollectionDocuments(
        credentials,
        collection,
        {
          filter: options?.filter,
          limit: pageSize,
          skip: page * pageSize,
          sort: options?.sort,
          database: options?.database
        },
        clientConfig
      );
      if (res.ok && res.data) {
        setDocuments(res.data.documents || []);
        setTotal(res.data.total || 0);
      } else {
        setError(res.error || "Failed to load documents");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, collection, page, pageSize, options?.filter, options?.sort, options?.database, clientConfig.baseUrl]);
  const fetchSchema = useCallback(async () => {
    if (!credentials || !collection) return;
    try {
      const res = await getUserCollectionSchema(
        credentials,
        collection,
        { database: options?.database },
        clientConfig
      );
      if (res.ok && res.data) {
        setSchema(res.data);
      }
    } catch {
    }
  }, [credentials, collection, options?.database, clientConfig.baseUrl]);
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);
  const refresh = useCallback(async () => {
    await Promise.all([fetchDocuments(), fetchSchema()]);
  }, [fetchDocuments, fetchSchema]);
  const exportAs = useCallback(async (format) => {
    if (!credentials) return;
    try {
      const res = await exportUserCollection(
        credentials,
        collection,
        { format, filter: options?.filter, database: options?.database },
        clientConfig
      );
      if (res.ok && res.data) {
        const blob = res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${collection}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  }, [credentials, collection, options?.filter, options?.database, clientConfig.baseUrl]);
  const handleDelete = useCallback(async () => {
    if (!credentials) return false;
    try {
      const res = await deleteUserCollection(credentials, collection, clientConfig);
      return res.ok === true;
    } catch {
      return false;
    }
  }, [credentials, collection, clientConfig.baseUrl]);
  return {
    documents,
    total,
    schema,
    isLoading,
    error,
    page,
    pageSize,
    setPage,
    refresh,
    exportAs,
    deleteCollection: handleDelete
  };
}
var MISSING_TENANT = "usePublicCollection requires a tenantId. Set `tenantId` on FlowstackProvider \u2014 anonymous public collections have no token for the backend to derive it from.";
function usePublicCollection(collection, options) {
  const flowstack = useFlowstackOptional();
  const [documents, setDocuments] = useState([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const baseUrl = flowstack?.config?.baseUrl ?? "https://sage-api.flowstack.fun";
  const appScope = flowstack?.config?.appScope ?? "";
  const tenantId = flowstack?.credentials?.tenantId || flowstack?.config?.tenantId || "";
  const enabled = options?.enabled !== false;
  const fetchData = useCallback(async () => {
    if (!appScope || !enabled) return;
    if (!tenantId) {
      setError(MISSING_TENANT);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.limit !== void 0) params.set("limit", String(options.limit));
      if (options?.skip !== void 0) params.set("skip", String(options.skip));
      if (options?.sort) {
        const [field, dir] = Object.entries(options.sort)[0] ?? [];
        if (field) {
          params.set("sort_field", field);
          params.set("sort_dir", String(dir ?? -1));
        }
      }
      if (options?.filter) {
        params.set("filter_json", JSON.stringify(options.filter));
      }
      const url = `${baseUrl}/public/collections/${encodeURIComponent(collection)}/documents?${params.toString()}`;
      const resp = await fetch(url, {
        headers: {
          "X-App-Scope": appScope,
          "X-Tenant-ID": tenantId
        }
      });
      if (!mountedRef.current) return;
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.detail || `Query failed: ${resp.status}`);
        return;
      }
      const data = await resp.json();
      if (mountedRef.current) {
        setDocuments(data.documents ?? []);
        setCount(data.count ?? 0);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "Network error");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    baseUrl,
    appScope,
    tenantId,
    collection,
    enabled,
    JSON.stringify(options?.filter),
    options?.limit,
    options?.skip,
    JSON.stringify(options?.sort)
  ]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    const interval = setInterval(fetchData, options.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refreshInterval, enabled]);
  const insert = useCallback(async (doc) => {
    if (!appScope) throw new Error("No appScope \u2014 FlowstackProvider must be mounted with a valid appScope");
    if (!tenantId) throw new Error(MISSING_TENANT);
    const url = `${baseUrl}/public/collections/${encodeURIComponent(collection)}/insert`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Scope": appScope,
        "X-Tenant-ID": tenantId
      },
      body: JSON.stringify({ document: doc })
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.detail || `Insert failed: ${resp.status}`);
    }
    const data = await resp.json();
    fetchData();
    return { inserted_id: data.inserted_id };
  }, [baseUrl, appScope, tenantId, collection, fetchData]);
  return { documents, count, total, isLoading, error, insert, refresh: fetchData };
}
function useConversations(options) {
  const { credentials, config } = useFlowstack();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseUrl = config?.baseUrl || "https://sage-api.flowstack.fun";
  const apiKey = credentials?.apiKey;
  const limit = options?.limit ?? 50;
  const refresh = useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/library/conversations?limit=${limit}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const items = (data.items || data.conversations || []).map((c) => {
        const rawTitle = c.title?.trim();
        const rawPreview = (c.first_message_preview || c.last_snippet || "").trim();
        const title = rawTitle || (rawPreview ? rawPreview.slice(0, 60) : "Untitled");
        return {
          id: c.conversation_id || c.id || c.session_id || "",
          title,
          // show the preview text if it differs from the title
          preview: rawPreview && rawPreview !== title ? rawPreview.slice(0, 80) : "",
          last_message_at: c.last_activity_at || c.last_message_at || c.created_at,
          message_count: c.message_count,
          starred: c.starred
        };
      });
      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, limit]);
  useEffect(() => {
    if (!credentials) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [credentials, refresh]);
  useEffect(() => {
    const interval = options?.refreshIntervalMs ?? 0;
    if (!interval || interval < 1e3 || !credentials) return;
    const handle = setInterval(refresh, interval);
    return () => clearInterval(handle);
  }, [credentials, refresh, options?.refreshIntervalMs]);
  const deleteConversation = useCallback(async (sessionId) => {
    if (!apiKey) return false;
    try {
      const res = await fetch(`${baseUrl}/library/conversations/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== sessionId));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [apiKey, baseUrl]);
  const renameConversation = useCallback(async (sessionId, title) => {
    if (!apiKey) return false;
    try {
      const res = await fetch(`${baseUrl}/library/conversations/${sessionId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        setConversations((prev) => prev.map((c) => c.id === sessionId ? { ...c, title } : c));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [apiKey, baseUrl]);
  return { conversations, isLoading, error, refresh, deleteConversation, renameConversation };
}
function useIntegrations() {
  const { credentials, config } = useFlowstack();
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const base = config?.baseUrl || "https://sage-api.flowstack.fun";
  const creds = credentials;
  const headers = () => ({
    Authorization: `Bearer ${creds?.apiKey || ""}`,
    "X-Tenant-ID": creds?.tenantId || config?.tenantId || "",
    "Content-Type": "application/json"
  });
  const refresh = useCallback(async () => {
    if (!creds?.apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/integrations`, { headers: headers() });
      if (!res.ok) {
        setError(`Failed to load integrations (${res.status})`);
        return;
      }
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch (e) {
      setError(e.message || "Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  }, [creds?.apiKey, creds?.tenantId, base]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const create = useCallback(async (input) => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/integrations`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(input)
      });
      if (!res.ok) return null;
      const data = await res.json();
      await refresh();
      return data;
    } catch {
      return null;
    }
  }, [creds?.apiKey, base, refresh]);
  const update = useCallback(async (id, input) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(input)
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const remove = useCallback(async (id) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: headers()
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const get = useCallback(async (id) => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/integrations/${encodeURIComponent(id)}`, { headers: headers() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [creds?.apiKey, base]);
  return { integrations, isLoading, error, create, update, remove, get, refresh };
}
function useAutomations() {
  const { credentials, config } = useFlowstack();
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const base = config?.baseUrl || "https://sage-api.flowstack.fun";
  const creds = credentials;
  const headers = () => ({
    Authorization: `Bearer ${creds?.apiKey || ""}`,
    "X-Tenant-ID": creds?.tenantId || config?.tenantId || "",
    "Content-Type": "application/json"
  });
  const refresh = useCallback(async () => {
    if (!creds?.apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/automations`, { headers: headers() });
      if (!res.ok) {
        setError(`Failed to load automations (${res.status})`);
        return;
      }
      const data = await res.json();
      setAutomations(Array.isArray(data) ? data : data.automations ?? []);
    } catch (e) {
      setError(e.message || "Failed to load automations");
    } finally {
      setIsLoading(false);
    }
  }, [creds?.apiKey, creds?.tenantId, base]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const create = useCallback(async (input) => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/automations`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(input)
      });
      if (!res.ok) return null;
      const data = await res.json();
      await refresh();
      return data;
    } catch {
      return null;
    }
  }, [creds?.apiKey, base, refresh]);
  const update = useCallback(async (id, input) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(input)
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const remove = useCallback(async (id) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: headers()
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const pause = useCallback(async (id) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/pause`, {
        method: "POST",
        headers: headers()
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const resume = useCallback(async (id) => {
    if (!creds?.apiKey) return false;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/resume`, {
        method: "POST",
        headers: headers()
      });
      if (res.ok) await refresh();
      return res.ok;
    } catch {
      return false;
    }
  }, [creds?.apiKey, base, refresh]);
  const runNow = useCallback(async (id) => {
    if (!creds?.apiKey) return null;
    try {
      const res = await fetch(`${base}/automations/${encodeURIComponent(id)}/run`, {
        method: "POST",
        headers: headers()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [creds?.apiKey, base]);
  const getRuns = useCallback(async (id, limit = 20) => {
    if (!creds?.apiKey) return [];
    try {
      const url = `${base}/automations/${encodeURIComponent(id)}/runs?limit=${limit}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.runs ?? [];
    } catch {
      return [];
    }
  }, [creds?.apiKey, base]);
  return { automations, isLoading, error, create, update, remove, pause, resume, runNow, getRuns, refresh };
}
function LoginForm({
  onSuccess,
  onError,
  showRegisterLink = false,
  registerHref = "/register",
  className = "",
  inputClassName = "",
  buttonClassName = "",
  labels = {}
}) {
  const { login: login2, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      const success = await login2(email, password);
      if (success) {
        onSuccess?.();
      } else {
        const errorMsg = authError || "Login failed";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };
  const displayError = error || authError;
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: `flowstack-login-form ${className}`, children: [
    /* @__PURE__ */ jsx("h2", { className: "flowstack-login-title", children: labels.title || "Sign In" }),
    displayError && /* @__PURE__ */ jsx("div", { className: "flowstack-login-error", role: "alert", children: displayError }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-login-field", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-email", children: labels.email || "Email" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "flowstack-email",
          type: "email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          placeholder: "you@example.com",
          disabled: isLoading,
          required: true,
          autoComplete: "email",
          className: inputClassName
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-login-field", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-password", children: labels.password || "Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "flowstack-password",
          type: "password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          placeholder: "Enter password",
          disabled: isLoading,
          required: true,
          autoComplete: "current-password",
          className: inputClassName
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: `flowstack-login-button ${buttonClassName}`,
        children: isLoading ? labels.loading || "Signing in..." : labels.submit || "Sign In"
      }
    ),
    showRegisterLink && /* @__PURE__ */ jsxs("p", { className: "flowstack-login-register", children: [
      "Don't have an account?",
      " ",
      /* @__PURE__ */ jsx("a", { href: registerHref, children: labels.register || "Register" })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .flowstack-login-title {
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
          margin: 0 0 1rem 0;
        }
        .flowstack-login-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-login-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-login-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-login-field input {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        .flowstack-login-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-login-button {
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-login-button:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-login-register {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-login-register a {
          color: #3b82f6;
          text-decoration: none;
        }
        .flowstack-login-register a:hover {
          text-decoration: underline;
        }
      ` })
  ] });
}
function RegisterForm({
  onSuccess,
  onError,
  showLoginLink = false,
  loginHref = "/login",
  minPasswordLength = 8,
  className = "",
  inputClassName = "",
  buttonClassName = "",
  labels = {}
}) {
  const { register: register2, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const success = await register2(email, password);
      if (success) {
        onSuccess?.();
      } else {
        const errorMsg = authError || "Registration failed";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };
  const displayError = error || authError;
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: `flowstack-register-form ${className}`, children: [
    /* @__PURE__ */ jsx("h2", { className: "flowstack-register-title", children: labels.title || "Create Account" }),
    displayError && /* @__PURE__ */ jsx("div", { className: "flowstack-register-error", role: "alert", children: displayError }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-register-field", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-reg-email", children: labels.email || "Email" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "flowstack-reg-email",
          type: "email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          placeholder: "you@example.com",
          disabled: isLoading,
          required: true,
          autoComplete: "email",
          className: inputClassName
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-register-field", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-reg-password", children: labels.password || "Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "flowstack-reg-password",
          type: "password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          placeholder: `At least ${minPasswordLength} characters`,
          disabled: isLoading,
          required: true,
          autoComplete: "new-password",
          className: inputClassName
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-register-field", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-reg-confirm", children: labels.confirmPassword || "Confirm Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "flowstack-reg-confirm",
          type: "password",
          value: confirmPassword,
          onChange: (e) => setConfirmPassword(e.target.value),
          placeholder: "Confirm your password",
          disabled: isLoading,
          required: true,
          autoComplete: "new-password",
          className: inputClassName
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: `flowstack-register-button ${buttonClassName}`,
        children: isLoading ? labels.loading || "Creating account..." : labels.submit || "Create Account"
      }
    ),
    showLoginLink && /* @__PURE__ */ jsxs("p", { className: "flowstack-register-login", children: [
      "Already have an account?",
      " ",
      /* @__PURE__ */ jsx("a", { href: loginHref, children: labels.login || "Sign In" })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-register-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .flowstack-register-title {
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
          margin: 0 0 1rem 0;
        }
        .flowstack-register-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-register-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-register-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-register-field input {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        .flowstack-register-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-register-button {
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-register-button:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-register-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-register-login {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-register-login a {
          color: #3b82f6;
          text-decoration: none;
        }
        .flowstack-register-login a:hover {
          text-decoration: underline;
        }
      ` })
  ] });
}
function GoogleSignIn({
  onSuccess,
  onError,
  className = "",
  label = "Continue with Google"
}) {
  const { googleSignIn, isLoading, error } = useAuth();
  const handleClick = async () => {
    try {
      await googleSignIn();
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Google sign-in failed";
      onError?.(errorMsg);
    }
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: handleClick,
      disabled: isLoading,
      className: `flowstack-google-button ${className}`,
      children: [
        /* @__PURE__ */ jsxs(
          "svg",
          {
            className: "flowstack-google-icon",
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            children: [
              /* @__PURE__ */ jsx(
                "path",
                {
                  fill: "#4285F4",
                  d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  fill: "#34A853",
                  d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  fill: "#FBBC05",
                  d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                }
              ),
              /* @__PURE__ */ jsx(
                "path",
                {
                  fill: "#EA4335",
                  d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("span", { children: isLoading ? "Loading..." : label }),
        error && /* @__PURE__ */ jsx("span", { className: "flowstack-google-error", children: error }),
        /* @__PURE__ */ jsx("style", { children: `
        .flowstack-google-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .flowstack-google-button:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .flowstack-google-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-google-icon {
          flex-shrink: 0;
        }
        .flowstack-google-error {
          display: block;
          width: 100%;
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
      ` })
      ]
    }
  );
}
var DEFAULT_BROKER_URL = "https://openinferencefoundation.org/auth/broker";
var EXPECTED_SENDER_ORIGIN = "https://openinferencefoundation.org";
function deriveExpectedOrigin(brokerUrl) {
  try {
    const url = new URL(brokerUrl);
    return url.origin;
  } catch {
    return EXPECTED_SENDER_ORIGIN;
  }
}
function isBrokerMessage(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.type === "flowstack-auth-success" && typeof d.state === "string" && !!d.credentials;
}
function BrokeredLoginButton({
  brokerUrl = DEFAULT_BROKER_URL,
  label = "Continue with Flowstack",
  className = "",
  onSuccess
}) {
  const { setCredentials, config } = useFlowstack();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const stateRef = useRef("");
  const expectedOriginRef = useRef(deriveExpectedOrigin(brokerUrl));
  useEffect(() => {
    expectedOriginRef.current = deriveExpectedOrigin(brokerUrl);
  }, [brokerUrl]);
  useEffect(() => {
    const listener = (event) => {
      if (event.origin !== expectedOriginRef.current) return;
      if (popupRef.current && event.source !== null && event.source !== popupRef.current) return;
      if (!isBrokerMessage(event.data)) return;
      if (event.data.state !== stateRef.current) {
        setError("Authentication state mismatch. Please try again.");
        setIsOpening(false);
        return;
      }
      const c = event.data.credentials;
      if (!c.apiKey || !c.tenantId) {
        setError("Authentication response was incomplete.");
        setIsOpening(false);
        return;
      }
      const creds = {
        apiKey: c.apiKey,
        tenantId: c.tenantId,
        userId: c.userId,
        email: c.email,
        expiresAt: c.expiresAt
      };
      setCredentials(creds);
      setIsOpening(false);
      setError(null);
      onSuccess?.(creds);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [setCredentials, onSuccess]);
  const handleClick = useCallback(() => {
    setError(null);
    setIsOpening(true);
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    stateRef.current = nonce;
    let forceRelogin = false;
    try {
      forceRelogin = typeof window !== "undefined" && window.localStorage.getItem("flowstack:force_relogin") === "1";
      if (forceRelogin) window.localStorage.removeItem("flowstack:force_relogin");
    } catch {
    }
    const url = `${brokerUrl}?return=${encodeURIComponent(window.location.origin)}&state=${encodeURIComponent(nonce)}` + (config.appScope ? `&app_scope=${encodeURIComponent(config.appScope)}` : "") + (forceRelogin ? "&force_login=1" : "");
    const popup = window.open(
      url,
      "flowstack-auth",
      "width=480,height=720,left=200,top=100"
    );
    if (!popup) {
      setError("Pop-up blocked. Please allow pop-ups from this site and try again.");
      setIsOpening(false);
      return;
    }
    popupRef.current = popup;
    const watchdog = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(watchdog);
        setIsOpening((prev) => prev ? false : prev);
      }
    }, 500);
  }, [brokerUrl]);
  return /* @__PURE__ */ jsxs("div", { className, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: handleClick,
        disabled: isOpening,
        style: {
          width: "100%",
          padding: "12px 16px",
          background: "#7c3aed",
          color: "#ffffff",
          border: "none",
          borderRadius: "10px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: isOpening ? "default" : "pointer",
          opacity: isOpening ? 0.6 : 1,
          transition: "opacity 150ms ease"
        },
        children: isOpening ? "Signing in\u2026" : label
      }
    ),
    error && /* @__PURE__ */ jsx(
      "p",
      {
        style: {
          marginTop: "8px",
          color: "#ef4444",
          fontSize: "13px",
          lineHeight: 1.4
        },
        children: error
      }
    )
  ] });
}
var Spinner = () => /* @__PURE__ */ jsxs("div", { className: "flowstack-auth-loading", children: [
  /* @__PURE__ */ jsx("div", { className: "flowstack-auth-spinner" }),
  /* @__PURE__ */ jsx("style", { children: `
      .flowstack-auth-loading { display: flex; align-items: center; justify-content: center; min-height: 200px; }
      .flowstack-auth-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: flowstack-spin 0.8s linear infinite; }
      @keyframes flowstack-spin { to { transform: rotate(360deg); } }
    ` })
] });
function AuthGuard({
  children,
  fallback,
  redirectTo,
  loadingComponent,
  requireWorkspace = false,
  allowGuest = true
}) {
  const {
    isAuthenticated,
    isInitialized,
    selectedWorkspace,
    config,
    setCredentials
  } = useFlowstack();
  const appScope = config?.appScope;
  const baseUrl = config?.baseUrl || "https://sage-api.flowstack.fun";
  const [guestStatus, setGuestStatus] = useState("idle");
  const guestStartedRef = useRef(false);
  useEffect(() => {
    if (!allowGuest || !isInitialized || isAuthenticated || !appScope || guestStartedRef.current) {
      return;
    }
    guestStartedRef.current = true;
    setGuestStatus("trying");
    fetch(`${baseUrl}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: appScope })
    }).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((data) => {
      if (data?.token) {
        setGuestStatus("done");
        setCredentials({ apiKey: data.token, tenantId: data.tenant_id, userId: data.user_id });
      } else {
        setGuestStatus("failed");
      }
    }).catch(() => {
      setGuestStatus("failed");
    });
  }, [allowGuest, isInitialized, isAuthenticated, appScope, baseUrl, setCredentials]);
  useEffect(() => {
  }, [isInitialized, isAuthenticated, redirectTo]);
  if (!isInitialized) {
    return loadingComponent ? /* @__PURE__ */ jsx(Fragment, { children: loadingComponent }) : /* @__PURE__ */ jsx(Spinner, {});
  }
  if (!isAuthenticated && allowGuest && appScope && guestStatus === "trying") {
    return loadingComponent ? /* @__PURE__ */ jsx(Fragment, { children: loadingComponent }) : /* @__PURE__ */ jsx(Spinner, {});
  }
  if (!isAuthenticated) {
    if (fallback) return /* @__PURE__ */ jsx(Fragment, { children: fallback });
    return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: "16px", padding: "32px" }, children: [
      /* @__PURE__ */ jsx("p", { style: { color: "#6b7280", fontSize: "15px", textAlign: "center" }, children: "Sign in to continue" }),
      /* @__PURE__ */ jsx(BrokeredLoginButton, {})
    ] });
  }
  if (requireWorkspace && !selectedWorkspace) {
    return /* @__PURE__ */ jsxs("div", { className: "flowstack-workspace-required", children: [
      /* @__PURE__ */ jsx("p", { children: "Please select a workspace to continue." }),
      /* @__PURE__ */ jsx("style", { children: `
          .flowstack-workspace-required {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: #6b7280;
          }
        ` })
    ] });
  }
  return /* @__PURE__ */ jsx(Fragment, { children });
}
function AdminGate({
  children,
  passwordHash,
  fallback,
  storageKey = "flowstack_admin"
}) {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!password.trim()) return;
      if (!passwordHash) {
        localStorage.setItem(storageKey, "true");
        setIsAdmin(true);
        return;
      }
      const data = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (hashHex === passwordHash) {
        localStorage.setItem(storageKey, "true");
        setIsAdmin(true);
      } else {
        setError("Invalid admin password");
      }
    },
    [password, passwordHash, storageKey]
  );
  if (isAdmin) return /* @__PURE__ */ jsx(Fragment, { children });
  if (fallback) return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px"
      },
      children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("p", { style: { marginBottom: "8px", fontSize: "14px", color: "#6b7280" }, children: "Admin access required" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => {
              setPassword(e.target.value);
              setError("");
            },
            placeholder: "Enter admin password",
            style: {
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              marginRight: "8px",
              fontSize: "16px"
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            style: {
              padding: "8px 16px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            },
            children: "Enter"
          }
        ),
        error && /* @__PURE__ */ jsx("p", { style: { color: "#ef4444", fontSize: "12px", marginTop: "4px" }, children: error })
      ] })
    }
  );
}
function WorkspaceSelector({
  workspaces,
  selected,
  onSelect,
  onCreateNew,
  isLoading = false,
  className = "",
  placeholder = "Select workspace"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleSelect = (workspace) => {
    onSelect(workspace);
    setIsOpen(false);
  };
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "";
    }
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: containerRef,
      className: `flowstack-workspace-selector ${className}`,
      children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setIsOpen(!isOpen),
            disabled: isLoading,
            className: "flowstack-workspace-trigger",
            children: [
              /* @__PURE__ */ jsx("span", { className: "flowstack-workspace-value", children: selected?.name || placeholder }),
              /* @__PURE__ */ jsx(
                "svg",
                {
                  className: `flowstack-workspace-chevron ${isOpen ? "open" : ""}`,
                  width: "16",
                  height: "16",
                  viewBox: "0 0 16 16",
                  fill: "none",
                  children: /* @__PURE__ */ jsx(
                    "path",
                    {
                      d: "M4 6L8 10L12 6",
                      stroke: "currentColor",
                      strokeWidth: "1.5",
                      strokeLinecap: "round",
                      strokeLinejoin: "round"
                    }
                  )
                }
              )
            ]
          }
        ),
        isOpen && /* @__PURE__ */ jsxs("div", { className: "flowstack-workspace-dropdown", children: [
          workspaces.length === 0 ? /* @__PURE__ */ jsx("div", { className: "flowstack-workspace-empty", children: "No workspaces found" }) : /* @__PURE__ */ jsx("ul", { className: "flowstack-workspace-list", children: workspaces.map((workspace) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => handleSelect(workspace),
              className: `flowstack-workspace-item ${selected?.workspaceId === workspace.workspaceId ? "selected" : ""}`,
              children: [
                /* @__PURE__ */ jsx("span", { className: "flowstack-workspace-name", children: workspace.name }),
                /* @__PURE__ */ jsxs("span", { className: "flowstack-workspace-meta", children: [
                  workspace.datasetCount,
                  " datasets",
                  workspace.lastAccessed && ` \u2022 ${formatDate(workspace.lastAccessed)}`
                ] })
              ]
            }
          ) }, workspace.workspaceId)) }),
          onCreateNew && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setIsOpen(false);
                onCreateNew();
              },
              className: "flowstack-workspace-create",
              children: [
                /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M8 3V13M3 8H13",
                    stroke: "currentColor",
                    strokeWidth: "1.5",
                    strokeLinecap: "round"
                  }
                ) }),
                "Create new workspace"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("style", { children: `
        .flowstack-workspace-selector {
          position: relative;
          width: 100%;
        }
        .flowstack-workspace-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .flowstack-workspace-trigger:hover:not(:disabled) {
          border-color: #9ca3af;
        }
        .flowstack-workspace-trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-workspace-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .flowstack-workspace-chevron {
          flex-shrink: 0;
          transition: transform 0.15s;
        }
        .flowstack-workspace-chevron.open {
          transform: rotate(180deg);
        }
        .flowstack-workspace-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
        }
        .flowstack-workspace-empty {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .flowstack-workspace-list {
          list-style: none;
          margin: 0;
          padding: 0.25rem 0;
        }
        .flowstack-workspace-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-workspace-item:hover {
          background: #f3f4f6;
        }
        .flowstack-workspace-item.selected {
          background: #eff6ff;
        }
        .flowstack-workspace-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }
        .flowstack-workspace-meta {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }
        .flowstack-workspace-create {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: none;
          border: none;
          border-top: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #3b82f6;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-workspace-create:hover {
          background: #f3f4f6;
        }
      ` })
      ]
    }
  );
}
function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
  className = ""
}) {
  const { createWorkspace: createWorkspace2, isLoading, error: hookError } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }
    try {
      const workspace = await createWorkspace2(name.trim(), description.trim() || void 0);
      if (workspace) {
        onCreated?.(workspace);
        onClose();
      } else {
        setError(hookError || "Failed to create workspace");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    }
  };
  if (!isOpen) return null;
  const displayError = error || hookError;
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-modal-overlay ${className}`, onClick: onClose, children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "flowstack-modal-content",
        onClick: (e) => e.stopPropagation(),
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "flowstack-modal-title",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flowstack-modal-header", children: [
            /* @__PURE__ */ jsx("h2", { id: "flowstack-modal-title", children: "Create Workspace" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                className: "flowstack-modal-close",
                "aria-label": "Close",
                children: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M5 5L15 15M15 5L5 15",
                    stroke: "currentColor",
                    strokeWidth: "1.5",
                    strokeLinecap: "round"
                  }
                ) })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
            displayError && /* @__PURE__ */ jsx("div", { className: "flowstack-modal-error", role: "alert", children: displayError }),
            /* @__PURE__ */ jsxs("div", { className: "flowstack-modal-field", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-ws-name", children: "Name *" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: inputRef,
                  id: "flowstack-ws-name",
                  type: "text",
                  value: name,
                  onChange: (e) => setName(e.target.value),
                  placeholder: "My Project",
                  disabled: isLoading,
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flowstack-modal-field", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "flowstack-ws-desc", children: "Description" }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: "flowstack-ws-desc",
                  value: description,
                  onChange: (e) => setDescription(e.target.value),
                  placeholder: "Optional description...",
                  disabled: isLoading,
                  rows: 3
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flowstack-modal-actions", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  disabled: isLoading,
                  className: "flowstack-modal-cancel",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  disabled: isLoading || !name.trim(),
                  className: "flowstack-modal-submit",
                  children: isLoading ? "Creating..." : "Create Workspace"
                }
              )
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .flowstack-modal-content {
          background: white;
          border-radius: 0.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .flowstack-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .flowstack-modal-header h2 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }
        .flowstack-modal-close {
          padding: 0.25rem;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: color 0.15s;
        }
        .flowstack-modal-close:hover {
          color: #111827;
        }
        .flowstack-modal-content form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .flowstack-modal-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-modal-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-modal-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-modal-field input,
        .flowstack-modal-field textarea {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          resize: vertical;
        }
        .flowstack-modal-field input:focus,
        .flowstack-modal-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .flowstack-modal-cancel {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-modal-cancel:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .flowstack-modal-submit {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-modal-submit:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-modal-submit:disabled,
        .flowstack-modal-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      ` })
  ] });
}
function DatasetUploader({
  onUpload,
  onUploadComplete,
  onError,
  accept = ".csv,.xlsx,.xls,.json,.parquet",
  maxSizeMB = 100,
  className = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };
  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };
  const handleFile = async (file) => {
    setError(null);
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      const errMsg = `File too large. Max size is ${maxSizeMB}MB`;
      setError(errMsg);
      onError?.(errMsg);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    const acceptedExts = accept.split(",").map((a) => a.replace(".", "").trim());
    if (ext && !acceptedExts.includes(ext)) {
      const errMsg = `Invalid file type. Accepted: ${accept}`;
      setError(errMsg);
      onError?.(errMsg);
      return;
    }
    setIsUploading(true);
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);
    try {
      const dataset = await onUpload(file);
      clearInterval(progressInterval);
      setProgress(100);
      if (dataset) {
        onUploadComplete?.(dataset);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      clearInterval(progressInterval);
      const errMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errMsg);
      onError?.(errMsg);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-uploader ${className}`, children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `flowstack-uploader-zone ${isDragging ? "dragging" : ""} ${isUploading ? "uploading" : ""}`,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: () => inputRef.current?.click(),
        children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: inputRef,
              type: "file",
              accept,
              onChange: handleChange,
              disabled: isUploading,
              hidden: true
            }
          ),
          isUploading ? /* @__PURE__ */ jsxs("div", { className: "flowstack-uploader-progress", children: [
            /* @__PURE__ */ jsx("div", { className: "flowstack-uploader-spinner" }),
            /* @__PURE__ */ jsxs("p", { children: [
              "Uploading... ",
              progress,
              "%"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flowstack-uploader-bar", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "flowstack-uploader-fill",
                style: { width: `${progress}%` }
              }
            ) })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              "svg",
              {
                className: "flowstack-uploader-icon",
                width: "48",
                height: "48",
                viewBox: "0 0 48 48",
                fill: "none",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M8 32L8 36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32M32 16L24 8M24 8L16 16M24 8V32",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxs("p", { className: "flowstack-uploader-text", children: [
              /* @__PURE__ */ jsx("strong", { children: "Click to upload" }),
              " or drag and drop"
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "flowstack-uploader-hint", children: [
              "CSV, Excel, JSON, or Parquet (max ",
              maxSizeMB,
              "MB)"
            ] })
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsx("div", { className: "flowstack-uploader-error", role: "alert", children: error }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-uploader {
          width: 100%;
        }
        .flowstack-uploader-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          background: #fafafa;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .flowstack-uploader-zone:hover,
        .flowstack-uploader-zone.dragging {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .flowstack-uploader-zone.uploading {
          cursor: default;
          border-style: solid;
        }
        .flowstack-uploader-icon {
          color: #9ca3af;
          margin-bottom: 1rem;
        }
        .flowstack-uploader-text {
          font-size: 0.9375rem;
          color: #374151;
          margin: 0 0 0.25rem;
        }
        .flowstack-uploader-hint {
          font-size: 0.8125rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-uploader-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .flowstack-uploader-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: flowstack-spin 0.8s linear infinite;
        }
        @keyframes flowstack-spin {
          to { transform: rotate(360deg); }
        }
        .flowstack-uploader-progress p {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
        }
        .flowstack-uploader-bar {
          width: 200px;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        .flowstack-uploader-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.2s;
        }
        .flowstack-uploader-error {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
      ` })
  ] });
}

// src/utils/mermaid-utils.ts
var VALID_DIAGRAM_TYPES = [
  "graph",
  "flowchart",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "erdiagram",
  "gantt",
  "pie",
  "gitgraph",
  "mindmap",
  "timeline",
  "sankey",
  "xychart",
  "block"
];
function sanitizeMermaidCode(code) {
  if (!code || !code.trim()) return code;
  const lines = code.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim())?.trim().toLowerCase() ?? "";
  if (!VALID_DIAGRAM_TYPES.some((t) => firstNonEmpty.startsWith(t))) {
    return code;
  }
  let result = code;
  result = result.replace(/<\/?[a-z][a-z0-9]*\s*\/?>/gi, " ");
  result = result.replace(/\[([^\]]*)\]/g, (_match, inner) => {
    const cleaned = inner.replace(/&/g, " and ").replace(/\|/g, "/").replace(/#(?![0-9a-fA-F]{3,6}\b)/g, "no.");
    return `[${cleaned}]`;
  });
  result = result.replace(/\(([^)]*)\)/g, (_match, inner) => {
    const cleaned = inner.replace(/&/g, " and ").replace(/\|/g, "/").replace(/#(?![0-9a-fA-F]{3,6}\b)/g, "no.");
    return `(${cleaned})`;
  });
  result = result.replace(/^\s*$/gm, "").replace(/\n{2,}/g, "\n");
  result = result.replace(/(\S)\s{2,}(style\s+)/g, "$1\n$2");
  return result;
}
var MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/g;
function splitContentSegments(text) {
  if (!text) return [{ type: "text", content: text ?? "" }];
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MERMAID_BLOCK_RE)) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      const before = text.slice(lastIndex, matchStart);
      if (before.trim()) segments.push({ type: "text", content: before });
    }
    segments.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = matchStart + match[0].length;
  }
  if (lastIndex < text.length) {
    const after = text.slice(lastIndex);
    if (after.trim()) segments.push({ type: "text", content: after });
  }
  if (segments.length === 0) {
    return [{ type: "text", content: text }];
  }
  return segments;
}
var mermaidInitialized = false;
function MermaidDiagram({ code }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(false);
  const [showCode, setShowCode] = useState(false);
  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "strict",
            fontFamily: "inherit"
          });
          mermaidInitialized = true;
        }
        const sanitized = sanitizeMermaidCode(code.trim());
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, sanitized);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (error) {
    return /* @__PURE__ */ jsxs("div", { className: "flowstack-diagram-fallback", children: [
      /* @__PURE__ */ jsxs("div", { className: "flowstack-diagram-fallback-header", children: [
        /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
          /* @__PURE__ */ jsx("circle", { cx: "7", cy: "7", r: "6", stroke: "currentColor", strokeWidth: "1.5" }),
          /* @__PURE__ */ jsx("path", { d: "M7 4v3", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }),
          /* @__PURE__ */ jsx("circle", { cx: "7", cy: "9.5", r: "0.75", fill: "currentColor" })
        ] }),
        /* @__PURE__ */ jsx("span", { children: "Diagram could not render" })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "flowstack-diagram-toggle",
          onClick: () => setShowCode(!showCode),
          children: showCode ? "Hide code" : "View as code"
        }
      ),
      showCode && /* @__PURE__ */ jsx("pre", { className: "flowstack-diagram-code", children: code }),
      /* @__PURE__ */ jsx("style", { children: `
          .flowstack-diagram-fallback {
            margin: 0.75rem 0;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
          }
          .flowstack-diagram-fallback-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
          }
          .flowstack-diagram-toggle {
            margin-top: 0.5rem;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            cursor: pointer;
          }
          .flowstack-diagram-toggle:hover {
            background: #f3f4f6;
          }
          .flowstack-diagram-code {
            margin-top: 0.5rem;
            font-size: 0.75rem;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            color: #6b7280;
            background: #f3f4f6;
            padding: 0.5rem;
            border-radius: 0.25rem;
          }
        ` })
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        ref: containerRef,
        className: "flowstack-diagram-container"
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-diagram-container {
          margin: 0.75rem 0;
          overflow-x: auto;
          border-radius: 0.5rem;
          background: #f9fafb;
          padding: 1rem;
        }
        .flowstack-diagram-container > svg {
          max-width: 100%;
          height: auto;
        }
      ` })
  ] });
}
function MessageList({
  messages,
  isStreaming = false,
  className = "",
  renderMessage,
  renderToolCall,
  renderVisualization
}) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const defaultRenderToolCall = (toolCall) => /* @__PURE__ */ jsxs("div", { className: "flowstack-message-tool", children: [
    /* @__PURE__ */ jsxs("div", { className: "flowstack-tool-header", children: [
      /* @__PURE__ */ jsx("span", { className: "flowstack-tool-name", children: toolCall.name }),
      /* @__PURE__ */ jsxs("span", { className: `flowstack-tool-status ${toolCall.status}`, children: [
        toolCall.status === "running" && /* @__PURE__ */ jsx("span", { className: "flowstack-tool-spinner" }),
        toolCall.status
      ] })
    ] }),
    toolCall.result !== void 0 && toolCall.result !== null && /* @__PURE__ */ jsx("pre", { className: "flowstack-tool-result", children: typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result, null, 2) })
  ] }, toolCall.id);
  const defaultRenderVisualization = (viz) => /* @__PURE__ */ jsxs("div", { className: "flowstack-message-viz", children: [
    viz.imageUrl ? /* @__PURE__ */ jsx("img", { src: viz.imageUrl, alt: viz.name }) : viz.imageBase64 ? /* @__PURE__ */ jsx(
      "img",
      {
        src: `data:image/${viz.format || "png"};base64,${viz.imageBase64}`,
        alt: viz.name
      }
    ) : null,
    /* @__PURE__ */ jsx("span", { className: "flowstack-viz-name", children: viz.name })
  ] }, viz.name);
  const defaultRenderMessage = (message) => /* @__PURE__ */ jsxs(
    "div",
    {
      className: `flowstack-message ${message.role} ${message.isStreaming ? "streaming" : ""}`,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flowstack-message-header", children: [
          /* @__PURE__ */ jsx("span", { className: "flowstack-message-role", children: message.role === "user" ? "You" : "Assistant" }),
          /* @__PURE__ */ jsx("span", { className: "flowstack-message-time", children: formatTime(message.timestamp) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flowstack-message-content", children: !message.content && message.isStreaming ? /* @__PURE__ */ jsx("span", { className: "flowstack-message-thinking", children: "Thinking..." }) : message.isStreaming ? message.content : splitContentSegments(message.content ?? "").map(
          (seg, i) => seg.type === "mermaid" ? /* @__PURE__ */ jsx(MermaidDiagram, { code: seg.content }, `m-${i}`) : /* @__PURE__ */ jsx("span", { children: seg.content }, `t-${i}`)
        ) }),
        message.toolCalls && message.toolCalls.length > 0 && /* @__PURE__ */ jsx("div", { className: "flowstack-message-tools", children: message.toolCalls.map(
          (tc) => renderToolCall ? renderToolCall(tc) : defaultRenderToolCall(tc)
        ) }),
        message.visualizations && message.visualizations.length > 0 && /* @__PURE__ */ jsx("div", { className: "flowstack-message-visualizations", children: message.visualizations.map(
          (viz) => renderVisualization ? renderVisualization(viz) : defaultRenderVisualization(viz)
        ) })
      ]
    },
    message.id
  );
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-message-list ${className}`, children: [
    messages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "flowstack-message-empty", children: /* @__PURE__ */ jsx("p", { children: "No messages yet. Start a conversation!" }) }) : messages.map(
      (message) => renderMessage ? renderMessage(message) : defaultRenderMessage(message)
    ),
    isStreaming && messages[messages.length - 1]?.role === "user" && /* @__PURE__ */ jsxs("div", { className: "flowstack-message assistant streaming", children: [
      /* @__PURE__ */ jsx("div", { className: "flowstack-message-header", children: /* @__PURE__ */ jsx("span", { className: "flowstack-message-role", children: "Assistant" }) }),
      /* @__PURE__ */ jsx("div", { className: "flowstack-message-content", children: /* @__PURE__ */ jsxs("span", { className: "flowstack-message-thinking", children: [
        /* @__PURE__ */ jsx("span", { className: "flowstack-thinking-dot" }),
        /* @__PURE__ */ jsx("span", { className: "flowstack-thinking-dot" }),
        /* @__PURE__ */ jsx("span", { className: "flowstack-thinking-dot" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-message-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .flowstack-message-empty {
          text-align: center;
          color: #6b7280;
          padding: 2rem;
        }
        .flowstack-message {
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
        }
        .flowstack-message.user {
          align-self: flex-end;
          background: #3b82f6;
          color: white;
        }
        .flowstack-message.assistant {
          align-self: flex-start;
          background: white;
          border: 1px solid #e5e7eb;
        }
        .flowstack-message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .flowstack-message-role {
          font-weight: 600;
        }
        .flowstack-message-content {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
        }
        .flowstack-message-thinking {
          display: flex;
          gap: 0.25rem;
        }
        .flowstack-thinking-dot {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: flowstack-bounce 1.4s ease-in-out infinite both;
        }
        .flowstack-thinking-dot:nth-child(1) { animation-delay: 0s; }
        .flowstack-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .flowstack-thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes flowstack-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        .flowstack-message-tools {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .flowstack-message-tool {
          background: #f3f4f6;
          border-radius: 0.375rem;
          padding: 0.5rem;
          font-size: 0.8125rem;
        }
        .flowstack-tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .flowstack-tool-name {
          font-family: monospace;
          font-weight: 500;
        }
        .flowstack-tool-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .flowstack-tool-status.complete {
          color: #059669;
        }
        .flowstack-tool-status.error {
          color: #dc2626;
        }
        .flowstack-tool-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: flowstack-spin 0.8s linear infinite;
        }
        @keyframes flowstack-spin {
          to { transform: rotate(360deg); }
        }
        .flowstack-tool-result {
          margin: 0.5rem 0 0;
          padding: 0.5rem;
          background: #1f2937;
          color: #e5e7eb;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          overflow-x: auto;
          max-height: 150px;
        }
        .flowstack-message-visualizations {
          margin-top: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .flowstack-message-viz {
          display: flex;
          flex-direction: column;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        .flowstack-message-viz img {
          max-width: 300px;
          max-height: 200px;
          object-fit: contain;
        }
        .flowstack-viz-name {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
      ` })
  ] });
}
function ChatInterface({
  messages,
  isStreaming = false,
  onSend,
  onClear,
  onCancel,
  dataSources,
  placeholder = "Ask a question...",
  className = "",
  showClearButton = true,
  disabled = false
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);
  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput("");
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-chat ${className}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-messages", children: [
      /* @__PURE__ */ jsx(MessageList, { messages, isStreaming }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    dataSources && dataSources.length > 0 && /* @__PURE__ */ jsx("div", { className: "flowstack-datasource-bar", children: dataSources.map((ds) => /* @__PURE__ */ jsxs("span", { className: "flowstack-datasource-badge", children: [
      /* @__PURE__ */ jsx("span", { className: "flowstack-datasource-dot" }),
      ds.name,
      /* @__PURE__ */ jsx("span", { className: "flowstack-datasource-type", children: ds.type })
    ] }, ds.source_id)) }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-input-container", children: [
      showClearButton && messages.length > 0 && onClear && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "flowstack-chat-clear",
          title: "Clear messages",
          children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx(
            "path",
            {
              d: "M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z",
              stroke: "currentColor",
              strokeWidth: "1.5",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            }
          ) })
        }
      ),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flowstack-chat-form", children: [
        /* @__PURE__ */ jsx(
          "textarea",
          {
            ref: inputRef,
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyDown: handleKeyDown,
            placeholder,
            disabled: isStreaming || disabled,
            rows: 1,
            className: "flowstack-chat-input"
          }
        ),
        isStreaming ? /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onCancel,
            className: "flowstack-chat-cancel",
            title: "Cancel",
            children: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ jsx("rect", { x: "4", y: "4", width: "12", height: "12", rx: "2", fill: "currentColor" }) })
          }
        ) : /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: !input.trim() || disabled,
            className: "flowstack-chat-send",
            title: "Send",
            children: /* @__PURE__ */ jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ jsx(
              "path",
              {
                d: "M3 10L18 3L11 18L9 11L3 10Z",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round",
                strokeLinejoin: "round"
              }
            ) })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #fafafa;
        }
        .flowstack-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        .flowstack-chat-input-container {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .flowstack-chat-clear {
          padding: 0.5rem;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.375rem;
          transition: color 0.15s, background 0.15s;
        }
        .flowstack-chat-clear:hover {
          color: #dc2626;
          background: #fee2e2;
        }
        .flowstack-chat-form {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
        .flowstack-chat-input {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          font-size: 0.9375rem;
          line-height: 1.5;
          max-height: 200px;
          padding: 0.25rem;
        }
        .flowstack-chat-input::placeholder {
          color: #9ca3af;
        }
        .flowstack-chat-send,
        .flowstack-chat-cancel {
          padding: 0.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-chat-send:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-chat-send:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .flowstack-chat-cancel {
          background: #ef4444;
        }
        .flowstack-chat-cancel:hover {
          background: #dc2626;
        }
        .flowstack-datasource-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          padding: 0.5rem 1rem 0;
        }
        .flowstack-datasource-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          font-size: 0.75rem;
          color: #166534;
          line-height: 1;
        }
        .flowstack-datasource-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
        }
        .flowstack-datasource-type {
          text-transform: uppercase;
          font-size: 0.625rem;
          font-weight: 600;
          opacity: 0.7;
        }
      ` })
  ] });
}
function MarkdownRenderer({ content, className }) {
  const processed = unflattenMarkdownTables(content ?? "");
  return /* @__PURE__ */ jsx("div", { className, style: { lineHeight: 1.7 }, children: /* @__PURE__ */ jsx(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      components: {
        table: ({ children }) => /* @__PURE__ */ jsx("div", { style: { overflowX: "auto", margin: "8px 0" }, children: /* @__PURE__ */ jsx("table", { style: { borderCollapse: "collapse", width: "100%", fontSize: "0.875rem" }, children }) }),
        th: ({ children }) => /* @__PURE__ */ jsx("th", { style: { padding: "6px 12px", borderBottom: "2px solid currentColor", textAlign: "left", opacity: 0.7 }, children }),
        td: ({ children }) => /* @__PURE__ */ jsx("td", { style: { padding: "6px 12px", borderBottom: "1px solid rgba(128,128,128,0.2)", verticalAlign: "top" }, children }),
        code: ({ inline, children, ...props }) => inline ? /* @__PURE__ */ jsx("code", { style: { background: "rgba(128,128,128,0.15)", borderRadius: 3, padding: "1px 5px", fontFamily: "monospace", fontSize: "0.85em" }, ...props, children }) : /* @__PURE__ */ jsx("pre", { style: { background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: 12, overflowX: "auto", margin: "8px 0" }, children: /* @__PURE__ */ jsx("code", { style: { fontFamily: "monospace", fontSize: "0.85em" }, ...props, children }) })
      },
      children: processed
    }
  ) });
}
function AuthPage({
  defaultTab = "login",
  onSuccess,
  onError,
  logo,
  title,
  showGoogle = false,
  showFlowstackBroker = true,
  brokerUrl,
  footer,
  className = "",
  containerClassName = "",
  cardClassName = ""
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { config } = useFlowstack();
  const hasGoogle = showGoogle && config.auth?.providers?.includes("google");
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-auth-page ${className}`, children: [
    /* @__PURE__ */ jsx("div", { className: `flowstack-auth-container ${containerClassName}`, children: /* @__PURE__ */ jsxs("div", { className: `flowstack-auth-card ${cardClassName}`, children: [
      logo && /* @__PURE__ */ jsx("div", { className: "flowstack-auth-logo", children: logo }),
      /* @__PURE__ */ jsx("h1", { className: "flowstack-auth-title", children: title || (activeTab === "login" ? "Welcome back" : "Create account") }),
      showFlowstackBroker && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "flowstack-auth-broker", children: /* @__PURE__ */ jsx(
          BrokeredLoginButton,
          {
            brokerUrl,
            onSuccess: () => onSuccess?.()
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "flowstack-auth-divider", children: /* @__PURE__ */ jsx("span", { children: "or sign in with email" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flowstack-auth-tabs", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `flowstack-auth-tab ${activeTab === "login" ? "active" : ""}`,
            onClick: () => setActiveTab("login"),
            children: "Sign In"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `flowstack-auth-tab ${activeTab === "register" ? "active" : ""}`,
            onClick: () => setActiveTab("register"),
            children: "Sign Up"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flowstack-auth-form-container", children: activeTab === "login" ? /* @__PURE__ */ jsx(
        LoginForm,
        {
          onSuccess,
          onError,
          showRegisterLink: false
        }
      ) : /* @__PURE__ */ jsx(
        RegisterForm,
        {
          onSuccess,
          onError,
          showLoginLink: false
        }
      ) }),
      hasGoogle && /* @__PURE__ */ jsx("div", { className: "flowstack-auth-divider", children: /* @__PURE__ */ jsx("span", { children: "or" }) }),
      hasGoogle && /* @__PURE__ */ jsx("div", { className: "flowstack-auth-social", children: /* @__PURE__ */ jsx(GoogleSignIn, { onSuccess, onError }) }),
      footer && /* @__PURE__ */ jsx("div", { className: "flowstack-auth-footer", children: footer })
    ] }) }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          padding: 20px;
        }

        .flowstack-auth-container {
          width: 100%;
          max-width: 420px;
        }

        .flowstack-auth-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          padding: 40px;
        }

        .flowstack-auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .flowstack-auth-title {
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          color: #1a1a1a;
          margin: 0 0 24px 0;
        }

        .flowstack-auth-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: #f5f5f5;
          padding: 4px;
          border-radius: 8px;
        }

        .flowstack-auth-tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flowstack-auth-tab.active {
          background: white;
          color: #1a1a1a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .flowstack-auth-tab:hover:not(.active) {
          color: #1a1a1a;
        }

        .flowstack-auth-form-container {
          margin-bottom: 16px;
        }

        .flowstack-auth-broker {
          margin-bottom: 20px;
        }

        .flowstack-auth-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
          color: #999;
          font-size: 14px;
        }

        .flowstack-auth-divider::before,
        .flowstack-auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e5e5;
        }

        .flowstack-auth-social {
          margin-top: 16px;
        }

        .flowstack-auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }

        @media (max-width: 480px) {
          .flowstack-auth-card {
            padding: 24px;
          }

          .flowstack-auth-title {
            font-size: 20px;
          }
        }
      ` })
  ] });
}
function DashboardLayout({
  children,
  sidebar,
  header,
  footer,
  showWorkspaceSelector = true,
  showUserMenu = true,
  sidebarCollapsed = false,
  sidebarWidth = 260,
  headerHeight = 64,
  className = ""
}) {
  const [isCollapsed, setIsCollapsed] = useState(sidebarCollapsed);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { credentials, selectedWorkspace, workspaces, logout } = useFlowstack();
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-dashboard ${className}`, children: [
    sidebar && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(
        "aside",
        {
          className: `flowstack-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`,
          style: { width: isCollapsed ? 80 : sidebarWidth },
          children: [
            /* @__PURE__ */ jsx("div", { className: "flowstack-sidebar-content", children: sidebar }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "flowstack-sidebar-toggle",
                onClick: toggleSidebar,
                "aria-label": isCollapsed ? "Expand sidebar" : "Collapse sidebar",
                children: isCollapsed ? ">" : "<"
              }
            )
          ]
        }
      ),
      isMobileMenuOpen && /* @__PURE__ */ jsx(
        "div",
        {
          className: "flowstack-sidebar-overlay",
          onClick: toggleMobileMenu
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "flowstack-main-wrapper",
        style: {
          marginLeft: sidebar ? isCollapsed ? 80 : sidebarWidth : 0
        },
        children: [
          /* @__PURE__ */ jsxs(
            "header",
            {
              className: "flowstack-header",
              style: { height: headerHeight },
              children: [
                sidebar && /* @__PURE__ */ jsxs(
                  "button",
                  {
                    className: "flowstack-mobile-menu-toggle",
                    onClick: toggleMobileMenu,
                    "aria-label": "Toggle menu",
                    children: [
                      /* @__PURE__ */ jsx("span", {}),
                      /* @__PURE__ */ jsx("span", {}),
                      /* @__PURE__ */ jsx("span", {})
                    ]
                  }
                ),
                header || /* @__PURE__ */ jsxs("div", { className: "flowstack-header-default", children: [
                  showWorkspaceSelector && selectedWorkspace && /* @__PURE__ */ jsxs("div", { className: "flowstack-workspace-badge", children: [
                    /* @__PURE__ */ jsx("span", { className: "flowstack-workspace-label", children: "Workspace:" }),
                    /* @__PURE__ */ jsx("span", { className: "flowstack-workspace-name", children: selectedWorkspace.name })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "flowstack-header-spacer" }),
                  showUserMenu && credentials && /* @__PURE__ */ jsxs("div", { className: "flowstack-user-menu", children: [
                    /* @__PURE__ */ jsx("span", { className: "flowstack-user-email", children: credentials.email }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "flowstack-logout-btn",
                        onClick: () => logout(),
                        children: "Logout"
                      }
                    )
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsx("main", { className: "flowstack-main-content", children }),
          footer && /* @__PURE__ */ jsx("footer", { className: "flowstack-footer", children: footer })
        ]
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-dashboard {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .flowstack-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #1a1a2e;
          color: white;
          transition: width 0.2s ease, transform 0.2s ease;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .flowstack-sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .flowstack-sidebar-toggle {
          position: absolute;
          right: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1a1a2e;
          border: 2px solid #e5e5e5;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .flowstack-sidebar-toggle:hover {
          background: #2a2a4e;
        }

        .flowstack-sidebar-overlay {
          display: none;
        }

        .flowstack-main-wrapper {
          min-height: 100vh;
          transition: margin-left 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .flowstack-header {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          padding: 0 24px;
          z-index: 100;
        }

        .flowstack-mobile-menu-toggle {
          display: none;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          margin-right: 16px;
        }

        .flowstack-mobile-menu-toggle span {
          display: block;
          width: 20px;
          height: 2px;
          background: #333;
        }

        .flowstack-header-default {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .flowstack-workspace-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0f0f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .flowstack-workspace-label {
          color: #666;
        }

        .flowstack-workspace-name {
          font-weight: 500;
          color: #1a1a1a;
        }

        .flowstack-header-spacer {
          flex: 1;
        }

        .flowstack-user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .flowstack-user-email {
          font-size: 14px;
          color: #666;
        }

        .flowstack-logout-btn {
          background: none;
          border: 1px solid #ddd;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flowstack-logout-btn:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .flowstack-main-content {
          flex: 1;
          padding: 24px;
        }

        .flowstack-footer {
          background: white;
          border-top: 1px solid #e5e5e5;
          padding: 16px 24px;
        }

        @media (max-width: 768px) {
          .flowstack-sidebar {
            transform: translateX(-100%);
            width: 260px !important;
          }

          .flowstack-sidebar.mobile-open {
            transform: translateX(0);
          }

          .flowstack-sidebar-toggle {
            display: none;
          }

          .flowstack-sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
          }

          .flowstack-main-wrapper {
            margin-left: 0 !important;
          }

          .flowstack-mobile-menu-toggle {
            display: flex;
          }

          .flowstack-main-content {
            padding: 16px;
          }
        }
      ` })
  ] });
}
function ChatPage({
  title = "AI Chat",
  placeholder = "Type your message...",
  welcomeMessage,
  header,
  sidebar,
  showClearButton = true,
  showCancelButton = true,
  className = "",
  onMessageSent,
  onError
}) {
  const {
    messages,
    isStreaming,
    isLoading,
    error,
    query,
    clearMessages: clearMessages2,
    cancelQuery
  } = useAgent("data-science", { tools: ["code_interpreter", "data_analysis", "visualization"] });
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  const handleSend = async (message) => {
    if (onMessageSent) {
      onMessageSent(message);
    }
    await query(message);
  };
  const showWelcome = messages.length === 0 && !isLoading;
  return /* @__PURE__ */ jsxs("div", { className: `flowstack-chat-page ${className}`, children: [
    sidebar && /* @__PURE__ */ jsx("aside", { className: "flowstack-chat-sidebar", children: sidebar }),
    /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-main", children: [
      /* @__PURE__ */ jsx("div", { className: "flowstack-chat-header", children: header || /* @__PURE__ */ jsx("h1", { className: "flowstack-chat-title", children: title }) }),
      /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-messages", children: [
        showWelcome && welcomeMessage && /* @__PURE__ */ jsx("div", { className: "flowstack-chat-welcome", children: welcomeMessage }),
        showWelcome && !welcomeMessage && /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-welcome", children: [
          /* @__PURE__ */ jsx("div", { className: "flowstack-chat-welcome-icon", children: "AI" }),
          /* @__PURE__ */ jsx("h2", { children: "How can I help you today?" }),
          /* @__PURE__ */ jsx("p", { children: "Ask me anything about your data or request analysis." })
        ] }),
        /* @__PURE__ */ jsx(MessageList, { messages }),
        /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "flowstack-chat-error", children: [
        /* @__PURE__ */ jsx("span", { className: "flowstack-chat-error-icon", children: "!" }),
        error
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flowstack-chat-input-area", children: /* @__PURE__ */ jsx(
        ChatInterface,
        {
          messages,
          isStreaming,
          onSend: handleSend,
          onClear: showClearButton ? clearMessages2 : void 0,
          onCancel: showCancelButton ? cancelQuery : void 0,
          placeholder,
          disabled: isLoading,
          showClearButton: showClearButton && messages.length > 0
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .flowstack-chat-page {
          display: flex;
          height: 100dvh;
          overflow: hidden;
          background: #f8f9fa;
        }

        .flowstack-chat-sidebar {
          width: 280px;
          background: white;
          border-right: 1px solid #e5e5e5;
          flex-shrink: 0;
        }

        .flowstack-chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .flowstack-chat-header {
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e5e5e5;
        }

        .flowstack-chat-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: #1a1a1a;
        }

        .flowstack-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .flowstack-chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 24px;
          color: #666;
        }

        .flowstack-chat-welcome-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .flowstack-chat-welcome h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .flowstack-chat-welcome p {
          font-size: 16px;
          margin: 0;
          max-width: 400px;
        }

        .flowstack-chat-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 14px;
        }

        .flowstack-chat-error-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .flowstack-chat-input-area {
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e5e5e5;
        }

        @media (max-width: 768px) {
          .flowstack-chat-sidebar {
            display: none;
          }

          .flowstack-chat-messages {
            padding: 16px;
          }

          .flowstack-chat-input-area {
            padding: 12px 16px;
          }
        }
      ` })
  ] });
}

// src/types/index.ts
var LLM_PROVIDERS = ["anthropic", "openai", "gemini", "deepseek", "xai", "ollama"];
var CREDENTIAL_PURPOSES = [
  "default",
  "code_sandbox",
  // Legacy — resolved to `default` by the provider_credentials_service shim
  "llm",
  "swarm",
  "thinking",
  "data_operations",
  "visualization",
  "google_marketing",
  "site_builder",
  "site_planner",
  "site_style",
  "site_data_integrator",
  "daily_brief",
  "js_builder",
  "site_patch",
  "code_interpreter"
];
var DEFAULT_PROVIDER_MODEL_SETTINGS = {
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1
};
function isProviderCredential(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  return typeof obj.credential_id === "string" && typeof obj.provider === "string" && typeof obj.model_id === "string" && typeof obj.purpose === "string" && typeof obj.is_default === "boolean";
}
var COLLECTION_LAYERS = ["shared", "user", "auto"];

// src/api/cache.ts
var CACHE_TTL = {
  WORKSPACES: 300,
  // 5 minutes
  DATASETS: 60,
  // 1 minute
  VISUALIZATIONS: 60,
  // 1 minute
  REPORTS: 60,
  // 1 minute
  SITES: 120,
  // 2 minutes
  MESSAGES: 0,
  // No expiry
  SESSION: 86400
  // 24 hours
};
var NAMESPACE = "flowstack";
function createRedisClient(config) {
  const { url, token } = config;
  return {
    async get(key) {
      try {
        const response = await fetch(`${url}/get/${key}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.result ? JSON.parse(data.result) : null;
      } catch {
        return null;
      }
    },
    async set(key, value, ttl) {
      try {
        const body = ttl ? ["SET", key, JSON.stringify(value), "EX", ttl.toString()] : ["SET", key, JSON.stringify(value)];
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    async del(key) {
      try {
        const response = await fetch(`${url}/del/${key}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    async keys(pattern) {
      try {
        const response = await fetch(`${url}/keys/${pattern}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.result || [];
      } catch {
        return [];
      }
    }
  };
}
function getCacheKey(type, credentials, ...parts) {
  const userId = credentials.userId || "anonymous";
  const tenantId = credentials.tenantId;
  const key = [NAMESPACE, type, tenantId, userId, ...parts].filter(Boolean).join(":");
  return key;
}
async function getCachedWorkspaces(credentials, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("workspaces", credentials);
  return client.get(key);
}
async function setCachedWorkspaces(credentials, workspaces, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("workspaces", credentials);
  return client.set(key, workspaces, CACHE_TTL.WORKSPACES);
}
async function invalidateWorkspacesCache(credentials, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("workspaces", credentials);
  return client.del(key);
}
async function getCachedDatasets(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("datasets", credentials, workspaceId);
  return client.get(key);
}
async function setCachedDatasets(credentials, workspaceId, datasets, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("datasets", credentials, workspaceId);
  return client.set(key, datasets, CACHE_TTL.DATASETS);
}
async function invalidateDatasetsCache(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("datasets", credentials, workspaceId);
  return client.del(key);
}
async function getCachedVisualizations(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("visualizations", credentials, workspaceId);
  return client.get(key);
}
async function setCachedVisualizations(credentials, workspaceId, visualizations, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("visualizations", credentials, workspaceId);
  return client.set(key, visualizations, CACHE_TTL.VISUALIZATIONS);
}
async function invalidateVisualizationsCache(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("visualizations", credentials, workspaceId);
  return client.del(key);
}
async function getCachedReports(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("reports", credentials, workspaceId);
  return client.get(key);
}
async function setCachedReports(credentials, workspaceId, reports, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("reports", credentials, workspaceId);
  return client.set(key, reports, CACHE_TTL.REPORTS);
}
async function invalidateReportsCache(credentials, workspaceId, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("reports", credentials, workspaceId);
  return client.del(key);
}
async function invalidateWorkspaceArtifacts(credentials, workspaceId, config) {
  await Promise.all([
    invalidateDatasetsCache(credentials, workspaceId, config),
    invalidateVisualizationsCache(credentials, workspaceId, config),
    invalidateReportsCache(credentials, workspaceId, config)
  ]);
}
async function invalidateAllUserCache(credentials, config) {
  const client = createRedisClient(config);
  const userId = credentials.userId || "anonymous";
  const tenantId = credentials.tenantId;
  const pattern = `${NAMESPACE}:*:${tenantId}:${userId}:*`;
  const keys = await client.keys(pattern);
  await Promise.all(keys.map((key) => client.del(key)));
}
async function getCached(key, config) {
  const client = createRedisClient(config);
  return client.get(`${NAMESPACE}:${key}`);
}
async function setCached(key, value, ttl, config) {
  const client = createRedisClient(config);
  return client.set(`${NAMESPACE}:${key}`, value, ttl);
}
async function deleteCached(key, config) {
  const client = createRedisClient(config);
  return client.del(`${NAMESPACE}:${key}`);
}
async function getCachedSites(credentials, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("sites", credentials);
  return client.get(key);
}
async function setCachedSites(credentials, sites, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("sites", credentials);
  return client.set(key, sites, CACHE_TTL.SITES);
}
async function invalidateSitesCache(credentials, config) {
  const client = createRedisClient(config);
  const key = getCacheKey("sites", credentials);
  return client.del(key);
}

// src/templates/index.ts
var dataScienceTemplate = {
  template: "data-science",
  streaming: true,
  networkMode: "SANDBOX"
};
var marketingTemplate = {
  template: "marketing",
  streaming: true,
  networkMode: "PUBLIC"
};
var supportTemplate = {
  template: "support",
  streaming: true,
  networkMode: "SANDBOX"
};
function createCustomTemplate(config) {
  return {
    template: "custom",
    streaming: true,
    networkMode: "SANDBOX",
    ...config
  };
}
function getAgentTemplate(name) {
  switch (name) {
    case "data-science":
      return dataScienceTemplate;
    case "marketing":
      return marketingTemplate;
    case "support":
      return supportTemplate;
    case "custom":
    default:
      return createCustomTemplate({});
  }
}
var PREF_PATH = "/user/model-preference";
function useModelPreference() {
  const { credentials: authCredentials, config } = useFlowstack();
  const [preference, setPref] = useState(null);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const fetchAll = useCallback(async () => {
    if (!authCredentials) return;
    setError(null);
    try {
      const [prefRes, optsRes] = await Promise.all([
        flowstackFetch(
          PREF_PATH,
          { credentials: authCredentials },
          clientConfig
        ),
        flowstackFetch(
          `${PREF_PATH}/options`,
          { credentials: authCredentials },
          clientConfig
        )
      ]);
      if (prefRes.ok && prefRes.data) setPref(prefRes.data);
      if (optsRes.ok && optsRes.data) setOptions(Array.isArray(optsRes.data) ? optsRes.data : []);
      if (!prefRes.ok && !optsRes.ok) {
        setError(prefRes.error || optsRes.error || "Failed to load model preference");
      }
    } catch (err) {
      setError(err?.message || "Failed to load model preference");
    }
  }, [authCredentials, clientConfig.baseUrl, clientConfig.tenantId]);
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchAll();
    setIsLoading(false);
  }, [fetchAll]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const setPreference = useCallback(
    async (credentialId) => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch(
          PREF_PATH,
          {
            method: "PUT",
            credentials: authCredentials,
            body: { credential_id: credentialId }
          },
          clientConfig
        );
        if (!res.ok) {
          setError(res.error || `Failed to set preference: ${res.status}`);
          return false;
        }
        if (res.data) setPref(res.data);
        return true;
      } catch (err) {
        setError(err?.message || "Failed to set preference");
        return false;
      }
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId]
  );
  return { preference, options, isLoading, error, setPreference, refresh };
}
var ADMIN_PATH = "/admin/provider-credentials";
function useAdminProviderCredentials() {
  const { credentials: authCredentials, config } = useFlowstack();
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [existing, setExisting] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };
  const fetchAll = useCallback(async () => {
    if (!authCredentials) return;
    setError(null);
    try {
      const adminRes = await flowstackFetch(
        `${ADMIN_PATH}/am-i-admin`,
        { credentials: authCredentials },
        clientConfig
      );
      const admin = !!(adminRes.ok && adminRes.data?.is_admin);
      setIsAdmin(admin);
      if (!admin) {
        setCredentials([]);
        setExisting([]);
        return;
      }
      const [listRes, existRes] = await Promise.all([
        flowstackFetch(
          ADMIN_PATH,
          { credentials: authCredentials },
          clientConfig
        ),
        flowstackFetch(
          `${ADMIN_PATH}/existing`,
          { credentials: authCredentials },
          clientConfig
        )
      ]);
      if (listRes.ok && listRes.data) {
        setCredentials(Array.isArray(listRes.data) ? listRes.data : []);
      }
      if (existRes.ok && existRes.data) {
        setExisting(Array.isArray(existRes.data) ? existRes.data : []);
      }
    } catch (err) {
      setError(err?.message || "Failed to load admin credentials");
    }
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
    async (input) => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch(
          ADMIN_PATH,
          {
            method: "POST",
            credentials: authCredentials,
            body: input
          },
          clientConfig
        );
        if (!res.ok) {
          setError(res.error || `Failed to create credential: ${res.status}`);
          return false;
        }
        await fetchAll();
        return true;
      } catch (err) {
        setError(err?.message || "Failed to create credential");
        return false;
      }
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId, fetchAll]
  );
  const promote = useCallback(
    async (_sourceTenantId, credentialId) => {
      if (!authCredentials) return false;
      setError(null);
      try {
        const res = await flowstackFetch(
          `${ADMIN_PATH}/promote`,
          {
            method: "POST",
            credentials: authCredentials,
            body: { credential_id: credentialId, is_default: true }
          },
          clientConfig
        );
        if (!res.ok) {
          setError(res.error || `Failed to promote credential: ${res.status}`);
          return false;
        }
        await fetchAll();
        return true;
      } catch (err) {
        setError(err?.message || "Failed to promote credential");
        return false;
      }
    },
    [authCredentials, clientConfig.baseUrl, clientConfig.tenantId, fetchAll]
  );
  return { isAdmin, isLoading, error, credentials, existing, create, promote, refresh };
}
var TYPE_PATH = {
  dataset: "datasets",
  visualization: "visualizations",
  code: "code",
  document: "documents",
  report: "reports",
  model: "models"
};
async function _authedFetch(method, url, credentials) {
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "X-Tenant-ID": credentials.tenantId,
      "X-User-ID": credentials.userId
    }
  });
}
function useLibrary(type) {
  const ctx = useFlowstackOptional();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);
  const creds = useMemo(() => ({
    apiKey: ctx?.credentials?.apiKey || "",
    tenantId: ctx?.credentials?.tenantId || ctx?.config?.tenantId || "",
    userId: ctx?.credentials?.userId || ""
  }), [ctx?.credentials, ctx?.config?.tenantId]);
  const baseUrl = ctx?.config?.baseUrl || "https://sage-api.flowstack.fun";
  const pathSeg = TYPE_PATH[type];
  const fetchItems = useCallback(async (opts) => {
    if (!creds.apiKey || !pathSeg) return;
    setIsLoading(true);
    if (opts?.replace !== false) setError(null);
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}`);
      url.searchParams.set("user_id", creds.userId);
      url.searchParams.set("limit", "50");
      if (opts?.cursor) url.searchParams.set("cursor", opts.cursor);
      if (opts?.search) url.searchParams.set("search", opts.search);
      const resp = await _authedFetch("GET", url.toString(), creds);
      if (!resp.ok) {
        setError(`Failed to load ${type} (${resp.status})`);
        return;
      }
      const data = await resp.json();
      const newItems = data.items ?? [];
      if (opts?.cursor) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
      if (data.total != null) setTotal(data.total);
    } catch (e) {
      setError(e.message || `Failed to load ${type}`);
    } finally {
      setIsLoading(false);
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg, type]);
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(false);
    setTotal(null);
    fetchItems({ replace: true });
  }, [fetchItems]);
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && cursor) {
      fetchItems({ cursor, replace: false });
    }
  }, [fetchItems, isLoading, hasMore, cursor]);
  const refresh = useCallback((search) => {
    setItems([]);
    setCursor(null);
    fetchItems({ search, replace: true });
  }, [fetchItems]);
  const deleteItem = useCallback(async (name) => {
    if (!creds.apiKey) return false;
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}/${encodeURIComponent(name)}`);
      url.searchParams.set("user_id", creds.userId);
      const resp = await _authedFetch("DELETE", url.toString(), creds);
      if (resp.ok) refresh();
      return resp.ok;
    } catch {
      return false;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg, refresh]);
  const getDetail = useCallback(async (name) => {
    if (!creds.apiKey || !pathSeg) return null;
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}/${encodeURIComponent(name)}`);
      url.searchParams.set("user_id", creds.userId);
      const resp = await _authedFetch("GET", url.toString(), creds);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg]);
  return { items, isLoading, error, hasMore, total, loadMore, refresh, deleteItem, getDetail };
}
async function _authedFetch2(method, path, credentials, config, body) {
  const base = config.baseUrl || "https://sage-api.flowstack.fun";
  const url = new URL(`${base}${path}`);
  if (method === "GET" && credentials.userId) {
    url.searchParams.set("user_id", credentials.userId);
  }
  return fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "X-Tenant-ID": String(credentials.tenantId ?? ""),
      "X-User-ID": String(credentials.userId ?? ""),
      ...{}
    },
    ...{}
  });
}
function useSubagents() {
  const ctx = useFlowstackOptional();
  const [subagents, setSubagents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const creds = useMemo(() => ({
    apiKey: ctx?.credentials?.apiKey || "",
    tenantId: ctx?.credentials?.tenantId || ctx?.config?.tenantId || "",
    userId: ctx?.credentials?.userId || ""
  }), [ctx?.credentials, ctx?.config?.tenantId]);
  const clientConfig = useMemo(
    () => ({ baseUrl: ctx?.config?.baseUrl, tenantId: ctx?.config?.tenantId }),
    [ctx?.config?.baseUrl, ctx?.config?.tenantId]
  );
  const fetch_ = useCallback(async () => {
    if (!creds.apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await _authedFetch2("GET", "/library/agents", creds, clientConfig);
      if (!resp.ok) {
        setError(`Failed to load agents (${resp.status})`);
        return;
      }
      const data = await resp.json();
      setSubagents(data.agents ?? []);
    } catch (e) {
      setError(e.message || "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl]);
  useEffect(() => {
    fetch_();
  }, [fetch_]);
  const uploadSubagent = useCallback(async (file) => {
    if (!creds.apiKey) return null;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const base = clientConfig.baseUrl || "https://sage-api.flowstack.fun";
      const resp = await fetch(`${base}/library/agents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          "X-Tenant-ID": creds.tenantId,
          "X-User-ID": creds.userId
        },
        body: formData
      });
      if (!resp.ok) return null;
      const result = await resp.json();
      fetch_();
      return result;
    } catch {
      return null;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl, fetch_]);
  const deleteSubagent = useCallback(async (name) => {
    if (!creds.apiKey) return false;
    try {
      const resp = await _authedFetch2("DELETE", `/library/agents/${encodeURIComponent(name)}`, creds, clientConfig);
      if (resp.ok) fetch_();
      return resp.ok;
    } catch {
      return false;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, clientConfig.baseUrl, fetch_]);
  const builtin = useMemo(
    () => subagents.filter((a) => a.source === "builtin"),
    [subagents]
  );
  const userDefined = useMemo(
    () => subagents.filter((a) => a.source !== "builtin"),
    [subagents]
  );
  return { subagents, builtin, userDefined, isLoading, error, refresh: fetch_, uploadSubagent, deleteSubagent };
}
async function getSubagent(credentials, name, config) {
  try {
    const resp = await _authedFetch2("GET", `/library/agents/${encodeURIComponent(name)}`, credentials, config ?? {});
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function _fetchMessages(credentials, sessionId, opts, config) {
  const base = config.baseUrl || "https://sage-api.flowstack.fun";
  const url = new URL(`${base}/conversations/${encodeURIComponent(sessionId)}/messages`);
  url.searchParams.set("limit", String(opts.limit));
  if (opts.appScope) url.searchParams.set("app_scope", opts.appScope);
  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "X-Tenant-ID": String(credentials.tenantId || config.tenantId || ""),
        "X-User-ID": String(credentials.userId || "")
      }
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data: { messages: data.messages || data.items || [] } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
function useConversation(sessionId) {
  const { credentials, config } = useFlowstack();
  const appScope = config.appScope;
  const [messages, setMessages] = useState([]);
  const [resolvedSessionId, setResolvedSessionId] = useState(void 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    if (!credentials || !sessionId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await _fetchMessages(
        credentials,
        sessionId,
        { appScope, limit: 500 },
        { baseUrl: config.baseUrl, tenantId: config.tenantId }
      );
      if (resp.ok && resp.data) {
        setMessages(resp.data.messages || []);
        setResolvedSessionId(sessionId);
      } else {
        setError(resp.error || "Failed to load conversation");
        setMessages([]);
        setResolvedSessionId(sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, sessionId, appScope, config.baseUrl, config.tenantId]);
  useEffect(() => {
    setResolvedSessionId(void 0);
    setMessages([]);
    refresh();
  }, [refresh]);
  return { messages, forSessionId: resolvedSessionId, isLoading, error, refresh };
}

// src/index.ts
function useCurrentSession() {
  return {
    currentSession: null,
    lockStatus: "available",
    claim: async () => {
    },
    release: async () => {
    }
  };
}
function useLibraryConversations() {
  return {
    conversations: [],
    isLoading: false,
    error: null,
    refresh: () => {
    },
    star: async (_id) => {
    },
    unstar: async (_id) => {
    },
    deleteConversation: async (_id) => {
    }
  };
}
function useRecentLibraryConversations(_limit) {
  return {
    items: [],
    conversations: [],
    isLoading: false,
    error: null,
    refresh: () => {
    }
  };
}
function useLibrarySearch(_options) {
  return {
    results: [],
    isLoading: false,
    query: "",
    setQuery: (_q) => {
    },
    error: null,
    clear: () => {
    }
  };
}
function useLibraryTrash() {
  return {
    items: [],
    isLoading: false,
    restore: async (_id) => {
    },
    deletePermanently: async (_id) => {
    },
    refresh: () => {
    }
  };
}
function useSubagentInvoke() {
  return {
    invoke: async (_id, _input) => ({
      runId: "",
      status: "pending",
      output: null
    }),
    isRunning: false,
    error: null
  };
}
async function listLibraryItems(credentials, type, _options, config) {
  const TYPE_PATH2 = {
    dataset: "datasets",
    visualization: "visualizations",
    code: "code",
    document: "documents",
    report: "reports",
    model: "models"
  };
  const seg = TYPE_PATH2[type];
  if (!seg || !credentials?.apiKey) return { ok: false };
  try {
    const base = config?.baseUrl || "https://sage-api.flowstack.fun";
    const url = new URL(`${base}/library/${seg}`);
    url.searchParams.set("user_id", credentials.userId);
    url.searchParams.set("limit", "1");
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "X-Tenant-ID": credentials.tenantId,
        "X-User-ID": credentials.userId
      }
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}` };
    const data = await resp.json();
    return { ok: true, data: { total: data.total ?? null, items: data.items ?? [] } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export { AdminGate, AgentFactory, AgentRegistry, AuthGuard, AuthPage, BrokeredLoginButton, CACHE_TTL, COLLECTION_CHANGED_EVENT, COLLECTION_LAYERS, CREDENTIAL_PURPOSES, ChatInterface, ChatPage, CreateWorkspaceModal, DEFAULT_PATTERNS, DEFAULT_PROVIDER_MODEL_SETTINGS, DashboardLayout, DatasetUploader, ErrorCodes, ErrorMessages, FlowstackError, FlowstackProvider, GoogleSignIn, IntentAnalyzer, LLM_PROVIDERS, LoginForm, MarkdownRenderer, MessageList, RecoveryActions, RegisterForm, WorkspaceSelector, addPiiAllowlistTerm, addSiteFile, analyzeWithRules, checkAdminPermissions, clearAllFlowstackData, clearCredentials, clearMessages, clearSelectedWorkspace, createCustomTemplate, createDataSource, createSite, createWorkspace, dataScienceTemplate, deleteCached, deleteDataSource, deleteDataset, deleteDocuments, deleteSite, deleteSiteVersion, deleteUser, deleteUserCollection, dmPairKey, executeQuery, executeQueryWithConfig, exportUserCollection, extractEntities, flowstackFetch, generateMockId, getAgentTemplate, getCached, getCachedDatasets, getCachedReports, getCachedSites, getCachedVisualizations, getCachedWorkspaces, getConfigSummary, getConversationHistory, getDataset, getDatasetPreview, getItem, getModel, getPiiAllowlist, getPiiSettings, getSite, getSiteVersions, getSubagent, getUser, getUserActivity, getUserCollectionDocuments, getUserCollectionSchema, getUserCollections, getUserDataOverview, getUserStats, getWorkspace, googleLogin, importFromGitHub, insertDocuments, invalidateAllUserCache, invalidateDatasetsCache, invalidateReportsCache, invalidateSitesCache, invalidateVisualizationsCache, invalidateWorkspaceArtifacts, invalidateWorkspacesCache, invokeTool, isDevelopmentConfig, isFlowstackError, isProviderCredential, listAgents, listDataSources, listDatasets, listGitHubRepos, listLibraryItems, listMessages, listModels, listReports, listScripts, listSites, listThreads, listUsers, listVisualizations, listWorkspaces, loadCredentials, loadMessages, loadSelectedWorkspace, login, markMessageRead, marketingTemplate, mockChatHistory, mockCredentials, mockDataSources, mockDatasets, mockDelay, mockManagedUsers, mockUser, mockUserActivity, mockUserStats, mockVisualizations, mockWorkspaces, openThread, parseSSELine, parseSSEStream, previewPiiMasking, processSSEStream, promoteSiteVersion, publishStagedSite, publishToGitHub, reactivateUser, register, removeItem, removePiiAllowlistTerm, removeSiteAlias, sanitizeMermaidCode, saveCredentials, saveMessages, saveSelectedWorkspace, sendMessage, setCached, setCachedDatasets, setCachedReports, setCachedSites, setCachedVisualizations, setCachedWorkspaces, setItem, setSiteAlias, splitContentSegments, supportTemplate, suspendUser, testDataSource, updateDocuments, updatePiiSettings, updateUser, uploadFile, useAdminProviderCredentials, useAgent, useAgents, useAuth, useAuthGuard, useAutomations, useCollection, useCollectionExplorer, useConnections, useConversation, useConversations, useCurrentSession, useDataOverview, useDataSources, useDatasets, useFlowstack, useFlowstackOptional, useFlowstackStatus, useIntegrations, useIntentAgent, useLibrary, useLibraryConversations, useLibrarySearch, useLibraryTrash, useMessages, useModelPreference, useModels, useOllamaDetection, useProviderCredentials, usePublicCollection, useQuery, useRecentLibraryConversations, useReports, useSiteVersions, useSites, useSubagentInvoke, useSubagents, useThreads, useToolInvocation, useUserCollections, useUserManagement, useVisualizations, useWorkspace, validateConfig, validateConfigOrThrow, withErrorHandling };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map