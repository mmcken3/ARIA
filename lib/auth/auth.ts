import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

function getAllowedEmail(): string {
  const email = process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("ALLOWED_EMAIL environment variable is not set.");
  return email;
}

function assertAuthSecret(): void {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32");
  }
}

function assertAllowedEmail(email: string | null | undefined): void {
  if (!email || email.toLowerCase() !== getAllowedEmail().toLowerCase()) {
    // Intentionally vague — don't reveal what the allowed address is
    throw new Error("Access denied.");
  }
}

assertAuthSecret();

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
        // Gmail + Calendar scopes added here later when integrations are built
      ],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days — limits hijack blast radius for public deployments
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day (sliding within the 7-day window)
  },
  databaseHooks: {
    user: {
      create: {
        // Gate 1 — block account creation for any non-allowlisted email.
        // This is the primary lock: no user row can ever be written for an
        // unauthorized address, so no downstream session is possible.
        before: async (user) => {
          assertAllowedEmail(user.email);
        },
      },
    },
    session: {
      create: {
        // Gate 2 — block session creation independently of user creation.
        // Covers the edge case where a user row already exists in the DB
        // (e.g. inserted manually) for an address other than the allowed one.
        // Both gates must pass — neither alone is sufficient.
        before: async (session) => {
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, session.userId),
            columns: { email: true },
          });
          assertAllowedEmail(user?.email);
        },
      },
    },
  },
});

export type Auth = typeof auth;
