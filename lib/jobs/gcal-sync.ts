/**
 * Google Calendar sync job.
 *
 * Runs every 3 minutes. Fetches all users with an active Google connection
 * and syncs their calendar events incrementally.
 *
 * Per-user errors are caught and logged — one user failing never crashes others.
 * The connection is marked as "error" in the DB so the settings UI can surface it.
 */

import { and, eq } from "drizzle-orm";
import { inngest } from "./inngest";
import { db } from "@/lib/db/client";
import { integrationConnections } from "@/lib/db/schema";
import { markConnectionError } from "@/lib/db/queries/integrations";
import { gcalIntegration } from "@/lib/integrations/google-calendar";

export const gcalSyncJob = inngest.createFunction(
  {
    id: "gcal-sync",
    name: "Google Calendar Sync",
    triggers: [{ cron: "*/10 * * * *" }],
    // Prevent overlapping runs if one is still processing when the next fires
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    // Inngest serializes step results as JSON, so Date fields become strings.
    // Coerce tokenExpiresAt back to Date before passing to sync().
    const rawConnections = await step.run("fetch-active-google-connections", async () => {
      return db.query.integrationConnections.findMany({
        where: and(
          eq(integrationConnections.provider, "google"),
          eq(integrationConnections.status, "active")
        ),
      });
    });

    const connections = rawConnections.map((c) => ({
      ...c,
      tokenExpiresAt: c.tokenExpiresAt ? new Date(c.tokenExpiresAt as unknown as string) : null,
      syncCursors: (c.syncCursors ?? {}) as Record<string, string>,
      metadata: (c.metadata ?? {}) as Record<string, unknown>,
    }));

    console.info(`[gcal-sync] Syncing ${connections.length} connection(s)`);

    await Promise.allSettled(
      connections.map((conn) =>
        step.run(`sync-${conn.userId}`, async () => {
          try {
            await gcalIntegration.sync(conn);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`[gcal-sync] Failed for user ${conn.userId}: ${message}`);
            await markConnectionError(conn.id, message);
          }
        })
      )
    );
  }
);
