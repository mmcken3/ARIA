# ARIA — Architecture

> Self-hosted · Open Source · Single-user
> Last updated: April 2026

---

## What This Is

ARIA is a self-hosted personal AI operating system. It combines a persistent AI with deep integrations across email, calendar, and tasks — surfacing a unified view of your work and taking action on your behalf, proactively and on demand.

It is not a chatbot wrapper. It is not a task app. It is both, plus an agentic background layer that runs continuously.

### The Three Modes

**Reactive** — You ask, ARIA responds with full context (tasks, inbox, calendar). Not a blank prompt — ARIA knows your state before you type.

**Scheduled / Proactive** — Background jobs run on cron: morning brief (7am local), sync jobs every 3 minutes. Delivered via browser push notification.

**Event-driven** — Incremental sync via Gmail history API and Google Calendar sync tokens. New messages and events appear in context within minutes.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16, App Router, TypeScript | Full-stack, file-based routing |
| Auth | Better Auth + Google OAuth | Single-user allowlist via `ALLOWED_EMAIL` |
| Database | PostgreSQL (Neon) + Drizzle ORM | Schema managed via `drizzle-kit push` |
| Background Jobs | Inngest | Live — gcal-sync + gmail-sync run every 3 min |
| AI | Anthropic Claude via `lib/ai/provider.ts` | Abstracted — swappable |
| Notifications | Web Push API (VAPID) | Planned |
| Styling | Tailwind CSS + CSS custom properties | All values via design tokens |
| API Docs | OpenAPI 3.1 + Scalar UI at `/api/docs` | Manually maintained in `lib/api/openapi.ts` |

---

## Current State

### Auth

- Better Auth with Google OAuth
- Single-user allowlist: `ALLOWED_EMAIL` env var
- Two-gate bypass protection: `databaseHooks` on `user.create` + `session.create`
- 7-day sliding session window
- `proxy.ts` route protection (Next.js 16 convention)
- `session.create.after` hook captures Google OAuth tokens into `integration_connections`

### Database — `lib/db/schema.ts`

All tables are live in Neon:

| Table | Purpose |
|-------|---------|
| `user` | Better Auth users |
| `session` | Better Auth sessions |
| `account` | Better Auth OAuth accounts |
| `verification` | Better Auth verification tokens |
| `projects` | Optional task groupings. Unique `(userId, name)` index. |
| `tasks` | Core task entity. Nullable `projectId` FK. |
| `task_activity` | Audit trail for task changes (status, comments, AI actions) |
| `conversations` | One persistent conversation per user |
| `messages` | Chat history. Rolling window of last 30 fetched per request. |
| `memory` | Persistent facts ARIA writes across sessions |
| `integration_connections` | One row per OAuth provider per user. AES-256-GCM encrypted tokens. Includes `sync_cursors` JSONB for incremental sync state. |
| `email_messages` | AI-context cache of recent inbox messages. Snippet only (≤200 chars), never full body. Hard cap 50 rows per user. |
| `calendar_events` | Upcoming event cache. Attendees as JSONB. |
| `job_logs` | Background job run history with duration and error |

### Tasks

- Full CRUD: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`
- Activity feed: `GET /api/tasks/:id/activity`
- Board view (kanban, HTML5 DnD) + list view with toggle
- Slide-in detail panel
- Project filter in header

### Projects

- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- Unique name enforcement via `DuplicateProjectNameError`

### Chat

- `POST /api/chat` — streams NDJSON events to client
- `GET /api/chat/messages` — full history for current user's conversation
- Streaming via Anthropic `messages.stream()` with tool use loop (max 5 turns)
- Tool use: `create/update/delete/list_tasks`, `create/list_projects`, `write/delete/list_memory`, `list/create/update/delete_calendar_event`
- Context builder injects tasks + memories + calendar summary + email summary into system prompt before every response
- Stream tee: one branch to client, one to save completed assistant message to DB

### Memory

- `GET /api/memory`, `DELETE /api/memory/:id`
- ARIA writes discrete facts via `write_memory` tool
- Injected into every system prompt
- Viewable and deletable in Settings

### Integrations

**Google OAuth flow** (`lib/integrations/google/`)

- `/api/integrations/connect?provider=google` — redirects to Google OAuth, requests all scopes (calendar + gmail.readonly)
- `/api/integrations/callback` — validates CSRF state cookie, exchanges code for tokens, upserts `integration_connections`
- `/api/integrations/disconnect` — marks connection as `status=disconnected`
- `/api/integrations/status` — returns provider-grouped connection state for Settings UI
- One connection row per provider; gcal and gmail share the Google row and are distinguished by scope presence

**Google Calendar** (`lib/integrations/google-calendar/`)

- Read: incremental sync via Google Calendar sync token; full sync on first run or expired token
- Write: create/update/delete events via Google Calendar API, upserted to local DB immediately
- `getContext()` returns next 5 events formatted as human-readable lines for AI system prompt
- AI tools: `list_calendar_events`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event`
- Attendee support: AI merges existing attendees before calling update (full list replaces on PATCH)

**Gmail** (`lib/integrations/gmail/`)

- Incremental sync via Gmail history API (historyId cursor in `syncCursors`); full sync on first run
- Query filter: `category:primary OR label:important` to skip noise before fetching individual messages
- Per-message filter: always drops SPAM/TRASH/CATEGORY_PROMOTIONS; drops SOCIAL/UPDATES/FORUMS unless IMPORTANT or STARRED
- Relevance scoring (0–1, heuristic, no LLM): IMPORTANT +0.4, STARRED +0.3, unread +0.1, high-signal subject keywords +0.15, non-consumer domain +0.05
- Hard cap: 50 rows per user, oldest evicted on overflow; 7-day age window
- `getContext()` surfaces top 5 emails with score ≥ 0.4 in AI system prompt
- Enable verbose logging: `GMAIL_DEBUG=1`

**Background sync** (`lib/jobs/`)

- `gcal-sync`: Inngest cron every 3 minutes, fans out to all active Google connections
- `gmail-sync`: Inngest cron every 3 minutes, same pattern
- Per-user errors are caught and logged; one user failing never crashes others
- Failed connections marked `status=error` in DB, surfaced in Settings UI

### Dashboard

- `GET /api/dashboard` — returns next 5 calendar events + top 4 emails (score ≥ 0.3) for the active user
- Three-zone layout: Temporal (next meeting with live countdown), Active (tasks with left-border variant system), Signal (email inbox rows)
- Calendar zone: countdown size encodes urgency (≤15m = danger, ≤60m = warning, >60m = muted)
- Task zone: 2px left border — amber = needs attention, teal = in progress, none = queued
- Email zone: two-line Superhuman-style rows, sender-first
- Backlog collapsed to a single priority-breakdown summary line
- Degrades gracefully when integrations are not connected

### UI

- Shell layout: sidebar nav + topbar
- `/chat` — message thread, context strip, streaming, tool action cards
- `/dashboard` — tiered situation view (calendar → tasks → email → backlog)
- `/tasks` — board/list toggle, project filter, detail panel
- `/settings` — integration management (connect/disconnect), memory viewer, dark mode toggle
- Design tokens: full light/dark system in `globals.css`
- Fonts: Instrument Serif (display), DM Sans (body), JetBrains Mono (mono)

---

## What's Next

### Morning Brief Job

- Inngest cron at 7am in the user's local timezone
- Full context pass: tasks + calendar + email → Claude → structured brief
- Delivered via browser push notification
- Stub: `// morningBriefJob — added as built` in `app/api/inngest/route.ts`

### Notifications (Web Push)

- VAPID key generation + service worker registration
- Notification log table + delivery channel abstraction in `lib/notifications/`
- Morning brief is the first consumer

### Richer Cross-Source Linking

- Link calendar events to related tasks (by keyword/contact matching)
- Link emails to tasks (create task from email, or surface related email on task detail)
- Contact layer: build a people graph from email interactions

### Job Log UI

- Surface "last synced X min ago" in topbar
- Show job error state in Settings if a sync has been failing

---

## Architecture Patterns

### 1. Data Isolation
Every DB query is scoped by `userId` pulled from the validated session. Never trust `userId` from request body or query params.

### 2. AI Provider Abstraction
Never import Anthropic SDK directly in routes or components. Always go through `lib/ai/provider.ts`.

```typescript
// CORRECT
import { ai } from '@/lib/ai/anthropic';
const stream = ai.respond(history, context, userId);

// NEVER — not in routes or components
import Anthropic from '@anthropic-ai/sdk';
```

### 3. Token Encryption
OAuth tokens encrypted with AES-256-GCM before every DB write. Decrypt only server-side in job or API context. Never log token values.

```typescript
import { encryptToken, decryptToken } from '@/lib/crypto/tokens';
const encrypted = encryptToken(accessToken);  // before write
const raw = decryptToken(row.accessTokenEnc); // before API call
```

### 4. Integration Interface
Every integration implements `Integration` in `lib/integrations/interface.ts`. The system calls `getContext()` before every AI response. `sync()` is called by background jobs. Nothing else in the system knows the details of any specific integration.

### 5. OpenAPI on Every Route
Every API route must be documented in `lib/api/openapi.ts`. Scalar UI at `/api/docs` is the live contract.

### 6. Design Tokens Only
Never hardcode colors, spacing, or shadows. All values come from CSS custom properties in `globals.css`.

---

## File Structure

```
aria/
├── app/
│   ├── (auth)/
│   │   └── login/                  # Login page
│   ├── (shell)/                    # Authenticated shell layout
│   │   ├── chat/                   # Default route — chat interface
│   │   ├── dashboard/              # Situation brief (calendar + tasks + email)
│   │   ├── tasks/                  # Task management
│   │   ├── notifications/          # Notification center (placeholder)
│   │   └── settings/               # Integrations, memory, appearance
│   └── api/
│       ├── auth/[...all]/          # Better Auth catch-all
│       ├── chat/                   # POST — stream AI response
│       ├── chat/messages/          # GET — conversation history
│       ├── dashboard/              # GET — calendar + email for dashboard
│       ├── tasks/                  # CRUD
│       ├── tasks/[id]/
│       ├── tasks/[id]/activity/
│       ├── projects/               # CRUD
│       ├── projects/[id]/
│       ├── memory/                 # GET list
│       ├── memory/[id]/            # DELETE
│       ├── integrations/connect/   # GET — initiate OAuth
│       ├── integrations/callback/  # GET — OAuth callback
│       ├── integrations/status/    # GET — connection status
│       ├── integrations/disconnect/# POST — disconnect provider
│       ├── inngest/                # Inngest serve handler
│       └── docs/                   # Scalar OpenAPI UI
│
├── components/
│   ├── chat/                       # MessageBubble, ContextStrip, InputBar, ToolActionCard
│   ├── dashboard/                  # KanbanBoard, TaskCard, TaskDetailPanel
│   ├── tasks/                      # TasksView, TaskListView
│   └── ui/                         # SidebarNav, Topbar (shell primitives)
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts             # AIProvider interface + AIContext type
│   │   ├── anthropic.ts            # Claude implementation (streaming + tool loop)
│   │   ├── context-builder.ts      # Assembles tasks + calendar + email + memory
│   │   └── tools.ts                # Tool definitions + executor (incl. calendar write)
│   ├── integrations/
│   │   ├── interface.ts            # Integration interface (sync + getContext)
│   │   ├── registry.ts             # Integration registry
│   │   ├── google/
│   │   │   └── client.ts           # googleFetch with auto token refresh
│   │   ├── google-calendar/
│   │   │   ├── index.ts            # gcalIntegration (read sync + getContext)
│   │   │   └── write.ts            # create/update/delete via Calendar API
│   │   └── gmail/
│   │       └── index.ts            # gmailIntegration (sync + getContext)
│   ├── jobs/
│   │   ├── inngest.ts              # Inngest client
│   │   ├── gcal-sync.ts            # Calendar sync cron (every 3 min)
│   │   └── gmail-sync.ts           # Gmail sync cron (every 3 min)
│   ├── db/
│   │   ├── schema.ts               # Drizzle schema (source of truth)
│   │   ├── client.ts               # Neon DB client
│   │   └── queries/
│   │       ├── tasks.ts
│   │       ├── projects.ts
│   │       ├── conversations.ts
│   │       ├── memory.ts
│   │       └── integrations.ts     # email + calendar + connection queries
│   ├── api/
│   │   ├── session.ts              # Session validation helper
│   │   ├── openapi.ts              # OpenAPI 3.1 spec (all routes)
│   │   ├── tasks/schema.ts
│   │   └── projects/schema.ts
│   ├── auth/
│   │   ├── auth.ts                 # Better Auth config + token capture hook
│   │   └── client.ts
│   └── crypto/
│       └── tokens.ts               # AES-256-GCM encrypt/decrypt
│
├── docs/
│   ├── architecture.md             # This file
│   └── setup.md                    # Local dev + deployment guide
│
├── CLAUDE.md                       # Claude Code instructions
├── .impeccable.md                  # Impeccable design context
├── drizzle.config.ts
└── .env.example                    # All required env vars documented
```
