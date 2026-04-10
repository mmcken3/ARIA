/**
 * GET /api/integrations/callback
 *
 * Handles the Google OAuth callback after the user grants consent
 * from the /api/integrations/connect flow.
 *
 * Validates the state cookie, exchanges the code for tokens,
 * upserts the integration_connections row, and redirects to /settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/api/session";
import { upsertIntegrationConnection } from "@/lib/db/queries/integrations";

const SETTINGS_URL = "/settings";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsError = (msg: string) =>
    NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${SETTINGS_URL}?connect_error=${encodeURIComponent(msg)}`);

  if (error) return settingsError(error);
  if (!code || !state) return settingsError("missing_params");

  // Validate state cookie
  const cookieStore = await cookies();
  const rawState = cookieStore.get("aria_oauth_state")?.value;
  cookieStore.delete("aria_oauth_state");

  if (!rawState) return settingsError("state_missing");

  let parsed: { stateId: string; userId: string; provider: string };
  try {
    parsed = JSON.parse(rawState);
  } catch {
    return settingsError("state_invalid");
  }

  if (parsed.stateId !== state) return settingsError("state_mismatch");

  // Verify the session is still active and belongs to the same user who
  // initiated the connect flow. Defense-in-depth alongside the state cookie.
  const session = await getSession(req);
  if (!session || session.user.id !== parsed.userId) {
    return settingsError("session_mismatch");
  }

  const { userId, provider } = parsed;

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData: GoogleTokenResponse = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    console.error("[integrations/callback] Token exchange failed:", tokenData.error, tokenData.error_description);
    return settingsError("token_exchange_failed");
  }

  if (!tokenData.refresh_token) {
    // Google only issues a refresh token with access_type=offline + prompt=consent.
    // If missing, the connect route params were wrong or Google had an issue.
    console.error("[integrations/callback] No refresh_token in response for provider:", provider);
    return settingsError("no_refresh_token");
  }

  try {
    await upsertIntegrationConnection({
      userId,
      provider,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      scopes: tokenData.scope,
    });
  } catch (err) {
    console.error("[integrations/callback] Failed to save connection:", err);
    return settingsError("save_failed");
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}${SETTINGS_URL}?connected=${provider}`
  );
}
