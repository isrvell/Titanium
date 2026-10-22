import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FolderKanban, MoreHorizontal, Pencil, Trash2, Star } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  status: string;
  isFavorite: boolean;
  _count: { tasks: number };
  createdAt: string;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

export function ProjectsPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // C3 FIX: edit dialog state
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state (shared for create/edit)
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");

  const loadProjects = useCallback(async () => {
    if (!workspace) return;
    try {
      setProjects(await api.get<Project[]>(`/projects/${workspace.id}`));
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function openCreate() {
    setFormName(""); setFormDesc(""); setFormColor("#6366f1");
    setEditing(null); setError("");
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setFormName(project.name);
    setFormDesc(project.description ?? "");
    setFormColor(project.color);
    setEditing(project);
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim() || !workspace) return;
    setError("");

    if (editing) {
      // C3 FIX: edit project
      setSaving(true);
      try {
        const updated = await api.patch<Project>(`/projects/${editing.id}`, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          color: formColor,
        });
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        setDialogOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    } else {
      // Create
      setCreating(true);
      try {
        const project = await api.post<Project>(`/projects/${workspace.id}`, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          color: formColor,
        });
        setProjects((prev) => [project, ...prev]);
        setDialogOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create");
      } finally {
        setCreating(false);
      }
    }
  }

  // C3 FIX: delete project
  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      // Could add toast
    }
  }

  async function toggleFavorite(project: Project) {
    // Optimistic toggle
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, isFavorite: !p.isFavorite } : p)),
    );
    try {
      const res = await api.put<{ isFavorite: boolean }>(`/projects/favorite/${project.id}`, {});
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, isFavorite: res.isFavorite } : p)),
      );
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, isFavorite: project.isFavorite } : p)),
      );
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New project
        </Button>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Create project"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input id="proj-name" placeholder="e.g. Website Redesign" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="proj-desc">Description</Label>
              <Input id="proj-desc" placeholder="Optional description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setFormColor(c)} className="size-7 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: formColor === c ? "var(--color-foreground)" : "transparent" }} />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={creating || saving || !formName.trim()}>
              {(creating || saving) && <Spinner data-icon="inline-start" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <FolderKanban className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground/70">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="relative transition-shadow hover:shadow-md">
              {/* Favorite + dropdown */}
              <div className="absolute right-3 top-3 flex items-center gap-0.5">
                <button
                  onClick={() => toggleFavorite(project)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-amber-400"
                  aria-label={project.isFavorite ? "Unfavorite" : "Add to favorites"}
                >
                  <Star
                    className={`size-4 ${project.isFavorite ? "fill-amber-400 text-amber-400" : ""}`}
                  />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<button className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(project)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(project)} className="text-destructive">
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* C4 FIX: link to /projects/:id which now has a route */}
              <Link to={`/projects/${project.id}`}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2 pr-16">
                  <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <CardTitle className="truncate text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.description && <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                  <Badge variant="secondary">{project._count.tasks} tasks</Badge>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
