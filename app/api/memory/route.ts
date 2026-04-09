import { getSession, unauthorized } from "@/lib/api/session";
import { listMemory } from "@/lib/db/queries/memory";

export const dynamic = "force-dynamic";

/**
 * GET /api/memory
 * Returns all AI memory entries for the authenticated user.
 */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const entries = await listMemory(session.user.id);
  return Response.json({ memory: entries });
}
