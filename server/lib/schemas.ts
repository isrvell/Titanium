import { z } from "zod";

// ─── Enums ────────────────────────────────────────────

export const TaskStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
  "CANCELLED",
]);

export const PriorityEnum = z.enum([
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
]);

export const RoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

// ─── Tasks ────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  status: TaskStatusEnum.optional().default("TODO"),
  priority: PriorityEnum.optional().default("NONE"),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  position: z.number().int().min(0).optional(),
});

export const taskFiltersSchema = z.object({
  projectId: z.string().cuid().optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: z.string().cuid().optional(),
  search: z.string().max(200).optional(),
});

// ─── Projects ─────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color")
    .optional(),
  icon: z.string().max(50).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─── Comments ─────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  taskId: z.string().cuid(),
});

// ─── Teams ────────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// ─── Workspace ────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: RoleEnum.optional().default("MEMBER"),
});

// ─── Types ────────────────────────────────────────────

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type CreateTeam = z.infer<typeof createTeamSchema>;
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type InviteMember = z.infer<typeof inviteMemberSchema>;
