import { describe, it, expect } from 'vitest';
import { daysUntil, countdownDisplay } from '@/lib/countdown';

describe('daysUntil — whole calendar days, midnight granularity', () => {
  it('is 0 on the day itself regardless of time of day', () => {
    expect(daysUntil('2026-10-19', new Date(2026, 9, 19, 23, 59))).toBe(0);
    expect(daysUntil('2026-10-19', new Date(2026, 9, 19, 0, 1))).toBe(0);
  });

  it('counts future days as positive, past as negative', () => {
    expect(daysUntil('2026-10-19', new Date(2026, 9, 18))).toBe(1);
    expect(daysUntil('2026-10-19', new Date(2026, 9, 12))).toBe(7);
    expect(daysUntil('2026-10-19', new Date(2026, 9, 20))).toBe(-1);
  });

  it('ignores the clock time of `now`', () => {
    // 10pm today → tomorrow is still 1 day away, not 0.
    expect(daysUntil('2026-06-28', new Date(2026, 5, 27, 22, 0))).toBe(1);
  });

  it('returns NaN for a malformed date', () => {
    expect(daysUntil('not-a-date')).toBeNaN();
  });
});

describe('countdownDisplay — number / TODAY / FINISHED!', () => {
  it('shows the day count in the future', () => {
    expect(countdownDisplay('2026-10-19', new Date(2026, 9, 9))).toEqual({ kind: 'days', days: 10 });
  });
  it('shows TODAY on the day', () => {
    expect(countdownDisplay('2026-10-19', new Date(2026, 9, 19, 8))).toEqual({ kind: 'today' });
  });
  it('shows FINISHED! once passed', () => {
    expect(countdownDisplay('2026-10-19', new Date(2026, 9, 20))).toEqual({ kind: 'finished' });
  });
  it('treats a malformed date as finished rather than crashing', () => {
    expect(countdownDisplay('garbage')).toEqual({ kind: 'finished' });
  });
});
