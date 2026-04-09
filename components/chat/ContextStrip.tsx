"use client";

import Link from "next/link";
import { CheckSquare, Calendar, Mail } from "lucide-react";

interface ContextStripProps {
  tasksInProgress: number;
}

export default function ContextStrip({ tasksInProgress }: ContextStripProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "8px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-primary)",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {/* Tasks in progress */}
      <Link
        href="/tasks"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "6px",
          textDecoration: "none",
          color: tasksInProgress > 0 ? "var(--accent)" : "var(--text-muted)",
          background: tasksInProgress > 0 ? "var(--accent-subtle)" : "transparent",
          transition: "background 150ms",
          flexShrink: 0,
        }}
      >
        <CheckSquare size={12} strokeWidth={1.75} />
        <span style={{ fontSize: "12px", fontWeight: 500 }}>
          {tasksInProgress > 0
            ? `${tasksInProgress} in progress`
            : "No active tasks"}
        </span>
      </Link>

      <Divider />

      {/* Next meeting — placeholder until calendar integration */}
      <ContextPill
        icon={<Calendar size={12} strokeWidth={1.75} />}
        label="Next meeting"
        value="—"
        placeholder
      />

      <Divider />

      {/* Unread — placeholder until Gmail integration */}
      <ContextPill
        icon={<Mail size={12} strokeWidth={1.75} />}
        label="Unread"
        value="—"
        placeholder
      />
    </div>
  );
}

function Divider() {
  return (
    <span
      style={{
        width: "1px",
        height: "14px",
        background: "var(--border)",
        flexShrink: 0,
        margin: "0 4px",
      }}
    />
  );
}

function ContextPill({
  icon,
  label,
  value,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "6px",
        color: placeholder ? "var(--text-muted)" : "var(--text-secondary)",
        opacity: placeholder ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: "12px" }}>
        <span style={{ color: "var(--text-muted)" }}>{label}: </span>
        <span style={{ fontWeight: 450 }}>{value}</span>
      </span>
    </div>
  );
}
