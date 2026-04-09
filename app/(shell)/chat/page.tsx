import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { ensureConversation, getMessages } from "@/lib/db/queries/conversations";
import { listTasks } from "@/lib/db/queries/tasks";
import ChatView from "@/components/chat/ChatView";

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [conversation, { tasks }] = await Promise.all([
    ensureConversation(session.user.id),
    listTasks(session.user.id, { limit: 500, offset: 0 }),
  ]);

  const messages = await getMessages(conversation.id, 200);
  const tasksInProgress = tasks.filter((t) => t.status === "in_progress").length;

  return <ChatView initialMessages={messages} tasksInProgress={tasksInProgress} />;
}
