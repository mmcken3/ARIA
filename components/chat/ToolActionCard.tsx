"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle } from "lucide-react";

// ─── Label builders ───────────────────────────────────────────────────────────

function getLabel(name: string, result: unknown): string {
  const r = result as { ok: boolean; data?: unknown; error?: string };

  if (!r.ok) {
    return r.error ?? "Action failed";
  }

  const data = r.data as Record<string, unknown> | undefined;

  switch (name) {
    case "create_task":
      return `Created task · ${data?.title ?? ""}`;
    case "update_task":
      return `Updated task · ${data?.title ?? ""}`;
    case "delete_task":
      return `Deleted task`;
    case "create_project":
      return `Created project · ${data?.name ?? ""}`;
    case "write_memory": {
      const snippet = typeof data?.content === "string" && data.content.length > 60
        ? data.content.slice(0, 60) + "…"
        : (data?.content ?? "");
      return `Remembered · ${snippet}`;
    }
    case "delete_memory":
      return `Forgot memory entry`;
    default:
      return name.replace(/_/g, " ");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ToolActionCardProps {
  name: string;
  result: unknown;
  index: number;
}

export default function ToolActionCard({ name, result, index }: ToolActionCardProps) {
  const r = result as { ok: boolean };
  const label = getLabel(name, result);
  const success = r.ok;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 10px",
        borderRadius: "6px",
        background: success
          ? "color-mix(in srgb, var(--accent) 10%, var(--bg-surface))"
          : "color-mix(in srgb, var(--danger) 10%, var(--bg-surface))",
        border: `1px solid ${success ? "color-mix(in srgb, var(--accent) 25%, var(--border))" : "color-mix(in srgb, var(--danger) 25%, var(--border))"}`,
        alignSelf: "flex-start",
      }}
    >
      {success ? (
        <CheckCircle size={12} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
      ) : (
        <AlertCircle size={12} strokeWidth={2} style={{ color: "var(--danger)", flexShrink: 0 }} />
      )}
      <span
        style={{
          fontSize: "12px",
          color: success ? "var(--accent)" : "var(--danger)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}
