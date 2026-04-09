import { getSession, unauthorized } from "@/lib/api/session";
import { ensureConversation, getMessages } from "@/lib/db/queries/conversations";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/messages
 * Returns the full message history for the user's conversation.
 * Creates the conversation record if this is the first visit.
 */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();

  const conversation = await ensureConversation(session.user.id);
  const history = await getMessages(conversation.id, 200);

  return Response.json({ conversationId: conversation.id, messages: history });
}
