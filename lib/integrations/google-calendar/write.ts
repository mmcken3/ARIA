/**
 * Google Calendar write operations.
 *
 * Create, update, and delete events via the Google Calendar API.
 * Always goes through getConnectionWithTokens → googleFetch so token
 * refresh is handled automatically.
 */

import { getConnectionWithTokens, upsertCalendarEvent } from "@/lib/db/queries/integrations";
import { googleFetch } from "@/lib/integrations/google/client";
import { db } from "@/lib/db/client";
import { calendarEvents } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  title: string;
  startAt: string;   // ISO 8601
  endAt: string;     // ISO 8601
  isAllDay?: boolean;
  description?: string;
  location?: string;
  attendees?: string[]; // email addresses — Google sends invites automatically
}

// Minimal shape of what Google returns for a calendar event
interface GCalEventResponse {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  status: string;
  htmlLink?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGCalBody(input: CalendarEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: input.title,
  };

  if (input.isAllDay) {
    // All-day events use date (YYYY-MM-DD), not dateTime
    const startDate = input.startAt.slice(0, 10);
    const endDate = input.endAt.slice(0, 10);
    body.start = { date: startDate };
    body.end   = { date: endDate };
  } else {
    body.start = { dateTime: input.startAt };
    body.end   = { dateTime: input.endAt };
  }

  if (input.description)       body.description = input.description;
  if (input.location)          body.location    = input.location;
  if (input.attendees?.length) body.attendees   = input.attendees.map((email) => ({ email }));

  return body;
}

async function getConnection(userId: string) {
  const result = await getConnectionWithTokens(userId, "google");
  if (!result) throw new Error("Google Calendar is not connected");
  return result.connection;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCalendarEvent(
  userId: string,
  input: CalendarEventInput
): Promise<{ externalId: string; title: string; startAt: string; htmlLink?: string }> {
  const connection = await getConnection(userId);

  const res = await googleFetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    connection,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGCalBody(input)),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar create failed: ${res.status} ${err}`);
  }

  const event: GCalEventResponse = await res.json();

  // Persist to local DB so it shows up in context immediately
  const startAt = new Date(event.start.dateTime ?? event.start.date!);
  const endAt   = new Date(event.end.dateTime   ?? event.end.date!);
  await upsertCalendarEvent({
    userId,
    connectionId: connection.id,
    externalId:   event.id,
    calendarId:   "primary",
    title:        event.summary ?? input.title,
    descriptionSnippet: input.description?.slice(0, 200) ?? null,
    location:     event.location ?? null,
    startAt,
    endAt,
    isAllDay:     input.isAllDay ?? false,
    status:       "confirmed",
    myResponse:   "accepted",
    attendees:    [],
    metadata:     {},
  });

  return {
    externalId: event.id,
    title:      event.summary ?? input.title,
    startAt:    event.start.dateTime ?? event.start.date!,
    htmlLink:   event.htmlLink,
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCalendarEvent(
  userId: string,
  externalId: string,
  changes: Partial<CalendarEventInput>
): Promise<{ externalId: string; title: string; startAt: string }> {
  const connection = await getConnection(userId);

  // PATCH only sends the fields that changed
  const patch: Record<string, unknown> = {};
  if (changes.title)       patch.summary  = changes.title;
  if (changes.description !== undefined) patch.description = changes.description;
  if (changes.location    !== undefined) patch.location    = changes.location;

  if (changes.attendees !== undefined) {
    patch.attendees = changes.attendees.map((email) => ({ email }));
  }

  if (changes.startAt || changes.endAt) {
    const isAllDay = changes.isAllDay ?? false;
    if (isAllDay) {
      if (changes.startAt) patch.start = { date: changes.startAt.slice(0, 10) };
      if (changes.endAt)   patch.end   = { date: changes.endAt.slice(0, 10) };
    } else {
      if (changes.startAt) patch.start = { dateTime: changes.startAt };
      if (changes.endAt)   patch.end   = { dateTime: changes.endAt };
    }
  }

  const res = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`,
    connection,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar update failed: ${res.status} ${err}`);
  }

  const event: GCalEventResponse = await res.json();

  // Refresh local DB
  const startAt = new Date(event.start.dateTime ?? event.start.date!);
  const endAt   = new Date(event.end.dateTime   ?? event.end.date!);
  await upsertCalendarEvent({
    userId,
    connectionId: connection.id,
    externalId:   event.id,
    calendarId:   "primary",
    title:        event.summary ?? "",
    descriptionSnippet: (event.description ?? "").slice(0, 200) || null,
    location:     event.location ?? null,
    startAt,
    endAt,
    isAllDay:     !event.start.dateTime,
    status:       "confirmed",
    myResponse:   null,
    attendees:    [],
    metadata:     {},
  });

  return {
    externalId: event.id,
    title:      event.summary ?? "",
    startAt:    event.start.dateTime ?? event.start.date!,
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCalendarEvent(
  userId: string,
  externalId: string
): Promise<{ deleted: boolean }> {
  const connection = await getConnection(userId);

  const res = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`,
    connection,
    { method: "DELETE" }
  );

  // 204 = success, 404 = already gone — both are fine
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Google Calendar delete failed: ${res.status} ${err}`);
  }

  // Remove from local DB
  await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.externalId, externalId)
      )
    );

  return { deleted: true };
}
