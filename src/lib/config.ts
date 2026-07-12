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
 * Each level lands on its own bank: Advanced → 2U, Extension 1 → 3U,
 * Extension 2 → 4U. Admins / not-yet-set fall back to all sets. The set ids
 * must match those in scripts/generate-catalog.mjs. */
export const DEFAULT_SET_BY_LEVEL: Record<MathLevel, string> = {
  ADVN: 'yr12-advn-trials',
  EXT1: 'yr12-ext1-trials',
  EXT2: 'yr12-ext2-trials',
};

/** The paper sets each level may see, in course order (easiest first). A level
 * covers its own bank plus every easier one — the HSC course is cumulative:
 * Advanced sees only 2U; Extension 1 adds 3U; Extension 2 adds 4U. This is what
 * keeps a level out of harder banks (an Ext1 student never sees the 4U set).
 * The set ids must match those in scripts/generate-catalog.mjs. */
export const ALLOWED_SETS_BY_LEVEL: Record<MathLevel, readonly string[]> = {
  ADVN: ['yr12-advn-trials'],
  EXT1: ['yr12-advn-trials', 'yr12-ext1-trials'],
  EXT2: ['yr12-advn-trials', 'yr12-ext1-trials', 'yr12-ext2-trials'],
};

/** The set ids a level is allowed to browse and be scored against, or null when
 * unrestricted (admins / not-yet-set see every set). Used by both Home
 * (progress total) and the Tracker (set switcher + progress) so the two can't
 * drift apart. */
export function allowedSetsForLevel(
  level: MathLevel | null | undefined,
): readonly string[] | null {
  return level ? ALLOWED_SETS_BY_LEVEL[level] : null;
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
