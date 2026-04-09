"use client";

import { useRef, useState, useEffect } from "react";
import { LayoutDashboard, List, Plus, ChevronDown, Check, FolderOpen, Trash2, Pencil } from "lucide-react";
import type { Task } from "@/lib/api/tasks/schema";
import type { Project } from "@/lib/api/projects/schema";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";

type View = "board" | "list";

interface TasksViewProps {
  initialTasks: Task[];
  initialProjects: Project[];
}

export default function TasksView({ initialTasks, initialProjects }: TasksViewProps) {
  const [view, setView] = useState<View>("board");

  // Default to list on mobile — board is hard to use on small screens
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  // ─── Project creation ──────────────────────────────────────────────────────

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;

    setCreateError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCreateError(body.error ?? "Something went wrong — try again");
        return;
      }

      const created: Project = await res.json();
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created.id);
      setCreatingProject(false);
      setNewProjectName("");
      setProjectDropdownOpen(false);
    } catch {
      setCreateError("Something went wrong — try again");
    }
  }

  // ─── Project rename ────────────────────────────────────────────────────────

  function startRename(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
    setRenameError(null);
  }

  async function handleRename(projectId: string) {
    const name = renameValue.trim();
    if (!name) { cancelRename(); return; }

    const existing = projects.find((p) => p.id === projectId);
    if (existing?.name === name) { cancelRename(); return; }

    setRenameError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRenameError(body.error ?? "Something went wrong — try again");
        return;
      }

      const updated: Project = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      cancelRename();
    } catch {
      setRenameError("Something went wrong — try again");
    }
  }

  function cancelRename() {
    setRenamingProjectId(null);
    setRenameValue("");
    setRenameError(null);
  }

  // ─── Project delete ────────────────────────────────────────────────────────

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const taskCount = tasks.filter((t) => t.projectId === projectId).length;
    const message = taskCount > 0
      ? `Delete "${project.name}"? ${taskCount} task${taskCount === 1 ? "" : "s"} will be unassigned.`
      : `Delete "${project.name}"?`;

    if (!window.confirm(message)) return;

    // Optimistic
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    setTasks((prev) => prev.map((t) => t.projectId === projectId ? { ...t, projectId: null } : t));

    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    } catch {
      // If it fails, refresh would recover state — acceptable for now
    }
  }

  // ─── Task callbacks ────────────────────────────────────────────────────────

  async function handleUpdate(id: string, changes: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  function handleTaskCreated(task: Task) {
    setTasks((prev) => [task, ...prev]);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          background: "var(--bg-primary)",
        }}
      >
        {/* Project selector */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setProjectDropdownOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              background: selectedProject
                ? "color-mix(in srgb, var(--bg-surface) 60%, var(--accent) 40%)"
                : "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: selectedProject ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 150ms, border-color 150ms",
            }}
          >
            <FolderOpen size={13} strokeWidth={1.75} />
            <span>{selectedProject ? selectedProject.name : "All Projects"}</span>
            <ChevronDown size={12} strokeWidth={2} style={{ opacity: 0.6 }} />
          </button>

          {/* Dropdown */}
          {projectDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                minWidth: "220px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                zIndex: 50,
                overflow: "hidden",
                padding: "4px",
              }}
            >
              {/* All Projects */}
              <DropdownItem
                label="All Projects"
                isActive={selectedProjectId === null}
                onClick={() => { setSelectedProjectId(null); setProjectDropdownOpen(false); }}
              />

              {projects.length > 0 && (
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              )}

              {/* Project list */}
              {projects.map((p) => (
                <div key={p.id}>
                  {renamingProjectId === p.id ? (
                    /* Inline rename input */
                    <div style={{ padding: "4px 6px" }}>
                      <input
                        value={renameValue}
                        onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(p.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => setTimeout(cancelRename, 150)}
                        autoFocus
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          background: "var(--bg-surface)",
                          border: `1px solid ${renameError ? "var(--danger)" : "var(--accent)"}`,
                          borderRadius: "5px",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          outline: "none",
                        }}
                      />
                      {renameError && (
                        <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "3px", paddingLeft: "2px" }}>
                          {renameError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <DropdownItem
                      label={p.name}
                      color={p.color}
                      isActive={selectedProjectId === p.id}
                      onClick={() => { setSelectedProjectId(p.id); setProjectDropdownOpen(false); }}
                      onRename={(e) => startRename(p, e)}
                      onDelete={(e) => handleDeleteProject(p.id, e)}
                    />
                  )}
                </div>
              ))}

              {/* New project */}
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              {creatingProject ? (
                <div style={{ padding: "4px 6px" }}>
                  <input
                    ref={newProjectInputRef}
                    value={newProjectName}
                    onChange={(e) => { setNewProjectName(e.target.value); setCreateError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                      if (e.key === "Escape") { setCreatingProject(false); setNewProjectName(""); setCreateError(null); }
                    }}
                    autoFocus
                    placeholder="Project name…"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "var(--bg-surface)",
                      border: `1px solid ${createError ? "var(--danger)" : "var(--accent)"}`,
                      borderRadius: "5px",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  {createError ? (
                    <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "3px", paddingLeft: "2px" }}>
                      {createError}
                    </p>
                  ) : (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", paddingLeft: "2px" }}>
                      Enter to create · Esc to cancel
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setCreatingProject(true); setTimeout(() => newProjectInputRef.current?.focus(), 50); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    width: "100%",
                    padding: "6px 8px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "5px",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "background 100ms, color 100ms",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  }}
                >
                  <Plus size={12} strokeWidth={2} />
                  New project
                </button>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "2px",
            gap: "2px",
          }}
        >
          <ViewToggleButton
            label="Board"
            icon={<LayoutDashboard size={13} strokeWidth={1.75} />}
            isActive={view === "board"}
            onClick={() => setView("board")}
          />
          <ViewToggleButton
            label="List"
            icon={<List size={13} strokeWidth={1.75} />}
            isActive={view === "list"}
            onClick={() => setView("list")}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {view === "board" ? (
          <KanbanBoard
            key={selectedProjectId ?? "all"}
            initialTasks={filteredTasks}
            projects={projects}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onTaskCreated={handleTaskCreated}
            defaultProjectId={selectedProjectId}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            projects={projects}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onTaskCreated={handleTaskCreated}
            defaultProjectId={selectedProjectId}
          />
        )}
      </div>

      {/* Click-away to close project dropdown */}
      {projectDropdownOpen && (
        <div
          onClick={() => {
            setProjectDropdownOpen(false);
            setCreatingProject(false);
            setNewProjectName("");
            setCreateError(null);
            cancelRename();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DropdownItem({
  label,
  color,
  isActive,
  onClick,
  onRename,
  onDelete,
}: {
  label: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
  onRename?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "6px 8px",
          paddingRight: hovered && onDelete ? "56px" : "8px",
          background: isActive ? "var(--accent-subtle)" : hovered ? "var(--bg-surface)" : "transparent",
          border: "none",
          borderRadius: "5px",
          color: isActive ? "var(--accent)" : hovered ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "13px",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          transition: "background 100ms, color 100ms, padding-right 100ms",
        }}
      >
        {color ? (
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        ) : (
          <span style={{ width: "8px", height: "8px", flexShrink: 0 }} />
        )}
        <span style={{ flex: 1 }}>{label}</span>
        {isActive && !hovered && <Check size={12} strokeWidth={2.5} />}
      </button>

      {/* Action buttons — only on managed projects (have onDelete) */}
      {hovered && onDelete && (
        <div
          style={{
            position: "absolute",
            right: "6px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: "2px",
          }}
        >
          <IconAction icon={<Pencil size={11} strokeWidth={2} />} title="Rename" onClick={onRename!} />
          <IconAction icon={<Trash2 size={11} strokeWidth={2} />} title="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

function IconAction({
  icon,
  title,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        borderRadius: "4px",
        border: "none",
        background: "transparent",
        color: danger ? "var(--danger)" : "var(--text-muted)",
        cursor: "pointer",
        transition: "background 100ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "color-mix(in srgb, var(--danger) 12%, transparent)"
          : "var(--bg-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

function ViewToggleButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 8px",
        borderRadius: "4px",
        border: "none",
        background: isActive ? "var(--bg-primary)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: "12px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 150ms, color 150ms",
        boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
