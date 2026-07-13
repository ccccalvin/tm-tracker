import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton, Select } from '@/components/ui';
import { TodoList } from '@/components/tracker/TodoList';
import { CompletionProgress } from '@/components/tracker/CompletionProgress';
import { PaperFilters } from '@/components/tracker/PaperFilters';
import { PaperRow } from '@/components/tracker/PaperRow';
import { useAuthStore, useEffectiveMathLevel } from '@/store/useAuthStore';
import { useCompletions, useTodos } from '@/hooks/useData';
import { PAPERS, PAPER_SETS, filterPapers, sortPapers, type PaperStatus, type PaperSort } from '@/lib/catalog';
import { DEFAULT_MIN_YEAR, DEFAULT_SET_BY_LEVEL, allowedSetsForLevel } from '@/lib/config';
import { formatCount } from '@/lib/format';

const SORT_OPTIONS: { value: PaperSort; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'year', label: 'Year (newest)' },
];

/**
 * Tracker page (DESIGN.md §7): a personal to-do queue on top and the full,
 * filterable paper list below. The page scrolls — the full list is long.
 */
export function TrackerPage() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const mathLevel = useEffectiveMathLevel();
  const { todos, loading: todosLoading } = useTodos(uid);
  const { completedIds, byId, loading: completionsLoading, setCompleted } = useCompletions(uid);

  // Students open the Tracker on their own level's paper set (Advanced → 2U,
  // Extension 1 → 3U, Extension 2 → 4U); admins / unset default to all sets.
  // They can still switch. For an admin this level is the header "view as"
  // preview override.
  const defaultSetId = mathLevel ? DEFAULT_SET_BY_LEVEL[mathLevel] : undefined;

  // A level only sees its own bank plus every easier one (the course is
  // cumulative): Advanced → 2U, Ext1 → 2U+3U, Ext2 → 2U+3U+4U. Harder banks are
  // hidden entirely. null = admin/unset, who range across every set.
  const allowedSetIds = allowedSetsForLevel(mathLevel);
  const scopedPapers = useMemo(
    () => (allowedSetIds ? PAPERS.filter((p) => allowedSetIds.includes(p.setId)) : PAPERS),
    [allowedSetIds],
  );
  const visibleSets = useMemo(
    () => (allowedSetIds ? PAPER_SETS.filter((s) => allowedSetIds.includes(s.id)) : PAPER_SETS),
    [allowedSetIds],
  );
  // Offer the combined "All sets" option only when the level spans more than one
  // bank (a single-bank level like Advanced gets no switcher at all).
  const allowAllSets = visibleSets.length > 1;

  // Filter state lives here and is passed down to PaperFilters (controlled).
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaperStatus>('all');
  const [showOther, setShowOther] = useState(false);
  const [setId, setSetId] = useState<string | undefined>(defaultSetId);
  const [sort, setSort] = useState<PaperSort>('name');

  // Follow the level's default set when it changes under us — e.g. an admin
  // flipping the header "view as" switcher should see the paper list jump to
  // that level's bank immediately, without a reload.
  useEffect(() => {
    setSetId(defaultSetId);
  }, [defaultSetId]);

  const todoIds = useMemo(() => new Set(todos.map((t) => t.paperId)), [todos]);

  // Progress against the in-scope (recent + solution-backed) papers of the
  // currently-selected set — or, when "All sets" is chosen, every set the level
  // may see. Matches the tracker's default view, so the bar matches the list on
  // screen. Counting only this scope keeps the numerator from exceeding total.
  const recentPapers = useMemo(
    () =>
      scopedPapers.filter(
        (p) => p.year >= DEFAULT_MIN_YEAR && p.hasSolutions && (!setId || p.setId === setId),
      ),
    [scopedPapers, setId],
  );
  const completedRecent = useMemo(
    () => recentPapers.filter((p) => completedIds.has(p.id)).length,
    [recentPapers, completedIds],
  );

  const rows = useMemo(
    () =>
      sortPapers(
        filterPapers(
          scopedPapers,
          { search, status, showOther, setId },
          completedIds,
          DEFAULT_MIN_YEAR,
        ),
        sort,
      ),
    [scopedPapers, search, status, showOther, setId, sort, completedIds],
  );

  if (!uid) {
    return (
      <p className="text-sm text-muted-foreground">Sign in to track your papers.</p>
    );
  }

  return (
    // Split rail: a sticky summary (progress + to-do) beside the long,
    // filterable paper list. On lg the block breaks out of the narrow
    // max-w-3xl column to the full viewport — the same trick the student Home
    // uses — so both columns get room; below lg it collapses to the original
    // single-column stack (progress → to-do → all papers).
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,520px)] lg:justify-center lg:px-6">
        {/* LEFT RAIL — progress + to-do, pinned while the list scrolls */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {completionsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ) : (
            <CompletionProgress completed={completedRecent} total={recentPapers.length} />
          )}

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
        </div>

        {/* RIGHT — full, filterable paper list */}
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
              showOther={showOther}
              onShowOtherChange={setShowOther}
              setId={setId}
              onSetIdChange={setSetId}
              sets={visibleSets}
              allowAllSets={allowAllSets}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {formatCount(rows.length)}{' '}
                {showOther ? '(all)' : `(only papers w. sols, ≥ ${DEFAULT_MIN_YEAR})`}
              </p>

              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as PaperSort)}
                aria-label="Sort papers"
                className="h-8 w-40 text-xs"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </Select>
            </div>

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
                    showLevelTag
                    onSetCompleted={setCompleted}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
