import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

interface FavProject {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  isFavorite: boolean;
  _count: { tasks: number };
  createdAt: string;
}

export function FavoritesPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [projects, setProjects] = useState<FavProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      const all = await api.get<FavProject[]>(`/projects/${workspace.id}`);
      setProjects(all.filter((p) => p.isFavorite));
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  // Re-sync when returning from the projects page (tab visibility change)
  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") load(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Favorites</h2>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Star className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No favorites yet.</p>
          <p className="text-xs text-muted-foreground/60">
            Star projects on the{" "}
            <Link to="/projects" className="underline underline-offset-2">Projects page</Link>{" "}
            to pin them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group rounded-xl border border-border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                <Star className="size-4 fill-yellow-400 text-yellow-500" />
              </div>
              {project.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{project._count.tasks} tasks</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
