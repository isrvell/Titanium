import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, ListChecks, CircleDashed, Circle, CircleDot, CircleCheck, CircleX,
  ArrowUp, ArrowDown, Minus, AlertTriangle, MessageSquare, GitBranch,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────

interface Assignee { id: string; name: string; image?: string | null }
interface ProjectRef { id: string; name: string; color: string }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; dueDate?: string | null;
  assignee?: Assignee | null; project?: ProjectRef | null;
  _count: { subtasks: number; comments: number }; createdAt: string;
}
interface ProjectOption { id: string; name: string; color: string }

// ─── Config ───────────────────────────────────────────

const STATUS_CFG = {
  BACKLOG:     { label: "Backlog",     icon: CircleDashed, variant: "outline"   as const },
  TODO:        { label: "To Do",       icon: Circle,       variant: "secondary" as const },
  IN_PROGRESS: { label: "In Progress", icon: CircleDot,    variant: "default"   as const },
  REVIEW:      { label: "Review",      icon: CircleCheck,  variant: "secondary" as const },
  DONE:        { label: "Done",        icon: CircleCheck,  variant: "secondary" as const },
  CANCELLED:   { label: "Cancelled",   icon: CircleX,      variant: "outline"   as const },
};
const PRIO_CFG = {
  URGENT: { label: "Urgent", icon: AlertTriangle, cls: "text-destructive"      },
  HIGH:   { label: "High",   icon: ArrowUp,       cls: "text-orange-500"       },
  MEDIUM: { label: "Medium", icon: Minus,          cls: "text-yellow-500"       },
  LOW:    { label: "Low",    icon: ArrowDown,      cls: "text-blue-500"         },
  NONE:   { label: "None",   icon: Minus,          cls: "text-muted-foreground" },
};

function initials(n: string) { return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
function getS(k: string) { return STATUS_CFG[k as keyof typeof STATUS_CFG] ?? STATUS_CFG.TODO; }
function getP(k: string) { return PRIO_CFG[k as keyof typeof PRIO_CFG] ?? PRIO_CFG.NONE; }

// ─── Component ────────────────────────────────────────

export function TasksPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStatus, setNewStatus] = useState("TODO");
  const [newPriority, setNewPriority] = useState("NONE");
  const [newProjectId, setNewProjectId] = useState("");

  const loadData = useCallback(async () => {
    if (!workspace) return;
    try {
      const [t, p] = await Promise.all([
        api.get<Task[]>("/tasks"),
        api.get<ProjectOption[]>(`/projects/${workspace.id}`),
      ]);
      setTasks(t);
      setProjects(p);
      if (p.length > 0 && !newProjectId) setNewProjectId(p[0]!.id);
    } catch {
      setTasks([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [workspace, newProjectId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreate() {
    if (!newTitle.trim() || !newProjectId) return;
    setCreating(true);
    try {
      const task = await api.post<Task>("/tasks", {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        status: newStatus,
        priority: newPriority,
        projectId: newProjectId,
      });
      setTasks((p) => [task, ...p]);
      setNewTitle(""); setNewDesc(""); setNewStatus("TODO"); setNewPriority("NONE");
      setDialogOpen(false);
    } catch { /* */ }
    finally { setCreating(false); }
  }

  // ─── Task detail: inline status/priority update ─────

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    try {
      const updated = await api.patch<Task>(`/tasks/${taskId}`, patch);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?.id === taskId) setSelectedTask((s) => s ? { ...s, ...updated } : s);
    } catch { /* */ }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus data-icon="inline-start" />
            New task
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" placeholder="What needs to be done?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea id="task-desc" placeholder="Optional details..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Project</Label>
                <Select value={newProjectId} onValueChange={(v) => v && setNewProjectId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CFG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={(v) => v && setNewPriority(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIO_CFG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newProjectId}>
                {creating && <Spinner data-icon="inline-start" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <ListChecks className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/70">
            {projects.length === 0 ? "Create a project first, then add tasks." : "Create a task to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const s = getS(task.status); const p = getP(task.priority);
                const SIcon = s.icon; const PIcon = p.icon;
                return (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {task.project && <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />}
                        <span className="truncate">{task.title}</span>
                        {(task._count.subtasks > 0 || task._count.comments > 0) && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {task._count.subtasks > 0 && <span className="flex items-center gap-0.5 text-[11px]"><GitBranch className="size-3" />{task._count.subtasks}</span>}
                            {task._count.comments > 0 && <span className="flex items-center gap-0.5 text-[11px]"><MessageSquare className="size-3" />{task._count.comments}</span>}
                          </span>
                        )}
                      </div>
                    </TableCell>
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
                    <TableCell>
                      {task.dueDate ? <span className="text-sm">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Task detail drawer with inline edits */}
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
                    {Object.entries(STATUS_CFG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Priority</span>
                <Select value={selectedTask.priority} onValueChange={(v) => v && updateTask(selectedTask.id, { priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIO_CFG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
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
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Details</span>
                <p className="text-xs text-muted-foreground">{selectedTask._count.subtasks} subtasks · {selectedTask._count.comments} comments</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
