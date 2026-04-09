import { eq, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

function serializeMessage(row: typeof messages.$inferSelect): Message {
  return {
    ...row,
    role: row.role as Message["role"],
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Get or create the single conversation for this user ─────────────────────

export async function ensureConversation(userId: string) {
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ id: crypto.randomUUID(), userId, createdAt: new Date(), updatedAt: new Date() })
    .returning();

  return created;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string, limit = 30): Promise<Message[]> {
  // Fetch the most recent `limit` messages, then reverse to chronological order
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows.reverse().map(serializeMessage);
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({ id: crypto.randomUUID(), conversationId, role, content, createdAt: new Date() })
    .returning();

  // Bump conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return serializeMessage(row);
}
