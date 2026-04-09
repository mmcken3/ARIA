"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, ExternalLink } from "lucide-react";
import type { Task } from "@/lib/api/tasks/schema";
import type { Project } from "@/lib/api/projects/schema";

const STATUS_OPTIONS = [
  { value: "backlog",     label: "Backlog" },
  { value: "up_next",    label: "Up Next" },
  { value: "in_progress",label: "In Progress" },
  { value: "done",       label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITY_COLOR: Record<string, string> = {
  low:    "var(--text-muted)",
  medium: "var(--text-secondary)",
  high:   "var(--warning)",
  urgent: "var(--danger)",
};

interface TaskDetailPanelProps {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TaskDetailPanel({
  task,
  projects,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailPanelProps) {
  const [local, setLocal] = useState<Task | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local state when task changes
  useEffect(() => {
    setLocal(task);
  }, [task?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save(changes: Partial<Task>) {
    if (!task) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(task.id, changes);
    }, 500);
  }

  function handleChange<K extends keyof Task>(field: K, value: Task[K]) {
    if (!local) return;
    const updated = { ...local, [field]: value };
    setLocal(updated);
    save({ [field]: value });
  }

  function handleDelete() {
    if (!task) return;
    onDelete(task.id);
    onClose();
  }

  const isOpen = task !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "var(--bg-overlay)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 90vw)",
          zIndex: 70,
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {local && (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Task
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={handleDelete}
                  title="Delete task"
                  style={{
                    padding: "6px",
                    borderRadius: "5px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    transition: "color 150ms, background 150ms",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--danger) 10%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "6px",
                    borderRadius: "5px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
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
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {/* Title */}
              <textarea
                value={local.title}
                onChange={(e) => handleChange("title", e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  marginBottom: "16px",
                  padding: 0,
                }}
                placeholder="Task title"
              />

              {/* Status + Priority row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <select
                  value={local.status}
                  onChange={(e) => handleChange("status", e.target.value as Task["status"])}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                <select
                  value={local.priority}
                  onChange={(e) => handleChange("priority", e.target.value as Task["priority"])}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: PRIORITY_COLOR[local.priority] ?? "var(--text-secondary)",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              {projects.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Project
                  </label>
                  <select
                    value={local.projectId ?? ""}
                    onChange={(e) => handleChange("projectId", e.target.value || null)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: local.projectId ? "var(--text-secondary)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Due date */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Due date
                </label>
                <input
                  type="datetime-local"
                  value={local.dueAt ? local.dueAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    handleChange("dueAt", e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: local.dueAt ? "var(--text-secondary)" : "var(--text-muted)",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Description
                </label>
                <textarea
                  value={local.description ?? ""}
                  onChange={(e) => handleChange("description", e.target.value || null)}
                  rows={5}
                  placeholder="Add a description…"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    resize: "vertical",
                    outline: "none",
                    minHeight: "100px",
                  }}
                />
              </div>

              {/* Links */}
              {local.links.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Links
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {local.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 10px",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--accent)",
                          fontSize: "12px",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={11} />
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Created {new Date(local.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
