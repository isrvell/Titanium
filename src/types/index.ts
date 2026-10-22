export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type Status = "backlog" | "todo" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
}

export type Route =
  | "home"
  | "inbox"
  | "my-tasks"
  | "projects"
  | "project"
  | "tasks"
  | "members"
  | "activity"
  | "settings"
  | "search"
  | "notifications"
  | "favorites";

export type Theme = "light" | "dark" | "system";
