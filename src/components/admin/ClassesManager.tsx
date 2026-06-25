import { useState } from 'react';
import { Archive, ArchiveRestore, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useClasses } from '@/hooks/useData';
import { addClass, updateClass } from '@/lib/db';
import { Button, Input, Label, Skeleton } from '@/components/ui';
import { ClassBadge } from '@/components/ClassBadge';
import type { ClassInfo } from '@/types';
import { cn } from '@/lib/cn';

/**
 * Add / rename / re-badge / archive classes (DESIGN.md §8.1, §9). Each class is
 * editable inline; a small form at the bottom adds a new one with the next order.
 */
export function ClassesManager() {
  const { classes, loading } = useClasses();

  const [newName, setNewName] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [adding, setAdding] = useState(false);

  const nextOrder =
    classes.length > 0 ? Math.max(...classes.map((c) => c.order)) + 1 : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const badge = newBadge.trim();
    if (!name || !badge) {
      toast.error('A class needs both a name and a badge.');
      return;
    }
    setAdding(true);
    try {
      await addClass(name, badge, nextOrder);
      setNewName('');
      setNewBadge('');
      toast.success(`Added "${name}".`);
    } catch {
      toast.error('Could not add the class.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {classes.map((c) => (
          <ClassRow key={c.id} info={c} />
        ))}
      </ul>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-md border border-dashed p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="new-class-name">Class name</Label>
          <Input
            id="new-class-name"
            placeholder="Calvin's Saturday ADVN"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-40">
          <Label htmlFor="new-class-badge">Badge</Label>
          <Input
            id="new-class-badge"
            placeholder="SAT ADVN"
            value={newBadge}
            onChange={(e) => setNewBadge(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={adding} className="shrink-0">
          {adding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add class
        </Button>
      </form>
    </div>
  );
}

function ClassRow({ info }: { info: ClassInfo }) {
  const [name, setName] = useState(info.name);
  const [badge, setBadge] = useState(info.badge);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const dirty = name.trim() !== info.name || badge.trim() !== info.badge;

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedBadge = badge.trim();
    if (!trimmedName || !trimmedBadge) {
      toast.error('Name and badge cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateClass(info.id, { name: trimmedName, badge: trimmedBadge });
      toast.success('Class updated.');
    } catch {
      toast.error('Could not save the class.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    try {
      await updateClass(info.id, { archived: !info.archived });
      toast.success(info.archived ? 'Class restored.' : 'Class archived.');
    } catch {
      toast.error('Could not update the class.');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-end',
        info.archived && 'bg-muted/50',
      )}
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor={`class-name-${info.id}`} className="text-xs text-muted-foreground">
          Name
        </Label>
        <Input
          id={`class-name-${info.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor={`class-badge-${info.id}`} className="text-xs text-muted-foreground">
          Badge
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={`class-badge-${info.id}`}
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
          />
          <ClassBadge badge={badge.trim() || info.badge} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleArchiveToggle}
          disabled={archiving}
          title={info.archived ? 'Unarchive class' : 'Archive class'}
        >
          {archiving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : info.archived ? (
            <ArchiveRestore className="mr-2 h-4 w-4" />
          ) : (
            <Archive className="mr-2 h-4 w-4" />
          )}
          {info.archived ? 'Unarchive' : 'Archive'}
        </Button>
      </div>
    </li>
  );
}
