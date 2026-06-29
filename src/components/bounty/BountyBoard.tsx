import { useEffect, useMemo, useRef } from 'react';
import { Gift, Crown, CalendarDays, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { ClassBadge } from '@/components/ClassBadge';
import { BountyCountdown } from '@/components/bounty/BountyCountdown';
import { useBountyStandings } from '@/hooks/useData';
import { useIsAdmin } from '@/store/useAuthStore';
import {
  rankBountyEntries,
  bountyStatus,
  bountyCountdownTarget,
  formatBountyRange,
} from '@/lib/bounty';
import { lockBountyResult } from '@/lib/db';
import { formatCount } from '@/lib/format';
import { LEADERBOARD_TOP_POSITIONS } from '@/lib/config';
import { cn } from '@/lib/cn';
import type { AppUser, Bounty, BountyResultEntry, ClassInfo } from '@/types';

/** A unified standings row, whether computed live or read from a locked result. */
interface DisplayRow extends BountyResultEntry {
  isYou: boolean;
}

/** Top-3 medal tint (same classes as the main leaderboard, defined in index.css). */
function medalClass(rank: number): string {
  if (rank === 1) return 'row-gold';
  if (rank === 2) return 'row-silver';
  if (rank === 3) return 'row-bronze';
  return '';
}

const statusVariant = {
  active: 'success',
  upcoming: 'info',
  ended: 'secondary',
} as const;

function BountyRow({
  entry,
  classMap,
  ended,
}: {
  entry: DisplayRow;
  classMap: Map<string, ClassInfo>;
  ended: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
        medalClass(entry.rank),
        entry.isYou && 'ring-1 ring-primary/40 font-semibold',
      )}
    >
      <span className="w-8 shrink-0 text-center font-semibold tabular-nums text-muted-foreground">
        #{entry.rank}
      </span>
      <Avatar src={entry.photoURL} name={entry.displayName} className="h-7 w-7" />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{entry.displayName || 'Unnamed'}</span>
        <ClassBadge badge={classMap.get(entry.classId)?.badge ?? ''} />
        {ended && entry.rank === 1 && (
          <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-500" aria-label="Winner" />
        )}
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
        {formatCount(entry.count)}
      </span>
    </div>
  );
}

/** Celebratory "winner takes the prize" banner for a finished bounty. */
function WinnerBanner({ winners, prize }: { winners: DisplayRow[]; prize: string }) {
  const names = winners.map((w) => w.displayName || 'Unnamed');
  const nameList =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  const tie = winners.length > 1;
  const count = winners[0]?.count ?? 0;
  const prizePhrase = prize
    ? tie
      ? `share ${prize}`
      : `wins ${prize}`
    : tie
      ? 'share the top spot'
      : 'takes the top spot';

  return (
    <div className="row-gold mb-4 flex items-start gap-3 rounded-lg px-4 py-3">
      <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold">
          {tie ? "It's a tie! Congratulations " : 'Congratulations '}
          {nameList}!
        </p>
        <p className="text-muted-foreground">
          {tie ? 'They ' : `${names[0]} `}
          {prizePhrase} with {formatCount(count)}.
        </p>
      </div>
    </div>
  );
}

/**
 * One bounty leaderboard on Home: prize + pitch + a live count-in-window race
 * with a ticking countdown. When the window closes the standings are frozen
 * (locked into the bounty doc by an admin client) and first place is celebrated.
 */
export function BountyBoard({
  bounty,
  users,
  myUid,
  classMap,
}: {
  bounty: Bounty;
  users: AppUser[];
  myUid: string;
  classMap: Map<string, ClassInfo>;
}) {
  const isAdmin = useIsAdmin();
  const status = bountyStatus(bounty.startDate, bounty.endDate);
  const ended = status === 'ended';
  const locked = bounty.result;

  // Once locked, stop the live query — the frozen snapshot is the source of truth.
  const { counts, loading } = useBountyStandings(
    bounty.startDate,
    bounty.endDate,
    !locked,
  );
  const liveEntries = useMemo(
    () => rankBountyEntries(counts, users, myUid),
    [counts, users, myUid],
  );

  // Prefer the frozen result when present; otherwise show the live standings.
  const displayRows: DisplayRow[] = useMemo(() => {
    if (locked) {
      return locked.standings.map((s) => ({ ...s, isYou: s.uid === myUid }));
    }
    return liveEntries;
  }, [locked, liveEntries, myUid]);

  const rows = displayRows.filter((r) => r.rank <= LEADERBOARD_TOP_POSITIONS);
  const winners = displayRows.filter((r) => r.rank === 1);

  const target = bountyCountdownTarget(bounty.startDate, bounty.endDate);
  const countdownLabel = status === 'upcoming' ? 'Starts in' : 'Time left to win';

  // Lock first place in once the bounty ends. Admin-only (security rules);
  // write-once, guarded so it fires at most once per mount.
  const lockAttempted = useRef(false);
  useEffect(() => {
    if (!ended || locked || !isAdmin || loading || lockAttempted.current) return;
    lockAttempted.current = true;
    const snapshot: BountyResultEntry[] = liveEntries.map((e) => ({
      uid: e.uid,
      displayName: e.displayName,
      classId: e.classId,
      photoURL: e.photoURL,
      count: e.count,
      rank: e.rank,
    }));
    lockBountyResult(bounty.id, snapshot).catch((err) => {
      console.error('[tm-tracker] failed to lock bounty result', err);
      lockAttempted.current = false; // allow a retry on a later render
    });
  }, [ended, locked, isAdmin, loading, liveEntries, bounty.id]);

  return (
    <Card className="border-primary/30">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-5 w-5 text-primary" />
            {bounty.title || 'Bounty'}
          </CardTitle>
          {bounty.prize && (
            <Badge variant="warning" className="text-sm">
              {bounty.prize}
            </Badge>
          )}
          <Badge variant={statusVariant[status]}>
            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
          </Badge>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatBountyRange(bounty.startDate, bounty.endDate)}
        </p>
        {bounty.message && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{bounty.message}</p>
        )}
        {target !== null && (
          <div className="pt-1">
            <BountyCountdown target={target} label={countdownLabel} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {ended && winners.length > 0 && (
          <WinnerBanner winners={winners} prize={bounty.prize} />
        )}
        {loading && !locked ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {ended ? 'This bounty ended with no entries.' : 'No papers completed yet — be the first!'}
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map((entry) => (
              <BountyRow key={entry.uid} entry={entry} classMap={classMap} ended={ended} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
