import { useEffect, useState } from 'react';
import { splitDuration } from '@/lib/bounty';

/**
 * A live ticking countdown to a target instant (epoch millis), shown as
 * Days / Hours / Mins / Secs boxes. Used on the bounty card to count down to
 * the deadline (active) or the start (upcoming). Renders nothing once the
 * target has passed — the board switches to its ended/winner state.
 */
export function BountyCountdown({ target, label }: { target: number; label: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  if (remaining <= 0) return null;

  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const units = [
    { value: days, label: 'days' },
    { value: hours, label: 'hrs' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'sec' },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2">
        {units.map((u) => (
          <div
            key={u.label}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center rounded-lg border bg-card px-2 py-2 text-center shadow-sm sm:min-w-[3.75rem]"
          >
            <span className="text-2xl font-bold leading-none tabular-nums sm:text-3xl">
              {String(u.value).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
