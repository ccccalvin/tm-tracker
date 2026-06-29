import { useMemo } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { useActivityFeed, useAllUsers } from '@/hooks/useData';
import { relativeTime } from '@/lib/format';
import { Skeleton } from '@/components/ui';

/**
 * Recent stream of completions across all students (DESIGN.md §8.1). Newest
 * first; joins the activity feed's uid → displayName via useAllUsers(). Helps
 * an admin spot anomalies (e.g. 40 ticks in a minute). Admin-only by rules.
 */
export function ActivityFeed() {
  const { items, loading, error } = useActivityFeed(50);
  const { users } = useAllUsers();

  const nameByUid = useMemo(
    () => new Map(users.map((u) => [u.uid, u.displayName])),
    [users],
  );

  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="py-2.5">
            <Skeleton className="h-4 w-3/4" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    // Distinct from the empty state so a real failure isn't mistaken for "no
    // completions". The hint maps the Firestore error code to a likely cause.
    const hint =
      error.code === 'permission-denied'
        ? 'This account may not have admin access in the database.'
        : error.code === 'failed-precondition'
          ? 'The activity index may still be building — try again shortly.'
          : 'Something went wrong loading recent completions.';
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-foreground">Couldn't load activity.</p>
        <p className="text-xs">{hint}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <Activity className="h-6 w-6" />
        <p className="text-sm">No activity yet — completions will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const name = nameByUid.get(item.uid) || 'Someone';
        return (
          <li
            key={`${item.uid}-${item.paperId}-${item.completedAt}`}
            className="flex items-baseline gap-1.5 py-2.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-foreground">{name}</span>
              <span className="text-muted-foreground"> completed </span>
              <span className="font-medium text-foreground">{item.paperLabel}</span>
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {relativeTime(item.completedAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
