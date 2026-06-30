import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { MathLevel } from '@/types';

/** Per-level badge colours: ADVN green, EXT1 purple, EXT2 red. */
const LEVEL_STYLES: Record<MathLevel, string> = {
  ADVN: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXT1: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  EXT2: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

/** Small coloured math-level badge ("ADVN" / "EXT1" / "EXT2"). Renders nothing
 * when the level is unset (e.g. admins). */
export function LevelBadge({
  level,
  className,
}: {
  level: MathLevel | null | undefined;
  className?: string;
}) {
  if (!level) return null;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium whitespace-nowrap', LEVEL_STYLES[level], className)}
    >
      {level}
    </Badge>
  );
}
