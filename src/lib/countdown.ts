/**
 * Countdown maths for the Home-page boxes. Pure and unit-tested.
 *
 * All comparisons are done at local-midnight granularity so "days until" is a
 * whole number of calendar days (not affected by the time of day), matching how
 * a student would count down on a wall calendar.
 */

/** Whole calendar days until `YYYY-MM-DD`: positive future, 0 today, negative past. */
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = parseLocalDate(dateStr);
  if (!target) return NaN;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / MS_PER_DAY);
}

export type CountdownDisplay = { kind: 'days'; days: number } | { kind: 'today' } | { kind: 'finished' };

/** Map a date to what its box should show: a number, "TODAY", or "FINISHED!". */
export function countdownDisplay(dateStr: string, now: Date = new Date()): CountdownDisplay {
  const days = daysUntil(dateStr, now);
  if (Number.isNaN(days)) return { kind: 'finished' };
  if (days > 0) return { kind: 'days', days };
  if (days === 0) return { kind: 'today' };
  return { kind: 'finished' };
}

function parseLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
