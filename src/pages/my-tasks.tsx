import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { KanbanBoard, type BoardTask, type Status } from "@/components/board";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Progress",
  REVIEW: "Review", DONE: "Done", CANCELLED: "Cancelled",
};

function initials(n: string) { return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

export function MyTasksPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [view, setView] = useState<string>("board");

  const loadTasks = useCallback(async () => {
    if (!workspace) return;
    try {
      const data = await api.get<BoardTask[]>("/tasks");
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleTaskMove(taskId: string, newStatus: Status, newIndex: number) {
    // Optimistic update already applied by KanbanBoard
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus, position: newIndex });
    } catch {
      loadTasks(); // revert on failure
    }
  }

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    try {
      const updated = await api.patch<BoardTask>(`/tasks/${taskId}`, patch);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?.id === taskId) setSelectedTask((s) => s ? { ...s, ...updated } : s);
    } catch { /* */ }
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

      {view === "board" ? (
        <KanbanBoard tasks={tasks} onTaskMove={handleTaskMove} onTaskClick={setSelectedTask} />
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No tasks assigned to you.</p>
          ) : (
            tasks.map((task) => (
              <button key={task.id} onClick={() => setSelectedTask(task)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted">
                {task.project && <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />}
                <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
                <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[task.status] ?? task.status}</Badge>
              </button>
            ))
          )}
        </div>
      )}

      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{selectedTask?.title}</SheetTitle></SheetHeader>
          {selectedTask && (
            <div className="flex flex-col gap-5 py-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Select value={selectedTask.status} onValueChange={(v) => v && updateTask(selectedTask.id, { status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedTask.project && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Project</span>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full" style={{ backgroundColor: selectedTask.project.color }} />
                    <span className="text-sm">{selectedTask.project.name}</span>
                  </div>
                </div>
              )}
              {selectedTask.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              {selectedTask.assignee && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Assignee</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6"><AvatarImage src={selectedTask.assignee.image ?? undefined} /><AvatarFallback className="text-[10px]">{initials(selectedTask.assignee.name)}</AvatarFallback></Avatar>
                    <span className="text-sm">{selectedTask.assignee.name}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedTask._count.subtasks} subtasks · {selectedTask._count.comments} comments</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
