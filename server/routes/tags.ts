import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";

async function checkAccess(userId: string, workspaceId: string, minRole: "VIEWER" | "MEMBER" | "ADMIN") {
  const member = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!member) return false;
  const rank: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };
  return rank[member.role] >= rank[minRole];
}

export const tags = new Hono<AuthEnv>()

  // List workspace tags
  .get("/:workspaceId", async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    if (!(await checkAccess(me, workspaceId, "VIEWER")))
      return c.json({ error: "Forbidden" }, 403);

    const items = await db.tag.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    return c.json(items);
  })

  // Create tag
  .post("/:workspaceId", zValidator("json", z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })), async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    if (!(await checkAccess(me, workspaceId, "MEMBER")))
      return c.json({ error: "Forbidden" }, 403);

    const { name, color } = c.req.valid("json");
    const existing = await db.tag.findUnique({
      where: { name_workspaceId: { name, workspaceId } },
    });
    if (existing) return c.json(existing);

    const tag = await db.tag.create({
      data: { name, color, workspaceId },
    });
    return c.json(tag, 201);
  })

  // Attach / detach a tag on a task (toggle semantics)
  .put("/task/:taskId/:tagId", async (c) => {
    const me = c.get("user").id;
    const taskId = c.req.param("taskId");
    const tagId = c.req.param("tagId");

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { workspaceId: true } } },
    });
    if (!task) return c.json({ error: "Not found" }, 404);
    if (!(await checkAccess(me, task.project.workspaceId, "MEMBER")))
      return c.json({ error: "Forbidden" }, 403);

    const key = { taskId_tagId: { taskId, tagId } };
    const existing = await db.taskTag.findUnique({ where: key });

    if (existing) {
      await db.taskTag.delete({ where: key });
      return c.json({ attached: false });
    }
    await db.taskTag.create({ data: { taskId, tagId } });
    return c.json({ attached: true });
  });
