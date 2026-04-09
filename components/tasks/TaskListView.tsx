"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Task } from "@/lib/api/tasks/schema";
import type { Project } from "@/lib/api/projects/schema";
import TaskDetailPanel from "@/components/dashboard/TaskDetailPanel";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_GROUPS: { id: Task["status"]; label: string; color: string }[] = [
  { id: "in_progress", label: "In Progress", color: "var(--accent)" },
  { id: "up_next",     label: "Up Next",     color: "var(--text-secondary)" },
  { id: "backlog",     label: "Backlog",     color: "var(--text-muted)" },
  { id: "done",        label: "Done",        color: "var(--success)" },
];

const PRIORITY_COLOR: Record<string, string> = {
  low:    "var(--text-muted)",
  medium: "var(--text-muted)",
  high:   "var(--warning)",
  urgent: "var(--danger)",
};

function formatDueDate(dueAt: string | null): { text: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)   return { text: "Overdue",  overdue: true };
  if (diffDays === 0) return { text: "Today",    overdue: false };
  if (diffDays === 1) return { text: "Tomorrow", overdue: false };
  if (diffDays <= 6)  return { text: `${diffDays}d`, overdue: false };
  return {
    text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskListViewProps {
  tasks: Task[];
  projects: Project[];
  defaultProjectId: string | null;
  onUpdate: (id: string, changes: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTaskCreated: (task: Task) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskListView({
  tasks,
  projects,
  defaultProjectId,
  onUpdate,
  onDelete,
  onTaskCreated,
}: TaskListViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingToStatus, setAddingToStatus] = useState<Task["status"] | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  // ─── Quick add ──────────────────────────────────────────────────────────────

  function openAdd(status: Task["status"]) {
    setAddingToStatus(status);
    setAddTitle("");
    setTimeout(() => addInputRef.current?.focus(), 50);
  }

  async function handleQuickAdd(status: Task["status"]) {
    const title = addTitle.trim();
    if (!title) { setAddingToStatus(null); return; }

    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      userId: "",
      projectId: defaultProjectId,
      title,
      description: null,
      status,
      priority: "medium",
      dueAt: null,
      links: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onTaskCreated(tempTask);
    setAddingToStatus(null);
    setAddTitle("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          projectId: defaultProjectId ?? undefined,
        }),
      });
      const created: Task = await res.json();
      // Replace temp with real — update via parent's handleUpdate logic
      onUpdate(tempId, created);
    } catch {
      onDelete(tempId);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px 24px 48px" }}>

        {STATUS_GROUPS.map((group) => {
          const groupTasks = tasks.filter((t) => t.status === group.id);
          if (groupTasks.length === 0 && addingToStatus !== group.id) return null;

          return (
            <div key={group.id} style={{ marginBottom: "8px" }}>
              {/* Group header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  marginBottom: "2px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: group.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.01em",
                    flex: 1,
                  }}
                >
                  {group.label}
                </span>
                {groupTasks.length > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {groupTasks.length}
                  </span>
                )}
                <button
                  onClick={() => openAdd(group.id)}
                  title={`Add to ${group.label}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    transition: "color 150ms, background 150ms",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>

              {/* Quick-add input */}
              {addingToStatus === group.id && (
                <div style={{ padding: "0 12px 6px" }}>
                  <input
                    ref={addInputRef}
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd(group.id);
                      if (e.key === "Escape") setAddingToStatus(null);
                    }}
                    onBlur={() => setTimeout(() => setAddingToStatus(null), 150)}
                    placeholder="Task title…"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Task rows */}
              {groupTasks.map((task) => {
                const due = formatDueDate(task.dueAt);
                const project = task.projectId ? projectMap[task.projectId] : null;

                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "9px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {/* Priority dot */}
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: PRIORITY_COLOR[task.priority] ?? "var(--text-muted)",
                        flexShrink: 0,
                        opacity: task.priority === "medium" ? 0.3 : 1,
                      }}
                    />

                    {/* Title */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: "13px",
                        fontWeight: 400,
                        color: task.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: task.status === "done" ? "line-through" : "none",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      {task.title}
                    </span>

                    {/* Project badge */}
                    {project && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: project.color,
                            flexShrink: 0,
                          }}
                        />
                        {project.name}
                      </span>
                    )}

                    {/* Priority label (non-medium only) */}
                    {task.priority !== "medium" && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: PRIORITY_COLOR[task.priority],
                          textTransform: "capitalize",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          minWidth: "44px",
                          textAlign: "right",
                        }}
                      >
                        {task.priority}
                      </span>
                    )}

                    {/* Due date */}
                    <span
                      style={{
                        fontSize: "11px",
                        color: due?.overdue ? "var(--danger)" : "var(--text-muted)",
                        fontWeight: due?.overdue ? 500 : 400,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        minWidth: "56px",
                        textAlign: "right",
                      }}
                    >
                      {due?.text ?? ""}
                    </span>
                  </button>
                );
              })}

              {/* Separator */}
              <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />
            </div>
          );
        })}

        {/* Empty state */}
        {tasks.length === 0 && addingToStatus === null && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 0",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>No tasks yet</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Use the + button next to a status group to add one
            </span>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        projects={projects}
        onClose={() => setSelectedTask(null)}
        onUpdate={(id, changes) => {
          setSelectedTask((prev) => (prev?.id === id ? { ...prev, ...changes } : prev));
          return onUpdate(id, changes);
        }}
        onDelete={(id) => {
          setSelectedTask(null);
          return onDelete(id);
        }}
      />
    </div>
  );
}
