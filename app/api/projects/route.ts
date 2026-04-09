import { getSession, unauthorized } from "@/lib/api/session";
import { listProjects, createProject, DuplicateProjectNameError } from "@/lib/db/queries/projects";
import { CreateProjectSchema } from "@/lib/api/projects/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * List all active projects for the authenticated user.
 * Pass ?archived=true to include archived projects.
 */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";

  const result = await listProjects(session.user.id, includeArchived);
  return Response.json({ projects: result });
}

/**
 * POST /api/projects
 * Create a new project. Returns the created project.
 */
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const project = await createProject(session.user.id, parsed.data);
    return Response.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateProjectNameError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
