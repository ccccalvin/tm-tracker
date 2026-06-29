/**
 * Bounty logic — pure functions (unit-tested).
 *
 * A bounty ranks TM students by how many papers they completed inside a
 * calendar-day window `[startDate, endDate]` (both inclusive). Standings are
 * computed client-side from the public `completionEvents` mirror (see
 * src/lib/db.ts) joined with user profiles, so the privacy of scores/notes is
 * preserved while everyone can still watch the race live.
 */
import { daysUntil } from './countdown';
import type { AppUser, Bounty, BountyEntry } from '@/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse `YYYY-MM-DD` into a local Date at midnight, or null if malformed. */
function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

/**
 * The bounty window as epoch-millis bounds: from local-midnight of the start
 * day through the last millisecond of the end day (so the end date counts in
 * full). Returns null if either date is malformed or the range is inverted.
 */
export function bountyRangeMillis(
  startDate: string,
  endDate: string,
): { start: number; end: number } | null {
  const s = parseLocalDate(startDate);
  const e = parseLocalDate(endDate);
  if (!s || !e) return null;
  const start = s.getTime();
  const end = e.getTime() + MS_PER_DAY - 1;
  if (end < start) return null;
  return { start, end };
}

/**
 * The instant a live countdown should tick toward, in epoch millis:
 *  - upcoming → local midnight of the start day (when the race opens),
 *  - active   → the last instant of the end day (the deadline),
 *  - ended    → null (nothing to count down to).
 * Returns null on a malformed/inverted range.
 */
export function bountyCountdownTarget(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): number | null {
  const range = bountyRangeMillis(startDate, endDate);
  if (!range) return null;
  const status = bountyStatus(startDate, endDate, now);
  if (status === 'upcoming') return range.start;
  if (status === 'active') return range.end;
  return null;
}

/** Break a positive millis duration into whole days / hours / minutes / seconds. */
export function splitDuration(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export type BountyStatus = 'upcoming' | 'active' | 'ended';

/** Where today sits relative to the bounty window. */
export function bountyStatus(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): BountyStatus {
  const toStart = daysUntil(startDate, now); // > 0 → starts in the future
  const toEnd = daysUntil(endDate, now); // < 0 → ended
  if (Number.isNaN(toStart) || Number.isNaN(toEnd)) return 'ended';
  if (toStart > 0) return 'upcoming';
  if (toEnd < 0) return 'ended';
  return 'active';
}

/** Sort key for Home: active bounties first, then upcoming, then ended. */
export function bountySortRank(b: Bounty, now: Date = new Date()): number {
  const status = bountyStatus(b.startDate, b.endDate, now);
  return status === 'active' ? 0 : status === 'upcoming' ? 1 : 2;
}

/** "29 Jun" — short, local. Falls back to the raw string if unparseable. */
export function formatBountyDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "29 Jun – 13 Jul 2026". */
export function formatBountyRange(startDate: string, endDate: string): string {
  const end = parseLocalDate(endDate);
  const year = end ? ` ${end.getFullYear()}` : '';
  return `${formatBountyDate(startDate)} – ${formatBountyDate(endDate)}${year}`;
}

/**
 * Rank students for a bounty from their in-window completion counts.
 *
 * Mirrors the main leaderboard rules (DESIGN.md §10): only TM + onboarded
 * students, dense ranking with shared ties (1,2,3,3,4). Students with zero
 * completions in the window are omitted — a bounty only lists contenders.
 * Tie-break: whoever reached the count first (earliest last-in-window
 * completion) ranks higher; then name. Purely cosmetic — the rank is shared.
 */
export function rankBountyEntries(
  counts: Map<string, { count: number; lastInRange: number }>,
  users: AppUser[],
  currentUid: string,
  classId?: string,
): BountyEntry[] {
  const contenders = users
    .filter(
      (u) => u.isTMStudent && u.onboarded && (!classId || u.classId === classId),
    )
    .map((u) => {
      const c = counts.get(u.uid);
      return {
        uid: u.uid,
        displayName: u.displayName,
        classId: u.classId,
        count: c?.count ?? 0,
        lastInRange: c?.lastInRange ?? null,
        photoURL: u.photoURL,
      };
    })
    .filter((e) => e.count > 0);

  contenders.sort(
    (a, b) =>
      b.count - a.count ||
      (a.lastInRange ?? Infinity) - (b.lastInRange ?? Infinity) ||
      a.displayName.localeCompare(b.displayName),
  );

  let lastCount = Number.POSITIVE_INFINITY;
  let rank = 0;
  return contenders.map((e) => {
    if (e.count < lastCount) {
      rank += 1; // dense ranking — advance only on a new distinct count
      lastCount = e.count;
    }
    return { ...e, rank, isYou: e.uid === currentUid };
  });
}
