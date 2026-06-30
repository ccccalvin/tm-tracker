import type { AppUser, LeaderboardEntry } from '@/types';
import { rankEntries, topN } from '@/lib/ranking';
import { LEADERBOARD_SIZE } from '@/lib/config';
import { formatCount } from '@/lib/format';
import { LevelBadge } from '@/components/LevelBadge';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Top-3 medal tint helper (classes defined in index.css). */
function medalClass(rank: number): string {
  if (rank === 1) return 'row-gold';
  if (rank === 2) return 'row-silver';
  if (rank === 3) return 'row-bronze';
  return '';
}

/**
 * One leaderboard row: plain rank · name + level badge · paper count.
 * Used by the table and (with the same layout) the standalone "You" panel.
 */
export function LeaderboardRow({
  entry,
  className,
  medal = true,
}: {
  entry: LeaderboardEntry;
  className?: string;
  /** Whether to apply the top-3 gold/silver/bronze tint. The standalone "You"
   * panel passes false so it never reads as a second medal area (DESIGN §6.2). */
  medal?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
        medal && medalClass(entry.rank),
        entry.isYou && 'ring-1 ring-primary/40 font-semibold',
        className,
      )}
    >
      <span className="w-8 shrink-0 text-center font-semibold tabular-nums text-muted-foreground">
        #{entry.rank}
      </span>
      <Avatar src={entry.photoURL} name={entry.displayName} className="h-7 w-7" />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{entry.displayName || 'Unnamed'}</span>
        <LevelBadge level={entry.mathLevel} />
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
        {formatCount(entry.paperCount)}
      </span>
    </div>
  );
}

/**
 * The ranked leaderboard for one scope. Pass `classId` undefined for the global
 * "All" board, or a classId to filter to that class. Shows at most
 * LEADERBOARD_SIZE people — a hard row cap, so a tie at the cut-off is
 * truncated rather than allowed to spill past it.
 */
export function LeaderboardTable({
  users,
  myUid,
  classId,
  loading,
}: {
  users: AppUser[];
  myUid: string;
  classId?: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const entries = rankEntries(users, myUid, classId);
  const rows = topN(entries, LEADERBOARD_SIZE);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No ranked students yet.</p>;
  }

  return (
    <div className="space-y-1">
      {rows.map((entry) => (
        <LeaderboardRow key={entry.uid} entry={entry} />
      ))}
    </div>
  );
}
