import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, ListChecks, CircleDashed, Circle, CircleDot, CircleCheck, CircleX,
  ArrowUp, ArrowDown, Minus, AlertTriangle,
} from "lucide-react";

interface TaskAssignee { id: string; name: string; image?: string | null }
interface TaskProject { id: string; name: string; color: string }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; dueDate?: string | null;
  assignee?: TaskAssignee | null; project?: TaskProject | null;
  _count: { subtasks: number; comments: number }; createdAt: string;
}

const STATUS_CFG = {
  BACKLOG:     { label: "Backlog",     icon: CircleDashed, variant: "outline"    as const },
  TODO:        { label: "To Do",       icon: Circle,       variant: "secondary"  as const },
  IN_PROGRESS: { label: "In Progress", icon: CircleDot,    variant: "default"    as const },
  REVIEW:      { label: "Review",      icon: CircleCheck,  variant: "secondary"  as const },
  DONE:        { label: "Done",        icon: CircleCheck,  variant: "secondary"  as const },
  CANCELLED:   { label: "Cancelled",   icon: CircleX,      variant: "outline"    as const },
};

const PRIO_CFG = {
  URGENT: { label: "Urgent", icon: AlertTriangle, cls: "text-destructive"     },
  HIGH:   { label: "High",   icon: ArrowUp,       cls: "text-orange-500"      },
  MEDIUM: { label: "Medium", icon: Minus,          cls: "text-yellow-500"      },
  LOW:    { label: "Low",    icon: ArrowDown,      cls: "text-blue-500"        },
  NONE:   { label: "None",   icon: Minus,          cls: "text-muted-foreground"},
};

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getStatus(key: string) {
  return STATUS_CFG[key as keyof typeof STATUS_CFG] ?? STATUS_CFG.TODO;
}
function getPrio(key: string) {
  return PRIO_CFG[key as keyof typeof PRIO_CFG] ?? PRIO_CFG.NONE;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("TODO");
  const [newPriority, setNewPriority] = useState("NONE");

  const loadTasks = useCallback(async () => {
    try { setTasks(await api.get<Task[]>("/tasks")); }
    catch { setTasks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const task = await api.post<Task>("/tasks", {
        title: newTitle.trim(), status: newStatus, priority: newPriority,
        projectId: "placeholder",
      });
      setTasks((p) => [task, ...p]);
      setNewTitle(""); setNewStatus("TODO"); setNewPriority("NONE");
      setDialogOpen(false);
    } catch { /* */ }
    finally { setCreating(false); }
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
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" placeholder="What needs to be done?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
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
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
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
          <p className="text-sm text-muted-foreground/70">Create a task to get started.</p>
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
                const s = getStatus(task.status);
                const p = getPrio(task.priority);
                const SIcon = s.icon;
                const PIcon = p.icon;
                return (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {task.project && <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={s.variant}><SIcon />{s.label}</Badge></TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-sm ${p.cls}`}>
                        <PIcon className="size-3.5" />{p.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage src={task.assignee.image ?? undefined} />
                            <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{task.assignee.name}</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {task.dueDate
                        ? <span className="text-sm">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedTask?.title}</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Badge variant={getStatus(selectedTask.status).variant}>{getStatus(selectedTask.status).label}</Badge>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Priority</span>
                <span className={`text-sm ${getPrio(selectedTask.priority).cls}`}>{getPrio(selectedTask.priority).label}</span>
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
                <p className="text-xs text-muted-foreground">{selectedTask._count.subtasks} subtasks · {selectedTask._count.comments} comments</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
