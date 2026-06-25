/** Per-student stats derived from their completions. Pure + unit-tested. */
import type { Completion } from '@/types';
import { averageScore, isWithinLastWeek } from './format';

export interface StudentStats {
  total: number;
  /** Average recorded score (%), or null if none recorded. */
  average: number | null;
  /** Papers completed in the last 7 days. */
  thisWeek: number;
}

export function studentStats(completions: Completion[], now: number = Date.now()): StudentStats {
  return {
    total: completions.length,
    average: averageScore(completions.map((c) => c.score)),
    thisWeek: completions.filter((c) => isWithinLastWeek(c.completedAt, now)).length,
  };
}

/** Most-recently-completed papers, newest first. */
export function recentCompletions(completions: Completion[], n: number): Completion[] {
  return [...completions].sort((a, b) => b.completedAt - a.completedAt).slice(0, n);
}
