import { Header } from "@/components/header";
import { getTasks, getCollaborations } from "@/lib/data/api";
import { TaskManager } from "@/components/tasks/task-manager";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, collaborations] = await Promise.all([getTasks(), getCollaborations()]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Tasks & Deadlines"
        subtitle="Deliverables checklists, client reviews, and production deadlines"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <TaskManager initialTasks={tasks} collaborations={collaborations} />
      </div>
    </div>
  );
}
