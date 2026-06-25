import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui';
import { ClassBadge } from '@/components/ClassBadge';
import { useAuthStore, useProfile } from '@/store/useAuthStore';
import { useClassMap } from '@/hooks/useData';
import { updateDisplayName } from '@/lib/db';

/**
 * Options modal (DESIGN.md §5): editable display name · (locked) class ·
 * "Signed in as" email · Sign out. Rendered by Layout; dark/light lives in the
 * navbar so it is intentionally not duplicated here.
 */
export function OptionsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const profile = useProfile();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const classMap = useClassMap();

  const [name, setName] = useState(profile?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Re-sync the input whenever the profile name changes or the modal reopens.
  useEffect(() => {
    if (open) setName(profile?.displayName ?? '');
  }, [open, profile?.displayName]);

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const classInfo = profile.classId ? classMap.get(profile.classId) : undefined;
  const showClassRow = !isAdmin && Boolean(profile.classId);

  const trimmed = name.trim();
  const canSave = !saving && trimmed.length > 0 && trimmed !== profile.displayName;

  async function handleSave() {
    if (!uid || !canSave) return;
    setSaving(true);
    try {
      await updateDisplayName(uid, trimmed);
      toast.success('Display name updated.');
    } catch (err) {
      console.error('[tm-tracker] failed to update display name', err);
      toast.error('Could not update your display name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
    } catch (err) {
      console.error('[tm-tracker] failed to sign out', err);
      toast.error('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Options</DialogTitle>
          <DialogDescription>Manage your profile and account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Editable display name */}
          <div className="space-y-2">
            <Label htmlFor="options-display-name">Display name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="options-display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSave) {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
                placeholder="Your name"
                maxLength={60}
                disabled={saving}
                autoComplete="off"
              />
              <Button onClick={() => void handleSave()} disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the name shown on the leaderboard.
            </p>
          </div>

          {/* Class — read-only */}
          {showClassRow && (
            <div className="space-y-2">
              <Label>Class</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {classInfo?.name ?? profile.classId}
                </span>
                {classInfo?.badge && <ClassBadge badge={classInfo.badge} />}
              </div>
              <p className="text-xs text-muted-foreground">
                Class is set by your teacher — ask Calvin to change it.
              </p>
            </div>
          )}

          {/* Signed in as — read-only */}
          <div className="space-y-1">
            <Label>Signed in as</Label>
            <p className="text-sm text-muted-foreground break-all">{profile.email}</p>
          </div>

          {/* Sign out */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
