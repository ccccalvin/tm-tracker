/** Small display formatters. Pure + unit-tested. */

/** "just now" / "5m" / "3h" / "2d" / "4w" / "Jun 2025" from an epoch-millis time. */
export function relativeTime(ms: number | null, now: number = Date.now()): string {
  if (!ms) return '—';
  const diff = Math.max(0, now - ms);
  const sec = diff / 1000;
  if (sec < 45) return 'just now';
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m ago`;
  const hr = min / 60;
  if (hr < 24) return `${Math.round(hr)}h ago`;
  const day = hr / 24;
  if (day < 7) return `${Math.round(day)}d ago`;
  const wk = day / 7;
  if (wk < 5) return `${Math.round(wk)}w ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** "78%" or "—" when no score recorded. */
export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—';
  return `${Math.round(score)}%`;
}

/** "1 paper" / "37 papers". */
export function formatCount(n: number): string {
  return `${n} paper${n === 1 ? '' : 's'}`;
}

/** True if `ms` falls within the last 7 days. */
export function isWithinLastWeek(ms: number | null, now: number = Date.now()): boolean {
  if (!ms) return false;
  return now - ms <= 7 * 24 * 60 * 60 * 1000;
}

/** Average of recorded scores (ignoring nulls), rounded; null if none. */
export function averageScore(scores: Array<number | null>): number | null {
  const vals = scores.filter((s): s is number => s != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
