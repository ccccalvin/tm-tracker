import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ListChecks, Gift, Settings } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import {
  LeaderboardRow,
  LeaderboardTable,
} from '@/components/leaderboard/LeaderboardTable';
import { CompletionProgress } from '@/components/tracker/CompletionProgress';
import { RecentList } from '@/components/RecentList';
import { useAllUsers, useCompletions } from '@/hooks/useData';
import { useAuthStore, useProfile } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { rankEntries, findYou } from '@/lib/ranking';
import { recentCompletions } from '@/lib/stats';
import { PAPERS } from '@/lib/catalog';
import { DEFAULT_MIN_YEAR } from '@/lib/config';

/** How many recent completions to list in the (taller) right-hand box. */
const RECENT_SHOWN = 20;

export function HomePage() {
  const navigate = useNavigate();
  const myUid = useAuthStore((s) => s.firebaseUser?.uid);
  const profile = useProfile();
  const isAdmin = profile?.role === 'admin';
  const setOptionsOpen = useUIStore((s) => s.setOptionsOpen);

  const { users, loading: usersLoading } = useAllUsers();
  const {
    completions: myCompletions,
    completedIds,
    loading: completionsLoading,
  } = useCompletions(myUid);

  // Personal "papers completed" progress — same in-scope set as the Tracker page
  // (recent papers, year >= DEFAULT_MIN_YEAR) so the numbers line up exactly.
  const recentPapers = useMemo(
    () => PAPERS.filter((p) => p.year >= DEFAULT_MIN_YEAR),
    [],
  );
  const completedRecent = useMemo(
    () => recentPapers.filter((p) => completedIds.has(p.id)).length,
    [recentPapers, completedIds],
  );

  // Full global ranking — used to find the signed-in user's own entry (even if
  // outside the top positions shown in the table).
  const youEntry = useMemo(() => {
    if (!myUid) return undefined;
    return findYou(rankEntries(users, myUid));
  }, [users, myUid]);

  const leaderboardCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription className="italic">
          “Do so much volume that it would be unreasonable to be unsuccessful.”
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LeaderboardTable
          users={users}
          myUid={myUid ?? ''}
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
                <LeaderboardRow entry={youEntry} medal={false} />
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
  );

  const actions = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Button
        variant="outline"
        className="h-auto py-3"
        onClick={() => navigate(isAdmin ? '/students' : '/tracker')}
      >
        <ListChecks className="mr-2 h-4 w-4" />
        Tracker
      </Button>
      <Button
        variant="outline"
        className="rainbow-border h-auto border-transparent py-3"
        onClick={() => navigate('/bounties')}
      >
        <Gift className="mr-2 h-4 w-4" />
        Bounties
      </Button>
      <Button
        variant="outline"
        className="h-auto py-3"
        onClick={() => setOptionsOpen(true)}
      >
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </Button>
    </div>
  );

  return (
    // Vertically center the content in the viewport (minus the sticky header
    // and the main's vertical padding). Students and admins get the same
    // two-column home — board + actions on the left, personal stats on the right.
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col justify-center">
      <div className="grid items-stretch gap-6 lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:grid-cols-[450px_296px] lg:justify-center">
        {/* Left — leaderboard + actions, at a reduced width */}
        <div className="space-y-6">
          {leaderboardCard}
          {actions}
        </div>

        {/* Right — personal stats: progress on top, taller recent list below */}
        <div className="flex flex-col gap-6">
          {completionsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ) : (
            <CompletionProgress
              completed={completedRecent}
              total={recentPapers.length}
            />
          )}

          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <CardTitle className="text-base">Recently completed</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {completionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <RecentList
                  completions={recentCompletions(myCompletions, RECENT_SHOWN)}
                  showScore={false}
                  showPdf={false}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
