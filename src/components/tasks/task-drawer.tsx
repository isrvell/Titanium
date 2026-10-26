import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { subscribeWorkspaceEvents } from "@/lib/events-client";
import { useSession } from "@/lib/auth-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, MessageSquare, Plus } from "lucide-react";
import {
  STATUS_CFG, PRIO_CFG, initials,
  type TaskData, type CommentData, type TagData,
} from "./task-config";

interface MemberItem {
  user: { id: string; name: string; image?: string | null };
}

interface TaskDrawerProps {
  task: TaskData | null;
  onClose: () => void;
  onUpdate: (task: TaskData) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDrawer({ task, onClose, onUpdate, onDelete }: TaskDrawerProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [dueInput, setDueInput] = useState("");

  // Reset per-task local state when a new task opens
  useEffect(() => {
    if (task) {
      setComments([]);
      setCommentDraft("");
      setDueInput(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    }
  }, [task?.id]);

  // Load members + tags for the workspace of this task
  useEffect(() => {
    const wsId = task?.project?.workspaceId;
    if (!task || !wsId) return;
    (async () => {
      try {
        const [m, t] = await Promise.all([
          api.get<MemberItem[]>(`/workspaces/${wsId}/members`),
          api.get<TagData[]>(`/tags/${wsId}`),
        ]);
        setMembers(m);
        setTags(t);
      } catch {
        setMembers([]); setTags([]);
      }
    })();
  }, [task?.id, task?.project?.workspaceId]);

  // Load comments when the drawer opens + LIVE SYNC: refetch when someone
  // else adds/deletes a comment on this task (SSE).
  useEffect(() => {
    if (!task) return;
    let stale = false;
    const load = async () => {
      try {
        const items = await api.get<CommentData[]>(`/comments/${task.id}`);
        if (!stale) setComments(items);
      } catch {
        if (!stale) setComments([]);
      }
    };
    load();
    const wsId = task.project?.workspaceId;
    const unsub = wsId
      ? subscribeWorkspaceEvents(wsId, (event) => {
          if (event.type === "comments" && (!event.taskId || event.taskId === task.id)) load();
        })
      : undefined;
    return () => { stale = true; unsub?.(); };
  }, [task?.id]);

  async function handleUpdate(patch: Record<string, unknown>) {
    if (!task) return;
    try {
      const updated = await api.patch<TaskData>(`/tasks/${task.id}`, patch);
      onUpdate(updated);
    } catch {
      // Silently fail — could add toast here
    }
  }

  async function handleDueDate(value: string) {
    setDueInput(value);
    if (!value) { await handleUpdate({ dueDate: null }); return; }
    // Store as end-of-day so the calendar shows the day itself
    await handleUpdate({ dueDate: new Date(`${value}T23:59:59.000Z`).toISOString() });
  }

  async function toggleTag(tagId: string) {
    if (!task) return;
    const attached = task.tags?.some((t) => t.tag.id === tagId);
    try {
      const res = await api.put<{ attached: boolean }>(`/tags/task/${task.id}/${tagId}`, {});
      if (res.attached && !attached) {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) onUpdate({ ...task, tags: [...(task.tags ?? []), { tag }], assignee: task.assignee });
      } else if (!res.attached && attached) {
        onUpdate({ ...task, tags: (task.tags ?? []).filter((t) => t.tag.id !== tagId) });
      }
    } catch { /* ignore */ }
  }

  async function sendComment() {
    if (!task || !commentDraft.trim()) return;
    setSending(true);
    try {
      const c = await api.post<CommentData>("/comments", { taskId: task.id, content: commentDraft.trim() });
      setComments((prev) => [...prev, c]);
      setCommentDraft("");
      onUpdate({ ...task, _count: { ...task._count, comments: task._count.comments + 1 } });
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  async function deleteComment(id: string) {
    if (!task) return;
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
      onUpdate({ ...task, _count: { ...task._count, comments: Math.max(0, task._count.comments - 1) } });
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      onDelete(task.id);
    } catch {
      // Could add toast
    }
  }

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-left leading-snug">{task?.title}</SheetTitle>
        </SheetHeader>
        {task && (
          <div className="flex flex-col gap-5 py-4">
            {/* Status */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <Select value={task.status} onValueChange={(v) => v && handleUpdate({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CFG).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Priority</span>
              <Select value={task.priority} onValueChange={(v) => v && handleUpdate({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIO_CFG).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Assignee</span>
              {members.length > 0 ? (
                <Select
                  value={task.assignee?.id ?? "unassigned"}
                  onValueChange={(v) => handleUpdate({ assigneeId: v === "unassigned" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Due date</span>
              <Input type="date" value={dueInput} onChange={(e) => handleDueDate(e.target.value)} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = task.tags?.some((t) => t.tag.id === tag.id);
                    return (
                      <button key={tag.id} onClick={() => toggleTag(tag.id)}>
                        <Badge
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          style={active && tag.color ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                        >
                          {tag.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Project */}
            {task.project && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">Project</span>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                  <span className="text-sm">{task.project.name}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Comments */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Comments ({comments.length})
              </span>
              <div className="flex flex-col gap-2">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={c.author?.image ?? undefined} />
                        <AvatarFallback className="text-[8px]">{initials(c.author?.name ?? "?")}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{c.author?.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {c.authorId === session?.user?.id && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="ml-auto text-muted-foreground/50 hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground/70">No comments yet.</p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment…"
                  rows={2}
                  className="min-h-0 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); }
                  }}
                />
                <Button size="sm" onClick={sendComment} disabled={sending || !commentDraft.trim()}>
                  {sending ? <MessageSquare className="animate-pulse" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                  Send
                </Button>
              </div>
            </div>

            <Separator />

            {/* Delete */}
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 data-icon="inline-start" />
              Delete task
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
