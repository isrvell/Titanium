import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatus } from "@/components/tasks";
import {
  FolderKanban, Users, MessagesSquare, ListChecks,
  CircleDot, CircleCheck, TimerOff, Crown,
} from "lucide-react";

interface Stats {
  projects: number;
  members: number;
  comments: number;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    backlogged: number;
  };
}

const STAT_CARDS = [
  { key: "total" as const, label: "Total tasks", icon: ListChecks, color: "text-primary" },
  { key: "inProgress" as const, label: "In progress", icon: CircleDot, color: "text-blue-500" },
  { key: "done" as const, label: "Completed", icon: CircleCheck, color: "text-green-500" },
  { key: "overdue" as const, label: "Overdue", icon: TimerOff, color: "text-destructive" },
];

export function OverviewPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      setStats(await api.get<Stats>(`/workspaces/${workspace.id}/stats`));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const doneRate = stats.tasks.total
    ? Math.round((stats.tasks.done / stats.tasks.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {workspace?.name} overview
        </h2>
        <p className="text-sm text-muted-foreground">
          {session?.user?.name ? `Signed in as ${session.user.name}` : ""}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-3">
              <Icon className={`size-5 ${color}`} />
              <div>
                <p className="text-2xl font-semibold">{stats.tasks[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <FolderKanban className="size-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{stats.projects}</p>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{stats.members}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <MessagesSquare className="size-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{stats.comments}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Object.entries({
              BACKLOG: stats.tasks.backlogged,
              TODO: stats.tasks.todo,
              IN_PROGRESS: stats.tasks.inProgress,
              DONE: stats.tasks.done,
            }).map(([statusKey, count]) => {
              const s = getStatus(statusKey);
              const pct = stats.tasks.total ? Math.round((Number(count) / stats.tasks.total) * 100) : 0;
              return (
                <div key={statusKey} className="flex items-center gap-3">
                  <Badge variant={s.variant} className="w-28 justify-start border-transparent bg-transparent px-0 text-xs text-muted-foreground">
                    {s.label}
                  </Badge>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Crown className="size-8 text-yellow-500/80" />
            <div className="flex-1">
              <p className="text-3xl font-semibold">{doneRate}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.tasks.done} of {stats.tasks.total} tasks completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
