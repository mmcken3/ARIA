"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Task } from "@/lib/api/tasks/schema";
import type { Project } from "@/lib/api/projects/schema";
import TaskCard from "./TaskCard";
import TaskDetailPanel from "./TaskDetailPanel";

// ─── Column config ────────────────────────────────────────────────────────────

type Status = "backlog" | "up_next" | "in_progress" | "done";

const COLUMNS: { id: Status; label: string; accent: string }[] = [
  { id: "backlog",     label: "Backlog",     accent: "var(--text-muted)" },
  { id: "up_next",    label: "Up Next",     accent: "var(--text-secondary)" },
  { id: "in_progress",label: "In Progress", accent: "var(--accent)" },
  { id: "done",       label: "Done",        accent: "var(--success)" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialTasks: Task[];
  projects: Project[];
  defaultProjectId?: string | null;
  onUpdate: (id: string, changes: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTaskCreated: (task: Task) => void;
}

export default function KanbanBoard({
  initialTasks,
  projects,
  defaultProjectId,
  onUpdate,
  onDelete,
  onTaskCreated,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const tasksByStatus = (status: Status) =>
    tasks.filter((t) => t.status === status);

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(taskId);
  }

  function handleDragOver(e: React.DragEvent, status: Status) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, toStatus: Status) {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingId(null);

    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === toStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: toStatus } : t))
    );

    try {
      await onUpdate(taskId, { status: toStatus });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  }

  // ─── Quick Add ─────────────────────────────────────────────────────────────

  function openAdd(status: Status) {
    setAddingTo(status);
    setAddTitle("");
    setTimeout(() => addInputRef.current?.focus(), 50);
  }

  async function handleQuickAdd(status: Status) {
    const title = addTitle.trim();
    if (!title) {
      setAddingTo(null);
      return;
    }

    // Optimistic placeholder
    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      userId: "",
      projectId: defaultProjectId ?? null,
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

    setTasks((prev) => [tempTask, ...prev]);
    onTaskCreated(tempTask);
    setAddingTo(null);
    setAddTitle("");

    // Persist
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, projectId: defaultProjectId ?? undefined }),
      });
      const created: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  }

  // ─── Update / Delete ───────────────────────────────────────────────────────

  async function handleUpdate(id: string, changes: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    setSelectedTask((prev) => (prev?.id === id ? { ...prev, ...changes } : prev));
    await onUpdate(id, changes);
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await onDelete(id);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {COLUMNS.map((col) => {
        const colTasks = tasksByStatus(col.id);
        const isOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              borderRight: "1px solid var(--border)",
              background: isOver
                ? "color-mix(in srgb, var(--bg-primary) 93%, var(--accent) 7%)"
                : "var(--bg-primary)",
              transition: "background 150ms ease",
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px 12px",
                flexShrink: 0,
                gap: "8px",
              }}
            >
              {/* Status dot */}
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: col.accent,
                  flexShrink: 0,
                }}
              />

              {/* Column name */}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.01em",
                  flex: 1,
                }}
              >
                {col.label}
              </span>

              {/* Count */}
              {colTasks.length > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {colTasks.length}
                </span>
              )}

              {/* Add button */}
              <button
                onClick={() => openAdd(col.id)}
                title={`Add to ${col.label}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  transition: "color 150ms, background 150ms",
                  flexShrink: 0,
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
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>

            {/* Quick-add input */}
            {addingTo === col.id && (
              <div style={{ padding: "0 12px 8px" }}>
                <input
                  ref={addInputRef}
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAdd(col.id);
                    if (e.key === "Escape") setAddingTo(null);
                  }}
                  onBlur={() => {
                    // Small delay so Enter keydown fires before blur
                    setTimeout(() => setAddingTo(null), 150);
                  }}
                  placeholder="Task title…"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--accent)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", paddingLeft: "2px" }}>
                  Enter to add · Esc to cancel
                </p>
              </div>
            )}

            {/* Divider below header */}
            <div style={{ height: "1px", background: "var(--border)", flexShrink: 0 }} />

            {/* Cards */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {colTasks.length === 0 && !isOver && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "60px",
                    borderRadius: "6px",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    No tasks
                  </span>
                </div>
              )}

              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggingId === task.id}
                  onClick={() => setSelectedTask(task)}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}

              {/* Drop target hint when dragging over */}
              {isOver && draggingId && (
                <div
                  style={{
                    height: "4px",
                    borderRadius: "2px",
                    background: "var(--accent)",
                    opacity: 0.5,
                    margin: "2px 0",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        projects={projects}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
