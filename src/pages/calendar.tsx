import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { getStatus, type TaskData } from "@/components/tasks";
import { TaskDrawer } from "@/components/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────

const DAY_MS = 86_400_000;

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function roundTime(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Build a 6×7 grid of days covering the displayed month, weeks starting Monday. */
function buildMonthGrid(view: Date): Date[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getTime() - dow * DAY_MS);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

// ─── Page ─────────────────────────────────────────────

export function CalendarPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => new Date());
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const loadTasks = useCallback(async () => {
    if (!workspace) return;
    try {
      const data = await api.get<TaskData[]>(`/tasks?workspaceId=${workspace.id}`);
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const grid = useMemo(() => buildMonthGrid(view), [view]);

  /** dueDate -> tasks map, keyed by YYYY-MM-DD */
  const byDay = useMemo(() => {
    const map = new Map<string, TaskData[]>();
    for (const task of tasks) {
      const d = roundTime(task.dueDate ?? null);
      if (!d) continue;
      const key = dateKey(d);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const todayKey = dateKey(new Date());
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth =
    view.getMonth() === new Date().getMonth() && view.getFullYear() === new Date().getFullYear();

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" onClick={() => setView(new Date())}>
              Today
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {/* Weekdays */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = dateKey(day);
            const dayTasks = byDay.get(key) ?? [];
            const inMonth = day.getMonth() === view.getMonth();
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1.5 last:border-r-0",
                  !inMonth && "bg-muted/20",
                )}
              >
                <span className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                  !isToday && !inMonth && "text-muted-foreground/50",
                  !isToday && inMonth && "text-muted-foreground",
                )}>
                  {day.getDate()}
                </span>

                <div className="mt-1 flex flex-col gap-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const s = getStatus(task.status);
                    const done = task.status === "DONE";
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        title={task.title}
                        className={cn(
                          "flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-accent",
                          done && "opacity-50 line-through",
                        )}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: task.project?.color ?? "#6366f1" }}
                        />
                        <span className="truncate">{task.title}</span>
                        <span className="sr-only">{s.label}</span>
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tasks.every((t) => !t.dueDate) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
          <CalendarDays className="size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No tasks with a due date yet. Set due dates to see them here.
          </p>
        </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(updated) =>
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }
        onDelete={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
