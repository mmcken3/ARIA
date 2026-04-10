/**
 * GET /api/integrations/status
 *
 * Returns provider-grouped connection status for the settings UI.
 * Each provider has one connection row; features are derived from
 * which scopes are present on that connection.
 */

import { getSession, unauthorized } from "@/lib/api/session";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationConnections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Source of truth for what providers and features the app supports.
// Adding a new integration: add an entry here.
const PROVIDERS = [
  {
    provider: "google",
    displayName: "Google",
    features: [
      { feature: "gcal", displayName: "Google Calendar", requiredScope: "calendar" },
      { feature: "gmail", displayName: "Gmail", requiredScope: "gmail" },
    ],
  },
] as const;

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const connections = await db.query.integrationConnections.findMany({
    where: eq(integrationConnections.userId, session.user.id),
    columns: {
      provider: true,
      scopes: true,
      lastSyncedAt: true,
      status: true,
    },
  });

  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const result = PROVIDERS.map(({ provider, displayName, features }) => {
    const conn = byProvider.get(provider);
    const connected = !!conn && conn.status === "active";
    return {
      provider,
      displayName,
      connected,
      lastSyncedAt: conn?.lastSyncedAt ?? null,
      features: features.map(({ feature, displayName: featureDisplayName, requiredScope }) => ({
        feature,
        displayName: featureDisplayName,
        hasScope: connected && !!conn?.scopes.includes(requiredScope),
      })),
    };
  });

  return Response.json({ connections: result });
}
