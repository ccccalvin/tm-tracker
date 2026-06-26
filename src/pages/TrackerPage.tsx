import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { TodoList } from '@/components/tracker/TodoList';
import { CompletionProgress } from '@/components/tracker/CompletionProgress';
import { PaperFilters } from '@/components/tracker/PaperFilters';
import { PaperRow } from '@/components/tracker/PaperRow';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompletions, useTodos } from '@/hooks/useData';
import { PAPERS, filterPapers, type PaperStatus } from '@/lib/catalog';
import { DEFAULT_MIN_YEAR } from '@/lib/config';
import { formatCount } from '@/lib/format';

/**
 * Tracker page (DESIGN.md §7): a personal to-do queue on top and the full,
 * filterable paper list below. The page scrolls — the full list is long.
 */
export function TrackerPage() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const { todos, loading: todosLoading } = useTodos(uid);
  const { completedIds, byId, loading: completionsLoading, setCompleted } = useCompletions(uid);

  // Filter state lives here and is passed down to PaperFilters (controlled).
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaperStatus>('all');
  const [showOlder, setShowOlder] = useState(false);
  const [setId, setSetId] = useState<string | undefined>(undefined);

  const todoIds = useMemo(() => new Set(todos.map((t) => t.paperId)), [todos]);

  // Progress against the in-scope (recent, year >= DEFAULT_MIN_YEAR) papers —
  // the same set the list shows by default. Counting only recent completions
  // keeps the numerator from exceeding the total.
  const recentPapers = useMemo(
    () => PAPERS.filter((p) => p.year >= DEFAULT_MIN_YEAR),
    [],
  );
  const completedRecent = useMemo(
    () => recentPapers.filter((p) => completedIds.has(p.id)).length,
    [recentPapers, completedIds],
  );

  const rows = useMemo(
    () =>
      filterPapers(
        PAPERS,
        { search, status, showOlder, setId },
        completedIds,
        DEFAULT_MIN_YEAR,
      ),
    [search, status, showOlder, setId, completedIds],
  );

  if (!uid) {
    return (
      <p className="text-sm text-muted-foreground">Sign in to track your papers.</p>
    );
  }

  return (
    <div className="space-y-8">
      {/* TOP — overall progress */}
      {completionsLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : (
        <CompletionProgress completed={completedRecent} total={recentPapers.length} />
      )}

      {/* to-do queue */}
      {todosLoading || completionsLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">To-do</CardTitle>
            <CardDescription className="italic">
              “If I quit now, I will soon be back to where I started. And when I
              started, I was desperately wishing to be where I am now.”
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <TodoList
          uid={uid}
          todos={todos}
          completedIds={completedIds}
          completionsById={byId}
          onSetCompleted={setCompleted}
        />
      )}

      {/* BOTTOM — full paper list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All papers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaperFilters
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            showOlder={showOlder}
            onShowOlderChange={setShowOlder}
            setId={setId}
            onSetIdChange={setSetId}
          />

          <p className="text-xs text-muted-foreground">
            Showing {formatCount(rows.length)}
          </p>

          {completionsLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No papers match your filters.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((paper) => (
                <PaperRow
                  key={paper.id}
                  uid={uid}
                  paper={paper}
                  completed={completedIds.has(paper.id)}
                  completion={byId.get(paper.id)}
                  inTodo={todoIds.has(paper.id)}
                  onSetCompleted={setCompleted}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
