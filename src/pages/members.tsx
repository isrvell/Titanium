import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

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

function initials(n: string) { return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

export function MembersPage() {
  const workspace = useWorkspaceStore((s) => s.active);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!workspace) return;
    try {
      const data = await api.get<Member[]>(`/workspaces/${workspace.id}/members`);
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

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
        <Badge variant="secondary">{members.length} member{members.length !== 1 && "s"}</Badge>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Users className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No members</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.user.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <Avatar className="size-10">
                <AvatarImage src={m.user.image ?? undefined} />
                <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>
              {m.user.title && (
                <span className="text-xs text-muted-foreground hidden sm:block">{m.user.title}</span>
              )}
              <Badge variant={ROLE_VARIANT[m.role] ?? "outline"}>
                {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
