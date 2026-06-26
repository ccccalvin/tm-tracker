import { useEffect, useRef, useState } from 'react';
import { LogOut, Upload, Trash2 } from 'lucide-react';
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
import { Avatar } from '@/components/Avatar';
import { AvatarCropper } from '@/components/AvatarCropper';
import { useAuthStore, useProfile } from '@/store/useAuthStore';
import { useClassMap } from '@/hooks/useData';
import {
  updateDisplayName,
  uploadAvatar,
  removeAvatar,
  updateTrialsCountdown,
} from '@/lib/db';

/**
 * Options modal (DESIGN.md §5): profile photo · editable display name ·
 * (locked) class · personal countdown settings · "Signed in as" email ·
 * Sign out. Rendered by Layout; dark/light lives in the navbar so it is
 * intentionally not duplicated here.
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

  // ── profile photo ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // ── trials countdown ──
  const [showTrials, setShowTrials] = useState(false);
  const [trialsDate, setTrialsDate] = useState('');
  const [countdownSaving, setCountdownSaving] = useState(false);

  // Re-sync editable fields whenever the profile changes or the modal reopens.
  useEffect(() => {
    if (!open) return;
    setName(profile?.displayName ?? '');
    setShowTrials(profile?.showTrialsCountdown ?? false);
    setTrialsDate(profile?.trialsDate ?? '');
  }, [open, profile?.displayName, profile?.showTrialsCountdown, profile?.trialsDate]);

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const classInfo = profile.classId ? classMap.get(profile.classId) : undefined;
  const showClassRow = !isAdmin && Boolean(profile.classId);

  const trimmed = name.trim();
  const canSave = !saving && trimmed.length > 0 && trimmed !== profile.displayName;

  const countdownDirty =
    showTrials !== profile.showTrialsCountdown || trialsDate !== (profile.trialsDate ?? '');

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

  function closeCropper() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('That image is too large (max 15 MB).');
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropped(blob: Blob) {
    if (!uid) return;
    setAvatarSaving(true);
    try {
      await uploadAvatar(uid, blob);
      toast.success('Profile photo updated.');
      closeCropper();
    } catch (err) {
      console.error('[tm-tracker] failed to upload avatar', err);
      toast.error('Could not upload your photo. Please try again.');
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!uid) return;
    setRemovingAvatar(true);
    try {
      await removeAvatar(uid);
      toast.success('Profile photo removed.');
    } catch (err) {
      console.error('[tm-tracker] failed to remove avatar', err);
      toast.error('Could not remove your photo. Please try again.');
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function handleSaveCountdown() {
    if (!uid || !countdownDirty || countdownSaving) return;
    if (showTrials && !trialsDate) {
      toast.error('Pick your trials date to show the countdown.');
      return;
    }
    setCountdownSaving(true);
    try {
      await updateTrialsCountdown(uid, {
        showTrialsCountdown: showTrials,
        trialsDate: trialsDate || null,
      });
      toast.success('Countdown settings saved.');
    } catch (err) {
      console.error('[tm-tracker] failed to save countdown settings', err);
      toast.error('Could not save your countdown settings. Please try again.');
    } finally {
      setCountdownSaving(false);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Options</DialogTitle>
          <DialogDescription>Manage your profile and account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Profile photo */}
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-4">
              <Avatar src={profile.photoURL} name={profile.displayName} className="h-16 w-16" />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarSaving || removingAvatar}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {profile.photoURL ? 'Change' : 'Upload'}
                </Button>
                {profile.photoURL && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={removingAvatar || avatarSaving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {removingAvatar ? 'Removing…' : 'Remove'}
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the leaderboard and in the header.
            </p>
          </div>

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

          {/* Countdowns */}
          <div className="space-y-2">
            <Label>Countdowns</Label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showTrials}
                onChange={(e) => setShowTrials(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Show a “days until trials” countdown
            </label>
            {showTrials && (
              <div className="space-y-1.5 pl-6">
                <Label htmlFor="trials-date" className="text-xs text-muted-foreground">
                  Your trials date
                </Label>
                <Input
                  id="trials-date"
                  type="date"
                  value={trialsDate}
                  onChange={(e) => setTrialsDate(e.target.value)}
                  className="max-w-[12rem]"
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => void handleSaveCountdown()}
                disabled={!countdownDirty || countdownSaving}
              >
                {countdownSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Shown on the home page above the leaderboard. The HSC countdown is always shown.
            </p>
          </div>

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

      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          open={Boolean(cropSrc)}
          onOpenChange={(o) => {
            if (!o) closeCropper();
          }}
          onCropped={handleCropped}
          saving={avatarSaving}
        />
      )}
    </Dialog>
  );
}
