import type { Completion } from '@/types';
import { getPaper } from '@/lib/catalog';
import { relativeTime, formatScore } from '@/lib/format';
import { PdfOpenButton } from '@/components/PdfOpenButton';

/**
 * "Last N completed" list. Shows label · when · score (score is the owner's
 * private data — only render this on a page the owner/admin can see).
 */
export function RecentList({
  completions,
  showScore = true,
  emptyText = 'No papers completed yet.',
}: {
  completions: Completion[];
  showScore?: boolean;
  emptyText?: string;
}) {
  if (completions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {completions.map((c) => {
        const paper = getPaper(c.paperId);
        return (
          <li key={c.paperId} className="flex items-center gap-2 py-2 text-sm">
            <span className="flex-1 truncate font-medium">{c.paperLabel}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(c.completedAt)}
            </span>
            {showScore && (
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {formatScore(c.score)}
              </span>
            )}
            {paper && <PdfOpenButton storagePath={paper.storagePath} />}
          </li>
        );
      })}
    </ul>
  );
}
