import { HSC_EXAM_DATE } from '@/lib/config';
import { countdownDisplay } from '@/lib/countdown';
import { cn } from '@/lib/cn';

/**
 * Home-page countdown boxes shown above the leaderboard. Always shows "DAYS
 * UNTIL HSC"; when the student has enabled (and dated) a trials countdown, a
 * second "DAYS UNTIL TRIALS" box sits to its right.
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
    <div className="flex gap-3 sm:gap-4">
      <CountdownBox label="Days until HSC" dateStr={HSC_EXAM_DATE} />
      {trialsActive && trialsDate && <CountdownBox label="Days until Trials" dateStr={trialsDate} />}
    </div>
  );
}

function CountdownBox({ label, dateStr }: { label: string; dateStr: string }) {
  const display = countdownDisplay(dateStr);
  const value = display.kind === 'days' ? String(display.days) : display.kind === 'today' ? 'TODAY' : 'FINISHED!';
  const isWord = display.kind !== 'days';

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border bg-card px-4 py-5 text-center shadow-sm">
      <span
        className={cn(
          'font-bold leading-none tabular-nums',
          isWord ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl',
        )}
      >
        {value}
      </span>
      <span className="mt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
  );
}
