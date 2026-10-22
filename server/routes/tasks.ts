import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import {
  createTaskSchema,
  updateTaskSchema,
  taskFiltersSchema,
} from "../lib/schemas";

export const tasks = new Hono<AuthEnv>()

  // List tasks with filters
  .get("/", zValidator("query", taskFiltersSchema), async (c) => {
    const filters = c.req.valid("query");

    const where: Record<string, unknown> = {};
    if (filters.projectId) where.projectId = filters.projectId;
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
        project: { select: { id: true, name: true, color: true } },
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
        project: { select: { id: true, name: true, color: true } },
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
    const userId = c.get("user").id;

    // Get max position in project
    const lastTask = await db.task.findFirst({
      where: { projectId: data.projectId, status: data.status ?? "TODO" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await db.task.create({
      data: {
        ...data,
        creatorId: userId,
        position: (lastTask?.position ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return c.json(task, 201);
  })

  // Update task
  .patch(
    "/:taskId",
    zValidator("json", updateTaskSchema),
    async (c) => {
      const taskId = c.req.param("taskId");
      const data = c.req.valid("json");

      const task = await db.task.update({
        where: { id: taskId },
        data: {
          ...data,
          completedAt:
            data.status === "DONE" ? new Date() : data.status ? null : undefined,
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, color: true } },
        },
      });

      return c.json(task);
    },
  )

  // Delete task
  .delete("/:taskId", async (c) => {
    const taskId = c.req.param("taskId");
    await db.task.delete({ where: { id: taskId } });
    return c.json({ ok: true });
  })

  // Bulk reorder
  .post("/reorder", async (c) => {
    const body = await c.req.json<{ tasks: { id: string; position: number; status?: string }[] }>();

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
