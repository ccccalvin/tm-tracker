import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Tabs, type TabOption } from '@/components/leaderboard/Tabs';
import {
  LeaderboardRow,
  LeaderboardTable,
} from '@/components/leaderboard/LeaderboardTable';
import { StatStrip } from '@/components/StatStrip';
import { RecentList } from '@/components/RecentList';
import { useAllUsers, useClasses, useClassMap, useCompletions } from '@/hooks/useData';
import { useAuthStore, useProfile } from '@/store/useAuthStore';
import { rankEntries, findYou } from '@/lib/ranking';
import { studentStats, recentCompletions } from '@/lib/stats';
import { RECENT_COMPLETED_COUNT } from '@/lib/config';

/** Sentinel value for the "All" (global) tab — distinct from any classId. */
const ALL = '';

export function HomePage() {
  const myUid = useAuthStore((s) => s.firebaseUser?.uid);
  const profile = useProfile();
  const isAdmin = profile?.role === 'admin';

  const { users, loading: usersLoading } = useAllUsers();
  const { classes } = useClasses();
  const classMap = useClassMap();
  const { completions: myCompletions, loading: completionsLoading } = useCompletions(myUid);

  const [tab, setTab] = useState<string>(ALL);

  // Tabs: "All" + one per non-archived class (label = its badge).
  const tabOptions = useMemo<TabOption[]>(
    () => [
      { value: ALL, label: 'All' },
      ...classes
        .filter((c) => !c.archived)
        .map((c) => ({ value: c.id, label: c.badge })),
    ],
    [classes],
  );

  // The classId scope for the current tab (undefined ⇒ global "All").
  const scopeClassId = tab === ALL ? undefined : tab;

  // Full ranking for the current scope — used to find the signed-in user's own
  // entry (even if outside the top positions shown in the table).
  const youEntry = useMemo(() => {
    if (!myUid) return undefined;
    return findYou(rankEntries(users, myUid, scopeClassId));
  }, [users, myUid, scopeClassId]);

  return (
    <div className="space-y-6">
      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          <Tabs value={tab} onChange={setTab} options={tabOptions} className="pt-2" />
        </CardHeader>
        <CardContent>
          <LeaderboardTable
            users={users}
            myUid={myUid ?? ''}
            classId={scopeClassId}
            classMap={classMap}
            loading={usersLoading}
          />

          {/* ── Personal "You" entry (non-admins only) ──────────────────── */}
          {!isAdmin && !usersLoading && (
            <div className="mt-4 border-t pt-4">
              {youEntry ? (
                <div className="space-y-1.5">
                  <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    You
                  </p>
                  <LeaderboardRow entry={youEntry} classMap={classMap} medal={false} />
                </div>
              ) : (
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  You&apos;re tracking privately — ask Calvin to add you to the leaderboard.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Personal stats (non-admins only) ──────────────────────────────── */}
      {!isAdmin && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your stats</CardTitle>
            </CardHeader>
            <CardContent>
              {completionsLoading ? (
                <StatStripSkeleton />
              ) : (
                <StatStrip stats={studentStats(myCompletions)} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recently completed</CardTitle>
            </CardHeader>
            <CardContent>
              {completionsLoading ? (
                <RecentListSkeleton />
              ) : (
                <RecentList
                  completions={recentCompletions(myCompletions, RECENT_COMPLETED_COUNT)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatStripSkeleton() {
  return (
    <div className="flex gap-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-7 w-12 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function RecentListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-5 w-full animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
