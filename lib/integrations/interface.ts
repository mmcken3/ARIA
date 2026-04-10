/**
 * Integration interface — the contract every integration must implement.
 *
 * One integration_connections row per OAuth *provider* (e.g. "google").
 * Multiple integration *features* can share one connection:
 *   - gmail  → uses connection provider="google"
 *   - gcal   → uses connection provider="google"
 *   - slack  → uses connection provider="slack"
 *
 * To add a new integration: implement this interface and register it in
 * lib/integrations/registry.ts. Nothing else changes.
 */

export interface IntegrationConnection {
  id: string;
  userId: string;
  provider: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date | null;
  scopes: string;
  syncCursors: Record<string, string>;
  metadata: Record<string, unknown>;
}

export interface IntegrationContext {
  /** Feature identifier matching Integration.feature */
  feature: string;
  /**
   * Plain-text summary injected into the AI system prompt.
   * Keep it tight — this is included in every request.
   */
  summary: string;
}

export interface Integration {
  /** OAuth provider this feature uses. Must match integration_connections.provider. */
  provider: string;

  /**
   * Feature identifier — unique within a provider.
   * Used as the key in sync_cursors and in the registry.
   * Examples: "gmail", "gcal", "slack_messages"
   */
  feature: string;

  /** Human-readable name shown in the settings UI. */
  displayName: string;

  /** OAuth scopes required for this feature. */
  requiredScopes: string[];

  /**
   * Sync latest data from the provider into local DB tables.
   * Uses incremental sync where available (historyId, nextSyncToken, etc.).
   * Called by background jobs — never called from API routes.
   * Must not throw — log errors and return cleanly.
   */
  sync(connection: IntegrationConnection): Promise<void>;

  /**
   * Return a plain-text context summary to inject into the AI system prompt.
   * Returns null if data is unavailable or the connection doesn't have
   * the required scopes.
   */
  getContext(userId: string): Promise<IntegrationContext | null>;
}
