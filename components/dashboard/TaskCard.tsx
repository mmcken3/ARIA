"use client";

import type { Task } from "@/lib/api/tasks/schema";

const PRIORITY_DOT: Record<string, string> = {
  low:    "var(--text-muted)",
  medium: "var(--border-strong)",
  high:   "var(--warning)",
  urgent: "var(--danger)",
};

function formatDueDate(dueAt: string | null): { text: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  // Compare calendar days, not exact timestamps
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)  return { text: "Overdue",   overdue: true };
  if (diffDays === 0) return { text: "Today",     overdue: false };
  if (diffDays === 1) return { text: "Tomorrow",  overdue: false };
  if (diffDays <= 6)  return { text: `${diffDays}d`, overdue: false };
  return {
    text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export default function TaskCard({
  task,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const due = formatDueDate(task.dueAt);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "10px 12px",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 150ms ease, border-color 150ms ease, background 150ms ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--bg-surface) 95%, var(--accent) 5%)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
      }}
    >
      {/* Title */}
      <p
        style={{
          fontSize: "13px",
          fontWeight: 450,
          color: "var(--text-primary)",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: due || task.priority !== "medium" ? "8px" : 0,
        }}
      >
        {task.title}
      </p>

      {/* Footer: priority + due date */}
      {(task.priority !== "medium" || due) && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Priority dot — only show if not medium (medium is default, no noise) */}
          {task.priority !== "medium" && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: PRIORITY_DOT[task.priority] ?? "var(--border-strong)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: PRIORITY_DOT[task.priority] ?? "var(--text-muted)",
                  textTransform: "capitalize",
                  letterSpacing: "0.01em",
                }}
              >
                {task.priority}
              </span>
            </span>
          )}

          {/* Spacer */}
          {task.priority !== "medium" && due && (
            <span style={{ flex: 1 }} />
          )}

          {/* Due date */}
          {due && (
            <span
              style={{
                fontSize: "11px",
                color: due.overdue ? "var(--danger)" : "var(--text-muted)",
                fontWeight: due.overdue ? 500 : 400,
              }}
            >
              {due.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
