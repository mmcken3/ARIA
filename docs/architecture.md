# ARIA — Architecture

> Self-hosted · Open Source · Single-user
> Last updated: April 2026

---

## What This Is

ARIA is a self-hosted personal AI operating system. It combines a persistent AI with deep integrations across email, calendar, and tasks — surfacing a unified view of your work and taking action on your behalf, proactively and on demand.

It is not a chatbot wrapper. It is not a task app. It is both, plus an agentic background layer that runs continuously.

### The Three Modes

**Reactive** — You ask, ARIA responds with full context (tasks, inbox, calendar). Not a blank prompt — ARIA knows your state before you type.

**Scheduled / Proactive** — Background jobs run on cron: morning brief, EOD summary, pre-meeting nudge. Push via browser notification or SMS (optional).

**Event-driven** — Polling worker detects new email, calendar changes, or stale tasks and fires notifications when something crosses a relevance threshold.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16, App Router, TypeScript | Full-stack, file-based routing |
| Auth | Better Auth + Google OAuth | Single-user allowlist via `ALLOWED_EMAIL` |
| Database | PostgreSQL (Neon) + Drizzle ORM | Schema push workflow, no migration files |
| Background Jobs | Inngest | Planned — not yet wired |
| AI | Anthropic Claude via `lib/ai/provider.ts` | Abstracted — swappable |
| Notifications | Web Push API (VAPID) | Planned |
| Styling | Tailwind CSS + CSS custom properties | All values via design tokens |
| API Docs | OpenAPI 3.1 + Scalar UI at `/api/docs` | Manually maintained in `openapi.ts` |

---

## Current State

### Built

**Auth**
- Better Auth with Google OAuth
- Single-user allowlist: `ALLOWED_EMAIL` env var
- Two-gate bypass protection: `databaseHooks` on `user.create` + `session.create`
- 7-day sliding session window
- `proxy.ts` route protection (Next.js 16 convention)

**Database — `lib/db/schema.ts`**

All tables below are in production (pushed to Neon):

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
| `job_logs` | Background job run history |

**Tasks**
- Full CRUD API: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`
- Activity feed: `GET /api/tasks/:id/activity`
- Board view (kanban, HTML5 DnD) + List view with toggle
- Slide-in detail panel
- Project filter in header

**Projects**
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- Unique name enforcement via `DuplicateProjectNameError` (pre-check pattern, not constraint detection)
- Inline create/rename/delete in Tasks UI

**Chat**
- `POST /api/chat` — streams NDJSON events to client
- `GET /api/chat/messages` — full history for current user's conversation
- Streaming via Anthropic `messages.stream()` with tool use loop (max 5 turns)
- Tool use: `create_task`, `update_task`, `delete_task`, `list_tasks`, `create_project`, `list_projects`, `write_memory`, `delete_memory`, `list_memory`
- Context builder injects tasks + memories into system prompt before every response
- Stream tee: one branch to client, one to save completed assistant message to DB

**Memory**
- `GET /api/memory`, `DELETE /api/memory/:id`
- ARIA writes discrete facts via `write_memory` tool
- Injected into every system prompt under "What you remember about this user"
- Viewable and deletable in Settings

**UI**
- Shell layout: sidebar nav + topbar
- `/chat` — message thread, context strip, slash commands, streaming
- `/tasks` — board/list toggle, project filter, detail panel
- `/dashboard` — situation brief: computed headline, in-flight tasks, backlog breakdown
- `/settings` — memory viewer, integration placeholders, dark mode toggle
- `/notifications` — placeholder (pending integrations)
- Design tokens: full light/dark system in `tokens.ts` + `globals.css`
- Fonts: Instrument Serif (display), DM Sans (body), JetBrains Mono (mono)

---

## What's Next

### Phase 4 — Integrations

Each integration implements the `Integration` interface in `lib/integrations/interface.ts`. The core system calls `getContext()` before every AI response. New integrations register in `lib/integrations/registry.ts`.

**Gmail**
- Better Auth already stores Google OAuth token
- Add `gmail.readonly` + `gmail.send` scopes at sign-in
- Poll for new/changed threads every 2-3 minutes (incremental sync token)
- Cache in `email_cache` table (subject, sender, snippet, labels — not full body)
- `getContext()` returns unread count + top relevant threads

**Google Calendar**
- Add `calendar.events` scope
- Poll with Google's sync token for change detection
- Cache in `calendar_event_cache` table
- `getContext()` returns next event + today's schedule

**Schema tables needed (not yet created):**
- `email_cache` — lightweight email mirror
- `calendar_event_cache` — event cache
- `contacts` — people layer built from email interactions
- `integrations` — OAuth token storage per user per provider (encrypted)
- `sync_state` — polling cursors per user per integration
- `notifications` — notification log

### Phase 5 — Agentic Layer

- Inngest setup: fan-out to users, cron scheduling
- `gmail.poll` + `calendar.poll` jobs
- `relevance.eval` — scores incoming email/calendar against active tasks
- `brief.morning` — 7am user-TZ, full context, browser push
- `brief.eod` — 5pm summary
- Web Push: VAPID keys, service worker registration

### Phase 6 — Memory, Contacts, Polish

- AI memory inference job (daily, runs over recent interactions)
- Contact awareness: built from email_cache, surfaced in AI context
- Draft actions with approval flow in chat (email reply, task creation from email)
- Settings: full integration management, memory editing, preferences

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
OAuth tokens encrypted with AES-256-GCM before every DB write. Decrypt only server-side. Never log token values.

```typescript
import { encryptToken, decryptToken } from '@/lib/crypto/tokens';
const encrypted = encryptToken(accessToken);  // before write
const raw = decryptToken(row.accessTokenEnc); // before API call
```

### 4. Integration Interface
Every integration implements `Integration` in `lib/integrations/interface.ts`. The system calls `getContext()` before every AI response. Nothing else in the system knows the details of any specific integration.

### 5. OpenAPI on Every Route
Every API route must be documented in `openapi.ts`. Scalar UI at `/api/docs` is the live contract.

### 6. Design Tokens Only
Never hardcode colors, spacing, or shadows. All values come from `tokens.ts` and CSS custom properties in `globals.css`.

---

## File Structure

```
aria/
├── app/
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── (shell)/                # Authenticated shell layout
│   │   ├── chat/               # Default route — chat interface
│   │   ├── dashboard/          # Situation brief
│   │   ├── tasks/              # Task management
│   │   ├── notifications/      # Notification center (placeholder)
│   │   └── settings/           # Memory, integrations, appearance
│   └── api/
│       ├── auth/[...all]/      # Better Auth catch-all
│       ├── chat/               # POST — stream AI response
│       ├── chat/messages/      # GET — conversation history
│       ├── tasks/              # CRUD
│       ├── tasks/[id]/
│       ├── tasks/[id]/activity/
│       ├── projects/           # CRUD
│       ├── projects/[id]/
│       ├── memory/             # GET list
│       ├── memory/[id]/        # DELETE
│       └── docs/               # Scalar OpenAPI UI
│
├── components/
│   ├── chat/                   # MessageBubble, ContextStrip, InputBar, ToolActionCard
│   ├── dashboard/              # KanbanBoard, TaskCard, TaskDetailPanel
│   ├── tasks/                  # TasksView, TaskListView
│   └── ui/                     # SidebarNav, Topbar (shell primitives)
│
├── lib/
│   ├── ai/
│   │   ├── provider.ts         # AIProvider interface + AIContext type
│   │   ├── anthropic.ts        # Claude implementation (streaming + tool loop)
│   │   ├── context-builder.ts  # Assembles tasks + memory for system prompt
│   │   └── tools.ts            # Tool definitions + executor
│   ├── integrations/           # interface.ts, registry.ts (stubs)
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (source of truth)
│   │   ├── client.ts           # Neon DB client
│   │   └── queries/            # Per-entity typed helpers
│   │       ├── tasks.ts
│   │       ├── projects.ts
│   │       ├── conversations.ts
│   │       └── memory.ts
│   ├── api/
│   │   ├── session.ts          # Session validation helper
│   │   ├── tasks/schema.ts     # Zod schemas for task routes
│   │   └── projects/schema.ts  # Zod schemas for project routes
│   ├── auth/
│   │   ├── auth.ts             # Better Auth config
│   │   └── client.ts           # Client-side auth helpers
│   └── utils/
│       └── cn.ts               # Tailwind class merge utility
│
├── docs/
│   ├── architecture.md         # This file
│   └── setup.md                # Local dev + deployment guide
│
├── CLAUDE.md                   # Claude Code instructions (must stay in root)
├── .impeccable.md              # Impeccable design context (must stay in root)
├── openapi.ts                  # OpenAPI 3.1 spec
├── tokens.ts                   # Design token definitions
├── proxy.ts                    # Route protection (Next.js 16)
├── drizzle.config.ts           # Drizzle Kit config
└── .env.example                # All required env vars documented
```
