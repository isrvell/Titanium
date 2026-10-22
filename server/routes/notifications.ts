import { Hono } from "hono";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";

export const notifications = new Hono<AuthEnv>()

  // List my notifications
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const onlyUnread = c.req.query("unread") === "1";

    const where: Record<string, unknown> = { userId };
    if (onlyUnread) where.read = false;

    const items = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return c.json(items);
  })

  // Unread count (for the sidebar badge)
  .get("/count", async (c) => {
    const userId = c.get("user").id;
    const count = await db.notification.count({
      where: { userId, read: false },
    });
    return c.json({ count });
  })

  // Mark one as read
  .patch("/:notificationId/read", async (c) => {
    const userId = c.get("user").id;
    const notificationId = c.req.param("notificationId");

    await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });

    return c.json({ ok: true });
  })

  // Mark all as read
  .post("/read-all", async (c) => {
    const userId = c.get("user").id;
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return c.json({ ok: true });
  })

  // Delete one
  .delete("/:notificationId", async (c) => {
    const userId = c.get("user").id;
    const notificationId = c.req.param("notificationId");
    await db.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return c.json({ ok: true });
  });
