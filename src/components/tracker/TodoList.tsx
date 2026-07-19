import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, FileText, Loader2, X } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { PdfOpenButton } from '@/components/PdfOpenButton';
import { ScoreNotesEditor } from '@/components/tracker/ScoreNotesEditor';
import { removeTodo } from '@/lib/db';
import { getPaper } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import type { Completion, Paper, TodoItem } from '@/types';

/**
 * The personal to-do queue (top of the Tracker). Items keep the order they were
 * added in. Outstanding items are shaded amber ("in progress"); completed ones
 * stay in the list shaded mint (not struck through), and can be
 * completed/uncompleted and removed here.
 */
export function TodoList({
  uid,
  todos,
  completedIds,
  completionsById,
  onSetCompleted,
}: {
  uid: string;
  todos: TodoItem[];
  completedIds: Set<string>;
  /** Completion records keyed by paperId, for the inline score/notes editor. */
  completionsById: Map<string, Completion>;
  /** Optimistic complete/incomplete toggle (instant tick, background write). */
  onSetCompleted: (paper: Paper, desired: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">To-do</CardTitle>
        <CardDescription className="italic">
          “If I quit now, I will soon be back to where I started. And when I
          started, I was desperately wishing to be where I am now.”
        </CardDescription>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Your to-do list is empty — add papers from the list below.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {todos.map((todo) => (
              <TodoRow
                key={todo.paperId}
                uid={uid}
                todo={todo}
                completed={completedIds.has(todo.paperId)}
                completion={completionsById.get(todo.paperId)}
                onSetCompleted={onSetCompleted}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TodoRow({
  uid,
  todo,
  completed,
  completion,
  onSetCompleted,
}: {
  uid: string;
  todo: TodoItem;
  completed: boolean;
  /** The existing completion record (for the inline editor), if any. */
  completion: Completion | undefined;
  /** Optimistic complete/incomplete toggle (instant tick, background write). */
  onSetCompleted: (paper: Paper, desired: boolean) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(completion?.notes) || completion?.score != null;

  const paper = getPaper(todo.paperId);

  function toggleComplete() {
    if (!paper) return;
    const desired = !completed;
    onSetCompleted(paper, desired);
    if (desired) setExpanded(true); // reveal score/notes editor right after completing
  }

  async function remove() {
    if (removing) return;
    setRemoving(true);
    try {
      await removeTodo(uid, todo.paperId);
    } catch (err) {
      console.error('[tm-tracker] failed to remove to-do', err);
      toast.error("Couldn't remove that item. Please try again.");
      setRemoving(false);
    }
    // On success the live list drops the row; no need to reset state.
  }

  return (
    <li
      className={cn(
        'rounded-md border border-transparent transition-colors',
        completed
          ? 'bg-completed text-completed-foreground'
          : 'bg-inprogress text-inprogress-foreground',
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Mark ${todo.paperLabel} not done` : `Mark ${todo.paperLabel} done`}
          onClick={toggleComplete}
          disabled={!paper}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            completed
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-input hover:border-primary',
            !paper && 'opacity-50',
          )}
        >
          {completed ? <Check className="h-3.5 w-3.5" /> : null}
        </button>

        <span className="flex-1 truncate text-sm font-medium">{todo.paperLabel}</span>

        <Button
          type="button"
          variant={hasDetails ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`Score and notes for ${todo.paperLabel}`}
          className="h-7 shrink-0 px-2 text-xs"
        >
          <FileText className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Score / notes</span>
          <ChevronDown
            className={cn(
              'ml-1 hidden h-3.5 w-3.5 transition-transform sm:inline',
              expanded && 'rotate-180',
            )}
          />
        </Button>

        {paper && <PdfOpenButton storagePath={paper.storagePath} />}

        <button
          type="button"
          onClick={remove}
          disabled={removing}
          aria-label={`Remove ${todo.paperLabel} from to-do`}
          title="Remove from to-do"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <ScoreNotesEditor
            uid={uid}
            paperId={todo.paperId}
            paperLabel={todo.paperLabel}
            completion={completion}
          />
        </div>
      )}
    </li>
  );
}
