import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { getCroppedBlob } from '@/lib/cropImage';

/**
 * Crop/zoom dialog for a freshly-picked profile photo. The user drags to
 * position and zooms; on save we render the selected square to a ~256px JPEG
 * blob and hand it back to the caller (which uploads it).
 */
export function AvatarCropper({
  imageSrc,
  open,
  onOpenChange,
  onCropped,
  saving,
}: {
  imageSrc: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  saving: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!areaPixels) return;
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels);
      await onCropped(blob);
    } catch (err) {
      console.error('[tm-tracker] failed to crop avatar', err);
      toast.error("Couldn't process that image. Please try another.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
          <DialogDescription>Drag to position, and use the slider to zoom.</DialogDescription>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-md bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-primary"
            aria-label="Zoom"
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !areaPixels}>
            {saving ? 'Saving…' : 'Save photo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
