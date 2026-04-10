/**
 * Shared Google OAuth client utilities.
 *
 * Used by all Google-based integrations (Calendar, Gmail, etc.).
 * Never call Google APIs directly from integration code — always go through
 * getValidAccessToken() so token refresh is handled consistently.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationConnections } from "@/lib/db/schema";
import { encryptToken, decryptToken } from "@/lib/crypto/tokens";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

/**
 * Exchange a refresh token for a new access token via Google OAuth.
 * Throws if the refresh fails (e.g. token revoked, scopes changed).
 */
async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  const data: GoogleTokenResponse = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      `Google token refresh failed: ${data.error ?? res.status} — ${data.error_description ?? ""}`
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Returns a valid (non-expired) access token for the given connection.
 * Refreshes automatically if the token is expired or expiring within 5 minutes.
 * Persists the refreshed token to DB (encrypted) before returning.
 */
export async function getValidAccessToken(connection: {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date | null;
}): Promise<string> {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - now < fiveMinutes;

  if (!needsRefresh) {
    return decryptToken(connection.accessTokenEnc);
  }

  const refreshToken = decryptToken(connection.refreshTokenEnc);
  const { accessToken, expiresAt: newExpiresAt } = await refreshGoogleAccessToken(refreshToken);

  await db
    .update(integrationConnections)
    .set({
      accessTokenEnc: encryptToken(accessToken),
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, connection.id));

  return accessToken;
}

/**
 * Authenticated fetch to a Google API endpoint.
 * Handles token refresh automatically.
 * Pass init to override method, headers, body, etc.
 */
export async function googleFetch(
  url: string,
  connection: {
    id: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    tokenExpiresAt: Date | null;
  },
  init: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken(connection);
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
