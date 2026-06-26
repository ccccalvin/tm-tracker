import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, GripVertical, Loader2, X } from 'lucide-react';
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
import { removeTodo, reorderTodos } from '@/lib/db';
import { getPaper } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import type { Completion, Paper, TodoItem } from '@/types';

/**
 * The personal to-do queue (top of the Tracker). Drag-to-reorder via @dnd-kit;
 * order is persisted with reorderTodos. Completed items stay in the list, shaded
 * (not struck through). Items can be completed/uncompleted and removed here.
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
  // Local order for optimistic, snappy drag UX; kept in sync with the live list.
  const [order, setOrder] = useState<string[]>(() => todos.map((t) => t.paperId));

  // Re-derive local order only when the SET of to-do ids changes (an add or
  // remove). Incidental snapshots — e.g. a `done` flag flipping when a paper is
  // completed, or the snapshot echoing our own reorder — must NOT snap the list
  // back, or an optimistic drag would flicker. Surviving ids keep their current
  // order; newly-added ids are appended.
  useEffect(() => {
    const incoming = todos.map((t) => t.paperId);
    setOrder((prev) => {
      const prevSet = new Set(prev);
      const incomingSet = new Set(incoming);
      const sameMembership =
        prev.length === incoming.length && prev.every((id) => incomingSet.has(id));
      if (sameMembership) return prev;
      const surviving = prev.filter((id) => incomingSet.has(id));
      const added = incoming.filter((id) => !prevSet.has(id));
      return [...surviving, ...added];
    });
  }, [todos]);

  const byId = new Map(todos.map((t) => [t.paperId, t]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((t): t is TodoItem => t !== undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next); // optimistic
    try {
      await reorderTodos(uid, next);
    } catch (err) {
      console.error('[tm-tracker] failed to reorder to-dos', err);
      toast.error("Couldn't save the new order. Please try again.");
      setOrder(todos.map((t) => t.paperId)); // revert to last known good
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">To-do</CardTitle>
        <CardDescription>
          Your personal queue of papers to work through. Drag to reorder, and
          tick them off as you go.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Your to-do list is empty — add papers from the list below.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {ordered.map((todo) => (
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
            </SortableContext>
          </DndContext>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.paperId });
  const [removing, setRemoving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const paper = getPaper(todo.paperId);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border transition-colors',
        completed ? 'bg-completed text-completed-foreground border-transparent' : 'bg-card',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

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

        {completed && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="hidden h-7 px-2 text-xs sm:inline-flex"
          >
            Score / notes
            <ChevronDown
              className={cn('ml-1 h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        )}

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
          <ScoreNotesEditor uid={uid} paperId={todo.paperId} completion={completion} />
        </div>
      )}
    </li>
  );
}
