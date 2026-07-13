import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui';
import { LevelBadge } from '@/components/LevelBadge';
import { MATH_LEVELS } from '@/lib/config';
import { completeOnboarding } from '@/lib/db';
import { useAuthStore, useIsAuthenticated } from '@/store/useAuthStore';
import { useAuthGate, type GateReason } from '@/store/useAuthGate';
import { cn } from '@/lib/cn';
import type { MathLevel } from '@/types';

/** Sign-in step copy, keyed by what the guest was reaching for. */
const REASON_COPY: Record<GateReason, { title: string; body: string }> = {
  tick: {
    title: 'Save your progress',
    body: 'Create a free account to tick off papers and climb the leaderboard. Takes a few seconds.',
  },
  todo: {
    title: 'Save your to-do list',
    body: 'Create a free account to line up papers and keep your list across visits.',
  },
  pdf: {
    title: 'Sign in to open papers',
    body: 'Create a free account to open papers and track what you’ve done.',
  },
  generic: {
    title: 'Create your account',
    body: 'Sign in to save your progress, build a to-do list and join the leaderboard.',
  },
};

/** Google's multi-colour "G" mark. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * The app-wide sign-in gate. Mounted once (in App). Guests browse freely; when
 * they attempt something that needs an account, a component calls
 * `promptSignIn()` and this modal appears. Two steps:
 *
 *   1. Sign-in — one-tap Google (copy tailored to what they tried to do).
 *   2. Level setup — brand-new students pick a maths course (name/photo come
 *      from Google). This step is forced: it also shows on its own whenever a
 *      signed-in student still hasn't picked a level, so nobody gets stranded.
 *
 * Once the user is signed in AND has a level, any action they attempted before
 * signing in (the "pending" action) is replayed.
 */
export function SignInGate() {
  const open = useAuthGate((s) => s.open);
  const reason = useAuthGate((s) => s.reason);
  const close = useAuthGate((s) => s.close);
  const consumePending = useAuthGate((s) => s.consumePending);

  const isAuthed = useIsAuthenticated();
  const profile = useAuthStore((s) => s.profile);
  const fbUser = useAuthStore((s) => s.firebaseUser);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [signingIn, setSigningIn] = useState(false);

  // A signed-in student who hasn't picked a level yet must finish that step —
  // shown here even if the modal wasn't explicitly opened, so an interrupted
  // first-run (or a returning half-set-up account) always lands a level.
  const needsLevel =
    isAuthed && profile !== null && !profile.onboarded && profile.role === 'student';

  const showSignin = open && !isAuthed;
  const showLevel = needsLevel;
  const dialogOpen = showSignin || showLevel;

  // Finish: once the user is fully set up (signed in + onboarded) and this flow
  // was opened for an action, replay it and close. Guard so it runs only once.
  const finishing = useRef(false);
  useEffect(() => {
    if (!open || !isAuthed || profile === null || !profile.onboarded) return;
    if (finishing.current) return;
    finishing.current = true;
    const pending = consumePending();
    close();
    if (pending) Promise.resolve(pending()).catch(() => {
      /* the action surfaces its own error toast */
    });
  }, [open, isAuthed, profile, consumePending, close]);

  // Re-arm the finish guard whenever the gate is fully closed.
  useEffect(() => {
    if (!dialogOpen) finishing.current = false;
  }, [dialogOpen]);

  async function handleGoogle() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // The auth listener takes over: it creates the profile and this component
      // re-renders into the level step (new student) or finishes (returning).
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] sign-in failed', err);
      toast.error('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  const copy = REASON_COPY[reason];

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        // Only the sign-in step is dismissable; the level step is required.
        if (!next && showSignin) close();
      }}
    >
      <DialogContent
        // Hide the built-in close (X) during the forced level step.
        className={cn('max-w-sm', showLevel && '[&>button]:hidden')}
        onEscapeKeyDown={(e) => showLevel && e.preventDefault()}
        onInteractOutside={(e) => showLevel && e.preventDefault()}
      >
        {showLevel ? (
          <LevelStep
            uid={fbUser?.uid}
            defaultName={fbUser?.displayName ?? profile?.displayName ?? ''}
            email={fbUser?.email ?? ''}
          />
        ) : (
          <div className="flex flex-col gap-4 text-center sm:text-left">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-0">
              <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div className="space-y-1.5">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.body}</DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={signingIn}
              className="flex w-full items-center justify-center gap-2.5 rounded-md border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              <GoogleG />
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </button>
            <button
              type="button"
              onClick={close}
              className="mx-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Not now — keep browsing
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Step 2 — the one-tap maths-level picker (name/photo already came from Google). */
function LevelStep({
  uid,
  defaultName,
  email,
}: {
  uid: string | undefined;
  defaultName: string;
  email: string;
}) {
  const [level, setLevel] = useState<MathLevel | ''>('');
  const [saving, setSaving] = useState(false);

  async function handleDone() {
    if (!uid || level === '' || saving) return;
    // Name comes from Google; fall back to the email handle, then a generic.
    const name = defaultName.trim() || email.split('@')[0] || 'Student';
    setSaving(true);
    try {
      await completeOnboarding(uid, name, level);
      // onboarded flips true via the live profile snapshot → the gate finishes.
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] level setup failed', err);
      toast.error('Could not save that. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 text-center sm:text-left">
        <DialogTitle>One more thing</DialogTitle>
        <DialogDescription>
          {defaultName ? `Nice to meet you, ${defaultName.split(' ')[0]}! ` : ''}
          Pick your maths course so we show the right papers — you can change it later.
        </DialogDescription>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label="Maths level">
        {MATH_LEVELS.map((m) => {
          const selected = level === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setLevel(m.value)}
              disabled={saving}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition disabled:opacity-50',
                selected ? 'border-primary bg-accent' : 'hover:border-primary hover:bg-accent',
              )}
            >
              <span className="text-sm font-medium">{m.label}</span>
              <LevelBadge level={m.value} />
            </button>
          );
        })}
      </div>

      <Button onClick={handleDone} disabled={!uid || level === '' || saving}>
        {saving ? 'Saving…' : 'Done'}
      </Button>
    </div>
  );
}
