import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity as ActivityIcon, FolderKanban, ListChecks, MessageSquare, UserPlus } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown> | null;
  user: { id: string; name: string; image?: string | null };
  task?: { id: string; title: string } | null;
  createdAt: string;
}

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Build a human sentence from the structured log entry. */
function describe(a: ActivityItem): { icon: React.ComponentType<{ className?: string }>; text: string } {
  const name = a.user.name;
  const taskTitle = a.task?.title ?? (a.meta?.title as string) ?? "";
  const projectName = a.meta?.name as string | undefined;

  switch (a.action) {
    case "CREATED":
      if (a.entity === "TASK") return { icon: ListChecks, text: `${name} created "${taskTitle}"` };
      return { icon: FolderKanban, text: `${name} created project "${projectName}"` };
    case "UPDATED":
      if (a.entity === "TASK") {
        const from = a.meta?.from as string | undefined;
        const to = a.meta?.to as string | undefined;
        return to
          ? { icon: ListChecks, text: `${name} moved "${taskTitle}" from ${from} to ${to}` }
          : { icon: ListChecks, text: `${name} updated "${taskTitle}"` };
      }
      return { icon: FolderKanban, text: `${name} updated project "${questionMark(a.entityId, projectName)}"` };
    case "COMPLETED":
      return { icon: ListChecks, text: `${name} completed "${taskTitle}"` };
    case "DELETED":
      return { icon: ListChecks, text: `${name} deleted "${taskTitle ?? projectName}"` };
    case "ASSIGNED":
      return { icon: UserPlus, text: `${name} reassigned "${taskTitle}"` };
    case "COMMENTED":
      return { icon: MessageSquare, text: `${name} commented on "${taskTitle}"` };
    case "JOINED":
      return { icon: UserPlus, text: `${name} joined the workspace` };
    case "INVITED":
      return { icon: UserPlus, text: `${name} invited ${a.meta?.email as string | undefined}` };
    case "REMOVED":
      return { icon: UserPlus, text: `${name} removed a member` };
    default:
      return { icon: ActivityIcon, text: `${name} · ${a.action.toLowerCase()} ${a.entity.toLowerCase()}` };
  }
}

function questionMark(id: string, fallback?: string) {
  return fallback ?? id;
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

export function ActivityPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      setItems(await api.get<ActivityItem[]>(`/workspaces/${workspace.id}/activities`));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Activity</h2>
        <span className="text-sm text-muted-foreground">{items.length} recent events</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <ActivityIcon className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No activity yet.</p>
          <p className="text-xs text-muted-foreground/60">Actions on tasks and projects will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0 rounded-xl border border-border">
          {items.map((a) => {
            const { icon: Icon, text } = describe(a);
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className={cn("size-4 shrink-0 text-muted-foreground/60")} />
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={a.user.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">{initials(a.user.name)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {text}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground/70">{relative(a.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
