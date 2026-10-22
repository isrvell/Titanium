import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { KanbanBoard, type BoardTask, type Status } from "@/components/board";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function MyTasksPage() {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [view, setView] = useState<string>("board");

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.get<BoardTask[]>("/tasks");
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleTaskMove(taskId: string, newStatus: Status, newIndex: number) {
    // Optimistic update already applied by KanbanBoard
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus, position: newIndex });
    } catch {
      // Revert on failure
      loadTasks();
    }
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
            <TabsTrigger value="board">
              <LayoutGrid className="size-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="size-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "board" ? (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={setSelectedTask}
        />
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No tasks assigned to you.
            </p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                {task.project && (
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />
                )}
                <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
                <Badge variant="secondary" className="text-[10px]">{task.status.replace("_", " ")}</Badge>
              </button>
            ))
          )}
        </div>
      )}

      {/* Task detail drawer */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedTask?.title}</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Badge variant="secondary">{selectedTask.status.replace("_", " ")}</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Priority</span>
                <span className="text-sm">{selectedTask.priority}</span>
              </div>
              {selectedTask.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}
              {selectedTask.assignee && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">Assignee</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={selectedTask.assignee.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{initials(selectedTask.assignee.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedTask.assignee.name}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Details</span>
                <p className="text-xs text-muted-foreground">
                  {selectedTask._count.subtasks} subtasks · {selectedTask._count.comments} comments
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
