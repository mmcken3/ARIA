import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const ProjectSchema = z.object({
  id: z.string().openapi({ description: "Project ID" }),
  userId: z.string().openapi({ description: "Owner user ID" }),
  name: z.string().openapi({ description: "Project name", example: "123 Main St" }),
  color: z.string().openapi({ description: "Hex color for visual identification", example: "#0D9488" }),
  archivedAt: z.string().datetime().nullable().openapi({ description: "When the project was archived, if ever" }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("Project");

export const CreateProjectSchema = z.object({
  name: z.string().min(1).openapi({ description: "Project name", example: "SaaS App v2" }),
  color: z.string().optional().default("#0D9488").openapi({ description: "Hex color" }),
}).openapi("CreateProject");

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
}).openapi("UpdateProject");

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
}).openapi("ProjectListResponse");

export const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi("ErrorResponse");

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
