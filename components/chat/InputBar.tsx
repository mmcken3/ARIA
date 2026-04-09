"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

const SLASH_COMMANDS = [
  { command: "/task",  description: "Create or update a task" },
  { command: "/brief", description: "Get your morning brief" },
  { command: "/email", description: "Compose or summarize email" },
];

interface InputBarProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const [showSlashHint, setShowSlashHint] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    setShowSlashHint(v.startsWith("/") && !v.includes(" "));
    setSelectedCommand(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Slash command navigation
    if (showSlashHint) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommand((i) => (i + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommand((i) => (i - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey)) {
        const filtered = getFilteredCommands();
        if (filtered.length > 0) {
          e.preventDefault();
          setValue((filtered[selectedCommand]?.command ?? "") + " ");
          setShowSlashHint(false);
          return;
        }
      }
      if (e.key === "Escape") {
        setShowSlashHint(false);
        return;
      }
    }

    // CMD+Enter or Ctrl+Enter to send
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function getFilteredCommands() {
    if (value === "/") return SLASH_COMMANDS;
    const query = value.toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(query));
  }

  function selectCommand(command: string) {
    setValue(command + " ");
    setShowSlashHint(false);
    textareaRef.current?.focus();
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setShowSlashHint(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const filteredCommands = getFilteredCommands();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      style={{
        padding: "12px 20px 16px",
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Slash command hint */}
      {showSlashHint && filteredCommands.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% - 8px)",
            left: "20px",
            right: "20px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
            overflow: "hidden",
            padding: "4px",
          }}
        >
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.command}
              onMouseDown={(e) => { e.preventDefault(); selectCommand(cmd.command); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "7px 10px",
                background: i === selectedCommand ? "var(--accent-subtle)" : "transparent",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: i === selectedCommand ? "var(--accent)" : "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  minWidth: "64px",
                }}
              >
                {cmd.command}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {cmd.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "10px 12px 10px 16px",
          transition: "border-color 150ms",
        }}
        onFocus={() => {}}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message ARIA…"
          rows={1}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontFamily: "var(--font-body)",
            lineHeight: 1.5,
            overflowY: "hidden",
            minHeight: "21px",
            maxHeight: "160px",
          }}
        />

        {/* Send / loading button */}
        <button
          onClick={submit}
          disabled={!canSend}
          title={disabled ? "ARIA is responding…" : "Send (⌘↵)"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            border: "none",
            background: disabled
              ? "var(--accent-subtle)"
              : canSend
              ? "var(--accent)"
              : "var(--bg-primary)",
            color: disabled
              ? "var(--accent)"
              : canSend
              ? "white"
              : "var(--text-muted)",
            cursor: canSend ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 150ms, color 150ms",
          }}
        >
          {disabled ? (
            <Loader2
              size={15}
              strokeWidth={2.5}
              style={{
                animation: "spin 0.8s linear infinite",
              }}
            />
          ) : (
            <ArrowUp size={15} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Status / hint */}
      <p
        style={{
          fontSize: "11px",
          color: disabled ? "var(--accent)" : "var(--text-muted)",
          textAlign: "center",
          marginTop: "6px",
          opacity: disabled ? 0.8 : 0.6,
          transition: "color 150ms, opacity 150ms",
        }}
      >
        {disabled ? "ARIA is responding…" : "⌘↵ to send · / for commands"}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
