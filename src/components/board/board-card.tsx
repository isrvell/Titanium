import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, GitBranch, Calendar } from "lucide-react";
import type { BoardTask } from "./board-types";
import { PRIORITY_COLORS } from "./board-config";

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

interface BoardCardProps {
  task: BoardTask;
  onClick?: (task: BoardTask) => void;
}

export function BoardCard({ task, onClick }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/30",
      )}
    >
      {/* Project indicator */}
      {task.project && (
        <div className="mb-2 flex items-center gap-1.5">
          <div
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            {task.project.name}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug text-card-foreground line-clamp-2">
        {task.title}
      </p>

      {/* Meta row */}
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        {/* Priority badge */}
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_COLORS[task.priority],
          )}
        >
          {task.priority === "NONE" ? "—" : task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              isOverdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <Calendar className="size-3" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Counts */}
        {task._count.subtasks > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <GitBranch className="size-3" />
            {task._count.subtasks}
          </span>
        )}
        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <MessageSquare className="size-3" />
            {task._count.comments}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <Avatar className="size-5">
            <AvatarImage src={task.assignee.image ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {initials(task.assignee.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

/** Static preview shown while dragging */
export function BoardCardOverlay({ task }: { task: BoardTask }) {
  return (
    <div className="w-64 rounded-lg border border-primary/30 bg-card p-3 shadow-xl ring-2 ring-primary/20">
      <p className="text-sm font-medium line-clamp-2">{task.title}</p>
      <Badge variant="secondary" className="mt-2 text-[10px]">
        {task.priority}
      </Badge>
    </div>
  );
}
