import { eq, and, asc, desc, gte, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationConnections, emailMessages, calendarEvents } from "@/lib/db/schema";
import { encryptToken, decryptToken } from "@/lib/crypto/tokens";
// ─── Types ────────────────────────────────────────────────────────────────────

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// ─── Connections ──────────────────────────────────────────────────────────────

/**
 * Upsert an integration connection with encrypted tokens.
 * Called from the Better Auth account.create/update hook — never from routes.
 *
 * Tokens are encrypted with AES-256-GCM before write.
 * Returns the connection ID.
 */
export async function upsertIntegrationConnection(params: {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt?: Date | null;
  scopes: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const existing = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.userId, params.userId),
      eq(integrationConnections.provider, params.provider)
    ),
    columns: { id: true },
  });

  const encrypted = {
    accessTokenEnc: encryptToken(params.accessToken),
    refreshTokenEnc: encryptToken(params.refreshToken),
    tokenExpiresAt: params.tokenExpiresAt ?? null,
    scopes: params.scopes,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(integrationConnections)
      .set({ ...encrypted, status: "active", lastError: null })
      .where(eq(integrationConnections.id, existing.id));
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(integrationConnections).values({
    id,
    userId: params.userId,
    provider: params.provider,
    metadata: params.metadata ?? {},
    ...encrypted,
  });
  return id;
}

/** Get a connection and return it with decrypted tokens, ready for API calls. */
export async function getConnectionWithTokens(
  userId: string,
  provider: string
): Promise<{ connection: IntegrationConnection; accessToken: string; refreshToken: string } | null> {
  const connection = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.userId, userId),
      eq(integrationConnections.provider, provider),
      eq(integrationConnections.status, "active")
    ),
  });
  if (!connection) return null;

  return {
    connection,
    accessToken: decryptToken(connection.accessTokenEnc),
    refreshToken: decryptToken(connection.refreshTokenEnc),
  };
}

/** Mark a connection as errored so the UI can surface it. */
export async function markConnectionError(connectionId: string, error: string): Promise<void> {
  await db
    .update(integrationConnections)
    .set({ status: "error", lastError: error, updatedAt: new Date() })
    .where(eq(integrationConnections.id, connectionId));
}

/** Update sync cursor for a specific feature on a connection. */
export async function updateSyncCursor(
  connectionId: string,
  feature: string,
  cursor: string
): Promise<void> {
  const conn = await db.query.integrationConnections.findFirst({
    where: eq(integrationConnections.id, connectionId),
    columns: { syncCursors: true },
  });
  if (!conn) return;

  const updated = { ...(conn.syncCursors ?? {}), [feature]: cursor };
  await db
    .update(integrationConnections)
    .set({ syncCursors: updated, lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationConnections.id, connectionId));
}

// ─── Email Messages ───────────────────────────────────────────────────────────

export type UpsertEmailMessage = Omit<
  typeof emailMessages.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

/** Upsert an email message by externalId. */
export async function upsertEmailMessage(msg: UpsertEmailMessage): Promise<void> {
  const existing = await db.query.emailMessages.findFirst({
    where: and(
      eq(emailMessages.userId, msg.userId),
      eq(emailMessages.externalId, msg.externalId)
    ),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(emailMessages)
      .set({ ...msg, updatedAt: new Date() })
      .where(eq(emailMessages.id, existing.id));
  } else {
    await db.insert(emailMessages).values({ id: crypto.randomUUID(), ...msg });
  }
}

/** Get recent unread emails for AI context. Limited to avoid bloating the prompt. */
export async function getRecentEmails(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {}
): Promise<EmailMessage[]> {
  const { limit = 10, unreadOnly = false } = opts;

  const conditions = [eq(emailMessages.userId, userId)];
  if (unreadOnly) conditions.push(eq(emailMessages.isRead, false));

  return db.query.emailMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(emailMessages.receivedAt)],
    limit,
  });
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export type UpsertCalendarEvent = Omit<
  typeof calendarEvents.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

/** Upsert a calendar event by externalId. */
export async function upsertCalendarEvent(event: UpsertCalendarEvent): Promise<void> {
  const existing = await db.query.calendarEvents.findFirst({
    where: and(
      eq(calendarEvents.userId, event.userId),
      eq(calendarEvents.externalId, event.externalId)
    ),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(calendarEvents.id, existing.id));
  } else {
    await db.insert(calendarEvents).values({ id: crypto.randomUUID(), ...event });
  }
}

/** Get upcoming events for AI context, ordered soonest first. */
export async function getUpcomingEvents(
  userId: string,
  opts: { limit?: number; from?: Date } = {}
): Promise<CalendarEvent[]> {
  const { limit = 10, from = new Date() } = opts;

  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.startAt, from),
      ne(calendarEvents.status, "cancelled")
    ),
    orderBy: [asc(calendarEvents.startAt)],
    limit,
  });
}
