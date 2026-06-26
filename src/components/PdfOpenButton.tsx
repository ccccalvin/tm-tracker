import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import { getPaperUrl } from '@/lib/db';
import { cn } from '@/lib/cn';

/**
 * Opens a paper's PDF in a new browser tab. Opens a blank tab synchronously
 * (inside the click gesture) so popup blockers don't eat it, then points it at
 * the resolved Storage download URL once it arrives.
 */
export function PdfOpenButton({
  storagePath,
  className,
  title = 'Open paper (PDF)',
}: {
  storagePath: string;
  className?: string;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    // Open a blank tab synchronously, inside the click gesture, so popup blockers
    // let it through. Do NOT pass 'noopener'/'noreferrer' here — that makes
    // window.open return null and we'd lose the handle (forcing a same-tab
    // navigation). We sever the opener link manually instead.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      const url = await getPaperUrl(storagePath);
      if (tab) {
        tab.location.href = url;
      } else {
        // Popup was blocked — open via a transient anchor rather than hijacking
        // the current tab.
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      if (tab) tab.close();
      // eslint-disable-next-line no-console
      console.error('[tm-tracker] failed to open paper', err);
      toast.error("Couldn't open that paper. Is it uploaded yet?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </button>
  );
}
