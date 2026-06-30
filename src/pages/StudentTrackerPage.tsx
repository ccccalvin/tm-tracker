import { useMemo, useState } from 'react';
import { Users, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Label,
  Select,
  Skeleton,
} from '@/components/ui';
import { LevelBadge } from '@/components/LevelBadge';
import { PdfOpenButton } from '@/components/PdfOpenButton';
import { StatStrip } from '@/components/StatStrip';
import { RecentList } from '@/components/RecentList';
import { useAllUsers, useCompletions, useTodos } from '@/hooks/useData';
import { studentStats, recentCompletions } from '@/lib/stats';
import { getPaper } from '@/lib/catalog';
import { relativeTime, formatScore } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AppUser, Completion, TodoItem } from '@/types';

/**
 * Admin Student-Tracker page (DESIGN.md §8.2). Pick any onboarded student from
 * the picker and view a READ-ONLY snapshot of their tracker: stats, recent
 * completions, their to-do queue, and their full completions list — including
 * private scores + notes, which admins are allowed to see.
 */
export function StudentTrackerPage() {
  const { users, loading: usersLoading } = useAllUsers();
  const [selectedUid, setSelectedUid] = useState('');

  // Onboarded students only, alphabetised for a stable, scannable picker.
  const pickableUsers = useMemo(
    () =>
      users
        .filter((u) => u.onboarded)
        .sort((a, b) =>
          (a.displayName || a.email).localeCompare(b.displayName || b.email),
        ),
    [users],
  );

  const selectedUser = useMemo(
    () => pickableUsers.find((u) => u.uid === selectedUid),
    [pickableUsers, selectedUid],
  );

  return (
    <div
      className={cn(
        'space-y-6',
        // No student picked yet → little content, so center it in the leftover
        // viewport like Home/Bounties. Once a student is selected the page turns
        // into a tall, scrolling document, so it stays top-aligned.
        !selectedUser &&
          'flex min-h-[calc(100vh-6.5rem)] flex-col justify-center',
      )}
    >
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-6 w-6 text-primary" />
          Student Tracker
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a student to view their tracker, scores, and notes.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="student-picker">Student</Label>
            {usersLoading ? (
              <Skeleton className="h-9 w-full max-w-sm" />
            ) : (
              <Select
                id="student-picker"
                className="max-w-sm"
                value={selectedUid}
                onChange={(e) => setSelectedUid(e.target.value)}
              >
                <option value="">Select a student…</option>
                {pickableUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {(u.displayName || u.email) + (u.mathLevel ? ` · ${u.mathLevel}` : '')}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUser ? (
        <StudentView user={selectedUser} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Pick a student to view their tracker.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Read-only tracker for a single selected student. */
function StudentView({ user }: { user: AppUser }) {
  const { completions, loading: completionsLoading } = useCompletions(user.uid);
  const { todos, loading: todosLoading } = useTodos(user.uid);

  const stats = useMemo(() => studentStats(completions), [completions]);
  const recent = useMemo(() => recentCompletions(completions, 10), [completions]);
  const allCompletions = useMemo(
    () => [...completions].sort((a, b) => b.completedAt - a.completedAt),
    [completions],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{user.displayName || user.email}</CardTitle>
            <LevelBadge level={user.mathLevel} />
            {user.isTMStudent && <Badge variant="info">TM student</Badge>}
          </div>
          <CardDescription className="truncate">{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {completionsLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <StatStrip stats={stats} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent completions</CardTitle>
            <CardDescription>Their 10 most recently completed papers.</CardDescription>
          </CardHeader>
          <CardContent>
            {completionsLoading ? (
              <ListSkeleton rows={4} />
            ) : (
              <RecentList completions={recent} showScore emptyText="No papers completed yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">To-do queue</CardTitle>
            <CardDescription>Papers they have lined up to do.</CardDescription>
          </CardHeader>
          <CardContent>
            {todosLoading ? (
              <ListSkeleton rows={4} />
            ) : (
              <TodoList todos={todos} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All completions</CardTitle>
          <CardDescription>
            Every completed paper, newest first — with scores and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completionsLoading ? (
            <ListSkeleton rows={6} />
          ) : (
            <CompletionsList completions={allCompletions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Read-only to-do queue: label · done/to-do badge · PDF button. */
function TodoList({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) {
    return <p className="text-sm text-muted-foreground">No papers in their queue.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {todos.map((t) => {
        const paper = getPaper(t.paperId);
        return (
          <li
            key={t.paperId}
            className={cn(
              'flex items-center gap-2 rounded-md py-2 px-2 text-sm',
              t.done && 'bg-completed text-completed-foreground',
            )}
          >
            <span className="flex-1 truncate font-medium">{t.paperLabel}</span>
            <Badge variant={t.done ? 'success' : 'secondary'} className="whitespace-nowrap">
              {t.done ? 'done' : 'to do'}
            </Badge>
            {paper && <PdfOpenButton storagePath={paper.storagePath} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Read-only full completions list: label · when · score · notes · PDF button. */
function CompletionsList({ completions }: { completions: Completion[] }) {
  if (completions.length === 0) {
    return <p className="text-sm text-muted-foreground">No papers completed yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {completions.map((c) => {
        const paper = getPaper(c.paperId);
        return (
          <li
            key={c.paperId}
            className="flex flex-col gap-1 rounded-md py-3 px-2 bg-completed text-completed-foreground"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate font-medium">{c.paperLabel}</span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {relativeTime(c.completedAt)}
              </span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {formatScore(c.score)}
              </span>
              {paper && <PdfOpenButton storagePath={paper.storagePath} />}
            </div>
            {c.notes && (
              <p className="flex items-start gap-1.5 pl-0.5 text-xs text-muted-foreground">
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="whitespace-pre-wrap break-words">{c.notes}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Lightweight loading placeholder for the list cards. */
function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
