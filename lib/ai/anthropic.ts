import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { AIProvider, AIMessage, AIContext, StreamEvent } from "./provider";
import { buildSystemPrompt } from "./context-builder";
import { TOOLS, SILENT_TOOLS, executeTool } from "./tools";

let _client: Anthropic | undefined;
function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ─── Implementation ───────────────────────────────────────────────────────────

const anthropicProvider: AIProvider = {
  respond(history: AIMessage[], context: AIContext, userId: string): ReadableStream<Uint8Array> {
    const client = getClient();
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        function emit(event: StreamEvent) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }

        // Build mutable message array for the tool loop
        const messages: MessageParam[] = history.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          // Tool loop — max 5 turns to prevent infinite loops
          for (let turn = 0; turn < 5; turn++) {
            const stream = client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              system: buildSystemPrompt(context),
              tools: TOOLS,
              messages,
            });

            // Stream text chunks as they arrive
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta" &&
                event.delta.text
              ) {
                emit({ type: "text", content: event.delta.text });
              }
            }

            const final = await stream.finalMessage();

            if (final.stop_reason === "tool_use") {
              // Add assistant turn to history
              messages.push({ role: "assistant", content: final.content });

              // Execute all tool calls and collect results
              const toolResults: MessageParam["content"] = [];

              for (const block of final.content) {
                if (block.type !== "tool_use") continue;

                const result = await executeTool(
                  userId,
                  block.name,
                  block.input as Record<string, unknown>
                );

                // Emit card for action tools (not silent reads)
                if (!SILENT_TOOLS.has(block.name)) {
                  emit({ type: "tool", name: block.name, result });
                }

                // Feed result back to Claude
                if (Array.isArray(toolResults)) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: JSON.stringify(result),
                  });
                }
              }

              messages.push({ role: "user", content: toolResults });
              continue; // next turn
            }

            // end_turn — done
            break;
          }
        } catch (err) {
          // Emit error as a text event so client shows something
          emit({ type: "text", content: "\n\nSomething went wrong — please try again." });
          // Log message only — avoid emitting SDK response objects that may contain request metadata
          console.error("[ARIA] stream error:", err instanceof Error ? err.message : "unknown error");
        } finally {
          emit({ type: "done" });
          controller.close();
        }
      },
    });
  },
};

export const ai = anthropicProvider;
