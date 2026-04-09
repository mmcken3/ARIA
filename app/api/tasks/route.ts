import { getSession, unauthorized } from "@/lib/api/session";
import { listTasks, createTask } from "@/lib/db/queries/tasks";
import { CreateTaskSchema, ListTasksQuerySchema } from "@/lib/api/tasks/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks
 * List all tasks for the authenticated user.
 * Supports filtering by status and priority, with pagination.
 *
 * Query params: status, priority, limit (default 50), offset (default 0)
 */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = ListTasksQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await listTasks(session.user.id, parsed.data);
  return Response.json(result);
}

/**
 * POST /api/tasks
 * Create a new task. Returns the full created task.
 * Called by the AI when the user asks to create a task via chat.
 */
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await createTask(session.user.id, parsed.data);
  return Response.json(task, { status: 201 });
}
