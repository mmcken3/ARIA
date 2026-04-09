# ARIA — Setup Guide

## Prerequisites

- Node.js 20.9+
- A [Neon](https://neon.tech) PostgreSQL database
- A Google Cloud project with OAuth 2.0 credentials
- An [Anthropic](https://console.anthropic.com) API key

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/mmcken3/aria.git
cd aria
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `ALLOWED_EMAIL` | The single Gmail address allowed to sign in |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | Same |
| `BETTER_AUTH_SECRET` | Random 32-byte hex — `openssl rand -hex 32` |
| `DATABASE_URL` | Neon connection string (`postgresql://...`) |
| `ANTHROPIC_API_KEY` | From Anthropic Console |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Set up the database

ARIA uses Drizzle's schema push — no migration files, just push the schema directly:

```bash
npx drizzle-kit push
```

This creates all tables in your Neon database. Re-run any time you change `lib/db/schema.ts`.

### 4. Configure Google OAuth

In Google Cloud Console:
1. Create an OAuth 2.0 client (Web application)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy client ID and secret to `.env.local`

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git add -A
git commit -m "feat: initial deployment"
git push origin main
```

### 2. Create Vercel project

Import the repository at [vercel.com/new](https://vercel.com/new). Framework: Next.js (auto-detected).

### 3. Set environment variables

Add all variables from `.env.example` in the Vercel dashboard. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://aria.yourdomain.com`).

### 4. Update Google OAuth redirect

In Google Cloud Console, add your production redirect URI:
```
https://aria.yourdomain.com/api/auth/callback/google
```

### 5. Deploy

Vercel deploys automatically on every push to `main`.

---

## Useful Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build — run before pushing
npx drizzle-kit push # Push schema changes to Neon
npx drizzle-kit studio # Browse your database in a local UI
```

---

## API Documentation

Live OpenAPI spec and Scalar UI: [localhost:3000/api/docs](http://localhost:3000/api/docs)

All API routes require a session cookie set by Better Auth after Google OAuth sign-in.
