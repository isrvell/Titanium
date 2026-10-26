import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { createWorkspaceSchema, inviteMemberSchema } from "../lib/schemas";
import { logActivity, notify } from "../lib/activity";
import { sendInvitationEmail } from "../lib/email";

async function requireMember(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

export const workspaces = new Hono<AuthEnv>()

  // List my workspaces
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const workspaces = await db.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { projects: true, members: true } },
        members: { where: { userId }, select: { role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return c.json(
      workspaces.map((w) => ({ ...w, role: w.members[0]?.role ?? "MEMBER" })),
    );
  })

  // Create workspace (owner = creator)
  .post("/", zValidator("json", createWorkspaceSchema), async (c) => {
    const userId = c.get("user").id;
    const { name } = c.req.valid("json");

    const workspace = await db.workspace.create({
      data: {
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });

    return c.json(workspace, 201);
  })

  // ─── Members ────────────────────────────────────────

  // Get workspace members
  .get("/:workspaceId/members", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, title: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    return c.json(members);
  })

  // Change a member's role
  .patch("/:workspaceId/members/:userId", zValidator("json", z.object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  })), async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    const targetId = c.req.param("userId");
    const { role } = c.req.valid("json");

    const actor = await requireMember(me, workspaceId);
    if (!actor || !["OWNER", "ADMIN"].includes(actor.role))
      return c.json({ error: "Forbidden" }, 403);

    // Owners list cannot be emptied by demotion
    if (role !== "OWNER") {
      const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
      if (ws?.ownerId === targetId) return c.json({ error: "Cannot demote the workspace owner" }, 400);
    }

    // Only OWNER may promote someone to OWNER
    if (role === "OWNER" && actor.role !== "OWNER")
      return c.json({ error: "Only the owner can do this" }, 403);

    const updated = await db.workspaceMember.updateMany({
      where: { userId: targetId, workspaceId },
      data: { role },
    });
    if (updated.count === 0) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  })

  // Remove a member
  .delete("/:workspaceId/members/:userId", async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    const targetId = c.req.param("userId");

    const actor = await requireMember(me, workspaceId);
    if (!actor) return c.json({ error: "Forbidden" }, 403);

    // Self-removal is always allowed; otherwise need ADMIN+
    if (targetId !== me && !["OWNER", "ADMIN"].includes(actor.role))
      return c.json({ error: "Forbidden" }, 403);

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.ownerId === targetId && targetId !== me)
      return c.json({ error: "Cannot remove the workspace owner" }, 400);
    if (ws?.ownerId === targetId && targetId === me)
      return c.json({ error: "Transfer ownership before leaving" }, 400);

    await db.workspaceMember.deleteMany({
      where: { userId: targetId, workspaceId },
    });

    await logActivity({
      workspaceId,
      userId: me,
      action: "REMOVED",
      entity: "MEMBER",
      entityId: targetId,
    });

    return c.json({ ok: true });
  })

  // ─── Invitations (Phase 3) ────────────────────────────

  // Invite by email: joins instantly if the user exists, else creates a token
  .post("/:workspaceId/invitations", zValidator("json", inviteMemberSchema), async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    const { email, role } = c.req.valid("json");

    const actor = await requireMember(me, workspaceId);
    if (!actor || !["OWNER", "ADMIN"].includes(actor.role))
      return c.json({ error: "Forbidden" }, 403);

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) return c.json({ error: "Workspace not found" }, 404);

    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      const alreadyMember = await requireMember(existingUser.id, workspaceId);
      if (alreadyMember) return c.json({ error: "Already a member" }, 409);

      const membership = await db.workspaceMember.create({
        data: { userId: existingUser.id, workspaceId, role },
        include: {
          user: { select: { id: true, name: true, email: true, image: true, title: true } },
        },
      });

      await logActivity({
        workspaceId, userId: me, action: "JOINED", entity: "MEMBER",
        entityId: existingUser.id, meta: { email },
      });
      await notify({
        userId: existingUser.id, type: "MEMBER_JOINED",
        title: `You were added to ${ws.name}`,
        entityId: workspaceId,
      });

      return c.json({ kind: "member" as const, membership }, 201);
    }

    // Cancel any previous pending invite for that email, then create the new one
    await db.invitation.updateMany({
      where: { email, workspaceId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const invitation = await db.invitation.create({
      data: { email, workspaceId, role },
    });

    await logActivity({
      workspaceId, userId: me, action: "INVITED", entity: "MEMBER",
      entityId: invitation.id, meta: { email, role },
    });

    // Real email via Brevo (falls back to a console log when BREVO_API_KEY is unset).
    const actorUser = await db.user.findUnique({
      where: { id: me },
      select: { name: true },
    });
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const emailStatus = await sendInvitationEmail({
      to: email,
      inviterName: actorUser?.name ?? "A team member",
      workspaceName: ws.name,
      role,
      signupUrl: `${frontendUrl}/signup`,
    });

    return c.json({ kind: "invite" as const, invitation, emailSent: emailStatus }, 201);
  })

  // List pending invitations
  .get("/:workspaceId/invitations", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const items = await db.invitation.findMany({
      where: { workspaceId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    return c.json(items);
  })

  // Cancel a pending invitation
  .delete("/:workspaceId/invitations/:invitationId", async (c) => {
    const me = c.get("user").id;
    const workspaceId = c.req.param("workspaceId");
    const actor = await requireMember(me, workspaceId);
    if (!actor || !["OWNER", "ADMIN"].includes(actor.role))
      return c.json({ error: "Forbidden" }, 403);

    await db.invitation.updateMany({
      where: { id: c.req.param("invitationId"), workspaceId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    return c.json({ ok: true });
  })

  // Called by the frontend right after signup: consume pending invites
  .post("/accept-invites", async (c) => {
    const user = c.get("user");

    const pending = await db.invitation.findMany({
      where: { email: user.email, status: "PENDING" },
      include: { workspace: true },
    });

    let joined = 0;
    for (const inv of pending) {
      const existing = await requireMember(user.id, inv.workspaceId);
      if (!existing) {
        await db.workspaceMember.create({
          data: { userId: user.id, workspaceId: inv.workspaceId, role: inv.role },
        });
        joined++;
      }
      await db.invitation.update({
        where: { id: inv.id },
        data: { status: "ACCEPTED" },
      });
      await notify({
        userId: inv.workspace.ownerId, type: "MEMBER_JOINED",
        title: `${user.name} joined ${inv.workspace.name}`, entityId: inv.workspaceId,
      });
      await logActivity({
        workspaceId: inv.workspaceId, userId: user.id,
        action: "JOINED", entity: "MEMBER", entityId: user.id, meta: { email: user.email },
      });
    }

    return c.json({ joined });
  })

  // ─── Activity feed ─────────────────────────────────────

  .get("/:workspaceId/activities", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 100);

    const items = await db.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return c.json(items);
  })

  // ─── Overview stats ────────────────────────────────────

  .get("/:workspaceId/stats", async (c) => {
    const workspaceId = c.req.param("workspaceId");

    const projects = await db.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    const [tasks, members, comments] = await Promise.all([
      db.task.findMany({
        where: projectIds.length ? { projectId: { in: projectIds } } : { projectId: "__none__" },
        select: { status: true, priority: true, dueDate: true },
      }),
      db.workspaceMember.count({ where: { workspaceId } }),
      db.comment.count({
        where: { task: { project: { workspaceId } } },
      }),
    ]);

    const now = Date.now();
    const stats = {
      projects: projects.length,
      members,
      comments,
      tasks: {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "TODO").length,
        inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
        review: tasks.filter((t) => t.status === "REVIEW").length,
        done: tasks.filter((t) => t.status === "DONE").length,
        backlogged: tasks.filter((t) => t.status === "BACKLOG").length,
        overdue: tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate).getTime() < now &&
            !["DONE", "CANCELLED"].includes(t.status),
        ).length,
      },
    };

    return c.json(stats);
  });
