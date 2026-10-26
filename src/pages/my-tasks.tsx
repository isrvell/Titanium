import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { subscribeWorkspaceEvents } from "@/lib/events-client";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace";
import { KanbanBoard, type BoardTask, type Status } from "@/components/board";
import { TaskDrawer, type TaskData, STATUS_LABELS } from "@/components/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, CircleCheck } from "lucide-react";

export function MyTasksPage() {
  const { data: session } = useSession();
  const workspace = useWorkspaceStore((s) => s.active);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [view, setView] = useState<string>("board");

  // C5 FIX: filter by current user's assigneeId
  const loadTasks = useCallback(async () => {
    if (!workspace || !session?.user) return;
    try {
      const data = await api.get<BoardTask[]>(
        `/tasks?assigneeId=${session.user.id}&workspaceId=${workspace.id}`,
      );
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspace, session?.user]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // LIVE SYNC: refetch my tasks when the server pushes events (debounced)
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (!workspace) return;
    return subscribeWorkspaceEvents(workspace.id, () => {
      if (reloadTimer.current) return;
      reloadTimer.current = setTimeout(() => {
        reloadTimer.current = null;
        loadTasks();
      }, 400);
    });
  }, [workspace, loadTasks]);

  async function handleTaskMove(taskId: string, newStatus: Status, newIndex: number) {
    // PERSIST FIX (Phase 1.2): rebuild the affected column and use the reorder endpoint
    const moved = tasks.find((t) => t.id === taskId);
    const columnTasks = tasks
      .filter((t) => t.id !== taskId && t.status === newStatus);
    if (moved) columnTasks.splice(newIndex, 0, { ...moved, status: newStatus });

    setTasks((prev) => {
      const col = prev.filter((t) => t.id !== taskId && t.status === newStatus);
      if (moved) col.splice(newIndex, 0, { ...moved, status: newStatus });
      const others = prev.filter((t) => t.status !== newStatus);
      return [...others, ...col];
    });

    try {
      await api.post("/tasks/reorder", {
        tasks: columnTasks.map((t, position) => ({ id: t.id, position, status: newStatus })),
      });
    } catch {
      loadTasks();
    }
  }

  function handleTaskUpdate(updated: TaskData) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } as BoardTask : t)));
    setSelectedTask(updated);
  }

  function handleTaskDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">My Tasks</h2>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="board"><LayoutGrid className="size-4" /></TabsTrigger>
            <TabsTrigger value="list"><List className="size-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <CircleCheck className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No tasks assigned to you</p>
          <p className="text-sm text-muted-foreground/70">Tasks assigned to you will appear here.</p>
        </div>
      ) : view === "board" ? (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={(t) => setSelectedTask(t as TaskData)}
        />
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.map((task) => (
            <button key={task.id} onClick={() => setSelectedTask(task as TaskData)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted">
              {task.project && <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />}
              <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
              <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[task.status] ?? task.status}</Badge>
            </button>
          ))}
        </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
    </div>
  );
}
