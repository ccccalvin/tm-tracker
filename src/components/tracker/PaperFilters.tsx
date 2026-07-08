import { Search } from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select } from '@/components/ui';
import { type PaperSet } from '@/types';
import { type PaperStatus } from '@/lib/catalog';
import { cn } from '@/lib/cn';

const STATUS_OPTIONS: { value: PaperStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'uncompleted', label: 'Uncompleted' },
];

/**
 * Controlled filter bar for the full paper list: search, status pills, a
 * "show older papers" toggle, and (when more than one set exists) a set switcher.
 */
export function PaperFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  showOlder,
  onShowOlderChange,
  setId,
  onSetIdChange,
  sets,
  allowAllSets,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: PaperStatus;
  onStatusChange: (value: PaperStatus) => void;
  showOlder: boolean;
  onShowOlderChange: (value: boolean) => void;
  setId: string | undefined;
  onSetIdChange: (value: string | undefined) => void;
  /** Sets the current viewer may switch between. */
  sets: PaperSet[];
  /** Whether the combined "All sets" option is offered. */
  allowAllSets: boolean;
}) {
  // No switcher when there's a single fixed set (e.g. a locked-down student).
  const showSetSwitcher = allowAllSets ? sets.length > 0 : sets.length > 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search papers…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search papers"
          />
        </div>

        {showSetSwitcher && (
          <Select
            value={setId ?? ''}
            onChange={(e) => onSetIdChange(e.target.value === '' ? undefined : e.target.value)}
            aria-label="Filter by set"
            className="sm:w-48"
          >
            {allowAllSets && <option value="">All sets</option>}
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border bg-card p-0.5" role="group" aria-label="Status filter">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={status === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onStatusChange(opt.value)}
              aria-pressed={status === opt.value}
              className={cn('h-7 px-3 text-xs', status !== opt.value && 'text-muted-foreground')}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <Label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showOlder}
            onChange={(e) => onShowOlderChange(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          Show older papers
        </Label>
      </div>
    </div>
  );
}
