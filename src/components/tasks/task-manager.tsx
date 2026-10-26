"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { actionCreateTask, actionToggleTask } from "@/app/actions";
import { formatDate } from "@/lib/format";
import type { Task, Collaboration, Brand } from "@/lib/types";
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  AlertCircle,
  Filter,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface TaskWithRelations extends Task {
  collaboration: Collaboration | null;
  brand: Brand | null;
}

interface TaskManagerProps {
  initialTasks: TaskWithRelations[];
  collaborations: Collaboration[];
}

export function TaskManager({ initialTasks, collaborations }: TaskManagerProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [collabFilter, setCollabFilter] = useState<string>("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (collabFilter !== "all" && t.collaboration_id !== collabFilter) return false;
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleToggle = (taskId: string, collabId?: string | null) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === "pending" ? "completed" : "pending";
          return {
            ...t,
            status: nextStatus,
            completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
          };
        }
        return t;
      })
    );

    startTransition(async () => {
      await actionToggleTask(taskId, collabId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric strip & Quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-xs">
            <span className="text-[var(--muted)]">Pending:</span>
            <span className="font-mono font-semibold text-[var(--foreground)]">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-xs">
            <span className="text-[var(--muted)]">Completed:</span>
            <span className="font-mono font-semibold text-[var(--cash)]">{completedCount}</span>
          </div>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-95 shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[var(--muted)] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Filters:</span>
          </div>

          {/* Status selector */}
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-[var(--radius-sm)] font-medium transition ${
                statusFilter === "pending"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-[var(--radius-sm)] font-medium transition ${
                statusFilter === "completed"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Done ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-[var(--radius-sm)] font-medium transition ${
                statusFilter === "all"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Collaboration filter */}
          <select
            value={collabFilter}
            onChange={(e) => setCollabFilter(e.target.value)}
            className="h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] max-w-[200px] truncate"
            aria-label="Filter by collaboration"
          >
            <option value="all">All Collaborations</option>
            {collaborations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter !== "all" || priorityFilter !== "all" || collabFilter !== "all") && (
          <button
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setCollabFilter("all");
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Task List Table / Cards */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">No tasks found</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              {statusFilter === "pending"
                ? "You have cleared all pending tasks! Add a new task to stay on top of deliverables."
                : "No tasks match your selected filter criteria."}
            </p>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-md)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredTasks.map((task) => {
              const isDone = task.status === "completed";
              const isOverdue =
                !isDone && task.due_date && task.due_date < new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={task.id}
                  className={`p-4 flex items-start gap-3.5 hover:bg-[var(--surface-2)] transition ${
                    isDone ? "opacity-60 bg-[var(--surface-2)]/30" : ""
                  }`}
                >
                  {/* Complete checkbox button */}
                  <button
                    onClick={() => handleToggle(task.id, task.collaboration_id)}
                    className="mt-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition flex-shrink-0"
                    title={isDone ? "Mark as pending" : "Mark as completed"}
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-[var(--cash)]" />
                    ) : (
                      <Square className="w-5 h-5 hover:border-[var(--primary)]" />
                    )}
                  </button>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isDone ? "line-through text-[var(--muted)]" : "text-[var(--foreground)]"
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Priority badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium uppercase font-mono ${
                          task.priority === "high"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : task.priority === "medium"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-zinc-500/10 text-zinc-600 border border-zinc-500/20"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Collaboration link if linked */}
                      {task.collaboration && (
                        <Link
                          href={`/collaborations/${task.collaboration.id}`}
                          className="text-xs px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition"
                        >
                          Deal: {task.collaboration.title}
                        </Link>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata footer */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted)] font-mono">
                      {task.due_date && (
                        <div
                          className={`flex items-center gap-1 ${
                            isOverdue ? "text-[var(--overdue)] font-semibold" : ""
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            Due: {formatDate(task.due_date)} {isOverdue && "(Overdue)"}
                          </span>
                        </div>
                      )}
                      {task.completed_at && (
                        <span className="text-[var(--cash)]">
                          Completed: {formatDate(task.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-lg w-full shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-base text-[var(--foreground)]">Create New Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                await actionCreateTask(formData);
                setShowNewTaskModal(false);
                window.location.reload();
              }}
              className="space-y-4 mt-4 text-xs"
            >
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Task Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Script review with client or Export draft reel"
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Description / Notes
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Details, deliverable links, or checklist items"
                  className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">Due Date</label>
                  <input
                    name="due_date"
                    type="date"
                    className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">Priority</label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Link to Collaboration (Optional)
                </label>
                <select
                  name="collaboration_id"
                  defaultValue=""
                  className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="">None (Independent task)</option>
                  {collaborations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
