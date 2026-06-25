/**
 * Domain types for tm-tracker.
 *
 * Timestamps are exposed to the app as epoch milliseconds (`number`). The data
 * layer (src/lib/db.ts) writes Firestore `serverTimestamp()` and converts the
 * resulting `Timestamp` back to millis when reading, so UI code never touches
 * Firestore's Timestamp class.
 */

export type Role = 'student' | 'admin';

/** A signed-in user's profile, stored at `users/{uid}`. */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  /** Class they belong to (`classes/{classId}`). Empty string until onboarding. */
  classId: string;
  role: Role;
  /** Only TM students appear on the leaderboard (DESIGN.md §3). */
  isTMStudent: boolean;
  /** Denormalized count of completed papers — powers cheap leaderboard queries. */
  paperCount: number;
  /** Millis of the most recent completion, or null if none yet. */
  lastCompletedAt: number | null;
  createdAt: number;
  /** True once the user has set display name + class. */
  onboarded: boolean;
}

/** A class/cohort, stored at `classes/{classId}`. */
export interface ClassInfo {
  id: string;
  /** Full name, e.g. "Calvin's Monday ADVN". */
  name: string;
  /** Short badge, e.g. "MON ADVN". */
  badge: string;
  archived: boolean;
  /** Sort order in tabs / dropdowns. */
  order: number;
}

/** One paper set (one folder of PDFs), from catalog.json. */
export interface PaperSet {
  id: string;
  name: string;
  /** Per-paper Type label, e.g. "Trials". */
  type: string;
  count: number;
}

/** One catalog paper, from catalog.json. */
export interface Paper {
  id: string;
  setId: string;
  school: string;
  year: number;
  type: string;
  /** Display label, e.g. "Knox 2021 Trials". */
  label: string;
  /** Path within the Firebase Storage bucket. */
  storagePath: string;
  fileName: string;
}

/** A completed paper, stored at `users/{uid}/completions/{paperId}`. Private. */
export interface Completion {
  paperId: string;
  paperLabel: string;
  completedAt: number;
  /** Percentage 0–100, or null if not recorded. Visible only to owner + admins. */
  score: number | null;
  /** Free-text reflection, or null. Visible only to owner + admins. */
  notes: string | null;
}

/** A to-do queue item, stored at `users/{uid}/todos/{paperId}`. */
export interface TodoItem {
  paperId: string;
  paperLabel: string;
  /** Manual drag-order; lower = higher in the list. */
  order: number;
  addedAt: number;
  /** Completed items stay in the queue (shaded), per DESIGN.md §7.1. */
  done: boolean;
}

/** A row in a rendered leaderboard (computed client-side from users). */
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  classId: string;
  paperCount: number;
  lastCompletedAt: number | null;
  /** Shared, 1-based rank (ties share a number). Assigned during ranking. */
  rank: number;
  /** True if this row is the signed-in user. */
  isYou: boolean;
}

/** An activity-feed entry for the admin oversight view. */
export interface ActivityItem {
  id: string;
  uid: string;
  displayName: string;
  classId: string;
  paperId: string;
  paperLabel: string;
  completedAt: number;
}
