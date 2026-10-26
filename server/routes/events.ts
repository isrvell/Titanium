// ─── GET /api/events?workspaceId=… — live workspace event stream (SSE) ───

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/db";
import type { AuthEnv } from "../middleware/auth";
import { subscribeWorkspace, type WorkspaceEvent } from "../lib/events";

export const events = new Hono<AuthEnv>()

  .get(
    "/",
    zValidator("query", z.object({ workspaceId: z.string().min(1) })),
    async (c) => {
      const userId = c.get("user").id;
      const workspaceId = c.req.valid("query").workspaceId;

      // Membership gate — any role (incl. VIEWER) may watch, strangers get 403.
      const member = await db.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { role: true },
      });
      if (!member) return c.json({ error: "Forbidden" }, 403);

      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          event: "hello",
          data: JSON.stringify({ role: member.role, at: Date.now() }),
        });

        let closed = false;
        const unsubscribe = subscribeWorkspace(workspaceId, async (event: WorkspaceEvent) => {
          if (closed) return;
          await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
        });

        // The SSE connection stays open only while this callback is pending —
        // poll `aborted` until the client disconnects, THEN resolve.
        stream.onAbort(() => { closed = true; });
        while (!stream.aborted && !closed) {
          await stream.sleep(1_000);
        }

        unsubscribe();
      });
    },
  );
