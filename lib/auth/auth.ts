import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

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

// Build mode-specific database hooks.
// self-hosted: dual-gate email allowlist on user.create and session.create
// cloud:       no allowlist — subscription check will be added here when billing is built
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
      scopes: [
        "openid",
        "email",
        "profile",
        // Gmail + Calendar scopes added here when integrations are built
      ],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // sliding refresh after 1 day
  },
  databaseHooks,
});

export type Auth = typeof auth;
