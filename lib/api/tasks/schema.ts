import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ─── Enums ────────────────────────────────────────────────────────────────────

export const TaskStatus = z.enum(["backlog", "up_next", "in_progress", "done"]).openapi({
  description: "Current workflow status of the task",
  example: "in_progress",
});

export const TaskPriority = z.enum(["low", "medium", "high", "urgent"]).openapi({
  description: "Priority level of the task",
  example: "high",
});

export const TaskLink = z.object({
  label: z.string().min(1).openapi({ description: "Display label for the link", example: "PR #42" }),
  url: z.string().url().openapi({ description: "URL to the linked resource", example: "https://github.com/org/repo/pull/42" }),
}).openapi("TaskLink");

// ─── Full Task shape (returned by all routes) ─────────────────────────────────

export const TaskSchema = z.object({
  id: z.string().openapi({ description: "Task ID", example: "a1b2c3d4-..." }),
  userId: z.string().openapi({ description: "Owner user ID" }),
  projectId: z.string().nullable().openapi({ description: "Project this task belongs to, if any" }),
  title: z.string().openapi({ description: "Task title", example: "Finish quarterly report" }),
  description: z.string().nullable().openapi({ description: "Optional longer description" }),
  status: TaskStatus,
  priority: TaskPriority,
  dueAt: z.string().datetime().nullable().openapi({ description: "ISO 8601 due date/time" }),
  links: z.array(TaskLink).openapi({ description: "Attached links (docs, PRs, Figma, etc.)" }),
  metadata: z.record(z.string(), z.unknown()).openapi({ description: "Extensible metadata, written by AI or user" }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("Task");

// ─── Request bodies ───────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  title: z.string().min(1).openapi({ description: "Task title", example: "Review design mockups" }),
  projectId: z.string().nullable().optional().openapi({ description: "Project ID to assign this task to" }),
  description: z.string().optional().openapi({ description: "Optional description" }),
  status: TaskStatus.optional().default("backlog"),
  priority: TaskPriority.optional().default("medium"),
  dueAt: z.string().datetime().optional().openapi({ description: "ISO 8601 due date/time" }),
  links: z.array(TaskLink).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).openapi("CreateTask");

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  projectId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  links: z.array(TaskLink).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateTask");

// ─── Query params ─────────────────────────────────────────────────────────────

export const ListTasksQuerySchema = z.object({
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).openapi("ListTasksQuery");

// ─── Response envelopes ───────────────────────────────────────────────────────

export const TaskListResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  total: z.number().int(),
}).openapi("TaskListResponse");

export const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi("ErrorResponse");

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
