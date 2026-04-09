import { auth } from "@/lib/auth/auth";

/**
 * Validates the session from request headers and returns it.
 * Returns null if no valid session exists — caller decides how to respond.
 */
export async function getSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

/**
 * Returns a 401 JSON response — used as an early return in route handlers.
 */
export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
