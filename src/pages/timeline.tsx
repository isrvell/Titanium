import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { TaskDrawer, getStatus, type TaskData } from "@/components/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChartGantt } from "lucide-react";

const DAY_MS = 86_400_000;

interface TimelineTask extends TaskData {
  project?: { id: string; name: string; color: string } | null;
}

export function TimelinePage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const loadTasks = useCallback(async () => {
    if (!workspace) return;
    try {
      const data = await api.get<TimelineTask[]>(`/tasks?workspaceId=${workspace.id}`);
      setTasks(data.filter((t) => t.dueDate));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const groups = useMemo(() => {
    // Group by project, sorted by earliest due date within each project
    const byProject = new Map<string, { name: string; color: string; tasks: TimelineTask[] }>();
    for (const t of tasks) {
      const p = t.project ?? { id: "__none__", name: "No project", color: "#6b7280" };
      const entry = byProject.get(p.id) ?? { name: p.name, color: p.color, tasks: [] };
      entry.tasks.push(t);
      byProject.set(p.id, entry);
    }
    return Array.from(byProject.values())
      .map((g) => ({ ...g, tasks: g.tasks.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))) }))
      .sort((a, b) => String(a.tasks[0]?.dueDate).localeCompare(String(b.tasks[0]?.dueDate)));
  }, [tasks]);

  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const todayLabel = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <ChartGantt className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No scheduled tasks.</p>
          <p className="text-xs text-muted-foreground/60">Give tasks a due date to place them on the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
        <span className="text-sm text-muted-foreground">{tasks.length} scheduled tasks</span>
      </div>

      <div className="relative divide-y divide-border rounded-xl border border-border">
        {groups.map((group) => (
          <div key={group.tasks[0]?.id + group.name} className="flex flex-col gap-1.5 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: group.color }} />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.name}
              </span>
            </div>
            {group.tasks.map((task) => {
              const due = new Date(task.dueDate!).getTime();
              const offsetDays = Math.round((due - todayMs) / DAY_MS);
              const done = task.status === "DONE";
              const overdue = !(done || task.status === "CANCELLED") && due < now;
              const s = getStatus(task.status);

              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent",
                    overdue ? "border-destructive/30" : "border-border",
                    (task.status === "DONE") && "opacity-60",
                  )}
                >
                  <div className="flex w-40 shrink-0 flex-col">
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    <span className={cn("text-[11px]", overdue ? "text-destructive" : "text-muted-foreground")}>
                      {new Date(task.dueDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {overdue && " · overdue"}
                    </span>
                  </div>

                  {/* Relative bar */}
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/50">
                    <div
                      className={cn(
                        "absolute inset-y-0 flex items-center rounded-md px-2 text-[11px] font-medium text-white",
                        overdue && !done ? "bg-destructive" : done ? "bg-green-500/80" : "bg-primary/80",
                      )}
                      style={{
                        left: `${Math.max(0, offsetDays * 1.1)}%`,
                        width: "auto",
                        minWidth: "3rem",
                      }}
                    >
                      <span className="truncate">{offsetDays === 0 ? "Today" : `${s.label}`}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* Today marker */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 hidden border-l-2 border-dashed border-primary/50 sm:block"
          style={{ left: `${40 + (4 / 28) * 60}%` }}
          aria-hidden
        >
          <span className="absolute -top-0 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1 py-0.5 text-[9px] font-semibold text-primary-foreground">
            {todayLabel}
          </span>
        </div>
      </div>

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
        onDelete={(id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }}
      />
    </div>
  );
}
