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

export { CACHE_TTL, addPiiAllowlistTerm, addSiteFile, checkAdminPermissions, createDataSource, createSite, createWorkspace, deleteCached, deleteDataSource, deleteDataset, deleteDocuments, deleteSite, deleteSiteVersion, deleteUser, deleteUserCollection, executeQuery, executeQueryWithConfig, exportUserCollection, flowstackFetch, getCached, getCachedDatasets, getCachedReports, getCachedSites, getCachedVisualizations, getCachedWorkspaces, getConversationHistory, getDataset, getDatasetPreview, getModel, getPiiAllowlist, getPiiSettings, getSite, getSiteVersions, getUser, getUserActivity, getUserCollectionDocuments, getUserCollectionSchema, getUserCollections, getUserDataOverview, getUserStats, getWorkspace, googleLogin, importFromGitHub, insertDocuments, invalidateAllUserCache, invalidateDatasetsCache, invalidateReportsCache, invalidateSitesCache, invalidateVisualizationsCache, invalidateWorkspaceArtifacts, invalidateWorkspacesCache, invokeTool, listAgents, listDataSources, listDatasets, listGitHubRepos, listModels, listReports, listScripts, listSites, listUsers, listVisualizations, listWorkspaces, login, previewPiiMasking, promoteSiteVersion, publishStagedSite, publishToGitHub, queryCollection, reactivateUser, register, removePiiAllowlistTerm, removeSiteAlias, setCached, setCachedDatasets, setCachedReports, setCachedSites, setCachedVisualizations, setCachedWorkspaces, setSiteAlias, suspendUser, testDataSource, updateDocuments, updatePiiSettings, updateUser, uploadDocument, uploadFile };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map