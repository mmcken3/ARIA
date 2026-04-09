import { getSession, unauthorized } from "@/lib/api/session";
import { getTaskActivity } from "@/lib/db/queries/tasks";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks/:id/activity
 * Returns the activity log for a task (status changes, comments, AI actions).
 * Used by the task detail panel and potentially surfaced in chat context.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const activity = await getTaskActivity(session.user.id, id);

  if (!activity) return Response.json({ error: "Task not found" }, { status: 404 });
  return Response.json({ activity });
}
