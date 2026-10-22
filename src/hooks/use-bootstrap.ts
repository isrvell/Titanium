import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace";

/**
 * Loads workspaces once per session.
 * If user has none, auto-creates "My Workspace".
 */
export function useBootstrap() {
  const { data: session } = useSession();
  const { active, load, create, workspaces, loading } = useWorkspaceStore();
  const booted = useRef(false);

  useEffect(() => {
    if (!session || booted.current) return;
    booted.current = true;

    (async () => {
      await load();
      const ws = useWorkspaceStore.getState().workspaces;
      if (ws.length === 0) {
        await create("My Workspace");
      }
    })();
  }, [session, load, create]);

  return { workspace: active, workspaces, loading };
}
