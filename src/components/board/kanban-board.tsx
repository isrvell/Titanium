import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { BoardCardOverlay } from "./board-card";
import { BOARD_COLUMNS } from "./board-config";
import type { BoardTask, Status } from "./board-types";

interface KanbanBoardProps {
  tasks: BoardTask[];
  onTaskMove: (taskId: string, newStatus: Status, newIndex: number) => void;
  onTaskClick?: (task: BoardTask) => void;
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);

  // Sync from parent when tasks change
  if (tasks !== localTasks && !activeTask) {
    setLocalTasks(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const tasksByColumn = useCallback(
    (status: string) => localTasks.filter((t) => t.status === status),
    [localTasks],
  );

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = localTasks.find((t) => t.id === activeId);
    if (!activeItem) return;

    // Determine target column
    const overItem = localTasks.find((t) => t.id === overId);
    const targetColumn = overItem ? overItem.status : (overId as Status);

    // If column changed, move task to new column
    if (BOARD_COLUMNS.some((c) => c.id === targetColumn) && activeItem.status !== targetColumn) {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: targetColumn } : t,
        ),
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = localTasks.find((t) => t.id === activeId);
    if (!activeItem) return;

    const targetColumn = localTasks.find((t) => t.id === overId)?.status
      ?? (BOARD_COLUMNS.some((c) => c.id === overId) ? (overId as Status) : activeItem.status);

    // Reorder within column
    const columnTasks = localTasks.filter((t) => t.status === targetColumn);
    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = columnTasks.findIndex((t) => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      setLocalTasks((prev) => {
        const others = prev.filter((t) => t.status !== targetColumn);
        return [...others, ...reordered];
      });
    }

    // Notify parent
    const finalIndex = newIndex !== -1 ? newIndex : columnTasks.length;
    onTaskMove(activeId, targetColumn, finalIndex);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((col) => (
          <BoardColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={tasksByColumn(col.id)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <BoardCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
