import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../lib/schemas";

export const projects = new Hono<AuthEnv>()

  // List projects for current workspace
  .get("/:workspaceId", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const userId = c.get("user").id;

    // Verify membership
    const member = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) return c.json({ error: "Not a member" }, 403);

    const items = await db.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tasks: true } } },
    });

    return c.json(items);
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

      return c.json(project, 201);
    },
  )

  // Update project
  .patch(
    "/:projectId",
    zValidator("json", updateProjectSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const data = c.req.valid("json");

      const project = await db.project.update({
        where: { id: projectId },
        data,
      });

      return c.json(project);
    },
  )

  // Delete project
  .delete("/:projectId", async (c) => {
    const projectId = c.req.param("projectId");
    await db.project.delete({ where: { id: projectId } });
    return c.json({ ok: true });
  });
