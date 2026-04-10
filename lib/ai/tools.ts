import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createTask, updateTask, deleteTask, listTasks } from "@/lib/db/queries/tasks";
import { createProject, listProjects, DuplicateProjectNameError } from "@/lib/db/queries/projects";
import { writeMemory, deleteMemory, listMemory } from "@/lib/db/queries/memory";
import { getUpcomingEvents } from "@/lib/db/queries/integrations";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/integrations/google-calendar/write";

// ─── Tool definitions (sent to Claude) ───────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    name: "create_task",
    description:
      "Create a new task for the user. Use when they ask to add, track, or remember something as a task.",
    input_schema: {
      type: "object",
      properties: {
        title:     { type: "string", description: "Short, clear task title" },
        status:    { type: "string", enum: ["backlog", "up_next", "in_progress", "done"], description: "Defaults to backlog" },
        priority:  { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Defaults to medium" },
        projectId: { type: "string", description: "Project ID to assign to (optional)" },
        dueAt:     { type: "string", description: "ISO 8601 due date/time (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing task. Use when the user wants to change a task's title, status, priority, project, or due date.",
    input_schema: {
      type: "object",
      properties: {
        id:        { type: "string", description: "Task ID to update" },
        title:     { type: "string" },
        status:    { type: "string", enum: ["backlog", "up_next", "in_progress", "done"] },
        priority:  { type: "string", enum: ["low", "medium", "high", "urgent"] },
        projectId: { type: "string", description: "Project ID, or null to unassign" },
        dueAt:     { type: "string", description: "ISO 8601 due date, or null to clear" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task. Only use when the user explicitly asks to delete or remove a task.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_tasks",
    description:
      "Fetch the user's current task list. Use this to answer questions about their tasks or to find a task ID before updating it.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["backlog", "up_next", "in_progress", "done"], description: "Filter by status (optional)" },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a new project to group tasks under.",
    input_schema: {
      type: "object",
      properties: {
        name:  { type: "string", description: "Project name" },
        color: { type: "string", description: "Hex color, e.g. #0D9488 (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    description: "Fetch the user's projects. Use to find a project ID before assigning tasks.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "write_memory",
    description:
      "Persist a fact about the user across sessions. Use for preferences, context about their work, people they mention, or recurring patterns. One discrete fact per call.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact to remember, written as a plain statement" },
      },
      required: ["content"],
    },
  },
  {
    name: "delete_memory",
    description: "Remove a memory entry by ID. Use to correct or remove outdated facts.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory entry ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_memory",
    description: "Fetch all stored memory entries. Use to find an ID before deleting.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_calendar_events",
    description:
      "Fetch upcoming calendar events from the local database. Use this to find an event's externalId before updating or deleting it.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max events to return (default 20)" },
      },
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new event on the user's Google Calendar. Use when they ask to schedule, book, or block time for something. Google automatically sends invites to attendees.",
    input_schema: {
      type: "object",
      properties: {
        title:       { type: "string",  description: "Event title" },
        startAt:     { type: "string",  description: "Start time as ISO 8601 (e.g. 2026-04-15T14:00:00)" },
        endAt:       { type: "string",  description: "End time as ISO 8601" },
        isAllDay:    { type: "boolean", description: "True for all-day events — startAt/endAt should be YYYY-MM-DD dates" },
        description: { type: "string",  description: "Optional event description or notes" },
        location:    { type: "string",  description: "Optional location or meeting link" },
        attendees:   { type: "array", items: { type: "string" }, description: "Email addresses to invite" },
      },
      required: ["title", "startAt", "endAt"],
    },
  },
  {
    name: "update_calendar_event",
    description:
      "Update an existing Google Calendar event. Use list_calendar_events first to get the externalId and current attendees. When adding an invitee, include all existing attendee emails plus the new one in the attendees array — the list replaces the existing one.",
    input_schema: {
      type: "object",
      properties: {
        externalId:  { type: "string",  description: "Google Calendar event ID (from list_calendar_events)" },
        title:       { type: "string" },
        startAt:     { type: "string",  description: "New start time as ISO 8601" },
        endAt:       { type: "string",  description: "New end time as ISO 8601" },
        isAllDay:    { type: "boolean" },
        description: { type: "string" },
        location:    { type: "string" },
        attendees:   { type: "array", items: { type: "string" }, description: "Full attendee list (replaces existing). Include current attendees when adding someone." },
      },
      required: ["externalId"],
    },
  },
  {
    name: "delete_calendar_event",
    description:
      "Delete an event from Google Calendar. Only use when the user explicitly asks to cancel or remove an event. Use list_calendar_events first to get the externalId.",
    input_schema: {
      type: "object",
      properties: {
        externalId: { type: "string", description: "Google Calendar event ID (from list_calendar_events)" },
      },
      required: ["externalId"],
    },
  },
];

// Tools that are read-only — no UI card shown for these
export const SILENT_TOOLS = new Set(["list_tasks", "list_projects", "list_memory", "list_calendar_events"]);

// ─── Tool result type ─────────────────────────────────────────────────────────

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

// ─── Executor ─────────────────────────────────────────────────────────────────

export async function executeTool(
  userId: string,
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "create_task": {
        const task = await createTask(userId, {
          title:       input.title as string,
          status:      ((input.status as string | undefined) ?? "backlog") as "backlog" | "up_next" | "in_progress" | "done",
          priority:    ((input.priority as string | undefined) ?? "medium") as "low" | "medium" | "high" | "urgent",
          projectId:   (input.projectId as string | undefined) ?? null,
          dueAt:       (input.dueAt as string | undefined),
          links:       [],
          metadata:    {},
        });
        return { ok: true, data: task };
      }

      case "update_task": {
        const { id, ...changes } = input as { id: string } & Record<string, unknown>;
        const task = await updateTask(userId, id, {
          ...(changes.title     !== undefined && { title:     changes.title as string }),
          ...(changes.status    !== undefined && { status:    changes.status as "backlog" | "up_next" | "in_progress" | "done" }),
          ...(changes.priority  !== undefined && { priority:  changes.priority as "low" | "medium" | "high" | "urgent" }),
          ...(changes.projectId !== undefined && { projectId: changes.projectId as string | null }),
          ...(changes.dueAt     !== undefined && { dueAt:     changes.dueAt as string | null }),
        });
        if (!task) return { ok: false, error: "Task not found" };
        return { ok: true, data: task };
      }

      case "delete_task": {
        const deleted = await deleteTask(userId, input.id as string);
        if (!deleted) return { ok: false, error: "Task not found" };
        return { ok: true, data: { deleted: true, id: input.id } };
      }

      case "list_tasks": {
        const result = await listTasks(userId, {
          status:   input.status as "backlog" | "up_next" | "in_progress" | "done" | undefined,
          limit:    100,
          offset:   0,
        });
        return { ok: true, data: result };
      }

      case "create_project": {
        const project = await createProject(userId, {
          name:  input.name as string,
          color: (input.color as string | undefined) ?? "#0D9488",
        });
        return { ok: true, data: project };
      }

      case "list_projects": {
        const projects = await listProjects(userId);
        return { ok: true, data: projects };
      }

      case "write_memory": {
        const entry = await writeMemory(userId, input.content as string);
        return { ok: true, data: entry };
      }

      case "delete_memory": {
        const deleted = await deleteMemory(userId, input.id as string);
        if (!deleted) return { ok: false, error: "Memory entry not found" };
        return { ok: true, data: { deleted: true, id: input.id } };
      }

      case "list_memory": {
        const entries = await listMemory(userId);
        return { ok: true, data: entries };
      }

      case "list_calendar_events": {
        const events = await getUpcomingEvents(userId, {
          limit: (input.limit as number | undefined) ?? 20,
        });
        return {
          ok: true,
          data: events.map((e) => ({
            externalId: e.externalId,
            title:      e.title,
            startAt:    e.startAt,
            endAt:      e.endAt,
            isAllDay:   e.isAllDay,
            location:   e.location,
            status:     e.status,
            attendees:  ((e.attendees ?? []) as Array<{ email: string; name?: string }>).map((a) => a.email),
          })),
        };
      }

      case "create_calendar_event": {
        const result = await createCalendarEvent(userId, {
          title:       input.title as string,
          startAt:     input.startAt as string,
          endAt:       input.endAt as string,
          isAllDay:    (input.isAllDay as boolean | undefined) ?? false,
          description: input.description as string | undefined,
          location:    input.location as string | undefined,
          attendees:   input.attendees as string[] | undefined,
        });
        return { ok: true, data: result };
      }

      case "update_calendar_event": {
        const result = await updateCalendarEvent(
          userId,
          input.externalId as string,
          {
            title:       input.title as string | undefined,
            startAt:     input.startAt as string | undefined,
            endAt:       input.endAt as string | undefined,
            isAllDay:    input.isAllDay as boolean | undefined,
            description: input.description as string | undefined,
            location:    input.location as string | undefined,
            attendees:   input.attendees as string[] | undefined,
          }
        );
        return { ok: true, data: result };
      }

      case "delete_calendar_event": {
        const result = await deleteCalendarEvent(userId, input.externalId as string);
        return { ok: true, data: result };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    if (err instanceof DuplicateProjectNameError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Tool execution failed" };
  }
}
