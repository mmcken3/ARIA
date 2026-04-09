import { getSession, unauthorized } from "@/lib/api/session";
import { getTask, updateTask, deleteTask } from "@/lib/db/queries/tasks";
import { UpdateTaskSchema } from "@/lib/api/tasks/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/:id
 * Fetch a single task by ID. Returns 404 if not found or not owned by caller.
 */
export async function GET(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const task = await getTask(session.user.id, id);

  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  return Response.json(task);
}

/**
 * PATCH /api/tasks/:id
 * Partially update a task. Any subset of fields may be provided.
 * Returns the full updated task.
 *
 * Primary use: AI updates task status ("mark that as done"), priority, or description.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = UpdateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const task = await updateTask(session.user.id, id, parsed.data);

  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  return Response.json(task);
}

/**
 * DELETE /api/tasks/:id
 * Delete a task. Returns 204 on success, 404 if not found.
 */
export async function DELETE(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const deleted = await deleteTask(session.user.id, id);

  if (!deleted) return Response.json({ error: "Task not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
