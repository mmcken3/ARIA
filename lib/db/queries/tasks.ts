import { and, eq, count, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, taskActivity } from "@/lib/db/schema";
import type { Task, CreateTask, UpdateTask, ListTasksQuery } from "@/lib/api/tasks/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeTask(row: typeof tasks.$inferSelect): Task {
  return {
    ...row,
    projectId: row.projectId ?? null,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    dueAt: row.dueAt?.toISOString() ?? null,
    links: (row.links ?? []) as { label: string; url: string }[],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listTasks(userId: string, query: ListTasksQuery) {
  const filters = [eq(tasks.userId, userId)];
  if (query.status) filters.push(eq(tasks.status, query.status));
  if (query.priority) filters.push(eq(tasks.priority, query.priority));

  const where = and(...filters);

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.updatedAt))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ value: count() }).from(tasks).where(where),
  ]);

  return { tasks: rows.map(serializeTask), total: Number(total) };
}

export async function getTask(userId: string, taskId: string) {
  const row = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });
  return row ? serializeTask(row) : null;
}

export async function createTask(userId: string, input: CreateTask) {
  const id = crypto.randomUUID();
  const now = new Date();

  const [row] = await db
    .insert(tasks)
    .values({
      id,
      userId,
      projectId: input.projectId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "backlog",
      priority: input.priority ?? "medium",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      links: input.links ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await logActivity(id, "ai_action", `Task created: "${input.title}"`, "system");

  return serializeTask(row);
}

export async function updateTask(userId: string, taskId: string, input: UpdateTask) {
  const existing = await getTask(userId, taskId);
  if (!existing) return null;

  const [row] = await db
    .update(tasks)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueAt !== undefined && { dueAt: input.dueAt ? new Date(input.dueAt) : null }),
      ...(input.links !== undefined && { links: input.links }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  // Log status changes for the activity feed
  if (input.status && input.status !== existing.status) {
    await logActivity(
      taskId,
      "status_change",
      `Status changed from "${existing.status}" to "${input.status}"`,
      "system"
    );
  }

  return serializeTask(row);
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await getTask(userId, taskId);
  if (!existing) return false;

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return true;
}

export async function getTaskActivity(userId: string, taskId: string) {
  // Verify task belongs to user before returning activity
  const task = await getTask(userId, taskId);
  if (!task) return null;

  const rows = await db
    .select()
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(desc(taskActivity.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function logActivity(
  taskId: string,
  type: string,
  body: string,
  actor: "user" | "system"
) {
  await db.insert(taskActivity).values({
    id: crypto.randomUUID(),
    taskId,
    type,
    body,
    actor,
    createdAt: new Date(),
  });
}
