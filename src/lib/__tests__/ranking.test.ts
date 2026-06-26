import { describe, it, expect } from 'vitest';
import { rankEntries, topPositions, findYou } from '@/lib/ranking';
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

describe('topPositions — top N rank positions, ties can exceed N', () => {
  it('includes everyone whose rank <= maxRank', () => {
    const users = [
      mk('a', { paperCount: 10 }),
      mk('b', { paperCount: 9 }),
      mk('c', { paperCount: 8 }),
      mk('d', { paperCount: 8 }),
      mk('e', { paperCount: 8 }),
      mk('f', { paperCount: 7 }),
      mk('g', { paperCount: 6 }),
      mk('h', { paperCount: 5 }),
    ];
    const top = topPositions(rankEntries(users, 'a'), 5);
    // ranks: 1,2,3,3,3,4,5,6 -> top-5 positions drops only rank 6 (h)
    expect(top.map((e) => e.uid)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(Math.max(...top.map((e) => e.rank))).toBe(5);
  });

  it('returns empty when there are no ranked students', () => {
    expect(topPositions(rankEntries([], 'a'), 5)).toEqual([]);
  });
});
