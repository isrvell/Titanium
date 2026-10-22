import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace";

export function useBootstrap() {
  const { data: session } = useSession();
  const { active, load, create, workspaces, loading } = useWorkspaceStore();
  const booted = useRef(false);

  useEffect(() => {
    if (!session || booted.current) return;
    booted.current = true;

    let cancelled = false;

    (async () => {
      await load();
      if (cancelled) return;
      const ws = useWorkspaceStore.getState().workspaces;
      if (ws.length === 0 && !cancelled) {
        await create("My Workspace");
      }
    })();

    return () => { cancelled = true; };
  }, [session, load, create]);

  // D4 FIX: reset booted on logout
  useEffect(() => {
    if (!session) booted.current = false;
  }, [session]);

  return { workspace: active, workspaces, loading };
}
