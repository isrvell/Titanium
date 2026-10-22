import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { createCommentSchema } from "../lib/schemas";
import { logActivity, notifyTaskWatchers } from "../lib/activity";

export const comments = new Hono<AuthEnv>()

  // List comments for a task
  .get("/:taskId", async (c) => {
    const taskId = c.req.param("taskId");

    const items = await db.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return c.json(items);
  })

  // Create comment
  .post("/", zValidator("json", createCommentSchema), async (c) => {
    const data = c.req.valid("json");
    const actor = c.get("user");

    const task = await db.task.findUnique({
      where: { id: data.taskId },
      include: {
        project: { select: { workspaceId: true } },
      },
    });
    if (!task) return c.json({ error: "Task not found" }, 404);

    const comment = await db.comment.create({
      data: { content: data.content, taskId: data.taskId, authorId: actor.id },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    await logActivity({
      workspaceId: task.project.workspaceId,
      userId: actor.id,
      action: "COMMENTED",
      entity: "TASK",
      entityId: task.id,
      taskId: task.id,
      meta: { preview: data.content.slice(0, 120) },
    });

    await notifyTaskWatchers({
      actorId: actor.id,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      type: "COMMENT_ADDED",
      title: `${actor.name} commented on "${task.title}"`,
      body: data.content.slice(0, 200),
      entityId: task.id,
    });

    return c.json(comment, 201);
  })

  // Delete comment
  .delete("/:commentId", async (c) => {
    const commentId = c.req.param("commentId");
    const actor = c.get("user").id;

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { task: { include: { project: { select: { workspaceId: true } } } } },
    });
    if (!comment) return c.json({ error: "Not found" }, 404);

    // Author can delete, ADMIN+ can moderate
    const member = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: actor,
          workspaceId: comment.task.project.workspaceId,
        },
      },
    });
    const canModerate = ["OWNER", "ADMIN"].includes(member?.role ?? "");
    if (comment.authorId !== actor && !canModerate)
      return c.json({ error: "Forbidden" }, 403);

    await db.comment.delete({ where: { id: commentId } });
    return c.json({ ok: true });
  });
