# ARIA — Claude Code Instructions

> Read this file completely before writing any code.
> Read `docs/architecture.md` completely before writing any code.
> When in doubt, check both files before making a decision.

---

## What This Project Is

ARIA is a self-hosted, open source personal AI operating system. It combines a persistent AI brain with deep integrations across email, calendar, and tasks. It surfaces a unified view of the user's work and takes action proactively and on demand.

This is not a chatbot wrapper. This is not a task app. This is the combination of both, plus an agentic background layer that runs continuously.

---

## UI Work — Use the Impeccable Plugin

All frontend design work in this project uses the **impeccable** plugin. This is non-negotiable — it ensures production-quality UI that doesn't look AI-generated.

Before starting any UI task, run `/impeccable:teach-impeccable` once to establish persistent design context for this project. After that:

| Task | Skill to use |
|------|-------------|
| Building a new component or page | `/impeccable:frontend-design` |
| Typography choices or fixes | `/impeccable:typeset` |
| Color system work | `/impeccable:colorize` |
| Layout, spacing, visual rhythm | `/impeccable:arrange` |
| Animations and transitions | `/impeccable:animate` |
| Pre-ship quality pass | `/impeccable:polish` |
| Consistency audit | `/impeccable:normalize` |
| Full interface quality audit | `/impeccable:audit` |

When building UI: invoke the relevant impeccable skill instead of writing components directly.

---

## Stack (Non-Negotiable)

- **Framework**: Next.js 16, App Router, TypeScript throughout
- **Auth**: Better Auth with Google OAuth (Gmail + Calendar scopes)
- **Database**: PostgreSQL via Neon, Drizzle ORM
- **Background Jobs**: Inngest
- **AI**: Anthropic API (Claude) — always via `lib/ai/provider.ts`, never called directly from routes
- **Notifications**: Web Push API (browser-native, VAPID keys)
- **API Docs**: OpenAPI 3.1 + Scalar UI at `/api/docs`
- **Styling**: Tailwind CSS + CSS custom properties for design tokens

Do not introduce new dependencies without a clear reason. If you think a dependency is needed, add a comment explaining why before installing it.

---

## Architecture Patterns — Always Enforce

### 1. Data Isolation
Every database query MUST be scoped by `userId`. Never trust `userId` from query params or request body. Always pull it from the validated session.

```typescript
// CORRECT
const session = await auth.getSession(req);
const tasks = await db.query.tasks.findMany({
  where: eq(tasks.userId, session.user.id) // from session, always
});

// NEVER DO THIS
const { userId } = await req.json(); // untrusted
```

### 2. Token Encryption
OAuth tokens MUST be encrypted with AES-256-GCM before every database write. Decrypt only in server-side job or API context. Never log token values. Never send to client.

```typescript
// Always use lib/crypto/tokens.ts
import { encryptToken, decryptToken } from '@/lib/crypto/tokens';

const encrypted = encryptToken(accessToken); // before DB write
const raw = decryptToken(row.accessTokenEnc); // before API call
```

### 3. AI Provider Abstraction
Never import or call the Anthropic SDK directly from a route or component. Always go through the provider interface.

```typescript
// CORRECT
import { ai } from '@/lib/ai/provider';
const response = await ai.complete(messages, context, memory);

// NEVER
import Anthropic from '@anthropic-ai/sdk'; // not in routes/components
```

### 4. Integration Interface
Every integration MUST implement the `Integration` interface in `lib/integrations/interface.ts`. The system calls `getContext()` before every AI response. New integrations register themselves in `lib/integrations/registry.ts`. Nothing else changes.

### 5. OpenAPI on Every Route
Every API route MUST be documented with an OpenAPI schema using Zod. This is the contract for the future — it's what makes the background worker swappable. Use `openapi-zod-adapter` or equivalent. Scalar UI at `/api/docs` should always reflect the current API.

```typescript
// Every route gets a schema
const CreateTaskSchema = z.object({
  title: z.string().min(1).openapi({ description: 'Task title' }),
  status: TaskStatusSchema,
});
```

### 6. No Direct Styling — Tokens Only
Never hardcode a color, spacing value, or shadow. All values come from `tokens.ts` and CSS custom properties defined in `globals.css`. If a value isn't in the token system, add it to the token system first.

```typescript
// CORRECT — uses token
className="bg-[var(--bg-primary)] text-[var(--text-primary)]"

// NEVER
className="bg-white text-gray-900" // hardcoded, breaks theming
```

---

## Design Philosophy — Read This Carefully

ARIA's UI should feel like **Linear meets Notion** — refined, intentional, fast. It is a professional tool for a technically sophisticated user. It should feel like something worth paying for, not something AI generated in an afternoon.

### The Two Surfaces

**Chat (default landing page)**
- This is where users spend most of their time
- Should feel fast, focused, and contextually aware
- Not a blank prompt box — there is a context strip at the top showing task state, next meeting, unread count
- AI messages can render as rich cards (task lists, calendar blocks, email summaries) — not just text
- Input is sticky at the bottom. CMD+Enter to send. Slash commands: `/task`, `/brief`, `/email`

**Dashboard (secondary)**
- State of the user's world at a glance
- Top row: today's date, next meeting card, task counts by status
- Kanban board: Backlog / Up Next / In Progress / Done
- Click task card → slide-in detail panel (don't navigate away)
- Right sidebar (collapsible): recent emails, upcoming calendar events

### Typography
- Use a distinctive Google Font pairing — a characterful display font for headings, a refined body font for everything else
- **Never use Inter, Roboto, Arial, or system fonts** — these are the hallmark of generic AI-generated UI
- Typographic scale should carry the visual quality. Get this right before touching color.
- Font imports go in `app/layout.tsx` via `next/font/google`

### Color
- Establish a full token palette in `tokens.ts` and `globals.css` before building any component
- One strong primary, one accent used sparingly (primary actions, active states, AI-generated content markers)
- Status colors are semantic only: success, warning, danger — not decorative
- Never use purple gradients on white. Never use the default Tailwind blue. Make a deliberate choice.

### Motion
- Subtle and purposeful — not decorative
- Route transitions: smooth fade or slide
- Message appear: stagger in from bottom
- Notification slide-in from top-right
- Task card drag: shadow elevation on pickup
- Use Framer Motion (already in stack) for complex sequences. CSS transitions for simple hover/focus states.
- **One well-orchestrated moment is better than scattered micro-interactions everywhere**

### Spacing & Layout
- Generous negative space in the chat view — messages should breathe
- Dashboard is data-dense but not noisy — use visual grouping, not borders everywhere
- Sidebar nav: icon + label, active state with accent background pill
- Consistent 8px base grid throughout

### What NOT to Do
- No purple gradients on white backgrounds
- No generic card-grid layouts that look like every other SaaS dashboard
- No loading spinners that block the entire page — use skeleton states
- No modal-heavy flows — prefer slide-in panels and inline interactions
- No toast notifications for everything — use the notification system
- No AI chatbot bubble aesthetic — ARIA's chat should feel like a native messaging app, not a support widget

---

## File Structure Conventions

```
app/
  (auth)/           — Login, signup. Minimal UI, auth-focused.
  (shell)/          — All authenticated routes. Shell layout wraps everything.
    chat/           — Default route. Chat interface.
    dashboard/      — Kanban + overview.
    tasks/          — Full task management.
    notifications/  — Notification center.
    settings/       — Integrations, preferences, AI memory.
  api/              — All API routes. Every route has OpenAPI schema.

components/
  chat/             — MessageBubble, ContextStrip, InputBar, RichCard
  dashboard/        — KanbanBoard, TaskCard, CalendarStrip, EmailSnippet
  ui/               — Design system primitives only. No business logic.
  notifications/    — NotificationBell, NotificationItem, NotificationDrawer

lib/
  ai/               — provider.ts (interface), anthropic.ts (impl), context-builder.ts
  integrations/     — interface.ts, registry.ts, gmail/, google-calendar/
  notifications/    — channel.ts (interface), browser.ts, sms.ts (optional)
  jobs/             — All Inngest job definitions
  db/               — schema.ts (Drizzle), migrations/, queries/
  auth/             — Better Auth config
  crypto/           — Token encryption utils
```

When adding a new file, place it in the correct location. Don't create new top-level directories without a reason documented in a comment.

---

## Background Jobs — Key Rules

- All jobs are per-user. Inngest fans out to active users.
- Gmail and Calendar poll every 2-3 minutes via incremental sync tokens
- Never store raw email content — store only what the AI needs for context (subject, sender, snippet, labels)
- Relevance evaluation fires on `gmail.changed` and `calendar.changed` events — scores against active tasks and contacts
- Morning brief runs at 7am in the user's timezone — not UTC
- Jobs log to `job_log` table with duration and error. Surface "last synced X min ago" in the UI top bar.
- If a job errors, log it and continue — never crash the worker process

---

## Security Checklist

Before shipping any feature, verify:

- [ ] All DB queries scoped by `session.user.id`
- [ ] No sensitive data in logs (no tokens, no email content, no PII)
- [ ] OAuth tokens encrypted before write, decrypted only server-side
- [ ] All API routes validate session before doing anything
- [ ] No secrets in code — all credentials via `.env.local`
- [ ] `.env.example` updated with any new required env vars (no values, just keys)

---

## Commit Conventions

```
feat: add morning brief job
fix: scope task query by userId
chore: add OpenAPI schema to /api/tasks
design: establish color token system
refactor: extract context builder to lib/ai
```

Keep commits small and focused. One thing per commit.

---

## When You're Unsure

1. Check `docs/architecture.md` — the answer is probably there
2. Follow the existing pattern in the codebase — consistency over cleverness
3. When adding a new integration, implement the `Integration` interface — don't invent a new pattern
4. When adding a new UI component, use design tokens — don't hardcode values
5. When calling the AI, go through `lib/ai/provider.ts` — always

---

## Design Context (from .impeccable.md)

### Brand Personality
**Thoughtful, proactive, subtle.** ARIA notices things before you do. When it speaks, it has something worth saying. It doesn't hedge, doesn't over-explain, doesn't celebrate itself.

### Emotional Goal
**Sharp, focused.** Zero friction. Feels like an extension of your brain, not a tool you're operating.

### References
Superhuman (clean, fast, expensive-feeling), Arc Browser (opinionated, high craft), Linear + Notion (refined SaaS, data-dense without noise).

### Color Palette
- Accent: `#0D9488` (teal-600) — sparingly: actions, active states, AI markers
- Dark bg: `#0C1117` primary / `#141B24` surface
- Light bg: `#F8FAFC` primary / `#F1F5F9` surface
- Text (light): `#0F172A` primary / `#64748B` muted
- Text (dark): `#E2E8F0` primary / `#94A3B8` muted
- Border (light): `#E2E8F0` / (dark): `#1E293B`
- Status: success `#10B981`, warning `#F59E0B`, danger `#EF4444`

### Typography
- **Display / Headings**: Instrument Serif
- **UI / Body**: DM Sans
- **Mono**: JetBrains Mono

### Design Principles
1. **The chrome recedes, the content leads.** If the nav frame is the most visually prominent thing, something is wrong.
2. **Speed is a design value.** Transitions under 200ms. Skeleton states, never blocking spinners.
3. **Earned emphasis.** Accent color appears rarely — when it does, it means something.
4. **ARIA surfaces, the user decides.** Proactive content is present at the edge of attention, never demanding it.
5. **Type over decoration.** Visual hierarchy from font weight and spacing — not borders, shadows, or gradients.

---

## The Standard to Hold

This project should feel like it was built by a senior engineer who cares deeply about craft — both in the code and in the UI. The architecture is deliberate. The design is deliberate. Every decision has a reason.

If something feels like a shortcut, it probably is. Do it right.
