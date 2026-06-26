import { Card, CardContent } from '@/components/ui';

/**
 * Prominent progress banner at the top of the Tracker: how many of the in-scope
 * (recent) papers the student has completed, as a big count + a progress bar.
 */
export function CompletionProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tabular-nums leading-none sm:text-5xl">
            {completed}
          </span>
          <span className="text-2xl font-medium tabular-nums text-muted-foreground">
            / {total}
          </span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Papers completed</span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${completed} of ${total} papers completed`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
