import { User } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A round profile picture. Falls back to a neutral grey person icon when the
 * user hasn't uploaded one. Size is controlled by passing h-/w- utilities via
 * `className` (defaults to h-8 w-8).
 */
export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name ? `${name}'s profile picture` : 'Profile picture'}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <User className="h-[55%] w-[55%]" aria-hidden />
      )}
    </span>
  );
}
