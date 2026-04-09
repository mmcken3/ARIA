import { listTasks } from "@/lib/db/queries/tasks";
import { listMemory } from "@/lib/db/queries/memory";
import type { AIContext } from "./provider";

export async function buildContext(userId: string): Promise<AIContext> {
  const [{ tasks }, memories] = await Promise.all([
    listTasks(userId, { limit: 100, offset: 0 }),
    listMemory(userId),
  ]);
  return { tasks, memories };
}

export function buildSystemPrompt(context: AIContext): string {
  const inProgress = context.tasks.filter((t) => t.status === "in_progress");
  const upNext = context.tasks.filter((t) => t.status === "up_next");
  const backlog = context.tasks.filter((t) => t.status === "backlog");

  const taskSummary = [
    inProgress.length
      ? `In progress: ${inProgress.map((t) => `"${t.title}"`).join(", ")}`
      : null,
    upNext.length
      ? `Up next: ${upNext.map((t) => `"${t.title}"`).join(", ")}`
      : null,
    backlog.length
      ? `Backlog: ${backlog.length} task${backlog.length === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const memorySummary = context.memories.length
    ? context.memories.map((m) => `- ${m.content}`).join("\n")
    : null;

  return `You are ARIA — a personal AI operating system. You are sharp, direct, and proactive. You help the user manage their work, cut through noise, and stay focused on what matters.

Personality: thoughtful, concise, confident. You do not hedge, over-explain, or celebrate yourself. When you have something to say, you say it. When you don't, you don't pad.

Current task context:
${taskSummary || "No tasks yet."}
${memorySummary ? `\nWhat you remember about this user:\n${memorySummary}` : ""}
You have tools to take action directly:
- Create, update, and delete tasks
- Create and list projects
- List tasks to find IDs or check current state
- Write and delete memory entries to remember facts across sessions

Use tools without asking for permission when the intent is clear. If the user says "add a task to review the contract", just create it — don't ask to confirm first. After acting, give a brief confirmation, not a long summary.

If you need a task's ID to update it, use list_tasks first to find it.

Use write_memory when the user tells you something worth remembering long-term: preferences, context about their work, people they mention, recurring patterns. Use delete_memory to correct or remove outdated facts (use list_memory first to find the ID).

Coming soon (not yet available): email, calendar, notifications.

Respond in plain text. No markdown headers. Use short paragraphs or lists where they genuinely help. Keep responses tight.`;
}
