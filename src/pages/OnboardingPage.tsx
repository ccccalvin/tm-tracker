import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui';
import { claimAdmin } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

const MAX_NAME_LENGTH = 40;

/** Firestore throws this code when the admin token doesn't match the secret. */
function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'permission-denied'
  );
}

/**
 * Hidden admin-access page (`/admin-access`). Students never see this — they
 * sign in and pick a level through the in-app sign-in gate, and the bootstrap
 * admin is promoted automatically. This is only for granting a *co-admin* the
 * role via the shared secret token. Requires being signed in already.
 */
export function AdminAccessPage() {
  const navigate = useNavigate();
  const fbUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const uid = fbUser?.uid;
  const googleName = fbUser?.displayName ?? '';

  const [displayName, setDisplayName] = useState(profile?.displayName || googleName);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedName = displayName.trim();
  const trimmedToken = token.trim();
  const canSubmit =
    Boolean(uid) && trimmedName.length > 0 && trimmedToken.length > 0 && !saving;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uid || trimmedName.length === 0 || trimmedToken.length === 0 || saving) return;
    setSaving(true);
    try {
      await claimAdmin(uid, trimmedName, trimmedToken);
      toast.success('You are now an admin.');
      navigate('/');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] admin claim failed', err);
      toast.error(
        isPermissionDenied(err)
          ? 'That admin token is incorrect.'
          : 'Could not sign you up as an admin. Please try again.',
      );
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Admin access</CardTitle>
          <CardDescription>
            Enter your name and the admin token to manage tm-tracker.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="adminName">Display name</Label>
              <Input
                id="adminName"
                name="adminName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="name"
                autoFocus
                required
                placeholder="Your name"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminToken">Admin token</Label>
              <Input
                id="adminToken"
                name="adminToken"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                required
                placeholder="Secret token"
                disabled={saving}
              />
            </div>
          </CardContent>

          <CardFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/')} disabled={saving}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {saving ? 'Verifying…' : 'Become admin'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
