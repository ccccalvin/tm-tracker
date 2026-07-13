import { create } from 'zustand';

/**
 * Why a guest was asked to sign in — drives the modal's copy.
 *  - `tick`    tried to mark a paper complete
 *  - `todo`    tried to add a paper to their to-do list
 *  - `pdf`     tried to open a paper's PDF
 *  - `generic` tapped the header "Sign in" (no specific action)
 */
export type GateReason = 'tick' | 'todo' | 'pdf' | 'generic';

/** An action the guest attempted; replayed once they finish signing in. */
export type PendingAction = () => void | Promise<void>;

/**
 * Global sign-in gate. Guests browse the app freely; the moment they reach for
 * something that needs an account (ticking, to-do, opening a PDF) a component
 * calls `promptSignIn(reason, action)`. The <SignInGate> modal handles auth +
 * first-run level setup and then replays `pending` (see consumePending).
 */
interface AuthGateState {
  open: boolean;
  reason: GateReason;
  /** The attempted action, run after a successful sign-in (+ level setup). */
  pending: PendingAction | null;
  promptSignIn: (reason?: GateReason, pending?: PendingAction | null) => void;
  close: () => void;
  /** Hand back the pending action once (clearing it), so it can't run twice. */
  consumePending: () => PendingAction | null;
}

export const useAuthGate = create<AuthGateState>((set, get) => ({
  open: false,
  reason: 'generic',
  pending: null,
  promptSignIn: (reason = 'generic', pending = null) =>
    set({ open: true, reason, pending }),
  close: () => set({ open: false, pending: null }),
  consumePending: () => {
    const p = get().pending;
    if (p) set({ pending: null });
    return p;
  },
}));
