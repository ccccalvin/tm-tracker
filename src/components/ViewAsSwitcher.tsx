import { useUIStore } from '@/store/useUIStore';
import { MATH_LEVELS } from '@/lib/config';
import { cn } from '@/lib/cn';
import type { MathLevel } from '@/types';

/**
 * Admin-only "view as" switcher (rendered in the header). Flips the admin's own
 * student-facing views (Home / Tracker) between a normal admin view and each
 * math level, so a single admin account can preview the ADVN / EXT1 / EXT2
 * student experience without re-onboarding or impersonating a real student.
 * Ephemeral — see useUIStore.previewLevel.
 */
const OPTIONS: { value: MathLevel | null; label: string }[] = [
  { value: null, label: 'Admin' },
  ...MATH_LEVELS.map((l) => ({ value: l.value as MathLevel, label: l.value })),
];

export function ViewAsSwitcher() {
  const previewLevel = useUIStore((s) => s.previewLevel);
  const setPreviewLevel = useUIStore((s) => s.setPreviewLevel);

  return (
    <div
      className="hidden md:flex items-center gap-1 rounded-md border bg-muted/40 p-0.5"
      title="Preview the app as a student of each math level"
    >
      <span className="px-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        View as
      </span>
      {OPTIONS.map((opt) => {
        const active = previewLevel === opt.value;
        return (
          <button
            key={opt.label}
            onClick={() => setPreviewLevel(opt.value)}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
