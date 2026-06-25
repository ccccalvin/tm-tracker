import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { PdfOpenButton } from '@/components/PdfOpenButton';
import { ScoreNotesEditor } from '@/components/tracker/ScoreNotesEditor';
import { markComplete, unmarkComplete, addTodo, removeTodo } from '@/lib/db';
import { cn } from '@/lib/cn';
import type { Completion, Paper } from '@/types';

/**
 * One row in the full paper list: an instant-tick completion checkbox, the
 * paper label, an "add to to-do" toggle, and a PDF-open button. When complete,
 * the row is shaded and reveals an inline (non-modal) score/notes editor.
 */
export function PaperRow({
  uid,
  paper,
  completed,
  completion,
  inTodo,
}: {
  uid: string;
  paper: Paper;
  completed: boolean;
  /** The existing completion record (for the inline editor), if any. */
  completion: Completion | undefined;
  inTodo: boolean;
}) {
  const [toggling, setToggling] = useState(false);
  const [todoBusy, setTodoBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function toggleComplete() {
    if (toggling) return;
    setToggling(true);
    try {
      if (completed) {
        await unmarkComplete(uid, paper.id);
      } else {
        await markComplete(uid, paper);
        setExpanded(true); // reveal score/notes editor right after completing
      }
    } catch (err) {
      console.error('[tm-tracker] failed to toggle completion', err);
      toast.error("Couldn't update that paper. Please try again.");
    } finally {
      setToggling(false);
    }
  }

  async function toggleTodo() {
    if (todoBusy) return;
    setTodoBusy(true);
    try {
      if (inTodo) {
        await removeTodo(uid, paper.id);
      } else {
        await addTodo(uid, paper, completed);
      }
    } catch (err) {
      console.error('[tm-tracker] failed to update to-do', err);
      toast.error("Couldn't update your to-do list. Please try again.");
    } finally {
      setTodoBusy(false);
    }
  }

  return (
    <li
      className={cn(
        'rounded-md border transition-colors',
        completed ? 'bg-completed text-completed-foreground border-transparent' : 'bg-card',
      )}
    >
      <div className="flex items-center gap-3 p-2 sm:p-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Mark ${paper.label} not done` : `Mark ${paper.label} done`}
          onClick={toggleComplete}
          disabled={toggling}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            completed
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-input hover:border-primary',
            toggling && 'opacity-50',
          )}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : completed ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
        </button>

        <span className="flex-1 truncate text-sm font-medium">{paper.label}</span>

        {completed && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="hidden h-8 px-2 text-xs sm:inline-flex"
          >
            Score / notes
            <ChevronDown
              className={cn('ml-1 h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        )}

        <Button
          type="button"
          variant={inTodo ? 'secondary' : 'outline'}
          size="sm"
          onClick={toggleTodo}
          disabled={todoBusy}
          className="h-8 shrink-0 px-2 text-xs"
        >
          {todoBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : inTodo ? (
            <Check className="h-3.5 w-3.5 sm:mr-1" />
          ) : (
            <Plus className="h-3.5 w-3.5 sm:mr-1" />
          )}
          <span className="hidden sm:inline">{inTodo ? 'In to-do' : 'Add to to-do'}</span>
        </Button>

        <PdfOpenButton storagePath={paper.storagePath} />
      </div>

      {/* On mobile the score/notes toggle gets its own full-width row. */}
      {completed && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1 border-t border-border/40 px-3 py-1.5 text-xs font-medium sm:hidden"
        >
          Score / notes
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}

      {completed && expanded && (
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <ScoreNotesEditor uid={uid} paperId={paper.id} completion={completion} />
        </div>
      )}
    </li>
  );
}
