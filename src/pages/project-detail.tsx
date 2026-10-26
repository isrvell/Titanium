import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { subscribeWorkspaceEvents } from "@/lib/events-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type BoardTask, type Status } from "@/components/board";
import { TaskDrawer, type TaskData, getStatus, getPriority, initials } from "@/components/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutGrid, List } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  workspaceId: string;
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [view, setView] = useState<string>("board");

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      // C-SERVER FIX: single round trip via /projects/detail/:projectId
      const data = await api.get<{ project: Project; tasks: BoardTask[] }>(
        `/projects/detail/${projectId}`,
      );
      setProject(data.project);
      setTasks(data.tasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // LIVE SYNC: refetch tasks when the server pushes events (debounced)
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (!project?.workspaceId) return;
    return subscribeWorkspaceEvents(project.workspaceId, () => {
      if (reloadTimer.current) return;
      reloadTimer.current = setTimeout(() => {
        reloadTimer.current = null;
        loadData();
      }, 400);
    });
  }, [project?.workspaceId, loadData]);

  // PERSIST FIX (Phase 1.2): persist the drag through the real /tasks/reorder endpoint
  async function handleTaskMove(taskId: string, newStatus: Status, newIndex: number) {
    // Optimistically move the task in our local list, matching the board logic
    const next = tasks
      .filter((t) => t.id !== taskId)
      .map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));

    const columnTasks = next.filter((t) => t.status === newStatus);
    const moved = next.find((t) => t.id === taskId) ??
      tasks.find((t) => t.id === taskId);
    if (moved) {
      columnTasks.splice(newIndex, 0, moved);
    } else {
      columnTasks.push({ id: taskId, status: newStatus } as BoardTask);
    }

    setTasks(next.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      await api.post("/tasks/reorder", {
        tasks: columnTasks.map((t, position) => ({
          id: t.id,
          position,
          status: newStatus,
        })),
      });
    } catch {
      loadData();
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
        </Link>
        {project && (
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full" style={{ backgroundColor: project.color }} />
            <h2 className="text-xl font-semibold">{project.name}</h2>
          </div>
        )}
        <Badge variant="secondary" className="ml-auto">{tasks.length} tasks</Badge>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="board"><LayoutGrid className="size-4" /></TabsTrigger>
            <TabsTrigger value="table"><List className="size-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tasks.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No tasks in this project yet.</p>
      ) : view === "board" ? (
        <KanbanBoard tasks={tasks} onTaskMove={handleTaskMove} onTaskClick={(t) => setSelectedTask(t as TaskData)} />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const s = getStatus(task.status);
                const p = getPriority(task.priority);
                const SIcon = s.icon; const PIcon = p.icon;
                return (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task as TaskData)}>
                    <TableCell className="font-medium truncate">{task.title}</TableCell>
                    <TableCell><Badge variant={s.variant}><SIcon />{s.label}</Badge></TableCell>
                    <TableCell><span className={`flex items-center gap-1 text-sm ${p.cls}`}><PIcon className="size-3.5" />{p.label}</span></TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6"><AvatarImage src={task.assignee.image ?? undefined} /><AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback></Avatar>
                          <span className="text-sm truncate">{task.assignee.name}</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
    </div>
  );
}
