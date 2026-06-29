/**
 * Live Firestore subscription hooks. Each wraps an onSnapshot listener so pages
 * re-render in real time (the leaderboard updates the moment anyone logs a
 * paper — DESIGN.md §2).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  mapUser,
  mapCompletion,
  mapTodo,
  mapClass,
  mapBounty,
  markComplete,
  unmarkComplete,
} from '@/lib/db';
import { DEFAULT_CLASSES } from '@/lib/config';
import { bountyRangeMillis } from '@/lib/bounty';
import type { AppUser, Bounty, ClassInfo, Completion, Paper, TodoItem } from '@/types';

/** All user profiles — powers the leaderboard + admin users table. */
export function useAllUsers(): { users: AppUser[]; loading: boolean } {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(snap.docs.map(mapUser));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { users, loading };
}

/** Classes, sorted; falls back to the built-in defaults when none exist yet. */
export function useClasses(): { classes: ClassInfo[]; loading: boolean } {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'classes'), orderBy('order')),
      (snap) => {
        setClasses(snap.docs.map(mapClass));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const merged = useMemo<ClassInfo[]>(() => {
    if (classes.length > 0) return classes;
    // Fallback so students can pick a class before the admin seeds them.
    return DEFAULT_CLASSES.map((c) => ({ ...c, archived: false }));
  }, [classes]);

  return { classes: merged, loading };
}

/** classId → ClassInfo lookup (built from the live classes). */
export function useClassMap(): Map<string, ClassInfo> {
  const { classes } = useClasses();
  return useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
}

/** All bounties (admin-created), newest first. Readable by everyone. */
export function useBounties(): { bounties: Bounty[]; loading: boolean } {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'bounties'),
      (snap) => {
        const list = snap.docs.map(mapBounty);
        list.sort((a, b) => b.startDate.localeCompare(a.startDate));
        setBounties(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { bounties, loading };
}

/**
 * Live per-student completion counts inside a bounty's date window, from the
 * public `completionEvents` mirror. Returns a uid → {count, lastInRange} map;
 * pair it with the user list via `rankBountyEntries` to render standings.
 *
 * The query is a single-field range on `completedAt` (no composite index); the
 * `completed === true` filter is applied client-side so un-completed papers
 * stop counting.
 */
export function useBountyStandings(
  startDate: string,
  endDate: string,
  enabled = true,
): { counts: Map<string, { count: number; lastInRange: number }>; loading: boolean } {
  const [counts, setCounts] = useState<Map<string, { count: number; lastInRange: number }>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const range = enabled ? bountyRangeMillis(startDate, endDate) : null;
    if (!range) {
      setCounts(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'completionEvents'),
      where('completedAt', '>=', Timestamp.fromMillis(range.start)),
      where('completedAt', '<=', Timestamp.fromMillis(range.end)),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = new Map<string, { count: number; lastInRange: number }>();
        for (const d of snap.docs) {
          const data = d.data();
          if (data.completed === false) continue; // un-completed → doesn't count
          const uid = typeof data.uid === 'string' ? data.uid : '';
          if (!uid) continue;
          const ms =
            data.completedAt && typeof data.completedAt.toMillis === 'function'
              ? data.completedAt.toMillis()
              : 0;
          const prev = map.get(uid);
          if (prev) {
            prev.count += 1;
            prev.lastInRange = Math.max(prev.lastInRange, ms);
          } else {
            map.set(uid, { count: 1, lastInRange: ms });
          }
        }
        setCounts(map);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [startDate, endDate, enabled]);
  return { counts, loading };
}

/** A user's completions (private). Pass undefined to get an empty result. */
export function useCompletions(uid: string | undefined): {
  completions: Completion[];
  completedIds: Set<string>;
  byId: Map<string, Completion>;
  loading: boolean;
  /**
   * Optimistically mark a paper complete/incomplete. The tick flips instantly
   * and the Firestore write runs in the background; on failure the change rolls
   * back and a toast is shown. The optimistic override is cleared once the live
   * snapshot confirms the new state.
   */
  setCompleted: (paper: Paper, desired: boolean) => void;
} {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  // paperId → desired completed state, held only while a write is in flight (or
  // until the live snapshot catches up). This is what makes the tick instant.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  useEffect(() => {
    if (!uid) {
      setCompletions([]);
      setOverrides(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'completions'),
      (snap) => {
        // Un-completed papers keep their doc (to preserve score/notes) flagged
        // `completed: false` — exclude them so they don't count as completed.
        setCompletions(
          snap.docs.filter((d) => d.data().completed !== false).map(mapCompletion),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  const serverIds = useMemo(() => new Set(completions.map((c) => c.paperId)), [completions]);

  // Drop overrides the live snapshot has now caught up to, so server truth
  // resumes (and a later real change — e.g. from another device — is respected).
  useEffect(() => {
    setOverrides((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const [pid, desired] of prev) {
        if (serverIds.has(pid) === desired) {
          next.delete(pid);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [serverIds]);

  const setCompleted = useCallback(
    (paper: Paper, desired: boolean) => {
      if (!uid) return;
      setOverrides((prev) => new Map(prev).set(paper.id, desired));
      const write = desired ? markComplete(uid, paper) : unmarkComplete(uid, paper.id);
      write.catch((err) => {
        console.error('[tm-tracker] failed to toggle completion', err);
        toast.error("Couldn't update that paper. Please try again.");
        // Roll back: drop the override so the tick reverts to server truth.
        setOverrides((prev) => {
          const next = new Map(prev);
          next.delete(paper.id);
          return next;
        });
      });
    },
    [uid],
  );

  const completedIds = useMemo(() => {
    const set = new Set(serverIds);
    for (const [pid, desired] of overrides) {
      if (desired) set.add(pid);
      else set.delete(pid);
    }
    return set;
  }, [serverIds, overrides]);
  const byId = useMemo(() => new Map(completions.map((c) => [c.paperId, c])), [completions]);
  return { completions, completedIds, byId, loading, setCompleted };
}

/** A user's to-do queue, ordered by manual drag-order. */
export function useTodos(uid: string | undefined): { todos: TodoItem[]; loading: boolean } {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setTodos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'users', uid, 'todos'), orderBy('order')),
      (snap) => {
        setTodos(snap.docs.map(mapTodo));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);
  return { todos, loading };
}

export interface FeedItem {
  uid: string;
  paperId: string;
  paperLabel: string;
  completedAt: number;
}

/** Recent completions across all students, for the admin activity feed. Joined
 * with names client-side in the Admin page (DESIGN.md §8.1). Admin-only by
 * security rules. */
export function useActivityFeed(max = 50): { items: FeedItem[]; loading: boolean } {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(
      collectionGroup(db, 'completions'),
      orderBy('completedAt', 'desc'),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs
            // Exclude un-completed papers (kept only to preserve score/notes).
            .filter((d) => d.data().completed !== false)
            .map((d) => ({
              uid: d.ref.parent.parent?.id ?? '',
              paperId: d.id,
              paperLabel: (d.data().paperLabel as string) ?? '',
              completedAt:
                d.data().completedAt && typeof d.data().completedAt.toMillis === 'function'
                  ? d.data().completedAt.toMillis()
                  : 0,
            })),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [max]);
  return { items, loading };
}
