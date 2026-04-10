/**
 * Google Calendar integration.
 *
 * Syncs events from the user's primary calendar into calendar_events.
 * Uses incremental sync (nextSyncToken) after the first full pull.
 * If the sync token expires (HTTP 410), falls back to a full re-sync automatically.
 *
 * Register via: registerIntegration(gcalIntegration)
 */

import type { Integration, IntegrationConnection, IntegrationContext } from "@/lib/integrations/interface";
import { googleFetch } from "@/lib/integrations/google/client";
import {
  upsertCalendarEvent,
  getUpcomingEvents,
  updateSyncCursor,
  markConnectionError,
} from "@/lib/db/queries/integrations";

// ─── Google Calendar API types ────────────────────────────────────────────────

interface GCalDateTime {
  dateTime?: string; // ISO 8601, present for timed events
  date?: string;     // YYYY-MM-DD, present for all-day events
  timeZone?: string;
}

interface GCalAttendee {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
  self?: boolean;
}

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GCalDateTime;
  end: GCalDateTime;
  status: "confirmed" | "tentative" | "cancelled";
  attendees?: GCalAttendee[];
}

interface GCalEventsResponse {
  items?: GCalEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const eventStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((eventStart.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(startAt: Date, endAt: Date): string | null {
  const mins = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function fetchAndUpsertEvents(
  connection: IntegrationConnection,
  url: string
): Promise<string | null> {
  const res = await googleFetch(url, connection);

  // Sync token expired — caller should retry with a full sync
  if (res.status === 410) return "SYNC_TOKEN_EXPIRED";

  if (!res.ok) {
    throw new Error(`Google Calendar API error: HTTP ${res.status}`);
  }

  const data: GCalEventsResponse = await res.json();

  for (const event of data.items ?? []) {
    if (!event.start.dateTime && !event.start.date) continue;

    const startAt = new Date(event.start.dateTime ?? event.start.date!);
    const endAt = new Date(event.end.dateTime ?? event.end.date!);
    const isAllDay = !event.start.dateTime;
    const selfAttendee = event.attendees?.find((a) => a.self);

    await upsertCalendarEvent({
      userId: connection.userId,
      connectionId: connection.id,
      externalId: event.id,
      calendarId: "primary",
      title: event.summary ?? "(No title)",
      descriptionSnippet: event.description
        ? event.description.slice(0, 200)
        : null,
      location: event.location ?? null,
      startAt,
      endAt,
      isAllDay,
      status: event.status ?? "confirmed",
      myResponse: selfAttendee?.responseStatus ?? null,
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email,
        name: a.displayName,
        responseStatus: a.responseStatus,
      })),
      metadata: {},
    });
  }

  // Handle pagination
  if (data.nextPageToken) {
    const pagedUrl = `${url}&pageToken=${data.nextPageToken}`;
    await fetchAndUpsertEvents(connection, pagedUrl);
    return null; // nextSyncToken comes from the last page, skip here
  }

  return data.nextSyncToken ?? null;
}

// ─── Integration implementation ───────────────────────────────────────────────

export const gcalIntegration: Integration = {
  provider: "google",
  feature: "gcal",
  displayName: "Google Calendar",
  requiredScopes: ["https://www.googleapis.com/auth/calendar"],

  async sync(connection: IntegrationConnection): Promise<void> {
    const existingSyncToken = connection.syncCursors?.gcal;

    let url: string;
    if (existingSyncToken) {
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?syncToken=${existingSyncToken}`;
    } else {
      // Full sync: pull events from now through 60 days out
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      url = [
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        `?timeMin=${timeMin}`,
        `&timeMax=${timeMax}`,
        "&maxResults=250",
        "&singleEvents=true",
        "&orderBy=startTime",
      ].join("");
    }

    const result = await fetchAndUpsertEvents(connection, url);

    if (result === "SYNC_TOKEN_EXPIRED") {
      // Clear stale cursor and redo as full sync
      await updateSyncCursor(connection.id, "gcal", "");
      await this.sync({ ...connection, syncCursors: {} });
      return;
    }

    if (result) {
      await updateSyncCursor(connection.id, "gcal", result);
    }
  },

  async getContext(userId: string): Promise<IntegrationContext | null> {
    const events = await getUpcomingEvents(userId, { limit: 10 });

    if (events.length === 0) {
      return {
        feature: "gcal",
        summary: "No upcoming calendar events in the next 60 days.",
      };
    }

    const lines = events.map((e) => {
      const dateStr = formatEventDate(e.startAt);
      const timeStr = e.isAllDay ? "all day" : formatEventTime(e.startAt);
      const duration = formatDuration(e.startAt, e.endAt);
      const attendees = e.attendees as Array<{ email: string; name?: string }> | null;
      const attendeeCount = attendees?.length ?? 0;

      const when = e.isAllDay ? `${dateStr} (all day)` : `${dateStr} at ${timeStr}`;
      const parts: string[] = [`${when} — ${e.title}`];
      if (duration && !e.isAllDay) parts.push(`(${duration})`);
      if (attendeeCount > 1) parts.push(`· ${attendeeCount} attendees`);
      if (e.location) parts.push(`· ${e.location}`);

      return parts.join(" ");
    });

    return {
      feature: "gcal",
      summary: `Upcoming calendar events:\n${lines.map((l) => `- ${l}`).join("\n")}`,
    };
  },
};
