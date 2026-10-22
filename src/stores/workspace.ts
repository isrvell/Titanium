import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  _count?: { projects: number; members: number };
}

interface WorkspaceStore {
  workspaces: Workspace[];
  active: Workspace | null;
  loading: boolean;
  load: () => Promise<void>;
  setActive: (ws: Workspace) => void;
  create: (name: string) => Promise<Workspace>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      active: null,
      loading: false,

      load: async () => {
        set({ loading: true });
        try {
          const workspaces = await api.get<Workspace[]>("/workspaces");
          const current = get().active;
          const active =
            workspaces.find((w) => w.id === current?.id) ??
            workspaces[0] ??
            null;
          set({ workspaces, active, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      setActive: (ws) => set({ active: ws }),

      create: async (name: string) => {
        const ws = await api.post<Workspace>("/workspaces", { name });
        const workspaces = [...get().workspaces, { ...ws, role: "OWNER" }];
        set({ workspaces, active: { ...ws, role: "OWNER" } });
        return ws;
      },
    }),
    {
      name: "gr8r-workspace",
      partialize: (s) => ({ active: s.active }),
    },
  ),
);
