import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: "titanium-sidebar",
      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
);
