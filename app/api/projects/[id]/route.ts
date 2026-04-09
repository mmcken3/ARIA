import { getSession, unauthorized } from "@/lib/api/session";
import { getProject, updateProject, deleteProject, DuplicateProjectNameError } from "@/lib/db/queries/projects";
import { UpdateProjectSchema } from "@/lib/api/projects/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/:id
 * Fetch a single project by ID.
 */
export async function GET(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const project = await getProject(session.user.id, id);

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  return Response.json(project);
}

/**
 * PATCH /api/projects/:id
 * Update a project's name, color, or archived state.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = UpdateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;

  try {
    const project = await updateProject(session.user.id, id, parsed.data);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json(project);
  } catch (err) {
    if (err instanceof DuplicateProjectNameError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

/**
 * DELETE /api/projects/:id
 * Delete a project. Tasks assigned to it will have projectId set to null.
 */
export async function DELETE(req: Request, { params }: Params) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const deleted = await deleteProject(session.user.id, id);

  if (!deleted) return Response.json({ error: "Project not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
