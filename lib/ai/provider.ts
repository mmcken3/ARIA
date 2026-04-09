import type { Task } from "@/lib/api/tasks/schema";
import type { MemoryEntry } from "@/lib/db/queries/memory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIContext {
  tasks: Task[];
  memories: MemoryEntry[];
}

// Events emitted as NDJSON lines in the response stream
export type StreamEvent =
  | { type: "text"; content: string }
  | { type: "tool"; name: string; result: unknown }
  | { type: "done" };

// ─── Interface ────────────────────────────────────────────────────────────────

export interface AIProvider {
  /**
   * Respond to a conversation with tool use support.
   * Returns a ReadableStream of NDJSON lines (one StreamEvent per line).
   * The caller is responsible for persisting the completed text response.
   */
  respond(
    history: AIMessage[],
    context: AIContext,
    userId: string
  ): ReadableStream<Uint8Array>;
}
