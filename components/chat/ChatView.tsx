"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/db/queries/conversations";
import type { StreamEvent } from "@/lib/ai/provider";
import ContextStrip from "./ContextStrip";
import MessageBubble, { StreamingBubble } from "./MessageBubble";
import InputBar from "./InputBar";

interface ToolAction {
  name: string;
  result: unknown;
}

interface StreamingState {
  text: string;
  toolActions: ToolAction[];
}

interface ChatViewProps {
  initialMessages: Message[];
  tasksInProgress: number;
}

export default function ChatView({ initialMessages, tasksInProgress }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState<StreamingState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inProgressCount, setInProgressCount] = useState(tasksInProgress);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSend(content: string) {
    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      conversationId: "",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setStreaming({ text: "", toolActions: [] });
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok || !res.body) {
        setStreaming(null);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      const toolActions: ToolAction[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "text") {
              fullText += event.content;
              setStreaming({ text: fullText, toolActions: [...toolActions] });
            } else if (event.type === "tool") {
              toolActions.push({ name: event.name, result: event.result });
              setStreaming({ text: fullText, toolActions: [...toolActions] });
              // Refresh in-progress count if tasks were touched
              if (event.name === "create_task" || event.name === "update_task" || event.name === "delete_task") {
                refreshInProgressCount();
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Finalize — replace streaming state with persisted messages
      if (toolActions.length > 0 || fullText) {
        setMessages((prev) => [
          ...prev,
          ...(fullText
            ? [{
                id: `streamed-${Date.now()}`,
                conversationId: "",
                role: "assistant" as const,
                content: fullText,
                createdAt: new Date().toISOString(),
              }]
            : []),
        ]);
      }

      setStreaming(null);
      setIsStreaming(false);
    } catch {
      setStreaming(null);
      setIsStreaming(false);
    }
  }

  async function refreshInProgressCount() {
    try {
      const res = await fetch("/api/tasks?status=in_progress&limit=100");
      if (res.ok) {
        const data = await res.json();
        setInProgressCount(data.total ?? 0);
      }
    } catch {
      // non-critical
    }
  }

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <ContextStrip tasksInProgress={inProgressCount} />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Empty state */}
          {isEmpty && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 0 40px",
                gap: "12px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "28px",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                ◆ ARIA
              </span>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "320px", lineHeight: 1.6 }}>
                Your personal AI operating system. Ask about your tasks, plan your day, or just think out loud.
              </p>
            </div>
          )}

          {/* Message history */}
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} index={i} />
          ))}

          {/* Live streaming response */}
          {isStreaming && streaming !== null && (
            <StreamingBubble
              content={streaming.text}
              toolActions={streaming.toolActions}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
