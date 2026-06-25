import type { StudentStats } from '@/lib/stats';
import { formatScore } from '@/lib/format';
import { cn } from '@/lib/cn';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold tabular-nums leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** The three personal stats: total completed · average score · this week. */
export function StatStrip({ stats, className }: { stats: StudentStats; className?: string }) {
  return (
    <div className={cn('flex gap-8', className)}>
      <Stat label="Total completed" value={String(stats.total)} />
      <Stat label="Average score" value={formatScore(stats.average)} />
      <Stat label="This week" value={`+${stats.thisWeek}`} />
    </div>
  );
}
