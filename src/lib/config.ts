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

/** Default catalog view shows papers from this year onward; a toggle reveals
 * older ones (DESIGN.md §2, Q28b). */
export const DEFAULT_MIN_YEAR = 2018;

/** How many leaderboard rank positions to show per scope (DESIGN.md §10). */
export const LEADERBOARD_TOP_POSITIONS = 5;

/** Recently-completed papers shown on Home (DESIGN.md §6.2). */
export const RECENT_COMPLETED_COUNT = 5;
