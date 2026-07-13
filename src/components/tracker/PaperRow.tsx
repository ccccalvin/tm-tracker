import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { LevelBadge } from '@/components/LevelBadge';
import { PdfOpenButton } from '@/components/PdfOpenButton';
import { ScoreNotesEditor } from '@/components/tracker/ScoreNotesEditor';
import { addTodo, markComplete, removeTodo } from '@/lib/db';
import { setLevel } from '@/lib/catalog';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthGate } from '@/store/useAuthGate';
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
  showLevelTag = false,
  onSetCompleted,
}: {
  /** The signed-in user, or undefined for a logged-out guest (actions gate). */
  uid: string | undefined;
  paper: Paper;
  completed: boolean;
  /** The existing completion record (for the inline editor), if any. */
  completion: Completion | undefined;
  inTodo: boolean;
  /** Show the ADVN/EXT1 level tag (a no-op for sets with no level mapping). */
  showLevelTag?: boolean;
  /** Optimistic complete/incomplete toggle (instant tick, background write). */
  onSetCompleted: (paper: Paper, desired: boolean) => void;
}) {
  const promptSignIn = useAuthGate((s) => s.promptSignIn);
  const [todoBusy, setTodoBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function toggleComplete() {
    // Guests: send them through the sign-in gate, then mark it done on the way
    // out (the tick they attempted "sticks" once they have an account).
    if (!uid) {
      promptSignIn('tick', () => {
        const u = useAuthStore.getState().firebaseUser?.uid;
        if (!u) return;
        markComplete(u, paper)
          .then(() => toast.success('Saved — nice work!'))
          .catch((err) => {
            console.error('[tm-tracker] failed to save completion', err);
            toast.error("Couldn't save that paper. Please try again.");
          });
      });
      return;
    }
    const desired = !completed;
    onSetCompleted(paper, desired);
    if (desired) setExpanded(true); // reveal score/notes editor right after completing
  }

  async function toggleTodo() {
    if (!uid) {
      promptSignIn('todo', () => {
        const u = useAuthStore.getState().firebaseUser?.uid;
        if (!u) return;
        addTodo(u, paper, false)
          .then(() => toast.success('Added to your to-do list'))
          .catch((err) => {
            console.error('[tm-tracker] failed to add to-do', err);
            toast.error("Couldn't update your to-do list. Please try again.");
          });
      });
      return;
    }
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
      <div className="flex items-center gap-2 px-2 py-1 sm:px-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Mark ${paper.label} not done` : `Mark ${paper.label} done`}
          onClick={toggleComplete}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            completed
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-input hover:border-primary',
          )}
        >
          {completed ? <Check className="h-3.5 w-3.5" /> : null}
        </button>

        <span className="flex-1 truncate text-sm font-medium">{paper.label}</span>

        {showLevelTag && (
          <LevelBadge level={setLevel(paper.setId)} className="hidden shrink-0 text-[10px] sm:inline-flex" />
        )}

        {completed && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="hidden h-6 px-2 text-xs sm:inline-flex"
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
          className="h-6 shrink-0 px-2 text-xs"
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

      {completed && expanded && uid && (
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <ScoreNotesEditor uid={uid} paperId={paper.id} completion={completion} />
        </div>
      )}
    </li>
  );
}
