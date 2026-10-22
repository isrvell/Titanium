export type Status = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface BoardTask {
  id: string;
  title: string;
  description?: string | null;
  status: Status;
  priority: Priority;
  dueDate?: string | null;
  assignee?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  _count: { subtasks: number; comments: number };
}
