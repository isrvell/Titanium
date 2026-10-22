import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { createProjectSchema, updateProjectSchema } from "../lib/schemas";
import { logActivity } from "../lib/activity";

export const projects = new Hono<AuthEnv>()

  // Full detail for one project (project + tasks) — avoids two round trips
  .get("/detail/:projectId", async (c) => {
    const projectId = c.req.param("projectId");
    const me = c.get("user").id;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { tasks: true } },
        favorites: { where: { userId: me }, select: { userId: true } },
      },
    });
    if (!project) return c.json({ error: "Not found" }, 404);

    const member = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: me, workspaceId: project.workspaceId } },
    });
    if (!member) return c.json({ error: "Not a member" }, 403);

    const tasks = await db.task.findMany({
      where: { projectId },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    return c.json({
      project: { ...project, isFavorite: project.favorites.length > 0 },
      tasks,
    });
  })

  // List projects for current workspace
  .get("/:workspaceId", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const me = c.get("user").id;

    const member = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: me, workspaceId } },
    });
    if (!member) return c.json({ error: "Not a member" }, 403);

    const items = await db.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tasks: true } },
        favorites: { where: { userId: me }, select: { userId: true } },
      },
    });

    return c.json(
      items.map((p) => ({ ...p, isFavorite: p.favorites.length > 0 })),
    );
  })

  // Toggle favorite
  .put("/favorite/:projectId", async (c) => {
    const me = c.get("user").id;
    const projectId = c.req.param("projectId");

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return c.json({ error: "Not found" }, 404);

    const member = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: me, workspaceId: project.workspaceId } },
    });
    if (!member) return c.json({ error: "Forbidden" }, 403);

    const key = { userId_projectId: { userId: me, projectId } };
    const existing = await db.projectFavorite.findUnique({ where: key });

    if (existing) {
      await db.projectFavorite.delete({ where: key });
      return c.json({ isFavorite: false });
    }
    await db.projectFavorite.create({ data: { userId: me, projectId } });
    return c.json({ isFavorite: true });
  })

  // Create project
  .post(
    "/:workspaceId",
    zValidator("json", createProjectSchema),
    async (c) => {
      const workspaceId = c.req.param("workspaceId");
      const userId = c.get("user").id;
      const data = c.req.valid("json");

      const member = await db.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (!member || member.role === "VIEWER")
        return c.json({ error: "Forbidden" }, 403);

      const project = await db.project.create({
        data: { ...data, workspaceId },
      });

      await logActivity({
        workspaceId, userId, action: "CREATED", entity: "PROJECT",
        entityId: project.id, meta: { name: project.name },
      });

      return c.json(project, 201);
    },
  )

  // Update project
  .patch(
    "/:projectId",
    zValidator("json", updateProjectSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const me = c.get("user").id;
      const data = c.req.valid("json");

      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) return c.json({ error: "Not found" }, 404);

      const member = await db.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: me, workspaceId: project.workspaceId } },
      });
      if (!member || ["VIEWER", "MEMBER"].includes(member.role))
        return c.json({ error: "Forbidden" }, 403);

      const updated = await db.project.update({
        where: { id: projectId },
        data,
      });

      await logActivity({
        workspaceId: project.workspaceId, userId: me,
        action: "UPDATED", entity: "PROJECT", entityId: projectId,
        meta: { fields: Object.keys(data) },
      });

      return c.json(updated);
    },
  )

  // Delete project
  .delete("/:projectId", async (c) => {
    const me = c.get("user").id;
    const projectId = c.req.param("projectId");

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return c.json({ error: "Not found" }, 404);

    const member = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: me, workspaceId: project.workspaceId } },
    });
    if (!member || member.role !== "OWNER")
      return c.json({ error: "Forbidden" }, 403);

    await db.project.delete({ where: { id: projectId } });

    await logActivity({
      workspaceId: project.workspaceId, userId: me,
      action: "DELETED", entity: "PROJECT", entityId: projectId,
      meta: { name: project.name },
    });

    return c.json({ ok: true });
  });
