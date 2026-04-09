import { openApiSpec } from "@/lib/api/openapi";
import { getSession, unauthorized } from "@/lib/api/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/docs
 * Serves the Scalar API reference UI with the ARIA OpenAPI spec.
 * Gated behind session auth — not public, even though it contains no secrets.
 */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>ARIA API Docs</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" type="application/json">${JSON.stringify(openApiSpec)}</script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
