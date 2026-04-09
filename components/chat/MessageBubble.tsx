"use client";

import { motion } from "framer-motion";
import type { Message } from "@/lib/db/queries/conversations";

interface MessageBubbleProps {
  message: Message;
  index: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: "4px",
      }}
    >
      {/* Role label for ARIA only */}
      {!isUser && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            paddingLeft: "2px",
          }}
        >
          ARIA
        </span>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: "min(580px, 80%)",
          padding: "10px 14px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
          background: isUser
            ? "color-mix(in srgb, var(--accent) 18%, var(--bg-surface))"
            : "var(--bg-surface)",
          border: `1px solid ${isUser ? "color-mix(in srgb, var(--accent) 30%, var(--border))" : "var(--border)"}`,
          fontSize: "14px",
          lineHeight: 1.55,
          color: "var(--text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          paddingLeft: isUser ? 0 : "2px",
          paddingRight: isUser ? "2px" : 0,
        }}
      >
        {formatTime(message.createdAt)}
      </span>
    </motion.div>
  );
}

// ─── Streaming bubble (grows as text + tool events arrive) ───────────────────

import ToolActionCard from "./ToolActionCard";

interface ToolAction {
  name: string;
  result: unknown;
}

interface StreamingBubbleProps {
  content: string;
  toolActions?: ToolAction[];
}

export function StreamingBubble({ content, toolActions = [] }: StreamingBubbleProps) {
  const showThinking = !content && toolActions.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "8px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--accent)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          paddingLeft: "2px",
        }}
      >
        ARIA
      </span>

      {/* Tool action cards */}
      {toolActions.map((action, i) => (
        <ToolActionCard key={i} name={action.name} result={action.result} index={i} />
      ))}

      {/* Text bubble */}
      {(content || showThinking) && (
        <div
          style={{
            maxWidth: "min(580px, 80%)",
            padding: "10px 14px",
            borderRadius: "4px 16px 16px 16px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            fontSize: "14px",
            lineHeight: 1.55,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content || (
            <span style={{ color: "var(--text-muted)" }}>
              <ThinkingDots />
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <motion.span
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      ···
    </motion.span>
  );
}
