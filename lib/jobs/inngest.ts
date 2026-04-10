import { Inngest } from "inngest";

/**
 * Shared Inngest client.
 *
 * Import this from background job files — never create additional clients.
 * Jobs are defined alongside this file in lib/jobs/ and served via
 * app/api/inngest/route.ts.
 *
 * Local dev: run `npx inngest-cli@latest dev` to get a local Inngest server.
 * Production: set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in env vars.
 */
export const inngest = new Inngest({
  id: "aria",
  name: "ARIA",
});
