import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { auth } from "./lib/auth";
import { requireAuth, type AuthEnv } from "./middleware/auth";
import { tasks } from "./routes/tasks";
import { projects } from "./routes/projects";
import { comments } from "./routes/comments";
import { workspaces } from "./routes/workspaces";
import { notifications } from "./routes/notifications";
import { tags } from "./routes/tags";

const app = new Hono();

// ─── Middleware ────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_URL ?? ""],
    credentials: true,
  }),
);
app.use("*", logger());

// ─── Auth routes (Better Auth handles these) ──────────

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// ─── Health check ─────────────────────────────────────

app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

// ─── Protected API routes ─────────────────────────────

const api = new Hono<AuthEnv>();
api.use("*", requireAuth);

api.route("/workspaces", workspaces);
api.route("/projects", projects);
api.route("/tasks", tasks);
api.route("/comments", comments);
api.route("/notifications", notifications);
api.route("/tags", tags);

app.route("/api", api);

// ─── Start server ─────────────────────────────────────

const port = parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Gr8r API running on http://localhost:${port}`);
});

export default app;
