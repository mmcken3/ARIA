import { getSession, unauthorized } from "@/lib/api/session";
import { deleteMemory } from "@/lib/db/queries/memory";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/memory/:id
 * Delete a single memory entry. Scoped to the authenticated user.
 */
export async function DELETE(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const deleted = await deleteMemory(session.user.id, id);

  if (!deleted) return Response.json({ error: "Memory entry not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
