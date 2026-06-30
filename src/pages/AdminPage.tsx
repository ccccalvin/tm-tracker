import { useState } from 'react';
import { Activity, GraduationCap, Trophy, Users } from 'lucide-react';
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
import { cn } from '@/lib/cn';

/**
 * The four admin sections, surfaced as tabs (DESIGN.md §8.1). Each renders one
 * at a time so switching is a single click instead of a long scroll.
 */
const TABS = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description:
      'Toggle leaderboard (TM) status, promote admins, reassign classes, or remove a sign-up.',
    Body: UsersTable,
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: GraduationCap,
    description: 'Add, rename, re-badge, or archive the classes students can join.',
    Body: ClassesManager,
  },
  {
    id: 'bounties',
    label: 'Bounties',
    icon: Trophy,
    description:
      'Run a prize competition: students are ranked by how many papers they complete inside the date range. Published bounties show on Home.',
    Body: BountyManager,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    description: 'Recent completions across all students — newest first.',
    Body: ActivityFeed,
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Admin page (DESIGN.md §8.1) — about people, not papers. A tab bar switches
 * between the users table, classes manager, bounties, and activity feed.
 * Routing already gates this to admins; we double-check defensively.
 */
export function AdminPage() {
  const isAdmin = useIsAdmin();
  const [active, setActive] = useState<TabId>('users');

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

  const current = TABS.find((t) => t.id === active) ?? TABS[0];
  const Body = current.Body;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage students, classes, and keep an eye on activity.
        </p>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Admin sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{current.label}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Body />
        </CardContent>
      </Card>
    </div>
  );
}
