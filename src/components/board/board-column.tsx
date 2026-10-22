import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { BoardCard } from "./board-card";
import type { BoardTask } from "./board-types";

interface BoardColumnProps {
  id: string;
  label: string;
  tasks: BoardTask[];
  onTaskClick?: (task: BoardTask) => void;
}

export function BoardColumn({ id, label, tasks, onTaskClick }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-muted/50",
        isOver && "ring-2 ring-primary/30",
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8">
            <p className="text-xs text-muted-foreground">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
