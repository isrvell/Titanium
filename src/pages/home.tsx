import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatus, type TaskData, type TaskProject } from "@/components/tasks";
import {
  ListChecks, CircleDot, CircleCheck, AlertTriangle, ArrowRight,
} from "lucide-react";

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

const STAT_CARDS = [
  { key: "total" as const, label: "Total Tasks", icon: ListChecks, color: "text-primary" },
  { key: "inProgress" as const, label: "In Progress", icon: CircleDot, color: "text-blue-500" },
  { key: "completed" as const, label: "Completed", icon: CircleCheck, color: "text-green-500" },
  { key: "overdue" as const, label: "Overdue", icon: AlertTriangle, color: "text-destructive" },
];

export function HomePage() {
  const { data: session } = useSession();
  const workspace = useWorkspaceStore((s) => s.active);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;

    (async () => {
      try {
        // C6 FIX: load projects for this workspace, then tasks
        const [tasks, projs] = await Promise.all([
          api.get<TaskData[]>("/tasks"),
          api.get<TaskProject[]>(`/projects/${workspace.id}`),
        ]);
        if (cancelled) return;

        // C6 FIX: only count tasks belonging to this workspace's projects
        const wsProjectIds = new Set(projs.map((p) => p.id));
        const wsTasks = tasks.filter((t) => t.project && wsProjectIds.has(t.project.id));

        const now = new Date();
        setStats({
          total: wsTasks.length,
          inProgress: wsTasks.filter((t) => t.status === "IN_PROGRESS").length,
          completed: wsTasks.filter((t) => t.status === "DONE").length,
          overdue: wsTasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED",
          ).length,
        });

        // I5 FIX: show recent tasks (last 5, not done)
        setRecentTasks(
          wsTasks
            .filter((t) => t.status !== "DONE" && t.status !== "CANCELLED")
            .slice(0, 5),
        );
        setProjects(projs);
      } catch {
        if (!cancelled) setStats({ total: 0, inProgress: 0, completed: 0, overdue: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [workspace]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""} 👋
        </h2>
        <p className="text-muted-foreground">
          {workspace ? `Workspace: ${workspace.name}` : "Here's what's happening today."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg bg-muted p-2.5 ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                {loading || !stats ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-semibold">{stats[key]}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* I5 FIX: Recent tasks + projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent tasks</CardTitle>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : recentTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No active tasks</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentTasks.map((task) => {
                  const s = getStatus(task.status);
                  const SIcon = s.icon;
                  return (
                    <div key={task.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                      <SIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm">{task.title}</span>
                      <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Projects</CardTitle>
            <Link to="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : projects.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No projects yet</p>
            ) : (
              <div className="flex flex-col gap-1">
                {projects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="flex-1 truncate text-sm">{p.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
