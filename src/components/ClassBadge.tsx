import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/** Small class badge, e.g. "MON ADVN". Purely presentational — pass the resolved
 * badge string (use `useClassMap()` to look it up from a classId). */
export function ClassBadge({ badge, className }: { badge: string; className?: string }) {
  if (!badge) return null;
  return (
    <Badge variant="secondary" className={cn('font-medium whitespace-nowrap', className)}>
      {badge}
    </Badge>
  );
}
