import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react';
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
import { claimAdmin, completeOnboarding } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

const MAX_NAME_LENGTH = 40;

type Step = 'choose' | 'student' | 'admin';

/** Firestore throws this code when the admin token doesn't match the secret. */
function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'permission-denied'
  );
}

/**
 * First-run onboarding (DESIGN.md §3/§4.2). New users pick how they're joining:
 * as a student (display name + class) or as an admin (display name + a shared
 * secret token). Students lock their class here; admins carry no class.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const fbUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const uid = fbUser?.uid;
  const googleName = fbUser?.displayName ?? '';

  const [step, setStep] = useState<Step>('choose');
  const goHome = () => navigate('/');
  const backToChoose = () => setStep('choose');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        {step === 'choose' && <ChooseStep onPick={setStep} />}
        {step === 'student' && (
          <StudentStep
            uid={uid}
            initialName={profile?.displayName || googleName}
            onBack={backToChoose}
            onDone={goHome}
          />
        )}
        {step === 'admin' && (
          <AdminStep
            uid={uid}
            initialName={profile?.displayName || googleName}
            onBack={backToChoose}
            onDone={goHome}
          />
        )}
      </Card>
    </div>
  );
}

/** Step 1 — pick a path. */
function ChooseStep({ onPick }: { onPick: (step: Step) => void }) {
  return (
    <>
      <CardHeader className="space-y-2 text-center">
        <CardTitle>Welcome to tm-tracker</CardTitle>
        <CardDescription>How are you joining?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-6">
        <button
          type="button"
          onClick={() => onPick('student')}
          className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition hover:border-primary hover:bg-accent"
        >
          <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
          <span className="space-y-0.5">
            <span className="block font-medium">I&apos;m a student</span>
            <span className="block text-sm text-muted-foreground">
              Track papers and climb the leaderboard.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick('admin')}
          className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition hover:border-primary hover:bg-accent"
        >
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
          <span className="space-y-0.5">
            <span className="block font-medium">I&apos;m an admin</span>
            <span className="block text-sm text-muted-foreground">
              Secret token required.
            </span>
          </span>
        </button>
      </CardContent>
    </>
  );
}

/** Step 2a — student: display name + class. */
function StudentStep({
  uid,
  initialName,
  onBack,
  onDone,
}: {
  uid: string | undefined;
  initialName: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const { classes, loading: classesLoading } = useClasses();
  const [displayName, setDisplayName] = useState(initialName);
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
      onDone();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] onboarding failed', err);
      toast.error('Could not save your details. Please try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <CardHeader className="space-y-2 text-center">
        <CardTitle>Set up your profile</CardTitle>
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

        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={!canSubmit}>
            {saving ? 'Saving…' : 'Continue'}
          </Button>
        </CardFooter>
      </form>
    </>
  );
}

/** Step 2b — admin: display name + shared secret token. */
function AdminStep({
  uid,
  initialName,
  onBack,
  onDone,
}: {
  uid: string | undefined;
  initialName: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [displayName, setDisplayName] = useState(initialName);
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
      onDone();
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
    <>
      <CardHeader className="space-y-2 text-center">
        <CardTitle>Admin sign-up</CardTitle>
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
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={!canSubmit}>
            {saving ? 'Verifying…' : 'Become admin'}
          </Button>
        </CardFooter>
      </form>
    </>
  );
}
