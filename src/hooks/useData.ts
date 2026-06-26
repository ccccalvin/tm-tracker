/**
 * Live Firestore subscription hooks. Each wraps an onSnapshot listener so pages
 * re-render in real time (the leaderboard updates the moment anyone logs a
 * paper — DESIGN.md §2).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapUser, mapCompletion, mapTodo, mapClass } from '@/lib/db';
import { DEFAULT_CLASSES } from '@/lib/config';
import type { AppUser, ClassInfo, Completion, TodoItem } from '@/types';

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

/** A user's completions (private). Pass undefined to get an empty result. */
export function useCompletions(uid: string | undefined): {
  completions: Completion[];
  completedIds: Set<string>;
  byId: Map<string, Completion>;
  loading: boolean;
} {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setCompletions([]);
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

  const completedIds = useMemo(() => new Set(completions.map((c) => c.paperId)), [completions]);
  const byId = useMemo(() => new Map(completions.map((c) => [c.paperId, c])), [completions]);
  return { completions, completedIds, byId, loading };
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
