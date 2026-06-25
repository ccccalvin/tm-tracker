import { describe, it, expect } from 'vitest';
import { studentStats, recentCompletions } from '@/lib/stats';
import type { Completion } from '@/types';

const NOW = 1_700_000_000_000;
const day = 24 * 60 * 60 * 1000;

function c(paperId: string, completedAt: number, score: number | null = null): Completion {
  return { paperId, paperLabel: paperId, completedAt, score, notes: null };
}

describe('studentStats', () => {
  it('computes total, average (ignoring nulls), and this-week count', () => {
    const completions = [
      c('a', NOW - 1 * day, 80),
      c('b', NOW - 2 * day, 60),
      c('c', NOW - 10 * day, null),
      c('d', NOW - 20 * day, 90),
    ];
    const s = studentStats(completions, NOW);
    expect(s.total).toBe(4);
    expect(s.average).toBe(77); // (80+60+90)/3 = 76.67 -> 77
    expect(s.thisWeek).toBe(2); // a, b
  });

  it('handles empty', () => {
    expect(studentStats([], NOW)).toEqual({ total: 0, average: null, thisWeek: 0 });
  });
});

describe('recentCompletions', () => {
  it('returns newest first, limited to n', () => {
    const completions = [
      c('old', NOW - 5 * day),
      c('new', NOW - 1 * day),
      c('mid', NOW - 3 * day),
    ];
    expect(recentCompletions(completions, 2).map((x) => x.paperId)).toEqual(['new', 'mid']);
  });
});
