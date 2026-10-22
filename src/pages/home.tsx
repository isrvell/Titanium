import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListChecks,
  CircleDot,
  CircleCheck,
  AlertTriangle,
} from "lucide-react";

interface TaskRow {
  status: string;
  dueDate?: string | null;
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;

    (async () => {
      try {
        const tasks = await api.get<TaskRow[]>("/tasks");
        if (cancelled) return;
        const now = new Date();
        setStats({
          total: tasks.length,
          inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
          completed: tasks.filter((t) => t.status === "DONE").length,
          overdue: tasks.filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < now &&
              t.status !== "DONE" &&
              t.status !== "CANCELLED",
          ).length,
        });
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
    </div>
  );
}
