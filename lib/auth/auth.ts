import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { upsertIntegrationConnection } from "@/lib/db/queries/integrations";

// ─── Mode ─────────────────────────────────────────────────────────────────────
// self-hosted: single-user, gated by ALLOWED_EMAIL env var (default)
// cloud:       open registration, subscription gating applied at billing layer
export type AriaMode = "self-hosted" | "cloud";

export function getMode(): AriaMode {
  const mode = process.env.ARIA_MODE;
  if (mode === "cloud") return "cloud";
  return "self-hosted"; // safe default — never accidentally open
}

// ─── Self-hosted auth helpers ─────────────────────────────────────────────────

function getAllowedEmail(): string {
  const email = process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("ALLOWED_EMAIL must be set in self-hosted mode.");
  return email;
}

function assertAllowedEmail(email: string | null | undefined): void {
  if (!email || email.toLowerCase() !== getAllowedEmail().toLowerCase()) {
    // Intentionally vague — don't reveal what the allowed address is
    throw new Error("Access denied.");
  }
}

// ─── Startup validation ───────────────────────────────────────────────────────

function assertAuthSecret(): void {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32");
  }
}

assertAuthSecret();

// ─── Auth config ──────────────────────────────────────────────────────────────

const mode = getMode();

// ─── Token capture helper ─────────────────────────────────────────────────────
// Called in session.create.after — by then Better Auth has already written the
// OAuth tokens to the accounts table, so we can read and encrypt them.
// Better Auth does not support account.create/update hooks, only user + session.

async function captureGoogleTokensForUser(userId: string): Promise<void> {
  try {
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.providerId, "google")
      ),
    });
    if (!account?.accessToken || !account.refreshToken) return;
    await upsertIntegrationConnection({
      userId,
      provider: "google",
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.accessTokenExpiresAt ?? null,
      scopes: account.scope ?? "",
    });
  } catch (err) {
    // Log but never crash the auth flow
    console.error("[auth] Failed to capture Google tokens into integration_connections:", err);
  }
}

// ─── Database hooks ───────────────────────────────────────────────────────────
// self-hosted: dual-gate email allowlist on user.create and session.create
// cloud:       no allowlist — subscription check will be added here when billing is built
//
// session.create.after fires on every sign-in. We use it to sync the Google
// OAuth tokens from Better Auth's accounts table into integration_connections
// (encrypted). This is the only supported hook that reliably fires post-OAuth.

const databaseHooks = mode === "self-hosted"
  ? {
      user: {
        create: {
          before: async (user: { email: string }) => {
            assertAllowedEmail(user.email);
          },
        },
      },
      session: {
        create: {
          before: async (session: { userId: string }) => {
            const user = await db.query.users.findFirst({
              where: eq(schema.users.id, session.userId),
              columns: { email: true },
            });
            assertAllowedEmail(user?.email);
          },
          after: async (session: { userId: string }) => {
            await captureGoogleTokensForUser(session.userId);
          },
        },
      },
    }
  : {
      // cloud mode — hooks stubbed for future subscription gating
      user: {
        create: {
          before: async (_user: { email: string }) => {
            // TODO: enforce subscription check when billing is built
          },
        },
      },
      session: {
        create: {
          after: async (session: { userId: string }) => {
            await captureGoogleTokensForUser(session.userId);
          },
        },
      },
    };

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        // Gmail — read-only access to messages and metadata
        "https://www.googleapis.com/auth/gmail.readonly",
        // Calendar — read/write for event creation (block time, etc.)
        "https://www.googleapis.com/auth/calendar",
      ],
      // Required for Google to issue a refresh token
      accessType: "offline",
      // Force consent screen every time so scopes are always granted
      prompt: "consent",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // sliding refresh after 1 day
  },
  databaseHooks,
});

export type Auth = typeof auth;
