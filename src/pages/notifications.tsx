import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bell, CircleDot, CheckCheck, Trash2 } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  entityId?: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { color: string }> = {
  TASK_ASSIGNED: { color: "text-blue-500" },
  STATUS_CHANGED: { color: "text-amber-500" },
  COMMENT_ADDED: { color: "text-violet-500" },
  MEMBER_JOINED: { color: "text-green-500" },
};

/** Task-related notifications deep-link to the task context we already have. */
function linkFor(n: NotificationItem): string | null {
  if (n.entityId && ["TASK_ASSIGNED", "STATUS_CHANGED", "COMMENT_ADDED"].includes(n.type)) {
    return "/tasks";
  }
  switch (n.type) {
    case "MEMBER_JOINED": return "/members"; // entityId is a workspaceId
    default: return null;
  }
}

function relative(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.get<NotificationItem[]>(`/notifications`));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAll() {
    await api.post("/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function remove(id: string) {
    await api.delete(`/notifications/${id}`);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const unread = items.filter((n) => !n.read);
  const shown = showAll ? items : unread.length > 0 ? unread : items.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Notifications
          {unread.length > 0 && (
            <Badge variant="default" className="ml-2">{unread.length} new</Badge>
          )}
        </h2>
        <div className="flex gap-2">
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={markAll}>
              <CheckCheck data-icon="inline-start" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Unread only" : "Show all"}
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Bell className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">You're all caught up.</p>
          <p className="text-xs text-muted-foreground/60">
            Assignments, status changes and comments will show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col rounded-xl border border-border divide-y divide-border">
          {shown.map((n) => {
            const meta = TYPE_META[n.type] ?? { color: "text-muted-foreground" };
            const to = linkFor(n);
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3">
                <CircleDot className={cn("mt-0.5 size-4 shrink-0", !n.read ? meta.color : "text-muted-foreground/30")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm truncate", !n.read ? "font-medium" : "text-muted-foreground")}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{relative(n.createdAt)}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); remove(n.id); }}
                    className="text-muted-foreground/50 hover:text-destructive"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
            return to ? (
              <Link key={n.id} to={to} onClick={() => !n.read && api.patch(`/notifications/${n.id}/read`, {})}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} onClick={() => !n.read && api.patch(`/notifications/${n.id}/read`, {})} className="cursor-pointer">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {session && null /* session keeps page under auth guard */}
    </div>
  );
}
