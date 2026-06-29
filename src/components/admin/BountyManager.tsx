import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Label,
  Badge,
  Skeleton,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import { useBounties } from '@/hooks/useData';
import {
  createBounty,
  updateBounty,
  deleteBounty,
  type BountyInput,
} from '@/lib/db';
import { bountyStatus, formatBountyRange } from '@/lib/bounty';
import { cn } from '@/lib/cn';
import type { Bounty } from '@/types';

const EMPTY: BountyInput = { title: '', prize: '', message: '', startDate: '', endDate: '' };

const statusVariant = {
  active: 'success',
  upcoming: 'info',
  ended: 'secondary',
} as const;

/**
 * Admin bounty management (DESIGN.md §8.1). List existing bounties with a
 * publish toggle + edit/delete, and create new ones via a small dialog editor.
 */
export function BountyManager() {
  const { bounties, loading } = useBounties();
  const [editing, setEditing] = useState<Bounty | null>(null);
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bounties.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No bounties yet. Create one to start a prize competition.
        </p>
      ) : (
        <ul className="space-y-3">
          {bounties.map((b) => (
            <BountyItem key={b.id} bounty={b} onEdit={() => setEditing(b)} />
          ))}
        </ul>
      )}

      <Button onClick={() => setCreating(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New bounty
      </Button>

      <BountyEditorDialog
        open={creating}
        onOpenChange={setCreating}
        initial={EMPTY}
      />
      <BountyEditorDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        bountyId={editing?.id}
        initial={
          editing
            ? {
                title: editing.title,
                prize: editing.prize,
                message: editing.message,
                startDate: editing.startDate,
                endDate: editing.endDate,
              }
            : EMPTY
        }
      />
    </div>
  );
}

function BountyItem({ bounty, onEdit }: { bounty: Bounty; onEdit: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = bountyStatus(bounty.startDate, bounty.endDate);

  async function togglePublished() {
    setBusy(true);
    try {
      await updateBounty(bounty.id, { published: !bounty.published });
      toast.success(bounty.published ? 'Bounty hidden from students.' : 'Bounty published.');
    } catch {
      toast.error('Could not update the bounty.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBounty(bounty.id);
      toast.success('Bounty deleted.');
      setConfirmDelete(false);
    } catch {
      toast.error('Could not delete the bounty.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li
      className={cn(
        'space-y-2 rounded-md border p-3',
        !bounty.published && 'bg-muted/50',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{bounty.title || 'Untitled bounty'}</span>
        {bounty.prize && <Badge variant="warning">{bounty.prize}</Badge>}
        <Badge variant={statusVariant[status]}>{status}</Badge>
        {!bounty.published && <Badge variant="outline">hidden</Badge>}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        {formatBountyRange(bounty.startDate, bounty.endDate)}
      </p>
      {bounty.message && (
        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {bounty.message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={togglePublished} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : bounty.published ? (
            <EyeOff className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {bounty.published ? 'Hide' : 'Publish'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete bounty?"
        description={`"${bounty.title || 'this bounty'}" will be removed for everyone. This can't be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </li>
  );
}

function BountyEditorDialog({
  open,
  onOpenChange,
  initial,
  bountyId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: BountyInput;
  bountyId?: string;
}) {
  const [form, setForm] = useState<BountyInput>(initial);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(bountyId);

  // Reset the form to the latest initial values each time the dialog opens.
  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof BountyInput>(key: K, value: BountyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const title = form.title.trim();
    if (!title) {
      toast.error('Give the bounty a title.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Pick a start and end date.');
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error('The end date can’t be before the start date.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && bountyId) {
        // Changing the window invalidates any frozen winner — let it re-run.
        const windowChanged =
          initial.startDate !== form.startDate || initial.endDate !== form.endDate;
        await updateBounty(bountyId, windowChanged ? { ...form, result: null } : form);
      } else {
        await createBounty(form);
      }
      toast.success(isEdit ? 'Bounty updated.' : 'Bounty created.');
      onOpenChange(false);
    } catch {
      toast.error('Could not save the bounty.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit bounty' : 'New bounty'}</DialogTitle>
          <DialogDescription>
            Set the prize, the window it runs over, and a message for students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bounty-title">Title</Label>
            <Input
              id="bounty-title"
              placeholder="Bounty: Holiday Edition"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bounty-prize">Prize</Label>
            <Input
              id="bounty-prize"
              placeholder="$100"
              value={form.prize}
              onChange={(e) => set('prize', e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bounty-start">Start date</Label>
              <Input
                id="bounty-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bounty-end">End date</Label>
              <Input
                id="bounty-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bounty-message">Message</Label>
            <textarea
              id="bounty-message"
              rows={3}
              placeholder="Whoever completes the most papers over the holidays wins $100. Good luck :)"
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create bounty'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
