import { describe, it, expect } from 'vitest';
import { rankEntries, topN, findYou } from '@/lib/ranking';
import type { AppUser } from '@/types';

function mk(uid: string, over: Partial<AppUser> = {}): AppUser {
  return {
    uid,
    email: `${uid}@x.com`,
    displayName: uid.toUpperCase(),
    classId: 'mon-advn',
    role: 'student',
    isTMStudent: true,
    paperCount: 0,
    lastCompletedAt: null,
    createdAt: 0,
    onboarded: true,
    photoURL: null,
    showTrialsCountdown: false,
    trialsDate: null,
    ...over,
  };
}

describe('rankEntries — dense ranking with shared ties', () => {
  it('shares ranks and advances densely (1,2,3,3,4)', () => {
    const users = [
      mk('a', { paperCount: 10 }),
      mk('b', { paperCount: 9 }),
      mk('c', { paperCount: 8 }),
      mk('d', { paperCount: 8 }),
      mk('e', { paperCount: 7 }),
    ];
    const ranks = rankEntries(users, 'a').map((e) => e.rank);
    expect(ranks).toEqual([1, 2, 3, 3, 4]);
  });

  it('only ranks TM + onboarded students', () => {
    const users = [
      mk('a', { paperCount: 5 }),
      mk('b', { paperCount: 9, isTMStudent: false }),
      mk('c', { paperCount: 9, onboarded: false }),
    ];
    const entries = rankEntries(users, 'a');
    expect(entries.map((e) => e.uid)).toEqual(['a']);
  });

  it('filters by class when classId is given', () => {
    const users = [
      mk('a', { paperCount: 5, classId: 'mon-advn' }),
      mk('b', { paperCount: 9, classId: 'fri-advn' }),
    ];
    expect(rankEntries(users, 'a', 'mon-advn').map((e) => e.uid)).toEqual(['a']);
    expect(rankEntries(users, 'a', 'fri-advn').map((e) => e.uid)).toEqual(['b']);
  });

  it('orders ties by earliest-reached then name (cosmetic only)', () => {
    const users = [
      mk('late', { paperCount: 8, lastCompletedAt: 2000, displayName: 'Zara' }),
      mk('early', { paperCount: 8, lastCompletedAt: 1000, displayName: 'Yan' }),
    ];
    const entries = rankEntries(users, 'x');
    expect(entries.map((e) => e.uid)).toEqual(['early', 'late']);
    expect(entries.every((e) => e.rank === 1)).toBe(true);
  });

  it('marks the signed-in user with isYou', () => {
    const users = [mk('a', { paperCount: 3 }), mk('b', { paperCount: 1 })];
    expect(findYou(rankEntries(users, 'b'))?.uid).toBe('b');
    expect(findYou(rankEntries(users, 'b'))?.isYou).toBe(true);
  });
});

describe('topN — hard cap of N people, ties truncated at the cut-off', () => {
  it('shows exactly N rows even when a tie would spill past N', () => {
    const users = [
      mk('a', { paperCount: 10 }),
      mk('b', { paperCount: 9 }),
      mk('c', { paperCount: 8, createdAt: 1 }),
      mk('d', { paperCount: 8, createdAt: 2 }),
      mk('e', { paperCount: 8, createdAt: 3 }),
      mk('f', { paperCount: 7 }),
      mk('g', { paperCount: 6 }),
      mk('h', { paperCount: 5 }),
    ];
    // dense ranks: 1,2,3,3,3,4,5,6 — but only 5 PEOPLE may show, so the
    // three-way tie at rank 3 is truncated (c,d,e ordered by createdAt asc).
    const top = topN(rankEntries(users, 'a'), 5);
    expect(top.map((e) => e.uid)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(top).toHaveLength(5);
    expect(top.map((e) => e.rank)).toEqual([1, 2, 3, 3, 3]);
  });

  it('returns empty when there are no ranked students', () => {
    expect(topN(rankEntries([], 'a'), 5)).toEqual([]);
  });
});

describe('rankEntries — createdAt tie-break', () => {
  it('orders 0-paper students by account age (earliest first)', () => {
    const users = [
      mk('newer', { paperCount: 0, createdAt: 2000 }),
      mk('older', { paperCount: 0, createdAt: 1000 }),
    ];
    expect(rankEntries(users, 'x').map((e) => e.uid)).toEqual(['older', 'newer']);
  });

  it('breaks a count + lastCompletedAt tie by createdAt (shared rank)', () => {
    const users = [
      mk('b', { paperCount: 8, lastCompletedAt: 1000, createdAt: 2000 }),
      mk('a', { paperCount: 8, lastCompletedAt: 1000, createdAt: 1000 }),
    ];
    const entries = rankEntries(users, 'x');
    expect(entries.map((e) => e.uid)).toEqual(['a', 'b']);
    expect(entries.every((e) => e.rank === 1)).toBe(true);
  });
});
