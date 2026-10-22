import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, Trash2, UserPlus, Users, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface Member {
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    title?: string | null;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

function initials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function MembersPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const meId = session?.user?.id;
  const myRole = members.find((m) => m.user.id === meId)?.role;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const loadMembers = useCallback(async () => {
    if (!workspace) return;
    try {
      const [m, i] = await Promise.all([
        api.get<Member[]>(`/workspaces/${workspace.id}/members`),
        api.get<PendingInvite[]>(`/workspaces/${workspace.id}/invitations`).catch(() => []),
      ]);
      setMembers(m);
      setInvites(canManage ? i : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspace, canManage]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleRoleChange(member: Member, role: string) {
    if (!workspace) return;
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.user.id === member.user.id ? { ...m, role } : m)));
    try {
      await api.patch(`/workspaces/${workspace.id}/members/${member.user.id}`, { role });
    } catch (err) {
      setMembers(previous);
      toast.error(err instanceof Error ? err.message : "Could not update role");
    }
  }

  async function handleRemove(member: Member) {
    if (!workspace) return;
    if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) return;
    try {
      await api.delete(`/workspaces/${workspace.id}/members/${member.user.id}`);
      setMembers((prev) => prev.filter((m) => m.user.id !== member.user.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member");
    }
  }

  async function handleCancelInvite(invite: PendingInvite) {
    if (!workspace) return;
    try {
      await api.delete(`/workspaces/${workspace.id}/invitations/${invite.id}`);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel invitation");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
        {canManage && <InviteDialog onDone={loadMembers} />}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Users className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No members</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const isSelf = m.user.id === meId;
            const canEdit =
              canManage && !isSelf &&
              // Only the OWNER can touch other ADMINs or the OWNER
              !(myRole === "ADMIN" && ["ADMIN", "OWNER"].includes(m.role));
            return (
              <div key={m.user.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                <Avatar className="size-10">
                  <AvatarImage src={m.user.image ?? undefined} />
                  <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user.name}{isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                {m.user.title && (
                  <span className="text-xs text-muted-foreground hidden sm:block">{m.user.title}</span>
                )}
                {canEdit ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) => v && handleRoleChange(m, v)}
                  >
                    <SelectTrigger size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={ROLE_VARIANT[m.role] ?? "outline"}>{roleLabel(m.role)}</Badge>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m)}
                    aria-label={`Remove ${m.user.name}`}
                  >
                    <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending invitations ({invites.length})
          </h3>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <div className="rounded-full bg-muted p-2">
                <Send className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited on {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <Badge variant={ROLE_VARIANT[inv.role] ?? "outline"}>{roleLabel(inv.role)}</Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCancelInvite(inv)}
                aria-label="Cancel invitation"
              >
                <X className="size-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteDialog({ onDone }: { onDone: () => void }) {
  const workspace = useWorkspaceStore((s) => s.active);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [sending, setSending] = useState(false);

  async function handleInvite() {
    if (!workspace || !email.trim()) return;
    setSending(true);
    try {
      await api.post(`/workspaces/${workspace.id}/invitations`, { email: email.trim(), role });
      toast.success(
        `Invitation sent to ${email.trim()} — they'll join on first login if they don't have an account yet.`,
      );
      setEmail("");
      setRole("MEMBER");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm">
          <UserPlus data-icon="inline-start" />
          Invite member
        </Button>
      } />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button onClick={handleInvite} disabled={sending || !email.trim()}>
            {sending && <Spinner data-icon="inline-start" />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
