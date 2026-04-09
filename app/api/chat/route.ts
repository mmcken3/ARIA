import { getSession, unauthorized } from "@/lib/api/session";
import { ensureConversation, saveMessage, getMessages } from "@/lib/db/queries/conversations";
import { buildContext } from "@/lib/ai/context-builder";
import { ai } from "@/lib/ai/anthropic";
import type { StreamEvent } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * Send a user message. Streams NDJSON events back:
 *   {"type":"text","content":"..."}    — text chunk
 *   {"type":"tool","name":"...","result":{...}} — tool action completed
 *   {"type":"done"}                    — end of response
 */
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return Response.json({ error: "content is required" }, { status: 400 });
  if (content.length > 4000) {
    return Response.json({ error: "Message too long (max 4000 characters)" }, { status: 400 });
  }

  const conversation = await ensureConversation(session.user.id);

  // Save user message, then fetch full history
  await saveMessage(conversation.id, "user", content);
  const history = await getMessages(conversation.id, 100);
  const context = await buildContext(session.user.id);

  // Get the NDJSON event stream from the AI provider
  const eventStream = ai.respond(
    history.map((m) => ({ role: m.role, content: m.content })),
    context,
    session.user.id
  );

  // Tee so we can accumulate text for DB save while client reads
  const [clientStream, saveStream] = eventStream.tee();

  // Accumulate text content and save on completion
  (async () => {
    const reader = saveStream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
          if (event.type === "text") fullText += event.content;
        } catch {
          // skip malformed lines
        }
      }
    }

    if (fullText) await saveMessage(conversation.id, "assistant", fullText);
  })();

  return new Response(clientStream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
