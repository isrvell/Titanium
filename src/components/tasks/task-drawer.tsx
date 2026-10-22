import { api } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { STATUS_CFG, PRIO_CFG, initials, type TaskData } from "./task-config";

interface TaskDrawerProps {
  task: TaskData | null;
  onClose: () => void;
  onUpdate: (task: TaskData) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDrawer({ task, onClose, onUpdate, onDelete }: TaskDrawerProps) {
  async function handleUpdate(patch: Record<string, unknown>) {
    if (!task) return;
    try {
      const updated = await api.patch<TaskData>(`/tasks/${task.id}`, patch);
      onUpdate(updated);
    } catch {
      // Silently fail — could add toast here
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      onDelete(task.id);
    } catch {
      // Could add toast
    }
  }

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-left leading-snug">{task?.title}</SheetTitle>
        </SheetHeader>
        {task && (
          <div className="flex flex-col gap-5 py-4">
            {/* Status */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <Select value={task.status} onValueChange={(v) => v && handleUpdate({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CFG).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Priority</span>
              <Select value={task.priority} onValueChange={(v) => v && handleUpdate({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIO_CFG).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            {task.project && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Project</span>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                  <span className="text-sm">{task.project.name}</span>
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Assignee */}
            {task.assignee && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Assignee</span>
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assignee.name}</span>
                </div>
              </div>
            )}

            {/* Meta */}
            <p className="text-xs text-muted-foreground">
              {task._count.subtasks} subtasks · {task._count.comments} comments
            </p>

            <Separator />

            {/* Delete */}
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 data-icon="inline-start" />
              Delete task
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
