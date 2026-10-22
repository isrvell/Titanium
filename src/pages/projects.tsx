import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, FolderKanban } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  status: string;
  _count: { tasks: number };
  createdAt: string;
}

const WORKSPACE_ID = "placeholder";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await api.get<Project[]>(`/projects/${WORKSPACE_ID}`);
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await api.post<Project>(`/projects/${WORKSPACE_ID}`, {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
      });
      setProjects((prev) => [project, ...prev]);
      setNewName("");
      setNewDesc("");
      setNewColor("#6366f1");
      setDialogOpen(false);
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  }

  const COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
  ];

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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus data-icon="inline-start" />
            New project
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="proj-name">Name</Label>
                <Input
                  id="proj-name"
                  placeholder="e.g. Website Redesign"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="proj-desc">Description</Label>
                <Input
                  id="proj-desc"
                  placeholder="Optional description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: newColor === c ? "var(--color-foreground)" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating && <Spinner data-icon="inline-start" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <FolderKanban className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground/70">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <CardTitle className="truncate text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <Badge variant="secondary">{project._count.tasks} tasks</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
