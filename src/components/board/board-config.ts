import type { Priority } from "./board-types";

export const BOARD_COLUMNS = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "REVIEW", label: "Review" },
  { id: "DONE", label: "Done" },
] as const;

export const PRIORITY_ORDER: Record<Priority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: "bg-destructive/15 text-destructive",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  MEDIUM: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  LOW: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  NONE: "bg-muted text-muted-foreground",
};
