import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export type AuthEnv = {
  Variables: {
    user: { id: string; name: string; email: string; image?: string | null };
    session: { id: string };
  };
};

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
}
