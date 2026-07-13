import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ListChecks, Gift, Settings, Lock, LogIn, Check, BookOpen } from 'lucide-react';
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
import {
  useAuthStore,
  useIsAdminView,
  useIsAuthenticated,
  useEffectiveMathLevel,
} from '@/store/useAuthStore';
import { useAuthGate } from '@/store/useAuthGate';
import { useUIStore } from '@/store/useUIStore';
import { rankEntries, findYou } from '@/lib/ranking';
import { recentCompletions } from '@/lib/stats';
import { PAPERS } from '@/lib/catalog';
import { DEFAULT_MIN_YEAR, allowedSetsForLevel } from '@/lib/config';

/** How many recent completions to list in the (taller) right-hand box. */
const RECENT_SHOWN = 20;

/**
 * Home. Signed-in students/admins get the live leaderboard + their personal
 * stats; logged-out visitors get the same shell with a locked leaderboard
 * teaser and a "sign in to track your progress" card in place of stats.
 */
export function HomePage() {
  const isAuthed = useIsAuthenticated();
  return isAuthed ? <AuthedHome /> : <GuestHome />;
}

function AuthedHome() {
  const navigate = useNavigate();
  const myUid = useAuthStore((s) => s.firebaseUser?.uid);
  // Admin-view drives the admin-only Home tweaks; previewing a level turns it
  // off so the page reads exactly as a student's.
  const isAdmin = useIsAdminView();
  const mathLevel = useEffectiveMathLevel();
  const setOptionsOpen = useUIStore((s) => s.setOptionsOpen);

  const { users, loading: usersLoading } = useAllUsers();
  const {
    completions: myCompletions,
    completedIds,
    loading: completionsLoading,
  } = useCompletions(myUid);

  // Personal "papers completed" progress, over the recent, solution-backed
  // papers the student sees by default (year >= DEFAULT_MIN_YEAR + hasSolutions).
  // Scoped to the banks the level may see (Advanced → 2U, Ext1 → 2U+3U,
  // Ext2 → 2U+3U+4U; admins count every set) — same scope rule as the Tracker,
  // so the totals line up.
  const allowedSetIds = allowedSetsForLevel(mathLevel);
  const recentPapers = useMemo(
    () =>
      PAPERS.filter(
        (p) =>
          p.year >= DEFAULT_MIN_YEAR &&
          p.hasSolutions &&
          (!allowedSetIds || allowedSetIds.includes(p.setId)),
      ),
    [allowedSetIds],
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

/**
 * Logged-out Home. Same two-column footprint as the signed-in view, but the
 * leaderboard is a blurred, locked teaser (student data stays sign-in only) and
 * the stats column becomes a "sign in to track your progress" call-to-action.
 */
function GuestHome() {
  const navigate = useNavigate();
  const promptSignIn = useAuthGate((s) => s.promptSignIn);

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col justify-center">
      <div className="grid items-stretch gap-6 lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:grid-cols-[450px_296px] lg:justify-center">
        {/* Left — locked leaderboard teaser + actions */}
        <div className="space-y-6">
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
              <div className="relative">
                {/* Blurred, non-interactive placeholder rows for allure. */}
                <div aria-hidden className="space-y-1 select-none blur-[5px]">
                  {[
                    'row-gold',
                    'row-silver',
                    'row-bronze',
                    '',
                    '',
                  ].map((tint, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${tint}`}
                    >
                      <span className="w-8 text-center text-sm font-semibold text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="h-7 w-7 shrink-0 rounded-full bg-muted-foreground/30" />
                      <span className="h-3 flex-1 rounded bg-muted-foreground/25" style={{ maxWidth: `${70 - i * 8}%` }} />
                      <span className="h-3 w-6 rounded bg-muted-foreground/25" />
                    </div>
                  ))}
                </div>
                {/* Lock overlay + CTA. */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-background/40 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <p className="max-w-[15rem] text-sm text-muted-foreground">
                    Sign in to see the rankings and where you stand.
                  </p>
                  <Button size="sm" onClick={() => promptSignIn('generic')}>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    Sign in
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/tracker')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Browse papers
            </Button>
            <Button
              variant="outline"
              className="rainbow-border h-auto border-transparent py-3"
              onClick={() => navigate('/bounties')}
            >
              <Gift className="mr-2 h-4 w-4" />
              Bounties
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => promptSignIn('generic')}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          </div>
        </div>

        {/* Right — sign-in call-to-action in place of personal stats */}
        <Card className="flex flex-col justify-center border-dashed">
          <CardContent className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">Track your progress</h3>
              <p className="text-sm text-muted-foreground">
                Browse the whole paper bank freely. Make a free account to save what
                you&apos;ve done and climb the leaderboard.
              </p>
            </div>
            <Button className="w-full" onClick={() => promptSignIn('generic')}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            <ul className="mx-auto inline-block space-y-1.5 text-left">
              {[
                'Tick off papers as you finish them',
                'Build a personal to-do queue',
                'Appear on the class leaderboard',
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {perk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
