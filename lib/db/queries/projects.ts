import { and, eq, desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import type { Project, CreateProject, UpdateProject } from "@/lib/api/projects/schema";

export class DuplicateProjectNameError extends Error {
  constructor() { super("Cannot re-use a project name"); this.name = "DuplicateProjectNameError"; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeProject(row: typeof projects.$inferSelect): Project {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listProjects(userId: string, includeArchived = false) {
  const where = includeArchived
    ? eq(projects.userId, userId)
    : and(eq(projects.userId, userId), isNull(projects.archivedAt));

  const rows = await db
    .select()
    .from(projects)
    .where(where)
    .orderBy(desc(projects.updatedAt));

  return rows.map(serializeProject);
}

export async function getProject(userId: string, projectId: string) {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
  return row ? serializeProject(row) : null;
}

export async function createProject(userId: string, input: CreateProject) {
  const duplicate = await db.query.projects.findFirst({
    where: and(eq(projects.userId, userId), eq(projects.name, input.name)),
  });
  if (duplicate) throw new DuplicateProjectNameError();

  const id = crypto.randomUUID();
  const now = new Date();

  const [row] = await db
    .insert(projects)
    .values({
      id,
      userId,
      name: input.name,
      color: input.color ?? "#0D9488",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return serializeProject(row);
}

export async function updateProject(userId: string, projectId: string, input: UpdateProject) {
  const existing = await getProject(userId, projectId);
  if (!existing) return null;

  if (input.name && input.name !== existing.name) {
    const duplicate = await db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.name, input.name)),
    });
    if (duplicate) throw new DuplicateProjectNameError();
  }

  const [row] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.archivedAt !== undefined && {
        archivedAt: input.archivedAt ? new Date(input.archivedAt) : null,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();

  return serializeProject(row);
}

export async function deleteProject(userId: string, projectId: string) {
  const existing = await getProject(userId, projectId);
  if (!existing) return false;

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return true;
}
