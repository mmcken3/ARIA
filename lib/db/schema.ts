import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Better Auth required tables ────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Projects ─────────────────────────────────────────────────────────────────
// High-level containers that group tasks. Optional — tasks can be unassigned.
// Examples: "123 Main St", "SaaS App v2", "Client: Sarah"

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#0D9488"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("projects_user_name_unique").on(t.userId, t.name),
]);

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  // backlog | up_next | in_progress | done
  priority: text("priority").notNull().default("medium"),
  // low | medium | high | urgent
  dueAt: timestamp("due_at"),
  links: jsonb("links").default([]),
  // [{label: string, url: string}]
  metadata: jsonb("metadata").default({}),
  // extensible — no migrations needed for new AI-written fields
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Task Activity ────────────────────────────────────────────────────────────
// Audit trail for every task — status changes, comments, AI actions, links added.
// Powers the activity feed in the task detail panel.

export const taskActivity = pgTable("task_activity", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // status_change | comment | ai_action | link_added
  body: text("body").notNull(),
  actor: text("actor").notNull(),
  // user | system
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Memory ───────────────────────────────────────────────────────────────────
// Persistent facts ARIA writes to remember across sessions.
// One entry per discrete fact — preference, context, decision worth keeping.

export const memory = pgTable("memory", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
// Single persistent conversation per user. Messages are the full history.

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Background job logs ──────────────────────────────────────────────────────

export const jobLogs = pgTable("job_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(),
  // success | error | skipped
  durationMs: integer("duration_ms"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
