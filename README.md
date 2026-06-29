# Flowstack SDK

Complete Backend-as-a-Service SDK for AI-powered applications. Build full-stack AI apps with authentication, workspace management, dataset handling, AI agent integration, published sites, and wallet-based payments — all in one package.

---

## MCP Build Agent — Required Pre-Flight Checklist

> **If you are an AI agent using the Casino MCP tools (`casino_upload_source`, `casino_build_staged`, etc.), read this section before writing any code. These are hard constraints from production failures.**

### File upload rules
- `upload_source` requires ALL files in one call. The sandbox is fresh every build — no files persist from previous runs.
- Required minimum: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src/main.tsx`, `src/App.tsx`, and every file they import.
- `casino_get_app_source` returns `{}` (empty) after most builds — do NOT rely on it to retrieve previous source. Regenerate from scratch.
- `casino_stage_file` (singular) is removed. Use `casino_upload_source` with all files in a single dict.

### Buffer polyfill — FIRST lines of `src/main.tsx`
```ts
import { Buffer } from 'buffer';
if (typeof (globalThis as any).Buffer === 'undefined') { (globalThis as any).Buffer = Buffer; }
// all other imports below
```
Without this: `"Can't find variable: Buffer"` crash at runtime. Add `"buffer": "^6.0.3"` to `package.json` dependencies.

### `vite.config.ts` — always include
```ts
export default defineConfig({ base: '/', plugins: [react()], define: { global: 'globalThis' } });
```

### `package.json` — always include `mermaid` and `buffer`
```json
"mermaid": "^11.4.1", "buffer": "^6.0.3"
```
Missing `mermaid` → Rollup dynamic-import error. Missing `buffer` → Buffer polyfill fails.

### Authentication — `BrokeredLoginButton` only
```tsx
import { useFlowstack, BrokeredLoginButton } from 'flowstack-sdk';
// Never use useAuth().login(), LoginButton from flowstack-sdk/wallet, or privyConfig.appId
```

### Styles — inline or upload, never import without uploading
If `main.tsx` has `import './styles.css'`, upload `src/styles.css` too. Or inline styles as a JS style element in `main.tsx` and remove the import.

### `AuthGuard` — never use `redirectTo`
Use `fallback={<BrokeredLoginButton />}` instead. `redirectTo="/"` kicks users out before they can sign in. For built apps with an `appScope`, `AuthGuard` can also transparently issue a guest session (`allowGuest`, default `true`) when the site has opted into guest chat — see [Add authentication](#2-add-authentication).

### CRITICAL — `upload_source` creates a DRAFT, not a live update

`casino_upload_source` returns `version_status: "draft"`. **The live site does NOT change until you call `casino_promote_version`.** Users are still on the old version. Always complete the two-step workflow:

```
1. casino_upload_source(site_id, files)          → check status="success", note version number
2. casino_promote_version(site_id, version)       → NOW the site goes live
```

If you skip step 2, the build succeeded but nobody sees it. There is no automatic promotion.

**Simpler alternative:** Use `casino_build_staged` which builds AND goes live in one call (no promote needed):
```
1. casino_upload_source(...)   ← build + validate as draft
   OR
   casino_build_staged(...)    ← build + go live immediately (preferred for updates)
```

### If build fails, read `build_log`:
- `"No package.json"` → add it to the files dict
- `"Could not resolve './X'"` → add the missing file
- `"Cannot find variable: Buffer"` → Buffer polyfill missing or not the first lines

---

## Table of Contents

- [Installation](#installation)
- [**Built Apps — Generated Site Pattern**](#built-apps--generated-site-pattern)
- [Quick Start (Casino Platform)](#quick-start-casino-platform)
- [Complete Example App (Casino Platform)](#complete-example-app-casino-platform)
- [Hooks Reference](#hooks-reference)
  - [useAuth](#useauth)
  - [useCollection](#usecollection)
  - [usePublicCollection](#usepubliccollection)
  - [useWorkspace](#useworkspace)
  - [useAgent](#useagent)
  - [useDatasets](#usedatasets)
  - [useVisualizations](#usevisualizations)
  - [useReports](#usereports)
  - [useModels](#usemodels)
  - [useSites](#usesites)
  - [useDataSources](#usedatasources)
  - [useQuery](#usequery)
  - [useUserManagement](#useusermanagement)
  - [useAuthGuard](#useauthguard)
  - [useFlowstackStatus](#useflowstackstatus)
  - [Additional Hooks (0.5+)](#additional-hooks-05)
- [Components](#components)
- [Wallet Module](#wallet-module)
- [Agent Templates & Factory](#agent-templates--factory)
- [API Client](#api-client)
- [Streaming Utilities](#streaming-utilities)
- [Cache Utilities](#cache-utilities)
- [API Route Generators](#api-route-generators)
- [Mock Mode](#mock-mode)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [TypeScript](#typescript)

## Installation

For generated sites (CDN tarball — no registry auth needed):

```json
{
  "dependencies": {
    "flowstack-sdk": "https://sagecdn.flowstack.fun/sdk/flowstack-sdk-latest.tgz"
  }
}
```

For local development:

```bash
npm install flowstack-sdk
# or with local copy:
# "flowstack-sdk": "file:packages/flowstack-sdk"
```

## Built Apps — Generated Site Pattern

**This is the primary pattern for sites generated by the build pipeline.** Built apps use `appScope` for per-app data isolation — they do NOT use workspaces.

### Architecture

```
useCollection  →  /collections/*  →  MongoDB     (the app reads/writes data — tables, forms, cards)
useAgent       →  /stream          →  LLM Agent   (chat AND one-shot tasks that write results to MongoDB)
```

- **`useCollection`** is how the app reads and directly writes data (read, insert, update, delete). Direct MongoDB, no agent.
- **`useAgent`** handles chat *and* acts as a worker: a one-shot `query()` can have the agent **reason over data you pass in and write a structured result document** to a collection via its `data_access` tools, which the app then reads back with `useCollection`. See [Agent-Driven Data Models — Reason → Write → Read](#agent-driven-data-models--reason--write--read). MongoDB is schemaless, so the agent can write any document shape (nested objects/arrays, optional fields) with no migration — the prompt defines the shape.

### Minimal Built App

```tsx
import { FlowstackProvider, useFlowstack, BrokeredLoginButton, useCollection, useAgent } from 'flowstack-sdk';

function App() {
  return (
    <FlowstackProvider config={{
      baseUrl: 'https://sage-api.flowstack.fun',
      mode: 'production',
      appScope: '__SITE_ID__',  // Hex site ID — auto-filled by build pipeline
      // No tenantId needed — it's derived from the brokered-login JWT. Only set it
      // if you use usePublicCollection (anonymous data has no token to derive from).
    }}>
      <AuthGate />
    </FlowstackProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, isInitialized } = useFlowstack();
  if (!isInitialized) return <div>Loading...</div>;
  // BrokeredLoginButton opens Casino's auth popup — Privy runs there, not here
  return isAuthenticated ? <MainApp /> : (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
      <BrokeredLoginButton label="Continue with Flowstack" />
    </div>
  );
}

function MainApp() {
  const { credentials, setCredentials } = useFlowstack();
  // Data — direct MongoDB
  const { documents, insert, remove } = useCollection('contacts', {
    sort: { created_at: -1 },
    limit: 50,
    refreshOnAgentComplete: true,
  });
  // AI chat — LLM agent (target an agent you registered via casino_create_agent)
  const { query, messages, isStreaming } = useAgent(undefined, {
    targetAgents: ['assistant'],   // name you registered with casino_create_agent
  });

  return (
    <div>
      <header>
        {credentials?.email}
        <button onClick={() => setCredentials(null)}>Sign out</button>
      </header>
      <ContactTable contacts={documents} onDelete={(id) => remove({ _id: id })} />
      <ContactForm onSubmit={(data) => insert({ ...data, created_at: new Date().toISOString() })} />
      <ChatSidebar query={query} messages={messages} isStreaming={isStreaming} />
    </div>
  );
}
```

### Key Rules for Built Apps

1. **`appScope` is required** in FlowstackProvider config. It scopes all data to this app. The build pipeline fills `__SITE_ID__` with the hex site_id.
   - **Don't set `tenantId`.** For authenticated calls the backend reads it from the brokered-login JWT and ignores any client-sent value, so it's derived automatically. The *only* exception is [`usePublicCollection`](#usepubliccollection) (anonymous access has no token) — set `tenantId` on the provider there, or the hook errors.
2. **No workspace selection.** Built apps do NOT use `useWorkspace` or `selectWorkspace`. The backend creates workspaces automatically.
3. **`targetAgents` (plural array)** is required on `useAgent`. Without it, app-scoped users get 403. The name must match an agent you registered via `casino_create_agent`. Example: `targetAgents: ['support_bot']`
4. **SHORT collection names only.** Pass `'contacts'`, NOT `'site_abc__contacts'`. The backend auto-prefixes with the site_id.
5. **`useCollection` for ALL data** — tables, forms, cards, CRUD. Never route data through the agent.
6. **`useAgent` for AI only** — chat sidebar, analysis, reasoning. The agent reads the same MongoDB collections but is never the data layer.

### Auth Flow (Built Apps)

Built apps authenticate via `BrokeredLoginButton` — not email/password, not Google sign-in, not the wallet module. The broker opens Casino's auth popup, Casino runs Privy on its registered origin, and Privy creates an embedded wallet for the user. The popup closes and posts a scoped JWT back to the app.

```tsx
import { useFlowstack, BrokeredLoginButton } from 'flowstack-sdk';

function LoginPage() {
  // No email, no password, no Privy appId needed here
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '1rem' }}>
      <h1>Welcome</h1>
      <BrokeredLoginButton label="Continue with Flowstack" />
    </div>
  );
}

// After auth, read identity from useFlowstack() — not useAuth()
function Header() {
  const { credentials, setCredentials } = useFlowstack();
  return (
    <header>
      <span>{credentials?.email}</span>
      <button onClick={() => setCredentials(null)}>Sign out</button>
    </header>
  );
}
```

> **Why not email/password?** End-users of built apps don't have Casino email/password accounts — they authenticate via Privy (embedded wallet + email/Google) through the broker. `useAuth().login(email, password)` will always return an error for built-app end-users.

### Data Operations (useCollection)

```tsx
// READ — reactive query, auto-refreshes after any mutation
const { documents, isLoading, total } = useCollection<Contact>('contacts', {
  filter: { status: 'active' },
  sort: { created_at: -1 },
  limit: 50,
  refreshOnAgentComplete: true,  // auto-refresh when agent writes via chat
});

// INSERT — all useCollection('contacts') instances auto-refresh
const { insert } = useCollection('contacts');
await insert({ name: 'Jane', email: 'jane@co.com', created_at: new Date().toISOString() });

// BATCH INSERT — up to 100 documents
await insert([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);

// UPDATE
const { update } = useCollection('contacts');
await update({ _id: docId }, { $set: { status: 'inactive' } });

// DELETE
const { remove } = useCollection('contacts');
await remove({ _id: docId });
```

### AI Chat (useAgent)

```tsx
import { useAgent } from 'flowstack-sdk';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef } from 'react';

// CRITICAL: targetAgents must be a plural ARRAY
// Use the name you registered via casino_create_agent for this site
const { query, messages, isStreaming } = useAgent(undefined, {
  targetAgents: ['assistant'],
});
const [savedMessages, setSavedMessages] = useState<any[]>([]);
const messagesEndRef = useRef<HTMLDivElement>(null);

// Restore chat history on mount
useEffect(() => {
  try {
    const stored = sessionStorage.getItem('chat_history');
    if (stored) setSavedMessages(JSON.parse(stored));
  } catch {}
}, []);

// Save after each completed response (cap at 50 messages)
useEffect(() => {
  if (isStreaming || messages.length === 0) return;
  const all = [...savedMessages, ...messages].slice(-50);
  sessionStorage.setItem('chat_history', JSON.stringify(all));
}, [messages, isStreaming]);

// Auto-scroll to newest message
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isStreaming]);

// query() is a STREAMING function — it does NOT return the response text.
await query('Analyze my contacts by company size');

// Render with height-constrained container
<div className="chat-container">       {/* max-height: 80vh; flex column */}
  <div className="chat-messages">       {/* flex: 1; overflow-y: auto; min-height: 0 */}
    {[...savedMessages, ...messages].map(m => (
      <div key={m.id} className={`message ${m.role}`}>
        {m.role === 'assistant'
          ? <ReactMarkdown>{m.content}</ReactMarkdown>
          : <p>{m.content}</p>}
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
  <div className="chat-input">          {/* flex-shrink: 0 */}
    <input ... />
    <button>Send</button>
  </div>
</div>
```

> **Chat UX Requirements (built apps):**
> - Container: `max-height: 80vh`, flex column
> - Messages: `overflow-y: auto`, `min-height: 0` (required for flex child scrolling)
> - Input: `flex-shrink: 0`, pinned at bottom
> - Auto-scroll to newest message on `[messages, isStreaming]` change
> - Load/save chat history via `sessionStorage` (last 50 messages)
> - Wrap assistant messages in `<ReactMarkdown>` (package included in template)
> - Markdown links must be clickable (`<a>` tags with `target="_blank"`)

**Markdown CSS for chat messages** — add these styles so rendered markdown is readable and interactive:
```css
/* Links must be clickable and visually distinct */
.message a, .message.assistant a { color: var(--primary, #2563eb); text-decoration: underline; cursor: pointer; }
.message a:hover { opacity: 0.8; }
/* Tables */
.message table { width: 100%; border-collapse: collapse; margin: 0.5em 0; font-size: 0.9em; }
.message th, .message td { padding: 0.4rem 0.6rem; border: 1px solid var(--border, #e2e8f0); text-align: left; }
.message th { background: var(--surface-alt, #f8fafc); font-weight: 600; }
/* Code */
.message pre { background: var(--surface-alt, #1e1e1e); color: #e2e8f0; padding: 0.75rem; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
.message code { font-family: 'Fira Code', 'Fira Mono', monospace; font-size: 0.85em; }
.message p code { background: var(--surface-alt, #f1f5f9); padding: 0.15em 0.3em; border-radius: 3px; }
/* Lists */
.message ul, .message ol { margin: 0.25em 0; padding-left: 1.5em; }
.message li { margin: 0.15em 0; }
/* Headers */
.message h1, .message h2, .message h3 { margin: 0.5em 0 0.25em; }
/* Blockquotes */
.message blockquote { border-left: 3px solid var(--primary, #2563eb); padding-left: 1em; margin: 0.5em 0; opacity: 0.85; }
```

**ReactMarkdown link config** — make links open in new tab:
```tsx
<ReactMarkdown components={{
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}}>{m.content}</ReactMarkdown>
```

### Agent-Driven Data Models — Reason → Write → Read

**This is the core pattern for using an agent as a worker, not just a chatbox.** It is the proven
way to get a data model that works on the first try (validated end-to-end by the Caveat app).

**The mental model:**

1. The **app reads** whatever context the agent needs (via `useCollection`) and hands it to the
   agent **inside the prompt**.
2. The **agent reasons**, then **writes its result as a document** to a MongoDB collection using its
   data tools (`insert_documents` / `update_documents`). The agent is the writer; its job is to
   persist a structured doc, not to "reply."
3. The **app reads the result back** via `useCollection` (reactively). **Never** parse the agent's
   chat text or `messages[]` for data — read the persisted document.

> **MongoDB is schemaless — lean on it.** A collection imposes no fixed columns, so the agent can
> write **any shape**: nested objects, arrays of objects, ragged/optional fields, mixed types,
> per-row metadata. You do **not** need a migration, a fixed schema, or matching columns up front.
> Tell the agent the exact JSON shape you want in the prompt, and it will write exactly that. This
> is why the pattern "one-shots" a working data model: the document *is* the schema, and it can
> evolve per write.

**1. Read context in the app and pass it to the agent (don't make the agent query for it).**
Reading a shared pool in the app via `useCollection({ layer: 'shared' })` is reliable; hand the
data to the agent as JSON in the prompt. Strip PII (email/phone) before handing rows to the agent.

```tsx
// Read the pool in the app — this reads the shared layer reliably.
const pool = useCollection<Member>('members', { layer: 'shared', limit: 200 });
const requester = pool.documents.find(m => m.member_key === myKey) ?? null;
const candidates = pool.documents.filter(m => m.member_key !== myKey);

// PII-safe projection before the agent ever sees a row.
const toCandidate = (m: Member) => ({
  member_key: m.member_key, name: m.name, age: m.age, bio: m.bio, traits: m.traits,
  // NO email, NO phone
});
```

**2. Build a deterministic prompt that names the EXACT document shape to write.** Keep prompt
construction in a small builder function so it's testable and the shape is explicit. Tell the agent
which collection to write and the precise JSON — it will follow it verbatim.

```tsx
function matchmakerPrompt(requester, candidates, nowIso: string) {
  return [
    `TASK — find honest matches for member_key "${requester.member_key}".`,
    'Use the data provided below; do NOT query the database — it is all here.',
    '',
    'REQUESTER:', JSON.stringify(requester, null, 2),
    `CANDIDATES (${candidates.length}):`, JSON.stringify(candidates, null, 2),
    '',
    'Steps:',
    '1. Apply the requester\'s dealbreakers as HARD filters.',
    '2. WRITE exactly one document to the "matches" collection with insert_documents.',
    `   Use this exact run_at (do NOT call a time tool): "${nowIso}". The document MUST be:`,
    '   { "member_key": "...", "run_at": "...", "status": "fresh",',
    '     "proposals": [{ "member_key", "confidence", "reasons": [], "opener" }],',
    '     "passed":    [{ "member_key", "reason" }] }',
    '3. ALWAYS write the doc (even if proposals is empty). Never include email/phone.',
    'Then reply with one short sentence summarizing the result.',
  ].join('\n');
}
```

**3. Run the agent as a one-shot task and read the result back via `useCollection`.** This is NOT a
chat — it's a single `query()` whose side effect is a written document. Use `capabilities:
['data_access']` to grant the data tools, and a `sessionKey` so this task's conversation stays
isolated from any chat surface (see [useAgent](#useagent)). With `refreshOnAgentComplete: true`, the
result collection re-fetches automatically when the agent's write tool completes — no manual
`refresh()` needed.

```tsx
const agent = useAgent('custom', { capabilities: ['data_access'], sessionKey: 'matchmaker' });

// The result collection — reads back what the agent writes.
const matches = useCollection<MatchDoc>('matches', {
  layer: 'user',                 // per-user results; no member_key filter needed (partition is scoped)
  sort: { run_at: -1 }, limit: 5,
  refreshOnAgentComplete: true,  // auto-refresh when the agent's insert_documents completes
});

async function findMatches() {
  await pool.refresh();
  await agent.query(matchmakerPrompt(toCandidate(requester), candidates.map(toCandidate),
    new Date().toISOString()));
  // matches.documents[0] now holds the agent-written result (auto-refreshed). Render it directly.
}

const latest = matches.documents[0];
const proposals = latest?.proposals ?? [];
```

**Why write-to-collection instead of reading `toolCalls[].result`?** As of SDK 0.2.1,
`toolCalls[].result` does carry the tool's structured return (and `toolCalls[].status` is `'error'`
when a call fails), so it's fine for ephemeral/inline results. But the **durable** pattern is to
have the agent persist a document and read it via `useCollection`: the result survives refreshes,
is reactive across components, and is queryable later. Reach for the persisted collection for
anything you want to keep.

### Two-layer data model — `shared` vs per-user

`useCollection` (and the agent's data tools) resolve a collection to one of two namespaces via the
`layer` option:

- **`layer: 'user'`** (per-user) — each end-user gets their own **physically isolated** MongoDB
  database (`u_{sha256(user_id)[:16]}`), not just a filtered view. The backend always keys this DB off
  the *requesting* user, so one user literally cannot read or write another user's partition through
  any path. Reads are already scoped — do **not** add a `user_id`/key filter. Use for anything truly
  private: results, drafts, private history (e.g. `matches`).
- **`layer: 'shared'`** — one builder database (`b_{...}`, one per app) that **every signed-in user of
  the app reads and (when permitted) writes**. Writes are restricted: the app cannot `insert()`
  directly; a collection marked **`agent_writable`** in the data plan lets the app's own agent append
  (e.g. a registrar writing member profiles), while blocking arbitrary end-user writes.
- **`layer: 'auto'`** (default) — resolves from the collection's configured data model.

> **⚠️ Security: `shared` is not access-controlled per user.** Rows written to a shared collection get a
> `_flowstack.user_id` field, but that is a **filterable field, not an enforced read ACL** — any
> signed-in user can read *every* row in the collection. Treat a shared collection as a public bulletin
> board at the storage layer. **Never put data one user must not see from another** (private messages,
> personal info, secrets) in a `shared` collection, even with a `user_id` filter — filtering is a UI
> convenience, not isolation. Only the per-user (`'user'`) layer is private.

> **Platform gap: no cross-user delivery (today).** Because the per-user DB is always keyed to the
> requesting user, **you cannot write into *another* user's private partition.** So patterns that
> require delivering data *to* a specific recipient privately — direct messages, per-user
> notifications, "send X to user B" — are **not achievable** with the current primitives: the only
> private store (`'user'`) is unreachable cross-user, and the only cross-user store (`'shared'`) is
> world-readable. The correct design (deliver each item into the recipient's per-user partition) needs
> a cross-user write primitive the platform does not yet expose.

Reads of a shared collection via `useCollection({ layer: 'shared' })` always hit the shared pool.
Agent-side reads of shared collections are also routed correctly as of P0-132, but the **recommended
pattern remains "read in the app, pass into the prompt"** (step 1 above) — it's the most reliable and
keeps PII out of the agent.

### File Upload → MongoDB

```tsx
const { insert } = useCollection('transactions');

const handleCSVUpload = async (file: File) => {
  const text = await file.text();
  const rows = Papa.parse(text, { header: true }).data;
  await insert(rows.map(row => ({
    ...row,
    amount: Number(row.amount),
    imported_at: new Date().toISOString(),
  })));
  // All useCollection('transactions') instances auto-refresh
};
```

### Service Connections (useConnections)

Every built app should include a Settings page where users connect external services.
Without connecting, the AI agent cannot access Google Analytics, Drive, Ads, YouTube, Reddit, Strava, or Twitter data.

```tsx
import { useConnections } from 'flowstack-sdk';

const { connections, connect, disconnect, isLoading } = useConnections();

// Check status
connections.google.connected     // true | false
connections.google.analytics     // true | false (specific service)
connections.google.email         // "user@gmail.com" if connected
connections.reddit.connected     // true | false
connections.strava.connected     // true | false
connections.twitter.connected    // true | false

// Connect — opens OAuth popup
connect('google', ['analytics', 'drive']);  // specific Google services
connect('google', ['all']);                  // all Google services
connect('reddit');                           // Reddit
connect('strava');                           // Strava
connect('twitter');                          // Twitter/X

// Disconnect
disconnect('google');
disconnect('reddit');
```

**Settings page pattern:**
```tsx
function SettingsPage() {
  const { connections, connect, disconnect } = useConnections();

  const services = [
    { key: 'google', label: 'Google', sublabel: 'Analytics, Ads, Drive, YouTube', services: ['all'] as const },
    { key: 'reddit', label: 'Reddit', sublabel: 'Feed access' },
    { key: 'strava', label: 'Strava', sublabel: 'Activity data' },
    { key: 'twitter', label: 'Twitter / X', sublabel: 'Timeline and bookmarks' },
  ];

  return (
    <div>
      <h2>Connected Services</h2>
      <p>Connect your accounts so the AI assistant can access your data.</p>
      {services.map(({ key, label, sublabel, services: svc }) => {
        const status = connections[key as keyof typeof connections];
        return (
          <div key={key} className="connection-card">
            <div>
              <h3>{label}</h3>
              <p className="muted">{sublabel}</p>
            </div>
            {status.connected
              ? <button onClick={() => disconnect(key as any)}>Disconnect</button>
              : <button onClick={() => connect(key as any, svc as any)}>Connect</button>}
          </div>
        );
      })}
    </div>
  );
}
```

Include this Settings page in every built app's navigation. The AI chat agent can only access
services the user has connected.

---

## Quick Start (Casino Platform)

> **Note:** This section is for the Casino data science platform, not generated apps. If you're building a generated site, see [Built Apps](#built-apps--generated-site-pattern) above.

### 1. Wrap your app with the provider

```tsx
import { FlowstackProvider } from 'flowstack-sdk';

const config = {
  baseUrl: 'https://sage-api.flowstack.fun',
  tenantId: 't_6fe54402be43',
  mode: 'production',
  jwtSecret: 'flowstack-cdn-site',
  passwordSecret: 'flowstack-cdn-site',
};

export default function App({ children }) {
  return (
    <FlowstackProvider config={config}>
      {children}
    </FlowstackProvider>
  );
}
```

**Important:** Generated sites always run in production mode. Auth, agent chat, and data access all connect to real infrastructure at `sage-api.flowstack.fun`. Do not use mock mode for deployed sites.

### 2. Add authentication

**Built apps must use `BrokeredLoginButton` — not `useAuth()`, not `LoginButton` from `flowstack-sdk/wallet`.**

`BrokeredLoginButton` opens a Casino popup that handles Privy login on Casino's origin (the only origin registered with Privy). The popup postMessages a scoped JWT back to your app. No Privy app ID, no wagmi/viem peer deps, no `privyConfig` needed.

```tsx
import { useFlowstack, BrokeredLoginButton } from 'flowstack-sdk';

export default function App() {
  const { isAuthenticated, isInitialized, credentials, setCredentials } = useFlowstack();

  if (!isInitialized) return <div>Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <BrokeredLoginButton label="Continue with Flowstack" />
      </div>
    );
  }

  return (
    <div>
      <p>Welcome, {credentials?.email}</p>
      <button onClick={() => setCredentials(null)}>Sign out</button>
      {/* your app */}
    </div>
  );
}
```

Or use `AuthGuard` which shows `BrokeredLoginButton` automatically when not authenticated:

```tsx
import { AuthGuard } from 'flowstack-sdk';

export default function App() {
  return (
    <AuthGuard fallback={<LoginScreen />}>
      <Console />
    </AuthGuard>
  );
}

// LoginScreen shows BrokeredLoginButton
function LoginScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <BrokeredLoginButton />
    </div>
  );
}
```

**Guest chat (built apps).** When the app is built with an `appScope` and the site has enabled guest chat
server-side (`app_config.allowGuestChat`), `AuthGuard` transparently mints a short-lived guest session
(`POST /auth/guest`) for unauthenticated visitors instead of showing the login gate — removing the
"sign up first" friction. The opt-in is the per-site backend flag: if the site hasn't enabled it,
`/auth/guest` returns 403 and `AuthGuard` falls back to the normal login UI. This is a no-op without an
`appScope` (the Casino dashboard has none, so it always requires real login). It's on by default; pass
`allowGuest={false}` on a specific guard to always require login.

```tsx
<AuthGuard fallback={<LoginScreen />} allowGuest>     {/* default — guest if the site opted in */}
  <Console />
</AuthGuard>

<AuthGuard fallback={<LoginScreen />} allowGuest={false}>  {/* always require real login */}
  <Billing />
</AuthGuard>
```

**Account switching.** After `logout()`, the next `BrokeredLoginButton` click passes `force_login=1`, so
the broker purges its sticky Privy/Casino session and the user can sign in with a *different* account.
Without this, brokered re-login silently returns the same identity.

**Do not use:**
- `useAuth()` with `login(email, password)` — Casino end-users don't have email/password accounts
- `LoginButton` from `flowstack-sdk/wallet` — requires WalletProvider/Privy which can't run on built-app subdomains
- `privyConfig.appId` in FlowstackProvider — not needed for the broker auth flow
- Extra peer deps (`@privy-io/react-auth`, `wagmi`, `viem`) — only needed for Casino platform features, not built apps

### 3. Chat with AI agent

```tsx
import { useAgent } from 'flowstack-sdk';

function Chat() {
  const { messages, isStreaming, query } = useAgent();

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
          {msg.statusLine && <span className="status">{msg.statusLine}</span>}
        </div>
      ))}
      <button onClick={() => query('Analyze my sales data')} disabled={isStreaming}>
        {isStreaming ? 'Thinking...' : 'Ask'}
      </button>
    </div>
  );
}
```

---

## Complete Example App (Casino Platform)

> **Note:** This example uses workspace selection which is for the Casino platform only. Generated/built apps should follow the [Built Apps](#built-apps--generated-site-pattern) pattern instead — no workspaces, use `appScope`.

A complete, working AI chat application in a single file:

```tsx
'use client';

import { useState } from 'react';
import {
  FlowstackProvider,
  LoginForm,
  useAuth,
  useWorkspace,
  useAgent,
} from 'flowstack-sdk';

const config = {
  baseUrl: 'https://sage-api.flowstack.fun',
  tenantId: 't_6fe54402be43',
  mode: 'production' as const,
  jwtSecret: 'flowstack-cdn-site',
  passwordSecret: 'flowstack-cdn-site',
};

function ChatApp() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const { workspaces, selectedWorkspace, selectWorkspace } = useWorkspace();
  const { messages, isStreaming, query, clearMessages } = useAgent();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input;
    setInput('');
    await query(message);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
        <h1>AI Chat</h1>
        <LoginForm onSuccess={() => {}} showRegisterLink />
      </div>
    );
  }

  if (!selectedWorkspace && workspaces.length > 0) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Select Workspace</h1>
        {workspaces.map(ws => (
          <button key={ws.workspaceId} onClick={() => selectWorkspace(ws)} style={{ display: 'block', margin: '8px 0' }}>
            {ws.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <strong>{selectedWorkspace?.name || 'AI Chat'}</strong>
        <div>
          <button onClick={clearMessages} style={{ marginRight: 8 }}>Clear</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            marginBottom: 16, padding: 12, borderRadius: 8,
            backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
            maxWidth: '80%', marginLeft: msg.role === 'user' ? 'auto' : 0,
          }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            {msg.role === 'assistant'
              ? <ReactMarkdown>{msg.content}</ReactMarkdown>
              : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>}
            {msg.statusLine && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{msg.statusLine}</div>}
            {msg.isStreaming && <span style={{ color: '#999' }}>▋</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask a question..."
          disabled={isStreaming}
          style={{ flex: 1, padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FlowstackProvider config={config}>
      <ChatApp />
    </FlowstackProvider>
  );
}
```

---

## Hooks Reference

### useAuth

> **Built apps: do not use this hook.** `useAuth()` is for Casino platform internals. Built apps authenticate via `BrokeredLoginButton` — see [Add authentication](#2-add-authentication) above. Calling `login(email, password)` from a built app will always fail because end-users don't have Casino credentials.

For built apps, read auth state from `useFlowstack()` instead:

```tsx
const { isAuthenticated, isInitialized, credentials } = useFlowstack();
```

`useAuth` (Casino platform only):

```tsx
const {
  user,           // User | null
  credentials,    // FlowstackCredentials | null
  isAuthenticated,// boolean
  isLoading,      // boolean
  error,          // string | null
  login,          // (email, password) => Promise<boolean>  — Casino platform only
  register,       // (email, password, name?) => Promise<boolean>  — Casino platform only
  googleSignIn,   // () => Promise<void>  — Casino platform only
  logout,         // () => void
  refreshToken,   // () => Promise<boolean>
} = useAuth();
```

### useCollection

Direct MongoDB CRUD for built-app data. This is the primary data hook — use it for all tables, forms, cards, and data persistence. The agent is NOT involved in data operations.

Collection names are auto-prefixed with the site_id by the backend — pass SHORT names only (e.g., `'transactions'`, NOT `'site_abc__transactions'`).

```tsx
const {
  // Read (reactive — auto-fetches on mount, re-fetches after mutations)
  documents,       // T[]
  count,           // number — documents returned (≤ limit)
  total,           // number — total matching (for pagination)
  isLoading,       // boolean
  error,           // string | null
  refresh,         // () => Promise<void> — manual re-fetch

  // Write (auto-refetches all useCollection instances for this collection after success)
  insert,          // (doc | doc[]) => Promise<{ inserted_ids: string[] }>
  update,          // (filter, update, opts?) => Promise<{ modified_count: number }>
  remove,          // (filter) => Promise<{ deleted_count: number }>
} = useCollection<Transaction>('transactions', {
  filter: { status: 'active' },   // MongoDB query filter
  sort: { date: -1 },             // Sort spec
  limit: 50,                      // Max documents (default 50, max 500)
  skip: 0,                        // Pagination offset
  layer: 'auto',                  // 'user' (per-user) | 'shared' (one pool) | 'auto' (default)
  refreshOnAgentComplete: true,   // Auto-refresh after an agent write tool completes (0.2.1+: fires
                                  // for insert_documents/update_documents/insert_app_data/etc.)
});
```

> **`layer`** picks the namespace: `'user'` is a private per-user partition (don't filter by a user
> key — it's already scoped); `'shared'` is one pool all users read (app can't `insert()` directly
> unless the collection is `agent_writable`); `'auto'` resolves from the collection's data model. See
> [Two-layer data model](#two-layer-data-model--shared-vs-per-user).
>
> **`refreshOnAgentComplete: true`** is the reactive bridge for the Reason→Write→Read pattern — when
> the agent finishes writing via its data tools, this collection re-fetches automatically. (Before
> 0.2.1 it only matched legacy tool names and silently no-op'd, so apps called `refresh()` manually;
> that workaround is no longer needed.)

**Data display — reactive query:**
```tsx
function TransactionTable() {
  const { documents, isLoading } = useCollection<Transaction>('transactions', {
    sort: { date: -1 }, limit: 50, refreshOnAgentComplete: true,
  });
  if (isLoading) return <div>Loading...</div>;
  return (
    <table>
      <tbody>
        {documents.map(row => (
          <tr key={row._id}><td>{row.date}</td><td>${row.amount}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Form submission — insert document:**
```tsx
function AddTransaction() {
  const { insert } = useCollection('transactions');
  const [form, setForm] = useState({ date: '', amount: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await insert({ ...form, amount: Number(form.amount), created_at: new Date().toISOString() });
    setForm({ date: '', amount: '' });
    // All useCollection('transactions') instances auto-refresh
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Update and delete:**
```tsx
const { update, remove } = useCollection('transactions');

// Update
await update({ _id: docId }, { $set: { category: 'Food' } });

// Delete
await remove({ _id: docId });
```

**CRITICAL:** The app **reads** all data with `useCollection` (tables, forms, cards, CRUD) — never
parse the agent's chat text or `messages[]` for data, and never use `useToolInvocation`. **Writes**
happen one of two ways: (a) deterministic user actions → `useCollection().insert/update/remove`
directly; (b) agent-reasoned results → the agent writes a document via its `data_access` tools and
the app reads it back with `useCollection` (the [Reason → Write → Read](#agent-driven-data-models--reason--write--read)
pattern). Either way, `useCollection` is always how the app *reads*.

### usePublicCollection

Anonymous public submissions — leaderboards, guestbooks, comment threads, voting. **No auth required.** Any visitor can read and insert. The collection must be declared in `app_config.publicCollections`.

```tsx
import { usePublicCollection } from 'flowstack-sdk';

const {
  documents,   // T[]
  count,       // number
  total,       // number
  isLoading,   // boolean
  error,       // string | null
  insert,      // (doc: Partial<T>) => Promise<{ inserted_id: string }>
  refresh,     // () => Promise<void>
} = usePublicCollection<HighScore>('high_scores', {
  filter: { album: 'yeezus' },
  sort: { score: -1 },
  limit: 25,
});

await insert({ album: 'yeezus', name: 'KEON', score: 12500 });
```

**Key differences from `useCollection`:**
- No credentials needed — works for anonymous visitors
- Insert only (no update/remove — data is owned by the app, not the user)
- Rate-limited server-side (default 10 writes/min, 100/day per IP)
- The collection must be in `app_config.publicCollections` (ask the builder to configure it; the build pipeline sets this up based on `usePublicCollection` usage in the source)
- **Requires `tenantId` on `FlowstackProvider`.** Because there's no token for anonymous visitors, the backend can't derive the tenant — so this is the one hook that needs `tenantId` set explicitly. If it's missing, `usePublicCollection` raises a clear error instead of silently using a default. (Authenticated hooks don't need it — they get the tenant from the JWT.)

**Builder config required in app_config.json:**
```json
{
  "publicCollections": {
    "high_scores": {
      "schema": {
        "album": { "type": "string", "required": true, "maxLength": 32 },
        "name":  { "type": "string", "required": true, "maxLength": 24 },
        "score": { "type": "number", "required": true, "min": 0 }
      },
      "rateLimit": { "writesPerMinute": 5, "writesPerDay": 50 }
    }
  }
}
```

### useWorkspace

Workspace management.

```tsx
const {
  workspaces,        // WorkspaceInfo[]
  selectedWorkspace, // WorkspaceInfo | null
  isLoading,         // boolean
  error,             // string | null
  createWorkspace,   // (name, description?) => Promise<WorkspaceInfo | null>
  selectWorkspace,   // (workspace) => void
  refreshWorkspaces, // () => Promise<void>
} = useWorkspace();
```

### useAgent

AI agent queries with streaming, tool calls, interrupts, status updates, and **automatic conversation persistence**.

```tsx
const {
  messages,               // ChatMessage[]
  isStreaming,             // boolean
  isLoading,              // boolean
  toolCalls,              // ToolCall[] — active/completed tool executions
  connectedDataSources,   // DataSourceBadgeInfo[] — connected data sources
  error,                  // string | null
  query,                  // (prompt: string) => Promise<void>
  clearMessages,          // () => void — wipe in-memory messages (same session)
  cancelQuery,            // () => void
  interruptAgent,         // () => Promise<void> — pause agent mid-execution
  respondToInterrupt,     // (response: string) => Promise<void> — resume with user input
} = useAgent(template?, options?);
```

**Template (first arg):** `'data-science'` | `'marketing'` | `'support'` | `'custom'`. For a
**persona-backed app** (your app's brain is an agent registered via `casino_create_agent`), the
template is just a fallback label — the registered persona overrides it. Use `'custom'` (or omit) and
select the brain with the `persona` option below. The template does **not** pick the agent.

**Options:**

| Option | Type | What it does |
|---|---|---|
| `capabilities` | `string[]` | Pre-load tool categories the agent may use: `'data_access'` (MongoDB read/write tools — required for the Reason→Write→Read pattern), `'external_integration'` (Google/SMS/web/etc.), `'site_operations'`, `'code_execution'`, `'domain_task'`, `'workspace_management'`. Grant only what the task needs. |
| `persona` *(0.2.1+)* | `string` | Target a specific registered persona/subagent by name (maps to `target_agents`). Without it the backend auto-selects the **first** registered persona — so multi-persona apps **must** set this to reach the others. (`agentName` is an alias.) |
| `systemPrompt` *(0.2.1+)* | `string` | Inline system-prompt override for this hook (maps to `system_prompt_override`). Use to tune behavior per-surface without registering a separate persona. |
| `sessionKey` *(0.2.1+)* | `string` | Namespaces this hook's conversation. **Pass a stable, distinct value per surface** (e.g. `'interview'`, `'matchmaker'`) so independent `useAgent` instances don't share one conversation. It also persists that surface's history across reloads (same tab). Omit it only for a single-surface app. |
| `tools` | `string[]` | Whitelist specific tool names (finer than `capabilities`). |
| `targetAgent(s)` | `string` / `string[]` | **Deprecated** (Strands swarm, removed in P0-73). Use `persona` instead. |

```tsx
// Persona-backed, multi-surface app: each surface gets its own brain + isolated conversation.
const interview  = useAgent('custom', { capabilities: ['data_access'], persona: 'interviewer', sessionKey: 'interview' });
const matchmaker = useAgent('custom', { capabilities: ['data_access'], persona: 'matchmaker',  sessionKey: 'matchmaker' });
```

#### Conversation Memory (Automatic)

`useAgent` automatically persists a stable **session ID** for each component mount. The session ID is:

- **Generated on first use** via `crypto.randomUUID()` (with a timestamp fallback for legacy browsers)
- **Stable across turns** — every call to `query()` passes the same session ID to the backend
- **Reused by Strands' `S3SessionManager`** — the agent remembers prior messages, tool calls, and context across turns
- **Reset on `clearMessages()`** — starting a truly new conversation generates a fresh session ID

This means a chat in a built app correctly handles multi-turn queries:

```tsx
function FinanceChat() {
  const { query, messages, isStreaming } = useAgent(undefined, {
    targetAgents: ['finance_bot']  // agent registered via casino_create_agent
  });

  // Turn 1: "show me last month's expenses"
  // Turn 2: "now break it down by category"  ← agent remembers "last month's expenses"
  // Turn 3: "which one is the biggest?"       ← agent knows the categories from turn 2

  return (
    <ChatUI messages={messages} onSend={query} isStreaming={isStreaming} />
  );
}
```

**Notes:**
- **Session ID is tied to the component mount.** Unmounting and remounting `useAgent` (e.g., closing and reopening a modal) starts a new conversation. Persisting sessions across unmounts/page refreshes requires application-level storage of the session ID (see Advanced).
- **`clearMessages()` resets the session.** Call it to start a fresh conversation. The next `query()` creates a new backend session.
- **Wallet-authenticated users** have their conversations scoped to their wallet address server-side. Same wallet across tabs/browsers can reach the same conversation if the session ID is passed explicitly.

#### Advanced: Explicit Session Management

**Simplest path (0.2.1+): pass `sessionKey`.** A stable `sessionKey` per surface gives each
`useAgent` its own conversation *and* persists that conversation across reloads (same tab) — no
localStorage plumbing or remount needed:

```tsx
const chat = useAgent('custom', { capabilities: ['data_access'], sessionKey: 'support-chat' });
// Reopening/reloading this surface resumes the same conversation; a different sessionKey is a
// different conversation. Call chat.clearMessages() / startNewSession() to start fresh.
```

For cross-tab or multi-conversation-per-surface persistence, manage the session ID at the
application level:

```tsx
import { useEffect, useState } from 'react';
import { useAgent } from 'flowstack-sdk';

function PersistentChat() {
  // Option 1: Resume the most recent session from localStorage
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem('my-app:chat:session');
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem('my-app:chat:session', fresh);
    return fresh;
  });

  // The useAgent hook will create its own sessionIdRef automatically,
  // but you can also invoke the lower-level `executeQueryWithConfig` with
  // an explicit sessionId for full control (see API reference).
  const { query, messages, clearMessages } = useAgent(undefined, {
    targetAgents: ['finance_bot']  // agent registered via casino_create_agent
  });

  const handleNewChat = () => {
    const fresh = crypto.randomUUID();
    localStorage.setItem('my-app:chat:session', fresh);
    clearMessages(); // resets the in-hook sessionIdRef as well
    window.location.reload(); // optional: force remount to pick up new session
  };

  return (
    <>
      <button onClick={handleNewChat}>+ New Chat</button>
      <ChatUI messages={messages} onSend={query} />
    </>
  );
}
```

**Future SDK versions** will expose `useConversations()` and `useConversation(id)` hooks for first-class conversation listing and restoration. Until then, the pattern above is the recommended approach for multi-conversation apps.

#### When Conversation Memory Breaks

If your built app appears to "forget" every turn:

1. **Check your SDK version.** Apps built with SDK versions before the `sessionIdRef` fix do not pass a session ID at all — every turn lands in a new backend session. Rebuild the app via `edit_site` or `build_site` to bundle the latest SDK.
2. **Check that you're not remounting the component** between every query (e.g., conditional rendering based on `isStreaming` can cause remounts).
3. **Check for multiple `useAgent` instances** in the same page. Before 0.2.1 they all *shared* one
   tenant-wide session, so surfaces bled into each other (a matchmaker reply showing up in an
   interview). Fix: give each instance a distinct `sessionKey` (0.2.1+) so conversations stay
   isolated.
4. **Check the browser console** for SDK warnings about `crypto.randomUUID` not being available (very old browsers).

**ChatMessage fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique message ID |
| `role` | `'user' \| 'assistant'` | Message sender |
| `content` | `string` | Message text |
| `isStreaming` | `boolean` | Whether still receiving content |
| `statusLine` | `string \| undefined` | Live status text during streaming (tool progress, agent status) |
| `toolCalls` | `ToolCall[]` | Tool executions in this message |
| `visualizations` | `VisualizationData[]` | Charts/images produced |
| `searchResults` | `SearchResultsData[]` | Search results |

### useDatasets

Dataset operations.

```tsx
const {
  datasets,        // DatasetInfo[] — { id, name, rows, columns, schema?, columnNames?, createdAt?, updatedAt? }
  isLoading,       // boolean
  error,           // string | null
  uploadDataset,   // (file, name?) => Promise<DatasetInfo | null>
  downloadDataset, // (name) => Promise<Blob | null>
  deleteDataset,   // (name) => Promise<boolean>
  refreshDatasets, // () => Promise<void>
} = useDatasets();
```

> **DatasetInfo fields (source of truth: `src/types/index.ts`):**
> - `id: string` — stable identifier
> - `name: string` — user-visible name
> - `rows: number` — row count (NOT `rowCount`)
> - `columns: number` — column count (NOT `columnCount`)
> - `schema?: Record<string, ColumnSchema>` — optional per-column schema
> - `columnNames?: string[]` — optional ordered column names
> - `createdAt?: string`, `updatedAt?: string` — ISO8601 timestamps

### useVisualizations

Visualization management.

```tsx
const {
  visualizations,       // VisualizationData[] — { name, type, imageUrl, imageBase64, format, createdAt }
  isLoading,            // boolean
  error,                // string | null
  refreshVisualizations,// () => Promise<void>
} = useVisualizations();
```

### useReports

Report management.

```tsx
const {
  reports,        // ReportInfo[] — { name, content, format, createdAt }
  isLoading,      // boolean
  error,          // string | null
  refreshReports, // () => Promise<void>
} = useReports();
```

### useModels

ML model management.

```tsx
const {
  models,        // ModelInfo[] — { name, framework, metrics, createdAt }
  isLoading,     // boolean
  error,         // string | null
  refreshModels, // () => Promise<void>
} = useModels();
```

### useSites

Published site management — list, create, stage files, publish to CDN, delete.

```tsx
const {
  sites,        // PublishedSiteInfo[]
  isLoading,    // boolean
  error,        // string | null
  createSite,   // (params: CreateSiteParams) => Promise<PublishedSiteInfo | null>
  addFile,      // (siteId, path, content) => Promise<boolean>
  publishSite,  // (siteId) => Promise<PublishedSiteInfo | null>
  deleteSite,   // (siteId) => Promise<boolean>
  refreshSites, // () => Promise<void>
} = useSites();
```

**PublishedSiteInfo fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Site ID |
| `name` | `string` | Display name |
| `url` | `string` | Published CDN URL |
| `shortUrl` | `string?` | Short URL for sharing |
| `siteType` | `'on_demand' \| 'daily' \| 'js_build'` | How the site was created |
| `fileCount` | `number` | Number of files |
| `totalBytes` | `number?` | Total size |
| `createdAt` | `string` | ISO timestamp |
| `expiresAt` | `string?` | Expiration (if applicable) |

**Two publishing workflows:**

```tsx
// Quick publish — pass files inline
await createSite({
  name: 'My Dashboard',
  siteType: 'on_demand',
  files: { 'index.html': '<html>...</html>', 'styles.css': 'body { ... }' },
});

// Staged publish — add files incrementally, then publish
const site = await createSite({ name: 'My App' });
await addFile(site.id, 'index.html', '<html>...</html>');
await addFile(site.id, 'src/App.tsx', 'export default function App() { ... }');
await publishSite(site.id);
```

### useDataSources

External data source connections.

```tsx
const {
  dataSources,       // DataSource[]
  isLoading,         // boolean
  error,             // string | null
  createDataSource,  // (config) => Promise<DataSource | null>
  testConnection,    // (sourceId) => Promise<boolean>
  deleteDataSource,  // (sourceId) => Promise<boolean>
  refreshDataSources,// () => Promise<void>
} = useDataSources();
```

Supports: PostgreSQL, MongoDB, MySQL, Snowflake, BigQuery, S3.

### useQuery

Simple one-shot query execution (no streaming).

```tsx
const {
  executeQuery,  // (prompt: string) => Promise<QueryResult>
  result,        // QueryResult | null
  isLoading,     // boolean
  error,         // string | null
} = useQuery();
```

### useUserManagement

Admin user management.

```tsx
const {
  users,           // ManagedUser[]
  stats,           // UserStats | null — { totalUsers, activeUsers, newUsersThisMonth }
  isLoading,       // boolean
  error,           // string | null
  canManageUsers,  // boolean
  pagination,      // { page, limit, totalCount, hasMore }
  refreshUsers,    // (params?) => Promise<void>
  getUser,         // (userId) => Promise<ManagedUser | null>
  updateUser,      // (userId, updates) => Promise<boolean>
  suspendUser,     // (userId, reason?) => Promise<boolean>
  reactivateUser,  // (userId) => Promise<boolean>
  deleteUser,      // (userId) => Promise<boolean>
  getUserActivity, // (userId, limit?) => Promise<UserActivityLog[]>
  refreshStats,    // () => Promise<void>
  setPage,         // (page) => void
  setSearch,       // (search) => void
  setRoleFilter,   // (role) => void
  setStatusFilter, // (status) => void
} = useUserManagement();
```

**Role hierarchy:** `owner` > `admin` > `member` > `viewer`

### useAuthGuard

Programmatic route protection.

```tsx
const {
  isAllowed,      // boolean
  isLoading,      // boolean
  shouldRedirect, // boolean
  redirectTo,     // string | undefined
} = useAuthGuard({
  requireAuth: true,
  requireWorkspace: true,
  redirectTo: '/login',
});
```

### useFlowstackStatus

Backend connection monitoring.

```tsx
const {
  status,          // 'connected' | 'disconnected' | 'checking'
  isConnected,     // boolean
  latency,         // number | null (ms)
  error,           // string | null
  checkConnection, // () => Promise<void>
} = useFlowstackStatus({
  pollInterval: 30000,
  autoPoll: true,
});
```

### Additional Hooks (0.5+)

The SDK ships many hooks beyond the classic fifteen above. These are fully exported from `flowstack-sdk` and share the same `FlowstackProvider` context. Treat the type signatures in `packages/flowstack-sdk/src/hooks/<name>.ts` as the source of truth — the list below is a one-liner reference and will be auto-generated from source in a future release.

<!-- AUTO-GENERATED:START:hooks-extended -->
- **`useAgent()`** — useAgent Hook The main hook for interacting with AI agents.
- **`useAgents()`** — useAgents Hook Fetches the catalog of available agents from the backend.
- **`useAuth()`** — useAuth Hook Provides authentication functionality including login, register, and Google OAuth.
- **`useAuthGuard()`** — useAuthGuard Hook Provides auth guard logic without rendering components.
- **`useAutomations()`** — CRUD for agent cron automations (P0-85).
- **`useCollection()`** — Direct MongoDB access for built-app components.
- **`useCollectionExplorer()`** — Browse, query, export, and delete a specific MongoDB collection.
- **`useConnections()`** — Manage external service connections (Google, Reddit, Strava, Twitter, GitHub).
- **`useConversations()`** — fetches the user's past Casino builder conversations from GET /library/conversations.
- **`useDataOverview()`** — Unified summary of all user-owned data.
- **`useDataSources()`** — useDataSources Hook Provides data source management for connecting to external databases.
- **`useDatasets()`** — useDatasets Hook Provides dataset management functionality including upload, download, and deletion.
- **`useFlowstackStatus()`** — useFlowstackStatus Hook Monitors connection status and health of the Flowstack backend.
- **`useIntegrations()`** — CRUD for HTTP API integrations (P0-79).
- **`useIntentAgent()`** — useIntentAgent Hook Creates and manages agents dynamically based on user intent.
- **`useModels()`** — useModels Hook Provides ML model management functionality.
- **`useOllamaDetection()`** — Detect a local Ollama instance and list available models.
- **`useProviderCredentials()`** — Manage LLM provider credentials (BYOK + Ollama).
- **`usePublicCollection()`** — anonymous public submissions for built apps.
- **`useQuery()`** — useQuery Hook A lower-level hook for executing queries without managing chat history.
- **`useReports()`** — useReports Hook Provides report management functionality.
- **`useSiteVersions()`** — See source for usage.
- **`useSites()`** — useSites Hook Provides published site management — list, create, stage files, publish to CDN, delete.
- **`useToolInvocation()`** — Direct tool invocation hook.
- **`useUserCollections()`** — List all MongoDB collections the user owns.
- **`useUserManagement()`** — useUserManagement Hook Provides user management functionality for developers to track and manage users who sign up through their apps.
- **`useVisualizations()`** — useVisualizations Hook Provides access to workspace visualizations.
- **`useWorkspace()`** — useWorkspace Hook Provides workspace management functionality.
<!-- AUTO-GENERATED:END:hooks-extended -->

---

### useIntegrations

Register any HTTPS REST API as a named integration that the agent can call as a tool. Credentials are encrypted at rest; raw secrets are never returned after creation.

```tsx
import { useIntegrations } from 'flowstack-sdk';

const { integrations, create, update, remove, isLoading } = useIntegrations();

// Register Shopify
await create({
  name: 'Shopify',
  description: 'Shopify Admin API for order and product management',
  base_url: 'https://my-store.myshopify.com/admin/api/2024-01',
  auth_type: 'bearer',          // 'bearer' | 'api_key_header' | 'api_key_query' | 'basic' | 'none'
  auth_config: { token: 'shpat_xxx' },
  endpoints: [
    { name: 'list_orders', method: 'GET',  path: '/orders.json' },
    { name: 'get_order',   method: 'GET',  path: '/orders/{id}.json' },
    { name: 'cancel_order',method: 'POST', path: '/orders/{id}/cancel.json' },
  ],
});

// Update credentials
await update(id, { auth_config: { token: 'new_token' } });

// Remove
await remove(id);
```

Return value:

```tsx
{
  integrations: Integration[];   // [{integration_id, name, base_url, auth_type, endpoint_count, ...}]
  isLoading: boolean;
  error: string | null;
  create:  (input) => Promise<Integration | null>;
  update:  (id, input) => Promise<boolean>;
  remove:  (id) => Promise<boolean>;
  get:     (id) => Promise<Integration | null>;  // includes full endpoint list
  refresh: () => Promise<void>;
}
```

---

### useAutomations

Schedule agent prompts on a cron schedule via AWS EventBridge. Results can be delivered silently (stored only), by email, webhook, or as a downloadable file.

Schedule format: **5-field Unix cron** `"minute hour dom month dow"`

```tsx
import { useAutomations } from 'flowstack-sdk';

const { automations, create, pause, resume, runNow, getRuns } = useAutomations();

// Daily sales digest — weekdays at 9 AM Eastern
await create({
  name: 'Daily sales digest',
  prompt: "Pull yesterday's orders from Shopify, summarize revenue by product and region, flag any anomalies.",
  schedule: '0 9 * * 1-5',
  timezone: 'America/New_York',
  target_agents: ['shopify_analyst'],   // routes to a specific agent persona; omit for default
  output_config: {
    type: 'email',
    to: 'team@company.com',
    subject_template: 'Sales digest — {date}',
  },
});

// Run once right now (ignores schedule)
await runNow(automationId);

// Pause / resume
await pause(automationId);
await resume(automationId);

// Get last 10 run results
const runs = await getRuns(automationId, 10);
// [{run_id, status, started_at, duration_ms, credits_used, output_summary, output_url}]
```

Output config options:

| `type` | Delivers via | Extra fields |
|---|---|---|
| `"silent"` | Stored only (default) | — |
| `"email"` | Email | `to`, `subject_template`, `format` |
| `"webhook"` | HTTP POST | `url`, `headers`, `format` |
| `"file"` | Downloadable URL in `output_url` | `format` (`"csv"` \| `"json"` \| `"pdf"`) |

Return value:

```tsx
{
  automations: Automation[];   // [{automation_id, name, schedule, status, last_run_at, run_count, ...}]
  isLoading: boolean;
  error: string | null;
  create:  (input) => Promise<Automation | null>;
  update:  (id, input) => Promise<boolean>;
  remove:  (id) => Promise<boolean>;
  pause:   (id) => Promise<boolean>;
  resume:  (id) => Promise<boolean>;
  runNow:  (id) => Promise<{ invoked: boolean } | null>;
  getRuns: (id, limit?) => Promise<AutomationRun[]>;
  refresh: () => Promise<void>;
}
```

---

## Components

### Pre-built Page Components

```tsx
import { AuthPage, DashboardLayout, ChatPage } from 'flowstack-sdk';

// Complete auth page with login/register tabs
<AuthPage defaultTab="login" onSuccess={() => router.push('/dashboard')} showGoogle />

// Dashboard layout with sidebar
<DashboardLayout sidebar={<Sidebar />} header={<Header />}>
  <Content />
</DashboardLayout>

// Full chat interface
<ChatPage title="AI Assistant" placeholder="Ask anything..." welcomeMessage={<Welcome />} />
```

### Form Components

```tsx
import { LoginForm, RegisterForm, AuthGuard } from 'flowstack-sdk';

<LoginForm onSuccess={handleSuccess} onError={handleError} showRegisterLink />
<RegisterForm onSuccess={handleSuccess} showLoginLink />

// Route protection
<AuthGuard fallback={<LoginPage />} requireWorkspace>
  <ProtectedContent />
</AuthGuard>
```

### Workspace & Data Components

```tsx
import { WorkspaceSelector, CreateWorkspaceModal, DatasetUploader, ChatInterface, MessageList } from 'flowstack-sdk';

<WorkspaceSelector onSelect={handleSelect} />
<CreateWorkspaceModal isOpen={open} onCreated={handleCreated} />
<DatasetUploader onUpload={handleUpload} accept=".csv,.xlsx,.parquet" />
<ChatInterface template="data-science" height={500} placeholder="Ask about your data..." />
<MessageList messages={messages} isStreaming={isStreaming} />
```

### MarkdownRenderer

Drop-in component for rendering agent responses with full GFM support (tables, code blocks, inline formatting). Handles mid-stream table repair automatically — no Tailwind or external CSS required.

```tsx
import { useAgent, MarkdownRenderer } from 'flowstack-sdk';

function Chat() {
  const { messages, isStreaming } = useAgent('data-science');
  return (
    <div>
      {messages.map(msg =>
        msg.role === 'assistant' ? (
          <MarkdownRenderer
            key={msg.id}
            content={msg.content}
            isStreaming={isStreaming && msg === messages.at(-1)}
          />
        ) : (
          <p key={msg.id}>{msg.content}</p>
        )
      )}
    </div>
  );
}
```

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw markdown from `message.content` |
| `isStreaming` | `boolean?` | Pass `true` while streaming to apply mid-stream table repair |
| `className` | `string?` | Custom class for the wrapper `<div>` |

---

## Wallet Module

> **Built apps: do not use this module for authentication.** The wallet module requires peer dependencies (`@privy-io/react-auth`, `wagmi`, `viem`, `@tanstack/react-query`) and needs Privy running on the page's origin — which is only possible on `casino.flowstack.fun`, not on `*.casino.flowstack.fun` built-app subdomains. **Use `BrokeredLoginButton` for auth in built apps.**
>
> Use this module only when your app needs to read/display INFER token balances, accept token payments, or access wallet addresses directly.

Separate entry point at `flowstack-sdk/wallet` — import only when you need INFER token payments. Peer dependencies required:

```json
{
  "dependencies": {
    "@privy-io/react-auth": ">=2.0.0",
    "wagmi": ">=2.0.0",
    "viem": ">=2.0.0",
    "@tanstack/react-query": ">=5.0.0"
  }
}
```

### Hooks

```tsx
import { useWalletAuth, useInferBalance, useAgentBalance, useDeposit, useBuyInfer } from 'flowstack-sdk/wallet';
```

#### useWalletAuth

```tsx
const {
  isConnected,      // boolean
  isLoading,        // boolean
  address,          // string | null — checksummed wallet address
  isEmbeddedWallet, // boolean — Privy embedded vs MetaMask
  authMethod,       // 'privy' | 'siwe' | null
  error,            // string | null
  login,            // (method?: 'privy' | 'wallet') => Promise<void>
  logout,           // () => void
} = useWalletAuth();
```

#### useInferBalance

```tsx
const {
  data,       // InferBalance | null — { balance, available, queryCredits, balanceWei, heldWei, availableWei }
  isLoading,  // boolean
  error,      // string | null
  refetch,    // () => Promise<void>
} = useInferBalance();
```

#### useDeposit

```tsx
const {
  deposit,      // (amount: number) => Promise<string | null> — returns tx hash
  isDepositing, // boolean
  txHash,       // string | null
  error,        // string | null
} = useDeposit();
```

#### useBuyInfer

```tsx
const {
  buy,      // (amount?: number) => void — opens fiat on-ramp widget
  isBuying, // boolean
  status,   // 'idle' | 'pending' | 'completed' | 'failed'
  error,    // string | null
} = useBuyInfer();
```

#### useAgentBalance

Polls `GET /billing/agent/balance` for the connected wallet's AGENT token balance. For built apps that need to check whether the end-user has enough AGENT to run an operation.

```tsx
const {
  data,       // AgentBalance | null — { balance, available, buildCredits, balanceWei, ... }
  isLoading,  // boolean
  error,      // string | null
  refetch,    // () => Promise<void>
} = useAgentBalance();

// data.available — spendable AGENT (balance minus active holds)
// data.balance   — total AGENT in wallet
```

### Components

```tsx
import {
  LoginButton, InferBalanceBadge, AgentBalanceBadge,
  NeedsAgent, PaymentRequired, BuyInferModal
} from 'flowstack-sdk/wallet';

// Privy/SIWE login — Casino PLATFORM only, NOT for built apps
// Built apps use BrokeredLoginButton from 'flowstack-sdk' instead
<LoginButton />

// Display wallet balances
<InferBalanceBadge />
<AgentBalanceBadge />

// Gate a feature behind a minimum AGENT balance.
// If insufficient → shows "Get AGENT →" CTA deep-linking to OIF /buy.
// If sufficient  → renders children and calls onProceed when clicked.
<NeedsAgent
  amountNeeded={2}
  onProceed={generateAlbumArt}
  returnUrl={window.location.href}
>
  <p>Generate a new design — costs 2 AGENT</p>
</NeedsAgent>

// Gate content behind payment
<PaymentRequired>
  <PaidContent />
</PaymentRequired>

// Buy INFER tokens modal
<BuyInferModal />
```

**`<NeedsAgent>` deep-link flow:**
1. Built app renders `<NeedsAgent amountNeeded={5} returnUrl={window.location.href}>`
2. User has 0 AGENT → "Get AGENT →" button appears
3. Click opens `https://openinferencefoundation.org/buy?returnTo=<encoded-url>&need=5`
4. User buys AGENT with a credit card on OIF (no wallet setup required — Privy creates it)
5. OIF redirects back to `returnUrl` — user now has AGENT and can proceed

---

## Direct Agent Access

Discover and target specific agents directly, bypassing the default strategic planner routing.

### useAgents (Discovery)

```tsx
const { agents, isLoading, refreshAgents } = useAgents();

// agents: AgentInfo[] — each has name, description, tools, triggerPhrases, useFor
```

### Targeting Custom Agents (Built Apps)

For built apps, `targetAgents` refers to agents **you create** via `casino_create_agent`. There are no pre-built ecosystem agents — you define the persona and capabilities, the platform enforces them.

```tsx
// 1. Create your agent via MCP first (once, at setup time):
//    casino_create_agent(site_id, "support_bot", "You are a helpful support assistant...", capabilities=["data_access"])
//    OR for per-tool control: casino_create_agent(site_id, "support_bot", "...", tools=["query_mongodb", "count_documents"])

// 2. Target it from your built app:
const { query, messages, isStreaming } = useAgent(undefined, {
  targetAgents: ['support_bot'],      // must match the name you registered
  capabilities: ['data_access'],      // advisory — agent definition overrides this
});
```

**CRITICAL:** `targetAgents` is required for built-app users (`appScope` set). Without it, app-scoped users get 403. The name must exactly match a `casino_create_agent` registration for your site.

### Available Tool Categories

Declare these in `capabilities` when registering an agent or calling `useAgent`:

| Category | What it provides |
|----------|-----------------|
| `data_access` | query_mongodb, insert_documents, update_documents, aggregate_mongodb, list_collections, query_data_source, and more |
| `external_integration` | web_search, web_search_deep, fetch_url, google_analytics, google_ads, google_drive, RSS, Reddit |
| `code_execution` | python_exec, daytona_run_code |
| `workspace_management` | save_document, list_documents, search_documents, save_report, save_visualization |
| `site_operations` | build_project, write_project_file, get_site_files, publish_version |
| `agent_management` | spawn_subagent, list_subagents |

Most built-app agents only need `data_access`. Use `casino_list_tools` (MCP) to see the full tool list for each category.

### Tool-level Access Control (P0-117)

In addition to `capabilities` (category grants), you can pass an explicit `tools` list to `casino_create_agent` for per-tool access control:

| Param | Granularity | Example |
|-------|-------------|---------|
| `capabilities` | Category — all tools in that group | `["data_access"]` → all 14 data tools |
| `tools` | Individual tool names | `["query_mongodb", "count_documents"]` → only those 2 |

**Priority:** `tools` (specific) overrides `capabilities` (category). If only `capabilities` is set, P0-116 behavior is unchanged.

Use `casino_list_tools()` first to see all valid tool names and categories, then pass exact names:

```
// Step 1 — discover available tool names:
casino_list_tools()
// → returns { "data": ["query_mongodb", "insert_documents", ...], "capabilities": [...], ... }

// Step 2 — create a read-only support bot (no write access):
casino_create_agent(
  site_id="<your_site_id>",
  name="support_bot",
  system_prompt="You are a helpful support assistant...",
  tools=["query_mongodb", "count_documents", "describe_collection"]
)
// → capabilities auto-derived as ["data_access"], tools enforced at runtime
```

**Always-on tool exemption:** `web_search`, `create_diagram`, `list_sites`, `get_site_files`, and the 6 category meta-tools are never filtered — only category-loaded tools are subject to the allowlist.

---

## Agent Catalog

There are no pre-built ecosystem agents. Agents are per-app — you create them with `casino_create_agent` via the Casino MCP, then target them by name.

**Creating an agent (MCP) — category grant:**
```
casino_create_agent(
  site_id="<your_site_id>",
  name="support_bot",
  system_prompt="You are a helpful support assistant...",
  capabilities=["data_access"]   // scopes what tools this agent can use
)
```

**Creating an agent (MCP) — per-tool grant:**
```
casino_create_agent(
  site_id="<your_site_id>",
  name="readonly_bot",
  system_prompt="You are a read-only support assistant...",
  tools=["query_mongodb", "count_documents"]  // only these 2 tools, no writes
)
```

**Targeting it from your app:**
```tsx
const { query, messages } = useAgent(undefined, {
  targetAgents: ['support_bot'],
  capabilities: ['data_access'],
});
```

The backend reads the agent definition from your app's config, injects the system prompt, and enforces the declared capabilities — the client cannot escalate to broader tool access.

---

## Agent Templates & Factory

### Pre-configured Templates

```tsx
import { dataScienceTemplate, marketingTemplate, supportTemplate, createCustomTemplate } from 'flowstack-sdk';

// Use with ChatInterface
<ChatInterface template="data-science" />
<ChatInterface template="marketing" />
<ChatInterface template="support" />

// Custom template
const custom = createCustomTemplate({
  streaming: true,
  networkMode: 'PUBLIC',
  systemPrompt: 'You are a helpful assistant for ...',
});
```

### Agent Factory (Dynamic Routing)

```tsx
import { AgentFactory, IntentAnalyzer, AgentRegistry, DEFAULT_PATTERNS } from 'flowstack-sdk';

// Register agents
const registry = new AgentRegistry();
registry.register({
  name: 'data-analyst',
  description: 'Analyzes datasets and creates visualizations',
  template: dataScienceTemplate,
  patterns: [/analyz/i, /chart/i, /data/i],
});

// Analyze user intent and route to best agent
const analyzer = new IntentAnalyzer({ registry });
const intent = analyzer.analyze('Show me a chart of Q4 revenue');
// → { category: 'data-analysis', confidence: 0.92, entities: ['Q4 revenue'] }
```

---

## API Client

Direct API access — use these when you need lower-level control than hooks provide.

```tsx
import {
  // Auth
  login, register,
  // Workspaces
  listWorkspaces, createWorkspace, getWorkspace,
  // Datasets
  listDatasets, getDataset, getDatasetPreview, deleteDataset,
  // Visualizations & Reports
  listVisualizations, listReports,
  // Models & Scripts
  listModels, getModel, listScripts,
  // Data Sources
  listDataSources, createDataSource, testDataSource, deleteDataSource,
  // Sites
  listSites, getSite, createSite, addSiteFile, publishStagedSite, deleteSite,
  // User Management
  listUsers, getUser, updateUser, deleteUser, suspendUser, reactivateUser,
  getUserActivity, getUserStats, checkAdminPermissions,
  // Conversations
  getConversationHistory,
  // Query
  executeQuery, executeQueryWithConfig,
  // File Upload
  uploadFile,
  // Low-level
  flowstackFetch,
} from 'flowstack-sdk';
```

All functions take `(credentials, ...params, config?)` and return `Promise<ApiResponse<T>>`.

---

## Streaming Utilities

Parse Server-Sent Events from agent streams.

```tsx
import { parseSSELine, parseSSEStream, processSSEStream } from 'flowstack-sdk';

// Parse a single SSE line
const event = parseSSELine('data: {"type":"content","content":"Hello"}');

// Parse a full SSE stream (async generator)
for await (const event of parseSSEStream(response)) {
  switch (event.type) {
    case 'content': console.log(event.content); break;
    case 'tool_start': console.log('Tool:', event.tool); break;
    case 'tool_result': console.log('Result:', event.result); break;
    case 'done': console.log('Complete'); break;
  }
}

// High-level: process stream with callbacks
await processSSEStream(response, {
  onContent: (text) => appendMessage(text),
  onToolStart: (tool) => showToolIndicator(tool),
  onDone: () => finalize(),
});
```

**StreamEvent types:** `content`, `delta`, `text`, `tool_start`, `tool_result`, `tool_error`, `progress`, `status`, `interrupt`, `done`, `error`

---

## Cache Utilities

Per-resource client-side caching with TTL.

```tsx
import {
  // Generic
  getCached, setCached, deleteCached,
  CACHE_TTL,
  // Resource-specific
  getCachedWorkspaces, setCachedWorkspaces, invalidateWorkspacesCache,
  getCachedDatasets, setCachedDatasets, invalidateDatasetsCache,
  getCachedVisualizations, setCachedVisualizations, invalidateVisualizationsCache,
  getCachedReports, setCachedReports, invalidateReportsCache,
  getCachedSites, setCachedSites, invalidateSitesCache,
  // Bulk invalidation
  invalidateWorkspaceArtifacts, // Invalidate all artifacts for a workspace
  invalidateAllUserCache,       // Clear everything for current user
} from 'flowstack-sdk';
```

---

## API Route Generators

Generate Next.js API routes for auth endpoints.

```tsx
// app/api/auth/login/route.ts
import { createLoginRoute } from 'flowstack-sdk';

export const POST = createLoginRoute({
  jwtSecret: process.env.JWT_SECRET!,
  passwordSecret: process.env.PASSWORD_SECRET!,
});

// app/api/auth/register/route.ts
import { createRegisterRoute } from 'flowstack-sdk';

export const POST = createRegisterRoute({
  jwtSecret: process.env.JWT_SECRET!,
  passwordSecret: process.env.PASSWORD_SECRET!,
});
```

---

## Mock Mode

Develop and test without a backend. All hooks work offline with realistic mock data.

```tsx
<FlowstackProvider config={{ ...config, mode: 'mock' }}>
  <App />
</FlowstackProvider>
```

| Hook | Behavior |
|------|----------|
| `useAuth` | Login/register succeed with any credentials |
| `useWorkspace` | Returns 3 sample workspaces |
| `useDatasets` | Returns sample datasets, upload/delete simulated |
| `useAgent` | Returns contextual responses with simulated streaming |
| `useUserManagement` | Returns 5 sample users with stats |
| `useDataSources` | Returns sample MongoDB/PostgreSQL sources |
| `useSites` | Returns empty sites array |

```tsx
import {
  mockCredentials, mockUser, mockWorkspaces, mockDatasets,
  mockVisualizations, mockDataSources, mockManagedUsers,
  mockUserStats, mockUserActivity, mockChatHistory,
  generateMockId, mockDelay,
} from 'flowstack-sdk';
```

---

## Configuration

```tsx
const config = {
  // Required
  jwtSecret: process.env.JWT_SECRET!,
  passwordSecret: process.env.PASSWORD_SECRET!,

  // API
  baseUrl: 'https://sage-api.flowstack.fun',
  tenantId: 't_6fe54402be43',
  mode: 'production',    // 'production' | 'development' | 'mock'
  storage: 'local',      // 'local' | 'session'

  // Google OAuth (optional)
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
  },

  // Wallet / INFER token (optional)
  privyConfig: { appId: 'your-privy-app-id' },
  chain: 'arbitrum-sepolia',  // 'arbitrum-sepolia' | 'arbitrum'
  onRampConfig: { apiKey: 'moonpay-api-key', environment: 'sandbox' },
};
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `jwtSecret` | `string` | Yes | JWT secret for token verification |
| `passwordSecret` | `string` | Yes | Secret for password hashing |
| `baseUrl` | `string` | No | API base URL (default: `https://sage-api.flowstack.fun`) |
| `tenantId` | `string` | No | Tenant ID for user isolation |
| `mode` | `string` | No | `'production'` \| `'development'` \| `'mock'` |
| `storage` | `string` | No | `'local'` \| `'session'` for credentials |
| `auth.googleClientId` | `string` | No | Google OAuth client ID |
| `privyConfig.appId` | `string` | No | Privy app ID for embedded wallets |
| `chain` | `string` | No | Blockchain for INFER token |
| `onRampConfig` | `object` | No | Fiat on-ramp (MoonPay/Transak) config |

### Configuration Validation

```tsx
import { validateConfig, validateConfigOrThrow, isDevelopmentConfig, getConfigSummary } from 'flowstack-sdk';

const result = validateConfig(config);
if (!result.valid) console.error('Errors:', result.errors);
result.warnings.forEach(w => console.warn(w));

// Or throw on invalid
validateConfigOrThrow(config);
```

---

## Error Handling

Structured errors with codes and recovery suggestions.

```tsx
import { FlowstackError, isFlowstackError, ErrorCodes } from 'flowstack-sdk';

try {
  await someOperation();
} catch (error) {
  if (isFlowstackError(error)) {
    console.log(error.code);           // 'AUTHENTICATION_FAILED'
    console.log(error.message);        // Technical message
    console.log(error.userMessage);    // User-friendly message
    console.log(error.recoveryAction); // Suggested action

    switch (error.code) {
      case ErrorCodes.AUTHENTICATION_FAILED: redirectToLogin(); break;
      case ErrorCodes.RATE_LIMITED: showRateLimitWarning(); break;
      case ErrorCodes.NETWORK_ERROR: showOfflineMessage(); break;
    }
  }
}
```

| Code | Description |
|------|-------------|
| `NETWORK_ERROR` | Unable to connect to server |
| `AUTHENTICATION_FAILED` | Login credentials invalid |
| `ACCOUNT_NOT_ACTIVE` | Account needs verification |
| `WORKSPACE_NOT_FOUND` | Workspace doesn't exist |
| `DATASET_UPLOAD_FAILED` | File upload failed |
| `QUERY_FAILED` | AI query failed |
| `RATE_LIMITED` | Too many requests |
| `CONFIG_INVALID` | Invalid SDK configuration |
| `SERVER_ERROR` | Backend server error |

---

## TypeScript

Full TypeScript support. Key type exports:

```tsx
import type {
  // Config
  FlowstackConfig, AuthConfig, RedisConfig, DatabaseConfig,
  // Auth
  User, FlowstackCredentials, UserRole, UserStatus, ManagedUser,
  LoginRequest, LoginResponse, RegisterRequest, RegisterResponse,
  // Workspace
  WorkspaceInfo, CreateWorkspaceRequest, SessionState,
  // Data
  DatasetInfo, DatasetPreview, ColumnSchema, DatasetRow,
  VisualizationData, ReportInfo, ModelInfo, ScriptInfo,
  DataSource, DataSourceType, DataSourceConfig, ConnectionTestResult,
  // Sites
  PublishedSiteInfo, CreateSiteParams, UseSitesReturn,
  // Chat & Streaming
  ChatMessage, ToolCall, StreamEvent, StreamEventType, InterruptInfo,
  DataSourceBadgeInfo, SearchResult, SearchResultsData,
  // Agent
  AgentTemplate, AgentConfig, QueryOptions,
  UseAgentReturn, UseAgentOptions,
  // Factory
  DynamicAgentConfig, IntentCategory, IntentEntity, IntentAnalysis,
  IntentPattern, RegisteredAgent, UseIntentAgentReturn,
  // Hook Returns
  UseAuthReturn, UseWorkspaceReturn, UseDatasetsReturn,
  UseVisualizationsReturn, UseReportsReturn, UseModelsReturn,
  UseDataSourcesReturn, UseQueryReturn, UseUserManagementReturn,
  // API
  ApiResponse, ListResponse, FlowstackClientConfig, RequestOptions,
  // Context
  FlowstackContextValue,
  // User Management
  UserActivityLog, UpdateUserRequest, UserStats, UserListParams,
  // Errors
  FlowstackError, ErrorCode, FlowstackErrorOptions,
  // Config Validation
  ValidationResult,
} from 'flowstack-sdk';

// Wallet types (separate entry point)
import type {
  WalletAuthState, UseWalletAuthReturn,
  InferBalance, UseInferBalanceReturn,
  UseDepositReturn, UseBuyInferReturn,
  WalletProviderProps,
} from 'flowstack-sdk/wallet';
```

---

## MCP Tool Reference (for AI agents building Casino apps)

Use these tools in the Casino MCP server to build, stage, and manage apps.

### Build Loop

| Tool | Description |
|---|---|
| `casino_create_site(name, description)` | Allocate site_id + bootstrap scaffold files |
| `casino_stage_files(site_id, files)` | Stage multiple files in one call (dict of path→content) |
| `casino_stage_file(site_id, path, content)` | Stage a single file |
| `casino_list_staged(site_id)` | List staged files — survives failed builds |
| `casino_clear_staged(site_id)` | Explicit staging reset (success clears automatically) |
| `casino_build_staged(site_id, message)` | Build + publish; returns url, version, build_summary |
| `casino_get_app_source(site_id)` | Fetch live source for editing |

#### Fast build loop (one-shot)

```
casino_create_site("My App")
  → bootstrap.files (6 scaffold files, pre-wired with tenant/site config)
  → site_id, url

casino_stage_files(site_id, {
  ...bootstrap.files,        // package.json, tsconfig, vite.config.ts, index.html, src/main.tsx
  "src/App.tsx": "...",      // your product component
})

casino_build_staged(site_id)
  → { url, version, build_summary: "sandbox: 3s | install+build: 35s | total: 38s" }
```

If the build fails — staged files are **preserved**. Fix the error and call `casino_build_staged` again without re-staging.

### Agent Personas

| Tool | Description |
|---|---|
| `casino_create_agent(site_id, name, system_prompt, capabilities)` | Register new agent persona |
| `casino_update_agent(site_id, name, system_prompt=None, ...)` | Patch existing agent — only provided fields updated |
| `casino_list_agents(site_id)` | List registered personas |

`capabilities` values: `data_access`, `external_integration`, `site_operations`, `code_execution`, `domain_task`, `workspace_management`, `agent_management`

### App Inspection

| Tool | Description |
|---|---|
| `casino_list_apps()` | List all your Casino apps |
| `casino_list_collections(site_id)` | List MongoDB collections for an app |
| `casino_list_tools()` | List all tool names valid for per-tool agent access control |
| `casino_get_sdk_docs(topic)` | SDK documentation (full or filtered by topic) |

---

## License

MIT
