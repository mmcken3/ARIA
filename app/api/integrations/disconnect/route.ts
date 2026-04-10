/**
 * POST /api/integrations/disconnect
 *
 * Marks an integration connection as disconnected.
 * Body: { provider: "google" }
 *
 * This disables background sync for all features on that provider
 * until the user reconnects via /api/integrations/connect.
 */

import { getSession, unauthorized } from "@/lib/api/session";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationConnections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { provider } = body as { provider?: string };

  const KNOWN_PROVIDERS = new Set(["google"]);
  if (!provider || !KNOWN_PROVIDERS.has(provider)) {
    return Response.json({ error: "provider required" }, { status: 400 });
  }

  await db
    .update(integrationConnections)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(
      and(
        eq(integrationConnections.userId, session.user.id),
        eq(integrationConnections.provider, provider)
      )
    );

  return Response.json({ ok: true });
}
