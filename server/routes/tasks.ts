import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import {
  createTaskSchema,
  updateTaskSchema,
  taskFiltersSchema,
} from "../lib/schemas";
import { logActivity, notifyTaskWatchers } from "../lib/activity";

export const tasks = new Hono<AuthEnv>()

  // List tasks with filters
  .get("/", zValidator("query", taskFiltersSchema), async (c) => {
    const filters = c.req.valid("query");

    const where: Record<string, unknown> = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.workspaceId) where.project = { workspaceId: filters.workspaceId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.search) {
      where.title = { contains: filters.search, mode: "insensitive" };
    }

    const items = await db.task.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
        tags: { include: { tag: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    return c.json(items);
  })

  // Get single task
  .get("/:taskId", async (c) => {
    const taskId = c.req.param("taskId");

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
        creator: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        subtasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!task) return c.json({ error: "Not found" }, 404);
    return c.json(task);
  })

  // Create task
  .post("/", zValidator("json", createTaskSchema), async (c) => {
    const data = c.req.valid("json");
    const actor = c.get("user");

    const project = await db.project.findUnique({
      where: { id: data.projectId },
      select: { workspaceId: true, name: true },
    });
    if (!project) return c.json({ error: "Project not found" }, 404);

    // Append at the end of the target column
    const lastTask = await db.task.findFirst({
      where: { projectId: data.projectId, status: data.status ?? "TODO" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await db.task.create({
      data: {
        ...data,
        creatorId: actor.id,
        position: (lastTask?.position ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    await logActivity({
      workspaceId: project.workspaceId,
      userId: actor.id,
      action: "CREATED",
      entity: "TASK",
      entityId: task.id,
      taskId: task.id,
      meta: { title: task.title, project: project.name },
    });

    if (data.assigneeId && data.assigneeId !== actor.id) {
      await notifyTaskWatchers({
        actorId: actor.id,
        assigneeId: data.assigneeId,
        creatorId: actor.id,
        skip: [task.id],
        type: "TASK_ASSIGNED",
        title: `${actor.name} assigned you: ${task.title}`,
        entityId: task.id,
      });
    }

    return c.json(task, 201);
  })

  // Update task
  .patch(
    "/:taskId",
    zValidator("json", updateTaskSchema),
    async (c) => {
      const actor = c.get("user");
      const taskId = c.req.param("taskId");
      const data = c.req.valid("json");

      const before = await db.task.findUnique({
        where: { id: taskId },
        select: { status: true, assigneeId: true, creatorId: true, title: true, position: true },
      });
      if (!before) return c.json({ error: "Not found" }, 404);

      const task = await db.task.update({
        where: { id: taskId },
        data: {
          ...data,
          completedAt:
            data.status === "DONE" ? new Date() : data.status ? null : undefined,
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, color: true, workspaceId: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
      });
      const workspaceId = task.project !== null ? await safeWorkspaceId(task.project?.id ?? "") : null;
      if (!workspaceId) return c.json({ error: "Not found" }, 404);

      // ── Activity ──
      if (data.status && data.status !== before.status) {
        await logActivity({
          workspaceId,
          userId: actor.id,
          action: data.status === "DONE" ? "COMPLETED" : "UPDATED",
          entity: "TASK",
          entityId: taskId,
          taskId,
          meta: { title: task.title, from: before.status, to: data.status },
        });

        await notifyTaskWatchers({
          actorId: actor.id,
          assigneeId: task.assignee?.id ?? null,
          creatorId: before.creatorId,
          type: "STATUS_CHANGED",
          title: `"${task.title}" → ${task.status}`,
          entityId: taskId,
        });
      }
      if (data.assigneeId && data.assigneeId !== before.assigneeId) {
        await logActivity({
          workspaceId,
          userId: actor.id,
          action: "ASSIGNED",
          entity: "TASK",
          entityId: taskId,
          taskId,
        });
        await notifyTaskWatchers({
          actorId: actor.id,
          assigneeId: data.assigneeId,
          creatorId: before.creatorId,
          type: "TASK_ASSIGNED",
          title: `${actor.name} assigned you: ${task.title}`,
          entityId: taskId,
        });
      }
      if (!data.status && !data.assigneeId) {
        await logActivity({
          workspaceId,
          userId: actor.id,
          action: "UPDATED",
          entity: "TASK",
          entityId: taskId,
          taskId,
          meta: { fields: Object.keys(data) },
        });
      }

      return c.json(task);
    },
  )

  // Delete task
  .delete("/:taskId", async (c) => {
    const actor = c.get("user");
    const taskId = c.req.param("taskId");

    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { title: true, creatorId: true, assigneeId: true, project: { select: { workspaceId: true } } },
    });
    if (!task) return c.json({ error: "Not found" }, 404);

    await db.task.delete({ where: { id: taskId } });

    await logActivity({
      workspaceId: task.project.workspaceId,
      userId: actor.id,
      action: "DELETED",
      entity: "TASK",
      entityId: taskId,
      meta: { title: task.title },
    });

    await notifyTaskWatchers({
      actorId: actor.id,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      type: "STATUS_CHANGED",
      title: `${actor.name} deleted "${task.title}"`,
      entityId: taskId,
    });

    return c.json({ ok: true });
  })

  // Bulk reorder (dnd-kit drag & drop)
  .post("/reorder", async (c) => {
    const body = await c.req.json<{
      tasks: { id: string; position: number; status?: string }[];
    }>();

    await db.$transaction(
      body.tasks.map((t) =>
        db.task.update({
          where: { id: t.id },
          data: { position: t.position, ...(t.status ? { status: t.status as never } : {}) },
        }),
      ),
    );

    return c.json({ ok: true });
  });

async function safeWorkspaceId(projectId: string): Promise<string | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  return project?.workspaceId ?? null;
}
