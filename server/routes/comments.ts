import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { createCommentSchema } from "../lib/schemas";

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
    const userId = c.get("user").id;

    const comment = await db.comment.create({
      data: { ...data, authorId: userId },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return c.json(comment, 201);
  })

  // Delete comment
  .delete("/:commentId", async (c) => {
    const commentId = c.req.param("commentId");
    const userId = c.get("user").id;

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) return c.json({ error: "Not found" }, 404);
    if (comment.authorId !== userId) return c.json({ error: "Forbidden" }, 403);

    await db.comment.delete({ where: { id: commentId } });
    return c.json({ ok: true });
  });
