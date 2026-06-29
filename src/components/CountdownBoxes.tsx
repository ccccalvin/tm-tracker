import { HSC_EXAM_DATE } from '@/lib/config';
import { countdownDisplay } from '@/lib/countdown';

/**
 * Compact countdown strip shown on Home. Always shows the HSC countdown; when
 * the student has enabled (and dated) a trials countdown, a second pill appears
 * beside it. Kept small and muted so it stays out of the way.
 */
export function CountdownBoxes({
  showTrials,
  trialsDate,
}: {
  showTrials: boolean;
  trialsDate: string | null;
}) {
  const trialsActive = showTrials && Boolean(trialsDate);
  return (
    <div className="flex flex-wrap justify-end gap-2 text-xs">
      <CountdownPill label="HSC" dateStr={HSC_EXAM_DATE} />
      {trialsActive && trialsDate && <CountdownPill label="Trials" dateStr={trialsDate} />}
    </div>
  );
}

function CountdownPill({ label, dateStr }: { label: string; dateStr: string }) {
  const display = countdownDisplay(dateStr);
  const value =
    display.kind === 'days'
      ? `${display.days} ${display.days === 1 ? 'day' : 'days'}`
      : display.kind === 'today'
        ? 'Today'
        : 'Finished';

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-muted-foreground shadow-sm">
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      until {label}
    </span>
  );
}
