import { useMemo, useState } from 'react';
import { Loader2, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAllUsers, useClasses } from '@/hooks/useData';
import { useAuthStore } from '@/store/useAuthStore';
import { BOOTSTRAP_ADMIN_EMAIL, MATH_LEVELS } from '@/lib/config';
import {
  reassignClass,
  removeUser,
  setMathLevel,
  setRole,
  setTMStudent,
} from '@/lib/db';
import {
  Badge,
  Button,
  ConfirmDialog,
  Select,
  Skeleton,
} from '@/components/ui';
import { LevelBadge } from '@/components/LevelBadge';
import { relativeTime } from '@/lib/format';
import type { AppUser, ClassInfo, MathLevel } from '@/types';
import { cn } from '@/lib/cn';

type TMFilter = 'all' | 'tm' | 'not-tm';

const FILTERS: { value: TMFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tm', label: 'TM students' },
  { value: 'not-tm', label: 'Not TM' },
];

/**
 * Admin users table (DESIGN.md §8.1). One table, filterable by a pill control,
 * with TM students sorted to the top, then by paperCount desc. Per-row: class
 * reassign, TM toggle, admin toggle, and a confirm-guarded remove.
 */
export function UsersTable() {
  const { users, loading } = useAllUsers();
  const { classes } = useClasses();
  const currentUid = useAuthStore((s) => s.firebaseUser?.uid);
  const [filter, setFilter] = useState<TMFilter>('all');

  const rows = useMemo(() => {
    const filtered = users.filter((u) => {
      if (filter === 'tm') return u.isTMStudent;
      if (filter === 'not-tm') return !u.isTMStudent;
      return true;
    });
    return [...filtered].sort((a, b) => {
      // TM students first, then by paperCount desc, then by name.
      if (a.isTMStudent !== b.isTMStudent) return a.isTMStudent ? -1 : 1;
      if (b.paperCount !== a.paperCount) return b.paperCount - a.paperCount;
      return (a.displayName || a.email).localeCompare(b.displayName || b.email);
    });
  }, [users, filter]);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border bg-muted p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-[0.3rem] px-3 py-1 text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <UsersIcon className="h-6 w-6" />
          <p className="text-sm">No users match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Level</th>
                <th className="py-2 pr-4 font-medium">Class</th>
                <th className="py-2 pr-4 font-medium">Last active</th>
                <th className="py-2 pr-4 font-medium">TM</th>
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <UserRow
                  key={user.uid}
                  user={user}
                  classes={classes}
                  currentUid={currentUid}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  classes,
  currentUid,
}: {
  user: AppUser;
  classes: ClassInfo[];
  currentUid: string | undefined;
}) {
  const [busy, setBusy] = useState<null | 'level' | 'class' | 'tm' | 'admin'>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Guard against self-lockout: an admin can't demote or remove themselves, and
  // the bootstrap admin (Calvin) is permanently protected (DESIGN §3).
  const isSelf = user.uid === currentUid;
  const isBootstrap =
    !!user.email && user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const adminLocked = isSelf || isBootstrap;

  async function handleSetLevel(level: MathLevel) {
    setBusy('level');
    try {
      await setMathLevel(user.uid, level);
      toast.success('Math level updated.');
    } catch {
      toast.error('Could not update the math level.');
    } finally {
      setBusy(null);
    }
  }

  async function handleReassign(classId: string) {
    setBusy('class');
    try {
      await reassignClass(user.uid, classId);
      toast.success('Class reassigned.');
    } catch {
      toast.error('Could not reassign class.');
    } finally {
      setBusy(null);
    }
  }

  async function handleTMToggle(next: boolean) {
    setBusy('tm');
    try {
      await setTMStudent(user.uid, next);
      toast.success(next ? 'Added to the leaderboard.' : 'Removed from the leaderboard.');
    } catch {
      toast.error('Could not update TM status.');
    } finally {
      setBusy(null);
    }
  }

  async function handleAdminToggle(next: boolean) {
    setBusy('admin');
    try {
      await setRole(user.uid, next ? 'admin' : 'student');
      toast.success(next ? 'Promoted to admin.' : 'Demoted to student.');
    } catch {
      toast.error('Could not update role.');
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeUser(user.uid);
      toast.success('User removed.');
      setConfirmRemove(false);
    } catch {
      toast.error('Could not remove the user.');
    } finally {
      setRemoving(false);
    }
  }

  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Unnamed');

  return (
    <tr className="border-b last:border-0 align-middle">
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium">{displayName}</span>
            {user.email && (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            )}
          </div>
          {user.role === 'admin' && (
            <Badge variant="default" className="text-[0.65rem]">
              admin
            </Badge>
          )}
          {!user.onboarded && (
            <Badge variant="warning" className="text-[0.65rem]" title="Has not set a name yet">
              pending name
            </Badge>
          )}
        </div>
      </td>

      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          <LevelBadge level={user.mathLevel} />
          <Select
            value={user.mathLevel ?? ''}
            disabled={busy === 'level'}
            onChange={(e) => handleSetLevel(e.target.value as MathLevel)}
            className="h-8 w-28"
            aria-label={`Math level for ${displayName}`}
          >
            {/* No level yet — admin assigns one (existing students start blank). */}
            {!user.mathLevel && <option value="" disabled>— none —</option>}
            {MATH_LEVELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value}
              </option>
            ))}
          </Select>
        </div>
      </td>

      <td className="py-2 pr-4">
        <Select
          value={user.classId}
          disabled={busy === 'class'}
          onChange={(e) => handleReassign(e.target.value)}
          className="h-8 w-40"
          aria-label={`Class for ${displayName}`}
        >
          {/* Only offer "unassigned" to a user who has no class yet — admins
              move students between real classes, they don't un-assign them. */}
          {!user.classId && <option value="">— unassigned —</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.badge}
            </option>
          ))}
        </Select>
      </td>

      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
        {relativeTime(user.lastCompletedAt)}
      </td>

      <td className="py-2 pr-4">
        <Toggle
          checked={user.isTMStudent}
          disabled={busy === 'tm'}
          onChange={handleTMToggle}
          label={`Toggle TM student for ${displayName}`}
        />
      </td>

      <td className="py-2 pr-4">
        <Toggle
          checked={user.role === 'admin'}
          disabled={busy === 'admin' || adminLocked}
          onChange={handleAdminToggle}
          label={
            adminLocked
              ? `${displayName} can't change their own admin status`
              : `Toggle admin for ${displayName}`
          }
        />
      </td>

      <td className="py-2 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmRemove(true)}
          disabled={adminLocked}
          title={adminLocked ? 'This admin account is protected' : `Remove ${displayName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <ConfirmDialog
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          title={`Remove ${displayName}?`}
          description="This deletes their profile. Their completions and to-dos become unreachable. This cannot be undone."
          confirmLabel="Remove user"
          onConfirm={handleRemove}
          loading={removing}
          variant="destructive"
        />
      </td>
    </tr>
  );
}

/** Token-styled switch. Spins while a mutation is in flight (disabled). */
function Toggle({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      >
        {disabled && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
      </span>
    </button>
  );
}
