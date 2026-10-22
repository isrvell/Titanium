import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { getPriority, initials, type TaskData } from "@/components/tasks";
import { TaskDrawer } from "@/components/tasks";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, GitBranch, Inbox as InboxIcon } from "lucide-react";

/**
 * Inbox = tasks assigned to me that still need attention.
 * (DONE/CANCELLED are filtered out.)
 */
export function InboxPage() {
  const { data: session } = useSession();
  const [assigned, setAssigned] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const t = await api.get<TaskData[]>(`/tasks?assigneeId=${session.user.id}`);
      setAssigned(t);
    } catch {
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => { load(); }, [load]);

  const active = assigned.filter((t) => !["DONE", "CANCELLED"].includes(t.status));

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Inbox</h2>
        <span className="text-sm text-muted-foreground">{active.length} assigned to you</span>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <InboxIcon className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Nothing assigned to you.</p>
          <p className="text-xs text-muted-foreground/60">Enjoy the calm.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {active.map((task) => {
            const p = getPriority(task.priority);
            const PIcon = p.icon;
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.project?.color ?? "#6b7280" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.project?.name}
                    {task._count.comments > 0 && (
                      <span className="flex items-center gap-0.5"><MessageSquare className="size-3" />{task._count.comments}</span>
                    )}
                    {task._count.subtasks > 0 && (
                      <span className="flex items-center gap-0.5"><GitBranch className="size-3" />{task._count.subtasks}</span>
                    )}
                  </p>
                </div>
                {task.dueDate && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                  <PIcon className="size-2.5" />
                  {p.label}
                </Badge>
                {task.assignee && (
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                  </Avatar>
                )}
              </button>
            );
          })}
        </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(updated) => setAssigned((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
        onDelete={(id) => setAssigned((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
