import { create } from 'zustand';
import type { MathLevel } from '@/types';

/**
 * Small app-wide UI state:
 *  - `optionsOpen` — the Options modal's open flag, lifted here so it can be
 *    opened from anywhere (the navbar gear and the Home page settings button)
 *    while the modal itself stays mounted once, in Layout.
 *  - `previewLevel` — an admin-only "view as" override. When an admin picks a
 *    math level from the header switcher, their own student-facing views (Home /
 *    Tracker) render as that level. Ephemeral: never written to Firestore and
 *    reset on sign-out, so it only ever affects the current session's preview.
 */
interface UIState {
  optionsOpen: boolean;
  setOptionsOpen: (open: boolean) => void;
  previewLevel: MathLevel | null;
  setPreviewLevel: (level: MathLevel | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  optionsOpen: false,
  setOptionsOpen: (open) => set({ optionsOpen: open }),
  previewLevel: null,
  setPreviewLevel: (level) => set({ previewLevel: level }),
}));
