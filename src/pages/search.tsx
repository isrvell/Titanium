import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { getPriority, type TaskData } from "@/components/tasks";
import { TaskDrawer } from "@/components/tasks";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search as SearchIcon, FolderKanban } from "lucide-react";

interface SearchResult {
  tasks: TaskData[];
  projects: { id: string; name: string; color: string; _count: { tasks: number } }[];
}

export function SearchPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<SearchResult["projects"]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!workspace || q.trim().length < 2) {
      setTasks([]); setProjects([]);
      return;
    }
    setLoading(true);
    try {
      const t = await api.get<TaskData[]>(`/tasks?workspaceId=${workspace.id}&search=${encodeURIComponent(q.trim())}`);
      setTasks(t);
      // Project names are not searchable server-side yet — filter loaded projects client-side
      const p = await api.get<SearchResult["projects"]>(`/projects/${workspace.id}`);
      setProjects(p.filter((proj) => proj.name.toLowerCase().includes(q.trim().toLowerCase())));
    } catch {
      setTasks([]); setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  function onChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(value), 250);
  }

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Search</h2>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search tasks and projects…"
          autoFocus
          className="pl-9"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Skeleton className="h-4 w-4 rounded-full" />
          </span>
        )}
      </div>

      {query.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Projects ({projects.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <FolderKanban className="size-4 shrink-0" style={{ color: p.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{p._count.tasks} tasks</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tasks ({tasks.length})
            </p>
            {tasks.length === 0 && projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <p className="text-sm text-muted-foreground">No matches for "{query}".</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {tasks.map((task) => {
                  const p = getPriority(task.priority);
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: task.project?.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                      <Badge className="shrink-0" variant="outline">{task.project?.name}</Badge>
                      <span className={cn("hidden shrink-0 items-center gap-1 text-xs sm:flex", p.cls)}>
                        <p.icon className="size-3" />
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(u) => setTasks((prev) => prev.map((t) => (t.id === u.id ? u : t)))}
        onDelete={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
