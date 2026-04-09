"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Task } from "@/lib/api/tasks/schema";

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function getDueInfo(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { label: "due today", overdue: true };
  if (diffDays === 1) return { label: "tomorrow", overdue: false };
  return { label: `in ${diffDays}d`, overdue: false };
}

function getSituationLine(tasks: Task[]): string {
  const inFlight = tasks.filter((t) => t.status === "in_progress");
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.dueAt && new Date(t.dueAt) < new Date()
  );
  if (tasks.length === 0) return "Nothing here yet.";
  if (inFlight.length === 0 && overdue.length === 0) return "All clear.";
  const parts: string[] = [];
  if (inFlight.length > 0)
    parts.push(`${inFlight.length} task${inFlight.length > 1 ? "s" : ""} in flight`);
  if (overdue.length > 0)
    parts.push(`${overdue.length} overdue`);
  return parts.join(" · ") + ".";
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "urgent",
  high: "high",
  medium: "med",
  low: "low",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--danger)",
  high: "var(--warning)",
  medium: "var(--text-muted)",
  low: "var(--border-strong)",
};

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, dim = false }: { task: Task; dim?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const due = getDueInfo(task.dueAt);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "12px",
        padding: "10px 10px 10px 12px",
        margin: "0 -12px",
        borderBottom: "1px solid var(--border)",
        background: hovered ? "var(--bg-secondary)" : "transparent",
        transition: "background 100ms",
        opacity: dim ? 0.55 : 1,
      }}
    >
      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: "13.5px",
          color: "var(--text-primary)",
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task.title}
      </span>

      {/* Due date */}
      {due && (
        <span
          style={{
            fontSize: "11.5px",
            fontFamily: "var(--font-mono)",
            color: due.overdue ? "var(--warning)" : "var(--text-muted)",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {due.label}
        </span>
      )}

      {/* Priority */}
      <span
        style={{
          fontSize: "10.5px",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.03em",
          color: PRIORITY_COLOR[task.priority] ?? "var(--text-muted)",
          textTransform: "uppercase",
          flexShrink: 0,
          minWidth: "38px",
          textAlign: "right",
        }}
      >
        {PRIORITY_LABEL[task.priority] ?? task.priority}
      </span>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
  index,
  accentCount = false,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
  index: number;
  accentCount?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.12 + index * 0.07, ease: EASE }}
      style={{ marginBottom: "36px" }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 600,
            color: accentCount && count > 0 ? "var(--accent)" : "var(--text-muted)",
            opacity: count === 0 ? 0.4 : 1,
          }}
        >
          {count}
        </span>
      </div>

      {children}
    </motion.div>
  );
}

// ─── Empty row ────────────────────────────────────────────────────────────────

function EmptyRow({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "14px 0",
        fontSize: "13px",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
        opacity: 0.6,
      }}
    >
      {message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ paddingTop: "40px" }}>
      {/* Headline skeleton */}
      <div
        style={{
          height: "32px",
          width: "260px",
          borderRadius: "4px",
          background: "var(--bg-secondary)",
          marginBottom: "8px",
          animation: "shimmer 1.4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: "13px",
          width: "120px",
          borderRadius: "4px",
          background: "var(--bg-secondary)",
          marginBottom: "48px",
          animation: "shimmer 1.4s ease-in-out infinite",
          animationDelay: "0.1s",
        }}
      />

      {/* Section skeletons */}
      {[4, 3].map((rows, si) => (
        <div key={si} style={{ marginBottom: "36px" }}>
          <div
            style={{
              height: "1px",
              background: "var(--border-strong)",
              marginBottom: "1px",
            }}
          />
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "40px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  height: "11px",
                  width: `${55 + ((i * 17) % 30)}%`,
                  borderRadius: "3px",
                  background: "var(--bg-secondary)",
                  animation: "shimmer 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks?limit=100")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const inFlight  = tasks.filter((t) => t.status === "in_progress");
  const upNext    = tasks.filter((t) => t.status === "up_next");
  const backlog   = tasks.filter((t) => t.status === "backlog");
  const now       = new Date();
  const overdue   = tasks.filter(
    (t) => t.status !== "done" && t.dueAt && new Date(t.dueAt) < now
  );
  const urgent    = tasks.filter(
    (t) => t.status !== "done" && t.status !== "in_progress" && t.priority === "urgent"
  );

  // Backlog priority breakdown
  const backlogByPriority = {
    urgent: backlog.filter((t) => t.priority === "urgent").length,
    high:   backlog.filter((t) => t.priority === "high").length,
    medium: backlog.filter((t) => t.priority === "medium").length,
    low:    backlog.filter((t) => t.priority === "low").length,
  };

  if (loading) return (
    <div style={{ maxWidth: "680px", padding: "0 40px" }}>
      <Skeleton />
    </div>
  );

  const situation = getSituationLine(tasks);

  return (
    <div style={{ maxWidth: "680px", padding: "40px 40px 80px" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        style={{ marginBottom: "44px" }}
      >
        <p
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            marginBottom: "10px",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          {today}
        </p>

        {/* Situation headline */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 3vw, 30px)",
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.15,
            marginBottom: "10px",
            letterSpacing: "-0.01em",
          }}
        >
          {situation}
        </h1>

        {/* Subline — task totals */}
        {tasks.length > 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {[
              inFlight.length  > 0 && `${inFlight.length} in progress`,
              upNext.length    > 0 && `${upNext.length} up next`,
              backlog.length   > 0 && `${backlog.length} in backlog`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </motion.div>

      {/* Needs Attention — only shown when relevant */}
      {(overdue.length > 0 || urgent.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08, ease: EASE }}
          style={{ marginBottom: "36px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "8px",
              borderBottom: `1px solid color-mix(in srgb, var(--warning) 35%, var(--border))`,
              marginBottom: "0",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--warning)",
                opacity: 0.85,
              }}
            >
              Needs Attention
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--warning)",
              }}
            >
              {overdue.length + urgent.length}
            </span>
          </div>
          {[...overdue, ...urgent.filter((t) => !overdue.includes(t))]
            .slice(0, 5)
            .map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
        </motion.div>
      )}

      {/* In Flight */}
      <Section label="In Flight" count={inFlight.length} index={0} accentCount>
        {inFlight.length === 0 ? (
          <EmptyRow message="Nothing in progress." />
        ) : (
          inFlight.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      {/* Up Next */}
      <Section label="Up Next" count={upNext.length} index={1}>
        {upNext.length === 0 ? (
          <EmptyRow message="Queue is clear." />
        ) : (
          <>
            {upNext.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} />)}
            {upNext.length > 6 && (
              <Link
                href="/tasks"
                style={{
                  display: "block",
                  paddingTop: "10px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  opacity: 0.7,
                  transition: "opacity 150ms",
                }}
              >
                +{upNext.length - 6} more in Tasks →
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Backlog — shown as priority breakdown, not a list */}
      <Section label="Backlog" count={backlog.length} index={2}>
        {backlog.length === 0 ? (
          <EmptyRow message="Backlog is empty." />
        ) : (
          <div style={{ padding: "4px 0" }}>
            {(["urgent", "high", "medium", "low"] as const)
              .filter((p) => backlogByPriority[p] > 0)
              .map((p, i, arr) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: PRIORITY_COLOR[p],
                    }}
                  >
                    {p}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {backlogByPriority[p]} task{backlogByPriority[p] !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* Footer — integration placeholders */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5, ease: EASE }}
        style={{
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--text-muted)", opacity: 0.6, lineHeight: 1.5 }}>
          Calendar · Gmail — not connected.
          <br />
          Connect in{" "}
          <Link
            href="/settings"
            style={{ color: "var(--text-muted)", textDecoration: "underline", opacity: 0.8 }}
          >
            Settings
          </Link>{" "}
          to see your full picture.
        </p>
        <Link
          href="/tasks"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            textDecoration: "none",
            opacity: 0.5,
            flexShrink: 0,
            marginLeft: "24px",
            transition: "opacity 150ms",
          }}
        >
          All tasks →
        </Link>
      </motion.div>
    </div>
  );
}
