/**
 * App-wide constants. The bootstrap admin email is also hardcoded in
 * firestore.rules — keep the two in sync if it ever changes.
 */
import type { MathLevel } from '@/types';

/** The first admin. On their first sign-in their profile is created with
 * role 'admin'; thereafter admins promote others in-app (DESIGN.md §3, Q30b). */
export const BOOTSTRAP_ADMIN_EMAIL = 'calvintkusnadi@gmail.com';

/** Default classes seeded into an empty database (DESIGN.md §9). */
export const DEFAULT_CLASSES = [
  { id: 'mon-advn', name: "Calvin's Monday ADVN", badge: 'MON ADVN', order: 0 },
  { id: 'fri-advn', name: "Calvin's Friday ADVN", badge: 'FRI ADVN', order: 1 },
] as const;

/** The math levels a student can pick at onboarding. The `value` is what's
 * stored on the profile and shown on the (coloured) level badge; colours live
 * in src/components/LevelBadge.tsx. */
export const MATH_LEVELS = [
  { value: 'ADVN', label: 'Mathematics Advanced' },
  { value: 'EXT1', label: 'Mathematics Extension 1' },
  { value: 'EXT2', label: 'Mathematics Extension 2' },
] as const;

/** Which paper set a student sees first on the Tracker, keyed by math level.
 * Advanced students get the 2U bank; Extension 1 & 2 students get the 3U bank
 * (the hardest set currently available). Admins / not-yet-set fall back to all
 * sets. The set ids must match those in scripts/generate-catalog.mjs. */
export const DEFAULT_SET_BY_LEVEL: Record<MathLevel, string> = {
  ADVN: 'yr12-advn-trials',
  EXT1: 'yr12-ext1-trials',
  EXT2: 'yr12-ext1-trials',
};

/** Whether a level is locked to a single bank. Advanced students only ever see
 * the 2U set; Extension 1 & 2 students cover the Advanced content too, so they
 * range across every set (2U + 3U). Admins / not-yet-set are unrestricted.
 * Returns the locked set id, or null when the level sees all sets. Used by both
 * Home (progress total) and the Tracker (set switcher + progress) so the two
 * can't drift apart. */
export function lockedSetForLevel(level: MathLevel | null | undefined): string | null {
  return level === 'ADVN' ? DEFAULT_SET_BY_LEVEL.ADVN : null;
}

/** Default catalog view shows papers from this year onward; a toggle reveals
 * older ones (DESIGN.md §2, Q28b). */
export const DEFAULT_MIN_YEAR = 2018;

/** How many people the leaderboard shows per scope — a hard row cap, ties
 * included (so exactly this many rows, never more) (DESIGN.md §10). */
export const LEADERBOARD_SIZE = 5;

/** Recently-completed papers shown on Home (DESIGN.md §6.2). */
export const RECENT_COMPLETED_COUNT = 5;

/** First day of the HSC exam period, as `YYYY-MM-DD`. Drives the "DAYS UNTIL
 * HSC" countdown on Home — update this once a year. (19 Oct 2026.) */
export const HSC_EXAM_DATE = '2026-10-19';
