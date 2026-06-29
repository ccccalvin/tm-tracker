import { create } from 'zustand';

/**
 * Small app-wide UI state. Currently just the Options modal's open flag, lifted
 * here so it can be opened from anywhere (the navbar gear and the Home page
 * settings button) while the modal itself stays mounted once, in Layout.
 */
interface UIState {
  optionsOpen: boolean;
  setOptionsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  optionsOpen: false,
  setOptionsOpen: (open) => set({ optionsOpen: open }),
}));
