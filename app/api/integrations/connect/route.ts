/**
 * GET /api/integrations/connect?provider=google
 *
 * Initiates a Google OAuth flow requesting all scopes for every feature
 * under that provider at once. One consent screen, one connection row.
 *
 * The callback at /api/integrations/callback handles the response.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, unauthorized } from "@/lib/api/session";

// All scopes grouped by provider. Adding a new Google feature means adding
// its scope here — the user re-consents on next connect.
const PROVIDER_SCOPES: Record<string, string[]> = {
  google: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const provider = req.nextUrl.searchParams.get("provider");
  if (!provider || !PROVIDER_SCOPES[provider]) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const stateId = crypto.randomUUID();

  // Store state in httpOnly cookie — callback validates it to prevent CSRF
  const cookieStore = await cookies();
  cookieStore.set("aria_oauth_state", JSON.stringify({ stateId, userId: session.user.id, provider }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  const scopes = ["openid", "email", "profile", ...PROVIDER_SCOPES[provider]];

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback`,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: stateId,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
