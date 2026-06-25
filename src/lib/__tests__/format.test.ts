import { describe, it, expect } from 'vitest';
import {
  relativeTime,
  formatScore,
  formatCount,
  isWithinLastWeek,
  averageScore,
} from '@/lib/format';

const NOW = 1_700_000_000_000;
const sec = 1000;
const min = 60 * sec;
const hr = 60 * min;
const day = 24 * hr;

describe('relativeTime', () => {
  it('handles null', () => expect(relativeTime(null)).toBe('—'));
  it('recent → just now', () => expect(relativeTime(NOW - 10 * sec, NOW)).toBe('just now'));
  it('minutes / hours / days / weeks', () => {
    expect(relativeTime(NOW - 5 * min, NOW)).toBe('5m ago');
    expect(relativeTime(NOW - 2 * hr, NOW)).toBe('2h ago');
    expect(relativeTime(NOW - 3 * day, NOW)).toBe('3d ago');
    expect(relativeTime(NOW - 14 * day, NOW)).toBe('2w ago');
  });
});

describe('formatScore', () => {
  it('formats and rounds', () => {
    expect(formatScore(null)).toBe('—');
    expect(formatScore(78)).toBe('78%');
    expect(formatScore(78.6)).toBe('79%');
  });
});

describe('formatCount', () => {
  it('pluralizes', () => {
    expect(formatCount(0)).toBe('0 papers');
    expect(formatCount(1)).toBe('1 paper');
    expect(formatCount(37)).toBe('37 papers');
  });
});

describe('isWithinLastWeek', () => {
  it('checks the 7-day window', () => {
    expect(isWithinLastWeek(NOW - 3 * day, NOW)).toBe(true);
    expect(isWithinLastWeek(NOW - 8 * day, NOW)).toBe(false);
    expect(isWithinLastWeek(null, NOW)).toBe(false);
  });
});

describe('averageScore', () => {
  it('ignores nulls and rounds', () => {
    expect(averageScore([70, 80, null])).toBe(75);
    expect(averageScore([])).toBeNull();
    expect(averageScore([null, null])).toBeNull();
    expect(averageScore([70, 75])).toBe(73); // 72.5 -> 73
  });
});
