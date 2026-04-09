# ARIA

*Currently a Work In Progress, but making solid headway and ready for use soon!*

A self-hosted, open source personal AI operating system. ARIA combines a persistent AI with deep integrations across email, calendar, and tasks — surfacing a unified view of your work and taking action on your behalf, proactively and on demand.

---

## What it does

- **Chat-first interface** — Talk to ARIA about your work. It already knows your tasks, remembered context, and (once connected) your inbox and calendar.
- **Task management** — Kanban board and list view with projects, priorities, and due dates. ARIA can create and update tasks directly from chat.
- **Persistent memory** — ARIA remembers facts across sessions. You can view and delete what it knows in Settings.
- **Proactive layer** — Background jobs (coming soon) poll Gmail and Calendar and surface what matters before you ask.

## Stack

Next.js 16 · TypeScript · Better Auth · Neon PostgreSQL · Drizzle ORM · Anthropic Claude · Tailwind CSS

## Getting started

See [docs/setup.md](docs/setup.md) for full setup instructions including environment variables, database setup, and Vercel deployment.

## Architecture

See [docs/architecture.md](docs/architecture.md) for a full breakdown of what's built, what's planned, and the patterns used throughout the codebase.

## API

OpenAPI 3.1 spec and interactive Scalar UI available at `/api/docs` when running locally.
