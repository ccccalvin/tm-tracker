import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { saveCompletionDetails } from '@/lib/db';
import type { Completion } from '@/types';

/**
 * Inline (non-modal) editor for a paper's private score + notes, available
 * whether or not the paper is completed (DESIGN.md §7.3 — "anytime"). Saves on
 * blur or the Save button; the score is an optional 0–100 percentage and notes
 * are free text. Always shows the privacy reassurance.
 */
export function ScoreNotesEditor({
  uid,
  paperId,
  paperLabel,
  completion,
}: {
  uid: string;
  paperId: string;
  /** Stored alongside the notes when this is the paper's first saved detail. */
  paperLabel: string;
  /** The existing completion (for its current score/notes), if any. */
  completion: Completion | undefined;
}) {
  const initialScore = completion?.score != null ? String(completion.score) : '';
  const initialNotes = completion?.notes ?? '';

  const [score, setScore] = useState(initialScore);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  // Once the user has typed into either field, stop letting incoming Firestore
  // snapshots overwrite their in-progress edits. The owner is the only writer of
  // their own completion, so the only legitimate sync is the initial populate
  // (when the completion doc first arrives after mount). Without this guard, the
  // snapshot from saving one field could clobber an unsaved edit in the other.
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current) return;
    setScore(completion?.score != null ? String(completion.score) : '');
    setNotes(completion?.notes ?? '');
  }, [completion?.score, completion?.notes]);

  const dirty = score !== initialScore || notes !== initialNotes;

  function parseScore(): number | null | undefined {
    const trimmed = score.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 100) return undefined; // invalid
    return Math.round(n);
  }

  async function save() {
    const parsed = parseScore();
    if (parsed === undefined) {
      toast.error('Score must be a number between 0 and 100.');
      return;
    }
    setSaving(true);
    try {
      await saveCompletionDetails(uid, paperId, {
        paperLabel,
        score: parsed,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      toast.success('Saved.');
    } catch (err) {
      console.error('[tm-tracker] failed to save score/notes', err);
      toast.error("Couldn't save your score and notes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-background/60 p-3">
      {/* Label-beside-field rows, so score and notes read as one short form. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`score-${paperId}`} className="w-16 shrink-0">
            Score (%):
          </Label>
          <Input
            id={`score-${paperId}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="optional"
            value={score}
            onChange={(e) => {
              touched.current = true;
              setScore(e.target.value);
            }}
            onBlur={() => {
              if (dirty) void save();
            }}
            className="h-8 w-24"
          />
        </div>
        <div className="flex items-start gap-2">
          <Label htmlFor={`notes-${paperId}`} className="w-16 shrink-0 pt-2">
            Notes:
          </Label>
          <textarea
            id={`notes-${paperId}`}
            rows={2}
            placeholder="Reflections, mistakes to review… (optional)"
            value={notes}
            onChange={(e) => {
              touched.current = true;
              setNotes(e.target.value);
            }}
            onBlur={() => {
              if (dirty) void save();
            }}
            className="flex min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Only you and your teacher can see this.</span>
        </p>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving || !dirty}
          className="shrink-0"
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
