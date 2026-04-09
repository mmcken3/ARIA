import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { memory } from "@/lib/db/schema";

export type MemoryEntry = {
  id: string;
  content: string;
  createdAt: string;
};

function serialize(row: typeof memory.$inferSelect): MemoryEntry {
  return { id: row.id, content: row.content, createdAt: row.createdAt.toISOString() };
}

export async function listMemory(userId: string, limit = 50): Promise<MemoryEntry[]> {
  const rows = await db
    .select()
    .from(memory)
    .where(eq(memory.userId, userId))
    .orderBy(desc(memory.createdAt))
    .limit(limit);
  return rows.map(serialize);
}

export async function writeMemory(userId: string, content: string): Promise<MemoryEntry> {
  const [row] = await db
    .insert(memory)
    .values({ id: crypto.randomUUID(), userId, content, createdAt: new Date(), updatedAt: new Date() })
    .returning();
  return serialize(row);
}

export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(memory)
    .where(and(eq(memory.id, id), eq(memory.userId, userId)))
    .returning();
  return result.length > 0;
}
