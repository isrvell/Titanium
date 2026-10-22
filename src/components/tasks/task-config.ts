import {
  CircleDashed, Circle, CircleDot, CircleCheck, CircleX,
  ArrowUp, ArrowDown, Minus, AlertTriangle,
} from "lucide-react";

// ─── Status config ────────────────────────────────────

export const STATUS_CFG = {
  BACKLOG:     { label: "Backlog",     icon: CircleDashed, variant: "outline"   as const },
  TODO:        { label: "To Do",       icon: Circle,       variant: "secondary" as const },
  IN_PROGRESS: { label: "In Progress", icon: CircleDot,    variant: "default"   as const },
  REVIEW:      { label: "Review",      icon: CircleCheck,  variant: "secondary" as const },
  DONE:        { label: "Done",        icon: CircleCheck,  variant: "secondary" as const },
  CANCELLED:   { label: "Cancelled",   icon: CircleX,      variant: "outline"   as const },
} as const;

export type StatusKey = keyof typeof STATUS_CFG;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label]),
);

// ─── Priority config ──────────────────────────────────

export const PRIO_CFG = {
  URGENT: { label: "Urgent", icon: AlertTriangle, cls: "text-destructive"      },
  HIGH:   { label: "High",   icon: ArrowUp,       cls: "text-orange-500"       },
  MEDIUM: { label: "Medium", icon: Minus,          cls: "text-yellow-500"       },
  LOW:    { label: "Low",    icon: ArrowDown,      cls: "text-blue-500"         },
  NONE:   { label: "None",   icon: Minus,          cls: "text-muted-foreground" },
} as const;

export type PriorityKey = keyof typeof PRIO_CFG;

// ─── Helpers ──────────────────────────────────────────

export function getStatus(k: string) {
  return STATUS_CFG[k as StatusKey] ?? STATUS_CFG.TODO;
}

export function getPriority(k: string) {
  return PRIO_CFG[k as PriorityKey] ?? PRIO_CFG.NONE;
}

export function initials(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Shared types ─────────────────────────────────────

export interface TaskAssignee {
  id: string;
  name: string;
  image?: string | null;
}

export interface TaskProject {
  id: string;
  name: string;
  color: string;
  workspaceId?: string;
}

export interface TagData {
  id: string;
  name: string;
  color?: string | null;
}

export interface TaskTag {
  tag: TagData;
}

export interface CommentData {
  id: string;
  content: string;
  authorId: string;
  author?: { id: string; name: string; image?: string | null };
  createdAt: string;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignee?: TaskAssignee | null;
  project?: TaskProject | null;
  creatorId?: string;
  assigneeId?: string | null;
  tags?: TaskTag[];
  _count: { subtasks: number; comments: number };
  createdAt: string;
}
