import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { useIsAdmin } from '@/store/useAuthStore';
import { UsersTable } from '@/components/admin/UsersTable';
import { ClassesManager } from '@/components/admin/ClassesManager';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { BountyManager } from '@/components/admin/BountyManager';

/**
 * Admin page (DESIGN.md §8.1) — about people, not papers. Three stacked Card
 * sections: a filterable users table, a classes manager, and an activity feed.
 * Routing already gates this to admins; we double-check defensively.
 */
export function AdminPage() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admins only</CardTitle>
          <CardDescription>
            You don't have permission to view this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage students, classes, and keep an eye on activity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Users</CardTitle>
          <CardDescription>
            Toggle leaderboard (TM) status, promote admins, reassign classes, or
            remove a sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Classes</CardTitle>
          <CardDescription>
            Add, rename, re-badge, or archive the classes students can join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassesManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Bounties</CardTitle>
          <CardDescription>
            Run a prize competition: students are ranked by how many papers they
            complete inside the date range. Published bounties show on Home.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BountyManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Activity</CardTitle>
          <CardDescription>
            Recent completions across all students — newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
