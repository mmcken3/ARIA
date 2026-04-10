import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/inngest";
import { gcalSyncJob } from "@/lib/jobs/gcal-sync";
import { gmailSyncJob } from "@/lib/jobs/gmail-sync";

/**
 * Inngest serve handler — registers all background jobs with the Inngest platform.
 *
 * Add new jobs to the functions array as they are created in lib/jobs/.
 * See: https://www.inngest.com/docs/reference/serve
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gcalSyncJob,
    gmailSyncJob,
    // morningBriefJob — added as built
  ],
});
