/**
 * Gmail integration.
 *
 * Syncs a filtered, scored subset of the user's inbox into email_messages.
 * Incremental sync via Gmail history API after the first full pull.
 *
 * Filtering rules (never store):
 *   - Any message without INBOX label
 *   - Any message with: CATEGORY_PROMOTIONS, CATEGORY_SOCIAL,
 *     CATEGORY_UPDATES, CATEGORY_FORUMS, SPAM
 *
 * Volume caps:
 *   - Only messages received within the last 7 days
 *   - Hard cap: 50 rows per user — oldest evicted on overflow
 *
 * Relevance scoring (0–1, heuristic, no LLM call):
 *   - IMPORTANT label:  +0.4
 *   - STARRED label:    +0.3
 *   - Unread:           +0.1
 *   - High-signal subject keywords: +0.15
 *   - Non-consumer sender domain:   +0.05
 */

import type { Integration, IntegrationConnection, IntegrationContext } from "@/lib/integrations/interface";
import { googleFetch } from "@/lib/integrations/google/client";
import {
  upsertEmailMessage,
  getRecentEmails,
  updateSyncCursor,
  markConnectionError,
} from "@/lib/db/queries/integrations";
import { db } from "@/lib/db/client";
import { emailMessages } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBUG = process.env.GMAIL_DEBUG === "1";
const log = {
  info:  (...args: unknown[]) => DEBUG && console.info("[gmail]", ...args),
  warn:  (...args: unknown[]) => console.warn("[gmail]", ...args),  // warnings always on
};

// Always skip — no signal value regardless of other labels.
// CATEGORY_SOCIAL is unconditional: no social platform notification belongs
// in an AI work assistant, even if Gmail marks it as important.
const ALWAYS_SKIP = new Set([
  "SPAM", "TRASH", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL",
]);

// Skip these category labels unless the user explicitly starred the message.
// NOTE: IMPORTANT is NOT a bypass here — Gmail's importance classifier is too
// permissive on automated senders. Only a deliberate STARRED action counts.
// Exception for CATEGORY_UPDATES: a Stripe invoice or GitHub PR review can be
// IMPORTANT and should still pass through (handled in shouldSkip below).
const SOFT_SKIP = new Set(["CATEGORY_UPDATES", "CATEGORY_FORUMS"]);

const MAX_ROWS_PER_USER = 50;
const MAX_AGE_DAYS = 7;

const HIGH_SIGNAL_KEYWORDS = [
  "urgent", "asap", "action required", "review", "approval", "meeting",
  "invoice", "contract", "deadline", "follow up", "followup", "reminder",
];

const CONSUMER_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "me.com", "aol.com", "protonmail.com",
]);

// ─── Gmail API types ──────────────────────────────────────────────────────────

interface GmailMessageRef { id: string; threadId: string }
interface GmailMessageList {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
  historyId?: string;
}

interface GmailHeader { name: string; value: string }
interface GmailMessagePayload { headers?: GmailHeader[] }
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string; // ms since epoch as string
  historyId?: string;
  payload?: GmailMessagePayload;
}

interface GmailHistoryMessage { message: GmailMessageRef }
interface GmailHistoryRecord {
  id: string;
  messagesAdded?: GmailHistoryMessage[];
}
interface GmailHistoryResponse {
  history?: GmailHistoryRecord[];
  nextPageToken?: string;
  historyId?: string;
  error?: { code: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreRelevance(labels: string[], subject: string, isRead: boolean, fromAddress: string): number {
  let score = 0;
  if (labels.includes("IMPORTANT")) score += 0.4;
  if (labels.includes("STARRED"))   score += 0.3;
  if (!isRead)                       score += 0.1;

  const subjectLower = subject.toLowerCase();
  if (HIGH_SIGNAL_KEYWORDS.some((kw) => subjectLower.includes(kw))) score += 0.15;

  const domain = fromAddress.split("@")[1]?.toLowerCase() ?? "";
  if (domain && !CONSUMER_DOMAINS.has(domain)) score += 0.05;

  return Math.min(score, 1);
}

function shouldSkip(labels: string[], hasUnsubscribeHeader = false): boolean {
  if (!labels.includes("INBOX")) return true;
  if (labels.some((l) => ALWAYS_SKIP.has(l))) return true;

  // Bulk/notification mail almost always carries a List-Unsubscribe header.
  // Skip unless the user explicitly starred it — IMPORTANT is not sufficient
  // because Gmail's classifier fires on many automated senders.
  if (hasUnsubscribeHeader && !labels.includes("STARRED")) return true;

  // CATEGORY_UPDATES: allow through if IMPORTANT or STARRED (Stripe, GitHub, etc.)
  // Other soft categories: require explicit STARRED — IMPORTANT is too noisy.
  const isSoftCategory = labels.some((l) => SOFT_SKIP.has(l));
  if (isSoftCategory) {
    const isUpdates = labels.includes("CATEGORY_UPDATES");
    const passes = labels.includes("STARRED") || (isUpdates && labels.includes("IMPORTANT"));
    if (!passes) return true;
  }

  return false;
}

function parseHeader(headers: GmailHeader[], name: string): string | null {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function parseFrom(raw: string): { name: string | null; address: string } {
  // "Display Name <email@domain.com>" or just "email@domain.com"
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), address: match[2].trim() };
  return { name: null, address: raw.trim() };
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

async function fetchAndStoreMessage(
  connection: IntegrationConnection,
  messageId: string
): Promise<{ stored: boolean; skipped?: string }> {
  const res = await googleFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=List-Unsubscribe`,
    connection
  );
  if (!res.ok) {
    log.warn(`fetchMessage ${messageId} failed: HTTP ${res.status}`);
    return { stored: false, skipped: `http_${res.status}` };
  }

  const msg: GmailMessage = await res.json();
  const labels = msg.labelIds ?? [];
  const headers = msg.payload?.headers ?? [];
  const hasUnsubscribeHeader = !!parseHeader(headers, "List-Unsubscribe");

  if (shouldSkip(labels, hasUnsubscribeHeader)) {
    return { stored: false, skipped: labels.join(",") };
  }

  const subject = parseHeader(headers, "Subject") ?? "(No subject)";
  const fromRaw = parseHeader(headers, "From") ?? "";
  const { name: fromName, address: fromAddress } = parseFrom(fromRaw);

  const receivedAt = msg.internalDate
    ? new Date(parseInt(msg.internalDate, 10))
    : new Date();

  // Drop messages older than MAX_AGE_DAYS
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400000);
  if (receivedAt < cutoff) return { stored: false, skipped: "too_old" };

  const isRead = !labels.includes("UNREAD");
  const snippet = (msg.snippet ?? "").slice(0, 200);
  const relevanceScore = scoreRelevance(labels, subject, isRead, fromAddress);

  await upsertEmailMessage({
    userId:         connection.userId,
    connectionId:   connection.id,
    externalId:     msg.id,
    threadId:       msg.threadId ?? null,
    subject,
    fromAddress,
    fromName,
    snippet,
    receivedAt,
    labels,
    isRead,
    relevanceScore,
    metadata:       {},
  });

  return { stored: true };
}

async function enforceRowCap(userId: string): Promise<void> {
  // Count rows — if over cap, delete oldest
  const rows = await db.query.emailMessages.findMany({
    where: eq(emailMessages.userId, userId),
    columns: { id: true, receivedAt: true },
    orderBy: [asc(emailMessages.receivedAt)],
  });

  if (rows.length <= MAX_ROWS_PER_USER) return;

  const toDelete = rows.slice(0, rows.length - MAX_ROWS_PER_USER);
  for (const row of toDelete) {
    await db.delete(emailMessages).where(
      and(eq(emailMessages.userId, userId), eq(emailMessages.id, row.id))
    );
  }
}

// ─── Integration implementation ───────────────────────────────────────────────

export const gmailIntegration: Integration = {
  provider:      "google",
  feature:       "gmail",
  displayName:   "Gmail",
  requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],

  async sync(connection: IntegrationConnection): Promise<void> {
    const existingHistoryId = connection.syncCursors?.gmail;

    if (existingHistoryId) {
      // ── Incremental sync via history API ──────────────────────────────────
      log.info(`Incremental sync from historyId=${existingHistoryId}`);
      let pageToken: string | undefined;

      do {
        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
        url.searchParams.set("startHistoryId", existingHistoryId);
        url.searchParams.set("historyTypes", "messageAdded");
        url.searchParams.set("labelId", "INBOX");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await googleFetch(url.toString(), connection);
        const data: GmailHistoryResponse = await res.json();

        // 404 means historyId expired — fall back to full sync
        if (res.status === 404 || data.error?.code === 404) {
          await updateSyncCursor(connection.id, "gmail", "");
          await this.sync({ ...connection, syncCursors: {} });
          return;
        }

        for (const record of data.history ?? []) {
          for (const added of record.messagesAdded ?? []) {
            await fetchAndStoreMessage(connection, added.message.id);
          }
        }

        if (data.historyId) {
          await updateSyncCursor(connection.id, "gmail", data.historyId);
        }

        pageToken = data.nextPageToken;
      } while (pageToken);
    } else {
      // ── Initial full sync ─────────────────────────────────────────────────
      // Pull last MAX_AGE_DAYS days, INBOX only, max 50 messages
      const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400000);
      const afterEpochSec = Math.floor(cutoff.getTime() / 1000);

      // category:primary = Gmail's Primary tab (direct emails, no promotions/social/updates)
      // label:important = any email Gmail flagged as important, regardless of tab
      // Together these catch: real human emails + work-relevant notifications
      const listRes = await googleFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&q=after:${afterEpochSec}+(category:primary+OR+label:important)&maxResults=50`,
        connection
      );

      if (!listRes.ok) {
        const errBody = await listRes.text();
        throw new Error(`Gmail list failed: HTTP ${listRes.status} — ${errBody}`);
      }

      const listData: GmailMessageList = await listRes.json();
      const msgList = listData.messages ?? [];
      log.info(`List returned ${msgList.length} message(s)`);

      let stored = 0, skipped = 0;
      for (const ref of msgList) {
        const result = await fetchAndStoreMessage(connection, ref.id);
        if (result?.stored) stored++;
        else skipped++;
      }
      log.info(`Full sync done — stored: ${stored}, skipped: ${skipped}`);

      // Capture current historyId for future incremental syncs.
      // We get it from the last fetched message or a profile call.
      if (listData.historyId) {
        await updateSyncCursor(connection.id, "gmail", listData.historyId);
      } else {
        // Fallback: fetch profile to get current historyId
        const profileRes = await googleFetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/profile",
          connection
        );
        if (profileRes.ok) {
          const profile = await profileRes.json() as { historyId?: string };
          if (profile.historyId) {
            await updateSyncCursor(connection.id, "gmail", profile.historyId);
          }
        }
      }
    }

    await enforceRowCap(connection.userId);
  },

  async getContext(userId: string): Promise<IntegrationContext | null> {
    // Only surface high-relevance emails (score ≥ 0.4), most relevant first
    const emails = await getRecentEmails(userId, { limit: 10, unreadOnly: false });
    const relevant = emails
      .filter((e) => (e.relevanceScore ?? 0) >= 0.4)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, 5);

    if (relevant.length === 0) return null;

    const lines = relevant.map((e) => {
      const from = e.fromName ? `${e.fromName} <${e.fromAddress}>` : e.fromAddress;
      const unread = !e.isRead ? " [unread]" : "";
      return `- From: ${from}${unread} | Subject: ${e.subject ?? "(No subject)"} | ${e.snippet ?? ""}`;
    });

    return {
      feature: "gmail",
      summary: `Recent important emails:\n${lines.join("\n")}`,
    };
  },
};
