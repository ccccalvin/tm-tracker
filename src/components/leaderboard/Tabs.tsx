import { cn } from '@/lib/cn';

export interface TabOption {
  /** Stable value for the tab (e.g. a classId, or '' for the "All" scope). */
  value: string;
  /** Visible label (e.g. "All" or a class badge). */
  label: string;
}

/**
 * Controlled pill-style tab switcher (matches the tmpdf Leaderboard period pills).
 * Active pill uses the indigo accent; inactive pills sit on the muted surface.
 */
export function Tabs({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
