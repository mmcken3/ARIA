import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { listTasks } from "@/lib/db/queries/tasks";
import { listProjects } from "@/lib/db/queries/projects";
import TasksView from "@/components/tasks/TasksView";

export default async function TasksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [{ tasks }, projects] = await Promise.all([
    listTasks(session.user.id, { limit: 500, offset: 0 }),
    listProjects(session.user.id),
  ]);

  return <TasksView initialTasks={tasks} initialProjects={projects} />;
}
