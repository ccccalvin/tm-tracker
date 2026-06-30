/**
 * App-wide constants. The bootstrap admin email is also hardcoded in
 * firestore.rules — keep the two in sync if it ever changes.
 */

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
