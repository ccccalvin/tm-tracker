/**
 * Leaderboard ranking — pure functions (unit-tested).
 *
 * Rules (DESIGN.md §10):
 *  - Only TM students who've completed onboarding are ranked.
 *  - Rank by total completed papers, descending.
 *  - Ties SHARE a rank, using DENSE ranking: 1, 2, 3, 3, 4, 5
 *    (two tied at #3 → next distinct count is #4, not #5).
 *  - The board shows at most a fixed number of PEOPLE (see topN): exactly N
 *    rows, even when a tie would otherwise spill past N.
 *  - Order within a tie (decides who appears, and in what order):
 *      1. earlier-reached first (lastCompletedAt asc — whoever hit the count
 *         first ranks higher),
 *      2. earlier account first (createdAt asc — the decider when nobody has a
 *         completion yet, e.g. everyone on 0 papers),
 *      3. name (final stable fallback).
 *    The shared dense rank NUMBER is still identical for tied people.
 */
import type { AppUser, LeaderboardEntry } from '@/types';

export function rankEntries(
  users: AppUser[],
  currentUid: string,
  classId?: string,
): LeaderboardEntry[] {
  const eligible = users.filter(
    (u) => u.isTMStudent && u.onboarded && (!classId || u.classId === classId),
  );

  const sorted = [...eligible].sort(
    (a, b) =>
      b.paperCount - a.paperCount ||
      (a.lastCompletedAt ?? Infinity) - (b.lastCompletedAt ?? Infinity) ||
      a.createdAt - b.createdAt ||
      a.displayName.localeCompare(b.displayName),
  );

  let lastCount = Number.POSITIVE_INFINITY;
  let rank = 0;
  return sorted.map((u) => {
    if (u.paperCount < lastCount) {
      rank += 1; // dense ranking — only advance on a new distinct count
      lastCount = u.paperCount;
    }
    return {
      uid: u.uid,
      displayName: u.displayName,
      classId: u.classId,
      mathLevel: u.mathLevel,
      paperCount: u.paperCount,
      lastCompletedAt: u.lastCompletedAt,
      photoURL: u.photoURL,
      rank,
      isYou: u.uid === currentUid,
    };
  });
}

/**
 * The first `n` people on the board — a hard cap on rows, NOT on rank numbers.
 * Entries are already in display order, so a tie that straddles the cut-off is
 * truncated mid-tie: exactly `n` rows show, never more (DESIGN.md §10).
 */
export function topN(entries: LeaderboardEntry[], n: number): LeaderboardEntry[] {
  return entries.slice(0, n);
}

/** The signed-in user's own entry, if they're ranked. */
export function findYou(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries.find((e) => e.isYou);
}
