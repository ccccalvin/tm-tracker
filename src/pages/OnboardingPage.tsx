import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  Select,
} from '@/components/ui';
import { useClasses } from '@/hooks/useData';
import { completeOnboarding } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

const MAX_NAME_LENGTH = 40;

/**
 * First-run onboarding (DESIGN.md §4.2). New users land here after their first
 * sign-in to pick a display name and class before reaching Home. Class is
 * locked after this step — only an admin can reassign it later.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const profile = useAuthStore((s) => s.profile);
  const { classes, loading: classesLoading } = useClasses();

  const [displayName, setDisplayName] = useState(() => profile?.displayName ?? '');
  const [classId, setClassId] = useState('');
  const [saving, setSaving] = useState(false);

  // Only non-archived classes are selectable; useClasses() already sorts them.
  const selectableClasses = useMemo(
    () => classes.filter((c) => !c.archived),
    [classes],
  );

  const trimmedName = displayName.trim();
  const canSubmit = Boolean(uid) && trimmedName.length > 0 && classId !== '' && !saving;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uid || trimmedName.length === 0 || classId === '' || saving) return;
    setSaving(true);
    try {
      await completeOnboarding(uid, trimmedName, classId);
      navigate('/');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] onboarding failed', err);
      toast.error('Could not save your details. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>Welcome to tm-tracker</CardTitle>
          <CardDescription>
            Set your display name and pick your class to get started.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
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
              <Label htmlFor="classId">Class</Label>
              <Select
                id="classId"
                name="classId"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                disabled={saving || classesLoading}
              >
                <option value="" disabled>
                  {classesLoading ? 'Loading classes…' : 'Select your class'}
                </option>
                {selectableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {saving ? 'Saving…' : 'Continue'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
