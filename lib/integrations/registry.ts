/**
 * Integration registry — the single source of truth for active integrations.
 *
 * Integrations register themselves here at import time. The registry is then
 * used by:
 *   - context-builder.ts  → getContext() per integration for AI system prompt
 *   - background jobs     → sync() per integration on schedule
 *   - settings UI         → list all integrations + their required scopes
 *
 * To add a new integration: call registerIntegration() from your integration
 * module, then import it in app/layout.tsx or lib/integrations/index.ts so the
 * registration side-effect fires before anything uses the registry.
 */

import type { Integration } from "./interface";

const registry = new Map<string, Integration>();

export function registerIntegration(integration: Integration): void {
  const key = `${integration.provider}:${integration.feature}`;
  if (registry.has(key)) {
    throw new Error(`Integration already registered: ${key}`);
  }
  registry.set(key, integration);
}

export function getIntegration(provider: string, feature: string): Integration | undefined {
  return registry.get(`${provider}:${feature}`);
}

export function getIntegrationsByProvider(provider: string): Integration[] {
  return Array.from(registry.values()).filter((i) => i.provider === provider);
}

export function getAllIntegrations(): Integration[] {
  return Array.from(registry.values());
}
