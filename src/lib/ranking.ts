/**
 * Leaderboard ranking — pure functions (unit-tested).
 *
 * Rules (DESIGN.md §10):
 *  - Only TM students who've completed onboarding are ranked.
 *  - Rank by total completed papers, descending.
 *  - Ties SHARE a rank, using DENSE ranking: 1, 2, 3, 3, 4, 5
 *    (two tied at #3 → next distinct count is #4, not #5).
 *  - "Top N positions" shows every entry whose rank ≤ N, so a tie can surface
 *    more than N people.
 *  - Display order within a tie: earlier-reached first (lastCompletedAt asc),
 *    then name — purely cosmetic, the shared rank number is identical.
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
      paperCount: u.paperCount,
      lastCompletedAt: u.lastCompletedAt,
      photoURL: u.photoURL,
      rank,
      isYou: u.uid === currentUid,
    };
  });
}

/** Entries whose rank ≤ maxRank (the "top 5 positions" view). */
export function topPositions(entries: LeaderboardEntry[], maxRank: number): LeaderboardEntry[] {
  return entries.filter((e) => e.rank <= maxRank);
}

/** The signed-in user's own entry, if they're ranked. */
export function findYou(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries.find((e) => e.isYou);
}
