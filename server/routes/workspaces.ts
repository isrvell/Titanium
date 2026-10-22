import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { createWorkspaceSchema } from "../lib/schemas";

export const workspaces = new Hono<AuthEnv>()

  // List user's workspaces
  .get("/", async (c) => {
    const userId = c.get("user").id;

    const memberships = await db.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: { _count: { select: { projects: true, members: true } } },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return c.json(memberships.map((m: typeof memberships[number]) => ({ ...m.workspace, role: m.role })));
  })

  // Create workspace
  .post("/", zValidator("json", createWorkspaceSchema), async (c) => {
    const { name } = c.req.valid("json");
    const userId = c.get("user").id;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const workspace = await db.workspace.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        ownerId: userId,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
    });

    return c.json(workspace, 201);
  })

  // Get workspace members
  .get("/:workspaceId/members", async (c) => {
    const workspaceId = c.req.param("workspaceId");

    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, title: true } },
      },
    });

    return c.json(members);
  });
