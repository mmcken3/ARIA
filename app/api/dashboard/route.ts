/**
 * GET /api/dashboard
 *
 * Returns the data needed for the dashboard integration panels:
 *   - calendar.connected + next 5 upcoming events
 *   - email.connected + top 4 emails by relevance (score ≥ 0.3)
 *
 * Only returns data for connected + active integrations.
 * Both pieces are scoped strictly to session.user.id.
 */

import { getSession, unauthorized } from "@/lib/api/session";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationConnections } from "@/lib/db/schema";
import { getUpcomingEvents, getRecentEmails } from "@/lib/db/queries/integrations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const userId = session.user.id;

  const conn = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.userId, userId),
      eq(integrationConnections.status, "active")
    ),
    columns: { scopes: true },
  });

  const hasCalendar = !!conn && conn.scopes.includes("calendar");
  const hasGmail    = !!conn && conn.scopes.includes("gmail");

  const [rawEvents, rawEmails] = await Promise.all([
    hasCalendar ? getUpcomingEvents(userId, { limit: 5 }) : Promise.resolve([]),
    hasGmail    ? getRecentEmails(userId, { limit: 20 })  : Promise.resolve([]),
  ]);

  const events = rawEvents.map((e) => ({
    id:            e.id,
    title:         e.title,
    startAt:       e.startAt.toISOString(),
    endAt:         e.endAt.toISOString(),
    isAllDay:      e.isAllDay,
    location:      e.location ?? null,
    attendeeCount: (e.attendees ?? []).length,
    status:        e.status,
  }));

  // Top 4 by relevance, score ≥ 0.3 — lower threshold than AI context (0.4)
  // so the dashboard shows a bit more without flooding it
  const emails = rawEmails
    .filter((m) => (m.relevanceScore ?? 0) >= 0.3)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, 4)
    .map((m) => ({
      id:             m.id,
      fromName:       m.fromName ?? null,
      fromAddress:    m.fromAddress,
      subject:        m.subject ?? "(No subject)",
      snippet:        m.snippet ?? null,
      isRead:         m.isRead,
      relevanceScore: m.relevanceScore ?? 0,
      receivedAt:     m.receivedAt.toISOString(),
    }));

  return Response.json({
    calendar: { connected: hasCalendar, events },
    email:    { connected: hasGmail, messages: emails },
  });
}
