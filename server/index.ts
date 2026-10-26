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
import { events } from "./routes/events";

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

// ─── Auth routes (Better Auth) ────────────────────────
// NOTE: `app.on(..., "/api/auth/**", ...)` is unreliable with hono 4.13.13
// when param routes are also mounted (RegExpRouter bug — the wildcard route
// stops matching). Registering each path depth explicitly (`*` and `*/*`)
// is deterministic. Better Auth endpoints never go deeper than 2 segments.
const handleAuth = (c: { req: { raw: Request } }) => auth.handler(c.req.raw);
app.on(["POST", "GET"], "/api/auth/*", handleAuth);
app.on(["POST", "GET"], "/api/auth/*/*", handleAuth);

// ─── Health check ─────────────────────────────────────

app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

// ─── Protected API routes ─────────────────────────────
// requireAuth is scoped per resource prefix (NOT via a wildcard `api.use("*")`,
// which hono would also apply to /api/auth/* routes).

const protectedResources: Array<[string, Hono<AuthEnv>]> = [
  ["/workspaces", workspaces],
  ["/projects", projects],
  ["/tasks", tasks],
  ["/comments", comments],
  ["/notifications", notifications],
  ["/tags", tags],
  ["/events", events],
];

for (const [prefix, router] of protectedResources) {
  app.use(`/api${prefix}`, requireAuth);
  app.use(`/api${prefix}/*`, requireAuth);
  app.route(`/api${prefix}`, router);
}

// ─── Start server ─────────────────────────────────────

const port = parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Gr8r API running on http://localhost:${port}`);
});

export default app;
