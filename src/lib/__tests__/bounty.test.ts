import { describe, it, expect } from 'vitest';
import {
  bountyRangeMillis,
  bountyStatus,
  bountySortRank,
  bountyCountdownTarget,
  splitDuration,
  rankBountyEntries,
} from '@/lib/bounty';
import type { AppUser, Bounty } from '@/types';

function mk(uid: string, over: Partial<AppUser> = {}): AppUser {
  return {
    uid,
    email: `${uid}@x.com`,
    displayName: uid.toUpperCase(),
    classId: 'mon-advn',
    mathLevel: 'ADVN',
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

function bounty(over: Partial<Bounty> = {}): Bounty {
  return {
    id: 'b1',
    title: 'Test',
    prize: '$100',
    message: '',
    startDate: '2026-07-01',
    endDate: '2026-07-14',
    published: true,
    createdAt: 0,
    result: null,
    ...over,
  };
}

describe('bountyRangeMillis — inclusive calendar-day window', () => {
  it('spans local midnight of start through the last ms of the end day', () => {
    const r = bountyRangeMillis('2026-07-01', '2026-07-14');
    expect(r).not.toBeNull();
    expect(r!.start).toBe(new Date(2026, 6, 1, 0, 0, 0, 0).getTime());
    expect(r!.end).toBe(new Date(2026, 6, 14, 23, 59, 59, 999).getTime());
  });

  it('accepts a single-day window', () => {
    const r = bountyRangeMillis('2026-07-01', '2026-07-01');
    expect(r!.end - r!.start).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('returns null for malformed or inverted ranges', () => {
    expect(bountyRangeMillis('nope', '2026-07-14')).toBeNull();
    expect(bountyRangeMillis('2026-07-14', '2026-07-01')).toBeNull();
  });
});

describe('bountyStatus — upcoming / active / ended', () => {
  it('is upcoming before the start day', () => {
    expect(bountyStatus('2026-07-01', '2026-07-14', new Date(2026, 5, 28))).toBe('upcoming');
  });
  it('is active on the start day, mid-window, and the end day', () => {
    expect(bountyStatus('2026-07-01', '2026-07-14', new Date(2026, 6, 1, 6))).toBe('active');
    expect(bountyStatus('2026-07-01', '2026-07-14', new Date(2026, 6, 7))).toBe('active');
    expect(bountyStatus('2026-07-01', '2026-07-14', new Date(2026, 6, 14, 23))).toBe('active');
  });
  it('is ended after the end day', () => {
    expect(bountyStatus('2026-07-01', '2026-07-14', new Date(2026, 6, 15))).toBe('ended');
  });
  it('sorts active first, then upcoming, then ended', () => {
    const now = new Date(2026, 6, 7);
    const active = bounty({ startDate: '2026-07-01', endDate: '2026-07-14' });
    const upcoming = bounty({ startDate: '2026-08-01', endDate: '2026-08-14' });
    const ended = bounty({ startDate: '2026-06-01', endDate: '2026-06-14' });
    const order = [ended, upcoming, active]
      .sort((a, b) => bountySortRank(a, now) - bountySortRank(b, now))
      .map((b) => b.startDate);
    expect(order).toEqual(['2026-07-01', '2026-08-01', '2026-06-01']);
  });
});

describe('bountyCountdownTarget — what the countdown ticks toward', () => {
  it('counts down to the start day while upcoming', () => {
    const now = new Date(2026, 5, 28);
    const target = bountyCountdownTarget('2026-07-01', '2026-07-14', now);
    expect(target).toBe(new Date(2026, 6, 1, 0, 0, 0, 0).getTime());
  });
  it('counts down to the deadline (end of the last day) while active', () => {
    const now = new Date(2026, 6, 7);
    const target = bountyCountdownTarget('2026-07-01', '2026-07-14', now);
    expect(target).toBe(new Date(2026, 6, 14, 23, 59, 59, 999).getTime());
  });
  it('has no target once ended or when malformed', () => {
    expect(bountyCountdownTarget('2026-07-01', '2026-07-14', new Date(2026, 6, 20))).toBeNull();
    expect(bountyCountdownTarget('bad', '2026-07-14')).toBeNull();
  });
});

describe('splitDuration — whole d/h/m/s from a millis duration', () => {
  it('breaks a duration into parts', () => {
    const ms = (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000; // 1d 2h 3m 4s
    expect(splitDuration(ms)).toEqual({ days: 1, hours: 2, minutes: 3, seconds: 4 });
  });
  it('is all zero at zero, and clamps negatives to zero', () => {
    expect(splitDuration(0)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('rankBountyEntries — dense ranking of in-window counts', () => {
  const users = [mk('a'), mk('b'), mk('c'), mk('d')];

  it('ranks by count desc with shared dense ties (1,2,2,3)', () => {
    const counts = new Map([
      ['a', { count: 10, lastInRange: 100 }],
      ['b', { count: 7, lastInRange: 100 }],
      ['c', { count: 7, lastInRange: 200 }],
      ['d', { count: 3, lastInRange: 100 }],
    ]);
    const entries = rankBountyEntries(counts, users, 'a');
    expect(entries.map((e) => [e.uid, e.rank])).toEqual([
      ['a', 1],
      ['b', 2], // tie with c, but reached 7 earlier (lastInRange 100 < 200)
      ['c', 2],
      ['d', 3],
    ]);
  });

  it('omits students with zero in-window completions', () => {
    const counts = new Map([['a', { count: 4, lastInRange: 1 }]]);
    expect(rankBountyEntries(counts, users, 'a').map((e) => e.uid)).toEqual(['a']);
  });

  it('only counts TM + onboarded students, and can scope to a class', () => {
    const mixed = [
      mk('tm', { classId: 'mon-advn' }),
      mk('notTM', { isTMStudent: false }),
      mk('notOnboard', { onboarded: false }),
      mk('friday', { classId: 'fri-advn' }),
    ];
    const counts = new Map([
      ['tm', { count: 5, lastInRange: 1 }],
      ['notTM', { count: 9, lastInRange: 1 }],
      ['notOnboard', { count: 9, lastInRange: 1 }],
      ['friday', { count: 8, lastInRange: 1 }],
    ]);
    expect(rankBountyEntries(counts, mixed, 'tm').map((e) => e.uid)).toEqual(['friday', 'tm']);
    expect(rankBountyEntries(counts, mixed, 'tm', 'mon-advn').map((e) => e.uid)).toEqual(['tm']);
  });

  it('marks the signed-in user with isYou', () => {
    const counts = new Map([
      ['a', { count: 5, lastInRange: 1 }],
      ['b', { count: 2, lastInRange: 1 }],
    ]);
    const entries = rankBountyEntries(counts, users, 'b');
    expect(entries.find((e) => e.uid === 'b')?.isYou).toBe(true);
    expect(entries.find((e) => e.uid === 'a')?.isYou).toBe(false);
  });
});
