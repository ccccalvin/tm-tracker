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

// ── module-level listener wiring ──────────────────────────────────────────────
let profileUnsub: (() => void) | null = null;

onAuthStateChanged(auth, async (fbUser) => {
  // Tear down any previous profile subscription.
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }

  if (!fbUser) {
    useAuthStore.getState()._set({ firebaseUser: null, profile: null, loading: false });
    return;
  }

  useAuthStore.getState()._set({ firebaseUser: fbUser });

  try {
    await ensureUserDoc(fbUser);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tm-tracker] failed to ensure user doc', err);
  }

  profileUnsub = onSnapshot(
    userRef(fbUser.uid),
    (snap) => {
      const profile = snap.exists()
        ? mapUser(snap as Parameters<typeof mapUser>[0])
        : null;
      useAuthStore.getState()._set({ profile, loading: false });
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] profile snapshot error', err);
      useAuthStore.getState()._set({ loading: false });
    },
  );
});
