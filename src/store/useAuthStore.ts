/**
 * Auth state. A single onAuthStateChanged listener (started once at module load)
 * keeps `firebaseUser` + the live `profile` (users/{uid}) in sync. Components
 * read this store; they don't subscribe to auth themselves.
 */
import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth, googleProvider } from '@/lib/firebase';
import { ensureUserDoc, mapUser, userRef } from '@/lib/db';
import { useUIStore } from '@/store/useUIStore';
import type { AppUser } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  /** True until the first auth + profile resolution completes. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  _set: (patch: Partial<AuthState>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {
    await signInWithPopup(auth, googleProvider);
  },
  signOutUser: async () => {
    await signOut(auth);
  },
  _set: (patch) => set(patch),
}));

/** Convenience selectors. */
export const useIsAuthenticated = () => useAuthStore((s) => s.firebaseUser !== null);
export const useIsAdmin = () => useAuthStore((s) => s.profile?.role === 'admin');
export const useProfile = () => useAuthStore((s) => s.profile);

/**
 * The math level the student-facing views should render as. For a normal
 * student this is just their profile level. For an admin it's the header
 * "view as" preview override (null = admin's real, level-less view).
 */
export const useEffectiveMathLevel = () => {
  const profile = useAuthStore((s) => s.profile);
  const previewLevel = useUIStore((s) => s.previewLevel);
  if (profile?.role === 'admin') return previewLevel;
  return profile?.mathLevel ?? null;
};

/**
 * Whether to render admin-only chrome (admin nav, admin Home). True only for a
 * real admin who is NOT currently previewing a student level — flipping the
 * header "view as" switcher to a level drops the admin into the plain student
 * experience so it can be reviewed exactly as a student sees it.
 */
export const useIsAdminView = () => {
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const previewLevel = useUIStore((s) => s.previewLevel);
  return isAdmin && previewLevel === null;
};

// ── module-level listener wiring ──────────────────────────────────────────────
let profileUnsub: (() => void) | null = null;

onAuthStateChanged(auth, (fbUser) => {
  // Tear down any previous profile subscription.
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }

  if (!fbUser) {
    useAuthStore.getState()._set({ firebaseUser: null, profile: null, loading: false });
    // Sign-out only happens from inside the Options modal, so `optionsOpen` is
    // true at that moment. Reset it here or the modal reappears on next login
    // (the store is module-level and outlives the logged-out session).
    useUIStore.getState().setOptionsOpen(false);
    // Drop any admin "view as" preview so it never leaks into the next session.
    useUIStore.getState().setPreviewLevel(null);
    return;
  }

  // A user is present but their profile (users/{uid}) hasn't loaded yet.
  // Re-arm `loading` and clear any previous profile so gated UI waits for the
  // real profile instead of rendering with profile === null for a frame — that
  // gap is what flashed the Home page before bouncing a fresh student to
  // onboarding (and flashed the default name/avatar in the header).
  useAuthStore.getState()._set({ firebaseUser: fbUser, profile: null, loading: true });

  // The live listener — not a one-shot read — is the single source of truth and
  // is what releases the spinner. Attaching it FIRST (rather than awaiting doc
  // creation before subscribing) is what prevents a brand-new account from
  // hanging on "Loading…": right after a popup sign-in the create's server-ack
  // can stall, but the listener still fires locally and instantly.
  //
  // For a brand-new account the doc doesn't exist yet — create it on the first
  // "missing" emission and stay in the loading state; the create's local write
  // re-fires this listener with the real doc, which then clears the spinner.
  let creating = false;
  profileUnsub = onSnapshot(
    userRef(fbUser.uid),
    (snap) => {
      if (snap.exists()) {
        const profile = mapUser(snap as Parameters<typeof mapUser>[0]);
        useAuthStore.getState()._set({ profile, loading: false });
        return;
      }
      // No profile doc yet. Create it once; the next emission delivers it.
      if (creating) return;
      creating = true;
      ensureUserDoc(fbUser).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[tm-tracker] failed to create user doc', err);
        // Never trap the user on the spinner: drop them through (they land on
        // Home and can retry); a reload or the next sign-in heals it.
        useAuthStore.getState()._set({ loading: false });
      });
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] profile snapshot error', err);
      useAuthStore.getState()._set({ loading: false });
    },
  );
});
