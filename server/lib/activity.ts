import { db } from "./db";

// ─── Activity logging ─────────────────────────────────

interface LogActivityInput {
  workspaceId: string;
  userId: string;
  action: string; // e.g. "CREATED", "UPDATED", "DELETED", "ASSIGNED", "COMPLETED"
  entity: string; // e.g. "TASK", "PROJECT", "COMMENT", "MEMBER"
  entityId: string;
  taskId?: string;
  meta?: Record<string, unknown>;
}

/** Fire-and-forget activity log — never throws into the request path. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.activity.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        taskId: input.taskId,
        meta: input.meta ? (input.meta as object) : undefined,
      },
    });
  } catch (err) {
    console.error("[activity] failed to log:", err);
  }
}

// ─── Notifications ────────────────────────────────────

interface NotifyInput {
  userId: string;
  type: string; // "TASK_ASSIGNED", "STATUS_CHANGED", "COMMENT_ADDED", "MEMBER_JOINED"
  title: string;
  body?: string;
  entityId?: string;
}

/** Fire-and-forget notification — silently skips null recipients. */
export async function notify(input: NotifyInput): Promise<void> {
  if (!input.userId) return;
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityId: input.entityId,
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Notify everyone interested in a task (creator + assignee) except the actor. */
export async function notifyTaskWatchers(
  options: {
    actorId: string;
    assigneeId?: string | null;
    creatorId: string;
    skip?: string[];
    type: string;
    title: string;
    body?: string;
    entityId?: string;
  },
): Promise<void> {
  const skip = new Set([options.actorId, ...(options.skip ?? [])].filter(Boolean) as string[]);
  const targets = new Set<string>();
  if (options.assigneeId) targets.add(options.assigneeId);
  if (options.creatorId) targets.add(options.creatorId);
  for (const target of targets) {
    if (skip.has(target)) continue;
    await notify({
      userId: target,
      type: options.type,
      title: options.title,
      body: options.body,
      entityId: options.entityId,
    });
  }
}
