import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Spinner } from '@/components/Spinner';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Login / landing screen. The entire app is login-gated, so this is the only
 * thing an unauthenticated visitor ever sees: brand, tagline and a single
 * "Sign in with Google" action. DESIGN.md §4.1.
 */
export function LoginPage() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // On success the auth listener swaps this page out — no further work here.
    } catch (err) {
      console.error('[tm-tracker] sign-in failed', err);
      toast.error('Sign-in failed. Please try again.');
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl font-bold">tm-tracker</CardTitle>
          <CardDescription>Log your papers. Climb the board.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleSignIn}
            disabled={signingIn}
            aria-busy={signingIn}
          >
            {signingIn ? (
              <>
                <Spinner className="mr-2" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
