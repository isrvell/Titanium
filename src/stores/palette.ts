import { create } from "zustand";

interface PaletteStore {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const usePaletteStore = create<PaletteStore>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
}));
