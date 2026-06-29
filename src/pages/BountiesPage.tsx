import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Home, ListChecks } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Skeleton } from '@/components/ui';
import { BountyPanel } from '@/components/bounty/BountyBoard';
import { useAllUsers, useBounties, useClassMap } from '@/hooks/useData';
import { useAuthStore, useProfile } from '@/store/useAuthStore';
import { bountySortRank } from '@/lib/bounty';

/**
 * Dedicated bounties page: just the bounty panel (one card, toggle between
 * active bounties). Linked from the Home page.
 */
export function BountiesPage() {
  const navigate = useNavigate();
  const myUid = useAuthStore((s) => s.firebaseUser?.uid);
  const isAdmin = useProfile()?.role === 'admin';
  const { users } = useAllUsers();
  const classMap = useClassMap();
  const { bounties, loading } = useBounties();

  // Published bounties only, active ones first (then upcoming, then ended).
  const visibleBounties = useMemo(
    () =>
      bounties
        .filter((b) => b.published)
        .sort((a, b) => bountySortRank(a) - bountySortRank(b)),
    [bounties],
  );

  return (
    // Vertically center the bounty card in the viewport (minus the sticky
    // header and the main's vertical padding), and break out to center a
    // fixed-size box on the screen — same footprint as the Home content block
    // (450px + 296px columns) so navigating between them doesn't jump.
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col justify-center">
      <div className="lg:relative lg:left-1/2 lg:flex lg:w-screen lg:-translate-x-1/2 lg:justify-center">
        <div className="w-full space-y-6 lg:w-[770px]">
          <div className="lg:h-[560px]">
            {loading ? (
              // Match the bounty card's footprint so the box doesn't jump (or
              // flash the "no bounties" empty state) before the data arrives.
              <Card className="flex h-full flex-col">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-12 w-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : visibleBounties.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center text-muted-foreground">
                <Gift className="h-8 w-8 text-primary/60" />
                <p className="text-sm">No bounties are running right now. Check back soon!</p>
              </div>
            ) : (
              <BountyPanel
                bounties={visibleBounties}
                users={users}
                myUid={myUid ?? ''}
                classMap={classMap}
              />
            )}
          </div>

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3"
              onClick={() => navigate(isAdmin ? '/students' : '/tracker')}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Go to tracker
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
